import { Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware, optionalAuth } from '../middleware/auth.js';
import { getAvailability, recomputeListingStatus, REMAINING_SQL } from '../db/availability.js';
import { createNotification } from '../db/notify.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { cacheMiddleware } from '../utils/cache.js';
import { ListingService } from '../services/ListingService.js';

function withRemaining(l: any) {
  return ListingService.withRemaining(l);
}

const router = Router();
const CLOUDINARY_CONFIGURED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (CLOUDINARY_CONFIGURED) cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']; cb(null, allowed.includes(file.mimetype)); } });

const VALID_CATEGORIES = ['event', 'restaurant', 'hotel', 'caterer', 'household'];
const MAX_IMAGES = 5;

function sanitizeImageUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((u) => String(u || ''))
    .filter((u) => /^https:\/\/[^\s'"]+\.(jpg|jpeg|png|webp)(\?[^\s'"]*)?$/i.test(u) || /^https:\/\/res\.cloudinary\.com\/[^\s'"]+$/i.test(u))
    .slice(0, MAX_IMAGES);
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'left2serve', transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] }, (err, result) => err ? reject(err) : resolve(result.secure_url));
    stream.end(buffer);
  });
}

router.post('/upload', authMiddleware, upload.array('images', 5), async (req: Request, res: Response) => {
  if (!CLOUDINARY_CONFIGURED) return res.status(503).json({ error: 'Image uploads are not configured on the server' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No images provided' });
  try { const urls = await Promise.all((req.files as Express.Multer.File[]).map(f => uploadToCloudinary(f.buffer))); res.json({ urls }); }
  catch (err) { console.error('Upload error:', err.message); res.status(500).json({ error: 'Upload failed' }); }
});

router.get('/', cacheMiddleware(60), async (req: Request, res: Response, next) => {
  try {
    const queryOptions = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      sort: req.query.sort,
      dietary: req.query.dietary,
      page: Math.max(1, parseInt((req.query.page as string)) || 1),
      limit: Math.min(48, Math.max(1, parseInt((req.query.limit as string)) || 12)),
      lat: req.query.lat,
      lng: req.query.lng,
      distance: req.query.distance
    };
    const result = await ListingService.getAllListings(queryOptions);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/me', authMiddleware, roleMiddleware('donor'), async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.id;
    // Get monthly meals saved
    const monthlyStats = await all(`
      SELECT 
        TO_CHAR(r.updated_at, 'YYYY-MM') as month,
        SUM(r.quantity) as meals_saved
      FROM reservations r
      JOIN food_listings fl ON r.food_listing_id = fl.id
      WHERE fl.user_id = ? AND r.status = 'collected'
      GROUP BY TO_CHAR(r.updated_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [userId]);

    // Get total listings and total reserved
    const [totalListings] = await all('SELECT COUNT(*) as count FROM food_listings WHERE user_id = ?', [userId]);
    const [totalDonated] = await all("SELECT COALESCE(SUM(r.quantity), 0) as count FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ? AND r.status = 'collected'", [userId]);
    
    res.json({
      monthlyStats,
      totalListings: totalListings?.count || 0,
      totalDonated: totalDonated?.count || 0
    });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', authMiddleware, async (req: Request, res: Response) => {
  try {
    const listings = await all(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.user_id = ? ORDER BY fl.created_at DESC`, [req.user!.id]);
    res.json(listings.map(withRemaining));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [listingsRow] = await all("SELECT COUNT(*) as count FROM food_listings WHERE status = 'available'");
    const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
    const [receiversRow] = await all("SELECT COUNT(*) as count FROM users WHERE role IN ('ngo','volunteer')");
    const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) as total FROM reservations WHERE status = 'collected'");
    res.json({
      activeListings: listingsRow.count,
      totalDonors: donorsRow.count,
      totalReceivers: receiversRow.count,
      mealsSaved: mealsRow.total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/impact', async (req: Request, res: Response) => {
  try {
    const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) as total FROM reservations WHERE status = 'collected'");
    const [listingsRow] = await all('SELECT COUNT(*) as count FROM food_listings');
    const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
    const [receiversRow] = await all("SELECT COUNT(*) as count FROM users WHERE role IN ('ngo','volunteer')");
    const meals = Number(mealsRow.total) || 0;
    const co2Kg = Math.round(meals * 2.5);
    res.json({
      mealsSaved: meals,
      co2Kg,
      trees: Math.round((co2Kg / 21) * 10) / 10,
      waterLiters: meals * 1250,
      totalListings: listingsRow.count,
      totalDonors: donorsRow.count,
      totalReceivers: receiversRow.count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch impact' });
  }
});

router.get('/:id', optionalAuth, validateIdParam('id'), async (req: Request, res: Response) => {
  try {
    const listing = await get(`SELECT fl.*, u.name as donor_name, u.organization as donor_org, u.phone as donor_phone, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.id = ?`, [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const out = withRemaining(listing);
    const isOwner = req.user && req.user!.id === listing.user_id;
    const isAdmin = req.user && req.user!.role === 'admin';
    let canSeeDonorContact = isOwner || isAdmin;
    if (!canSeeDonorContact && req.user && (req.user!.role === 'ngo' || req.user!.role === 'volunteer')) {
      const [r] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('approved','collected')", [listing.id, req.user!.id]);
      if (r) canSeeDonorContact = true;
    }
    if (!canSeeDonorContact) delete out.donor_phone;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

const listingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  category: z.enum(['event', 'restaurant', 'hotel', 'caterer', 'household']),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, 'Quantity must be at least 1')),
  unit: z.string().optional().default('servings'),
  price: z.preprocess((val) => Number(val) || 0, z.number().min(0).optional()),
  expiry_date: z.string().refine((date) => !isNaN(Date.parse(date)) && new Date(date) > new Date(), { message: 'Expiry date must be in the future' }),
  pickup_address: z.string().min(1, 'Pickup address is required'),
  pickup_instructions: z.string().optional().nullable(),
  image_urls: z.array(z.string()).optional().default([]),
  dietary_preferences: z.array(z.string()).optional().default([]),
  latitude: z.preprocess((val) => val != null ? Number(val) : null, z.number().nullable().optional()),
  longitude: z.preprocess((val) => val != null ? Number(val) : null, z.number().nullable().optional())
});

router.post('/', authMiddleware, roleMiddleware('donor'), validate(listingSchema), async (req: Request, res: Response, next) => {
  try {
    const data = req.body;
    data.image_urls = sanitizeImageUrls(data.image_urls);
    const listing = await ListingService.createListing(req.user!.id, data);
    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

const updateListingSchema = listingSchema.partial().extend({
  status: z.enum(['available', 'reserved', 'collected', 'expired', 'cancelled']).optional()
});

router.put('/:id', authMiddleware, validateIdParam('id'), validate(updateListingSchema), async (req: Request, res: Response) => {
  try {
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
    const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, status, latitude, longitude } = req.body;
    const nextCategory = category || listing.category;
    const nextQty = quantity != null ? Number(quantity) : listing.quantity;
    const nextExpiry = expiry_date || listing.expiry_date;
    const images = sanitizeImageUrls(image_urls ?? listing.image_urls);
    const dietaryTags = dietary_preferences !== undefined ? (Array.isArray(dietary_preferences) ? dietary_preferences : []) : listing.dietary_preferences;
    const lat = latitude !== undefined ? (latitude ? Number(latitude) : null) : listing.latitude;
    const lng = longitude !== undefined ? (longitude ? Number(longitude) : null) : listing.longitude;
    await run(`UPDATE food_listings SET title=?, description=?, category=?, quantity=?, unit=?, price=?, expiry_date=?, pickup_address=?, pickup_instructions=?, image_urls=?, dietary_preferences=?, status=?, latitude=?, longitude=? WHERE id=?`, [title ? String(title).trim() : listing.title, description ?? listing.description, nextCategory, nextQty, unit || listing.unit, price ?? listing.price, nextExpiry, pickup_address ? String(pickup_address).trim() : listing.pickup_address, pickup_instructions ?? listing.pickup_instructions, JSON.stringify(images), JSON.stringify(dietaryTags), status || listing.status, lat, lng, req.params.id]);
    await recomputeListingStatus(req.params.id as string);
    const updated = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [req.params.id]);
    res.json(withRemaining(updated));
  } catch (err) { res.status(500).json({ error: 'Failed to update listing' }); }
});

router.delete('/:id', authMiddleware, validateIdParam('id'), async (req: Request, res: Response) => {
  try {
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
    const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [req.params.id]);
    if (active.count > 0) return res.status(409).json({ error: 'Cannot delete a listing with active reservations. Cancel them first.' });
    await run('DELETE FROM food_listings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Listing deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete listing' }); }
});

router.post('/:id/close', authMiddleware, validateIdParam('id'), async (req: Request, res: Response) => {
  try {
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
    if (['collected', 'expired', 'cancelled'].includes(listing.status)) return res.status(400).json({ error: 'Listing is already closed' });
    const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [req.params.id]);
    if (active.count > 0) return res.status(409).json({ error: 'Cannot close a listing with pending or approved reservations' });
    await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Listing marked as donated' });
  } catch (err) { res.status(500).json({ error: 'Failed to close listing' }); }
});

export default router;

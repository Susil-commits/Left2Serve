import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware, optionalAuth } from '../middleware/auth.js';
import { recomputeListingStatus, REMAINING_SQL } from '../db/availability.js';

function withRemaining(l) {
  const obj = { ...l, image_urls: l.image_urls || [] };
  if (obj.remaining == null) obj.remaining = Number(l.quantity) || 0;
  else obj.remaining = Number(obj.remaining);
  return obj;
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

router.post('/upload', authMiddleware, upload.array('images', 5), async (req, res) => {
  if (!CLOUDINARY_CONFIGURED) return res.status(503).json({ error: 'Image uploads are not configured on the server' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No images provided' });
  try { const urls = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer))); res.json({ urls }); }
  catch (err) { console.error('Upload error:', err.message); res.status(500).json({ error: 'Upload failed' }); }
});

router.get('/', async (req, res) => {
  const { category, status, search, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 12));
  let query = `SELECT fl.*, u.name as donor_name, u.organization as donor_org, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) as total FROM food_listings fl WHERE 1=1`;
  const params = [];
  const countParams = [];
  if (category) { query += ' AND fl.category = ?'; countQuery += ' AND fl.category = ?'; params.push(category); countParams.push(category); }
  if (status) {
    query += ' AND fl.status = ?'; countQuery += ' AND fl.status = ?'; params.push(status); countParams.push(status);
  } else {
    query += " AND fl.status = 'available' AND fl.expiry_date > NOW()";
    countQuery += " AND fl.status = 'available' AND fl.expiry_date > NOW()";
  }
  if (search) {
    query += ' AND (fl.title LIKE ? OR fl.description LIKE ?)';
    countQuery += ' AND (fl.title LIKE ? OR fl.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }
  const orderBy = sort === 'expiring' ? 'fl.expiry_date ASC' : sort === 'quantity' ? 'fl.quantity DESC, fl.created_at DESC' : 'fl.created_at DESC';
  const offset = (page - 1) * limit;
  query += ` ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
  const [listings, countRow] = await Promise.all([all(query, params), get(countQuery, countParams)]);
  const total = countRow ? countRow.total : 0;
  res.json({
    listings: listings.map(withRemaining),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

router.get('/mine', authMiddleware, async (req, res) => {
  const listings = await all(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.user_id = ? ORDER BY fl.created_at DESC`, [req.user.id]);
  res.json(listings.map(withRemaining));
});

router.get('/stats', async (req, res) => {
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

router.get('/impact', async (req, res) => {
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

router.get('/:id', optionalAuth, async (req, res) => {
  const listing = await get(`SELECT fl.*, u.name as donor_name, u.organization as donor_org, u.phone as donor_phone, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.id = ?`, [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const out = withRemaining(listing);
  const isOwner = req.user && req.user.id === listing.user_id;
  const isAdmin = req.user && req.user.role === 'admin';
  let canSeeDonorContact = isOwner || isAdmin;
  if (!canSeeDonorContact && req.user && (req.user.role === 'ngo' || req.user.role === 'volunteer')) {
    const [r] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('approved','collected')", [listing.id, req.user.id]);
    if (r) canSeeDonorContact = true;
  }
  if (!canSeeDonorContact) delete out.donor_phone;
  res.json(out);
});

router.post('/', authMiddleware, roleMiddleware('donor'), async (req, res) => {
  const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls } = req.body;
  if (!title || !category || !quantity || !expiry_date || !pickup_address) return res.status(400).json({ error: 'Title, category, quantity, expiry date, and pickup address are required' });
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
  if (new Date(expiry_date).toString() === 'Invalid Date' || new Date(expiry_date) <= new Date()) return res.status(400).json({ error: 'Expiry date must be in the future' });
  try {
    const images = sanitizeImageUrls(image_urls);
    const id = await insert(`INSERT INTO food_listings (user_id, title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, String(title).trim(), description || null, category, qty, unit || 'servings', price || 0, expiry_date, String(pickup_address).trim(), pickup_instructions || null, images]);
    const listing = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [id]);
    res.status(201).json(withRemaining(listing));
  } catch (err) { res.status(500).json({ error: 'Failed to create listing' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, status } = req.body;
  const nextCategory = category || listing.category;
  if (!VALID_CATEGORIES.includes(nextCategory)) return res.status(400).json({ error: 'Invalid category' });
  const nextQty = quantity != null ? Number(quantity) : listing.quantity;
  if (!Number.isFinite(nextQty) || nextQty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
  const nextExpiry = expiry_date || listing.expiry_date;
  if (expiry_date && (new Date(expiry_date).toString() === 'Invalid Date' || new Date(expiry_date) <= new Date())) return res.status(400).json({ error: 'Expiry date must be in the future' });
  try {
    const images = sanitizeImageUrls(image_urls ?? listing.image_urls);
    await run(`UPDATE food_listings SET title=?, description=?, category=?, quantity=?, unit=?, price=?, expiry_date=?, pickup_address=?, pickup_instructions=?, image_urls=?, status=? WHERE id=?`, [title ? String(title).trim() : listing.title, description ?? listing.description, nextCategory, nextQty, unit || listing.unit, price ?? listing.price, nextExpiry, pickup_address ? String(pickup_address).trim() : listing.pickup_address, pickup_instructions ?? listing.pickup_instructions, images, status || listing.status, req.params.id]);
    await recomputeListingStatus(req.params.id);
    const updated = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [req.params.id]);
    res.json(withRemaining(updated));
  } catch (err) { res.status(500).json({ error: 'Failed to update listing' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [req.params.id]);
  if (active.count > 0) return res.status(409).json({ error: 'Cannot delete a listing with active reservations. Cancel them first.' });
  try {
    await run('DELETE FROM food_listings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Listing deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete listing' }); }
});

router.post('/:id/close', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  if (['collected', 'expired', 'cancelled'].includes(listing.status)) return res.status(400).json({ error: 'Listing is already closed' });
  const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [req.params.id]);
  if (active.count > 0) return res.status(409).json({ error: 'Cannot close a listing with pending or approved reservations' });
  try {
    await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Listing marked as donated' });
  } catch (err) { res.status(500).json({ error: 'Failed to close listing' }); }
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']; cb(null, allowed.includes(file.mimetype)); } });

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'left2serve', transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] }, (err, result) => err ? reject(err) : resolve(result.secure_url));
    stream.end(buffer);
  });
}

router.post('/upload', authMiddleware, upload.array('images', 5), async (req, res) => {
  try { const urls = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer))); res.json({ urls }); } catch { res.status(500).json({ error: 'Upload failed' }); }
});

router.get('/', async (req, res) => {
  const { category, status, search } = req.query;
  let query = `SELECT fl.*, u.name as donor_name, u.organization as donor_org FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE 1=1`;
  const params = [];
  if (category) { query += ' AND fl.category = ?'; params.push(category); }
  if (status) { query += ' AND fl.status = ?'; params.push(status); } else { query += " AND fl.status = 'available'"; }
  if (search) { query += ' AND (fl.title LIKE ? OR fl.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY fl.created_at DESC';
  const listings = await all(query, params);
  res.json(listings.map(l => ({ ...l, image_urls: l.image_urls || [] })));
});

router.get('/mine', authMiddleware, async (req, res) => {
  const listings = await all('SELECT * FROM food_listings WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(listings.map(l => ({ ...l, image_urls: l.image_urls || [] })));
});

router.get('/:id', async (req, res) => {
  const listing = await get(`SELECT fl.*, u.name as donor_name, u.organization as donor_org, u.phone as donor_phone FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.id = ?`, [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  listing.image_urls = listing.image_urls || [];
  res.json(listing);
});

router.post('/', authMiddleware, roleMiddleware('donor'), async (req, res) => {
  const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls } = req.body;
  if (!title || !category || !quantity || !expiry_date || !pickup_address) return res.status(400).json({ error: 'Title, category, quantity, expiry date, and pickup address are required' });
  const id = await insert(`INSERT INTO food_listings (user_id, title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, title, description || null, category, quantity, unit || 'servings', price || 0, expiry_date, pickup_address, pickup_instructions || null, image_urls || []]);
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [id]);
  listing.image_urls = listing.image_urls || [];
  res.status(201).json(listing);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, status } = req.body;
  await run(`UPDATE food_listings SET title=?, description=?, category=?, quantity=?, unit=?, price=?, expiry_date=?, pickup_address=?, pickup_instructions=?, image_urls=?, status=? WHERE id=?`, [title || listing.title, description ?? listing.description, category || listing.category, quantity || listing.quantity, unit || listing.unit, price ?? listing.price, expiry_date || listing.expiry_date, pickup_address || listing.pickup_address, pickup_instructions ?? listing.pickup_instructions, image_urls ?? listing.image_urls, status || listing.status, req.params.id]);
  const updated = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  updated.image_urls = updated.image_urls || [];
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  await run('DELETE FROM food_listings WHERE id = ?', [req.params.id]);
  res.json({ message: 'Listing deleted' });
});

export default router;
import { Router } from 'express';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ngo', 'volunteer'), async (req, res) => {
  const { food_listing_id, quantity, pickup_time, notes } = req.body;
  if (!food_listing_id || !quantity) return res.status(400).json({ error: 'food_listing_id and quantity are required' });
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [food_listing_id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'available') return res.status(400).json({ error: 'Listing is no longer available' });
  const id = await insert('INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes) VALUES (?, ?, ?, ?, ?)', [food_listing_id, req.user.id, quantity, pickup_time || null, notes || null]);
  await run("UPDATE food_listings SET status = 'reserved' WHERE id = ?", [food_listing_id]);
  const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
  res.status(201).json(reservation);
});

router.get('/', authMiddleware, async (req, res) => {
  const reservations = await all(`SELECT r.*, fl.title as food_title, fl.pickup_address, fl.image_urls, u.name as donor_name FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON fl.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC`, [req.user.id]);
  res.json(reservations.map(r => ({ ...r, image_urls: r.image_urls || [] })));
});

router.get('/listing/:listingId', authMiddleware, async (req, res) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const reservations = await all(`SELECT r.*, u.name as reserver_name, u.phone as reserver_phone, u.organization as reserver_org FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.food_listing_id = ? ORDER BY r.created_at DESC`, [req.params.listingId]);
  res.json(reservations);
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
  if (listing.user_id !== req.user.id && reservation.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const { status } = req.body;
  const allowedStatuses = ['collected', 'cancelled'];
  if (listing.user_id === req.user.id) allowedStatuses.push('approved');
  if (reservation.user_id === req.user.id) allowedStatuses.push('cancelled');
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: `Cannot set status to ${status}` });
  await run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
  if (status === 'collected') await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [reservation.food_listing_id]);
  else if (status === 'cancelled') await run("UPDATE food_listings SET status = 'available' WHERE id = ?", [reservation.food_listing_id]);
  const updated = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  res.json(updated);
});

export default router;
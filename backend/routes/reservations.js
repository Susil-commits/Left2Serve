import { Router } from 'express';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createNotification } from '../db/notify.js';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ngo', 'volunteer'), async (req, res) => {
  const { food_listing_id, quantity, pickup_time, notes } = req.body;
  if (!food_listing_id || !quantity) return res.status(400).json({ error: 'food_listing_id and quantity are required' });
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
  if (pickup_time && (new Date(pickup_time).toString() === 'Invalid Date' || new Date(pickup_time) < new Date())) return res.status(400).json({ error: 'Pickup time must be in the future' });
  try {
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [food_listing_id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'available') return res.status(400).json({ error: 'Listing is no longer available' });
    if (new Date(listing.expiry_date) <= new Date()) return res.status(400).json({ error: 'This listing has expired' });
    if (qty > listing.quantity) return res.status(400).json({ error: `Quantity exceeds available ${listing.quantity} ${listing.unit}` });
    const [existing] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('pending','approved')", [food_listing_id, req.user.id]);
    if (existing) return res.status(409).json({ error: 'You already have an active reservation for this listing' });
    const id = await insert('INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes) VALUES (?, ?, ?, ?, ?)', [food_listing_id, req.user.id, qty, pickup_time || null, notes || null]);
    await run("UPDATE food_listings SET status = 'reserved' WHERE id = ?", [food_listing_id]);
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
    const reserver = await get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await createNotification(
      listing.user_id,
      'reservation_new',
      'New reservation request',
      `${reserver?.name || 'Someone'} requested ${qty} ${listing.unit} of "${listing.title}"`,
      { reservationId: id, listingId: Number(food_listing_id), reserverName: reserver?.name }
    );
    res.status(201).json(reservation);
  } catch (err) { res.status(500).json({ error: 'Failed to create reservation' }); }
});

router.get('/', authMiddleware, async (req, res) => {
  const reservations = await all(`SELECT r.*, fl.title as food_title, fl.pickup_address, fl.image_urls, u.name as donor_name, u.phone as donor_phone, u.organization as donor_org FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON fl.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC`, [req.user.id]);
  res.json(reservations.map(r => {
    const safe = { ...r, image_urls: r.image_urls || [] };
    if (!['approved', 'collected'].includes(r.status)) delete safe.donor_phone;
    return safe;
  }));
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
  const isOwner = listing && listing.user_id === req.user.id;
  const isReserver = reservation.user_id === req.user.id;
  if (!isOwner && !isReserver) return res.status(403).json({ error: 'Not authorized' });
  const { status } = req.body;
  const allowed = new Set(['collected', 'cancelled']);
  if (isOwner) allowed.add('approved');
  if (!allowed.has(status)) return res.status(400).json({ error: `Cannot set status to ${status}` });
  try {
    await run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    if (status === 'collected') await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [reservation.food_listing_id]);
    else if (status === 'cancelled') await run("UPDATE food_listings SET status = 'available' WHERE id = ?", [reservation.food_listing_id]);
    const updated = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    const info = await get('SELECT title, user_id FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    const title = info?.title;
    const donorId = info?.user_id;
    const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
    if (status === 'approved' && isOwner) {
      await createNotification(reservation.user_id, 'reservation_approved', 'Reservation approved', `Your reservation for "${title}" was approved.`, ctx);
    } else if (status === 'collected') {
      if (isOwner) await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Donor marked your reservation for "${title}" as collected.`, ctx);
      else if (isReserver) await createNotification(donorId, 'reservation_collected', 'Pickup completed', `Your listing "${title}" was collected.`, ctx);
    } else if (status === 'cancelled') {
      const recipient = isOwner ? reservation.user_id : donorId;
      const by = isOwner ? 'Donor cancelled' : 'You cancelled';
      await createNotification(recipient, 'reservation_cancelled', 'Reservation cancelled', `${by} the reservation for "${title}".`, ctx);
    }
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed to update reservation' }); }
});

export default router;

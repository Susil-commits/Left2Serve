import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendReservationApprovedEmail, sendOrderUpdateEmail, sendOrderCancelledEmail } from '../utils/email.js';
import { Router } from 'express';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createNotification } from '../db/notify.js';
import { getAvailability, recomputeListingStatus } from '../db/availability.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { validateIdParam } from '../middleware/validateParam.js';

const router = Router();

const reservationSchema = z.object({
  food_listing_id: z.preprocess((val) => Number(val), z.number().int().positive('food_listing_id must be a positive integer')),
  quantity: z.preprocess((val) => Number(val), z.number().int().min(1, 'Quantity must be at least 1')),
  pickup_time: z.string().optional().nullable().refine((date) => !date || (!isNaN(Date.parse(date)) && new Date(date) > new Date()), { message: 'Pickup time must be in the future' }),
  notes: z.string().optional().nullable(),
  payment_method: z.string().optional()
});

router.post('/', authMiddleware, roleMiddleware('ngo', 'volunteer'), validate(reservationSchema), async (req: Request, res: Response) => {
  const { food_listing_id, quantity, pickup_time, notes, payment_method } = req.body;
  const qty = Number(quantity);
  try {
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [food_listing_id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'available') return res.status(400).json({ error: 'Listing is no longer available' });
    if (new Date(listing.expiry_date) <= new Date()) return res.status(400).json({ error: 'This listing has expired' });
    const { remaining } = await getAvailability(food_listing_id);
    if (qty > remaining) return res.status(400).json({ error: `Only ${remaining} ${listing.unit} available` });
    const [existing] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('pending','approved')", [food_listing_id, req.user!.id]);
    if (existing) return res.status(409).json({ error: 'You already have an active reservation for this listing' });

    const price = Number(listing.price) || 0;
    const amount = Math.round(price * qty * 100) / 100;
    let method = 'none';
    let paymentStatus = 'paid';
    if (amount > 0) {
      if (payment_method === 'razorpay') return res.status(400).json({ error: 'Use the payment endpoint for Razorpay' });
      method = 'cod';
      paymentStatus = 'pending';
    }

    const id = await insert('INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [food_listing_id, req.user!.id, qty, pickup_time || null, notes || null, method, paymentStatus, amount]);
    await recomputeListingStatus(food_listing_id);
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
    const reserver = await get('SELECT name FROM users WHERE id = ?', [req.user!.id]);
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

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const reservations = await all(`SELECT r.*, fl.title as food_title, fl.pickup_address, fl.image_urls, u.name as donor_name, u.phone as donor_phone, u.organization as donor_org FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON fl.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC`, [req.user!.id]);
  res.json(reservations.map(r => {
    const safe = { ...r, image_urls: r.image_urls || [] };
    if (!['approved', 'collected'].includes(r.status)) delete safe.donor_phone;
    return safe;
  }));
});

router.get('/listing/:listingId', authMiddleware, validateIdParam('listingId'), async (req: Request, res: Response) => {
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [req.params.listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
  const reservations = await all(`SELECT r.*, u.name as reserver_name, u.phone as reserver_phone, u.organization as reserver_org FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.food_listing_id = ? ORDER BY r.created_at DESC`, [req.params.listingId]);
  res.json(reservations);
});

router.get('/:id/qr-token', authMiddleware, validateIdParam('id'), async (req: Request, res: Response): Promise<any> => {
  const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  if (reservation.user_id !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
  if (reservation.status !== 'approved') return res.status(400).json({ error: 'Only approved reservations can be collected' });

  // Token expires in 1 hour
  const token = jwt.sign({ reservationId: reservation.id, action: 'collect' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  res.json({ token });
});

router.post('/verify-qr', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded.action !== 'collect') return res.status(400).json({ error: 'Invalid token action' });
    
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [decoded.reservationId]);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    if (!listing || listing.user_id !== req.user!.id) return res.status(403).json({ error: 'Only the donor can scan this QR code' });
    if (reservation.status === 'collected') return res.status(400).json({ error: 'Already collected' });
    if (reservation.status !== 'approved') return res.status(400).json({ error: 'Reservation is not approved' });
    
    await run("UPDATE reservations SET status = 'collected' WHERE id = ?", [reservation.id]);
    await recomputeListingStatus(reservation.food_listing_id);
    const updated = await get('SELECT * FROM reservations WHERE id = ?', [reservation.id]);
    const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
    
    await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Donor scanned your QR code and marked "${listing.title}" as collected.`, ctx);
    
    const reserver = await get('SELECT name, email FROM users WHERE id = ?', [reservation.user_id]);
    if (reserver?.email) sendOrderUpdateEmail(reserver.email, reserver.name, listing.title, 'collected').catch(console.error);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired QR token' });
  }
});

router.patch('/:id', authMiddleware, validateIdParam('id'), async (req: Request, res: Response): Promise<any> => {
  const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  const listing = await get('SELECT * FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
  const isOwner = listing && listing.user_id === req.user!.id;
  const isReserver = reservation.user_id === req.user!.id;
  if (!isOwner && !isReserver) return res.status(403).json({ error: 'Not authorized' });
  const { status } = req.body;
  const allowed = new Set(['collected', 'cancelled']);
  if (isOwner) allowed.add('approved');
  if (!allowed.has(status)) return res.status(400).json({ error: `Cannot set status to ${status}` });
  try {
    await run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    await recomputeListingStatus(reservation.food_listing_id);
    const updated = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    const info = await get('SELECT title, user_id, pickup_address FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    const title = info?.title;
    const donorId = info?.user_id;
    const pickupAddress = info?.pickup_address;
    const reserver = await get('SELECT name, email FROM users WHERE id = ?', [reservation.user_id]);
    const donor = await get('SELECT name, email FROM users WHERE id = ?', [donorId]);
    
    const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
    if (status === 'approved' && isOwner) {
      await createNotification(reservation.user_id, 'reservation_approved', 'Reservation approved', `Your reservation for "${title}" was approved.`, ctx);
      if (reserver?.email) {
        sendReservationApprovedEmail(reserver.email, reserver.name, title, pickupAddress).catch(console.error);
      }
    } else if (status === 'collected') {
      if (isOwner) {
        await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Donor marked your reservation for "${title}" as collected.`, ctx);
        if (reserver?.email) sendOrderUpdateEmail(reserver.email, reserver.name, title, 'collected').catch(console.error);
      } else if (isReserver) {
        await createNotification(donorId, 'reservation_collected', 'Pickup completed', `Your listing "${title}" was collected.`, ctx);
        if (donor?.email) sendOrderUpdateEmail(donor.email, donor.name, title, 'collected').catch(console.error);
      }
    } else if (status === 'cancelled') {
      const recipientId = isOwner ? reservation.user_id : donorId;
      const recipient = isOwner ? reserver : donor;
      const by = isOwner ? 'Donor cancelled' : 'You cancelled';
      await createNotification(recipientId, 'reservation_cancelled', 'Reservation cancelled', `${by} the reservation for "${title}".`, ctx);
      if (recipient?.email) sendOrderCancelledEmail(recipient.email, recipient.name, title).catch(console.error);
    }
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed to update reservation' }); }
});

export default router;

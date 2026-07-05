import { Router } from 'express';
import crypto from 'crypto';
import { get, all, run, insert } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createNotification } from '../db/notify.js';
import { getAvailability, recomputeListingStatus } from '../db/availability.js';

const router = Router();

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_CONFIGURED = !!(KEY_ID && KEY_SECRET);
const RAZORPAY_API = 'https://api.razorpay.com/v1';

function authHeader() {
  return 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
}

async function createRazorpayOrder(amountPaise, receipt) {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    const msg = data?.error?.description || data?.error?.reason || 'Failed to create Razorpay order';
    throw new Error(msg);
  }
  return data;
}

function verifySignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

router.post('/config', (req, res) => {
  res.json({ configured: RAZORPAY_CONFIGURED, key_id: RAZORPAY_CONFIGURED ? KEY_ID : null });
});

router.post('/create-order', authMiddleware, roleMiddleware('ngo', 'volunteer'), async (req, res) => {
  if (!RAZORPAY_CONFIGURED) return res.status(503).json({ error: 'Razorpay is not configured on the server' });
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
    const { remaining } = await getAvailability(food_listing_id);
    if (qty > remaining) return res.status(400).json({ error: `Only ${remaining} ${listing.unit} available` });
    const price = Number(listing.price) || 0;
    if (price <= 0) return res.status(400).json({ error: 'This listing is free and does not need online payment' });
    const [existing] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('pending','approved')", [food_listing_id, req.user.id]);
    if (existing) return res.status(409).json({ error: 'You already have an active reservation for this listing' });

    const amountRupees = Math.round(price * qty * 100) / 100;
    const amountPaise = Math.round(price * qty * 100);

    let order;
    try { order = await createRazorpayOrder(amountPaise, `l2s_${req.user.id}_${Date.now()}`); }
    catch (e) { return res.status(502).json({ error: e.message || 'Failed to create payment order' }); }

    const id = await insert(
      'INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount, razorpay_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [food_listing_id, req.user.id, qty, pickup_time || null, notes || null, 'razorpay', 'pending', amountRupees, order.id]
    );
    await recomputeListingStatus(food_listing_id);
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
    const reserver = await get('SELECT name, email, phone FROM users WHERE id = ?', [req.user.id]);
    await createNotification(
      listing.user_id,
      'reservation_new',
      'New reservation request',
      `${reserver?.name || 'Someone'} requested ${qty} ${listing.unit} of "${listing.title}"`,
      { reservationId: id, listingId: Number(food_listing_id), reserverName: reserver?.name }
    );
    res.status(201).json({
      reservation_id: id,
      razorpay_order_id: order.id,
      amount: amountPaise,
      currency: 'INR',
      key_id: KEY_ID,
      name: 'Left2Serve',
      description: `Payment for ${listing.title}`,
      reservation,
      prefill: { name: reserver?.name || '', email: reserver?.email || '', contact: reserver?.phone || '' }
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify', authMiddleware, roleMiddleware('ngo', 'volunteer'), async (req, res) => {
  if (!RAZORPAY_CONFIGURED) return res.status(503).json({ error: 'Razorpay is not configured on the server' });
  const { reservation_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!reservation_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment verification details' });
  try {
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservation_id]);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (reservation.payment_method !== 'razorpay') return res.status(400).json({ error: 'This reservation is not a Razorpay payment' });
    if (reservation.razorpay_order_id !== razorpay_order_id) return res.status(400).json({ error: 'Order ID mismatch' });
    if (reservation.payment_status === 'paid') return res.json({ success: true, reservation, message: 'Payment already verified' });

    const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      await run("UPDATE reservations SET payment_status = 'failed' WHERE id = ?", [reservation_id]);
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }
    await run('UPDATE reservations SET payment_status = ?, razorpay_payment_id = ?, razorpay_signature = ? WHERE id = ?', ['paid', razorpay_payment_id, razorpay_signature, reservation_id]);
    const updated = await get('SELECT * FROM reservations WHERE id = ?', [reservation_id]);
    res.json({ success: true, reservation: updated });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

export default router;

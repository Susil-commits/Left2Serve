import crypto from 'crypto';
import { get, all, run, insert } from '../db/database.js';
import { createNotification } from '../db/notify.js';
import { getAvailability, recomputeListingStatus } from '../db/availability.js';
import { AppError } from '../utils/AppError.js';

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET as string);
export const RAZORPAY_CONFIGURED = !!(KEY_ID && KEY_SECRET);
const RAZORPAY_API = 'https://api.razorpay.com/v1';

function authHeader() {
  return 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
}

export class PaymentService {
  static async createRazorpayOrder(amountPaise: number, receipt: string) {
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

  static verifySignature(orderId: string, paymentId: string, signature: string) {
    const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  static async createOrder(userId: number, data: any) {
    const { food_listing_id, quantity, pickup_time, notes } = data;
    const qty = Number(quantity);
    
    if (pickup_time && (new Date(pickup_time).toString() === 'Invalid Date' || new Date(pickup_time) < new Date())) {
      throw new AppError(400, 'Pickup time must be in the future');
    }
    
    const listing = await get('SELECT * FROM food_listings WHERE id = ?', [food_listing_id]);
    if (!listing) throw new AppError(404, 'Listing not found');
    if (listing.status !== 'available') throw new AppError(400, 'Listing is no longer available');
    if (new Date(listing.expiry_date) <= new Date()) throw new AppError(400, 'This listing has expired');
    
    const { remaining } = await getAvailability(food_listing_id);
    if (qty > remaining) throw new AppError(400, `Only ${remaining} ${listing.unit} available`);
    
    const price = Number(listing.price) || 0;
    if (price <= 0) throw new AppError(400, 'This listing is free and does not need online payment');
    
    const [existing] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('pending','approved')", [food_listing_id, userId]);
    if (existing) throw new AppError(409, 'You already have an active reservation for this listing');

    const amountPaise = Math.round(price * qty * 100);
    const amountRupees = amountPaise / 100;

    let order;
    try {
      order = await this.createRazorpayOrder(amountPaise, `l2s_${userId}_${Date.now()}`);
    } catch (e: any) {
      throw new AppError(502, e.message || 'Failed to create payment order');
    }

    const id = await insert(
      'INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount, razorpay_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [food_listing_id, userId, qty, pickup_time || null, notes || null, 'razorpay', 'pending', amountRupees, order.id]
    );
    
    await recomputeListingStatus(food_listing_id);
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
    const reserver = await get('SELECT name, email, phone FROM users WHERE id = ?', [userId]);
    
    await createNotification(
      listing.user_id,
      'reservation_new',
      'New reservation request',
      `${reserver?.name || 'Someone'} requested ${qty} ${listing.unit} of "${listing.title}"`,
      { reservationId: id, listingId: Number(food_listing_id), reserverName: reserver?.name }
    );
    
    return {
      reservation_id: id,
      razorpay_order_id: order.id,
      amount: amountPaise,
      currency: 'INR',
      key_id: KEY_ID,
      name: 'Left2Serve',
      description: `Payment for ${listing.title}`,
      reservation,
      prefill: { name: reserver?.name || '', email: reserver?.email || '', contact: reserver?.phone || '' }
    };
  }

  static async verifyPayment(userId: number, data: any) {
    const { reservation_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservation_id]);
    if (!reservation) throw new AppError(404, 'Reservation not found');
    if (reservation.user_id !== userId) throw new AppError(403, 'Not authorized');
    if (reservation.payment_method !== 'razorpay') throw new AppError(400, 'This reservation is not a Razorpay payment');
    if (reservation.razorpay_order_id !== razorpay_order_id) throw new AppError(400, 'Order ID mismatch');
    if (reservation.payment_status === 'paid') return { success: true, reservation, message: 'Payment already verified' };

    const valid = this.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      await run("UPDATE reservations SET payment_status = 'failed' WHERE id = ?", [reservation_id]);
      throw new AppError(400, 'Payment signature verification failed');
    }
    
    await run(
      "UPDATE reservations SET payment_status = ?, status = 'pending', razorpay_payment_id = ?, razorpay_signature = ? WHERE id = ?",
      ['paid', razorpay_payment_id, razorpay_signature, reservation_id]
    );
    await recomputeListingStatus(reservation.food_listing_id as string);
    
    const updated = await get('SELECT * FROM reservations WHERE id = ?', [reservation_id]);
    return { success: true, reservation: updated };
  }
}

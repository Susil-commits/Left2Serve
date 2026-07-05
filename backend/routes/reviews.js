import { Router } from 'express';
import { get, all, insert } from '../db/database.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  const { reservationId, rating, comment } = req.body;
  const r = Number(rating);
  if (!reservationId) return res.status(400).json({ error: 'reservationId is required' });
  if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  if (comment && String(comment).length > 500) return res.status(400).json({ error: 'Comment is too long (max 500 chars)' });
  try {
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    const listing = await get('SELECT id, user_id, title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isDonor = listing.user_id === req.user.id;
    const isReceiver = reservation.user_id === req.user.id;
    if (!isDonor && !isReceiver) return res.status(403).json({ error: 'Not authorized to review this reservation' });
    if (reservation.status !== 'collected') return res.status(400).json({ error: 'You can only review after the pickup is completed' });
    const revieweeId = isDonor ? reservation.user_id : listing.user_id;
    if (revieweeId === req.user.id) return res.status(400).json({ error: 'You cannot review yourself' });
    const existing = await get('SELECT id FROM reviews WHERE reservation_id = ? AND reviewer_id = ?', [reservationId, req.user.id]);
    if (existing) return res.status(409).json({ error: 'You have already reviewed this reservation' });
    const id = await insert(
      'INSERT INTO reviews (reservation_id, listing_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [reservationId, listing.id, req.user.id, revieweeId, r, comment ? String(comment).trim().slice(0, 500) : null]
    );
    const review = await get('SELECT * FROM reviews WHERE id = ?', [id]);
    res.status(201).json(review);
  } catch (err) { res.status(500).json({ error: 'Failed to submit review' }); }
});

router.get('/reservation/:id', authMiddleware, async (req, res) => {
  try {
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    const listing = await get('SELECT id, user_id, title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    if (!listing) return res.json({ canReview: false, myReview: null });
    const isDonor = listing.user_id === req.user.id;
    const isReceiver = reservation.user_id === req.user.id;
    if (!isDonor && !isReceiver) return res.json({ canReview: false, myReview: null });
    const myReview = await get('SELECT * FROM reviews WHERE reservation_id = ? AND reviewer_id = ?', [reservation.id, req.user.id]);
    const revieweeId = isDonor ? reservation.user_id : listing.user_id;
    const reviewee = await get('SELECT name, organization, role FROM users WHERE id = ?', [revieweeId]);
    const canReview = reservation.status === 'collected' && !myReview;
    res.json({ canReview, myReview, reviewee, foodTitle: listing.title, reservationId: reservation.id });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch review status' }); }
});

router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) return res.json({ average: 0, count: 0, reviews: [] });
    const reviews = await all(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at, u.name as reviewer_name, u.role as reviewer_role, fl.title as food_title
       FROM reviews rv
       JOIN users u ON rv.reviewer_id = u.id
       LEFT JOIN food_listings fl ON rv.listing_id = fl.id
       WHERE rv.reviewee_id = ? ORDER BY rv.created_at DESC`,
      [userId]
    );
    const count = reviews.length;
    const average = count ? Math.round((reviews.reduce((a, r) => a + Number(r.rating), 0) / count) * 10) / 10 : 0;
    res.json({ average, count, reviews });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

export default router;

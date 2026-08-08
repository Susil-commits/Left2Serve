import { get, all, insert } from '../db/database.js';
import { AppError } from '../utils/AppError.js';
export class ReviewService {
    static async createReview(userId, data) {
        const { reservationId, rating, comment } = data;
        const r = Number(rating);
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        if (!reservation)
            throw new AppError(404, 'Reservation not found');
        const listing = await get('SELECT id, user_id, title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        if (!listing)
            throw new AppError(404, 'Listing not found');
        const isDonor = listing.user_id === userId;
        const isReceiver = reservation.user_id === userId;
        if (!isDonor && !isReceiver)
            throw new AppError(403, 'Not authorized to review this reservation');
        if (reservation.status !== 'collected')
            throw new AppError(400, 'You can only review after the pickup is completed');
        const revieweeId = isDonor ? reservation.user_id : listing.user_id;
        if (revieweeId === userId)
            throw new AppError(400, 'You cannot review yourself');
        const existing = await get('SELECT id FROM reviews WHERE reservation_id = ? AND reviewer_id = ?', [reservationId, userId]);
        if (existing)
            throw new AppError(409, 'You have already reviewed this reservation');
        const id = await insert('INSERT INTO reviews (reservation_id, listing_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)', [reservationId, listing.id, userId, revieweeId, r, comment ? String(comment).trim().slice(0, 500) : null]);
        return await get('SELECT * FROM reviews WHERE id = ?', [id]);
    }
    static async getReservationReviewInfo(reservationId, userId) {
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        if (!reservation)
            throw new AppError(404, 'Reservation not found');
        const listing = await get('SELECT id, user_id, title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        if (!listing)
            return { canReview: false, myReview: null };
        const isDonor = listing.user_id === userId;
        const isReceiver = reservation.user_id === userId;
        if (!isDonor && !isReceiver)
            return { canReview: false, myReview: null };
        const myReview = await get('SELECT * FROM reviews WHERE reservation_id = ? AND reviewer_id = ?', [reservation.id, userId]);
        const revieweeId = isDonor ? reservation.user_id : listing.user_id;
        const reviewee = await get('SELECT name, organization, role FROM users WHERE id = ?', [revieweeId]);
        const canReview = reservation.status === 'collected' && !myReview;
        return { canReview, myReview, reviewee, foodTitle: listing.title, reservationId: reservation.id };
    }
    static async getUserReviews(userId) {
        if (!Number.isFinite(userId) || userId <= 0)
            return { average: 0, count: 0, reviews: [] };
        const reviews = await all(`SELECT rv.id, rv.rating, rv.comment, rv.created_at, u.name as reviewer_name, u.role as reviewer_role, fl.title as food_title
       FROM reviews rv
       JOIN users u ON rv.reviewer_id = u.id
       LEFT JOIN food_listings fl ON rv.listing_id = fl.id
       WHERE rv.reviewee_id = ? ORDER BY rv.created_at DESC`, [userId]);
        const count = reviews.length;
        const average = count ? Math.round((reviews.reduce((a, r) => a + Number(r.rating), 0) / count) * 10) / 10 : 0;
        return { average, count, reviews };
    }
}

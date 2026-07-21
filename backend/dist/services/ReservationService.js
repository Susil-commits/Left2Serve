import { get, all, insert, run } from '../db/database.js';
import { getAvailability, recomputeListingStatus } from '../db/availability.js';
import { createNotification } from '../db/notify.js';
import { sendReservationApprovedEmail, sendOrderUpdateEmail, sendOrderCancelledEmail } from '../utils/email.js';
import { AppError } from '../utils/AppError.js';
export class ReservationService {
    static async createReservation(userId, payload) {
        const { food_listing_id, quantity, pickup_time, notes, payment_method } = payload;
        const qty = Number(quantity);
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [food_listing_id]);
        if (!listing)
            throw new AppError(404, 'Listing not found');
        if (listing.status !== 'available')
            throw new AppError(400, 'Listing is no longer available');
        if (new Date(listing.expiry_date) <= new Date())
            throw new AppError(400, 'This listing has expired');
        const { remaining } = await getAvailability(food_listing_id);
        if (qty > remaining)
            throw new AppError(400, `Only ${remaining} ${listing.unit} available`);
        const [existing] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('pending','approved')", [food_listing_id, userId]);
        if (existing)
            throw new AppError(409, 'You already have an active reservation for this listing');
        const price = Number(listing.price) || 0;
        const amount = Math.round(price * qty * 100) / 100;
        let method = 'none';
        let paymentStatus = 'paid';
        if (amount > 0) {
            if (payment_method === 'razorpay')
                throw new AppError(400, 'Use the payment endpoint for Razorpay');
            method = 'cod';
            paymentStatus = 'pending';
        }
        const id = await insert('INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [food_listing_id, userId, qty, pickup_time || null, notes || null, method, paymentStatus, amount]);
        await recomputeListingStatus(food_listing_id);
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
        const reserver = await get('SELECT name FROM users WHERE id = ?', [userId]);
        await createNotification(listing.user_id, 'reservation_new', 'New reservation request', `${reserver?.name || 'Someone'} requested ${qty} ${listing.unit} of "${listing.title}"`, { reservationId: id, listingId: Number(food_listing_id), reserverName: reserver?.name });
        return reservation;
    }
    static async getMyReservations(userId) {
        const reservations = await all(`SELECT r.*, fl.title as food_title, fl.pickup_address, fl.image_urls, u.name as donor_name, u.phone as donor_phone, u.organization as donor_org FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON fl.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC`, [userId]);
        return reservations.map(r => {
            const safe = { ...r, image_urls: r.image_urls || [] };
            if (!['approved', 'collected'].includes(r.status))
                delete safe.donor_phone;
            return safe;
        });
    }
    static async getListingReservations(listingId, userId) {
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [listingId]);
        if (!listing)
            throw new AppError(404, 'Listing not found');
        if (listing.user_id !== userId)
            throw new AppError(403, 'Not authorized');
        return await all(`SELECT r.*, u.name as reserver_name, u.phone as reserver_phone, u.organization as reserver_org FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.food_listing_id = ? ORDER BY r.created_at DESC`, [listingId]);
    }
    static async verifyQR(decodedToken, userId) {
        if (decodedToken.action !== 'collect')
            throw new AppError(400, 'Invalid token action');
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [decodedToken.reservationId]);
        if (!reservation)
            throw new AppError(404, 'Reservation not found');
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        if (!listing || listing.user_id !== userId)
            throw new AppError(403, 'Only the donor can scan this QR code');
        if (reservation.status === 'collected')
            throw new AppError(400, 'Already collected');
        if (reservation.status !== 'approved')
            throw new AppError(400, 'Reservation is not approved');
        await run("UPDATE reservations SET status = 'collected' WHERE id = ?", [reservation.id]);
        await recomputeListingStatus(reservation.food_listing_id);
        const updated = await get('SELECT * FROM reservations WHERE id = ?', [reservation.id]);
        const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
        await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Donor scanned your QR code and marked "${listing.title}" as collected.`, ctx);
        const reserver = await get('SELECT name, email FROM users WHERE id = ?', [reservation.user_id]);
        if (reserver?.email)
            sendOrderUpdateEmail(reserver.email, reserver.name, listing.title, 'collected').catch(console.error);
        return updated;
    }
    static async updateReservationStatus(reservationId, userId, status) {
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        if (!reservation)
            throw new AppError(404, 'Reservation not found');
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        const isOwner = listing && listing.user_id === userId;
        const isReserver = reservation.user_id === userId;
        if (!isOwner && !isReserver)
            throw new AppError(403, 'Not authorized');
        const allowed = new Set(['collected', 'cancelled']);
        if (isOwner)
            allowed.add('approved');
        if (!allowed.has(status))
            throw new AppError(400, `Cannot set status to ${status}`);
        await run('UPDATE reservations SET status = ? WHERE id = ?', [status, reservationId]);
        await recomputeListingStatus(reservation.food_listing_id);
        const updated = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        const info = await get('SELECT title, user_id, pickup_address FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
        const reserver = await get('SELECT name, email FROM users WHERE id = ?', [reservation.user_id]);
        const donor = await get('SELECT name, email FROM users WHERE id = ?', [info?.user_id]);
        if (status === 'approved' && isOwner) {
            await createNotification(reservation.user_id, 'reservation_approved', 'Reservation approved', `Your reservation for "${info?.title}" was approved.`, ctx);
            if (reserver?.email)
                sendReservationApprovedEmail(reserver.email, reserver.name, info?.title, info?.pickup_address).catch(console.error);
        }
        else if (status === 'collected') {
            if (isOwner) {
                await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Donor marked your reservation for "${info?.title}" as collected.`, ctx);
                if (reserver?.email)
                    sendOrderUpdateEmail(reserver.email, reserver.name, info?.title, 'collected').catch(console.error);
            }
            else if (isReserver) {
                await createNotification(info?.user_id, 'reservation_collected', 'Pickup completed', `Your listing "${info?.title}" was collected.`, ctx);
                if (donor?.email)
                    sendOrderUpdateEmail(donor.email, donor.name, info?.title, 'collected').catch(console.error);
            }
        }
        else if (status === 'cancelled') {
            const recipientId = isOwner ? reservation.user_id : info?.user_id;
            const recipient = isOwner ? reserver : donor;
            const by = isOwner ? 'Donor cancelled' : 'You cancelled';
            await createNotification(recipientId, 'reservation_cancelled', 'Reservation cancelled', `${by} the reservation for "${info?.title}".`, ctx);
            if (recipient?.email)
                sendOrderCancelledEmail(recipient.email, recipient.name, info?.title).catch(console.error);
        }
        return updated;
    }
}

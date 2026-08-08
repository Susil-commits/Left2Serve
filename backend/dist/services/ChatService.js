import { get, all } from '../db/database.js';
import { AppError } from '../utils/AppError.js';
export class ChatService {
    static async getMessages(reservationId, userId, userRole) {
        const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        if (!reservation)
            throw new AppError(404, 'Reservation not found');
        const listing = await get('SELECT user_id FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
        const isReserver = userId === reservation.user_id;
        const isDonor = listing && userId === listing.user_id;
        const isAdmin = userRole === 'admin';
        if (!isReserver && !isDonor && !isAdmin) {
            throw new AppError(403, 'Not authorized to view this chat');
        }
        const messages = await all(`
      SELECT m.*, u.name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.reservation_id = ?
      ORDER BY m.created_at ASC
    `, [reservationId]);
        return messages;
    }
}

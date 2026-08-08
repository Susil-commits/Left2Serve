import { get, all, run } from '../db/database.js';
import { AppError } from '../utils/AppError.js';
export class NotificationService {
    static async getNotifications(userId) {
        const notifications = await all('SELECT id, type, title, message, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]);
        return notifications.map((n) => ({ ...n, data: n.data || {} }));
    }
    static async getUnreadCount(userId) {
        const row = await get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
        return { count: row ? row.count : 0 };
    }
    static async markAllAsRead(userId) {
        await run('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [userId]);
    }
    static async markAsRead(id, userId) {
        const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!notification)
            throw new AppError(404, 'Notification not found');
        await run('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    }
    static async deleteNotification(id, userId) {
        const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!notification)
            throw new AppError(404, 'Notification not found');
        await run('DELETE FROM notifications WHERE id = ?', [id]);
    }
}

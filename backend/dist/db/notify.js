import { insert } from './database.js';
export async function createNotification(userId, type, title, message, data = {}) {
    if (!userId)
        return;
    try {
        const id = await insert('INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)', [userId, type, title, message, data]);
        import('../server.js').then(({ io }) => {
            io.to(`user_${userId}`).emit('new_notification', {
                id, type, title, message, data, is_read: false, created_at: new Date().toISOString()
            });
        }).catch(err => console.error('Failed to emit socket notification', err));
    }
    catch {
        // notifications are best-effort and must never break the calling flow
    }
}

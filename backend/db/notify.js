import { insert } from './database.js';

export async function createNotification(userId, type, title, message, data = {}) {
  if (!userId) return;
  try {
    await insert(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, data]
    );
  } catch {
    // notifications are best-effort and must never break the calling flow
  }
}

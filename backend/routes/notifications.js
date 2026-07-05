import { Router } from 'express';
import { get, all, run } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await all(
      'SELECT id, type, title, message, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    res.json(notifications.map((n) => ({ ...n, data: n.data || {} })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const row = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: row ? row.count : 0 });
  } catch {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    await run('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    await run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;

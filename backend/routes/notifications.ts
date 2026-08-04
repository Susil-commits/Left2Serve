import { Request, Response } from 'express';
import { Router } from 'express';
import { get, all, run } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const notifications = await all(
      'SELECT id, type, title, message, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.user!.id]
    );
    res.json(notifications.map((n) => ({ ...n, data: n.data || {} })));
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const row = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user!.id]
    );
    res.json({ count: row ? row.count : 0 });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    await run('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [req.user!.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    await run('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const notification = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    await run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

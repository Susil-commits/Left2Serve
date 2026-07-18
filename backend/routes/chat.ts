import { Router, Request, Response } from 'express';
import { get, all } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/:reservationId', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  const reservationId = req.params.reservationId;
  const reservation = await get('SELECT * FROM reservations WHERE id = ?', [reservationId]);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  
  const listing = await get('SELECT user_id FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
  
  const isReserver = req.user!.id === reservation.user_id;
  const isDonor = listing && req.user!.id === listing.user_id;
  const isAdmin = req.user!.role === 'admin';
  
  if (!isReserver && !isDonor && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to view this chat' });
  }

  try {
    const messages = await all(`
      SELECT m.*, u.name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.reservation_id = ?
      ORDER BY m.created_at ASC
    `, [reservationId]);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;

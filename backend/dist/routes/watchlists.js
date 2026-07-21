import { Router } from 'express';
import { get, all, insert, run } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware('ngo', 'volunteer'));
router.get('/', async (req, res) => {
    try {
        const lists = await all('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(lists);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch watchlists' });
    }
});
const watchlistSchema = z.object({
    keyword: z.string().optional().nullable(),
    latitude: z.preprocess((val) => Number(val), z.number()),
    longitude: z.preprocess((val) => Number(val), z.number()),
    radius_km: z.preprocess((val) => Number(val) || 10, z.number().positive())
});
router.post('/', validate(watchlistSchema), async (req, res) => {
    const { keyword, latitude, longitude, radius_km } = req.body;
    try {
        const id = await insert('INSERT INTO watchlists (user_id, keyword, latitude, longitude, radius_km) VALUES (?, ?, ?, ?, ?)', [req.user.id, keyword ? String(keyword).trim() : null, Number(latitude), Number(longitude), Number(radius_km) || 10]);
        const w = await get('SELECT * FROM watchlists WHERE id = ?', [id]);
        res.status(201).json(w);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create watchlist' });
    }
});
router.delete('/:id', validateIdParam('id'), async (req, res) => {
    const item = await get('SELECT * FROM watchlists WHERE id = ?', [req.params.id]);
    if (!item)
        return res.status(404).json({ error: 'Not found' });
    if (item.user_id !== req.user.id)
        return res.status(403).json({ error: 'Not authorized' });
    try {
        await run('DELETE FROM watchlists WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});
export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { WatchlistController } from '../controllers/WatchlistController.js';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('ngo', 'volunteer'));

router.get('/', WatchlistController.getUserWatchlists);

const watchlistSchema = z.object({
  keyword: z.string().optional().nullable(),
  latitude: z.preprocess((val) => Number(val), z.number()),
  longitude: z.preprocess((val) => Number(val), z.number()),
  radius_km: z.preprocess((val) => Number(val) || 10, z.number().positive())
});

router.post('/', validate(watchlistSchema), WatchlistController.createWatchlist);
router.delete('/:id', validateIdParam('id'), WatchlistController.deleteWatchlist);

export default router;

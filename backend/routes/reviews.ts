import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { ReviewController } from '../controllers/ReviewController.js';

const router = Router();

const reviewSchema = z.object({
  reservationId: z.preprocess((val) => Number(val), z.number().int().positive('reservationId is required')),
  rating: z.preprocess((val) => Number(val), z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5')),
  comment: z.string().max(500, 'Comment is too long (max 500 chars)').optional().nullable()
});

router.post('/', authMiddleware, validate(reviewSchema), ReviewController.createReview);
router.get('/reservation/:id', authMiddleware, validateIdParam('id'), ReviewController.getReservationReview);
router.get('/user/:userId', optionalAuth, validateIdParam('userId'), ReviewController.getUserReviews);

export default router;

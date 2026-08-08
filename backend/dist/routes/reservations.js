import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { ReservationController } from '../controllers/ReservationController.js';
const router = Router();
const reservationSchema = z.object({
    food_listing_id: z.preprocess((val) => Number(val), z.number().int().positive('food_listing_id must be a positive integer')),
    quantity: z.preprocess((val) => Number(val), z.number().int().min(1, 'Quantity must be at least 1')),
    pickup_time: z.string().optional().nullable().refine((date) => !date || (!isNaN(Date.parse(date)) && new Date(date) > new Date()), { message: 'Pickup time must be in the future' }),
    notes: z.string().optional().nullable(),
    payment_method: z.string().optional()
});
router.post('/', authMiddleware, roleMiddleware('ngo', 'volunteer'), validate(reservationSchema), ReservationController.create);
router.get('/', authMiddleware, ReservationController.getMine);
router.get('/listing/:listingId', authMiddleware, validateIdParam('listingId'), ReservationController.getForListing);
router.get('/:id/qr-token', authMiddleware, validateIdParam('id'), ReservationController.generateQrToken);
router.post('/verify-qr', authMiddleware, ReservationController.verifyQrToken);
router.patch('/:id', authMiddleware, validateIdParam('id'), ReservationController.updateStatus);
export default router;

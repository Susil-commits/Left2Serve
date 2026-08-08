import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();

const createOrderSchema = z.object({
  food_listing_id: z.number().int().positive(),
  quantity: z.number().int().positive().min(1),
  pickup_time: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

const verifySchema = z.object({
  reservation_id: z.number().int().positive(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

router.post('/config', PaymentController.getConfig);
router.post('/create-order', authMiddleware, roleMiddleware('ngo', 'volunteer'), validate(createOrderSchema), PaymentController.createOrder);
router.post('/verify', authMiddleware, roleMiddleware('ngo', 'volunteer'), validate(verifySchema), PaymentController.verifyPayment);

export default router;

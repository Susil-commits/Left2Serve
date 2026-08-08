import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, roleMiddleware, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { cacheMiddleware } from '../utils/cache.js';
import { ListingController } from '../controllers/ListingController.js';
const router = Router();
router.post('/upload', authMiddleware, ListingController.uploadMiddleware, ListingController.upload);
router.post('/analyze-image', authMiddleware, roleMiddleware('donor'), ListingController.analyzeImage);
router.get('/', cacheMiddleware(60), ListingController.getAll);
router.get('/analytics/me', authMiddleware, roleMiddleware('donor'), ListingController.getAnalyticsMe);
router.get('/mine', authMiddleware, ListingController.getMine);
router.get('/templates', authMiddleware, ListingController.getTemplates);
router.get('/stats', cacheMiddleware(300), ListingController.getStats);
router.get('/impact', cacheMiddleware(300), ListingController.getImpact);
router.get('/:id', optionalAuth, validateIdParam('id'), ListingController.getOne);
const listingSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    category: z.enum(['event', 'restaurant', 'hotel', 'caterer', 'household']),
    quantity: z.preprocess((val) => Number(val), z.number().min(1, 'Quantity must be at least 1')),
    unit: z.string().optional().default('servings'),
    price: z.preprocess((val) => Number(val) || 0, z.number().min(0).optional()),
    expiry_date: z.string().refine((date) => !isNaN(Date.parse(date)) && new Date(date) > new Date(), { message: 'Expiry date must be in the future' }),
    pickup_address: z.string().min(1, 'Pickup address is required'),
    pickup_instructions: z.string().optional().nullable(),
    image_urls: z.array(z.string()).optional().default([]),
    dietary_preferences: z.array(z.string()).optional().default([]),
    latitude: z.preprocess((val) => val != null ? Number(val) : null, z.number().nullable().optional()),
    longitude: z.preprocess((val) => val != null ? Number(val) : null, z.number().nullable().optional()),
    is_template: z.boolean().optional().default(false)
});
router.post('/', authMiddleware, roleMiddleware('donor'), validate(listingSchema), ListingController.create);
const updateListingSchema = listingSchema.partial().extend({
    status: z.enum(['available', 'reserved', 'collected', 'expired', 'cancelled']).optional()
});
router.put('/:id', authMiddleware, validateIdParam('id'), validate(updateListingSchema), ListingController.update);
router.delete('/:id', authMiddleware, validateIdParam('id'), ListingController.delete);
router.post('/:id/close', authMiddleware, validateIdParam('id'), ListingController.close);
export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { AIController } from '../controllers/AIController.js';

const router = Router();

router.post('/describe', authMiddleware, roleMiddleware('donor'), AIController.describe);
router.post('/chat', AIController.chat);

export default router;


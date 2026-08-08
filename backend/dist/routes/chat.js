import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { ChatController } from '../controllers/ChatController.js';
const router = Router();
router.get('/:reservationId', authMiddleware, ChatController.getMessages);
export default router;

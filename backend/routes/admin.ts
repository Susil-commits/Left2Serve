import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { cacheMiddleware } from '../utils/cache.js';
import { AdminController } from '../controllers/AdminController.js';

const router = Router();

router.post('/login', AdminController.login);

router.get('/stats', authMiddleware, roleMiddleware('admin'), cacheMiddleware(60), AdminController.getStats);
router.get('/users', authMiddleware, roleMiddleware('admin'), AdminController.getUsers);
router.get('/ngos', authMiddleware, roleMiddleware('admin'), AdminController.getNgos);
router.get('/orders', authMiddleware, roleMiddleware('admin'), AdminController.getOrders);
router.get('/listings', authMiddleware, roleMiddleware('admin'), AdminController.getListings);
router.delete('/listings/:id', authMiddleware, roleMiddleware('admin'), validateIdParam('id'), AdminController.deleteListing);
router.patch('/orders/:id', authMiddleware, roleMiddleware('admin'), validateIdParam('id'), AdminController.updateOrder);
router.patch('/users/:id', authMiddleware, roleMiddleware('admin'), validateIdParam('id'), AdminController.updateUser);
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), validateIdParam('id'), AdminController.deleteUser);
router.patch('/users/:id/password', authMiddleware, roleMiddleware('admin'), validateIdParam('id'), AdminController.resetUserPassword);
router.get('/trends', authMiddleware, roleMiddleware('admin'), AdminController.getTrends);
router.get('/audit-log', authMiddleware, roleMiddleware('admin'), AdminController.getAuditLog);
router.get('/export', authMiddleware, roleMiddleware('admin'), AdminController.exportData);

export default router;
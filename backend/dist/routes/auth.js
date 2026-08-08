import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthController } from '../controllers/AuthController.js';
const router = Router();
const registerSchema = z.object({
    name: z.string().min(2, 'Name is too short'),
    email: z.string().email('Invalid email address'),
    password: z.string(),
    role: z.enum(['donor', 'ngo', 'volunteer']),
    phone: z.string().optional(),
    address: z.string().optional(),
    organization: z.string().optional(),
});
const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string(),
    otp: z.string().optional(),
});
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.getMe);
router.get('/impact', authMiddleware, AuthController.getImpact);
router.put('/profile', authMiddleware, AuthController.updateProfile);
router.put('/password', authMiddleware, AuthController.updatePassword);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/2fa/setup', authMiddleware, AuthController.setup2FA);
router.post('/2fa/verify', authMiddleware, AuthController.verify2FA);
router.post('/2fa/disable', authMiddleware, AuthController.disable2FA);
export default router;

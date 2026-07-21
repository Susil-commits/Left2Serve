import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validatePassword } from '../db/password.js';
import { validate } from '../middleware/validate.js';
import { AuthService } from '../services/AuthService.js';
import { AppError } from '../utils/AppError.js';

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

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const pwCheck = validatePassword(req.body.password);
    if (!pwCheck.ok) throw new AppError(400, pwCheck.error!);
    
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const result = await AuthService.login(req.body, req.ip || '');
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await AuthService.getMe(req.user!.id);
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/impact', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const impact = await AuthService.getImpact(req.user!.id, req.user!.role);
    res.json(impact);
  } catch (err) { next(err); }
});

router.put('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (req.body.name !== undefined && String(req.body.name).trim().length < 2) {
      throw new AppError(400, 'Name is too short');
    }
    const user = await AuthService.updateProfile(req.user!.id, req.body);
    res.json(user);
  } catch (err) { next(err); }
});

router.put('/password', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { current, newPass } = req.body;
    if (!current || !newPass) throw new AppError(400, 'Current and new password are required');
    
    const pwCheck = validatePassword(newPass);
    if (!pwCheck.ok) throw new AppError(400, pwCheck.error!);
    
    const result = await AuthService.updatePassword(req.user!.id, req.user!.role, req.body, req.ip || '');
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.body.email) throw new AppError(400, 'Email is required');
    const result = await AuthService.forgotPassword(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.body.token || !req.body.newPassword) throw new AppError(400, 'Token and new password are required');
    
    const pwCheck = validatePassword(req.body.newPassword);
    if (!pwCheck.ok) throw new AppError(400, pwCheck.error!);
    
    const result = await AuthService.resetPassword(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/2fa/setup', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const result = await AuthService.setup2FA(req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/2fa/verify', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.body.token) throw new AppError(400, 'Token is required');
    const result = await AuthService.verify2FA(req.user!.id, req.body.token);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/2fa/disable', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.body.token) throw new AppError(400, 'Token is required');
    const result = await AuthService.disable2FA(req.user!.id, req.body.token);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;

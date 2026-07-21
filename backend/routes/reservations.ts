import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { ReservationService } from '../services/ReservationService.js';
import { AppError } from '../utils/AppError.js';
import { get } from '../db/database.js';

const router = Router();

const reservationSchema = z.object({
  food_listing_id: z.preprocess((val) => Number(val), z.number().int().positive('food_listing_id must be a positive integer')),
  quantity: z.preprocess((val) => Number(val), z.number().int().min(1, 'Quantity must be at least 1')),
  pickup_time: z.string().optional().nullable().refine((date) => !date || (!isNaN(Date.parse(date)) && new Date(date) > new Date()), { message: 'Pickup time must be in the future' }),
  notes: z.string().optional().nullable(),
  payment_method: z.string().optional()
});

router.post('/', authMiddleware, roleMiddleware('ngo', 'volunteer'), validate(reservationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservation = await ReservationService.createReservation(req.user!.id, req.body);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await ReservationService.getMyReservations(req.user!.id);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
});

router.get('/listing/:listingId', authMiddleware, validateIdParam('listingId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await ReservationService.getListingReservations(Number(req.params.listingId), req.user!.id);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/qr-token', authMiddleware, validateIdParam('id'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (!reservation) throw new AppError(404, 'Reservation not found');
    if (reservation.user_id !== req.user!.id) throw new AppError(403, 'Not authorized');
    if (reservation.status !== 'approved') throw new AppError(400, 'Only approved reservations can be collected');

    // Token expires in 1 hour
    const token = jwt.sign({ reservationId: reservation.id, action: 'collect' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-qr', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError(400, 'Token is required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const updated = await ReservationService.verifyQR(decoded, req.user!.id);
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError(400, 'Invalid or expired QR token'));
    } else {
      next(err);
    }
  }
});

router.patch('/:id', authMiddleware, validateIdParam('id'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { status } = req.body;
    const updated = await ReservationService.updateReservationStatus(Number(req.params.id), req.user!.id, status);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

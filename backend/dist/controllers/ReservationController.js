import { ReservationService } from '../services/ReservationService.js';
import { AppError } from '../utils/AppError.js';
import { get } from '../db/database.js';
import jwt from 'jsonwebtoken';
export class ReservationController {
    static async create(req, res, next) {
        try {
            const reservation = await ReservationService.createReservation(req.user.id, req.body);
            res.status(201).json(reservation);
        }
        catch (err) {
            next(err);
        }
    }
    static async getMine(req, res, next) {
        try {
            const reservations = await ReservationService.getMyReservations(req.user.id);
            res.json(reservations);
        }
        catch (err) {
            next(err);
        }
    }
    static async getForListing(req, res, next) {
        try {
            const reservations = await ReservationService.getListingReservations(Number(req.params.listingId), req.user.id);
            res.json(reservations);
        }
        catch (err) {
            next(err);
        }
    }
    static async generateQrToken(req, res, next) {
        try {
            const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
            if (!reservation)
                throw new AppError(404, 'Reservation not found');
            if (reservation.user_id !== req.user.id)
                throw new AppError(403, 'Not authorized');
            if (reservation.status !== 'approved')
                throw new AppError(400, 'Only approved reservations can be collected');
            // 1-hour token expiration
            const token = jwt.sign({ reservationId: reservation.id, action: 'collect' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        }
        catch (err) {
            next(err);
        }
    }
    static async verifyQrToken(req, res, next) {
        try {
            const { token } = req.body;
            if (!token)
                throw new AppError(400, 'Token is required');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const updated = await ReservationService.verifyQR(decoded, req.user.id);
            res.json(updated);
        }
        catch (err) {
            if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
                next(new AppError(400, 'Invalid or expired QR token'));
            }
            else {
                next(err);
            }
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const updated = await ReservationService.updateReservationStatus(Number(req.params.id), req.user.id, status);
            res.json(updated);
        }
        catch (err) {
            next(err);
        }
    }
}

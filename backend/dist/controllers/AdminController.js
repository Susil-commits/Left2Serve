import { AdminService } from '../services/AdminService.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
const ADMIN_CODE = process.env.ADMIN_CODE;
export class AdminController {
    static async login(req, res, next) {
        try {
            const { adminCode } = req.body;
            if (!ADMIN_CODE) {
                res.status(503).json({ error: 'Admin access is not configured' });
                return;
            }
            if (!adminCode) {
                res.status(400).json({ error: 'Admin code is required' });
                return;
            }
            const provided = Buffer.from(String(adminCode));
            const expected = Buffer.from(ADMIN_CODE);
            const isValid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
            if (!isValid) {
                res.status(401).json({ error: 'Invalid admin code' });
                return;
            }
            const token = jwt.sign({ id: 0, role: 'admin', tv: 0 }, process.env.JWT_SECRET, { expiresIn: '8h' });
            res.json({ token, user: { id: 0, name: 'Administrator', email: 'admin@left2serve.com', role: 'admin' } });
        }
        catch (err) {
            next(err);
        }
    }
    static async getStats(req, res, next) {
        try {
            const stats = await AdminService.getStats();
            res.json(stats);
        }
        catch (err) {
            next(err);
        }
    }
    static async getUsers(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const result = await AdminService.getUsers(page, limit);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async getNgos(req, res, next) {
        try {
            const ngos = await AdminService.getNgos();
            res.json(ngos);
        }
        catch (err) {
            next(err);
        }
    }
    static async getOrders(req, res, next) {
        try {
            const orders = await AdminService.getOrders();
            res.json(orders);
        }
        catch (err) {
            next(err);
        }
    }
    static async getListings(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const result = await AdminService.getListings(page, limit);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteListing(req, res, next) {
        try {
            await AdminService.deleteListing(req.params.id, req.ip || '');
            res.json({ message: 'Listing deleted' });
        }
        catch (err) {
            if (err.message === 'NOT_FOUND')
                res.status(404).json({ error: 'Listing not found' });
            else
                next(err);
        }
    }
    static async updateOrder(req, res, next) {
        try {
            const { status } = req.body;
            await AdminService.updateOrder(req.params.id, status, req.ip || '');
            res.json({ message: 'Order updated' });
        }
        catch (err) {
            if (err.message === 'INVALID_STATUS')
                res.status(400).json({ error: 'Invalid status' });
            else if (err.message === 'NOT_FOUND')
                res.status(404).json({ error: 'Order not found' });
            else
                next(err);
        }
    }
    static async updateUser(req, res, next) {
        try {
            const { role, isActive } = req.body;
            const updated = await AdminService.updateUser(req.params.id, { role, isActive }, req.ip || '');
            res.json(updated);
        }
        catch (err) {
            if (err.message === 'NOT_FOUND')
                res.status(404).json({ error: 'User not found' });
            else if (err.message === 'INVALID_ROLE')
                res.status(400).json({ error: 'Invalid role' });
            else if (err.message === 'ADMIN_IMMUNITY')
                res.status(400).json({ error: 'Cannot modify admin role' });
            else if (err.message === 'NO_UPDATES')
                res.status(400).json({ error: 'No valid fields to update' });
            else
                next(err);
        }
    }
    static async deleteUser(req, res, next) {
        try {
            await AdminService.deleteUser(req.params.id, req.ip || '');
            res.json({ message: 'User deleted' });
        }
        catch (err) {
            if (err.message === 'NOT_FOUND')
                res.status(404).json({ error: 'User not found' });
            else if (err.message === 'ADMIN_IMMUNITY')
                res.status(400).json({ error: 'Cannot delete admin user' });
            else
                next(err);
        }
    }
    static async resetUserPassword(req, res, next) {
        try {
            const providedPassword = req.body?.password ? String(req.body.password) : undefined;
            const password = await AdminService.resetUserPassword(req.params.id, providedPassword, req.ip || '');
            res.json({ message: 'Password reset. The user will need to log in again.', password: providedPassword ? undefined : password });
        }
        catch (err) {
            if (err.message === 'NOT_FOUND')
                res.status(404).json({ error: 'User not found' });
            else if (err.message === 'ADMIN_IMMUNITY')
                res.status(400).json({ error: 'Cannot reset an admin password' });
            else if (err.message === 'PASSWORD_TOO_SHORT')
                res.status(400).json({ error: 'New password must be at least 8 characters' });
            else
                next(err);
        }
    }
    static async getTrends(req, res, next) {
        try {
            const days = Math.min(parseInt(req.query.days) || 14, 90);
            const trends = await AdminService.getTrends(days);
            res.json(trends);
        }
        catch (err) {
            next(err);
        }
    }
    static async getAuditLog(req, res, next) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 200);
            const logs = await AdminService.getAuditLog(limit);
            res.json(logs);
        }
        catch (err) {
            next(err);
        }
    }
    static async exportData(req, res, next) {
        try {
            const type = req.query.type;
            const csvData = await AdminService.getExportData(type, req.ip || '');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${new Date().getTime()}.csv`);
            res.send(csvData);
        }
        catch (err) {
            if (err.message === 'INVALID_TYPE')
                res.status(400).json({ error: 'Invalid export type. Must be users, listings, or reservations.' });
            else if (err.message === 'NO_DATA')
                res.status(404).send('No data found');
            else
                next(err);
        }
    }
}

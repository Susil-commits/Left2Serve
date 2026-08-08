import { validatePassword } from '../db/password.js';
import { AuthService } from '../services/AuthService.js';
import { AppError } from '../utils/AppError.js';
export class AuthController {
    static async register(req, res, next) {
        try {
            const pwCheck = validatePassword(req.body.password);
            if (!pwCheck.ok)
                throw new AppError(400, pwCheck.error);
            const result = await AuthService.register(req.body);
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const result = await AuthService.login(req.body, req.ip || '');
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async getMe(req, res, next) {
        try {
            const user = await AuthService.getMe(req.user.id);
            res.json(user);
        }
        catch (err) {
            next(err);
        }
    }
    static async getImpact(req, res, next) {
        try {
            const impact = await AuthService.getImpact(req.user.id, req.user.role);
            res.json(impact);
        }
        catch (err) {
            next(err);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            if (req.body.name !== undefined && String(req.body.name).trim().length < 2) {
                throw new AppError(400, 'Name is too short');
            }
            const user = await AuthService.updateProfile(req.user.id, req.body);
            res.json(user);
        }
        catch (err) {
            next(err);
        }
    }
    static async updatePassword(req, res, next) {
        try {
            const { current, newPass } = req.body;
            if (!current || !newPass)
                throw new AppError(400, 'Current and new password are required');
            const pwCheck = validatePassword(newPass);
            if (!pwCheck.ok)
                throw new AppError(400, pwCheck.error);
            const result = await AuthService.updatePassword(req.user.id, req.user.role, req.body, req.ip || '');
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async forgotPassword(req, res, next) {
        try {
            if (!req.body.email)
                throw new AppError(400, 'Email is required');
            const result = await AuthService.forgotPassword(req.body);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            if (!req.body.token || !req.body.newPassword)
                throw new AppError(400, 'Token and new password are required');
            const pwCheck = validatePassword(req.body.newPassword);
            if (!pwCheck.ok)
                throw new AppError(400, pwCheck.error);
            const result = await AuthService.resetPassword(req.body);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async setup2FA(req, res, next) {
        try {
            const result = await AuthService.setup2FA(req.user.id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async verify2FA(req, res, next) {
        try {
            if (!req.body.token)
                throw new AppError(400, 'Token is required');
            const result = await AuthService.verify2FA(req.user.id, req.body.token);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async disable2FA(req, res, next) {
        try {
            if (!req.body.token)
                throw new AppError(400, 'Token is required');
            const result = await AuthService.disable2FA(req.user.id, req.body.token);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}

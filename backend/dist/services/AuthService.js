import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { get, all, insert, run } from '../db/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';
import { audit } from '../db/audit.js';
import { AppError } from '../utils/AppError.js';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
const SECRET = process.env.JWT_SECRET;
const MAX_FAILED = 5;
export class AuthService {
    static signToken(user) {
        return jwt.sign({ id: user.id, role: user.role, tv: Number(user.token_version || 0) }, SECRET, { expiresIn: '7d' });
    }
    static async register(payload) {
        const { name, email, password, role, phone, address, organization } = payload;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (existing)
            throw new AppError(409, 'Email already registered');
        const password_hash = await bcrypt.hash(password, 12);
        const id = await insert('INSERT INTO users (name, email, password_hash, role, phone, address, organization) VALUES (?, ?, ?, ?, ?, ?, ?)', [String(name).trim(), normalizedEmail, password_hash, role, phone || null, address || null, organization || null]);
        const user = await get('SELECT id, name, email, role, token_version FROM users WHERE id = ?', [id]);
        const token = this.signToken(user);
        // Send welcome email asynchronously
        sendWelcomeEmail(normalizedEmail, String(name).trim()).catch(console.error);
        return { token, user: { id, name: user.name, email: normalizedEmail, role } };
    }
    static async login(payload, ip) {
        const { email, password } = payload;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
        if (!user)
            throw new AppError(401, 'Invalid credentials');
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const mins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            throw new AppError(423, `Account temporarily locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
        }
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            const attempts = Number(user.failed_attempts || 0) + 1;
            if (attempts >= MAX_FAILED) {
                await run("UPDATE users SET failed_attempts = 0, locked_until = NOW() + INTERVAL '15 minutes' WHERE id = ?", [user.id]);
            }
            else {
                await run('UPDATE users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
            }
            await audit({ actorRole: 'anonymous', action: 'login_failed', targetType: 'user', targetId: user.id, detail: `attempt ${attempts}`, ip });
            throw new AppError(401, 'Invalid credentials');
        }
        if (!user.is_active) {
            await audit({ actorId: user.id, actorRole: user.role, action: 'login_blocked_suspended', ip });
            throw new AppError(403, 'Your account has been suspended. Contact an administrator.');
        }
        if (user.two_factor_enabled) {
            if (!payload.otp) {
                return { requires2fa: true, message: 'Two-factor authentication code required' };
            }
            const isValid = verifySync({ token: payload.otp, secret: user.two_factor_secret });
            if (!isValid?.valid) {
                throw new AppError(401, 'Invalid two-factor authentication code');
            }
        }
        if (user.locked_until)
            await run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        else
            await run('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);
        const token = this.signToken(user);
        const { password_hash, token_version, failed_attempts, locked_until, is_active, two_factor_secret, ...safeUser } = user;
        await audit({ actorId: user.id, actorRole: user.role, action: 'login_success', ip });
        return { token, user: safeUser };
    }
    static async setup2FA(userId) {
        const user = await get('SELECT email, two_factor_enabled FROM users WHERE id = ?', [userId]);
        if (!user)
            throw new AppError(404, 'User not found');
        if (user.two_factor_enabled)
            throw new AppError(400, 'Two-factor authentication is already enabled');
        const secret = generateSecret();
        await run('UPDATE users SET two_factor_secret = ? WHERE id = ?', [secret, userId]);
        const otpauthUrl = generateURI({ label: user.email, issuer: 'Left2Serve', secret });
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        return { secret, qrCodeUrl };
    }
    static async verify2FA(userId, token) {
        const user = await get('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?', [userId]);
        if (!user)
            throw new AppError(404, 'User not found');
        if (user.two_factor_enabled)
            throw new AppError(400, 'Two-factor authentication is already enabled');
        if (!user.two_factor_secret)
            throw new AppError(400, '2FA setup not initiated');
        const isValid = verifySync({ token, secret: user.two_factor_secret });
        if (!isValid?.valid)
            throw new AppError(400, 'Invalid token');
        await run('UPDATE users SET two_factor_enabled = TRUE WHERE id = ?', [userId]);
        return { message: 'Two-factor authentication enabled successfully' };
    }
    static async disable2FA(userId, token) {
        const user = await get('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?', [userId]);
        if (!user)
            throw new AppError(404, 'User not found');
        if (!user.two_factor_enabled)
            throw new AppError(400, 'Two-factor authentication is not enabled');
        const isValid = verifySync({ token, secret: user.two_factor_secret });
        if (!isValid?.valid)
            throw new AppError(400, 'Invalid token');
        await run('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?', [userId]);
        return { message: 'Two-factor authentication disabled' };
    }
    static async getMe(userId) {
        const user = await get('SELECT id, name, email, role, phone, address, organization, avatar_url, two_factor_enabled, created_at FROM users WHERE id = ?', [userId]);
        if (!user)
            throw new AppError(404, 'User not found');
        return user;
    }
    static async getImpact(userId, role) {
        if (role === 'donor') {
            const [mealsRow] = await all("SELECT COALESCE(SUM(r.quantity), 0) AS total FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ? AND r.status = 'collected'", [userId]);
            const [listingsRow] = await all('SELECT COUNT(*) AS count FROM food_listings WHERE user_id = ?', [userId]);
            const [activeRow] = await all("SELECT COUNT(*) AS count FROM food_listings WHERE user_id = ? AND status = 'available'", [userId]);
            const [reservationsRow] = await all('SELECT COUNT(*) AS count FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ?', [userId]);
            const meals = Number(mealsRow.total) || 0;
            return { role: 'donor', mealsDonated: meals, listingsCreated: listingsRow.count, activeListings: activeRow.count, reservationsReceived: reservationsRow.count, co2Kg: Math.round(meals * 2.5) };
        }
        else if (role === 'ngo' || role === 'volunteer') {
            const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) AS total FROM reservations WHERE user_id = ? AND status = 'collected'", [userId]);
            const [reservationsRow] = await all('SELECT COUNT(*) AS count FROM reservations WHERE user_id = ?', [userId]);
            const meals = Number(mealsRow.total) || 0;
            return { role, mealsReceived: meals, reservationsMade: reservationsRow.count, co2Kg: Math.round(meals * 2.5) };
        }
        else {
            return { role: 'admin' };
        }
    }
    static async updateProfile(userId, payload) {
        const { name, phone, address, organization, avatar_url } = payload;
        await run('UPDATE users SET name = ?, phone = ?, address = ?, organization = ?, avatar_url = ? WHERE id = ?', [name != null ? String(name).trim() : null, phone || null, address || null, organization || null, avatar_url || null, userId]);
        return await get('SELECT id, name, email, role, phone, address, organization, avatar_url, created_at FROM users WHERE id = ?', [userId]);
    }
    static async updatePassword(userId, role, payload, ip) {
        const { current, newPass } = payload;
        const user = await get('SELECT password_hash, token_version FROM users WHERE id = ?', [userId]);
        if (!(await bcrypt.compare(current, user.password_hash)))
            throw new AppError(401, 'Current password is incorrect');
        const password_hash = await bcrypt.hash(newPass, 12);
        const nextVersion = Number(user.token_version || 0) + 1;
        await run('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', [password_hash, nextVersion, userId]);
        const fresh = await get('SELECT id, name, email, role, token_version FROM users WHERE id = ?', [userId]);
        const token = this.signToken(fresh);
        await audit({ actorId: userId, actorRole: role, action: 'password_change', ip });
        return { message: 'Password updated', token };
    }
    static async forgotPassword(payload) {
        const normalizedEmail = String(payload.email || '').trim().toLowerCase();
        const user = await get('SELECT id, name, email FROM users WHERE email = ?', [normalizedEmail]);
        if (!user)
            return { message: 'If that email exists, a reset link has been sent.' };
        const token = crypto.randomBytes(32).toString('hex');
        await run("UPDATE users SET reset_token = ?, reset_expires = NOW() + INTERVAL '1 hour' WHERE id = ?", [token, user.id]);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetLink = `${clientUrl}/reset-password?token=${token}`;
        sendPasswordResetEmail(user.email, user.name, resetLink).catch(console.error);
        return { message: 'If that email exists, a reset link has been sent.' };
    }
    static async resetPassword(payload) {
        const { token, newPassword } = payload;
        const user = await get('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()', [token]);
        if (!user)
            throw new AppError(400, 'Invalid or expired reset token');
        const password_hash = await bcrypt.hash(newPassword, 12);
        await run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL WHERE id = ?', [password_hash, user.id]);
        return { message: 'Password has been reset successfully. You can now log in.' };
    }
}

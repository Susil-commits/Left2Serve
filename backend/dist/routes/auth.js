import { Router } from 'express';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { get, all, insert, run } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { validatePassword } from '../db/password.js';
import { audit } from '../db/audit.js';
import { validate } from '../middleware/validate.js';
import crypto from 'crypto';
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
});
const SECRET = process.env.JWT_SECRET;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
function signToken(user) {
    return jwt.sign({ id: user.id, role: user.role, tv: Number(user.token_version || 0) }, SECRET, { expiresIn: '7d' });
}
router.post('/register', validate(registerSchema), async (req, res) => {
    const { name, email, password, role, phone, address, organization } = req.body;
    if (!name || !email || !password || !role)
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
    if (!['donor', 'ngo', 'volunteer'].includes(role))
        return res.status(400).json({ error: 'Invalid role' });
    if (!isValidEmail(email))
        return res.status(400).json({ error: 'Invalid email address' });
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok)
        return res.status(400).json({ error: pwCheck.error });
    if (String(name).trim().length < 2)
        return res.status(400).json({ error: 'Name is too short' });
    try {
        const normalizedEmail = normalizeEmail(email);
        const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });
        const password_hash = await bcrypt.hash(password, 12);
        const id = await insert('INSERT INTO users (name, email, password_hash, role, phone, address, organization) VALUES (?, ?, ?, ?, ?, ?, ?)', [String(name).trim(), normalizedEmail, password_hash, role, phone || null, address || null, organization || null]);
        const user = await get('SELECT id, name, email, role, token_version FROM users WHERE id = ?', [id]);
        const token = signToken(user);
        // Send welcome email asynchronously
        sendWelcomeEmail(normalizedEmail, String(name).trim()).catch(console.error);
        res.status(201).json({ token, user: { id, name: user.name, email: normalizedEmail, role } });
    }
    catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });
    const normalizedEmail = normalizeEmail(email);
    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const mins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            return res.status(423).json({ error: `Account temporarily locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` });
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
            await audit({ actorRole: 'anonymous', action: 'login_failed', targetType: 'user', targetId: user.id, detail: `attempt ${attempts}`, ip: req.ip });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.is_active) {
            await audit({ actorId: user.id, actorRole: user.role, action: 'login_blocked_suspended', ip: req.ip });
            return res.status(403).json({ error: 'Your account has been suspended. Contact an administrator.' });
        }
        if (user.locked_until)
            await run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        else
            await run('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);
        const token = signToken(user);
        const { password_hash, token_version, failed_attempts, locked_until, is_active, ...safeUser } = user;
        await audit({ actorId: user.id, actorRole: user.role, action: 'login_success', ip: req.ip });
        res.json({ token, user: safeUser });
    }
    catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});
router.get('/me', authMiddleware, async (req, res) => {
    const user = await get('SELECT id, name, email, role, phone, address, organization, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json(user);
});
router.get('/impact', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'donor') {
            const [mealsRow] = await all("SELECT COALESCE(SUM(r.quantity), 0) AS total FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ? AND r.status = 'collected'", [req.user.id]);
            const [listingsRow] = await all('SELECT COUNT(*) AS count FROM food_listings WHERE user_id = ?', [req.user.id]);
            const [activeRow] = await all("SELECT COUNT(*) AS count FROM food_listings WHERE user_id = ? AND status = 'available'", [req.user.id]);
            const [reservationsRow] = await all('SELECT COUNT(*) AS count FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ?', [req.user.id]);
            const meals = Number(mealsRow.total) || 0;
            res.json({ role: 'donor', mealsDonated: meals, listingsCreated: listingsRow.count, activeListings: activeRow.count, reservationsReceived: reservationsRow.count, co2Kg: Math.round(meals * 2.5) });
        }
        else if (req.user.role === 'ngo' || req.user.role === 'volunteer') {
            const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) AS total FROM reservations WHERE user_id = ? AND status = 'collected'", [req.user.id]);
            const [reservationsRow] = await all('SELECT COUNT(*) AS count FROM reservations WHERE user_id = ?', [req.user.id]);
            const meals = Number(mealsRow.total) || 0;
            res.json({ role: req.user.role, mealsReceived: meals, reservationsMade: reservationsRow.count, co2Kg: Math.round(meals * 2.5) });
        }
        else {
            res.json({ role: 'admin' });
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch impact' });
    }
});
router.put('/profile', authMiddleware, async (req, res) => {
    const { name, phone, address, organization } = req.body;
    if (name !== undefined && String(name).trim().length < 2)
        return res.status(400).json({ error: 'Name is too short' });
    try {
        await run('UPDATE users SET name = ?, phone = ?, address = ?, organization = ? WHERE id = ?', [name != null ? String(name).trim() : null, phone || null, address || null, organization || null, req.user.id]);
        const user = await get('SELECT id, name, email, role, phone, address, organization, created_at FROM users WHERE id = ?', [req.user.id]);
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.put('/password', authMiddleware, async (req, res) => {
    const { current, newPass } = req.body;
    if (!current || !newPass)
        return res.status(400).json({ error: 'Current and new password are required' });
    const pwCheck = validatePassword(newPass);
    if (!pwCheck.ok)
        return res.status(400).json({ error: pwCheck.error });
    try {
        const user = await get('SELECT password_hash, token_version FROM users WHERE id = ?', [req.user.id]);
        if (!(await bcrypt.compare(current, user.password_hash)))
            return res.status(401).json({ error: 'Current password is incorrect' });
        const password_hash = await bcrypt.hash(newPass, 12);
        const nextVersion = Number(user.token_version || 0) + 1;
        await run('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', [password_hash, nextVersion, req.user.id]);
        const fresh = await get('SELECT id, name, email, role, token_version FROM users WHERE id = ?', [req.user.id]);
        const token = signToken(fresh);
        await audit({ actorId: req.user.id, actorRole: req.user.role, action: 'password_change', ip: req.ip });
        res.json({ message: 'Password updated', token });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = normalizeEmail(email);
    try {
        const user = await get('SELECT id, name, email FROM users WHERE email = ?', [normalizedEmail]);
        if (!user)
            return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
        const token = crypto.randomBytes(32).toString('hex');
        await run("UPDATE users SET reset_token = ?, reset_expires = NOW() + INTERVAL '1 hour' WHERE id = ?", [token, user.id]);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetLink = `${clientUrl}/reset-password?token=${token}`;
        sendPasswordResetEmail(user.email, user.name, resetLink).catch(console.error);
        res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
});
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ error: 'Token and new password are required' });
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.ok)
        return res.status(400).json({ error: pwCheck.error });
    try {
        const user = await get('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()', [token]);
        if (!user)
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        const password_hash = await bcrypt.hash(newPassword, 12);
        await run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL WHERE id = ?', [password_hash, user.id]);
        res.json({ message: 'Password has been reset successfully. You can now log in.' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, all, run } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createNotification } from '../db/notify.js';
import { audit } from '../db/audit.js';
import { recomputeListingStatus } from '../db/availability.js';

const router = Router();
const ADMIN_CODE = process.env.ADMIN_CODE;
const USER_ROLES = ['donor', 'ngo', 'volunteer'];

function adminAudit(req, action, targetType, targetId, detail) {
  return audit({ actorRole: 'admin', action, targetType, targetId, detail, ip: req.ip });
}

router.post('/login', async (req, res) => {
  const { adminCode } = req.body;
  if (!ADMIN_CODE) return res.status(503).json({ error: 'Admin access is not configured' });
  if (!adminCode) return res.status(400).json({ error: 'Admin code is required' });
  if (adminCode !== ADMIN_CODE) return res.status(401).json({ error: 'Invalid admin code' });
  const token = jwt.sign({ id: 0, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: 0, name: 'Administrator', email: 'admin@left2serve.com', role: 'admin' } });
});

router.get('/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [usersRow] = await all('SELECT COUNT(*) as count FROM users');
    const [ngosRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'ngo'");
    const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
    const [volunteersRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'volunteer'");
    const [listingsRow] = await all('SELECT COUNT(*) as count FROM food_listings');
    const [activeListingsRow] = await all("SELECT COUNT(*) as count FROM food_listings WHERE status = 'available'");
    const [reservationsRow] = await all('SELECT COUNT(*) as count FROM reservations');
    const [pendingReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'");
    const [approvedReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'approved'");
    const [collectedReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'collected'");
    const [mealsSavedRow] = await all("SELECT COALESCE(SUM(quantity), 0) as total FROM reservations WHERE status = 'collected'");
    res.json({
      totalUsers: usersRow.count,
      totalNgos: ngosRow.count,
      totalDonors: donorsRow.count,
      totalVolunteers: volunteersRow.count,
      totalListings: listingsRow.count,
      activeListings: activeListingsRow.count,
      totalReservations: reservationsRow.count,
      pendingReservations: pendingReservationsRow.count,
      approvedReservations: approvedReservationsRow.count,
      collectedReservations: collectedReservationsRow.count,
      mealsSaved: mealsSavedRow.total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await all('SELECT id, name, email, role, phone, address, organization, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/ngos', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const ngos = await all("SELECT id, name, email, phone, address, organization, is_active, created_at FROM users WHERE role = 'ngo' ORDER BY created_at DESC");
    const ngosWithStats = await Promise.all(ngos.map(async (ngo) => {
      const [reservations] = await all('SELECT COUNT(*) as count FROM reservations WHERE user_id = ?', [ngo.id]);
      const [pending] = await all("SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = 'pending'", [ngo.id]);
      const [collected] = await all("SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = 'collected'", [ngo.id]);
      return { ...ngo, totalReservations: reservations.count, pendingReservations: pending.count, collectedReservations: collected.count };
    }));
    res.json(ngosWithStats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
});

router.get('/orders', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const orders = await all(`SELECT r.*, fl.title as food_title, fl.category as food_category, fl.quantity as food_quantity, fl.unit as food_unit, fl.pickup_address, fl.expiry_date, fl.status as listing_status, u.name as reserver_name, u.email as reserver_email, u.phone as reserver_phone, u.organization as reserver_org, d.name as donor_name, d.email as donor_email FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON r.user_id = u.id JOIN users d ON fl.user_id = d.id ORDER BY r.created_at DESC`);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/listings', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const listings = await all(`SELECT fl.*, u.name as donor_name, u.email as donor_email, u.phone as donor_phone, u.organization as donor_org FROM food_listings fl JOIN users u ON fl.user_id = u.id ORDER BY fl.created_at DESC`);
    res.json(listings.map(l => ({ ...l, image_urls: l.image_urls || [] })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.delete('/listings/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const listing = await get('SELECT id, user_id, title, status FROM food_listings WHERE id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await run('DELETE FROM food_listings WHERE id = ?', [req.params.id]);
    await createNotification(listing.user_id, 'listing_removed', 'Listing removed', `An admin removed your listing "${listing.title}".`, { listingId: Number(req.params.id) });
    await adminAudit(req, 'listing_delete', 'listing', Number(req.params.id), `removed listing "${listing.title}" (${listing.status})`);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

router.patch('/orders/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['approved', 'collected', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (!reservation) return res.status(404).json({ error: 'Order not found' });
    await run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    await recomputeListingStatus(reservation.food_listing_id);
    const info = await get('SELECT title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
    const title = info?.title;
    if (status === 'approved') await createNotification(reservation.user_id, 'reservation_approved', 'Reservation approved', `Admin approved your reservation for "${title}".`, ctx);
    else if (status === 'collected') await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Admin marked your reservation for "${title}" as collected.`, ctx);
    else if (status === 'cancelled') await createNotification(reservation.user_id, 'reservation_cancelled', 'Reservation cancelled', `Admin cancelled your reservation for "${title}".`, ctx);
    await adminAudit(req, `order_${status}`, 'reservation', Number(req.params.id), `order #${req.params.id} -> ${status}`);
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.patch('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const user = await get('SELECT id, role, is_active FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updates = [];
    const params = [];
    if (role !== undefined) {
      if (!USER_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      if (user.role === 'admin') return res.status(400).json({ error: 'Cannot modify admin role' });
      updates.push('role = ?');
      params.push(role);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(!!isActive);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    params.push(req.params.id);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const detail = [role !== undefined ? `role->${role}` : null, isActive !== undefined ? `active->${!!isActive}` : null].filter(Boolean).join(', ');
    if (isActive === false) await run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.params.id]);
    await adminAudit(req, 'user_update', 'user', Number(req.params.id), detail);
    const updated = await get('SELECT id, name, email, role, phone, address, organization, is_active, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin user' });
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    await adminAudit(req, 'user_delete', 'user', Number(req.params.id), `deleted user #${req.params.id}`);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.patch('/users/:id/password', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await get('SELECT id, role, email FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot reset an admin password' });
    const provided = req.body && req.body.password ? String(req.body.password) : null;
    if (provided && provided.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const gen = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
      let s = '';
      for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };
    const password = provided || gen();
    const password_hash = await bcrypt.hash(password, 12);
    await run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [password_hash, req.params.id]);
    await createNotification(user.id, 'password_reset', 'Password reset', 'An administrator reset your password. Please log in with the new password provided to you.', {});
    await adminAudit(req, 'password_reset', 'user', Number(req.params.id), `reset password for ${user.email}`);
    res.json({ message: 'Password reset. The user will need to log in again.', password: provided ? undefined : password });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/trends', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 14, 90);
    const reservations = await all(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count FROM reservations WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * ? GROUP BY created_at::date ORDER BY date ASC`,
      [days]
    );
    const meals = await all(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(quantity), 0) as count FROM reservations WHERE status = 'collected' AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ? GROUP BY created_at::date ORDER BY date ASC`,
      [days]
    );
    const mealsMap = new Map(meals.map((m) => [String(m.date), Number(m.count)]));
    const resMap = new Map(reservations.map((r) => [String(r.date), Number(r.count)]));
    const pad = (n) => String(n).padStart(2, '0');
    const localDayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = localDayKey(d);
      series.push({ date: key, reservations: resMap.get(key) || 0, meals: mealsMap.get(key) || 0 });
    }
    const byCategory = await all(
      `SELECT category, COUNT(*) as count FROM food_listings GROUP BY category ORDER BY count DESC`
    );
    res.json({ series, byCategory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

router.get('/audit-log', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = await all(
      'SELECT id, actor_id, actor_role, action, target_type, target_id, detail, ip, created_at FROM audit_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
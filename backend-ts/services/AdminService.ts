import { get, all, run } from '../db/database.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createNotification } from '../db/notify.js';
import { audit } from '../db/audit.js';
import { recomputeListingStatus } from '../db/availability.js';
import { Request } from 'express';

const USER_ROLES = ['donor', 'ngo', 'volunteer'];

export class AdminService {
  static async adminAudit(ip: string, action: string, targetType: string, targetId: number, detail: string) {
    return audit({ actorRole: 'admin', action, targetType, targetId, detail, ip });
  }

  static async getStats() {
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
    
    return {
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
    };
  }

  static async getUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const users = await all(
      'SELECT id, name, email, role, phone, address, organization, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [countRow] = await all('SELECT COUNT(*) as total FROM users');
    return { users, pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } };
  }

  static async getNgos() {
    const ngos = await all(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.address, u.organization, u.is_active, u.created_at,
        COUNT(r.id) as "totalReservations",
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as "pendingReservations",
        COUNT(CASE WHEN r.status = 'collected' THEN 1 END) as "collectedReservations"
      FROM users u
      LEFT JOIN reservations r ON u.id = r.user_id
      WHERE u.role = 'ngo'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 500
    `);
    return ngos;
  }

  static async getOrders() {
    const orders = await all(`SELECT r.*, fl.title as food_title, fl.category as food_category, fl.quantity as food_quantity, fl.unit as food_unit, fl.pickup_address, fl.expiry_date, fl.status as listing_status, u.name as reserver_name, u.email as reserver_email, u.phone as reserver_phone, u.organization as reserver_org, d.name as donor_name, d.email as donor_email FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON r.user_id = u.id JOIN users d ON fl.user_id = d.id ORDER BY r.created_at DESC LIMIT 500`);
    return orders;
  }

  static async getListings(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const listings = await all(
      `SELECT fl.*, u.name as donor_name, u.email as donor_email, u.phone as donor_phone, u.organization as donor_org FROM food_listings fl JOIN users u ON fl.user_id = u.id ORDER BY fl.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRow] = await all('SELECT COUNT(*) as total FROM food_listings');
    return { listings: listings.map(l => ({ ...l, image_urls: l.image_urls || [] })), pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } };
  }

  static async deleteListing(id: number | string, ip: string) {
    const listing = await get('SELECT id, user_id, title, status FROM food_listings WHERE id = ?', [id]);
    if (!listing) throw new Error('NOT_FOUND');
    await run('DELETE FROM food_listings WHERE id = ?', [id]);
    await createNotification(listing.user_id, 'listing_removed', 'Listing removed', `An admin removed your listing "${listing.title}".`, { listingId: Number(id) });
    await this.adminAudit(ip, 'listing_delete', 'listing', Number(id), `removed listing "${listing.title}" (${listing.status})`);
  }

  static async updateOrder(id: number | string, status: string, ip: string) {
    const allowed = ['approved', 'collected', 'cancelled'];
    if (!allowed.includes(status)) throw new Error('INVALID_STATUS');
    
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [id]);
    if (!reservation) throw new Error('NOT_FOUND');
    
    await run('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    await recomputeListingStatus(reservation.food_listing_id as string);
    const info = await get('SELECT title FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    const ctx = { reservationId: reservation.id, listingId: reservation.food_listing_id };
    const title = info?.title;
    
    if (status === 'approved') await createNotification(reservation.user_id, 'reservation_approved', 'Reservation approved', `Admin approved your reservation for "${title}".`, ctx);
    else if (status === 'collected') await createNotification(reservation.user_id, 'reservation_collected', 'Pickup completed', `Admin marked your reservation for "${title}" as collected.`, ctx);
    else if (status === 'cancelled') await createNotification(reservation.user_id, 'reservation_cancelled', 'Reservation cancelled', `Admin cancelled your reservation for "${title}".`, ctx);
    
    await this.adminAudit(ip, `order_${status}`, 'reservation', Number(id), `order #${id} -> ${status}`);
  }

  static async updateUser(id: number | string, data: { role?: string, isActive?: boolean }, ip: string) {
    const user = await get('SELECT id, role, is_active FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('NOT_FOUND');
    
    const updates = [];
    const params: any[] = [];
    if (data.role !== undefined) {
      if (!USER_ROLES.includes(data.role)) throw new Error('INVALID_ROLE');
      if (user.role === 'admin') throw new Error('ADMIN_IMMUNITY');
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(!!data.isActive);
    }
    if (updates.length === 0) throw new Error('NO_UPDATES');
    
    params.push(id);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const detail = [data.role !== undefined ? `role->${data.role}` : null, data.isActive !== undefined ? `active->${!!data.isActive}` : null].filter(Boolean).join(', ');
    if (data.isActive === false) await run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [id]);
    
    await this.adminAudit(ip, 'user_update', 'user', Number(id), detail);
    
    return await get('SELECT id, name, email, role, phone, address, organization, is_active, created_at FROM users WHERE id = ?', [id]);
  }

  static async deleteUser(id: number | string, ip: string) {
    const user = await get('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('NOT_FOUND');
    if (user.role === 'admin') throw new Error('ADMIN_IMMUNITY');
    
    await run('DELETE FROM users WHERE id = ?', [id]);
    await this.adminAudit(ip, 'user_delete', 'user', Number(id), `deleted user #${id}`);
  }

  static async resetUserPassword(id: number | string, providedPassword?: string, ip: string = '') {
    const user = await get('SELECT id, role, email FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('NOT_FOUND');
    if (user.role === 'admin') throw new Error('ADMIN_IMMUNITY');
    
    if (providedPassword && providedPassword.length < 8) throw new Error('PASSWORD_TOO_SHORT');
    
    const gen = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
      const bytes = crypto.randomBytes(14);
      return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
    };
    
    const password = providedPassword || gen();
    const password_hash = await bcrypt.hash(password, 12);
    
    await run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [password_hash, id]);
    await createNotification(user.id, 'password_reset', 'Password reset', 'An administrator reset your password. Please log in with the new password provided to you.', {});
    await this.adminAudit(ip, 'password_reset', 'user', Number(id), `reset password for ${user.email}`);
    
    return password;
  }

  static async getTrends(days: number) {
    const reservations = await all(
      `SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date, COUNT(*) as count FROM reservations WHERE created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day' * ? GROUP BY 1 ORDER BY date ASC`,
      [days]
    );
    const meals = await all(
      `SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date, COALESCE(SUM(quantity), 0) as count FROM reservations WHERE status = 'collected' AND created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day' * ? GROUP BY 1 ORDER BY date ASC`,
      [days]
    );
    const mealsMap = new Map(meals.map((m) => [String(m.date), Number(m.count)]));
    const resMap = new Map(reservations.map((r) => [String(r.date), Number(r.count)]));
    const pad = (n: number) => String(n).padStart(2, '0');
    
    const series = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      series.push({ date: key, reservations: resMap.get(key) || 0, meals: mealsMap.get(key) || 0 });
    }
    const byCategory = await all(
      `SELECT category, COUNT(*) as count FROM food_listings GROUP BY category ORDER BY count DESC`
    );
    
    return { series, byCategory };
  }

  static async getAuditLog(limit: number) {
    return await all(
      'SELECT id, actor_id, actor_role, action, target_type, target_id, detail, ip, created_at FROM audit_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  }

  static async getExportData(type: string, ip: string) {
    if (!['users', 'listings', 'reservations'].includes(type)) {
      throw new Error('INVALID_TYPE');
    }

    let data: any[] = [];
    if (type === 'users') {
      data = await all('SELECT id, name, email, role, phone, organization, is_active, created_at FROM users ORDER BY created_at DESC');
    } else if (type === 'listings') {
      data = await all('SELECT id, user_id, title, category, quantity, status, created_at FROM food_listings ORDER BY created_at DESC');
    } else if (type === 'reservations') {
      data = await all('SELECT id, food_listing_id, user_id, quantity, status, payment_method, amount, created_at FROM reservations ORDER BY created_at DESC');
    }

    if (data.length === 0) {
      throw new Error('NO_DATA');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    await this.adminAudit(ip, 'csv_export', 'export', 0, `Exported ${type} to CSV`);
    return csvRows.join('\n');
  }
}

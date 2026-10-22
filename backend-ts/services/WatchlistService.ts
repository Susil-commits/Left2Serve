import { get, all, insert, run } from '../db/database.js';
import { AppError } from '../utils/AppError.js';

export class WatchlistService {
  static async getUserWatchlists(userId: number) {
    return await all('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  static async createWatchlist(userId: number, data: { keyword?: string | null, latitude: number, longitude: number, radius_km: number }) {
    const { keyword, latitude, longitude, radius_km } = data;
    
    const id = await insert(
      'INSERT INTO watchlists (user_id, keyword, latitude, longitude, radius_km) VALUES (?, ?, ?, ?, ?)',
      [userId, keyword ? String(keyword).trim() : null, Number(latitude), Number(longitude), Number(radius_km) || 10]
    );
    
    return await get('SELECT * FROM watchlists WHERE id = ?', [id]);
  }

  static async deleteWatchlist(id: number | string, userId: number) {
    const item = await get('SELECT * FROM watchlists WHERE id = ?', [id]);
    if (!item) throw new AppError(404, 'Not found');
    if (item.user_id !== userId) throw new AppError(403, 'Not authorized');
    
    await run('DELETE FROM watchlists WHERE id = ?', [id]);
  }
}

import { all, query } from './database.js';

export async function sweepExpiredListings(): Promise<number> {
  try {
    const rows = await query<{ id: number }>(
      "UPDATE food_listings SET status = 'expired' WHERE status = 'available' AND expiry_date < NOW() RETURNING id"
    );
    return rows.length;
  } catch (err) {
    console.error('sweepExpiredListings: failed to sweep expired listings', err);
    return 0;
  }
}

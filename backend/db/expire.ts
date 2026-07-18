import { run, all } from './database.js';

export async function sweepExpiredListings() {
  try {
    const expired = await all(
      "SELECT id, user_id, title FROM food_listings WHERE status = 'available' AND expiry_date < NOW()"
    );
    if (expired.length === 0) return 0;
    await run(
      "UPDATE food_listings SET status = 'expired' WHERE status = 'available' AND expiry_date < NOW()"
    );
    return expired.length;
  } catch {
    return 0;
  }
}

import cron from 'node-cron';
import { sweepExpiredListings } from '../db/expire.js';
import { run } from '../db/database.js';

export function setupCronJobs() {
  // Run every 5 minutes — expire stale listings
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await sweepExpiredListings();
      if (count > 0) console.log(`Cron: Expired ${count} listing(s)`);
    } catch (err) {
      console.error('Cron: Failed to sweep expired listings', err);
    }
  });

  // Daily at midnight UTC
  // 1. Purge read notifications older than 30 days.
  // 2. Auto-cancel pending/approved reservations whose listing has expired.
  cron.schedule('0 0 * * *', async () => {
    console.log('Cron: Running daily maintenance...');
    try {
      await run(
        "DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'"
      );
      console.log('Cron: Old read notifications purged');
    } catch (err) {
      console.error('Cron: Failed to purge old notifications', err);
    }

    try {
      await run(
        `UPDATE reservations
           SET status = 'cancelled'
         WHERE status IN ('pending', 'approved')
           AND food_listing_id IN (
             SELECT id FROM food_listings WHERE status = 'expired'
           )`
      );
      console.log('Cron: Orphaned reservations auto-cancelled');
    } catch (err) {
      console.error('Cron: Failed to cancel orphaned reservations', err);
    }
  });
}


import cron from 'node-cron';
import { sweepExpiredListings } from '../db/expire.js';
import { run } from '../db/database.js';
import { logger } from './logger.js';
export function setupCronJobs() {
    // Expire stale listings interval
    cron.schedule('*/5 * * * *', async () => {
        try {
            const count = await sweepExpiredListings();
            if (count > 0)
                logger.info(`Cron: Expired ${count} listing(s)`);
        }
        catch (err) {
            logger.error('Cron: Failed to sweep expired listings', err);
        }
    });
    // Daily maintenance interval
    cron.schedule('0 0 * * *', async () => {
        logger.info('Cron: Running daily maintenance...');
        try {
            await run("DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'");
            logger.info('Cron: Old read notifications purged');
        }
        catch (err) {
            logger.error('Cron: Failed to purge old notifications', err);
        }
        try {
            await run(`UPDATE reservations
           SET status = 'cancelled'
         WHERE status IN ('pending', 'approved')
           AND food_listing_id IN (
             SELECT id FROM food_listings WHERE status = 'expired'
           )`);
            logger.info('Cron: Orphaned reservations auto-cancelled');
        }
        catch (err) {
            logger.error('Cron: Failed to cancel orphaned reservations', err);
        }
    });
}

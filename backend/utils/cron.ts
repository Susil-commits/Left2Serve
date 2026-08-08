import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { sweepExpiredListings } from '../db/expire.js';
import { run } from '../db/database.js';
import { logger } from './logger.js';
import { executeEmailSend } from './email.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = redisUrl.includes('upstash.io');

// BullMQ requires dedicated connections for Workers to avoid blocking the main app redis client
const connection = new Redis(redisUrl, { 
  maxRetriesPerRequest: null,
  tls: isUpstash ? {} : undefined 
});

// Create the unified background queue
export const backgroundQueue = new Queue('background-jobs', { connection });

// Define the Worker
export const backgroundWorker = new Worker('background-jobs', async (job) => {
  switch (job.name) {
    case 'sweep-expired': {
      const count = await sweepExpiredListings();
      if (count > 0) logger.info(`BullMQ: Expired ${count} listing(s)`);
      break;
    }
    case 'daily-maintenance': {
      logger.info('BullMQ: Running daily maintenance...');
      
      // 1. Purge old notifications
      await run("DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'");
      logger.info('BullMQ: Old read notifications purged');
      
      // 2. Cancel orphaned reservations
      await run(`
        UPDATE reservations
        SET status = 'cancelled'
        WHERE status IN ('pending', 'approved')
          AND food_listing_id IN (SELECT id FROM food_listings WHERE status = 'expired')
      `);
      logger.info('BullMQ: Orphaned reservations auto-cancelled');
      break;
    }
    case 'send-email': {
      const { to, subject, html, text } = job.data;
      await executeEmailSend(to, subject, html, text);
      break;
    }
    default:
      logger.warn(`Unknown job name: ${job.name}`);
  }
}, { connection });

backgroundWorker.on('failed', (job, err) => {
  logger.error(`BullMQ Job ${job?.name} failed:`, err);
});

// Setup repeatable jobs
export async function setupBackgroundJobs() {
  // Sweep every 5 minutes
  await backgroundQueue.upsertJobScheduler('sweep-expired-scheduler', 
    { pattern: '*/5 * * * *' },
    { name: 'sweep-expired' }
  );

  // Daily maintenance at midnight
  await backgroundQueue.upsertJobScheduler('daily-maintenance-scheduler', 
    { pattern: '0 0 * * *' },
    { name: 'daily-maintenance' }
  );
  
  logger.info('BullMQ repeatable jobs initialized');
}

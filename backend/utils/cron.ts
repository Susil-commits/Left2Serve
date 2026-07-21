import cron from 'node-cron';
import { sweepExpiredListings } from '../db/expire.js';

export function setupCronJobs() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await sweepExpiredListings();
    } catch (err) {
      console.error('Cron: Failed to sweep expired listings', err);
    }
  });

  // Example of a daily task at midnight (could be used for cleanup or reports)
  cron.schedule('0 0 * * *', async () => {
    console.log('Cron: Running daily maintenance tasks...');
    // Add additional daily tasks here
  });
}

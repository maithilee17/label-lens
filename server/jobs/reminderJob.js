import cron from 'node-cron';
import { processReminders } from '../services/notificationService.js';

let cronTask = null;

export function startReminderScheduler() {
  if (process.env.NODE_ENV === 'test') {
    return; // Don't start cron in automated test runs
  }

  // Run at minute 0 of every hour (0 * * * *)
  cronTask = cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running hourly expiry reminder evaluation job...');
    try {
      const results = await processReminders();
      console.log('[Scheduler] Expiry reminder job completed:', results);
    } catch (err) {
      console.error('[Scheduler] Error during scheduled reminder job:', err);
    }
  });

  console.log('[Scheduler] Expiry reminder scheduler initiated (0 * * * *).');
}

export function stopReminderScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Scheduler] Expiry reminder scheduler stopped.');
  }
}

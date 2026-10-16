import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config, validateEnv } from './config/env.js';
import { startReminderScheduler, stopReminderScheduler } from './jobs/reminderJob.js';
import { terminateOCRWorker } from './services/ocrService.js';

validateEnv();

let server = null;

async function bootstrap() {
  try {
    await connectDB();

    server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`[LabelLens Server] Running in ${config.env} mode on port ${config.port}`);
      console.log(`[LabelLens Server] Health check available at http://localhost:${config.port}/api/health`);
    });

    startReminderScheduler();
  } catch (err) {
    console.error('[LabelLens Server] Startup failure:', err);
    process.exit(1);
  }
}

// Graceful Shutdown
async function shutdown(signal) {
  console.log(`\n[LabelLens Server] Received ${signal}. Initiating graceful shutdown...`);

  stopReminderScheduler();
  await terminateOCRWorker();

  if (server) {
    server.close(async () => {
      console.log('[LabelLens Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();

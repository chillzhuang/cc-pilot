/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { loadConfig } from './config.js';
import { Scheduler } from './scheduler.js';
import { updateDaemonState } from './state.js';
import { logger } from '../utils/logger.js';

async function main() {
  await logger.info('Daemon process starting');

  const config = await loadConfig();
  const scheduler = new Scheduler(config.global.windowDuration);

  const shutdown = async () => {
    await logger.info('Daemon shutting down');
    scheduler.stop();
    await updateDaemonState(null);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', async (err) => {
    await logger.error(`Uncaught exception: ${err.message}`);
  });

  await scheduler.start();
  await logger.info(`Daemon running (PID: ${process.pid})`);
}

main().catch(async (err) => {
  await logger.error(`Daemon failed to start: ${err.message}`);
  process.exit(1);
});

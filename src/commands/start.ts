/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import ora from 'ora';
import { startDaemon, isDaemonRunningAsync } from '../core/daemon.js';
import { configExists } from '../core/config.js';
import { t } from '../i18n/index.js';

export async function startCommand(): Promise<void> {
  if (!configExists()) {
    console.error(t('errors.configNotFound'));
    console.log('Run: cc-pilot init');
    return;
  }

  if (await isDaemonRunningAsync()) {
    console.log(t('errors.daemonRunning'));
    return;
  }

  const spinner = ora(t('fire.connecting')).start();
  try {
    const pid = await startDaemon();
    spinner.succeed(`Daemon started (PID: ${pid})`);
  } catch (err) {
    spinner.fail(`Failed to start daemon: ${(err as Error).message}`);
  }
}

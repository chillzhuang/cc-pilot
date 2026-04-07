/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import ora from 'ora';
import { stopDaemon, isDaemonRunningAsync } from '../core/daemon.js';
import { t } from '../i18n/index.js';

export async function stopCommand(): Promise<void> {
  if (!(await isDaemonRunningAsync())) {
    console.log(t('errors.daemonNotRunning'));
    return;
  }

  const spinner = ora('Stopping daemon...').start();
  try {
    await stopDaemon();
    spinner.succeed('Daemon stopped');
  } catch (err) {
    spinner.fail(`Failed to stop: ${(err as Error).message}`);
  }
}

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import ora from 'ora';
import { installService, uninstallService, isServiceInstalled } from '../utils/platform.js';
import { t } from '../i18n/index.js';
import { T } from '../ui/theme.js';

export async function installCommand(): Promise<void> {
  if (await isServiceInstalled()) {
    console.log(T.success('Service is already installed'));
    return;
  }
  const spinner = ora('Registering system service...').start();
  try {
    await installService();
    spinner.succeed(T.success('Service installed — will auto-start on boot'));
  } catch (err) {
    spinner.fail(T.error(`Install failed: ${(err as Error).message}`));
  }
}

export async function uninstallCommand(): Promise<void> {
  if (!(await isServiceInstalled())) {
    console.log('Service is not installed');
    return;
  }
  const spinner = ora('Removing system service...').start();
  try {
    await uninstallService();
    spinner.succeed('Service removed');
  } catch (err) {
    spinner.fail(T.error(`Uninstall failed: ${(err as Error).message}`));
  }
}

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

export const CC_PILOT_HOME = join(homedir(), '.cc-pilot');
export const CONFIG_PATH = join(CC_PILOT_HOME, 'config.yml');
export const STATE_PATH = join(CC_PILOT_HOME, 'state.json');
export const LOG_DIR = join(CC_PILOT_HOME, 'logs');
export const HISTORY_PATH = join(CC_PILOT_HOME, 'history.json');
export const DAEMON_LOG = join(CC_PILOT_HOME, 'daemon.log');

export async function ensureDirs(): Promise<void> {
  await mkdir(CC_PILOT_HOME, { recursive: true });
  await mkdir(LOG_DIR, { recursive: true });
}

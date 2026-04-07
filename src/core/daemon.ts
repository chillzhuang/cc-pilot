/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { fork } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { loadState, updateDaemonState } from './state.js';

export function isDaemonRunning(): boolean {
  try {
    const statePath = resolve(homedir(), '.cc-pilot', 'state.json');
    if (!existsSync(statePath)) return false;
    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    if (!state.daemon?.pid) return false;
    process.kill(state.daemon.pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function isDaemonRunningAsync(): Promise<boolean> {
  const state = await loadState();
  if (!state.daemon.pid) return false;
  try {
    process.kill(state.daemon.pid, 0);
    return true;
  } catch {
    await updateDaemonState(null);
    return false;
  }
}

export async function startDaemon(): Promise<number> {
  if (await isDaemonRunningAsync()) {
    throw new Error('DAEMON_ALREADY_RUNNING');
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const daemonScript = resolve(__dirname, 'daemon-entry.js');

  const child = fork(daemonScript, [], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  const pid = child.pid!;
  await updateDaemonState(pid);
  return pid;
}

export async function stopDaemon(): Promise<void> {
  const state = await loadState();
  if (!state.daemon.pid) {
    throw new Error('DAEMON_NOT_RUNNING');
  }

  try {
    process.kill(state.daemon.pid, 'SIGTERM');
  } catch {
    // Process already gone
  }
  await updateDaemonState(null);
}

export async function getDaemonUptime(): Promise<number | null> {
  const state = await loadState();
  if (!state.daemon.pid || !state.daemon.startedAt) return null;
  try {
    process.kill(state.daemon.pid, 0);
    return Date.now() - new Date(state.daemon.startedAt).getTime();
  } catch {
    await updateDaemonState(null);
    return null;
  }
}

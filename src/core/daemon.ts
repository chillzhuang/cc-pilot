/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { fork, execSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { loadState, updateDaemonState } from './state.js';

function getPackageVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(__dirname, '..', '..', 'package.json');
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

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

/**
 * Kill any orphaned daemon-entry.js processes not tracked by state.json.
 * Prevents duplicate daemons from accumulating across restarts.
 */
function killOrphanDaemons(trackedPid: number | null): void {
  try {
    const output = execSync(
      'ps -eo pid,command | grep "daemon-entry.js" | grep -v grep',
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    if (!output) return;
    for (const line of output.split('\n')) {
      const pid = parseInt(line.trim().split(/\s+/)[0], 10);
      if (!pid || pid === trackedPid || pid === process.pid) continue;
      try {
        process.kill(pid, 'SIGKILL');
      } catch { /* already gone */ }
    }
  } catch { /* ps failed or no matches — fine */ }
}

export async function startDaemon(): Promise<number> {
  if (await isDaemonRunningAsync()) {
    throw new Error('DAEMON_ALREADY_RUNNING');
  }

  // Kill any orphaned daemon processes before starting a new one
  const state = await loadState();
  killOrphanDaemons(state.daemon.pid);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const daemonScript = resolve(__dirname, 'daemon-entry.js');

  const child = fork(daemonScript, [], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  const pid = child.pid!;
  await updateDaemonState(pid, getPackageVersion());
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
  // Also kill any orphaned daemon processes
  killOrphanDaemons(null);
  await updateDaemonState(null);
}

export function getCurrentVersion(): string {
  return getPackageVersion();
}

export async function getDaemonVersion(): Promise<string | null> {
  const state = await loadState();
  return state.daemon.version ?? null;
}

export async function restartDaemon(): Promise<number> {
  try { await stopDaemon(); } catch { /* not running */ }
  return startDaemon();
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

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { getPlatform } from '../utils/platform.js';
import type { ExecutionResult } from '../types.js';

const EXEC_TIMEOUT = 10 * 60 * 1000;   // 10 min for actual claude task
const WARMUP_TIMEOUT = 15 * 1000;      // 15 sec for auth warmup

function expandHome(p: string): string {
  return p.startsWith('~') ? p.replace('~', homedir()) : p;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function detectRateLimit(output: string): boolean {
  const patterns = [
    /rate.?limit/i,
    /too many requests/i,
    /usage.?limit/i,
    /try again later/i,
    /exceeded.*quota/i,
    /over.?capacity/i,
  ];
  return patterns.some(p => p.test(output));
}

function detectAuthFailure(output: string): boolean {
  const patterns = [
    /\b401\b/,
    /authentication.?error/i,
    /invalid.?authentication.?credentials/i,
    /failed to authenticate/i,
    /\bunauthorized\b/i,
  ];
  return patterns.some(p => p.test(output));
}

interface SpawnRunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  errorMessage?: string;
  duration: number;
}

function runSpawn(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<SpawnRunResult> {
  return new Promise((res) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8'); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8'); });

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch { /* already gone */ }
      setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, 2000);
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      res({
        code: null,
        signal: null,
        output: `${stdout}\n${stderr}`.trim(),
        errorMessage: err.message,
        duration: Date.now() - startTime,
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      res({
        code,
        signal,
        output: `${stdout}\n${stderr}`.trim(),
        errorMessage: timedOut ? `Timeout after ${timeoutMs}ms` : undefined,
        duration: Date.now() - startTime,
      });
    });
  });
}

export async function executeTask(
  claudePath: string,
  prompt: string,
  cwd: string,
  model?: string,
): Promise<ExecutionResult> {
  const resolvedCwd = resolve(expandHome(cwd));
  const args = ['-p', prompt];
  if (model) args.push('--model', model);

  const r = await runSpawn(claudePath, args, resolvedCwd, EXEC_TIMEOUT);
  const out = r.output;

  // Spawn-level error (binary not found, timeout, etc.) — also check output for known signals
  if (r.errorMessage) {
    if (detectRateLimit(out) || detectRateLimit(r.errorMessage)) {
      return { success: false, rateLimited: true, error: 'Rate limited', duration: r.duration, output: out };
    }
    if (detectAuthFailure(out) || detectAuthFailure(r.errorMessage)) {
      return { success: false, authFailed: true, error: 'Authentication failed', duration: r.duration, output: out };
    }
    return { success: false, error: r.errorMessage, duration: r.duration, output: out };
  }

  // Non-zero exit
  if (r.code !== 0) {
    if (detectRateLimit(out)) {
      return { success: false, rateLimited: true, error: 'Rate limited', duration: r.duration, output: out };
    }
    if (detectAuthFailure(out)) {
      return { success: false, authFailed: true, error: 'Authentication failed', duration: r.duration, output: out };
    }
    return { success: false, error: `claude exited with code ${r.code}`, duration: r.duration, output: out };
  }

  // Exit 0 — but still scan for in-band error signals
  if (detectRateLimit(out)) {
    return { success: false, rateLimited: true, error: 'Rate limited', duration: r.duration, output: out };
  }
  if (detectAuthFailure(out)) {
    return { success: false, authFailed: true, error: 'Authentication failed', duration: r.duration, output: out };
  }

  return { success: true, output: out, duration: r.duration, tokens: estimateTokens(out) };
}

/**
 * Run a cheap auth probe (`claude auth status`) to force a token validation
 * pass through claude's OAuth code path. When the access token is near or
 * past expiry, this triggers a refresh that gets written back to the OS
 * keychain — sidestepping the race that causes 401 in detached daemon mode.
 *
 * On macOS/Linux we additionally PTY-wrap via `script` so claude takes the
 * "interactive-context" code path (more aggressive about refresh). Windows
 * has no `script`, so we fall back to a bare spawn.
 *
 * Best-effort — any failure is silently ignored (the real retry will surface
 * the actual auth state).
 */
export async function warmupAuth(claudePath: string, cwd: string): Promise<void> {
  const resolvedCwd = resolve(expandHome(cwd));
  const platform = getPlatform();

  if (platform === 'windows') {
    await runSpawn(claudePath, ['auth', 'status'], resolvedCwd, WARMUP_TIMEOUT);
    return;
  }

  // BSD `script` (macOS): script [-q] file [command...]
  // util-linux `script`: script [-q] [-c "command"] [file]
  const args = platform === 'mac'
    ? ['-q', '/dev/null', claudePath, 'auth', 'status']
    : ['-q', '-c', `${claudePath} auth status`, '/dev/null'];

  await runSpawn('script', args, resolvedCwd, WARMUP_TIMEOUT);
}

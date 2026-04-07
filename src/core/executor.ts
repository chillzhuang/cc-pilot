/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { ExecutionResult } from '../types.js';

const EXEC_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function expandHome(p: string): string {
  return p.startsWith('~') ? p.replace('~', homedir()) : p;
}

function escapeShell(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function detectRateLimit(output: string): boolean {
  const patterns = [
    /rate.?limit/i,
    /too many requests/i,
    /usage.?limit/i,
    /try again/i,
    /exceeded.*quota/i,
    /capacity/i,
  ];
  return patterns.some(p => p.test(output));
}

export async function executeTask(
  claudePath: string,
  prompt: string,
  cwd: string,
  model?: string,
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const resolvedCwd = resolve(expandHome(cwd));
  const escapedPrompt = escapeShell(prompt);
  const modelFlag = model ? ` --model '${model}'` : '';

  const cmd = `${claudePath} -p '${escapedPrompt}'${modelFlag} < /dev/null`;

  return new Promise<ExecutionResult>((res) => {
    exec(
      cmd,
      { cwd: resolvedCwd, timeout: EXEC_TIMEOUT, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const fullOutput = `${stdout}\n${stderr}`.trim();

        if (error) {
          if (detectRateLimit(fullOutput) || detectRateLimit(error.message)) {
            res({ success: false, rateLimited: true, error: 'Rate limited', duration, output: fullOutput });
            return;
          }
          res({ success: false, error: error.message, duration, output: fullOutput });
          return;
        }

        if (detectRateLimit(fullOutput)) {
          res({ success: false, rateLimited: true, error: 'Rate limited', duration, output: fullOutput });
          return;
        }

        res({ success: true, output: fullOutput, duration, tokens: estimateTokens(fullOutput) });
      },
    );
  });
}

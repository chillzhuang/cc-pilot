/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';

// ─── ESC-safe prompt wrapper ────────────────────────────
// Returns null when the user presses ESC / Ctrl+C,
// allowing callers to return to the previous level.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safePrompt<T = Record<string, any>>(
  questions: any[],
): Promise<T | null> {
  try {
    return await inquirer.prompt(questions) as T;
  } catch (err) {
    if ((err as Error).name === 'ExitPromptError') return null;
    throw err;
  }
}

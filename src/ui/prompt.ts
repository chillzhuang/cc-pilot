/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import select from '@inquirer/select';
import checkbox from '@inquirer/checkbox';
import inquirer from 'inquirer';
import { CancelPromptError } from '@inquirer/core';
import { T } from './theme.js';
import { t } from '../i18n/index.js';

// ─── Back sentinel ──────────────────────────────────────

export const BACK = Symbol.for('__back__');

// ─── ESC listener helper ────────────────────────────────

function onEsc(cancel: () => void): () => void {
  const handler = (_: Buffer, key: { name: string }) => {
    if (key?.name === 'escape') cancel();
  };
  process.stdin.on('keypress', handler);
  return () => process.stdin.removeListener('keypress', handler);
}

// ─── Select prompt (list) with ESC + Back ───────────────

interface SelectChoice<V> {
  name: string;
  value: V;
  short?: string;
  disabled?: boolean | string;
  description?: string;
}

interface SelectOptions<V> {
  message: string;
  choices: (SelectChoice<V> | { type: 'separator'; separator?: string })[];
  default?: V;
  pageSize?: number;
  loop?: boolean;
  back?: boolean;
}

export async function selectPrompt<V>(opts: SelectOptions<V>): Promise<V | typeof BACK> {
  const choices: typeof opts.choices = [...opts.choices];

  // Append back choice
  if (opts.back !== false) {
    choices.push({ type: 'separator', separator: T.dim(T.separator.repeat(40)) });
    choices.push({ name: T.dim(`← ${t('common.back')}`), value: BACK as unknown as V });
  }

  const promise = select({
    message: opts.message,
    choices: choices as Parameters<typeof select>[0]['choices'],
    default: opts.default as string | number | boolean | undefined,
    pageSize: opts.pageSize ?? 20,
    loop: opts.loop ?? false,
    theme: {
      helpMode: 'always' as const,
      style: {
        highlight: (text: string) => T.primary(text),
      },
    },
    instructions: {
      pager: `${T.dim('↑↓')} ${T.dim('navigate')}  ${T.dim('⏎')} ${T.dim('select')}  ${T.dim('esc')} ${T.dim('back')}`,
      navigation: `${T.dim('↑↓')} ${T.dim('navigate')}  ${T.dim('⏎')} ${T.dim('select')}  ${T.dim('esc')} ${T.dim('back')}`,
    },
  });

  const cleanup = onEsc(() => promise.cancel());

  try {
    const result = await promise;
    cleanup();
    return result as V | typeof BACK;
  } catch (err) {
    cleanup();
    if (err instanceof CancelPromptError) return BACK;
    throw err;
  }
}

// ─── Checkbox prompt with ESC + Back ────────────────────

interface CheckboxChoice<V> {
  name: string;
  value: V;
  checked?: boolean;
  disabled?: boolean | string;
}

interface CheckboxOptions<V> {
  message: string;
  choices: CheckboxChoice<V>[];
  validate?: (input: V[]) => boolean | string;
}

export async function checkboxPrompt<V>(opts: CheckboxOptions<V>): Promise<V[] | typeof BACK> {
  const promise = checkbox({
    message: opts.message,
    choices: opts.choices as Parameters<typeof checkbox>[0]['choices'],
    validate: opts.validate as ((input: readonly unknown[]) => boolean | string) | undefined,
    theme: {
      helpMode: 'always' as const,
      style: {
        highlight: (text: string) => T.primary(text),
      },
    },
    instructions: `${T.dim('↑↓')} ${T.dim('navigate')}  ${T.dim('space')} ${T.dim('toggle')}  ${T.dim('⏎')} ${T.dim('confirm')}  ${T.dim('esc')} ${T.dim('back')}`,
  });

  const cleanup = onEsc(() => promise.cancel());

  try {
    const result = await promise;
    cleanup();
    return result as V[];
  } catch (err) {
    cleanup();
    if (err instanceof CancelPromptError) return BACK;
    throw err;
  }
}

// ─── Legacy safe prompt (for input/confirm types) ───────

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

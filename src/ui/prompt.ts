/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import select from '@inquirer/select';
import checkbox from '@inquirer/checkbox';
import inquirer from 'inquirer';
import { T } from './theme.js';
import { t } from '../i18n/index.js';

// ─── Back sentinel ──────────────────────────────────────

export const BACK = Symbol.for('__back__');

// ─── Select prompt (list) with Back ─────────────────────

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

  if (opts.back !== false) {
    choices.push({ type: 'separator', separator: T.dim(T.separator.repeat(40)) });
    choices.push({ name: T.dim(`← ${t('common.back')}`), value: BACK as unknown as V });
  }

  const result = await select({
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
  });

  return result as V | typeof BACK;
}

// ─── Checkbox prompt with Back choice ───────────────────

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
  const result = await checkbox({
    message: opts.message,
    choices: opts.choices as Parameters<typeof checkbox>[0]['choices'],
    validate: opts.validate as ((input: readonly unknown[]) => boolean | string) | undefined,
    theme: {
      helpMode: 'always' as const,
      style: {
        highlight: (text: string) => T.primary(text),
      },
    },
  });

  return result as V[];
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

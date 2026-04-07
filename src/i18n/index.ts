/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── i18n Loader ────────────────────────────────────────

import type { Locale } from '../types.js';
import type { TranslationSchema } from './types.js';

let currentLocale: Locale = 'en';
let currentMessages: TranslationSchema | null = null;
let fallbackMessages: TranslationSchema | null = null;

async function loadLocale(locale: Locale): Promise<TranslationSchema> {
  const mod = await import(`./locales/${locale}.js`);
  return mod.default as TranslationSchema;
}

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

export function t(key: string): string {
  if (currentMessages) {
    const value = resolve(currentMessages as unknown as Record<string, unknown>, key);
    if (value !== undefined) return value;
  }

  if (fallbackMessages) {
    const value = resolve(fallbackMessages as unknown as Record<string, unknown>, key);
    if (value !== undefined) return value;
  }

  return key;
}

export async function setLocale(locale: Locale): Promise<void> {
  currentLocale = locale;
  currentMessages = await loadLocale(locale);

  if (locale !== 'en') {
    if (!fallbackMessages) {
      fallbackMessages = await loadLocale('en');
    }
  } else {
    fallbackMessages = currentMessages;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export { loadLocale };

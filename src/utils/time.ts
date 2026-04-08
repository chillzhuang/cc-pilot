/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import dayjs from 'dayjs';

export function parseTimeRange(range: string): {
  start: { h: number; m: number };
  end: { h: number; m: number };
} {
  const parts = range.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid time range format: "${range}" (expected "HH:MM-HH:MM")`);
  }
  const [startStr, endStr] = parts;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);

  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) {
    throw new Error(`Invalid time values in range: "${range}"`);
  }

  return {
    start: { h: sh, m: sm },
    end: { h: eh, m: em },
  };
}

export function isDayMatch(date: Date, daysSpec: string): boolean {
  const dow = date.getDay(); // 0=Sun .. 6=Sat

  if (daysSpec === '*') return true;

  // range format: "1-5" or "5-1" (wrap around Sunday)
  if (daysSpec.includes('-') && !daysSpec.includes(',')) {
    const [from, to] = daysSpec.split('-').map(Number);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new Error(`Invalid days spec: "${daysSpec}"`);
    }
    return from > to ? (dow >= from || dow <= to) : (dow >= from && dow <= to);
  }

  // list format: "0,6"
  const days = daysSpec.split(',').map(Number);
  if (days.some(Number.isNaN)) {
    throw new Error(`Invalid days spec: "${daysSpec}"`);
  }
  return days.includes(dow);
}

export function randomTimeInRange(range: string, daysSpec: string): Date | null {
  const now = new Date();
  if (!isDayMatch(now, daysSpec)) return null;

  const { start, end } = parseTimeRange(range);

  const startMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m).getTime();
  const endMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m).getTime();

  if (endMs <= startMs) {
    throw new Error(`End time must be after start time in range: "${range}"`);
  }

  const randomMs = startMs + Math.random() * (endMs - startMs);
  return new Date(randomMs);
}

export function isInTimeRange(date: Date, range: string): boolean {
  const { start, end } = parseTimeRange(range);

  const h = date.getHours();
  const m = date.getMinutes();
  const totalMin = h * 60 + m;
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;

  return totalMin >= startMin && totalMin < endMin;
}

export function isInBlackout(date: Date, blackouts: string[]): boolean {
  return blackouts.some((range) => isInTimeRange(date, range));
}

export function parseOffset(offset: string): number {
  const match = offset.match(/^(\d+)-(\d+)m$/);
  if (!match) {
    throw new Error(`Invalid offset format: "${offset}" (expected "N-Nm")`);
  }
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (min > max) {
    throw new Error(`Invalid offset range: min (${min}) > max (${max})`);
  }
  const randomMinutes = min + Math.random() * (max - min);
  return Math.round(randomMinutes * 60 * 1000);
}

export function parseDuration(dur: string): number {
  let ms = 0;
  const remaining = dur.replace(/(\d+)h/g, (_, n) => {
    ms += Number(n) * 60 * 60 * 1000;
    return '';
  }).replace(/(\d+)m/g, (_, n) => {
    ms += Number(n) * 60 * 1000;
    return '';
  }).replace(/(\d+)s/g, (_, n) => {
    ms += Number(n) * 1000;
    return '';
  });

  if (remaining.trim().length > 0) {
    throw new Error(`Invalid duration format: "${dur}"`);
  }
  if (ms === 0) {
    throw new Error(`Duration must be greater than zero: "${dur}"`);
  }

  return ms;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

  return parts.join('') || '0s';
}

export function formatTime(date: Date): string {
  return dayjs(date).format('HH:mm:ss');
}

export function nextDayMatch(daysSpec: string): Date {
  const now = new Date();
  // Always start from tomorrow — all callers need the *next* matching day
  // (window already passed, non-matching day, or task already ran today).
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (isDayMatch(candidate, daysSpec)) {
      return candidate;
    }
  }
  // Fallback: should never reach here with valid specs since we check 7 days
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/**
 * Compute the next execution time for a random task — pure function, no side effects.
 * Used by both CLI (display) and scheduler (scheduling decisions).
 *
 * Logic:
 *   1. If task hasn't run today AND today matches AND window still open → random in remaining window
 *   2. Otherwise → find next matching day → random in full window
 */
export function computeNextRandomRun(
  timeRange: string,
  days: string,
  now: Date = new Date(),
  alreadyRanToday: boolean = false,
): Date {
  if (!alreadyRanToday && isDayMatch(now, days)) {
    const { start, end } = parseTimeRange(timeRange);
    const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);

    if (windowEnd.getTime() > now.getTime()) {
      const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
      const effectiveStart = Math.max(windowStart.getTime(), now.getTime());
      return new Date(effectiveStart + Math.random() * (windowEnd.getTime() - effectiveStart));
    }
  }

  // Window passed / non-matching day / already ran today → next matching day
  const nextDay = nextDayMatch(days);
  const { start, end } = parseTimeRange(timeRange);
  const base = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), start.h, start.m);
  const rangeMs = ((end.h * 60 + end.m) - (start.h * 60 + start.m)) * 60 * 1000;
  return new Date(base.getTime() + Math.random() * rangeMs);
}

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import dayjs from 'dayjs';
import { loadState, saveState, updateWindowState } from './state.js';
import { parseDuration } from '../utils/time.js';

export class WindowTracker {
  private windowMs: number;
  private onWindowOpenCallbacks: Array<(start: Date) => void> = [];

  constructor(windowDuration: string) {
    this.windowMs = parseDuration(windowDuration);
  }

  onWindowOpen(cb: (start: Date) => void): void {
    this.onWindowOpenCallbacks.push(cb);
  }

  /**
   * Floor time to the start of the current hour.
   * e.g. 7:30 → 7:00, 12:20 → 12:00
   */
  private floorToHour(time: dayjs.Dayjs): dayjs.Dayjs {
    return time.startOf('hour');
  }

  async markCallExecuted(): Promise<void> {
    const state = await loadState();
    const now = dayjs();

    // If no active window or window has expired, start a new one from the current hour
    if (!state.window.startedAt || (state.window.endsAt && now.isAfter(dayjs(state.window.endsAt)))) {
      const windowStart = this.floorToHour(now);
      state.window.startedAt = windowStart.toISOString();
      state.window.endsAt = windowStart.add(this.windowMs, 'millisecond').toISOString();
      state.window.callsThisWindow = 1;
    } else {
      state.window.callsThisWindow += 1;
    }
    await saveState(state);
  }

  async markRateLimited(): Promise<void> {
    const state = await loadState();
    const now = dayjs();
    // Rate limited means current window is exhausted, next window starts at current hour floor + 5h
    const windowStart = this.floorToHour(now);
    state.window.startedAt = windowStart.toISOString();
    state.window.endsAt = windowStart.add(this.windowMs, 'millisecond').toISOString();
    state.window.callsThisWindow = 0;
    await saveState(state);
  }

  async getWindowEnd(): Promise<Date | null> {
    const state = await loadState();
    if (!state.window.endsAt) return null;
    return new Date(state.window.endsAt);
  }

  async isWindowActive(): Promise<boolean> {
    const end = await this.getWindowEnd();
    if (!end) return false;
    return dayjs().isBefore(dayjs(end));
  }

  async getNextWindowStart(): Promise<Date> {
    const end = await this.getWindowEnd();
    if (!end || dayjs().isAfter(dayjs(end))) {
      return new Date();
    }
    return end;
  }

  async getStatus(): Promise<{
    active: boolean;
    startedAt: string | null;
    endsAt: string | null;
    callsThisWindow: number;
    remainMs: number;
  }> {
    const state = await loadState();
    const now = dayjs();
    const endsAt = state.window.endsAt ? dayjs(state.window.endsAt) : null;
    const active = endsAt ? now.isBefore(endsAt) : false;
    const remainMs = active && endsAt ? endsAt.diff(now) : 0;

    return {
      active,
      startedAt: state.window.startedAt,
      endsAt: state.window.endsAt,
      callsThisWindow: state.window.callsThisWindow,
      remainMs,
    };
  }

  async checkAndNotifyWindowOpen(): Promise<void> {
    const state = await loadState();
    const now = dayjs();

    if (state.window.endsAt && now.isAfter(dayjs(state.window.endsAt))) {
      await updateWindowState(null, null);
      for (const cb of this.onWindowOpenCallbacks) {
        cb(now.toDate());
      }
    }
  }
}

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import schedule from 'node-schedule';
import dayjs from 'dayjs';
import { loadConfig } from './config.js';
import { executeTask, warmupAuth } from './executor.js';
import { pickRandomPrompt, isAutoPrompt } from './prompts.js';
import { WindowTracker } from './window.js';
import { recordExecution, loadState, saveState } from './state.js';
import { appendHistory } from './state.js';
import {
  parseTimeRange,
  isInBlackout,
  isInTimeRange,
  parseOffset,
  isDayMatch,
  nextDayMatch,
  parseDuration,
} from '../utils/time.js';
import { logger } from '../utils/logger.js';
import { notifyTaskExecution } from './notify.js';
import type { AppState, Config, Task, FixedTask, RandomTask, WindowTask, HistoryEntry, ExecutionResult } from '../types.js';

const AUTH_RETRY_MAX = 3;
const AUTH_RETRY_DELAY_MAX_MS = 10_000;

// Enhanced mode polling: every 30 seconds throughout the active window.
// On every macOS DarkWake/FullWake during the window, the next queued
// setInterval tick fires within milliseconds of wake, giving us many chances
// to catch a wake event rather than relying on a single one-shot timer.
const ENHANCED_POLL_INTERVAL_MS = 30_000;

// In catch-up mode (Mac just woke from sleep), wait 1~5s before firing.
// Short range fits inside even brief DarkWakes (~10s), avoiding the case
// where jitter spans across a re-sleep and the timer fires past the window.
const ENHANCED_FIRE_JITTER_MIN_MS = 1_000;
const ENHANCED_FIRE_JITTER_RANGE_MS = 4_000;

// Threshold to distinguish "planned" vs "catch-up" wake at windowStart.
// If the polling cron fires within this delay of the planned windowStart,
// we assume Mac was awake (planned). Beyond this, it's a sleep catch-up.
const PLANNED_TRIGGER_THRESHOLD_MS = 30_000;

export class Scheduler {
  private jobs = new Map<string, schedule.Job>();
  private enhancedPolls = new Map<string, NodeJS.Timeout>();
  private firingTasks = new Set<string>();
  /** Per-task "fire after this time" — set at startWindowPolling, checked by tick. */
  private taskFireTimes = new Map<string, Date>();
  private windowTracker: WindowTracker;
  private config!: Config;
  private running = false;

  constructor(windowDuration: string) {
    this.windowTracker = new WindowTracker(windowDuration);
  }

  async start(): Promise<void> {
    this.config = await loadConfig();
    this.running = true;

    const state = await loadState();

    for (const task of this.config.tasks) {
      if (!task.enabled) continue;
      switch (task.type) {
        case 'fixed':
          this.scheduleFixed(task);
          break;
        case 'random': {
          const taskState = this.ensureTaskState(state, task.name);
          const nextRun = this.scheduleRandom(task, taskState.todayRuns);
          taskState.nextRun = nextRun.toISOString();
          break;
        }
        case 'window':
          this.scheduleWindow(task);
          break;
      }
    }

    // Refinement pass for anchored tasks: if their anchor has already fired
    // today, override the standard random pick with anchor.lastRun + windowDuration
    // + 0~5min jitter so the displayed nextRun matches the chained schedule.
    if (this.config.global.enhancedMode) {
      for (const task of this.config.tasks) {
        if (!task.enabled || task.type !== 'random' || !task.anchor) continue;
        const taskState = this.ensureTaskState(state, task.name);
        if (taskState.todayRuns > 0) continue;
        const anchored = await this.pickAnchoredFireTime(task, state);
        if (anchored) {
          this.taskFireTimes.set(task.name, anchored);
          taskState.nextRun = anchored.toISOString();
        }
      }
    }

    // Single atomic write — CLI always sees a complete snapshot
    await saveState(state);

    // Check window state every minute
    schedule.scheduleJob('window-check', '* * * * *', () => {
      this.windowTracker.checkAndNotifyWindowOpen();
    });

    // Re-schedule random tasks at midnight
    schedule.scheduleJob('daily-reset', '0 0 * * *', () => {
      void this.rescheduleRandomTasks();
    });

    await logger.info('Scheduler started');
  }

  stop(): void {
    this.running = false;
    for (const [name, job] of this.jobs) {
      job.cancel();
    }
    this.jobs.clear();
    for (const [name, interval] of this.enhancedPolls) {
      clearInterval(interval);
    }
    this.enhancedPolls.clear();
    this.firingTasks.clear();
    this.taskFireTimes.clear();
    schedule.gracefulShutdown();
  }

  private scheduleFixed(task: FixedTask): void {
    const job = schedule.scheduleJob(task.name, task.cron, async () => {
      if (!this.running) return;
      const now = new Date();
      if (isInBlackout(now, this.config.global.blackout)) {
        await logger.info(`Skipped ${task.name} — in blackout period`);
        return;
      }
      await this.execute(task);
    });
    if (job) this.jobs.set(task.name, job);
  }

  // ─── Random Task Scheduling ────────────────────────────

  private scheduleRandom(task: RandomTask, todayRuns: number = 0): Date {
    // Enhanced mode: install a continuous poll. The poll itself enforces the
    // window, day-of-week, blackout, and todayRuns guards on every tick, so
    // we don't need separate today-vs-next-day branching here.
    if (this.config.global.enhancedMode) {
      return this.installEnhancedPoll(task, todayRuns);
    }

    // Legacy mode: pick a single uniform-random time across the window.
    const now = new Date();

    if (todayRuns > 0) {
      return this.scheduleRandomNext(task);
    }

    if (!isDayMatch(now, task.days)) {
      return this.scheduleRandomNext(task);
    }

    const { start, end } = parseTimeRange(task.timeRange);
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
    const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);

    if (windowEnd.getTime() <= now.getTime()) {
      return this.scheduleRandomNext(task);
    }

    const effectiveStart = Math.max(windowStart.getTime(), now.getTime());
    const targetTime = new Date(effectiveStart + Math.random() * (windowEnd.getTime() - effectiveStart));

    if (isInBlackout(targetTime, this.config.global.blackout)) {
      return this.scheduleRandomNext(task);
    }

    const stateKey = `random-${task.name}`;
    const job = schedule.scheduleJob(stateKey, targetTime, this.createRandomCallback(task));
    if (job) this.jobs.set(stateKey, job);

    return targetTime;
  }

  private scheduleRandomNext(task: RandomTask): Date {
    // Enhanced mode: pre-pick the next planned T (so display shows exact time).
    if (this.config.global.enhancedMode) {
      const nextT = this.pickPlannedFireTime(task, true);
      this.taskFireTimes.set(task.name, nextT);
      return nextT;
    }

    // Legacy mode: schedule a fresh one-shot timer for next matching day.
    const nextDay = nextDayMatch(task.days);
    const [startStr] = task.timeRange.split('-');
    const [h, m] = startStr.split(':').map(Number);
    const base = dayjs(nextDay).hour(h).minute(m).second(0);
    const rangeMs = this.getTimeRangeMs(task.timeRange);
    const offset = Math.random() * rangeMs;
    const targetTime = base.add(offset, 'millisecond').toDate();

    const stateKey = `random-${task.name}`;
    const existing = this.jobs.get(stateKey);
    if (existing) existing.cancel();

    const job = schedule.scheduleJob(stateKey, targetTime, this.createRandomCallback(task));
    if (job) this.jobs.set(stateKey, job);

    return targetTime;
  }

  // ─── Enhanced Mode: open-on-window polling ──────────────
  //
  // Lifecycle:
  //   1. Daemon start: install a node-schedule cron firing at windowStart of
  //      each matching day. Outside windows there's NO polling.
  //   2. Cron fires at windowStart → startWindowPolling → setInterval every 30s.
  //   3. Each tick checks window / day / blackout / todayRuns; fires if eligible.
  //   4. Once fired (or window passes / day no longer matches), the tick
  //      itself clears the setInterval — polling stops until next windowStart.
  //   5. macOS DarkWake naturally resumes both the cron (catch-up fire on wake)
  //      and any active setInterval ticks (next-tick fires within ms of wake).
  //
  // Net effect: at most one cron sitting idle outside windows + ~120 ticks
  // during each window, vs the previous "always polling" design's 2880/day.

  private installEnhancedPoll(task: RandomTask, todayRuns: number = 0): Date {
    const stateKey = `random-${task.name}`;
    const existing = this.jobs.get(stateKey);
    if (existing) existing.cancel();
    this.clearEnhancedPoll(task.name);

    // Cron fires at windowStart of every matching day. task.days mostly maps
    // to cron dow directly, except wrap-around ranges (e.g. "5-1" = Fri~Mon),
    // which cron doesn't support — expand those to a discrete list.
    const { start } = parseTimeRange(task.timeRange);
    const cron = `${start.m} ${start.h} * * ${this.daysToCronDow(task.days)}`;
    const openJob = schedule.scheduleJob(stateKey, cron, () => {
      void this.startWindowPolling(task);
    });
    if (openJob) this.jobs.set(stateKey, openJob);

    // Pre-pick the planned random fire time T within the next applicable
    // window, so the CLI shows an exact preset time instead of just windowStart.
    // This T is honored by the planned path of startWindowPolling — only when
    // the cron fires significantly late (Mac slept through windowStart) does
    // the catch-up path override it with "fire ASAP".
    const plannedT = this.pickPlannedFireTime(task, todayRuns > 0);
    this.taskFireTimes.set(task.name, plannedT);

    // If we install while already inside today's window AND haven't run yet,
    // start polling right now instead of waiting for tomorrow's cron.
    const now = new Date();
    if (todayRuns === 0 && isDayMatch(now, task.days) && isInTimeRange(now, task.timeRange)) {
      void this.startWindowPolling(task);
    }

    return plannedT;
  }

  private async startWindowPolling(task: RandomTask): Promise<void> {
    this.clearEnhancedPoll(task.name);

    // Decide the "fire after this time":
    //  - PLANNED (cron fired close to windowStart = Mac was awake): honor the
    //    pre-picked T from install/last-fire so the displayed nextRun matches
    //    the actual fire time. For anchored tasks, recompute now that we're
    //    inside the window — the anchor's lastRun is fresh.
    //  - WAKE (cron fired noticeably late = catch-up after sleep, or daemon
    //    just started mid-window): the pre-picked T is no longer meaningful;
    //    fire ASAP (1-5s jitter applied by the tick). Anchor logic is bypassed
    //    so wake-up always wins, matching the "下一次醒了就直接执行" intent.
    const now = new Date();
    const { start } = parseTimeRange(task.timeRange);
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
    const lateMs = now.getTime() - windowStart.getTime();

    let fireAfter: Date;
    if (lateMs < PLANNED_TRIGGER_THRESHOLD_MS) {
      // Planned mode. Try anchor first (if applicable), else pre-picked T.
      let resolved: Date | null = null;

      if (task.anchor) {
        const anchored = await this.pickAnchoredFireTime(task);
        if (anchored) {
          resolved = anchored;
          this.taskFireTimes.set(task.name, anchored);
          this.persistNextRun(task.name, anchored);
          void logger.info(`PLAN  ${task.name} ← ${task.anchor} → fire scheduled ~${dayjs(anchored).format('HH:mm:ss')}`);
        }
      }

      if (!resolved) {
        const planned = this.taskFireTimes.get(task.name);
        const todayWindowEnd = this.todayWindowEnd(task);
        if (planned && planned.getTime() <= todayWindowEnd.getTime() && planned.getTime() >= windowStart.getTime()) {
          resolved = planned;
        } else {
          resolved = this.pickPlannedFireTime(task, false);
          this.taskFireTimes.set(task.name, resolved);
          this.persistNextRun(task.name, resolved);
        }
        void logger.info(`PLAN  ${task.name} — Mac awake at windowStart, fire scheduled ~${dayjs(resolved).format('HH:mm:ss')}`);
      }

      fireAfter = resolved;
    } else {
      // Catch-up mode: cron fired late, the planned T is in the past.
      fireAfter = now;
      this.taskFireTimes.set(task.name, fireAfter);
      // Update display so CLI doesn't keep showing the stale planned T
      // during the brief window before the actual fire updates it again.
      this.persistNextRun(task.name, fireAfter);
      void logger.info(`WAKE  ${task.name} — Mac woke / daemon started mid-window at ${dayjs(now).format('HH:mm:ss')}, firing ASAP`);
    }

    const interval = setInterval(() => { void this.enhancedPollTick(task); }, ENHANCED_POLL_INTERVAL_MS);
    this.enhancedPolls.set(task.name, interval);
    // Try once immediately. If we're in catch-up mode we'll fire right away;
    // if planned, the tick will see now < fireAfter and just wait.
    void this.enhancedPollTick(task);
  }

  /** Pick a random fire time within the next applicable window for display + planning. */
  private pickPlannedFireTime(task: RandomTask, alreadyRanToday: boolean): Date {
    const now = new Date();
    // The deterministic pick uses tightFireWindow if set (e.g. "07:00-07:05");
    // wake-induced catch-up still uses the wider task.timeRange.
    const fireRange = task.tightFireWindow ?? task.timeRange;
    const { start, end } = parseTimeRange(fireRange);

    if (!alreadyRanToday && isDayMatch(now, task.days)) {
      const ws = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
      const we = new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);
      if (we.getTime() > now.getTime()) {
        const effectiveStart = Math.max(ws.getTime(), now.getTime());
        const remaining = we.getTime() - effectiveStart;
        if (remaining > 0) {
          return new Date(effectiveStart + Math.floor(Math.random() * remaining));
        }
      }
    }

    const nextDay = nextDayMatch(task.days);
    const ws = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), start.h, start.m);
    const rangeMs = ((end.h * 60 + end.m) - (start.h * 60 + start.m)) * 60_000;
    return new Date(ws.getTime() + Math.floor(Math.random() * rangeMs));
  }

  /**
   * For tasks with `anchor`: target = anchor.lastRun + windowDuration + random(0..5min),
   * clamped to today's `timeRange`. Returns null if the anchor hasn't fired today,
   * the day doesn't match, or the chained target overflows past today's window end
   * (caller falls back to the standard pick in that case).
   */
  private async pickAnchoredFireTime(task: RandomTask, preloadedState?: AppState): Promise<Date | null> {
    if (!task.anchor) return null;

    const now = new Date();
    if (!isDayMatch(now, task.days)) return null;

    const state = preloadedState ?? await loadState();
    const anchorRecord = state.tasks[task.anchor];
    if (!anchorRecord?.lastRun) return null;

    const lastRun = new Date(anchorRecord.lastRun);
    if (dayjs(lastRun).format('YYYY-MM-DD') !== dayjs(now).format('YYYY-MM-DD')) return null;

    const baseGapMs = parseDuration(this.config.global.windowDuration);
    const jitterMs = Math.floor(Math.random() * 5 * 60 * 1000);
    const targetMs = lastRun.getTime() + baseGapMs + jitterMs;

    const { start, end } = parseTimeRange(task.timeRange);
    const ws = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
    const we = new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);

    if (targetMs >= we.getTime()) return null;
    return new Date(Math.max(targetMs, ws.getTime()));
  }

  private todayWindowEnd(task: RandomTask): Date {
    const now = new Date();
    const { end } = parseTimeRange(task.timeRange);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);
  }

  private async enhancedPollTick(task: RandomTask): Promise<void> {
    if (!this.running) {
      this.clearEnhancedPoll(task.name);
      return;
    }
    if (this.firingTasks.has(task.name)) return;

    const now = new Date();

    // Past window or day no longer matches → stop polling. Next windowStart
    // cron will reopen polling. This also catches the "Mac slept through the
    // whole window" case: we wake, tick, see we're past the window, and cleanly
    // shut down until tomorrow.
    if (!isDayMatch(now, task.days) || !isInTimeRange(now, task.timeRange)) {
      this.clearEnhancedPoll(task.name);
      // If we never ran today (window passed without firing — e.g. slept the
      // whole window), pre-pick tomorrow's T so the CLI shows an exact preset
      // time instead of a stale past one.
      void (async () => {
        const state = await loadState();
        if ((state.tasks[task.name]?.todayRuns ?? 0) === 0) {
          const nextT = this.pickPlannedFireTime(task, true);
          this.taskFireTimes.set(task.name, nextT);
          this.persistNextRun(task.name, nextT);
          await logger.info(`SKIP  ${task.name} — window ${task.timeRange} passed without wake-up, deferred to ${dayjs(nextT).format('MM-DD HH:mm:ss')}`);
        } else {
          this.taskFireTimes.delete(task.name);
        }
      })();
      return;
    }

    if (isInBlackout(now, this.config.global.blackout)) return;

    // Honor planned/catch-up fire time decided at startWindowPolling.
    // Planned mode: now < fireAfter → wait. Catch-up mode: fireAfter == now → proceed.
    const fireAfter = this.taskFireTimes.get(task.name);
    if (fireAfter && now.getTime() < fireAfter.getTime()) return;

    const state = await loadState();
    if ((state.tasks[task.name]?.todayRuns ?? 0) > 0) {
      // Already ran today (perhaps by a previous tick) — stop until next window
      this.clearEnhancedPoll(task.name);
      this.taskFireTimes.delete(task.name);
      return;
    }

    this.firingTasks.add(task.name);
    try {
      const jitter = ENHANCED_FIRE_JITTER_MIN_MS + Math.floor(Math.random() * ENHANCED_FIRE_JITTER_RANGE_MS);
      await new Promise<void>(r => setTimeout(r, jitter));

      if (!this.running) return;
      if (!isInTimeRange(new Date(), task.timeRange)) return;

      // Race-recheck: another tick may have fired during our jitter sleep
      const stateAfterJitter = await loadState();
      if ((stateAfterJitter.tasks[task.name]?.todayRuns ?? 0) > 0) return;

      await this.execute(task);
      // Pre-pick tomorrow's T for this task AND, in the same atomic write,
      // recompute any downstream anchored tasks' nextRun (e.g., morning's
      // fire updates noon's planned T to fresh anchor + 5h + jitter so the
      // CLI display matches the actual schedule immediately).
      const postState = await loadState();
      const nextT = this.pickPlannedFireTime(task, true);
      this.taskFireTimes.set(task.name, nextT);
      this.ensureTaskState(postState, task.name).nextRun = nextT.toISOString();
      for (const dep of this.config.tasks) {
        if (dep.type !== 'random' || !dep.enabled || dep.anchor !== task.name) continue;
        if ((postState.tasks[dep.name]?.todayRuns ?? 0) > 0) continue;
        const anchored = await this.pickAnchoredFireTime(dep, postState);
        if (anchored) {
          this.taskFireTimes.set(dep.name, anchored);
          this.ensureTaskState(postState, dep.name).nextRun = anchored.toISOString();
        }
      }
      await saveState(postState);
      // Successful fire: stop polling until next windowStart cron reopens it.
      this.clearEnhancedPoll(task.name);
    } finally {
      this.firingTasks.delete(task.name);
    }
  }

  private clearEnhancedPoll(taskName: string): void {
    const i = this.enhancedPolls.get(taskName);
    if (i) {
      clearInterval(i);
      this.enhancedPolls.delete(taskName);
    }
  }

  /** Convert task.days spec to cron day-of-week, expanding wrap-around ranges. */
  private daysToCronDow(days: string): string {
    if (days === '*') return '*';
    if (days.includes('-') && !days.includes(',')) {
      const [from, to] = days.split('-').map(Number);
      if (Number.isFinite(from) && Number.isFinite(to) && from > to) {
        const list: number[] = [];
        for (let d = from; d <= 6; d++) list.push(d);
        for (let d = 0; d <= to; d++) list.push(d);
        return list.join(',');
      }
    }
    return days;
  }

  /**
   * Compute the next window start for a random task — used for state.nextRun
   * display in enhanced mode (the actual fire time is non-deterministic since
   * it depends on when DarkWake happens within the window).
   */
  private computeNextWindowStart(task: RandomTask, alreadyRanToday: boolean): Date {
    const now = new Date();
    const { start, end } = parseTimeRange(task.timeRange);

    if (!alreadyRanToday && isDayMatch(now, task.days)) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.h, start.m);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), end.h, end.m);
      if (todayEnd.getTime() > now.getTime()) {
        // Today's window still open — show start (or now if already mid-window)
        return todayStart.getTime() > now.getTime() ? todayStart : now;
      }
    }

    const nextDay = nextDayMatch(task.days);
    return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), start.h, start.m);
  }

  private createRandomCallback(task: RandomTask): () => Promise<void> {
    return async () => {
      if (!this.running) return;
      const now = new Date();

      // Strict window guard — always on, regardless of enhancedMode.
      // Catches sleep-induced late firings (node-schedule fires missed timers
      // on macOS DarkWake, which can land past windowEnd). When that happens
      // we drop today's run rather than executing late; tomorrow's slot is
      // scheduled normally by scheduleRandomNext.
      if (!isInTimeRange(now, task.timeRange)) {
        await logger.info(`SKIP  ${task.name} — fired late at ${dayjs(now).format('HH:mm:ss')}, outside window ${task.timeRange}`);
        this.persistNextRun(task.name, this.scheduleRandomNext(task));
        return;
      }

      if (isInBlackout(now, this.config.global.blackout)) {
        await logger.info(`SKIP  ${task.name} — in blackout period`);
        this.persistNextRun(task.name, this.scheduleRandomNext(task));
        return;
      }

      const state = await loadState();
      const taskState = state.tasks[task.name];
      if (taskState && taskState.todayRuns > 0) {
        await logger.info(`SKIP  ${task.name} — already ran ${taskState.todayRuns} time(s) today`);
        this.persistNextRun(task.name, this.scheduleRandomNext(task));
        return;
      }

      await this.execute(task);
      this.persistNextRun(task.name, this.scheduleRandomNext(task));
    };
  }

  /** Runtime-only: persist a single task's nextRun (no race — callbacks fire at different times) */
  private persistNextRun(taskName: string, targetTime: Date): void {
    void (async () => {
      const state = await loadState();
      this.ensureTaskState(state, taskName).nextRun = targetTime.toISOString();
      await saveState(state);
    })();
  }

  private ensureTaskState(state: { tasks: Record<string, { lastRun: string | null; nextRun: string | null; todayRuns: number; todayTokens: number }> }, taskName: string) {
    if (!state.tasks[taskName]) {
      state.tasks[taskName] = { lastRun: null, nextRun: null, todayRuns: 0, todayTokens: 0 };
    }
    return state.tasks[taskName];
  }

  private scheduleWindow(task: WindowTask): void {
    this.windowTracker.onWindowOpen(async (windowStart) => {
      if (!this.running) return;
      if (!isInTimeRange(windowStart, task.activeHours)) return;

      const offsetMs = parseOffset(task.triggerOffset);
      const triggerTime = new Date(windowStart.getTime() + offsetMs);

      if (isInBlackout(triggerTime, this.config.global.blackout)) return;
      if (!isInTimeRange(triggerTime, task.activeHours)) return;

      const stateKey = `window-${task.name}`;
      const existing = this.jobs.get(stateKey);
      if (existing) existing.cancel();

      const job = schedule.scheduleJob(stateKey, triggerTime, async () => {
        if (!this.running) return;
        await this.execute(task);
      });
      if (job) this.jobs.set(stateKey, job);
    });

    // Also check immediately if window is already open
    void this.checkInitialWindowSchedule(task);
  }

  private async checkInitialWindowSchedule(task: WindowTask): Promise<void> {
    const windowActive = await this.windowTracker.isWindowActive();
    if (!windowActive) {
      const now = new Date();
      if (isInTimeRange(now, task.activeHours) && !isInBlackout(now, this.config.global.blackout)) {
        const offsetMs = parseOffset(task.triggerOffset);
        const triggerTime = new Date(Date.now() + offsetMs);
        if (isInTimeRange(triggerTime, task.activeHours)) {
          const stateKey = `window-${task.name}`;
          const job = schedule.scheduleJob(stateKey, triggerTime, async () => {
            if (!this.running) return;
            await this.execute(task);
          });
          if (job) this.jobs.set(stateKey, job);
        }
      }
    }
  }

  /** Pick a fresh prompt for a task. Auto/empty prompts re-roll random each call. */
  private async pickPromptForTask(task: Task): Promise<string> {
    if (task.type === 'window') {
      return task.prompts[Math.floor(Math.random() * task.prompts.length)];
    }
    const rawPrompt = task.prompt;
    if (!isAutoPrompt(rawPrompt)) {
      return rawPrompt.trim();
    }
    const state = await loadState();
    const categories = task.promptCategories && task.promptCategories.length > 0
      ? task.promptCategories
      : this.config.global.knowledgeCategories;
    const result = pickRandomPrompt(
      this.config.global.promptPool,
      this.config.global.language,
      categories,
      this.config.global.customCategories,
      state.knowledge,
    );
    if (result.knowledgeState) {
      state.knowledge = result.knowledgeState;
      await saveState(state);
    }
    return result.prompt;
  }

  private async execute(task: Task): Promise<void> {
    await logger.info(`FIRE  ${task.name}`);

    let attempt = 0;
    let result!: ExecutionResult;
    let resolvedPrompt!: string;

    while (true) {
      resolvedPrompt = await this.pickPromptForTask(task);
      const tag = attempt === 0 ? 'EXEC ' : `RETRY#${attempt}`;
      await logger.info(`${tag} claude -p "${resolvedPrompt.slice(0, 60)}..." --cwd ${task.cwd}`);

      result = await executeTask(this.config.global.claudePath, resolvedPrompt, task.cwd, this.config.global.claudeModel);
      await logger.response(task.name, resolvedPrompt, result.output ?? result.error ?? '');

      if (!result.authFailed || attempt >= AUTH_RETRY_MAX) break;

      // First 401 only: actively warm up keychain auth via a PTY-wrapped
      // claude probe. Subsequent retries rely on race resolution / sleep.
      if (attempt === 0) {
        const warmStart = Date.now();
        await logger.info(`AUTH  ${task.name} — warming up auth via PTY probe...`);
        await warmupAuth(this.config.global.claudePath, task.cwd);
        await logger.info(`AUTH  ${task.name} — warmup done in ${Date.now() - warmStart}ms`);
      }

      attempt++;
      const delayMs = Math.floor(Math.random() * AUTH_RETRY_DELAY_MAX_MS);
      await logger.info(`AUTH  ${task.name} — 401 detected, retry ${attempt}/${AUTH_RETRY_MAX} in ${(delayMs / 1000).toFixed(1)}s`);
      await new Promise<void>(r => setTimeout(r, delayMs));
    }

    const entry: HistoryEntry = {
      task: task.name,
      time: dayjs().toISOString(),
      duration: result.duration,
      status: result.rateLimited ? 'rate_limited' : result.success ? 'success' : 'error',
      tokens: result.tokens ?? 0,
    };
    await appendHistory(entry);

    const retrySuffix = attempt > 0 ? ` (after ${attempt} retr${attempt === 1 ? 'y' : 'ies'})` : '';
    if (result.rateLimited) {
      await logger.info(`FAIL  ${task.name} — RATE_LIMITED${retrySuffix}`);
      await this.windowTracker.markRateLimited();
    } else if (result.success) {
      await logger.info(`DONE  ${task.name}  ${Math.round(result.duration / 1000)}s  ${result.tokens ?? 0} tokens${retrySuffix}`);
      await this.windowTracker.markCallExecuted();
      await recordExecution(task.name, result.tokens ?? 0);
    } else {
      await logger.error(`FAIL  ${task.name} — ${result.error}${retrySuffix}`);
    }

    // Notify all channels on every execution (success, error, rate_limited).
    // notifyTaskExecution reloads config internally, so notify settings changed
    // via CLI after daemon startup still take effect without a daemon restart.
    await notifyTaskExecution(task.name, resolvedPrompt, result);
  }

  private async rescheduleRandomTasks(): Promise<void> {
    const state = await loadState();
    for (const task of this.config.tasks) {
      if (task.type === 'random' && task.enabled) {
        const stateKey = `random-${task.name}`;
        const existing = this.jobs.get(stateKey);
        if (existing) existing.cancel();
        // Enhanced mode: clear and re-install poll defensively (in case the
        // setInterval was lost). Legacy mode: scheduleRandom installs new job.
        this.clearEnhancedPoll(task.name);
        const taskState = this.ensureTaskState(state, task.name);
        const nextRun = this.scheduleRandom(task, taskState.todayRuns);
        taskState.nextRun = nextRun.toISOString();
      }
    }
    await saveState(state);
  }

  private getTimeRangeMs(range: string): number {
    const [startStr, endStr] = range.split('-');
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) * 60 * 1000;
  }

  getNextTriggers(): Array<{ task: string; time: Date; type: string }> {
    const triggers: Array<{ task: string; time: Date; type: string }> = [];
    for (const [key, job] of this.jobs) {
      const next = job.nextInvocation();
      if (next) {
        const taskName = key.replace(/^(random|window)-/, '');
        const type = key.startsWith('random-') ? 'random' : key.startsWith('window-') ? 'window' : 'fixed';
        triggers.push({ task: taskName, time: new Date(next.getTime()), type });
      }
    }
    return triggers.sort((a, b) => a.time.getTime() - b.time.getTime());
  }
}

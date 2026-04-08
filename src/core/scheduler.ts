/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import schedule from 'node-schedule';
import dayjs from 'dayjs';
import { loadConfig } from './config.js';
import { executeTask } from './executor.js';
import { pickRandomPrompt } from './prompts.js';
import { WindowTracker } from './window.js';
import { recordExecution, loadState, saveState } from './state.js';
import { appendHistory } from './state.js';
import {
  randomTimeInRange,
  isInBlackout,
  isInTimeRange,
  parseOffset,
  isDayMatch,
  nextDayMatch,
} from '../utils/time.js';
import { logger } from '../utils/logger.js';
import { notifyTaskExecution } from './notify.js';
import type { Config, Task, FixedTask, RandomTask, WindowTask, HistoryEntry } from '../types.js';

export class Scheduler {
  private jobs = new Map<string, schedule.Job>();
  private windowTracker: WindowTracker;
  private config!: Config;
  private running = false;

  constructor(windowDuration: string) {
    this.windowTracker = new WindowTracker(windowDuration);
  }

  async start(): Promise<void> {
    this.config = await loadConfig();
    this.running = true;

    for (const task of this.config.tasks) {
      if (!task.enabled) continue;
      switch (task.type) {
        case 'fixed':
          this.scheduleFixed(task);
          break;
        case 'random':
          this.scheduleRandom(task);
          break;
        case 'window':
          this.scheduleWindow(task);
          break;
      }
    }

    // Check window state every minute
    schedule.scheduleJob('window-check', '* * * * *', () => {
      this.windowTracker.checkAndNotifyWindowOpen();
    });

    // Re-schedule random tasks at midnight
    schedule.scheduleJob('daily-reset', '0 0 * * *', () => {
      this.rescheduleRandomTasks();
    });

    await logger.info('Scheduler started');
  }

  stop(): void {
    this.running = false;
    for (const [name, job] of this.jobs) {
      job.cancel();
    }
    this.jobs.clear();
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
      await this.execute(task, task.prompt);
    });
    if (job) this.jobs.set(task.name, job);
  }

  private scheduleRandom(task: RandomTask): void {
    const targetTime = randomTimeInRange(task.timeRange, task.days);
    if (!targetTime) return;

    if (isInBlackout(targetTime, this.config.global.blackout)) {
      return;
    }

    // Skip if the generated time is already past (e.g. daemon restarted after the time range)
    if (targetTime.getTime() < Date.now()) {
      return;
    }

    const state_key = `random-${task.name}`;
    const job = schedule.scheduleJob(state_key, targetTime, async () => {
      if (!this.running) return;
      await this.execute(task, task.prompt);
      // Reschedule for next matching day
      this.scheduleRandomNext(task);
    });
    if (job) this.jobs.set(state_key, job);

    void (async () => {
      const state = await loadState();
      if (!state.tasks[task.name]) {
        state.tasks[task.name] = { lastRun: null, nextRun: null, todayRuns: 0, todayTokens: 0 };
      }
      state.tasks[task.name].nextRun = targetTime.toISOString();
      await saveState(state);
    })();
  }

  private scheduleRandomNext(task: RandomTask): void {
    const nextDay = nextDayMatch(task.days);
    const [startStr] = task.timeRange.split('-');
    const [h, m] = startStr.split(':').map(Number);
    const base = dayjs(nextDay).hour(h).minute(m).second(0);
    const rangeMs = this.getTimeRangeMs(task.timeRange);
    const offset = Math.random() * rangeMs;
    const targetTime = base.add(offset, 'millisecond').toDate();

    const state_key = `random-${task.name}`;
    const existing = this.jobs.get(state_key);
    if (existing) existing.cancel();

    const job = schedule.scheduleJob(state_key, targetTime, async () => {
      if (!this.running) return;
      await this.execute(task, task.prompt);
      this.scheduleRandomNext(task);
    });
    if (job) this.jobs.set(state_key, job);

    // Update nextRun in state so the display shows the correct next trigger
    void (async () => {
      const state = await loadState();
      if (!state.tasks[task.name]) {
        state.tasks[task.name] = { lastRun: null, nextRun: null, todayRuns: 0, todayTokens: 0 };
      }
      state.tasks[task.name].nextRun = targetTime.toISOString();
      await saveState(state);
    })();
  }

  private scheduleWindow(task: WindowTask): void {
    this.windowTracker.onWindowOpen(async (windowStart) => {
      if (!this.running) return;
      if (!isInTimeRange(windowStart, task.activeHours)) return;

      const offsetMs = parseOffset(task.triggerOffset);
      const triggerTime = new Date(windowStart.getTime() + offsetMs);

      if (isInBlackout(triggerTime, this.config.global.blackout)) return;
      if (!isInTimeRange(triggerTime, task.activeHours)) return;

      const state_key = `window-${task.name}`;
      const existing = this.jobs.get(state_key);
      if (existing) existing.cancel();

      const job = schedule.scheduleJob(state_key, triggerTime, async () => {
        if (!this.running) return;
        const prompt = task.prompts[Math.floor(Math.random() * task.prompts.length)];
        await this.execute(task, prompt);
      });
      if (job) this.jobs.set(state_key, job);
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
          const state_key = `window-${task.name}`;
          const job = schedule.scheduleJob(state_key, triggerTime, async () => {
            if (!this.running) return;
            const prompt = task.prompts[Math.floor(Math.random() * task.prompts.length)];
            await this.execute(task, prompt);
          });
          if (job) this.jobs.set(state_key, job);
        }
      }
    }
  }

  private async execute(task: Task, prompt: string): Promise<void> {
    // Resolve prompt: if empty, pick random from pool
    const resolvedPrompt = prompt.trim() || pickRandomPrompt(this.config.global.promptPool);
    await logger.info(`FIRE  ${task.name}`);
    await logger.info(`EXEC  claude -p "${resolvedPrompt.slice(0, 60)}..." --cwd ${task.cwd}`);

    const result = await executeTask(this.config.global.claudePath, resolvedPrompt, task.cwd, this.config.global.claudeModel);

    const entry: HistoryEntry = {
      task: task.name,
      time: dayjs().toISOString(),
      duration: result.duration,
      status: result.rateLimited ? 'rate_limited' : result.success ? 'success' : 'error',
      tokens: result.tokens ?? 0,
    };
    await appendHistory(entry);

    // Save prompt + response to log
    await logger.response(task.name, resolvedPrompt, result.output ?? result.error ?? '');

    if (result.rateLimited) {
      await logger.info(`FAIL  ${task.name} — RATE_LIMITED`);
      await this.windowTracker.markRateLimited();
    } else if (result.success) {
      await logger.info(`DONE  ${task.name}  ${Math.round(result.duration / 1000)}s  ${result.tokens ?? 0} tokens`);
      await this.windowTracker.markCallExecuted();
      await recordExecution(task.name, result.tokens ?? 0);
    } else {
      await logger.error(`FAIL  ${task.name} — ${result.error}`);
    }

    // Notify all channels on every execution (success, error, rate_limited)
    await notifyTaskExecution(this.config, task.name, resolvedPrompt, result);
  }

  private rescheduleRandomTasks(): void {
    for (const task of this.config.tasks) {
      if (task.type === 'random' && task.enabled) {
        const key = `random-${task.name}`;
        const existing = this.jobs.get(key);
        if (existing) existing.cancel();
        this.scheduleRandom(task);
      }
    }
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

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import schedule from 'node-schedule';
import dayjs from 'dayjs';
import { loadConfig } from './config.js';
import { executeTask } from './executor.js';
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

  // ─── Random Task Scheduling ────────────────────────────

  private scheduleRandom(task: RandomTask, todayRuns: number = 0): Date {
    const now = new Date();

    // Already executed today — skip directly to next matching day
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

  private createRandomCallback(task: RandomTask): () => Promise<void> {
    return async () => {
      if (!this.running) return;

      if (isInBlackout(new Date(), this.config.global.blackout)) {
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

      await this.execute(task, task.prompt);
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
        const prompt = task.prompts[Math.floor(Math.random() * task.prompts.length)];
        await this.execute(task, prompt);
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
            const prompt = task.prompts[Math.floor(Math.random() * task.prompts.length)];
            await this.execute(task, prompt);
          });
          if (job) this.jobs.set(stateKey, job);
        }
      }
    }
  }

  private async execute(task: Task, prompt: string): Promise<void> {
    // Resolve prompt: if empty, pick from knowledge system or pool
    let resolvedPrompt: string;
    if (isAutoPrompt(prompt)) {
      const state = await loadState();
      // Task-level categories override global if set
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
      resolvedPrompt = result.prompt;
      if (result.knowledgeState) {
        state.knowledge = result.knowledgeState;
        await saveState(state);
      }
    } else {
      resolvedPrompt = prompt.trim();
    }
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

  private async rescheduleRandomTasks(): Promise<void> {
    const state = await loadState();
    for (const task of this.config.tasks) {
      if (task.type === 'random' && task.enabled) {
        const stateKey = `random-${task.name}`;
        const existing = this.jobs.get(stateKey);
        if (existing) existing.cancel();
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

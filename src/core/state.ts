/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import dayjs from 'dayjs';
import { STATE_PATH, HISTORY_PATH, ensureDirs } from '../utils/paths.js';
import type { AppState, HistoryEntry } from '../types.js';

function defaultState(): AppState {
  return {
    daemon: { pid: null, startedAt: null },
    window: { startedAt: null, endsAt: null, callsThisWindow: 0 },
    tasks: {},
    todayDate: dayjs().format('YYYY-MM-DD'),
  };
}

export async function loadState(): Promise<AppState> {
  await ensureDirs();
  if (!existsSync(STATE_PATH)) return defaultState();
  try {
    const data = JSON.parse(await readFile(STATE_PATH, 'utf-8')) as AppState;
    if (data.todayDate !== dayjs().format('YYYY-MM-DD')) {
      for (const key of Object.keys(data.tasks)) {
        data.tasks[key].todayRuns = 0;
        data.tasks[key].todayTokens = 0;
      }
      data.todayDate = dayjs().format('YYYY-MM-DD');
    }
    return data;
  } catch {
    return defaultState();
  }
}

export async function cleanupState(validTaskNames: string[]): Promise<void> {
  const state = await loadState();
  const valid = new Set(validTaskNames);
  for (const name of Object.keys(state.tasks)) {
    if (!valid.has(name)) {
      delete state.tasks[name];
    }
  }
  await saveState(state);
}

export async function saveState(state: AppState): Promise<void> {
  await ensureDirs();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export async function updateDaemonState(pid: number | null): Promise<void> {
  const state = await loadState();
  state.daemon.pid = pid;
  state.daemon.startedAt = pid ? dayjs().toISOString() : null;
  await saveState(state);
}

export async function updateWindowState(startedAt: string | null, endsAt: string | null): Promise<void> {
  const state = await loadState();
  state.window = { startedAt, endsAt, callsThisWindow: startedAt ? 0 : state.window.callsThisWindow };
  await saveState(state);
}

export async function recordExecution(taskName: string, tokens: number): Promise<void> {
  const state = await loadState();
  if (!state.tasks[taskName]) {
    state.tasks[taskName] = { lastRun: null, nextRun: null, todayRuns: 0, todayTokens: 0 };
  }
  state.tasks[taskName].lastRun = dayjs().toISOString();
  state.tasks[taskName].todayRuns += 1;
  state.tasks[taskName].todayTokens += tokens;
  state.window.callsThisWindow += 1;
  await saveState(state);
}

// ─── History ─────────────────────────────────────────────

export async function loadHistory(): Promise<HistoryEntry[]> {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(await readFile(HISTORY_PATH, 'utf-8')) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await ensureDirs();
  const history = await loadHistory();
  history.push(entry);
  const maxEntries = 500;
  const trimmed = history.length > maxEntries ? history.slice(-maxEntries) : history;
  await writeFile(HISTORY_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
}

export async function getTaskHistory(taskName: string, limit = 10): Promise<HistoryEntry[]> {
  const history = await loadHistory();
  return history.filter(h => h.task === taskName).slice(-limit);
}

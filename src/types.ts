/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── Task Types ──────────────────────────────────────────

export type TaskType = 'fixed' | 'random' | 'window';
export type Locale = 'en' | 'zh' | 'ru' | 'de' | 'fr';
export type UISize = 'small' | 'medium' | 'large';
export type ThemeName = 'neon' | 'mono' | 'matrix' | 'classic' | 'vapor' | 'cyber';

export interface BaseTask {
  name: string;
  type: TaskType;
  cwd: string;
  enabled: boolean;
  promptCategories?: string[];
}

export interface FixedTask extends BaseTask {
  type: 'fixed';
  cron: string;
  prompt: string;
}

export interface RandomTask extends BaseTask {
  type: 'random';
  timeRange: string;
  days: string;
  prompt: string;
}

export interface WindowTask extends BaseTask {
  type: 'window';
  activeHours: string;
  triggerOffset: string;
  prompts: string[];
}

export type Task = FixedTask | RandomTask | WindowTask;

// ─── Config ──────────────────────────────────────────────

export interface GlobalConfig {
  claudePath: string;
  claudeModel: string;
  blackout: string[];
  logDir: string;
  windowDuration: string;
  language: Locale;
  uiSize: UISize;
  theme: ThemeName;
  promptPool: string[];
  knowledgeCategories: string[];
  customCategories: CustomCategory[];
}

export interface DingtalkConfig {
  token: string;
  enabled: boolean;
}

export interface FeishuConfig {
  token: string;
  enabled: boolean;
}

export interface NotifyConfig {
  dingtalk: DingtalkConfig;
  feishu: FeishuConfig;
}

export interface Config {
  global: GlobalConfig;
  notify: NotifyConfig;
  tasks: Task[];
}

// ─── Runtime State ───────────────────────────────────────

export interface DaemonState {
  pid: number | null;
  startedAt: string | null;
  version: string | null;
}

export interface WindowState {
  startedAt: string | null;
  endsAt: string | null;
  callsThisWindow: number;
}

export interface TaskRunRecord {
  lastRun: string | null;
  nextRun: string | null;
  todayRuns: number;
  todayTokens: number;
}

export interface AppState {
  daemon: DaemonState;
  window: WindowState;
  tasks: Record<string, TaskRunRecord>;
  todayDate: string;
  knowledge: KnowledgeState;
}

// ─── Knowledge System ───────────────────────────────────

export type BuiltinCategoryId = 'tech' | 'english' | 'medical' | 'legal' | 'psychology' | 'history';

export interface CustomCategory {
  id: string;
  name: string;
  description: string;
}

export interface KnowledgeCategoryState {
  shuffledIndices: number[];
  cursor: number;
  recentDimensions: string[];
}

export interface KnowledgeState {
  categories: Record<string, KnowledgeCategoryState>;
}

// ─── Execution ───────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: string;
  duration: number;
  tokens?: number;
}

export interface HistoryEntry {
  task: string;
  time: string;
  duration: number;
  status: 'success' | 'error' | 'rate_limited';
  tokens: number;
}

// ─── Schedule ────────────────────────────────────────────

export interface ScheduledTrigger {
  taskName: string;
  time: Date;
  type: TaskType;
}

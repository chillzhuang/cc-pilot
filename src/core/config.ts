/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { CONFIG_PATH, ensureDirs } from '../utils/paths.js';
import type { Config, Task, Locale, UISize, ThemeName, GlobalConfig, CustomCategory } from '../types.js';

const DEFAULT_GLOBAL: GlobalConfig = {
  claudePath: 'claude',
  claudeModel: 'claude-sonnet-4-6',
  blackout: ['02:00-06:00'],
  logDir: '~/.cc-pilot/logs',
  windowDuration: '5h',
  language: 'en',
  uiSize: 'medium',
  theme: 'cyber',
  promptPool: [],
  knowledgeCategories: ['tech'],
  customCategories: [],
};

const DEFAULT_NOTIFY = {
  dingtalk: { token: '', enabled: false },
  feishu: { token: '', enabled: false },
};

function normalizeTask(raw: Record<string, unknown>): Task {
  const base = {
    name: raw.name as string,
    type: raw.type as Task['type'],
    cwd: raw.cwd as string ?? '.',
    enabled: raw.enabled !== false,
  };

  switch (base.type) {
    case 'fixed':
      return { ...base, type: 'fixed', cron: raw.cron as string, prompt: raw.prompt as string };
    case 'random':
      return {
        ...base,
        type: 'random',
        timeRange: (raw.time_range ?? raw.timeRange) as string,
        days: (raw.days as string) ?? '*',
        prompt: raw.prompt as string,
      };
    case 'window':
      return {
        ...base,
        type: 'window',
        activeHours: (raw.active_hours ?? raw.activeHours) as string,
        triggerOffset: (raw.trigger_offset ?? raw.triggerOffset) as string ?? '0-60m',
        prompts: (raw.prompts as string[]) ?? [raw.prompt as string],
      };
    default:
      throw new Error(`Unknown task type: ${base.type}`);
  }
}

function taskToYaml(task: Task): Record<string, unknown> {
  const base = { name: task.name, type: task.type, cwd: task.cwd, enabled: task.enabled };
  switch (task.type) {
    case 'fixed':
      return { ...base, cron: task.cron, prompt: task.prompt };
    case 'random':
      return { ...base, time_range: task.timeRange, days: task.days, prompt: task.prompt };
    case 'window':
      return { ...base, active_hours: task.activeHours, trigger_offset: task.triggerOffset, prompts: task.prompts };
  }
}

export async function loadConfig(): Promise<Config> {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('CONFIG_NOT_FOUND');
  }
  const raw = parse(await readFile(CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  const globalRaw = (raw.global ?? {}) as Record<string, unknown>;
  const notifyRaw = (raw.notify ?? {}) as Record<string, unknown>;
  const dingtalkRaw = (notifyRaw.dingtalk ?? {}) as Record<string, unknown>;
  const feishuRaw = (notifyRaw.feishu ?? {}) as Record<string, unknown>;

  return {
    global: {
      claudePath: (globalRaw.claude_path ?? globalRaw.claudePath ?? DEFAULT_GLOBAL.claudePath) as string,
      claudeModel: (globalRaw.claude_model ?? globalRaw.claudeModel ?? DEFAULT_GLOBAL.claudeModel) as string,
      blackout: (globalRaw.blackout ?? DEFAULT_GLOBAL.blackout) as string[],
      logDir: (globalRaw.log_dir ?? globalRaw.logDir ?? DEFAULT_GLOBAL.logDir) as string,
      windowDuration: (globalRaw.window_duration ?? globalRaw.windowDuration ?? DEFAULT_GLOBAL.windowDuration) as string,
      language: (globalRaw.language ?? DEFAULT_GLOBAL.language) as Locale,
      uiSize: (globalRaw.ui_size ?? globalRaw.uiSize ?? DEFAULT_GLOBAL.uiSize) as UISize,
      theme: (globalRaw.theme ?? DEFAULT_GLOBAL.theme) as ThemeName,
      promptPool: (globalRaw.prompt_pool ?? globalRaw.promptPool ?? DEFAULT_GLOBAL.promptPool) as string[],
      knowledgeCategories: (globalRaw.knowledge_categories ?? globalRaw.knowledgeCategories ?? DEFAULT_GLOBAL.knowledgeCategories) as string[],
      customCategories: ((globalRaw.custom_categories ?? globalRaw.customCategories ?? DEFAULT_GLOBAL.customCategories) as Array<Record<string, unknown>>).map(c => ({
        id: c.id as string,
        name: c.name as string,
        description: (c.description ?? '') as string,
      })),
    },
    notify: {
      dingtalk: {
        token: (dingtalkRaw.token ?? DEFAULT_NOTIFY.dingtalk.token) as string,
        enabled: (dingtalkRaw.enabled ?? DEFAULT_NOTIFY.dingtalk.enabled) as boolean,
      },
      feishu: {
        token: (feishuRaw.token ?? DEFAULT_NOTIFY.feishu.token) as string,
        enabled: (feishuRaw.enabled ?? DEFAULT_NOTIFY.feishu.enabled) as boolean,
      },
    },
    tasks: ((raw.tasks ?? []) as Record<string, unknown>[]).map(normalizeTask),
  };
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureDirs();
  const yamlObj = {
    global: {
      claude_path: config.global.claudePath,
      claude_model: config.global.claudeModel,
      blackout: config.global.blackout,
      log_dir: config.global.logDir,
      window_duration: config.global.windowDuration,
      language: config.global.language,
      ui_size: config.global.uiSize,
      theme: config.global.theme,
      prompt_pool: config.global.promptPool.length > 0 ? config.global.promptPool : undefined,
      knowledge_categories: config.global.knowledgeCategories.length > 0 ? config.global.knowledgeCategories : undefined,
      custom_categories: config.global.customCategories.length > 0
        ? config.global.customCategories.map(c => ({ id: c.id, name: c.name, description: c.description }))
        : undefined,
    },
    notify: {
      dingtalk: {
        token: config.notify.dingtalk.token || undefined,
        enabled: config.notify.dingtalk.enabled,
      },
      feishu: {
        token: config.notify.feishu.token || undefined,
        enabled: config.notify.feishu.enabled,
      },
    },
    tasks: config.tasks.map(taskToYaml),
  };
  await writeFile(CONFIG_PATH, stringify(yamlObj, { lineWidth: 120 }), 'utf-8');
}

export async function addTask(task: Task): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.some(t => t.name === task.name)) {
    throw new Error(`Task "${task.name}" already exists`);
  }
  config.tasks.push(task);
  await saveConfig(config);
}

export async function removeTask(name: string): Promise<void> {
  const config = await loadConfig();
  config.tasks = config.tasks.filter(t => t.name !== name);
  await saveConfig(config);
}

export async function updateTask(name: string, updates: Partial<Task>): Promise<void> {
  const config = await loadConfig();
  const idx = config.tasks.findIndex(t => t.name === name);
  if (idx === -1) throw new Error(`Task "${name}" not found`);
  config.tasks[idx] = { ...config.tasks[idx], ...updates } as Task;
  await saveConfig(config);
}

export async function toggleTask(name: string): Promise<boolean> {
  const config = await loadConfig();
  const task = config.tasks.find(t => t.name === name);
  if (!task) throw new Error(`Task "${name}" not found`);
  task.enabled = !task.enabled;
  await saveConfig(config);
  return task.enabled;
}

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export { DEFAULT_GLOBAL, DEFAULT_NOTIFY };

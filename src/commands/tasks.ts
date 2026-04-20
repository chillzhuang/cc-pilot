/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { loadConfig, addTask, removeTask, toggleTask } from '../core/config.js';
import { getBuiltinCategoryIds } from '../core/knowledge.js';
import { loadState, saveState, getTaskHistory } from '../core/state.js';
import { executeTask } from '../core/executor.js';
import { pickRandomPrompt, isAutoPrompt } from '../core/prompts.js';
import { appendHistory } from '../core/state.js';
import { renderSection, renderPanel, renderStatusLine, renderSeparator } from '../ui/render.js';
import { selectPrompt, checkboxPrompt, safePrompt, BACK } from '../ui/prompt.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import { formatDuration, formatTime, computeNextRandomRun } from '../utils/time.js';
import ora from 'ora';
import dayjs from 'dayjs';
import { notifyTaskExecution } from '../core/notify.js';
import type { Task, HistoryEntry } from '../types.js';

// ─── List ────────────────────────────────────────────────

export async function tasksListCommand(): Promise<void> {
  const config = await loadConfig();
  const state = await loadState();

  if (config.tasks.length === 0) {
    console.log(T.dim(t('task.noTasks')));
    return;
  }

  const rows = config.tasks.map((task, i) => {
    const idx = T.dim(`${i + 1}`.padStart(2));
    const name = T.text(task.name);
    const type = T.dim(task.type.toUpperCase());
    let schedule = '';
    if (task.type === 'fixed') schedule = task.cron;
    else if (task.type === 'random') schedule = `${task.timeRange} ${task.days === '*' ? 'daily' : `d${task.days}`}`;
    else schedule = `${task.activeHours} auto`;
    const status = task.enabled ? T.success(`${T.dot} ON`) : T.error(`${T.dotEmpty} OFF`);
    return `${idx}  ${name}  ${type}  ${T.dim(schedule)}  ${status}`;
  });

  // Compute effective next trigger for each enabled task
  // Strategy: use daemon-persisted nextRun if valid, otherwise compute from task config
  const now = Date.now();
  const nextRuns: Array<{ name: string; time: Date }> = [];
  for (const task of config.tasks) {
    if (!task.enabled) continue;
    const taskState = state.tasks[task.name];
    const stateNextRun = taskState?.nextRun ? new Date(taskState.nextRun) : null;

    if (task.type === 'random') {
      if (stateNextRun && stateNextRun.getTime() > now) {
        nextRuns.push({ name: task.name, time: stateNextRun });
      } else {
        const alreadyRan = (taskState?.todayRuns ?? 0) > 0;
        nextRuns.push({
          name: task.name,
          time: computeNextRandomRun(task.timeRange, task.days, new Date(), alreadyRan),
        });
      }
    } else if (stateNextRun && stateNextRun.getTime() > now) {
      // Fixed / window tasks: fall back to daemon-persisted value
      nextRuns.push({ name: task.name, time: stateNextRun });
    }
  }
  nextRuns.sort((a, b) => a.time.getTime() - b.time.getTime());

  if (nextRuns.length > 0) {
    rows.push('');
    const next = nextRuns[0];
    const nextTime = dayjs(next.time);
    const fmt = 'MM-DD HH:mm:ss';
    rows.push(`${t('task.nextTrigger')} ${T.primary(next.name)} @ ${T.accent(nextTime.format(fmt))}`);
  }

  console.log(renderSection(`TASK REGISTRY  ${T.dim(`${config.tasks.length} loaded`)}`, rows));
}

// ─── Add ─────────────────────────────────────────────────

export async function tasksAddCommand(): Promise<void> {
  const config = await loadConfig();

  const r0 = await safePrompt<{ name: string }>([{ type: 'input', name: 'name', message: t('init.taskName') }]);
  if (!r0) return;

  const type = await selectPrompt<string>({
    message: t('init.taskType'),
    choices: [
      { name: `Fixed (${t('task.fixedDesc')})`, value: 'fixed' },
      { name: `Random (${t('task.randomDesc')})`, value: 'random' },
      { name: `Window (${t('task.windowDesc')})`, value: 'window' },
    ],
  });
  if (type === BACK) return;

  const r1 = await safePrompt<{ cwd: string }>([{ type: 'input', name: 'cwd', message: t('init.taskCwd'), default: '.' }]);
  if (!r1) return;

  const name = r0.name;
  const cwd = r1.cwd;
  let task: Task;

  if (type === 'fixed') {
    const r2 = await safePrompt<{ cron: string }>([{
      type: 'input', name: 'cron',
      message: `${t('init.taskCron')} ${T.dim('(min hour dom mon dow)')}`,
      default: '30 17 * * *',
      suffix: T.dim('  e.g. "0 9 * * 1-5" = weekdays 9:00, "*/30 * * * *" = every 30min'),
    }]);
    if (!r2) return;
    const pc = await promptWithCategory(config);
    if (!pc) return;
    task = { name, type, cron: r2.cron, prompt: pc.text, cwd, enabled: true, ...(pc.categories ? { promptCategories: pc.categories } : {}) };
  } else if (type === 'random') {
    const r2 = await safePrompt<{ timeRange: string }>([{
      type: 'input', name: 'timeRange',
      message: `${t('init.taskTimeRange')} ${T.dim('(HH:MM-HH:MM)')}`,
      default: '07:00-08:00',
      suffix: T.dim('  e.g. "09:00-10:00", "18:00-19:30"'),
    }]);
    if (!r2) return;
    const r3 = await safePrompt<{ days: string }>([{
      type: 'input', name: 'days',
      message: `${t('init.taskDays')} ${T.dim('(* = daily)')}`,
      default: '*',
      suffix: T.dim('  e.g. "*" = daily, "1-5" = Mon-Fri, "0,6" = weekends'),
    }]);
    if (!r3) return;
    const pc = await promptWithCategory(config);
    if (!pc) return;
    task = { name, type, timeRange: r2.timeRange, days: r3.days, prompt: pc.text, cwd, enabled: true, ...(pc.categories ? { promptCategories: pc.categories } : {}) };
  } else {
    const r2 = await safePrompt<{ activeHours: string }>([{
      type: 'input', name: 'activeHours',
      message: `${t('init.taskActiveHours')} ${T.dim('(HH:MM-HH:MM)')}`,
      default: '08:00-23:00',
      suffix: T.dim('  e.g. "08:00-23:00", "06:00-22:00"'),
    }]);
    if (!r2) return;
    const r3 = await safePrompt<{ triggerOffset: string }>([{
      type: 'input', name: 'triggerOffset',
      message: `${t('init.taskOffset')} ${T.dim('(N-Nm)')}`,
      default: '0-60m',
      suffix: T.dim('  e.g. "0-60m" = 0~60min random, "10-30m"'),
    }]);
    if (!r3) return;
    const prompts: string[] = [];
    let addMore = true;
    while (addMore) {
      const rp = await safePrompt<{ prompt: string }>([{ type: 'input', name: 'prompt', message: t('init.taskPrompts') }]);
      if (!rp) return;
      prompts.push(rp.prompt);
      const rm = await safePrompt<{ more: boolean }>([{ type: 'confirm', name: 'more', message: t('init.addAnother'), default: false }]);
      if (!rm) return;
      addMore = rm.more;
    }
    task = { name, type: 'window', activeHours: r2.activeHours, triggerOffset: r3.triggerOffset, prompts, cwd, enabled: true };
  }

  await addTask(task);
  console.log(T.success(`✓ Task "${name}" added`));
}

// ─── Prompt with category binding ───────────────────────

async function promptWithCategory(config: { global: { knowledgeCategories: string[]; customCategories: { id: string; name: string }[] } }): Promise<{ text: string; categories?: string[] } | null> {
  const promptType = await selectPrompt<string>({
    message: t('init.taskPrompt'),
    choices: [
      { name: `${T.accent('auto')}  ${T.dim('── ' + t('task.autoPromptDesc'))}`, value: 'auto' },
      { name: `${T.accent('auto + categories')}  ${T.dim('── ' + t('task.autoCategoryDesc'))}`, value: 'auto-category' },
      { name: `${T.accent('custom')}  ${T.dim('── ' + t('task.customPromptDesc'))}`, value: 'custom' },
    ],
  });
  if (promptType === BACK) return null;

  if (promptType === 'custom') {
    const r = await safePrompt<{ text: string }>([{ type: 'input', name: 'text', message: 'Prompt:' }]);
    return r ? { text: r.text } : null;
  }

  if (promptType === 'auto-category') {
    const builtinIds = getBuiltinCategoryIds();
    const allIds = [...builtinIds, ...config.global.customCategories.map(c => c.id)];
    const selected = await checkboxPrompt<string>({
      message: t('knowledge.selectCategories'),
      choices: allIds.map(id => {
        const custom = config.global.customCategories.find(c => c.id === id);
        const label = custom ? custom.name : t(`knowledge.cat${id.charAt(0).toUpperCase() + id.slice(1)}`);
        return { name: label, value: id, checked: config.global.knowledgeCategories.includes(id) };
      }),
      validate: (input: string[]) => input.length > 0 || t('knowledge.minOneCategory'),
    });
    if (selected === BACK) return null;
    return { text: 'auto', categories: selected };
  }

  return { text: 'auto' };
}

// ─── Edit ────────────────────────────────────────────────

export async function tasksEditCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const taskName = await selectPrompt<string>({
    message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({ name: `${tk.name} (${tk.type})`, value: tk.name })),
  });
  if (taskName === BACK) return;

  const task = config.tasks.find(tk => tk.name === taskName)!;
  console.log(T.dim(`Current: ${JSON.stringify(task, null, 2)}`));
  console.log(T.dim('Edit directly:'));
  console.log(T.accent('  ~/.cc-pilot/config.yml'));
}

// ─── Remove ──────────────────────────────────────────────

export async function tasksRemoveCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const taskName = await selectPrompt<string>({
    message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({ name: `${tk.name} (${tk.type})`, value: tk.name })),
  });
  if (taskName === BACK) return;

  const r = await safePrompt<{ confirm: boolean }>([{
    type: 'confirm', name: 'confirm', message: t('task.confirmRemove'), default: false,
  }]);
  if (!r || !r.confirm) return;

  await removeTask(taskName);
  console.log(T.success(`✓ Task "${taskName}" removed`));
}

// ─── Toggle ──────────────────────────────────────────────

export async function tasksToggleCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const taskName = await selectPrompt<string>({
    message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({
      name: `${tk.enabled ? T.dot : T.dotEmpty} ${tk.name} (${tk.type})`,
      value: tk.name,
    })),
  });
  if (taskName === BACK) return;

  const newState = await toggleTask(taskName);
  console.log(newState ? T.success(`✓ ${taskName} enabled`) : T.error(`${T.dotEmpty} ${taskName} disabled`));
}

// ─── Test (immediate trigger, full response) ─────────────

export async function tasksTestCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const taskName = await selectPrompt<string>({
    message: t('fire.title'),
    choices: config.tasks.map((tk, i) => ({
      name: `[${i + 1}] ${tk.name}  ${T.dim(tk.type.toUpperCase())}`,
      value: tk.name,
    })),
  });
  if (taskName === BACK) return;

  const task = config.tasks.find(tk => tk.name === taskName)!;
  const rawPrompt = task.type === 'window'
    ? task.prompts[Math.floor(Math.random() * task.prompts.length)]
    : task.prompt;

  let prompt: string;
  if (isAutoPrompt(rawPrompt)) {
    const state = await loadState();
    const categories = task.promptCategories && task.promptCategories.length > 0
      ? task.promptCategories
      : config.global.knowledgeCategories;
    const result = pickRandomPrompt(
      config.global.promptPool,
      config.global.language,
      categories,
      config.global.customCategories,
      state.knowledge,
    );
    prompt = result.prompt;
    if (result.knowledgeState) {
      state.knowledge = result.knowledgeState;
      await saveState(state);
    }
  } else {
    prompt = rawPrompt.trim();
  }

  console.log('');
  console.log(renderPanel(`${T.primary('YOU')}  ${T.dim('TASK')} ${taskName}  ${T.dim('CWD')} ${task.cwd}  ${T.dim('TIME')} ${dayjs().format('HH:mm:ss')}`, [
    '',
    T.text(prompt),
  ]));

  console.log('');
  const spinner = ora(t('fire.executing')).start();
  const result = await executeTask(config.global.claudePath, prompt, task.cwd, config.global.claudeModel);
  const duration = Math.round(result.duration / 1000);

  if (result.success) {
    spinner.succeed(`${duration}s  ${((result.tokens ?? 0) / 1000).toFixed(1)}k tokens`);
  } else if (result.rateLimited) {
    spinner.fail('RATE_LIMITED');
  } else {
    spinner.fail(`ERROR  ${duration}s`);
  }

  const responseLines = (result.output ?? result.error ?? '').split('\n');
  const statusText = result.success
    ? T.success(`${T.dot} SUCCESS`)
    : result.rateLimited ? T.error(`${T.dot} RATE_LIMITED`) : T.error(`${T.dot} ERROR`);

  console.log('');
  console.log(renderPanel(T.success('CLAUDE'), [
    '',
    ...responseLines.map(l => T.text(l)),
    '',
    renderSeparator(),
    `  ${statusText}  ${T.dim(`${duration}s`)}  ${T.dim(`${((result.tokens ?? 0) / 1000).toFixed(1)}k tokens`)}`,
  ]));

  const { logger } = await import('../utils/logger.js');
  await logger.response(taskName, prompt, result.output ?? result.error ?? '');

  await appendHistory({
    task: taskName,
    time: dayjs().toISOString(),
    duration: result.duration,
    status: result.rateLimited ? 'rate_limited' : result.success ? 'success' : 'error',
    tokens: result.tokens ?? 0,
  });

  await notifyTaskExecution(taskName, prompt, result);
}

// ─── History ─────────────────────────────────────────────

export async function tasksHistoryCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const taskName = await selectPrompt<string>({
    message: t('task.selectTask'),
    choices: [
      { name: 'All tasks', value: '__all__' },
      ...config.tasks.map(tk => ({ name: tk.name, value: tk.name })),
    ],
  });
  if (taskName === BACK) return;

  const entries = taskName === '__all__'
    ? (await import('../core/state.js')).loadHistory().then(h => h.slice(-15))
    : getTaskHistory(taskName, 15);

  const history = await entries;
  if (history.length === 0) {
    console.log(T.dim(t('log.noLogs')));
    return;
  }

  const rows = history.map(h => {
    const time = dayjs(h.time).format('YYYY-MM-DD HH:mm:ss');
    const dur = formatDuration(h.duration);
    const status = h.status === 'success' ? T.success('✓ done')
      : h.status === 'rate_limited' ? T.error('✗ rate') : T.error('✗ err');
    const tokens = h.tokens > 0 ? `${(h.tokens / 1000).toFixed(1)}k` : '-';
    return `${T.dim(time)}  ${T.dim(dur.padEnd(8))}  ${status}  ${T.dim(tokens)}`;
  });

  console.log(renderSection(`HISTORY ${T.dim(`── ${taskName === '__all__' ? 'ALL' : taskName}`)}`, rows));
}

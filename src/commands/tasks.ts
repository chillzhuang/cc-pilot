/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { loadConfig, addTask, removeTask, toggleTask } from '../core/config.js';
import { getBuiltinCategoryIds } from '../core/knowledge.js';
import { safePrompt } from '../ui/prompt.js';
import { loadState, saveState, getTaskHistory } from '../core/state.js';
import { executeTask } from '../core/executor.js';
import { pickRandomPrompt, isAutoPrompt } from '../core/prompts.js';
import { appendHistory, recordExecution } from '../core/state.js';
import { renderSection, renderPanel, renderStatusLine, renderSeparator } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import { formatDuration, formatTime } from '../utils/time.js';
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

  // Only show next trigger for tasks that exist in config, filtering out past times
  const taskNames = new Set(config.tasks.map(tk => tk.name));
  const now = Date.now();
  const nextTask = state.tasks
    ? Object.entries(state.tasks)
      .filter(([name, v]) => v.nextRun && taskNames.has(name) && new Date(v.nextRun).getTime() > now)
      .sort(([, a], [, b]) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0]
    : null;

  if (nextTask) {
    rows.push('');
    rows.push(`${t('task.nextTrigger')} ${T.primary(nextTask[0])} @ ${T.accent(dayjs(nextTask[1].nextRun!).format('HH:mm:ss'))}`);
  }

  console.log(renderSection(`TASK REGISTRY  ${T.dim(`${config.tasks.length} loaded`)}`, rows));
}

// ─── Add ─────────────────────────────────────────────────

export async function tasksAddCommand(): Promise<void> {
  const config = await loadConfig();

  const { name } = await inquirer.prompt([{ type: 'input', name: 'name', message: t('init.taskName') }]);
  const { type } = await inquirer.prompt([{
    type: 'list', name: 'type', message: t('init.taskType'),
    choices: [
      { name: `Fixed (${t('task.fixedDesc')})`, value: 'fixed' },
      { name: `Random (${t('task.randomDesc')})`, value: 'random' },
      { name: `Window (${t('task.windowDesc')})`, value: 'window' },
    ],
  }]);
  const { cwd } = await inquirer.prompt([{ type: 'input', name: 'cwd', message: t('init.taskCwd'), default: '.' }]);

  let task: Task;
  if (type === 'fixed') {
    const { cron } = await inquirer.prompt([{
      type: 'input', name: 'cron',
      message: `${t('init.taskCron')} ${T.dim('(min hour dom mon dow)')}`,
      default: '30 17 * * *',
      suffix: T.dim('  e.g. "0 9 * * 1-5" = weekdays 9:00, "*/30 * * * *" = every 30min'),
    }]);
    const pcResult = await promptWithCategory(config);
    if (!pcResult) return;
    task = { name, type, cron, prompt: pcResult.prompt.text, cwd, enabled: true, ...(pcResult.prompt.categories ? { promptCategories: pcResult.prompt.categories } : {}) };
  } else if (type === 'random') {
    const { timeRange } = await inquirer.prompt([{
      type: 'input', name: 'timeRange',
      message: `${t('init.taskTimeRange')} ${T.dim('(HH:MM-HH:MM)')}`,
      default: '07:00-08:00',
      suffix: T.dim('  e.g. "09:00-10:00", "18:00-19:30"'),
    }]);
    const { days } = await inquirer.prompt([{
      type: 'input', name: 'days',
      message: `${t('init.taskDays')} ${T.dim('(* = daily)')}`,
      default: '*',
      suffix: T.dim('  e.g. "*" = daily, "1-5" = Mon-Fri, "0,6" = weekends'),
    }]);
    const pcResult = await promptWithCategory(config);
    if (!pcResult) return;
    task = { name, type, timeRange, days, prompt: pcResult.prompt.text, cwd, enabled: true, ...(pcResult.prompt.categories ? { promptCategories: pcResult.prompt.categories } : {}) };
  } else {
    const { activeHours } = await inquirer.prompt([{
      type: 'input', name: 'activeHours',
      message: `${t('init.taskActiveHours')} ${T.dim('(HH:MM-HH:MM)')}`,
      default: '08:00-23:00',
      suffix: T.dim('  e.g. "08:00-23:00", "06:00-22:00"'),
    }]);
    const { triggerOffset } = await inquirer.prompt([{
      type: 'input', name: 'triggerOffset',
      message: `${t('init.taskOffset')} ${T.dim('(N-Nm)')}`,
      default: '0-60m',
      suffix: T.dim('  e.g. "0-60m" = 0~60min random, "10-30m"'),
    }]);
    const prompts: string[] = [];
    let addMore = true;
    while (addMore) {
      const { prompt } = await inquirer.prompt([{ type: 'input', name: 'prompt', message: t('init.taskPrompts') }]);
      prompts.push(prompt);
      const { more } = await inquirer.prompt([{ type: 'confirm', name: 'more', message: t('init.addAnother'), default: false }]);
      addMore = more;
    }
    task = { name, type: 'window', activeHours, triggerOffset, prompts, cwd, enabled: true };
  }

  await addTask(task);
  console.log(T.success(`✓ Task "${name}" added`));
}

// ─── Prompt with category binding ───────────────────────

async function promptWithCategory(config: { global: { knowledgeCategories: string[]; customCategories: { id: string; name: string }[] } }): Promise<{ prompt: { text: string; categories?: string[] } } | null> {
  const r = await safePrompt<{ promptType: string }>([{
    type: 'list', name: 'promptType',
    message: t('init.taskPrompt'),
    choices: [
      { name: `${T.accent('auto')}  ${T.dim('── ' + t('task.autoPromptDesc'))}`, value: 'auto' },
      { name: `${T.accent('auto + categories')}  ${T.dim('── ' + t('task.autoCategoryDesc'))}`, value: 'auto-category' },
      { name: `${T.accent('custom')}  ${T.dim('── ' + t('task.customPromptDesc'))}`, value: 'custom' },
    ],
  }]);
  if (!r) return null;

  if (r.promptType === 'custom') {
    const r2 = await safePrompt<{ text: string }>([{ type: 'input', name: 'text', message: 'Prompt:' }]);
    if (!r2) return null;
    return { prompt: { text: r2.text } };
  }

  if (r.promptType === 'auto-category') {
    const builtinIds = getBuiltinCategoryIds();
    const allIds = [...builtinIds, ...config.global.customCategories.map(c => c.id)];
    const r2 = await safePrompt<{ selected: string[] }>([{
      type: 'checkbox', name: 'selected',
      message: t('knowledge.selectCategories'),
      choices: allIds.map(id => {
        const custom = config.global.customCategories.find(c => c.id === id);
        const label = custom ? custom.name : t(`knowledge.cat${id.charAt(0).toUpperCase() + id.slice(1)}`);
        return { name: label, value: id, checked: config.global.knowledgeCategories.includes(id) };
      }),
      validate: (input: string[]) => input.length > 0 || t('knowledge.minOneCategory'),
    }]);
    if (!r2) return null;
    return { prompt: { text: 'auto', categories: r2.selected } };
  }

  return { prompt: { text: 'auto' } };
}

// ─── Edit ────────────────────────────────────────────────

export async function tasksEditCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const r = await safePrompt<{ taskName: string }>([{
    type: 'list', name: 'taskName', message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({ name: `${tk.name} (${tk.type})`, value: tk.name })),
  }]);
  if (!r) return;

  const task = config.tasks.find(tk => tk.name === r.taskName)!;
  console.log(T.dim(`Current: ${JSON.stringify(task, null, 2)}`));
  console.log(T.dim('Edit directly:'));
  console.log(T.accent('  ~/.cc-pilot/config.yml'));
}

// ─── Remove ──────────────────────────────────────────────

export async function tasksRemoveCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const r = await safePrompt<{ taskName: string }>([{
    type: 'list', name: 'taskName', message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({ name: `${tk.name} (${tk.type})`, value: tk.name })),
  }]);
  if (!r) return;

  const r2 = await safePrompt<{ confirm: boolean }>([{
    type: 'confirm', name: 'confirm', message: t('task.confirmRemove'), default: false,
  }]);
  if (!r2) return;

  if (r2.confirm) {
    await removeTask(r.taskName);
    console.log(T.success(`✓ Task "${r.taskName}" removed`));
  }
}

// ─── Toggle ──────────────────────────────────────────────

export async function tasksToggleCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const r = await safePrompt<{ taskName: string }>([{
    type: 'list', name: 'taskName', message: t('task.selectTask'),
    choices: config.tasks.map(tk => ({
      name: `${tk.enabled ? T.dot : T.dotEmpty} ${tk.name} (${tk.type})`,
      value: tk.name,
    })),
  }]);
  if (!r) return;

  const newState = await toggleTask(r.taskName);
  console.log(newState ? T.success(`✓ ${r.taskName} enabled`) : T.error(`${T.dotEmpty} ${r.taskName} disabled`));
}

// ─── Test (immediate trigger, full response) ─────────────

export async function tasksTestCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const r = await safePrompt<{ taskName: string }>([{
    type: 'list', name: 'taskName', message: t('fire.title'),
    choices: config.tasks.map((tk, i) => ({
      name: `[${i + 1}] ${tk.name}  ${T.dim(tk.type.toUpperCase())}`,
      value: tk.name,
    })),
  }]);
  if (!r) return;

  const taskName = r.taskName;
  const task = config.tasks.find(tk => tk.name === taskName)!;
  const rawPrompt = task.type === 'window'
    ? task.prompts[Math.floor(Math.random() * task.prompts.length)]
    : task.prompt;

  let prompt: string;
  if (isAutoPrompt(rawPrompt)) {
    const state = await loadState();
    // Task-level categories override global if set
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

  // Show prompt
  console.log('');
  console.log(renderPanel(`${T.primary('YOU')}  ${T.dim('TASK')} ${taskName}  ${T.dim('CWD')} ${task.cwd}  ${T.dim('TIME')} ${dayjs().format('HH:mm:ss')}`, [
    '',
    T.text(prompt),
  ]));

  // Execute
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

  // Show response
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

  // Save prompt + response to log
  const { logger } = await import('../utils/logger.js');
  await logger.response(taskName, prompt, result.output ?? result.error ?? '');

  // Record
  await appendHistory({
    task: taskName,
    time: dayjs().toISOString(),
    duration: result.duration,
    status: result.rateLimited ? 'rate_limited' : result.success ? 'success' : 'error',
    tokens: result.tokens ?? 0,
  });
  if (result.success) await recordExecution(taskName, result.tokens ?? 0);

  // Notify all channels
  await notifyTaskExecution(config, taskName, prompt, result);
}

// ─── History ─────────────────────────────────────────────

export async function tasksHistoryCommand(): Promise<void> {
  const config = await loadConfig();
  if (config.tasks.length === 0) { console.log(T.dim(t('task.noTasks'))); return; }

  const r = await safePrompt<{ taskName: string }>([{
    type: 'list', name: 'taskName', message: t('task.selectTask'),
    choices: [
      { name: 'All tasks', value: '__all__' },
      ...config.tasks.map(tk => ({ name: tk.name, value: tk.name })),
    ],
  }]);
  if (!r) return;

  const taskName = r.taskName;
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

  console.log(renderSection(`HISTORY ${T.dim(`── ${r.taskName === '__all__' ? 'ALL' : r.taskName}`)}`, rows));
}

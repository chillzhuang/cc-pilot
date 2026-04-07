/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { saveConfig, configExists } from '../core/config.js';
import { t, setLocale } from '../i18n/index.js';
import { ensureDirs } from '../utils/paths.js';
import { T, setTheme, getAllThemes } from '../ui/theme.js';
import { renderSection, renderPanel } from '../ui/render.js';
import type { Config, Task, Locale, UISize, ThemeName } from '../types.js';

function detectClaudePath(): { path: string; found: boolean } {
  // Try common paths
  const candidates = ['claude'];
  try {
    const which = execSync('which claude 2>/dev/null || where claude 2>nul', { encoding: 'utf-8' }).trim();
    if (which) return { path: which.split('\n')[0].trim(), found: true };
  } catch { /* not in PATH */ }

  // Check common install locations
  const commonPaths = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.local/bin/claude`,
    `${process.env.HOME}/.claude/local/claude`,
  ];
  for (const p of commonPaths) {
    if (existsSync(p)) return { path: p, found: true };
  }

  return { path: 'claude', found: false };
}

// ─── Default preset tasks ────────────────────────────────

const DEFAULT_TASKS: Task[] = [
  {
    name: 'morning-activate',
    type: 'random',
    timeRange: '07:00-08:00',
    days: '*',
    prompt: '',   // empty = pick random from built-in 100 prompts
    cwd: '.',
    enabled: true,
  },
  {
    name: 'noon-activate',
    type: 'random',
    timeRange: '12:00-13:00',
    days: '*',
    prompt: '',
    cwd: '.',
    enabled: true,
  },
  {
    name: 'evening-activate',
    type: 'random',
    timeRange: '17:00-18:00',
    days: '*',
    prompt: '',
    cwd: '.',
    enabled: true,
  },
];

// ─── First-run quick setup ───────────────────────────────

export async function firstRunSetup(): Promise<void> {
  await ensureDirs();

  console.log('');
  console.log(renderSection('▸ WELCOME / 欢迎', [
    '',
    T.primary('  First time running CC-PILOT!'),
    T.dim('  Let\'s set up your configuration.'),
    '',
  ]));
  console.log('');

  // Language
  const { language } = await inquirer.prompt([{
    type: 'list',
    name: 'language',
    message: 'Select language / 选择语言:',
    choices: [
      { name: 'English', value: 'en' },
      { name: '中文', value: 'zh' },
      { name: 'Русский', value: 'ru' },
      { name: 'Deutsch', value: 'de' },
      { name: 'Français', value: 'fr' },
    ],
    default: 'en',
  }]);

  await setLocale(language as Locale);

  // Claude path — auto-detect
  const detected = detectClaudePath();
  if (detected.found) {
    console.log(T.success(`  ✓ Claude CLI detected: ${detected.path}`));
  } else {
    console.log(T.accent('  ⚠ Claude CLI not found in PATH'));
  }

  const { claudePath } = await inquirer.prompt([{
    type: 'input',
    name: 'claudePath',
    message: t('init.claudePath'),
    default: detected.path,
  }]);

  // Claude model
  const { claudeModel } = await inquirer.prompt([{
    type: 'list',
    name: 'claudeModel',
    message: language === 'zh' ? 'Claude 模型:' : 'Claude model:',
    choices: [
      { name: 'claude-sonnet-4-6 (fast, recommended)', value: 'claude-sonnet-4-6' },
      { name: 'claude-opus-4-6 (powerful)', value: 'claude-opus-4-6' },
      { name: 'claude-haiku-4-5 (lightweight)', value: 'claude-haiku-4-5' },
    ],
    default: 'claude-sonnet-4-6',
  }]);

  // UI Size
  // Theme
  const themes = getAllThemes();
  const { theme } = await inquirer.prompt([{
    type: 'list',
    name: 'theme',
    message: language === 'zh' ? '主题风格:' : 'Theme:',
    choices: themes.map(th => ({ name: `${th.name} (${th.label})`, value: th.name })),
    default: 'cyber',
  }]);

  setTheme(theme as ThemeName);

  // Show default tasks and ask if user wants them
  console.log('');
  console.log(renderSection(`▸ ${t('init.defaultTasks')}`, [
    '',
    `  ${T.success('●')} ${T.accent('morning-activate')}   ── 07:00-08:00 ${T.dim('random daily')}`,
    T.dim('    prompt: (random from 100 built-in light prompts)'),
    '',
    `  ${T.success('●')} ${T.accent('noon-activate')}      ── 12:00-13:00 ${T.dim('random daily')}`,
    T.dim('    prompt: (random from 100 built-in light prompts)'),
    '',
    `  ${T.success('●')} ${T.accent('evening-activate')}   ── 17:00-18:00 ${T.dim('random daily')}`,
    T.dim('    prompt: (random from 100 built-in light prompts)'),
    '',
  ]));
  console.log('');

  const { useDefaults } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useDefaults',
    message: t('init.addTask') + ' (use defaults above)',
    default: true,
  }]);

  let tasks: Task[] = [];

  if (useDefaults) {
    tasks = [...DEFAULT_TASKS];

    // Ask for default working directory with current dir hint
    const currentDir = process.cwd();
    const { cwd } = await inquirer.prompt([{
      type: 'input',
      name: 'cwd',
      message: `${t('init.taskCwdAll')} ${T.dim(`(${t('init.currentDir')}: ${currentDir})`)}`,
      default: '.',
    }]);
    tasks = tasks.map(task => ({ ...task, cwd }));

    // Ask if user wants different directories per task
    const { customizeCwd } = await inquirer.prompt([{
      type: 'confirm',
      name: 'customizeCwd',
      message: t('init.taskCwdCustomize'),
      default: false,
    }]);

    if (customizeCwd) {
      for (const task of tasks) {
        const { taskCwd } = await inquirer.prompt([{
          type: 'input',
          name: 'taskCwd',
          message: `  ${T.accent(task.name)} ${t('init.taskCwd')}`,
          default: cwd,
        }]);
        task.cwd = taskCwd;
      }
    }

    // Ask if user wants to customize prompts
    const { customize } = await inquirer.prompt([{
      type: 'confirm',
      name: 'customize',
      message: language === 'zh' ? '需要自定义每个任务的 prompt 吗？' : 'Customize task prompts?',
      default: false,
    }]);

    if (customize) {
      for (const task of tasks) {
        if (task.type === 'random') {
          const { prompt } = await inquirer.prompt([{
            type: 'input',
            name: 'prompt',
            message: `${task.name} prompt:`,
            default: task.prompt,
          }]);
          task.prompt = prompt;
        }
      }
    }
  }

  // Additional custom tasks
  const { addMore } = await inquirer.prompt([{
    type: 'confirm',
    name: 'addMore',
    message: t('init.addAnother'),
    default: false,
  }]);

  if (addMore) {
    let keepAdding = true;
    while (keepAdding) {
      const task = await promptTask();
      tasks.push(task);
      const { more } = await inquirer.prompt([{
        type: 'confirm', name: 'more',
        message: t('init.addAnother'),
        default: false,
      }]);
      keepAdding = more;
    }
  }

  const config: Config = {
    global: {
      claudePath,
      claudeModel: claudeModel as string,
      blackout: ['02:00-06:00'],
      logDir: '~/.cc-pilot/logs',
      windowDuration: '5h',
      uiSize: 'medium' as UISize,
      theme: theme as ThemeName,
      language: language as Locale,
      promptPool: [],
    },
    notify: {
      dingtalk: { token: '', enabled: false },
      feishu: { token: '', enabled: false },
    },
    tasks,
  };

  await saveConfig(config);

  console.log('');
  console.log(renderSection(`▸ ${t('init.setupComplete')}`, [
    '',
    T.success(`  ✓ ${t('init.configSaved')}`),
    T.dim(`  ✓ ${tasks.length} ${t('init.tasksConfigured')}`),
    '',
    T.dim(`  ${t('init.tipStart')}`),
    '',
  ]));
  console.log('');
}

// ─── Full manual init (menu option 13 / cc-pilot init) ────

export async function initCommand(): Promise<void> {
  await ensureDirs();

  if (configExists()) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Config already exists. Overwrite?',
      default: false,
    }]);
    if (!overwrite) return;
  }

  await firstRunSetup();
}

// ─── Task prompt helper ──────────────────────────────────

async function promptTask(): Promise<Task> {
  const { name } = await inquirer.prompt([{
    type: 'input',
    name: 'name',
    message: t('init.taskName'),
  }]);

  const { type } = await inquirer.prompt([{
    type: 'list',
    name: 'type',
    message: t('init.taskType'),
    choices: [
      { name: `Fixed (${t('task.fixedDesc')})`, value: 'fixed' },
      { name: `Random (${t('task.randomDesc')})`, value: 'random' },
      { name: `Window (${t('task.windowDesc')})`, value: 'window' },
    ],
  }]);

  const currentDir = process.cwd();
  const { cwd } = await inquirer.prompt([{
    type: 'input',
    name: 'cwd',
    message: `${t('init.taskCwd')} ${T.dim(`(${t('init.currentDir')}: ${currentDir})`)}`,
    default: '.',
  }]);

  if (type === 'fixed') {
    const { cron } = await inquirer.prompt([{
      type: 'input',
      name: 'cron',
      message: t('init.taskCron'),
      default: '30 17 * * *',
    }]);
    const { prompt } = await inquirer.prompt([{
      type: 'input',
      name: 'prompt',
      message: t('init.taskPrompt'),
    }]);
    return { name, type: 'fixed', cron, prompt, cwd, enabled: true };
  }

  if (type === 'random') {
    const { timeRange } = await inquirer.prompt([{
      type: 'input',
      name: 'timeRange',
      message: t('init.taskTimeRange'),
      default: '07:00-08:00',
    }]);
    const { days } = await inquirer.prompt([{
      type: 'input',
      name: 'days',
      message: t('init.taskDays'),
      default: '*',
    }]);
    const { prompt } = await inquirer.prompt([{
      type: 'input',
      name: 'prompt',
      message: t('init.taskPrompt'),
    }]);
    return { name, type: 'random', timeRange, days, prompt, cwd, enabled: true };
  }

  // window type
  const { activeHours } = await inquirer.prompt([{
    type: 'input',
    name: 'activeHours',
    message: t('init.taskActiveHours'),
    default: '08:00-23:00',
  }]);
  const { triggerOffset } = await inquirer.prompt([{
    type: 'input',
    name: 'triggerOffset',
    message: t('init.taskOffset'),
    default: '0-60m',
  }]);

  const prompts: string[] = [];
  let addPrompt = true;
  while (addPrompt) {
    const { prompt } = await inquirer.prompt([{
      type: 'input',
      name: 'prompt',
      message: t('init.taskPrompts'),
    }]);
    prompts.push(prompt);
    const { more } = await inquirer.prompt([{
      type: 'confirm', name: 'more',
      message: t('init.addAnother'),
      default: false,
    }]);
    addPrompt = more;
  }

  return { name, type: 'window', activeHours, triggerOffset, prompts, cwd, enabled: true };
}

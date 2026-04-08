/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { renderBanner } from './ui/banner.js';
import { renderCategory } from './ui/render.js';
import { T, setTheme, getThemeName, getAllThemes, gradient } from './ui/theme.js';
import { t, setLocale, getLocale } from './i18n/index.js';
import { isDaemonRunningAsync, getDaemonUptime, getDaemonVersion, getCurrentVersion, startDaemon, restartDaemon } from './core/daemon.js';
import { loadState, cleanupState } from './core/state.js';
import { loadConfig, saveConfig, configExists, DEFAULT_GLOBAL } from './core/config.js';
import { loadHistory } from './core/state.js';
import { ensureDirs } from './utils/paths.js';
import { formatDuration } from './utils/time.js';
import dayjs from 'dayjs';
import type { Locale, ThemeName } from './types.js';

// Commands
import { initCommand, firstRunSetup } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { tasksListCommand, tasksAddCommand, tasksEditCommand, tasksRemoveCommand, tasksToggleCommand, tasksTestCommand, tasksHistoryCommand } from './commands/tasks.js';
import { logCommand } from './commands/log.js';
import { windowCommand } from './commands/window.js';
import { installCommand, uninstallCommand } from './commands/install.js';
import { aboutCommand } from './commands/about.js';
import { dingtalkCommand, feishuCommand } from './commands/notify.js';
import { knowledgeCommand } from './commands/knowledge.js';

// ─── Readline helper (for press-enter prompts) ──────────

async function ask(promptText: string): Promise<string | null> {
  const { createInterface } = await import('node:readline');
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let resolved = false;
    rl.on('close', () => {
      if (!resolved) { resolved = true; resolve(null); }
    });
    rl.question(promptText, (answer) => {
      resolved = true;
      rl.close();
      resolve(answer);
    });
  });
}

// ─── Status info ─────────────────────────────────────────

async function getStatusInfo() {
  const online = await isDaemonRunningAsync();
  const uptime = await getDaemonUptime();
  const state = await loadState();
  const history = await loadHistory();
  const today = dayjs().format('YYYY-MM-DD');
  const todayEntries = history.filter(h => h.time.startsWith(today));

  let enabledTasks = 0;
  try {
    const config = await loadConfig();
    enabledTasks = config.tasks.filter(t => t.enabled).length;
  } catch { /* no config yet */ }

  return {
    online,
    uptime: uptime ? formatDuration(uptime) : undefined,
    todayRuns: todayEntries.length,
    taskCount: enabledTasks,
  };
}

// ─── Themed menu choice builder ─────────────────────────

function menuItem(label: string, desc: string, value: string): { name: string; value: string; short: string } {
  return {
    name: `${T.bold(label)}  ${T.dim(`${T.separator}${T.separator} ${desc}`)}`,
    value,
    short: label,
  };
}

function buildMenuChoices() {
  return [
    new inquirer.Separator(renderCategory(t('menu.taskCtrl'))),
    menuItem(t('menu.list'), t('menu.listDesc'), 'list'),
    menuItem(t('menu.add'), t('menu.addDesc'), 'add'),
    menuItem(t('menu.edit'), t('menu.editDesc'), 'edit'),
    menuItem(t('menu.remove'), t('menu.removeDesc'), 'remove'),
    menuItem(t('menu.toggle'), t('menu.toggleDesc'), 'toggle'),
    menuItem(t('menu.test'), t('menu.testDesc'), 'test'),
    new inquirer.Separator(renderCategory(t('menu.daemon'))),
    menuItem(t('menu.start'), t('menu.startDesc'), 'start'),
    menuItem(t('menu.stop'), t('menu.stopDesc'), 'stop'),
    menuItem(t('menu.status'), t('menu.statusDesc'), 'status'),
    new inquirer.Separator(renderCategory(t('menu.dataStream'))),
    menuItem(t('menu.log'), t('menu.logDesc'), 'log'),
    menuItem(t('menu.history'), t('menu.historyDesc'), 'history'),
    menuItem(t('menu.window'), t('menu.windowDesc'), 'window'),
    new inquirer.Separator(renderCategory(t('menu.notify'))),
    menuItem(t('menu.dingtalk'), t('menu.dingtalkDesc'), 'dingtalk'),
    menuItem(t('menu.feishu'), t('menu.feishuDesc'), 'feishu'),
    new inquirer.Separator(renderCategory(t('menu.sysConfig'))),
    menuItem(t('menu.init'), t('menu.initDesc'), 'init'),
    menuItem(t('menu.config'), t('menu.configDesc'), 'config'),
    menuItem(t('menu.install'), t('menu.installDesc'), 'install'),
    menuItem(t('menu.uninstall'), t('menu.uninstallDesc'), 'uninstall'),
    new inquirer.Separator(T.dim(`  ${T.separator.repeat(48)}`)),
    menuItem(t('menu.knowledge'), t('menu.knowledgeDesc'), 'knowledge'),
    menuItem(t('menu.lang'), t('menu.langDesc'), 'lang'),
    menuItem(t('menu.theme'), t('menu.themeDesc'), 'theme'),
    menuItem(t('menu.about'), t('menu.aboutDesc'), 'about'),
    new inquirer.Separator(T.dim(`  ${T.separator.repeat(48)}`)),
    menuItem(t('menu.exit'), t('menu.exitDesc'), 'exit'),
    menuItem(t('menu.shutdown'), t('menu.shutdownDesc'), 'shutdown'),
  ];
}

// ─── Action dispatcher ──────────────────────────────────

async function executeAction(action: string): Promise<boolean> {
  const actions: Record<string, () => Promise<void>> = {
    list: tasksListCommand,
    add: tasksAddCommand,
    edit: tasksEditCommand,
    remove: tasksRemoveCommand,
    toggle: tasksToggleCommand,
    test: tasksTestCommand,
    start: startCommand,
    stop: stopCommand,
    status: statusCommand,
    log: logCommand,
    history: tasksHistoryCommand,
    window: windowCommand,
    dingtalk: dingtalkCommand,
    feishu: feishuCommand,
    init: initCommand,
    config: async () => {
      const { exec } = await import('node:child_process');
      const editor = process.env.EDITOR || 'vi';
      exec(`${editor} ~/.cc-pilot/config.yml`);
      console.log(T.dim(t('menu.openingConfig')));
    },
    install: installCommand,
    uninstall: uninstallCommand,
    knowledge: knowledgeCommand,
    lang: handleLangSwitch,
    theme: handleThemeSwitch,
    about: aboutCommand,
  };

  if (action === 'exit') return false;

  if (action === 'shutdown') {
    if (await isDaemonRunningAsync()) {
      try {
        const { stopDaemon } = await import('./core/daemon.js');
        await stopDaemon();
        console.log(T.primary(`  ${T.bullet} ${t('menu.daemonStopped')}`));
      } catch { /* already stopped */ }
    }
    return false;
  }

  const handler = actions[action];
  if (handler) {
    try {
      await handler();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  }

  return true;
}

// ─── Language switch ─────────────────────────────────────

async function handleLangSwitch(): Promise<void> {
  const { lang } = await inquirer.prompt([{
    type: 'list',
    name: 'lang',
    message: t('menu.langSwitch'),
    choices: [
      { name: 'English', value: 'en' },
      { name: '中文', value: 'zh' },
      { name: 'Русский', value: 'ru' },
      { name: 'Deutsch', value: 'de' },
      { name: 'Français', value: 'fr' },
    ],
    default: getLocale(),
  }]);

  await setLocale(lang as Locale);

  if (configExists()) {
    const config = await loadConfig();
    config.global.language = lang as Locale;
    await saveConfig(config);
  } else {
    await saveConfig({ global: { ...DEFAULT_GLOBAL, language: lang as Locale }, notify: { dingtalk: { token: '', enabled: false }, feishu: { token: '', enabled: false } }, tasks: [] });
  }
}

// ─── Theme switch ────────────────────────────────────────

async function handleThemeSwitch(): Promise<void> {
  const themes = getAllThemes();
  const { selected } = await inquirer.prompt([{
    type: 'list',
    name: 'selected',
    message: t('menu.theme'),
    choices: themes.map(th => ({
      name: `${th.name === getThemeName() ? T.success(T.dot) : ' '} ${th.name} — ${th.label}`,
      value: th.name,
      short: th.name,
    })),
    default: getThemeName(),
  }]);

  setTheme(selected as ThemeName);

  if (configExists()) {
    const config = await loadConfig();
    config.global.theme = selected as ThemeName;
    await saveConfig(config);
  }
}

// ─── Main menu loop ──────────────────────────────────────

export async function interactiveMenu(): Promise<void> {
  await setLocale('en');

  if (!configExists()) {
    await firstRunSetup();
  }

  if (configExists()) {
    try {
      const config = await loadConfig();
      await setLocale(config.global.language);
      if (config.global.theme) setTheme(config.global.theme);
      await cleanupState(config.tasks.map(tk => tk.name));
    } catch { /* use default */ }
  }

  if (configExists()) {
    const running = await isDaemonRunningAsync();
    if (running) {
      const daemonVer = await getDaemonVersion();
      const currentVer = getCurrentVersion();
      if (daemonVer && daemonVer !== currentVer) {
        try {
          const pid = await restartDaemon();
          console.log(T.primary(`  ${T.bullet} ${t('menu.daemonRestarted')} v${daemonVer} → v${currentVer} (PID: ${pid})\n`));
        } catch { /* ignore */ }
      }
    } else {
      try {
        const pid = await startDaemon();
        console.log(T.primary(`  ${T.bullet} ${t('menu.daemonAutoStarted')} (PID: ${pid})\n`));
      } catch { /* ignore if fails */ }
    }
  }

  let running = true;
  while (running) {
    // Clear screen + scrollback buffer + cursor home
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    const statusInfo = await getStatusInfo();
    console.log(renderBanner(statusInfo));
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: gradient(`${T.bullet} ${t('menu.input').toUpperCase()}`),
      choices: buildMenuChoices(),
      pageSize: 30,
      loop: false,
    }]);

    console.log('');
    running = await executeAction(action);

    if (running) {
      await ask(`\n${T.dim(`  ${t('menu.pressEnter')}`)}`);
    }
  }

  console.log(T.dim(`\n  ${t('menu.disconnected')}\n`));
}

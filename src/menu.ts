/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { createInterface } from 'node:readline';
import inquirer from 'inquirer';
import { renderBanner } from './ui/banner.js';
import { renderMenuItem, renderCategory } from './ui/render.js';
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

// ─── Readline helper ─────────────────────────────────────

function ask(promptText: string): Promise<string | null> {
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

// ─── Menu render ─────────────────────────────────────────

function renderMenu(): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(renderCategory(t('menu.taskCtrl')));
  lines.push(renderMenuItem(1, t('menu.list'), t('menu.listDesc')));
  lines.push(renderMenuItem(2, t('menu.add'), t('menu.addDesc')));
  lines.push(renderMenuItem(3, t('menu.edit'), t('menu.editDesc')));
  lines.push(renderMenuItem(4, t('menu.remove'), t('menu.removeDesc')));
  lines.push(renderMenuItem(5, t('menu.toggle'), t('menu.toggleDesc')));
  lines.push(renderMenuItem(6, t('menu.test'), t('menu.testDesc')));
  lines.push(renderCategory(t('menu.daemon')));
  lines.push(renderMenuItem(7, t('menu.start'), t('menu.startDesc')));
  lines.push(renderMenuItem(8, t('menu.stop'), t('menu.stopDesc')));
  lines.push(renderMenuItem(9, t('menu.status'), t('menu.statusDesc')));
  lines.push(renderCategory(t('menu.dataStream')));
  lines.push(renderMenuItem(10, t('menu.log'), t('menu.logDesc')));
  lines.push(renderMenuItem(11, t('menu.history'), t('menu.historyDesc')));
  lines.push(renderMenuItem(12, t('menu.window'), t('menu.windowDesc')));
  lines.push(renderCategory(t('menu.notify')));
  lines.push(renderMenuItem(13, t('menu.dingtalk'), t('menu.dingtalkDesc')));
  lines.push(renderMenuItem(14, t('menu.feishu'), t('menu.feishuDesc')));
  lines.push(renderCategory(t('menu.sysConfig')));
  lines.push(renderMenuItem(15, t('menu.init'), t('menu.initDesc')));
  lines.push(renderMenuItem(16, t('menu.config'), t('menu.configDesc')));
  lines.push(renderMenuItem(17, t('menu.install'), t('menu.installDesc')));
  lines.push(renderMenuItem(18, t('menu.uninstall'), t('menu.uninstallDesc')));
  lines.push(renderMenuItem(19, t('menu.exit'), t('menu.exitDesc')));
  lines.push(renderMenuItem(20, t('menu.shutdown'), t('menu.shutdownDesc')));
  lines.push('');
  lines.push(T.dim(`  ${T.separator.repeat(48)}`));
  lines.push(renderMenuItem('K', t('menu.knowledge'), t('menu.knowledgeDesc')));
  lines.push(renderMenuItem('L', t('menu.lang'), t('menu.langDesc')));
  lines.push(renderMenuItem('T', t('menu.theme'), t('menu.themeDesc')));
  lines.push(renderMenuItem('X', t('menu.about'), t('menu.aboutDesc')));
  lines.push('');

  return lines.join('\n');
}

// ─── Input handler ───────────────────────────────────────

async function handleInput(input: string): Promise<boolean> {
  const cmd = input.trim().toLowerCase();

  const actions: Record<string, () => Promise<void>> = {
    '1': tasksListCommand,
    '2': tasksAddCommand,
    '3': tasksEditCommand,
    '4': tasksRemoveCommand,
    '5': tasksToggleCommand,
    '6': tasksTestCommand,
    '7': startCommand,
    '8': stopCommand,
    '9': statusCommand,
    '10': logCommand,
    '11': tasksHistoryCommand,
    '12': windowCommand,
    '13': dingtalkCommand,
    '14': feishuCommand,
    '15': initCommand,
    '16': async () => {
      const { exec } = await import('node:child_process');
      const editor = process.env.EDITOR || 'vi';
      exec(`${editor} ~/.cc-pilot/config.yml`);
      console.log(T.dim(t('menu.openingConfig')));
    },
    '17': installCommand,
    '18': uninstallCommand,
  };

  if (cmd === '19' || cmd === 'exit') return false;

  if (cmd === '20' || cmd === 'shutdown') {
    if (await isDaemonRunningAsync()) {
      try {
        const { stopDaemon } = await import('./core/daemon.js');
        await stopDaemon();
        console.log(T.primary(`  ${T.bullet} ${t('menu.daemonStopped')}`));
      } catch { /* already stopped */ }
    }
    return false;
  }

  if (cmd === 'k' || cmd === 'knowledge') {
    await knowledgeCommand();
    return true;
  }

  if (cmd === 'l' || cmd === 'lang') {
    await handleLangSwitch();
    return true;
  }

  if (cmd === 't' || cmd === 'theme') {
    await handleThemeSwitch();
    return true;
  }

  if (cmd === 'x' || cmd === 'about') {
    await aboutCommand();
    return true;
  }

  const action = actions[cmd];
  if (action) {
    try {
      await action();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  } else {
    console.log(T.dim(t('menu.invalidInput')));
  }

  return true;
}

// ─── Language switch (inquirer list) ─────────────────────

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

// ─── Theme switch (inquirer list) ────────────────────────

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
      // Version mismatch → auto-restart daemon with new code
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
    // Clear screen + scrollback buffer + cursor home (prevents ghost duplication)
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    const statusInfo = await getStatusInfo();
    console.log(renderBanner(statusInfo));
    console.log(renderMenu());

    const input = await ask(`  ${gradient(`\u2591\u2592\u2593 ${t('menu.input').toUpperCase()} \u2593\u2592\u2591`)}  `);
    if (input === null) break;

    console.log('');
    running = await handleInput(input);

    if (running) {
      await ask(`\n${T.dim(`  ${t('menu.pressEnter')}`)}`);
    }
  }

  console.log(T.dim(`\n  ${t('menu.disconnected')}\n`));
}

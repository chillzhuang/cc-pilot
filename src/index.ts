/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { Command } from 'commander';
import { interactiveMenu } from './menu.js';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import {
  tasksListCommand,
  tasksAddCommand,
  tasksRemoveCommand,
  tasksToggleCommand,
  tasksTestCommand,
  tasksHistoryCommand,
} from './commands/tasks.js';
import { logCommand } from './commands/log.js';
import { windowCommand } from './commands/window.js';
import { installCommand, uninstallCommand } from './commands/install.js';
import { knowledgeCommand } from './commands/knowledge.js';
import { ensureDirs } from './utils/paths.js';
import { loadConfig, configExists } from './core/config.js';
import { setLocale } from './i18n/index.js';

const program = new Command();

program
  .name('cc-pilot')
  .description('Claude Code Auto Pilot — Intelligent conversation scheduler')
  .version('1.0.0');

// If no args, launch interactive menu
program
  .action(async () => {
    await ensureDirs();
    await setLocale('en');
    if (configExists()) {
      try {
        const config = await loadConfig();
        await setLocale(config.global.language);
      } catch { /* ignore */ }
    }
    await interactiveMenu();
  });

program
  .command('init')
  .description('Initialize configuration')
  .action(async () => { await ensureDirs(); await initCommand(); });

program
  .command('start')
  .description('Start the scheduling daemon')
  .action(startCommand);

program
  .command('stop')
  .description('Stop the scheduling daemon')
  .action(stopCommand);

program
  .command('status')
  .description('Show runtime status')
  .action(statusCommand);

// Task management
const tasks = program.command('tasks').description('Manage tasks');
tasks.command('list').description('List all tasks').action(tasksListCommand);
tasks.command('add').description('Add a new task').action(tasksAddCommand);
tasks.command('remove').description('Remove a task').action(tasksRemoveCommand);
tasks.command('toggle').description('Enable/disable a task').action(tasksToggleCommand);
tasks.command('test').description('Test a task with live streaming output').action(tasksTestCommand);
tasks.command('history').description('View task execution history').action(tasksHistoryCommand);

program
  .command('log')
  .description('View execution logs')
  .option('-n, --lines <n>', 'Number of lines', '30')
  .action(async (opts) => { await logCommand(parseInt(opts.lines)); });

program
  .command('window')
  .description('Show window state')
  .action(windowCommand);

program
  .command('knowledge')
  .description('Configure knowledge learning categories')
  .action(knowledgeCommand);

program
  .command('install')
  .description('Register as system auto-start service')
  .action(installCommand);

program
  .command('uninstall')
  .description('Remove system auto-start service')
  .action(uninstallCommand);

program.parse();

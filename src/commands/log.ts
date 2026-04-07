/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import dayjs from 'dayjs';
import { LOG_DIR } from '../utils/paths.js';
import { renderSection } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';

function colorizeLogLine(line: string): string {
  if (line.includes('▸ FIRE')) return T.primary(line);
  if (line.includes('▸ EXEC')) return T.dim(line);
  if (line.includes('▸ DONE')) return T.success(line);
  if (line.includes('▸ FAIL')) return T.error(line);
  if (line.includes('▸ SCHED')) return T.warn(line);
  if (line.includes('▸ ERROR')) return T.error(line);
  return T.dim(line);
}

export async function logCommand(lines = 30): Promise<void> {
  const today = dayjs().format('YYYY-MM-DD');
  const logFile = join(LOG_DIR, `${today}.log`);

  if (!existsSync(logFile)) {
    console.log(T.dim(t('log.noLogs')));
    return;
  }

  const content = await readFile(logFile, 'utf-8');
  const allLines = content.trim().split('\n');
  const tail = allLines.slice(-lines);

  console.log(renderSection(`LIVE LOG  ${T.dim(today)}`, tail.map(colorizeLogLine)));
}

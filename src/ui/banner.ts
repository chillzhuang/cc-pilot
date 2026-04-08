/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── ASCII Art Banner & Status Bar ──────────────────────
import { T, gradient } from './theme.js';

const ASCII_ART = [
  '  ██████╗ ██████╗   ██████╗ ██╗██╗      ██████╗ ████████╗',
  ' ██╔════╝██╔════╝   ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝',
  ' ██║     ██║        ██████╔╝██║██║     ██║   ██║   ██║',
  ' ██║     ██║        ██╔═══╝ ██║██║     ██║   ██║   ██║',
  ' ╚██████╗╚██████╗   ██║     ██║███████╗╚██████╔╝   ██║',
  '  ╚═════╝ ╚═════╝   ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝',
];

const SUBTITLE = '  C L A U D E   C O D E   A U T O   P I L O T   v1.1.1';

interface BannerStatus {
  online: boolean;
  uptime?: string;
  todayRuns?: number;
  taskCount?: number;
}

export function renderBanner(status: BannerStatus): string {
  const lines: string[] = [];

  // ASCII art
  for (const line of ASCII_ART) {
    lines.push(T.primary(line));
  }
  lines.push(gradient(SUBTITLE));
  lines.push('');

  // Status line
  const indicator = status.online
    ? T.success(`${T.dot} ONLINE`)
    : T.error(`${T.dotEmpty} OFFLINE`);

  const parts: string[] = [indicator];
  if (status.uptime) parts.push(`${T.dim('UPTIME')} ${T.value(status.uptime)}`);
  if (status.todayRuns !== undefined) parts.push(`${T.dim('TODAY')} ${T.value(String(status.todayRuns))}`);
  if (status.taskCount !== undefined) parts.push(`${T.dim('TASKS')} ${T.value(String(status.taskCount))}`);

  lines.push(`  ${parts.join('    ')}`);
  lines.push(`  ${T.dim(T.sectionChar.repeat(50))}`);

  return lines.join('\n');
}

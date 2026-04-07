/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { loadConfig, configExists } from '../core/config.js';
import { WindowTracker } from '../core/window.js';
import { renderSection, renderProgress, renderStatusLine } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import { formatDuration } from '../utils/time.js';
import dayjs from 'dayjs';

export async function windowCommand(): Promise<void> {
  if (!configExists()) { console.error(t('errors.configNotFound')); return; }

  const config = await loadConfig();
  const wt = new WindowTracker(config.global.windowDuration);
  const ws = await wt.getStatus();

  const totalMs = 5 * 60 * 60 * 1000;
  const elapsed = ws.active ? totalMs - ws.remainMs : 0;
  const percent = ws.active ? Math.round((elapsed / totalMs) * 100) : 0;

  console.log(renderSection('WINDOW STATE', [
    `CURRENT  ${renderProgress(percent, 100, 20)}`,
    '',
    renderStatusLine('STARTED', ws.startedAt ? dayjs(ws.startedAt).format('YYYY-MM-DD HH:mm:ss') : T.dim('No active window')),
    renderStatusLine('ENDS AT', ws.endsAt ? `${dayjs(ws.endsAt).format('YYYY-MM-DD HH:mm:ss')}  ${T.primary(formatDuration(ws.remainMs))} ${t('status.remain')}` : '-'),
    renderStatusLine('CALLS', `${ws.callsThisWindow} ${t('status.calls')}`),
    '',
    renderStatusLine('STATUS', ws.active ? T.success(`${T.dot} ACTIVE`) : T.dim(`${T.dotEmpty} IDLE`)),
    renderStatusLine('DURATION', config.global.windowDuration),
  ]));
}

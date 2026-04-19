/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { isDaemonRunningAsync, getDaemonUptime } from '../core/daemon.js';
import { loadState } from '../core/state.js';
import { loadConfig, configExists } from '../core/config.js';
import { WindowTracker } from '../core/window.js';
import { loadHistory } from '../core/state.js';
import { renderSection, renderProgress, renderStatusLine } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import { formatDuration, parseDuration } from '../utils/time.js';
import dayjs from 'dayjs';

export async function statusCommand(): Promise<void> {
  if (!configExists()) { console.error(t('errors.configNotFound')); return; }

  const config = await loadConfig();
  const state = await loadState();
  const running = await isDaemonRunningAsync();
  const uptime = await getDaemonUptime();
  const wt = new WindowTracker(config.global.windowDuration);
  const ws = await wt.getStatus();

  // Runtime
  console.log(renderSection('STATE', [
    renderStatusLine('PID', state.daemon.pid?.toString() ?? '-'),
    renderStatusLine('UPTIME', uptime ? formatDuration(uptime) : '-'),
    renderStatusLine('STATE', running ? T.success(`${T.dot} ${t('status.watching').toUpperCase()}`) : T.error(`${T.dotEmpty} ${t('status.offline').toUpperCase()}`)),
  ]));

  // Window
  const windowMs = parseDuration(config.global.windowDuration);
  const windowPercent = ws.active && ws.remainMs > 0
    ? Math.round((1 - ws.remainMs / windowMs) * 100) : 0;
  console.log('');
  console.log(renderSection('WINDOW TRACKER', [
    `CURRENT  ${renderProgress(windowPercent, 100, 20)}`,
    renderStatusLine('OPENED', ws.startedAt ? dayjs(ws.startedAt).format('HH:mm:ss') : '-'),
    renderStatusLine('CLOSES', ws.endsAt ? `${dayjs(ws.endsAt).format('HH:mm:ss')}  ${formatDuration(ws.remainMs)} ${t('status.remain')}` : '-'),
    renderStatusLine('EXECUTED', `${ws.callsThisWindow} ${t('status.calls')}`),
  ]));

  // Today stats
  const history = await loadHistory();
  const today = dayjs().format('YYYY-MM-DD');
  const todayEntries = history.filter(h => dayjs(h.time).format('YYYY-MM-DD') === today);
  const totalToday = todayEntries.length;
  const successToday = todayEntries.filter(h => h.status === 'success').length;
  const rateLimitToday = todayEntries.filter(h => h.status === 'rate_limited').length;
  const tokensToday = todayEntries.reduce((sum, h) => sum + h.tokens, 0);

  console.log('');
  console.log(renderSection('TODAY STATS', [
    `${t('status.total').toUpperCase().padEnd(10)} ${renderProgress(totalToday, Math.max(8, totalToday), 10)}  ${totalToday}`,
    `${t('status.success').toUpperCase().padEnd(10)} ${renderProgress(successToday, Math.max(totalToday, 1), 10)}  ${successToday}`,
    `${'RATE_LMT'.padEnd(10)} ${renderProgress(rateLimitToday, Math.max(totalToday, 1), 10)}  ${rateLimitToday}`,
    renderStatusLine('TOKENS', `${(tokensToday / 1000).toFixed(1)}k ${t('status.consumed')}`),
  ]));
}

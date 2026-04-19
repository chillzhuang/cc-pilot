/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import dayjs from 'dayjs';
import { sendTaskNotification as sendDingtalkNotify } from '../utils/dingtalk.js';
import { sendTaskNotification as sendFeishuNotify } from '../utils/feishu.js';
import { logger } from '../utils/logger.js';
import type { Config, ExecutionResult } from '../types.js';

/**
 * Send notifications to all configured channels after any task execution.
 * Called from both scheduler (auto) and tasksTestCommand (manual [6]).
 */
export async function notifyTaskExecution(
  config: Config,
  taskName: string,
  prompt: string,
  result: ExecutionResult,
): Promise<void> {
  const payload = {
    taskName,
    prompt,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    model: config.global.claudeModel || 'default',
    response: result.output ?? result.error ?? '',
    duration: result.duration,
    tokens: result.tokens ?? 0,
    status: result.rateLimited ? 'rate_limited' as const : result.success ? 'success' as const : 'error' as const,
  };

  const dk = config.notify?.dingtalk;
  if (dk?.enabled && dk?.token) {
    try {
      const r = await sendDingtalkNotify(dk.token, payload);
      if (!r.ok) await logger.error(`DingTalk notification failed: ${r.error}`);
    } catch (e) {
      await logger.error(`DingTalk notification failed: ${(e as Error).message}`);
    }
  }

  const fs = config.notify?.feishu;
  if (fs?.enabled && fs?.token) {
    try {
      const r = await sendFeishuNotify(fs.token, payload);
      if (!r.ok) await logger.error(`Feishu notification failed: ${r.error}`);
    } catch (e) {
      await logger.error(`Feishu notification failed: ${(e as Error).message}`);
    }
  }
}

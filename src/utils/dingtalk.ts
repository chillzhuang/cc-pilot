/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import dayjs from 'dayjs';

// ─── DingTalk Webhook Utility ───────────────────────────

const DINGTALK_API = 'https://oapi.dingtalk.com/robot/send?access_token=';

interface TaskNotifyPayload {
  taskName: string;
  prompt: string;
  time: string;
  model: string;
  response: string;
  duration: number;
  tokens: number;
  status: 'success' | 'error' | 'rate_limited';
}

interface SendResult {
  ok: boolean;
  error?: string;
}

async function sendMarkdown(token: string, title: string, text: string): Promise<SendResult> {
  try {
    const resp = await fetch(`${DINGTALK_API}${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { title, text },
      }),
    });
    const data = await resp.json() as { errcode?: number; errmsg?: string };
    if (data.errcode === 0) return { ok: true };
    return { ok: false, error: data.errmsg ?? `errcode=${data.errcode}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n\n......';
}

export async function sendTestNotification(token: string): Promise<SendResult> {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const text = [
    '## 🔔 CC-PILOT · Test',
    '',
    'DingTalk notification is working!',
    '',
    `**Time** ${now}`,
    '',
    '---',
    '',
    '> *CC-PILOT · Claude Code Auto Pilot*',
  ].join('\n');

  return sendMarkdown(token, 'CC-PILOT Test', text);
}

const STATUS_HEADER: Record<string, { icon: string; label: string }> = {
  success: { icon: '✅', label: 'Task Complete' },
  error: { icon: '❌', label: 'Task Failed' },
  rate_limited: { icon: '⚠️', label: 'Rate Limited' },
};

export async function sendTaskNotification(token: string, payload: TaskNotifyPayload): Promise<SendResult> {
  const response = truncate(payload.response, 2000);
  const { icon, label } = STATUS_HEADER[payload.status] ?? STATUS_HEADER.success;

  const text = [
    `## ${icon} CC-PILOT · ${label}`,
    '',
    `**📋 Task** ${payload.taskName}`,
    '',
    `**💬 Prompt**`,
    '',
    payload.prompt,
    '',
    `**🕐 Time** ${payload.time}`,
    '',
    `**🤖 Model** ${payload.model}`,
    '',
    `**⏱ Duration** ${formatDuration(payload.duration)} · **📊 Tokens** ${formatTokens(payload.tokens)}`,
    '',
    '---',
    '',
    '**📝 Response**',
    '',
    response,
    '',
    '---',
    '',
    '> *CC-PILOT · Claude Code Auto Pilot*',
  ].join('\n');

  return sendMarkdown(token, `CC-PILOT · ${payload.taskName}`, text);
}

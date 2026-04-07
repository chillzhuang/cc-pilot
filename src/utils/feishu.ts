/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import dayjs from 'dayjs';

// ─── Feishu Webhook Utility (Rich Text Post) ───────────

const FEISHU_API = 'https://open.feishu.cn/open-apis/bot/v2/hook/';

interface SendResult {
  ok: boolean;
  error?: string;
}

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

type PostElement = { tag: 'text'; text: string } | { tag: 'a'; text: string; href: string };
type PostLine = PostElement[];

async function sendPost(token: string, title: string, lines: PostLine[]): Promise<SendResult> {
  try {
    const resp = await fetch(`${FEISHU_API}${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'post',
        content: {
          post: {
            zh_cn: { title, content: lines },
          },
        },
      }),
    });
    const data = await resp.json() as { code?: number; msg?: string };
    if (data.code === 0) return { ok: true };
    return { ok: false, error: data.msg ?? `code=${data.code}` };
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
  return text.slice(0, max) + '\n......';
}

function text(s: string): PostElement {
  return { tag: 'text', text: s };
}

export async function sendTestNotification(token: string): Promise<SendResult> {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  return sendPost(token, '🔔 CC-PILOT · Test', [
    [text('Feishu notification is working!\n')],
    [text(`🕐 Time  ${now}\n`)],
    [text('━━━━━━━━━━━━━━━━━━━━\n')],
    [text('CC-PILOT · Claude Code Auto Pilot')],
  ]);
}

const STATUS_HEADER: Record<string, { icon: string; label: string }> = {
  success: { icon: '✅', label: 'Task Complete' },
  error: { icon: '❌', label: 'Task Failed' },
  rate_limited: { icon: '⚠️', label: 'Rate Limited' },
};

export async function sendTaskNotification(token: string, payload: TaskNotifyPayload): Promise<SendResult> {
  const response = truncate(payload.response, 2000);
  const { icon, label } = STATUS_HEADER[payload.status] ?? STATUS_HEADER.success;

  return sendPost(token, `${icon} CC-PILOT · ${label}`, [
    [text(`📋 Task  ${payload.taskName}\n`)],
    [text(`💬 Prompt\n`)],
    [text(`${payload.prompt}\n`)],
    [text('\n')],
    [text(`🕐 Time  ${payload.time}\n`)],
    [text(`🤖 Model  ${payload.model}\n`)],
    [text(`⏱ Duration  ${formatDuration(payload.duration)}  ·  📊 Tokens  ${formatTokens(payload.tokens)}\n`)],
    [text('━━━━━━━━━━━━━━━━━━━━\n')],
    [text(`📝 Response\n`)],
    [text(`${response}\n`)],
    [text('━━━━━━━━━━━━━━━━━━━━\n')],
    [text('CC-PILOT · Claude Code Auto Pilot')],
  ]);
}

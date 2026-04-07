/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── Borderless Cyberpunk UI Rendering ──────────────────
import { T, gradient } from './theme.js';

// ─── Section: decorated header + content ────────────────
//
//  ━━━ TITLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  content line 1
//  content line 2
//

export function renderSection(title: string, content: string[]): string {
  const lines: string[] = [];
  const line = T.sectionChar.repeat(3);
  lines.push(`  ${T.primary(line)} ${T.secondary(title)} ${T.primary(T.sectionChar.repeat(35))}`);
  for (const c of content) {
    lines.push(`  ${c}`);
  }
  return lines.join('\n');
}

// ─── Panel: bullet header + content ─────────────────────
//
//  ▸ TITLE
//    content line 1
//    content line 2
//

export function renderPanel(title: string, content: string[]): string {
  const lines: string[] = [];
  lines.push(`  ${T.primary(T.bullet)} ${T.secondary(title)}`);
  for (const c of content) {
    lines.push(`    ${c}`);
  }
  return lines.join('\n');
}

// ─── Progress Bar ───────────────────────────────────────

export function renderProgress(
  current: number,
  total: number,
  width: number = 20,
): string {
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const pct = Math.round(ratio * 100);

  return `${T.primary(T.bar.repeat(filled))}${T.dim(T.emptyBar.repeat(empty))} ${T.text(String(pct) + '%')}`;
}

// ─── Menu Item ──────────────────────────────────────────

export function renderMenuItem(
  index: number | string,
  label: string,
  desc: string,
): string {
  const idx = T.accent(`[${index}]`);
  const lbl = T.bold(label);
  const dsc = T.dim(`${T.separator}${T.separator} ${desc}`);
  return `  ${idx} ${lbl}  ${dsc}`;
}

// ─── Category Header ────────────────────────────────────

export function renderCategory(label: string): string {
  return `  ${T.primary(T.bullet)} ${T.secondary(label)} ${T.dim(T.separator.repeat(35))}`;
}

// ─── Input Prompt ───────────────────────────────────────

export function renderInputPrompt(): string {
  return `  ${gradient('\u2591\u2592\u2593 INPUT \u2593\u2592\u2591')}  `;
}

// ─── Status Line ────────────────────────────────────────

export function renderStatusLine(label: string, val: string): string {
  return `${T.dim(label)}  ${T.value(val)}`;
}

// ─── Separator Line ─────────────────────────────────────

export function renderSeparator(): string {
  return `  ${T.dim(T.separator.repeat(45))}`;
}

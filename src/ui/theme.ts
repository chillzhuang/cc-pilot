/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── Theme System ───────────────────────────────────────
import chalk from 'chalk';

// ─── Theme Interface ────────────────────────────────────

export interface Theme {
  name: string;
  primary: (s: string) => string;
  secondary: (s: string) => string;
  accent: (s: string) => string;
  dim: (s: string) => string;
  text: (s: string) => string;
  value: (s: string) => string;
  success: (s: string) => string;
  error: (s: string) => string;
  warn: (s: string) => string;
  bold: (s: string) => string;
  sectionChar: string;
  separator: string;
  bullet: string;
  dot: string;
  dotEmpty: string;
  bar: string;
  emptyBar: string;
}

export type ThemeName = 'neon' | 'mono' | 'matrix' | 'classic' | 'vapor';

// ─── Theme Definitions ─────────────────────────────────

const THEMES: Record<ThemeName, Theme> = {
  mono: {
    name: 'Monochrome',
    primary: chalk.white.bold,
    secondary: chalk.gray,
    accent: chalk.white,
    dim: chalk.dim,
    text: chalk.white,
    value: chalk.blue,
    success: chalk.green.bold,
    error: chalk.red.bold,
    warn: chalk.yellow,
    bold: chalk.bold,
    sectionChar: '\u2500', // ─
    separator: '\u2500',   // ─
    bullet: '\u25B8',      // ▸
    dot: '\u25CF',         // ●
    dotEmpty: '\u25CB',    // ○
    bar: '\u2588',         // █
    emptyBar: '\u2591',    // ░
  },

  neon: {
    name: 'Neon Cyberpunk',
    primary: chalk.rgb(0, 255, 255),
    secondary: chalk.rgb(255, 0, 255).bold,
    accent: chalk.rgb(255, 215, 0),
    dim: chalk.dim,
    text: chalk.white,
    value: chalk.white,
    success: chalk.rgb(57, 255, 20).bold,
    error: chalk.red.bold,
    warn: chalk.yellow,
    bold: chalk.bold,
    sectionChar: '\u2501', // ━
    separator: '\u2500',   // ─
    bullet: '\u25B8',      // ▸
    dot: '\u25CF',         // ●
    dotEmpty: '\u25CB',    // ○
    bar: '\u2588',         // █
    emptyBar: '\u2591',    // ░
  },

  matrix: {
    name: 'Matrix',
    primary: chalk.rgb(0, 255, 65).bold,
    secondary: chalk.rgb(0, 200, 50),
    accent: chalk.rgb(0, 255, 65),
    dim: chalk.rgb(0, 100, 30),
    text: chalk.rgb(0, 220, 55),
    value: chalk.rgb(0, 220, 55),
    success: chalk.rgb(0, 255, 65).bold,
    error: chalk.rgb(255, 50, 50),
    warn: chalk.rgb(0, 255, 65),
    bold: chalk.rgb(0, 255, 65).bold,
    sectionChar: '\u2501', // ━
    separator: '\u2500',   // ─
    bullet: '>',
    dot: '[*]',
    dotEmpty: '[ ]',
    bar: '#',
    emptyBar: '.',
  },

  classic: {
    name: 'Classic',
    primary: (s: string) => s,
    secondary: (s: string) => s,
    accent: (s: string) => s,
    dim: chalk.dim,
    text: (s: string) => s,
    value: (s: string) => s,
    success: (s: string) => s,
    error: (s: string) => s,
    warn: (s: string) => s,
    bold: chalk.bold,
    sectionChar: '-',
    separator: '-',
    bullet: '>',
    dot: '*',
    dotEmpty: 'o',
    bar: '#',
    emptyBar: '-',
  },

  vapor: {
    name: 'Vaporwave',
    primary: chalk.rgb(255, 113, 206).bold,
    secondary: chalk.rgb(185, 103, 255),
    accent: chalk.rgb(1, 205, 254),
    dim: chalk.rgb(100, 80, 120),
    text: chalk.rgb(200, 180, 255),
    value: chalk.rgb(1, 205, 254),
    success: chalk.rgb(5, 255, 161).bold,
    error: chalk.rgb(255, 80, 100),
    warn: chalk.rgb(255, 200, 100),
    bold: chalk.rgb(255, 113, 206).bold,
    sectionChar: '\u2501', // ━
    separator: '\u2500',   // ─
    bullet: '\u25C6',      // ◆
    dot: '\u25CF',         // ●
    dotEmpty: '\u25CB',    // ○
    bar: '\u2588',         // █
    emptyBar: '\u2591',    // ░
  },
};

// ─── Current Theme ──────────────────────────────────────

let current: Theme = THEMES.mono;

export function setTheme(name: ThemeName): void {
  current = THEMES[name] ?? THEMES.neon;
}

export function getTheme(): Theme {
  return current;
}

export function getThemeName(): ThemeName {
  for (const [name, theme] of Object.entries(THEMES)) {
    if (theme === current) return name as ThemeName;
  }
  return 'neon';
}

export function getAllThemes(): Array<{ name: ThemeName; label: string }> {
  return Object.entries(THEMES).map(([name, theme]) => ({
    name: name as ThemeName,
    label: theme.name,
  }));
}

// ─── Shortcut Accessors (use current theme) ─────────────

export const T = {
  get primary() { return current.primary; },
  get secondary() { return current.secondary; },
  get accent() { return current.accent; },
  get dim() { return current.dim; },
  get text() { return current.text; },
  get value() { return current.value; },
  get success() { return current.success; },
  get error() { return current.error; },
  get warn() { return current.warn; },
  get bold() { return current.bold; },
  get sectionChar() { return current.sectionChar; },
  get separator() { return current.separator; },
  get bullet() { return current.bullet; },
  get dot() { return current.dot; },
  get dotEmpty() { return current.dotEmpty; },
  get bar() { return current.bar; },
  get emptyBar() { return current.emptyBar; },
};

// ─── Gradient (neon/vapor only, others passthrough) ─────

export function gradient(text: string): string {
  if (current === THEMES.classic || current === THEMES.mono) {
    return current.bold(text);
  }
  const from = current === THEMES.vapor
    ? { r: 255, g: 113, b: 206 }
    : current === THEMES.matrix
      ? { r: 0, g: 255, b: 65 }
      : { r: 0, g: 255, b: 255 };
  const to = current === THEMES.vapor
    ? { r: 1, g: 205, b: 254 }
    : current === THEMES.matrix
      ? { r: 0, g: 180, b: 45 }
      : { r: 255, g: 0, b: 255 };

  return [...text].map((char, i) => {
    if (char === ' ') return char;
    const t = text.length === 1 ? 0 : i / (text.length - 1);
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    return chalk.rgb(r, g, b)(char);
  }).join('');
}

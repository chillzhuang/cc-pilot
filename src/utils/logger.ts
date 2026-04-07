/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import dayjs from 'dayjs';
import { LOG_DIR } from './paths.js';

export class Logger {
  private logDir: string;
  private dirEnsured = false;

  constructor(logDir: string) {
    this.logDir = logDir;
  }

  private async ensureDir(): Promise<void> {
    if (!this.dirEnsured) {
      await mkdir(this.logDir, { recursive: true });
      this.dirEnsured = true;
    }
  }

  private logFile(): string {
    return join(this.logDir, `${dayjs().format('YYYY-MM-DD')}.log`);
  }

  private formatLine(level: string, message: string): string {
    const ts = dayjs().format('HH:mm:ss');
    return `${ts} \u25B8 ${level}  ${message}\n`;
  }

  async info(message: string): Promise<void> {
    await this.ensureDir();
    const line = this.formatLine('INFO', message);
    await appendFile(this.logFile(), line, 'utf-8');
  }

  async error(message: string): Promise<void> {
    await this.ensureDir();
    const line = this.formatLine('ERROR', message);
    await appendFile(this.logFile(), line, 'utf-8');
  }

  async execution(
    taskName: string,
    status: string,
    duration: number,
    tokens?: number,
  ): Promise<void> {
    await this.ensureDir();
    const ts = dayjs().format('HH:mm:ss');
    const tokensStr = tokens !== undefined ? ` tokens=${tokens}` : '';
    const line = `${ts} \u25B8 EXEC  task=${taskName} status=${status} duration=${duration}ms${tokensStr}\n`;
    await appendFile(this.logFile(), line, 'utf-8');
  }
}

export const logger = new Logger(LOG_DIR);

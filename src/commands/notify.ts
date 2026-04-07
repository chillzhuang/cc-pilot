/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { loadConfig, saveConfig, configExists } from '../core/config.js';
import { renderSection } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import { sendTestNotification as sendDingtalkTest } from '../utils/dingtalk.js';
import { sendTestNotification as sendFeishuTest } from '../utils/feishu.js';

function maskToken(token: string): string {
  if (!token || token.length < 8) return '****';
  return '****' + token.slice(-6);
}

/** Calculate display width (CJK chars count as 2) */
function displayWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    w += ch.charCodeAt(0) > 0x7F ? 2 : 1;
  }
  return w;
}

/** Pad string to target display width (CJK-aware) */
function padLabel(str: string, width: number): string {
  return str + ' '.repeat(Math.max(0, width - displayWidth(str)));
}

export async function dingtalkCommand(): Promise<void> {
  if (!configExists()) return;

  while (true) {
    // Reload config each iteration to get fresh state
    const config = await loadConfig();
    const dk = config.notify.dingtalk;

    // Show current status
    const statusIcon = dk.enabled ? T.success('●') : T.error('○');
    const statusText = dk.enabled ? T.success(t('notify.enabled')) : T.dim(t('notify.disabled'));
    const tokenText = dk.token ? `${T.success('✓')} ${t('notify.tokenSet')} ${T.dim(`(${maskToken(dk.token)})`)}` : `${T.error('✗')} ${t('notify.tokenNotSet')}`;

    console.log('');
    console.log(renderSection(`▸ ${t('notify.configTitle')}`, [
      '',
      `  ${T.dim(padLabel(t('notify.status'), 10))}${statusIcon} ${statusText}`,
      `  ${T.dim(padLabel('Token', 10))}${tokenText}`,
      '',
    ]));
    console.log('');

    // Dynamic toggle label based on current state
    const toggleLabel = dk.enabled ? t('notify.disableAction') : t('notify.enableAction');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: t('notify.actionSelect'),
      choices: [
        { name: t('notify.setToken'), value: 'token' },
        { name: toggleLabel, value: 'toggle' },
        { name: t('notify.sendTest'), value: 'test' },
        { name: t('common.back'), value: 'back' },
      ],
    }]);

    if (action === 'back') return;

    if (action === 'token') {
      const { token } = await inquirer.prompt([{
        type: 'input',
        name: 'token',
        message: t('notify.tokenPrompt'),
        default: dk.token || undefined,
      }]);
      config.notify.dingtalk.token = token.trim();
      if (token.trim() && !dk.enabled) {
        config.notify.dingtalk.enabled = true;
      }
      await saveConfig(config);
      console.log(T.success(`  ✓ ${t('notify.tokenSaved')}`));
      if (config.notify.dingtalk.enabled) {
        console.log(T.success(`  ✓ ${t('notify.enabled')}`));
      }
    }

    if (action === 'toggle') {
      if (!dk.token) {
        console.log(T.error(`  ✗ ${t('notify.notConfigured')}`));
        continue;
      }
      config.notify.dingtalk.enabled = !dk.enabled;
      await saveConfig(config);
      const msg = config.notify.dingtalk.enabled ? t('notify.enabled') : t('notify.disabled');
      console.log(T.success(`  ✓ ${msg}`));
    }

    if (action === 'test') {
      if (!dk.token) {
        console.log(T.error(`  ✗ ${t('notify.notConfigured')}`));
        continue;
      }
      console.log(T.dim(`  ${t('notify.testSending')}`));
      const result = await sendDingtalkTest(dk.token);
      if (result.ok) {
        console.log(T.success(`  ✓ ${t('notify.testSuccess')}`));
      } else {
        console.log(T.error(`  ✗ ${t('notify.testFail')}`));
        if (result.error) {
          console.log(T.dim(`    ${result.error}`));
        }
      }
    }

    // Brief pause before looping back to submenu
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ─── Feishu Command ─────────────────────────────────────

export async function feishuCommand(): Promise<void> {
  if (!configExists()) return;

  while (true) {
    const config = await loadConfig();
    const fs = config.notify.feishu;

    const statusIcon = fs.enabled ? T.success('●') : T.error('○');
    const statusText = fs.enabled ? T.success(t('notify.enabled')) : T.dim(t('notify.disabled'));
    const tokenText = fs.token ? `${T.success('✓')} ${t('notify.tokenSet')} ${T.dim(`(${maskToken(fs.token)})`)}` : `${T.error('✗')} ${t('notify.tokenNotSet')}`;

    console.log('');
    console.log(renderSection(`▸ ${t('notify.feishuConfigTitle')}`, [
      '',
      `  ${T.dim(padLabel(t('notify.status'), 10))}${statusIcon} ${statusText}`,
      `  ${T.dim(padLabel('Hook ID', 10))}${tokenText}`,
      '',
    ]));
    console.log('');

    const toggleLabel = fs.enabled ? t('notify.disableAction') : t('notify.enableAction');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: t('notify.actionSelect'),
      choices: [
        { name: t('notify.setToken'), value: 'token' },
        { name: toggleLabel, value: 'toggle' },
        { name: t('notify.sendTest'), value: 'test' },
        { name: t('common.back'), value: 'back' },
      ],
    }]);

    if (action === 'back') return;

    if (action === 'token') {
      const { token } = await inquirer.prompt([{
        type: 'input',
        name: 'token',
        message: t('notify.feishuTokenPrompt'),
        default: fs.token || undefined,
      }]);
      config.notify.feishu.token = token.trim();
      if (token.trim() && !fs.enabled) {
        config.notify.feishu.enabled = true;
      }
      await saveConfig(config);
      console.log(T.success(`  ✓ ${t('notify.tokenSaved')}`));
      if (config.notify.feishu.enabled) {
        console.log(T.success(`  ✓ ${t('notify.enabled')}`));
      }
    }

    if (action === 'toggle') {
      if (!fs.token) {
        console.log(T.error(`  ✗ ${t('notify.notConfigured')}`));
        continue;
      }
      config.notify.feishu.enabled = !fs.enabled;
      await saveConfig(config);
      const msg = config.notify.feishu.enabled ? t('notify.enabled') : t('notify.disabled');
      console.log(T.success(`  ✓ ${msg}`));
    }

    if (action === 'test') {
      if (!fs.token) {
        console.log(T.error(`  ✗ ${t('notify.notConfigured')}`));
        continue;
      }
      console.log(T.dim(`  ${t('notify.testSending')}`));
      const result = await sendFeishuTest(fs.token);
      if (result.ok) {
        console.log(T.success(`  ✓ ${t('notify.testSuccess')}`));
      } else {
        console.log(T.error(`  ✗ ${t('notify.testFail')}`));
        if (result.error) {
          console.log(T.dim(`    ${result.error}`));
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

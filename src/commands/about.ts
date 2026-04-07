/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { renderSection, renderSeparator } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';

export async function aboutCommand(): Promise<void> {
  const w = T.separator.repeat(45);

  console.log('');
  console.log(renderSection('CC-PILOT', [
    '',
    `${T.bold('Claude Code Auto Pilot')}`,
    `${T.dim('Cyberpunk-styled intelligent conversation scheduler')}`,
    '',
    `${T.dim(t('menu.aboutAuthor'))}   ${T.value('BladeX')} ${T.dim('(bladejava@qq.com)')}`,
    `${T.dim(t('menu.aboutWebsite'))}   ${T.value('https://sns.bladex.cn')}`,
    `${T.dim('GitHub')}   ${T.value('https://github.com/chillzhuang/cc-pilot')}`,
    `${T.dim('npm')}      ${T.value('@springblade/cc-pilot')}`,
  ]));

  console.log('');
  console.log(renderSection('BladeX', [
    '',
    `${T.primary(T.bullet)} ${T.bold('BladeX Microservices')}`,
    `  ${T.text(t('menu.aboutBlade'))}`,
    '',
    `${T.primary(T.bullet)} ${T.bold('BladeX AI')}`,
    `  ${T.text(t('menu.aboutBladeAI'))}`,
    '',
    `${T.primary(T.bullet)} ${T.bold('BladeX IoT')}`,
    `  ${T.text(t('menu.aboutBladeIoT'))}`,
    '',
    `${T.primary(T.bullet)} ${T.bold('BladeX DataScreen')}`,
    `  ${T.text(t('menu.aboutBladeScreen'))}`,
  ]));

  console.log('');
}

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
    `${T.dim('Author'.padEnd(10))}${T.value('BladeX')} ${T.dim('(bladejava@qq.com)')}`,
    `${T.dim('Website'.padEnd(10))}${T.value('https://bladex.cn')}`,
    `${T.dim('GitHub'.padEnd(10))}${T.value('https://github.com/chillzhuang/cc-pilot')}`,
    `${T.dim('npm'.padEnd(10))}${T.value('@springblade/cc-pilot')}`,
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
    `${T.primary(T.bullet)} ${T.bold('BladeX Links')}`,
    `  ${T.text(t('menu.aboutBladeLinks'))}`,
    '',
    `${T.primary(T.bullet)} ${T.bold('BladeX Data')}`,
    `  ${T.text(t('menu.aboutBladeData'))}`,
  ]));

  console.log('');
}

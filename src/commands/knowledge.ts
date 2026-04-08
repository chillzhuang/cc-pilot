/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../core/config.js';
import { loadState, saveState } from '../core/state.js';
import { getBuiltinCategoryIds } from '../core/knowledge.js';
import { safePrompt } from '../ui/prompt.js';
import { renderSection } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import type { CustomCategory } from '../types.js';

// ─── Category label helpers ─────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  tech: 'catTech',
  english: 'catEnglish',
  medical: 'catMedical',
  legal: 'catLegal',
  psychology: 'catPsychology',
};

const CATEGORY_DESCS: Record<string, string> = {
  tech: 'catTechDesc',
  english: 'catEnglishDesc',
  medical: 'catMedicalDesc',
  legal: 'catLegalDesc',
  psychology: 'catPsychologyDesc',
};

function getCategoryLabel(id: string, customs: CustomCategory[]): string {
  if (CATEGORY_LABELS[id]) return t(`knowledge.${CATEGORY_LABELS[id]}`);
  const custom = customs.find(c => c.id === id);
  return custom ? custom.name : id;
}

function getCategoryDesc(id: string, customs: CustomCategory[]): string {
  if (CATEGORY_DESCS[id]) return t(`knowledge.${CATEGORY_DESCS[id]}`);
  const custom = customs.find(c => c.id === id);
  return custom ? custom.description : '';
}

// ─── Main Command ───────────────────────────────────────

export async function knowledgeCommand(): Promise<void> {
  const r = await safePrompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: t('knowledge.actionSelect'),
    choices: [
      { name: t('knowledge.selectCategories'), value: 'select' },
      { name: t('knowledge.manageCustom'), value: 'custom' },
      { name: t('knowledge.resetProgress'), value: 'reset' },
      { name: t('common.back'), value: 'back' },
    ],
  }]);
  if (!r || r.action === 'back') return;

  if (r.action === 'select') {
    await selectCategories();
  } else if (r.action === 'custom') {
    await manageCustomCategories();
  } else if (r.action === 'reset') {
    await resetProgress();
  }
}

// ─── Select Categories ──────────────────────────────────

async function selectCategories(): Promise<void> {
  const config = await loadConfig();
  const builtinIds = getBuiltinCategoryIds();
  const allIds = [...builtinIds, ...config.global.customCategories.map(c => c.id)];

  const choices = allIds.map(id => ({
    name: `${getCategoryLabel(id, config.global.customCategories)}  ${T.dim(`── ${getCategoryDesc(id, config.global.customCategories)}`)}`,
    value: id,
    checked: config.global.knowledgeCategories.includes(id),
  }));

  const r = await safePrompt<{ selected: string[] }>([{
    type: 'checkbox',
    name: 'selected',
    message: t('knowledge.selectCategories'),
    choices,
    validate: (input: string[]) => input.length > 0 || t('knowledge.minOneCategory'),
  }]);
  if (!r) return;

  config.global.knowledgeCategories = r.selected;
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.categoriesSaved')}`));
}

// ─── Manage Custom Categories ───────────────────────────

async function manageCustomCategories(): Promise<void> {
  const config = await loadConfig();

  // Show current customs
  if (config.global.customCategories.length > 0) {
    const rows = config.global.customCategories.map(c =>
      `  ${T.accent(c.id)}  ${T.text(c.name)}  ${T.dim(c.description)}`,
    );
    console.log(renderSection('CUSTOM CATEGORIES', rows));
  } else {
    console.log(T.dim(`  ${t('knowledge.noCustom')}`));
  }

  const r = await safePrompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: t('knowledge.actionSelect'),
    choices: [
      { name: t('knowledge.addCustom'), value: 'add' },
      ...(config.global.customCategories.length > 0
        ? [{ name: t('knowledge.removeCustom'), value: 'remove' }]
        : []),
      { name: t('common.back'), value: 'back' },
    ],
  }]);
  if (!r || r.action === 'back') return;

  if (r.action === 'add') {
    await addCustomCategory();
  } else if (r.action === 'remove') {
    await removeCustomCategory();
  }
}

async function addCustomCategory(): Promise<void> {
  const config = await loadConfig();
  const builtinIds = new Set(getBuiltinCategoryIds());
  const existingIds = new Set(config.global.customCategories.map(c => c.id));

  const r1 = await safePrompt<{ id: string }>([{
    type: 'input',
    name: 'id',
    message: t('knowledge.customId'),
    validate: (input: string) => {
      const slug = input.trim().toLowerCase();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return 'ID must be lowercase alphanumeric with hyphens';
      if (builtinIds.has(slug)) return `"${slug}" is a built-in category`;
      if (existingIds.has(slug)) return `"${slug}" already exists`;
      return true;
    },
    filter: (input: string) => input.trim().toLowerCase(),
  }]);
  if (!r1) return;

  const r2 = await safePrompt<{ name: string }>([{
    type: 'input',
    name: 'name',
    message: t('knowledge.customName'),
  }]);
  if (!r2) return;

  const r3 = await safePrompt<{ description: string }>([{
    type: 'input',
    name: 'description',
    message: t('knowledge.customDesc'),
  }]);
  if (!r3) return;

  const { id } = r1;
  const { name } = r2;
  const { description } = r3;
  config.global.customCategories.push({ id, name, description });
  // Auto-enable the new category
  if (!config.global.knowledgeCategories.includes(id)) {
    config.global.knowledgeCategories.push(id);
  }
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.customAdded')}: ${name}`));
}

async function removeCustomCategory(): Promise<void> {
  const config = await loadConfig();

  const r = await safePrompt<{ id: string }>([{
    type: 'list',
    name: 'id',
    message: t('knowledge.removeCustom'),
    choices: config.global.customCategories.map(c => ({
      name: `${c.name}  ${T.dim(c.description)}`,
      value: c.id,
    })),
  }]);
  if (!r) return;

  config.global.customCategories = config.global.customCategories.filter(c => c.id !== r.id);
  config.global.knowledgeCategories = config.global.knowledgeCategories.filter(k => k !== r.id);
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.customRemoved')}`));
}

// ─── Reset Progress ─────────────────────────────────────

async function resetProgress(): Promise<void> {
  const r = await safePrompt<{ confirm: boolean }>([{
    type: 'confirm',
    name: 'confirm',
    message: t('knowledge.resetConfirm'),
    default: false,
  }]);
  if (!r || !r.confirm) return;

  const state = await loadState();
  state.knowledge = { categories: {} };
  await saveState(state);
  console.log(T.success(`  ✓ ${t('knowledge.resetDone')}`));
}

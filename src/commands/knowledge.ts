/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { loadConfig, saveConfig } from '../core/config.js';
import { loadState, saveState } from '../core/state.js';
import { getBuiltinCategoryIds } from '../core/knowledge.js';
import { selectPrompt, checkboxPrompt, safePrompt, BACK } from '../ui/prompt.js';
import { renderSection } from '../ui/render.js';
import { T } from '../ui/theme.js';
import { t } from '../i18n/index.js';
import type { CustomCategory } from '../types.js';

// ─── Category label helpers ─────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  rapid: 'catRapid',
  tech: 'catTech', english: 'catEnglish', medical: 'catMedical',
  legal: 'catLegal', psychology: 'catPsychology', history: 'catHistory',
};

const CATEGORY_DESCS: Record<string, string> = {
  rapid: 'catRapidDesc',
  tech: 'catTechDesc', english: 'catEnglishDesc', medical: 'catMedicalDesc',
  legal: 'catLegalDesc', psychology: 'catPsychologyDesc', history: 'catHistoryDesc',
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
  const action = await selectPrompt<string>({
    message: t('knowledge.actionSelect'),
    choices: [
      { name: t('knowledge.selectCategories'), value: 'select' },
      { name: t('knowledge.manageCustom'), value: 'custom' },
      { name: t('knowledge.resetProgress'), value: 'reset' },
    ],
  });
  if (action === BACK) return;

  if (action === 'select') await selectCategories();
  else if (action === 'custom') await manageCustomCategories();
  else if (action === 'reset') await resetProgress();
}

// ─── Select Categories ──────────────────────────────────

async function selectCategories(): Promise<void> {
  const config = await loadConfig();
  const builtinIds = getBuiltinCategoryIds();
  const allIds = [...builtinIds, ...config.global.customCategories.map(c => c.id)];

  const selected = await checkboxPrompt<string>({
    message: t('knowledge.selectCategories'),
    choices: allIds.map(id => ({
      name: `${getCategoryLabel(id, config.global.customCategories)}  ${T.dim(`── ${getCategoryDesc(id, config.global.customCategories)}`)}`,
      value: id,
      checked: config.global.knowledgeCategories.includes(id),
    })),
    validate: (input: string[]) => input.length > 0 || t('knowledge.minOneCategory'),
  });
  if (selected === BACK) return;

  config.global.knowledgeCategories = selected;
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.categoriesSaved')}`));
}

// ─── Manage Custom Categories ───────────────────────────

async function manageCustomCategories(): Promise<void> {
  const config = await loadConfig();

  if (config.global.customCategories.length > 0) {
    const rows = config.global.customCategories.map(c =>
      `  ${T.accent(c.id)}  ${T.text(c.name)}  ${T.dim(c.description)}`,
    );
    console.log(renderSection('CUSTOM CATEGORIES', rows));
  } else {
    console.log(T.dim(`  ${t('knowledge.noCustom')}`));
  }

  const action = await selectPrompt<string>({
    message: t('knowledge.actionSelect'),
    choices: [
      { name: t('knowledge.addCustom'), value: 'add' },
      ...(config.global.customCategories.length > 0
        ? [{ name: t('knowledge.removeCustom'), value: 'remove' }]
        : []),
    ],
  });
  if (action === BACK) return;

  if (action === 'add') await addCustomCategory();
  else if (action === 'remove') await removeCustomCategory();
}

async function addCustomCategory(): Promise<void> {
  const config = await loadConfig();
  const builtinIds = new Set(getBuiltinCategoryIds());
  const existingIds = new Set(config.global.customCategories.map(c => c.id));

  const r1 = await safePrompt<{ id: string }>([{
    type: 'input', name: 'id', message: t('knowledge.customId'),
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

  const r2 = await safePrompt<{ name: string }>([{ type: 'input', name: 'name', message: t('knowledge.customName') }]);
  if (!r2) return;

  const r3 = await safePrompt<{ description: string }>([{ type: 'input', name: 'description', message: t('knowledge.customDesc') }]);
  if (!r3) return;

  config.global.customCategories.push({ id: r1.id, name: r2.name, description: r3.description });
  if (!config.global.knowledgeCategories.includes(r1.id)) {
    config.global.knowledgeCategories.push(r1.id);
  }
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.customAdded')}: ${r2.name}`));
}

async function removeCustomCategory(): Promise<void> {
  const config = await loadConfig();

  const id = await selectPrompt<string>({
    message: t('knowledge.removeCustom'),
    choices: config.global.customCategories.map(c => ({
      name: `${c.name}  ${T.dim(c.description)}`,
      value: c.id,
    })),
  });
  if (id === BACK) return;

  config.global.customCategories = config.global.customCategories.filter(c => c.id !== id);
  config.global.knowledgeCategories = config.global.knowledgeCategories.filter(k => k !== id);
  await saveConfig(config);
  console.log(T.success(`  ✓ ${t('knowledge.customRemoved')}`));
}

// ─── Reset Progress ─────────────────────────────────────

async function resetProgress(): Promise<void> {
  const r = await safePrompt<{ confirm: boolean }>([{
    type: 'confirm', name: 'confirm', message: t('knowledge.resetConfirm'), default: false,
  }]);
  if (!r || !r.confirm) return;

  const state = await loadState();
  state.knowledge = { categories: {} };
  await saveState(state);
  console.log(T.success(`  ✓ ${t('knowledge.resetDone')}`));
}

/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import type { Locale, CustomCategory, KnowledgeState } from '../types.js';
import { pickKnowledgePrompt } from './knowledge.js';

// ─── Dynamic Prompt Generator ──────────────────────────
// Template + variable pool = massive combinatorial variety.
// ~1,400+ unique prompts per locale, zero code/file generation risk.

// ─── Templates ─────────────────────────────────────────
// {A} = single topic, {A}/{B} = comparison pair

const TEMPLATES: Record<Locale, { single: string[]; pair: string[] }> = {
  zh: {
    single: [
      '简单介绍下 {A}',
      '用一句话解释下 {A}',
      '{A} 有什么优缺点？',
      '什么场景下适合用 {A}？',
      '{A} 的核心原理是什么？',
      '关于 {A} 有什么有趣的小知识？',
      '{A} 是怎么诞生的？',
      '你觉得 {A} 未来会怎么发展？',
      '关于 {A} 最常见的误解是什么？',
      '学 {A} 最重要的是理解什么？',
      '{A} 这个名字是怎么来的？',
      '如果要向新手解释 {A}，你会怎么说？',
    ],
    pair: [
      '{A} 和 {B} 的区别是什么？',
      '{A} 和 {B} 各适合什么场景？',
      '{A} 和 {B}，你更推荐哪个？',
      '从性能角度看，{A} 和 {B} 哪个更好？',
      '{A} 和 {B} 可以搭配使用吗？',
      '从 {A} 迁移到 {B} 需要注意什么？',
      '{A} 和 {B} 分别解决什么问题？',
      '只能选一个的话，{A} 还是 {B}？',
    ],
  },
  en: {
    single: [
      'Give a brief introduction to {A}.',
      'Explain {A} in one sentence.',
      'What are the pros and cons of {A}?',
      'When is {A} the right choice?',
      'What is the core principle behind {A}?',
      'Any fun facts about {A}?',
      'How was {A} created?',
      'How do you see {A} evolving in the future?',
      'What is the most common misconception about {A}?',
      'What is the key concept to grasp when learning {A}?',
      'How did {A} get its name?',
      'How would you explain {A} to a beginner?',
    ],
    pair: [
      'What is the difference between {A} and {B}?',
      'When should you use {A} vs {B}?',
      '{A} or {B} — which do you recommend?',
      'Performance-wise, how do {A} and {B} compare?',
      'Can {A} and {B} be used together?',
      'What should you watch out for when migrating from {A} to {B}?',
      'What problems do {A} and {B} each solve?',
      'If you could only pick one: {A} or {B}?',
    ],
  },
  ru: {
    single: [
      'Расскажи кратко о {A}.',
      'Объясни {A} одним предложением.',
      'Какие плюсы и минусы у {A}?',
      'В каких случаях лучше использовать {A}?',
      'Какой основной принцип у {A}?',
      'Есть интересные факты о {A}?',
      'Как появился {A}?',
      'Как будет развиваться {A} в будущем?',
      'Какое самое распространённое заблуждение о {A}?',
      'Что важнее всего понять при изучении {A}?',
      'Откуда название {A}?',
      'Как бы ты объяснил {A} новичку?',
    ],
    pair: [
      'В чём разница между {A} и {B}?',
      'Когда лучше использовать {A}, а когда {B}?',
      '{A} или {B} — что порекомендуешь?',
      'По производительности, {A} или {B}?',
      'Можно ли использовать {A} и {B} вместе?',
      'На что обратить внимание при миграции с {A} на {B}?',
      'Какие задачи решают {A} и {B}?',
      'Если бы можно было выбрать только одно: {A} или {B}?',
    ],
  },
  de: {
    single: [
      'Stelle {A} kurz vor.',
      'Erkläre {A} in einem Satz.',
      'Was sind die Vor- und Nachteile von {A}?',
      'Wann ist {A} die richtige Wahl?',
      'Was ist das Kernprinzip von {A}?',
      'Gibt es interessante Fakten über {A}?',
      'Wie ist {A} entstanden?',
      'Wie wird sich {A} in Zukunft entwickeln?',
      'Was ist das häufigste Missverständnis über {A}?',
      'Was ist das Wichtigste beim Erlernen von {A}?',
      'Woher kommt der Name {A}?',
      'Wie würdest du {A} einem Anfänger erklären?',
    ],
    pair: [
      'Was ist der Unterschied zwischen {A} und {B}?',
      'Wann sollte man {A} und wann {B} verwenden?',
      '{A} oder {B} — was empfiehlst du?',
      'Leistungsmäßig, wie schneiden {A} und {B} ab?',
      'Kann man {A} und {B} zusammen verwenden?',
      'Was ist bei der Migration von {A} zu {B} zu beachten?',
      'Welche Probleme lösen {A} und {B} jeweils?',
      'Wenn du nur eines wählen könntest: {A} oder {B}?',
    ],
  },
  fr: {
    single: [
      'Présente brièvement {A}.',
      'Explique {A} en une phrase.',
      'Quels sont les avantages et inconvénients de {A} ?',
      'Quand est-ce que {A} est le bon choix ?',
      'Quel est le principe fondamental de {A} ?',
      'Des anecdotes intéressantes sur {A} ?',
      'Comment {A} a-t-il été créé ?',
      'Comment vois-tu l\'avenir de {A} ?',
      'Quelle est l\'idée reçue la plus courante sur {A} ?',
      'Quel est le concept clé pour comprendre {A} ?',
      'D\'où vient le nom {A} ?',
      'Comment expliquerais-tu {A} à un débutant ?',
    ],
    pair: [
      'Quelle est la différence entre {A} et {B} ?',
      'Quand utiliser {A} et quand utiliser {B} ?',
      '{A} ou {B} — lequel recommandes-tu ?',
      'En termes de performance, {A} ou {B} ?',
      'Peut-on utiliser {A} et {B} ensemble ?',
      'Que faut-il savoir pour migrer de {A} vers {B} ?',
      'Quels problèmes {A} et {B} résolvent-ils ?',
      'Si tu ne pouvais en choisir qu\'un : {A} ou {B} ?',
    ],
  },
};

// ─── Tech Terms (universal, no translation) ────────────

const TOPICS: string[] = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
  'Kotlin', 'Swift', 'Ruby', 'PHP', 'Scala', 'Elixir', 'Dart', 'Lua',
  // Frontend
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
  'Tailwind CSS', 'Vite', 'Webpack',
  // Backend
  'Spring Boot', 'Django', 'Express', 'FastAPI', 'NestJS', 'Gin', 'Laravel',
  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'Neo4j',
  // Infrastructure & Tools
  'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
  'Terraform', 'Kafka', 'RabbitMQ', 'GitHub Actions',
  'Prometheus', 'Grafana',
  // Protocols & Standards
  'REST API', 'GraphQL', 'gRPC', 'WebSocket', 'OAuth 2.0', 'JWT',
  // Concepts (universal terms)
  'CI/CD', 'DevOps', 'Serverless', 'WebAssembly',
];

// ─── Localized Concepts ────────────────────────────────

const CONCEPTS: Record<Locale, string[]> = {
  zh: [
    '微服务', '设计模式', '函数式编程', '面向对象编程', '响应式编程',
    '负载均衡', '消息队列', '分布式系统', '缓存策略', '数据库索引',
    '单元测试', '代码审查', '持续集成', '容器化', '云原生',
    '领域驱动设计', '事件驱动架构', '依赖注入', '控制反转', '中间件',
  ],
  en: [
    'microservices', 'design patterns', 'functional programming', 'OOP', 'reactive programming',
    'load balancing', 'message queues', 'distributed systems', 'caching strategies', 'database indexing',
    'unit testing', 'code review', 'continuous integration', 'containerization', 'cloud native',
    'domain-driven design', 'event-driven architecture', 'dependency injection', 'inversion of control', 'middleware',
  ],
  ru: [
    'микросервисы', 'паттерны проектирования', 'функциональное программирование', 'ООП', 'реактивное программирование',
    'балансировка нагрузки', 'очереди сообщений', 'распределённые системы', 'стратегии кэширования', 'индексы БД',
    'модульное тестирование', 'код-ревью', 'непрерывная интеграция', 'контейнеризация', 'облачные технологии',
    'предметно-ориентированное проектирование', 'событийная архитектура', 'внедрение зависимостей', 'инверсия управления', 'промежуточное ПО',
  ],
  de: [
    'Microservices', 'Entwurfsmuster', 'funktionale Programmierung', 'OOP', 'reaktive Programmierung',
    'Lastverteilung', 'Nachrichtenwarteschlangen', 'verteilte Systeme', 'Caching-Strategien', 'Datenbankindizierung',
    'Unit-Tests', 'Code-Review', 'kontinuierliche Integration', 'Containerisierung', 'Cloud Native',
    'Domain-Driven Design', 'ereignisgesteuerte Architektur', 'Dependency Injection', 'Inversion of Control', 'Middleware',
  ],
  fr: [
    'microservices', 'design patterns', 'programmation fonctionnelle', 'POO', 'programmation réactive',
    'répartition de charge', 'files de messages', 'systèmes distribués', 'stratégies de cache', 'indexation en base',
    'tests unitaires', 'revue de code', 'intégration continue', 'conteneurisation', 'cloud native',
    'domain-driven design', 'architecture événementielle', 'injection de dépendances', 'inversion de contrôle', 'middleware',
  ],
};

// ─── Related Pairs (for comparison templates) ──────────

const PAIRS: [string, string][] = [
  // Frontend frameworks
  ['React', 'Vue'],
  ['Vue', 'Angular'],
  ['Next.js', 'Nuxt.js'],
  ['Svelte', 'React'],
  ['Vite', 'Webpack'],
  ['Tailwind CSS', 'Bootstrap'],
  // Languages
  ['JavaScript', 'TypeScript'],
  ['Python', 'Ruby'],
  ['Java', 'Kotlin'],
  ['Go', 'Rust'],
  ['C++', 'Rust'],
  ['Swift', 'Kotlin'],
  ['Python', 'Go'],
  ['Java', 'Go'],
  // Databases
  ['MySQL', 'PostgreSQL'],
  ['MongoDB', 'PostgreSQL'],
  ['Redis', 'Memcached'],
  ['SQL', 'NoSQL'],
  ['SQLite', 'PostgreSQL'],
  // Messaging & streaming
  ['Kafka', 'RabbitMQ'],
  // APIs & protocols
  ['REST API', 'GraphQL'],
  ['gRPC', 'REST API'],
  ['HTTP', 'WebSocket'],
  ['TCP', 'UDP'],
  ['OAuth 2.0', 'JWT'],
  // Infrastructure
  ['Docker', 'Podman'],
  ['Kubernetes', 'Docker Swarm'],
  ['Nginx', 'Apache'],
  ['Jenkins', 'GitHub Actions'],
  ['Linux', 'macOS'],
  // Backend frameworks
  ['Spring Boot', 'Django'],
  ['Express', 'Fastify'],
  ['FastAPI', 'Flask'],
  ['NestJS', 'Express'],
  // Classic debates
  ['Vim', 'Emacs'],
  ['tabs', 'spaces'],
  ['npm', 'pnpm'],
  ['Git rebase', 'Git merge'],
  ['Monolith', 'Microservices'],
  ['Serverless', 'Containers'],
];

// ─── Auto Keyword Detection ────────────────────────────

const AUTO_KEYWORDS = new Set([
  'auto', '自动',        // en, zh
  'авто', 'автоматически', // ru
  'automatisch',          // de
  'automatique',          // fr
]);

export function isAutoPrompt(prompt: string): boolean {
  const s = prompt.trim().toLowerCase();
  return !s || AUTO_KEYWORDS.has(s);
}

// ─── Generator ─────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generate(locale: Locale): string {
  const tpl = TEMPLATES[locale];
  const allTopics = [...TOPICS, ...CONCEPTS[locale]];

  // ~55% single-topic, ~45% pair — proportional to template counts (12:8)
  if (Math.random() < 0.6) {
    return pick(tpl.single).replace('{A}', pick(allTopics));
  }

  const [a, b] = Math.random() < 0.5 ? pick(PAIRS) : [...pick(PAIRS)].reverse() as [string, string];
  return pick(tpl.pair).replace('{A}', a).replace('{B}', b);
}

// ─── Public API ───────────────────────────────────────────

export interface PromptResult {
  prompt: string;
  knowledgeState?: KnowledgeState;
}

/**
 * Pick a random prompt.
 * Priority: customPool > knowledgeCategories > legacy fallback.
 */
export function pickRandomPrompt(
  customPool?: string[],
  locale: Locale = 'en',
  knowledgeCategories?: string[],
  customCategories?: CustomCategory[],
  knowledgeState?: KnowledgeState,
): PromptResult {
  // 1. Custom pool takes highest priority (backward compatible)
  if (customPool && customPool.length > 0) {
    return { prompt: customPool[Math.floor(Math.random() * customPool.length)] };
  }

  // 2. Knowledge category system
  if (knowledgeCategories && knowledgeCategories.length > 0 && knowledgeState) {
    const result = pickKnowledgePrompt(knowledgeState, knowledgeCategories, customCategories ?? [], locale);
    return { prompt: result.prompt, knowledgeState: result.updatedState };
  }

  // 3. Legacy fallback — original combinatorial tech prompts
  return { prompt: generate(locale) };
}

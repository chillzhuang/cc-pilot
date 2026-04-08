/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import type { Locale, CustomCategory, KnowledgeState, KnowledgeCategoryState } from '../types.js';

// ─── Category Definition ──────────────────────────────────

interface CategoryDef {
  dimensions: Record<Locale, string[]>;
  templates: Record<Locale, string[]>;
}

// ─── Built-in Categories ──────────────────────────────────

const CATEGORIES: Record<string, CategoryDef> = {
  // ── Tech ────────────────────────────────────────────────
  tech: {
    dimensions: {
      en: [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
        'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
        'Spring Boot', 'Django', 'FastAPI', 'NestJS', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
        'Kafka', 'RabbitMQ', 'GraphQL', 'gRPC', 'WebSocket',
        'microservices', 'design patterns', 'functional programming',
        'distributed systems', 'caching strategies', 'CI/CD',
        'cloud native', 'domain-driven design', 'event-driven architecture',
      ],
      zh: [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
        'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
        'Spring Boot', 'Django', 'FastAPI', 'NestJS', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
        'Kafka', 'RabbitMQ', 'GraphQL', 'gRPC', 'WebSocket',
        '微服务', '设计模式', '函数式编程',
        '分布式系统', '缓存策略', 'CI/CD',
        '云原生', '领域驱动设计', '事件驱动架构',
      ],
      ru: [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
        'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
        'Spring Boot', 'Django', 'FastAPI', 'NestJS', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
        'Kafka', 'RabbitMQ', 'GraphQL', 'gRPC', 'WebSocket',
        'микросервисы', 'паттерны проектирования', 'функциональное программирование',
        'распределённые системы', 'стратегии кэширования', 'CI/CD',
        'облачные технологии', 'предметно-ориентированное проектирование', 'событийная архитектура',
      ],
      de: [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
        'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
        'Spring Boot', 'Django', 'FastAPI', 'NestJS', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
        'Kafka', 'RabbitMQ', 'GraphQL', 'gRPC', 'WebSocket',
        'Microservices', 'Entwurfsmuster', 'funktionale Programmierung',
        'verteilte Systeme', 'Caching-Strategien', 'CI/CD',
        'Cloud Native', 'Domain-Driven Design', 'ereignisgesteuerte Architektur',
      ],
      fr: [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
        'React', 'Vue', 'Angular', 'Next.js', 'Svelte',
        'Spring Boot', 'Django', 'FastAPI', 'NestJS', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git',
        'Kafka', 'RabbitMQ', 'GraphQL', 'gRPC', 'WebSocket',
        'microservices', 'design patterns', 'programmation fonctionnelle',
        'systèmes distribués', 'stratégies de cache', 'CI/CD',
        'cloud native', 'domain-driven design', 'architecture événementielle',
      ],
    },
    templates: {
      en: [
        'Give a brief introduction to {D}.',
        'What are the pros and cons of {D}?',
        'What is the core principle behind {D}?',
        'How would you explain {D} to a beginner?',
        'What is the most common misconception about {D}?',
        'When is {D} the right choice?',
        'How did {D} get its name?',
        'How do you see {D} evolving in the future?',
        'Any fun facts about {D}?',
        'What is the key concept to grasp when learning {D}?',
      ],
      zh: [
        '简单介绍下 {D}',
        '{D} 有什么优缺点？',
        '{D} 的核心原理是什么？',
        '如果要向新手解释 {D}，你会怎么说？',
        '关于 {D} 最常见的误解是什么？',
        '什么场景下适合用 {D}？',
        '{D} 这个名字是怎么来的？',
        '你觉得 {D} 未来会怎么发展？',
        '关于 {D} 有什么有趣的小知识？',
        '学 {D} 最重要的是理解什么？',
      ],
      ru: [
        'Расскажи кратко о {D}.',
        'Какие плюсы и минусы у {D}?',
        'Какой основной принцип у {D}?',
        'Как бы ты объяснил {D} новичку?',
        'Какое самое распространённое заблуждение о {D}?',
        'В каких случаях лучше использовать {D}?',
        'Откуда название {D}?',
        'Как будет развиваться {D} в будущем?',
        'Есть интересные факты о {D}?',
        'Что важнее всего понять при изучении {D}?',
      ],
      de: [
        'Stelle {D} kurz vor.',
        'Was sind die Vor- und Nachteile von {D}?',
        'Was ist das Kernprinzip von {D}?',
        'Wie würdest du {D} einem Anfänger erklären?',
        'Was ist das häufigste Missverständnis über {D}?',
        'Wann ist {D} die richtige Wahl?',
        'Woher kommt der Name {D}?',
        'Wie wird sich {D} in Zukunft entwickeln?',
        'Gibt es interessante Fakten über {D}?',
        'Was ist das Wichtigste beim Erlernen von {D}?',
      ],
      fr: [
        'Présente brièvement {D}.',
        'Quels sont les avantages et inconvénients de {D} ?',
        'Quel est le principe fondamental de {D} ?',
        'Comment expliquerais-tu {D} à un débutant ?',
        'Quelle est l\'idée reçue la plus courante sur {D} ?',
        'Quand est-ce que {D} est le bon choix ?',
        'D\'où vient le nom {D} ?',
        'Comment vois-tu l\'avenir de {D} ?',
        'Des anecdotes intéressantes sur {D} ?',
        'Quel est le concept clé pour comprendre {D} ?',
      ],
    },
  },

  // ── English Vocabulary ──────────────────────────────────
  english: {
    dimensions: {
      en: [
        'idioms and proverbs', 'phrasal verbs', 'etymology and word origins',
        'homophones and confusables', 'formal vs informal register',
        'common grammar mistakes', 'academic writing', 'business English',
        'slang and colloquialisms', 'pronunciation pitfalls',
        'false friends across languages', 'literary devices',
        'Latin and Greek word roots', 'email etiquette phrases',
        'debate and argumentation', 'collocations', 'synonyms and nuance',
      ],
      zh: [
        '习语与谚语', '动词短语', '词源与词的起源',
        '同音异义词与易混淆词', '正式与非正式语域',
        '常见语法错误', '学术写作', '商务英语',
        '俚语与口语表达', '发音难点',
        '跨语言假朋友（假同源词）', '修辞手法',
        '拉丁和希腊词根', '邮件礼仪用语',
        '辩论与论证', '固定搭配', '近义词与语义差异',
      ],
      ru: [
        'идиомы и пословицы', 'фразовые глаголы', 'этимология слов',
        'омофоны и путаница', 'формальный и неформальный стиль',
        'типичные грамматические ошибки', 'академическое письмо', 'деловой английский',
        'сленг и разговорные выражения', 'подводные камни произношения',
        'ложные друзья переводчика', 'литературные приёмы',
        'латинские и греческие корни', 'этикет деловой переписки',
        'аргументация и дебаты', 'коллокации', 'синонимы и нюансы',
      ],
      de: [
        'Redewendungen und Sprichwörter', 'Phrasal Verbs', 'Etymologie und Wortherkunft',
        'Homophone und Verwechslungen', 'formeller vs. informeller Stil',
        'häufige Grammatikfehler', 'akademisches Schreiben', 'Business-Englisch',
        'Slang und Umgangssprache', 'Aussprachefallen',
        'falsche Freunde', 'rhetorische Stilmittel',
        'lateinische und griechische Wortstämme', 'E-Mail-Etikette',
        'Debatte und Argumentation', 'Kollokationen', 'Synonyme und Nuancen',
      ],
      fr: [
        'expressions idiomatiques et proverbes', 'verbes à particule', 'étymologie',
        'homophones et confusions', 'registre formel vs informel',
        'erreurs de grammaire courantes', 'écriture académique', 'anglais des affaires',
        'argot et expressions familières', 'pièges de prononciation',
        'faux amis entre langues', 'figures de style',
        'racines latines et grecques', 'formules de politesse par e-mail',
        'débat et argumentation', 'collocations', 'synonymes et nuances',
      ],
    },
    templates: {
      en: [
        'Teach me something interesting about {D} in English.',
        'Give 3 useful examples related to {D}.',
        'What common mistakes do learners make with {D}?',
        'Explain {D} with a memorable example.',
        'How can I practice {D} in daily conversation?',
        'Compare two related aspects of {D}.',
        'What is a fun fact about {D}?',
        'Create a mini quiz about {D} with answers.',
      ],
      zh: [
        '教我一个关于英语「{D}」的有趣知识点。',
        '给我 3 个关于「{D}」的实用例子。',
        '学习者在「{D}」方面常犯什么错误？',
        '用一个好记的例子解释「{D}」。',
        '日常对话中如何练习「{D}」？',
        '对比「{D}」中两个相关的方面。',
        '关于「{D}」有什么有趣的冷知识？',
        '出一个关于「{D}」的小测验，附上答案。',
      ],
      ru: [
        'Расскажи что-то интересное о {D} в английском.',
        'Приведи 3 полезных примера по теме {D}.',
        'Какие ошибки часто делают изучающие {D}?',
        'Объясни {D} с запоминающимся примером.',
        'Как практиковать {D} в повседневном разговоре?',
        'Сравни два аспекта {D}.',
        'Какой интересный факт связан с {D}?',
        'Составь мини-тест по {D} с ответами.',
      ],
      de: [
        'Erzähle mir etwas Interessantes über {D} im Englischen.',
        'Gib 3 nützliche Beispiele zu {D}.',
        'Welche Fehler machen Lernende häufig bei {D}?',
        'Erkläre {D} mit einem einprägsamen Beispiel.',
        'Wie kann ich {D} im Alltag üben?',
        'Vergleiche zwei Aspekte von {D}.',
        'Was ist ein Fun Fact über {D}?',
        'Erstelle ein Mini-Quiz zu {D} mit Antworten.',
      ],
      fr: [
        'Apprends-moi quelque chose d\'intéressant sur {D} en anglais.',
        'Donne 3 exemples utiles liés à {D}.',
        'Quelles erreurs font souvent les apprenants avec {D} ?',
        'Explique {D} avec un exemple mémorable.',
        'Comment pratiquer {D} dans la conversation quotidienne ?',
        'Compare deux aspects de {D}.',
        'Quelle est une anecdote amusante sur {D} ?',
        'Crée un mini-quiz sur {D} avec les réponses.',
      ],
    },
  },

  // ── Medical Knowledge ───────────────────────────────────
  medical: {
    dimensions: {
      en: [
        'nutrition basics', 'sleep science', 'first aid essentials',
        'common medications', 'mental health awareness', 'exercise physiology',
        'immune system', 'skin care science', 'cardiovascular health',
        'digestive system', 'eye health', 'dental hygiene',
        'hydration and electrolytes', 'chronic disease prevention',
        'allergy management', 'pain management', 'respiratory health',
      ],
      zh: [
        '营养学基础', '睡眠科学', '急救要点',
        '常见药物常识', '心理健康意识', '运动生理学',
        '免疫系统', '皮肤护理科学', '心血管健康',
        '消化系统', '眼部健康', '口腔卫生',
        '水分与电解质', '慢性病预防',
        '过敏管理', '疼痛管理', '呼吸系统健康',
      ],
      ru: [
        'основы питания', 'наука о сне', 'основы первой помощи',
        'распространённые лекарства', 'психическое здоровье', 'физиология упражнений',
        'иммунная система', 'наука ухода за кожей', 'здоровье сердца',
        'пищеварительная система', 'здоровье глаз', 'гигиена полости рта',
        'гидратация и электролиты', 'профилактика хронических заболеваний',
        'управление аллергией', 'управление болью', 'здоровье органов дыхания',
      ],
      de: [
        'Ernährungsgrundlagen', 'Schlafwissenschaft', 'Erste-Hilfe-Grundlagen',
        'gängige Medikamente', 'psychische Gesundheit', 'Trainingsphysiologie',
        'Immunsystem', 'Hautpflegewissenschaft', 'Herz-Kreislauf-Gesundheit',
        'Verdauungssystem', 'Augengesundheit', 'Zahnhygiene',
        'Flüssigkeit und Elektrolyte', 'Prävention chronischer Krankheiten',
        'Allergiemanagement', 'Schmerzmanagement', 'Atemwegsgesundheit',
      ],
      fr: [
        'bases de la nutrition', 'science du sommeil', 'premiers secours',
        'médicaments courants', 'santé mentale', 'physiologie de l\'exercice',
        'système immunitaire', 'science des soins de la peau', 'santé cardiovasculaire',
        'système digestif', 'santé oculaire', 'hygiène dentaire',
        'hydratation et électrolytes', 'prévention des maladies chroniques',
        'gestion des allergies', 'gestion de la douleur', 'santé respiratoire',
      ],
    },
    templates: {
      en: [
        'Share a practical health tip about {D}.',
        'What is a common myth about {D}?',
        'Explain the science behind {D} in simple terms.',
        'What should everyone know about {D}?',
        'Give 3 actionable suggestions related to {D}.',
        'What warning signs related to {D} should people watch for?',
        'How has understanding of {D} changed in recent years?',
        'Explain {D} as if teaching a teenager.',
      ],
      zh: [
        '分享一个关于「{D}」的实用健康小贴士。',
        '关于「{D}」有哪些常见误区？',
        '用通俗语言解释「{D}」背后的科学原理。',
        '关于「{D}」每个人都应该知道什么？',
        '给出 3 条关于「{D}」的可操作建议。',
        '与「{D}」相关的哪些警示信号需要注意？',
        '近年来对「{D}」的认识有什么变化？',
        '像给青少年讲课一样解释「{D}」。',
      ],
      ru: [
        'Поделись практическим советом о {D}.',
        'Какой распространённый миф связан с {D}?',
        'Объясни науку о {D} простыми словами.',
        'Что каждый должен знать о {D}?',
        'Дай 3 практических совета по {D}.',
        'На какие предупреждающие признаки {D} стоит обратить внимание?',
        'Как изменилось понимание {D} в последние годы?',
        'Объясни {D} как подростку.',
      ],
      de: [
        'Teile einen praktischen Gesundheitstipp zu {D}.',
        'Was ist ein verbreiteter Mythos über {D}?',
        'Erkläre die Wissenschaft hinter {D} in einfachen Worten.',
        'Was sollte jeder über {D} wissen?',
        'Gib 3 umsetzbare Tipps zu {D}.',
        'Auf welche Warnsignale bei {D} sollte man achten?',
        'Wie hat sich das Verständnis von {D} in den letzten Jahren verändert?',
        'Erkläre {D} wie für einen Teenager.',
      ],
      fr: [
        'Partage un conseil santé pratique sur {D}.',
        'Quel est un mythe courant sur {D} ?',
        'Explique la science derrière {D} simplement.',
        'Que devrait savoir tout le monde sur {D} ?',
        'Donne 3 conseils pratiques sur {D}.',
        'Quels signaux d\'alerte liés à {D} faut-il surveiller ?',
        'Comment la compréhension de {D} a-t-elle évolué récemment ?',
        'Explique {D} comme à un adolescent.',
      ],
    },
  },

  // ── Legal Knowledge ─────────────────────────────────────
  legal: {
    dimensions: {
      en: [
        'contract basics', 'intellectual property', 'consumer rights',
        'employment law', 'privacy and data protection', 'landlord-tenant law',
        'traffic law', 'small claims court', 'digital rights',
        'inheritance basics', 'freedom of speech boundaries', 'corporate liability',
        'dispute resolution', 'legal document reading', 'international law basics',
        'criminal law basics', 'family law',
      ],
      zh: [
        '合同基础', '知识产权', '消费者权益',
        '劳动法', '隐私与数据保护', '房屋租赁法',
        '交通法规', '小额诉讼', '数字权利',
        '继承法基础', '言论自由边界', '企业责任',
        '纠纷解决', '法律文书阅读', '国际法基础',
        '刑法基础', '婚姻家庭法',
      ],
      ru: [
        'основы договоров', 'интеллектуальная собственность', 'права потребителей',
        'трудовое право', 'конфиденциальность и защита данных', 'жилищное право',
        'ПДД', 'мелкие иски', 'цифровые права',
        'основы наследования', 'границы свободы слова', 'корпоративная ответственность',
        'разрешение споров', 'чтение юридических документов', 'основы международного права',
        'основы уголовного права', 'семейное право',
      ],
      de: [
        'Vertragsgrundlagen', 'geistiges Eigentum', 'Verbraucherrechte',
        'Arbeitsrecht', 'Datenschutz', 'Mietrecht',
        'Verkehrsrecht', 'Bagatellverfahren', 'digitale Rechte',
        'Erbrecht', 'Grenzen der Meinungsfreiheit', 'Unternehmenshaftung',
        'Streitbeilegung', 'juristische Dokumente lesen', 'Grundlagen des Völkerrechts',
        'Strafrecht-Grundlagen', 'Familienrecht',
      ],
      fr: [
        'bases du contrat', 'propriété intellectuelle', 'droits des consommateurs',
        'droit du travail', 'vie privée et protection des données', 'droit locatif',
        'code de la route', 'petites créances', 'droits numériques',
        'bases de la succession', 'limites de la liberté d\'expression', 'responsabilité des entreprises',
        'résolution des litiges', 'lecture de documents juridiques', 'bases du droit international',
        'bases du droit pénal', 'droit de la famille',
      ],
    },
    templates: {
      en: [
        'What should a non-lawyer know about {D}?',
        'Give a real-world scenario illustrating {D}.',
        'What are common misconceptions about {D}?',
        'Explain the key principles of {D} simply.',
        'What rights do individuals have regarding {D}?',
        'What practical steps can someone take regarding {D}?',
        'Explain {D} using an everyday analogy.',
        'What is one surprising fact about {D}?',
      ],
      zh: [
        '非法律专业人士应了解「{D}」的哪些知识？',
        '举一个关于「{D}」的现实场景。',
        '关于「{D}」有哪些常见误解？',
        '用简单语言解释「{D}」的核心原则。',
        '个人在「{D}」方面有哪些权利？',
        '关于「{D}」可以采取哪些实际措施？',
        '用日常类比解释「{D}」。',
        '关于「{D}」有什么令人意外的事实？',
      ],
      ru: [
        'Что должен знать о {D} человек без юридического образования?',
        'Приведи реальный сценарий, связанный с {D}.',
        'Какие заблуждения существуют о {D}?',
        'Объясни ключевые принципы {D} простым языком.',
        'Какие права есть у граждан в отношении {D}?',
        'Какие практические шаги можно предпринять в области {D}?',
        'Объясни {D} на бытовой аналогии.',
        'Какой удивительный факт связан с {D}?',
      ],
      de: [
        'Was sollte ein Nicht-Jurist über {D} wissen?',
        'Nenne ein Alltagsbeispiel zu {D}.',
        'Welche Missverständnisse gibt es über {D}?',
        'Erkläre die Grundprinzipien von {D} einfach.',
        'Welche Rechte hat man bezüglich {D}?',
        'Welche praktischen Schritte kann man bei {D} unternehmen?',
        'Erkläre {D} mit einer Alltagsanalogie.',
        'Was ist eine überraschende Tatsache über {D}?',
      ],
      fr: [
        'Que devrait savoir un non-juriste sur {D} ?',
        'Donne un scénario concret illustrant {D}.',
        'Quelles idées reçues existent sur {D} ?',
        'Explique les principes clés de {D} simplement.',
        'Quels droits a-t-on concernant {D} ?',
        'Quelles démarches pratiques peut-on faire pour {D} ?',
        'Explique {D} avec une analogie du quotidien.',
        'Quel fait surprenant est lié à {D} ?',
      ],
    },
  },

  // ── Psychology ──────────────────────────────────────────
  psychology: {
    dimensions: {
      en: [
        'cognitive biases', 'emotional intelligence', 'habit formation',
        'motivation theory', 'stress management', 'decision-making psychology',
        'social influence', 'memory techniques', 'procrastination',
        'interpersonal communication', 'growth mindset', 'conflict resolution',
        'resilience', 'creativity psychology', 'sleep and cognition',
        'self-awareness', 'positive psychology',
      ],
      zh: [
        '认知偏误', '情商', '习惯养成',
        '动机理论', '压力管理', '决策心理学',
        '社会影响', '记忆技巧', '拖延症',
        '人际沟通', '成长型思维', '冲突解决',
        '心理韧性', '创造力心理学', '睡眠与认知',
        '自我觉察', '积极心理学',
      ],
      ru: [
        'когнитивные искажения', 'эмоциональный интеллект', 'формирование привычек',
        'теория мотивации', 'управление стрессом', 'психология принятия решений',
        'социальное влияние', 'техники запоминания', 'прокрастинация',
        'межличностное общение', 'установка на рост', 'разрешение конфликтов',
        'жизнестойкость', 'психология творчества', 'сон и когнитивные функции',
        'самосознание', 'позитивная психология',
      ],
      de: [
        'kognitive Verzerrungen', 'emotionale Intelligenz', 'Gewohnheitsbildung',
        'Motivationstheorie', 'Stressmanagement', 'Entscheidungspsychologie',
        'sozialer Einfluss', 'Gedächtnistechniken', 'Prokrastination',
        'zwischenmenschliche Kommunikation', 'Growth Mindset', 'Konfliktlösung',
        'Resilienz', 'Kreativitätspsychologie', 'Schlaf und Kognition',
        'Selbstwahrnehmung', 'positive Psychologie',
      ],
      fr: [
        'biais cognitifs', 'intelligence émotionnelle', 'formation des habitudes',
        'théorie de la motivation', 'gestion du stress', 'psychologie de la décision',
        'influence sociale', 'techniques de mémorisation', 'procrastination',
        'communication interpersonnelle', 'état d\'esprit de croissance', 'résolution de conflits',
        'résilience', 'psychologie de la créativité', 'sommeil et cognition',
        'conscience de soi', 'psychologie positive',
      ],
    },
    templates: {
      en: [
        'Explain {D} with a relatable example.',
        'How does {D} affect everyday decisions?',
        'What practical technique relates to {D}?',
        'What is a surprising research finding about {D}?',
        'How can understanding {D} improve daily life?',
        'What is a famous experiment related to {D}?',
        'Debunk a common myth about {D}.',
        'Give a 1-minute mental exercise related to {D}.',
      ],
      zh: [
        '用一个贴近生活的例子解释「{D}」。',
        '「{D}」如何影响日常决策？',
        '有什么实用技巧与「{D}」相关？',
        '关于「{D}」有什么令人意外的研究发现？',
        '理解「{D}」如何改善日常生活？',
        '有什么著名实验与「{D}」相关？',
        '破解一个关于「{D}」的常见迷思。',
        '给出一个与「{D}」相关的 1 分钟心理练习。',
      ],
      ru: [
        'Объясни {D} с помощью жизненного примера.',
        'Как {D} влияет на повседневные решения?',
        'Какой практический приём связан с {D}?',
        'Какое удивительное исследование связано с {D}?',
        'Как понимание {D} может улучшить жизнь?',
        'Какой знаменитый эксперимент связан с {D}?',
        'Развенчай распространённый миф о {D}.',
        'Предложи минутное ментальное упражнение по {D}.',
      ],
      de: [
        'Erkläre {D} mit einem nachvollziehbaren Beispiel.',
        'Wie beeinflusst {D} alltägliche Entscheidungen?',
        'Welche praktische Technik hängt mit {D} zusammen?',
        'Was ist eine überraschende Forschungserkenntnis zu {D}?',
        'Wie kann das Verständnis von {D} den Alltag verbessern?',
        'Welches berühmte Experiment hängt mit {D} zusammen?',
        'Widerlege einen verbreiteten Mythos über {D}.',
        'Gib eine 1-Minuten-Übung zu {D}.',
      ],
      fr: [
        'Explique {D} avec un exemple concret.',
        'Comment {D} affecte-t-il les décisions quotidiennes ?',
        'Quelle technique pratique est liée à {D} ?',
        'Quelle découverte surprenante est liée à {D} ?',
        'Comment comprendre {D} peut améliorer le quotidien ?',
        'Quelle expérience célèbre est liée à {D} ?',
        'Démystifie une idée reçue sur {D}.',
        'Propose un exercice mental d\'1 minute sur {D}.',
      ],
    },
  },

  // ── History ─────────────────────────────────────────────
  history: {
    dimensions: {
      en: [
        'ancient civilizations', 'medieval Europe', 'Renaissance',
        'Age of Exploration', 'Industrial Revolution', 'World War I',
        'World War II', 'Cold War era', 'ancient China',
        'ancient Rome', 'ancient Greece', 'Ottoman Empire',
        'French Revolution', 'American independence', 'colonialism',
        'space race', 'Silk Road', 'scientific revolutions',
      ],
      zh: [
        '古代文明', '中世纪欧洲', '文艺复兴',
        '大航海时代', '工业革命', '第一次世界大战',
        '第二次世界大战', '冷战时期', '中国古代史',
        '古罗马', '古希腊', '奥斯曼帝国',
        '法国大革命', '美国独立', '殖民主义',
        '太空竞赛', '丝绸之路', '科学革命',
      ],
      ru: [
        'древние цивилизации', 'средневековая Европа', 'Ренессанс',
        'эпоха великих открытий', 'промышленная революция', 'Первая мировая война',
        'Вторая мировая война', 'эпоха холодной войны', 'древний Китай',
        'древний Рим', 'древняя Греция', 'Османская империя',
        'Французская революция', 'американская независимость', 'колониализм',
        'космическая гонка', 'Шёлковый путь', 'научные революции',
      ],
      de: [
        'antike Zivilisationen', 'mittelalterliches Europa', 'Renaissance',
        'Zeitalter der Entdeckungen', 'industrielle Revolution', 'Erster Weltkrieg',
        'Zweiter Weltkrieg', 'Kalter Krieg', 'altes China',
        'altes Rom', 'altes Griechenland', 'Osmanisches Reich',
        'Französische Revolution', 'amerikanische Unabhängigkeit', 'Kolonialismus',
        'Wettlauf ins All', 'Seidenstraße', 'wissenschaftliche Revolutionen',
      ],
      fr: [
        'civilisations antiques', 'Europe médiévale', 'Renaissance',
        'grandes découvertes', 'révolution industrielle', 'Première Guerre mondiale',
        'Seconde Guerre mondiale', 'guerre froide', 'Chine ancienne',
        'Rome antique', 'Grèce antique', 'Empire ottoman',
        'Révolution française', 'indépendance américaine', 'colonialisme',
        'course à l\'espace', 'Route de la soie', 'révolutions scientifiques',
      ],
    },
    templates: {
      en: [
        'Share a fascinating fact about {D}.',
        'What is a common misconception about {D}?',
        'How did {D} change the course of history?',
        'What can we learn from {D} today?',
        'Describe a key turning point during {D}.',
        'Who was an overlooked figure in {D}?',
        'How did everyday life look during {D}?',
        'What surprising connection exists between {D} and the modern world?',
      ],
      zh: [
        '分享一个关于「{D}」的冷知识。',
        '关于「{D}」有哪些常见误解？',
        '「{D}」如何改变了历史进程？',
        '今天我们能从「{D}」中学到什么？',
        '描述「{D}」期间的一个关键转折点。',
        '「{D}」中有哪些被忽视的重要人物？',
        '「{D}」时期的日常生活是什么样的？',
        '「{D}」与现代世界之间有什么意想不到的联系？',
      ],
      ru: [
        'Расскажи удивительный факт о {D}.',
        'Какие заблуждения существуют о {D}?',
        'Как {D} изменил ход истории?',
        'Чему нас может научить {D} сегодня?',
        'Опиши ключевой поворотный момент в {D}.',
        'Кто был недооценённой фигурой в {D}?',
        'Как выглядела повседневная жизнь во время {D}?',
        'Какая удивительная связь между {D} и современным миром?',
      ],
      de: [
        'Teile einen faszinierenden Fakt über {D}.',
        'Welche Missverständnisse gibt es über {D}?',
        'Wie hat {D} den Lauf der Geschichte verändert?',
        'Was können wir heute von {D} lernen?',
        'Beschreibe einen Wendepunkt während {D}.',
        'Wer war eine übersehene Figur in {D}?',
        'Wie sah der Alltag während {D} aus?',
        'Welche überraschende Verbindung gibt es zwischen {D} und der modernen Welt?',
      ],
      fr: [
        'Partage un fait fascinant sur {D}.',
        'Quelles idées reçues existent sur {D} ?',
        'Comment {D} a-t-il changé le cours de l\'histoire ?',
        'Que peut-on apprendre de {D} aujourd\'hui ?',
        'Décris un tournant clé pendant {D}.',
        'Qui était une figure méconnue de {D} ?',
        'À quoi ressemblait la vie quotidienne pendant {D} ?',
        'Quel lien surprenant existe entre {D} et le monde moderne ?',
      ],
    },
  },
};

// ─── Generic Templates (for custom categories) ───────────

const GENERIC_TEMPLATES: Record<Locale, string[]> = {
  en: [
    'Teach me something interesting about {C}, focusing on {D}.',
    'What is a useful concept in {C} that most people don\'t know?',
    'Give a practical tip related to {C}.',
    'What is a common misconception about {C}?',
    'Explain a key principle of {C} with an example.',
    'What is the most important thing a beginner should know about {C}?',
    'Share a surprising fact about {C}.',
    'How can knowledge of {C} be applied in everyday life?',
  ],
  zh: [
    '教我一个关于「{C}」的有趣知识，侧重于{D}。',
    '「{C}」领域有什么大多数人不知道的实用概念？',
    '给一个与「{C}」相关的实用建议。',
    '关于「{C}」有什么常见误区？',
    '用一个例子解释「{C}」的关键原则。',
    '初学者最应该了解「{C}」的什么？',
    '分享一个关于「{C}」的冷知识。',
    '「{C}」的知识如何应用到日常生活中？',
  ],
  ru: [
    'Расскажи что-то интересное о {C}, с акцентом на {D}.',
    'Какой полезный факт о {C} мало кто знает?',
    'Дай практический совет по {C}.',
    'Какое распространённое заблуждение связано с {C}?',
    'Объясни ключевой принцип {C} на примере.',
    'Что важнее всего знать новичку в {C}?',
    'Поделись удивительным фактом о {C}.',
    'Как знания о {C} можно применить в повседневной жизни?',
  ],
  de: [
    'Erzähle mir etwas Interessantes über {C}, mit Fokus auf {D}.',
    'Welches nützliche Konzept in {C} kennen die wenigsten?',
    'Gib einen praktischen Tipp zu {C}.',
    'Welches verbreitete Missverständnis gibt es über {C}?',
    'Erkläre ein Schlüsselprinzip von {C} mit einem Beispiel.',
    'Was sollte ein Anfänger über {C} wissen?',
    'Teile einen überraschenden Fakt über {C}.',
    'Wie kann Wissen über {C} im Alltag angewendet werden?',
  ],
  fr: [
    'Apprends-moi quelque chose d\'intéressant sur {C}, en lien avec {D}.',
    'Quel concept utile de {C} est peu connu ?',
    'Donne un conseil pratique sur {C}.',
    'Quelle idée reçue courante existe sur {C} ?',
    'Explique un principe clé de {C} avec un exemple.',
    'Que devrait savoir un débutant sur {C} ?',
    'Partage un fait surprenant sur {C}.',
    'Comment appliquer les connaissances de {C} au quotidien ?',
  ],
};

// ─── Shuffle Engine ───────────────────────────────────────

function fisherYatesShuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateShuffledIndices(count: number): number[] {
  return fisherYatesShuffle(Array.from({ length: count }, (_, i) => i));
}

function ensureCategoryState(
  state: KnowledgeState,
  categoryId: string,
  comboCount: number,
): KnowledgeCategoryState {
  const existing = state.categories[categoryId];
  if (existing && existing.shuffledIndices.length === comboCount && existing.cursor < comboCount) {
    return existing;
  }
  // Initialize or reshuffle when exhausted / size changed
  return {
    shuffledIndices: generateShuffledIndices(comboCount),
    cursor: 0,
    recentDimensions: existing?.recentDimensions ?? [],
  };
}

function pushRecent(arr: string[], item: string, max = 10): string[] {
  const next = [...arr.filter(d => d !== item), item];
  return next.length > max ? next.slice(next.length - max) : next;
}

// ─── Prompt Builder ───────────────────────────────────────

function buildBuiltinPrompt(
  categoryId: string,
  locale: Locale,
  catState: KnowledgeCategoryState,
): { prompt: string; dimension: string } {
  const cat = CATEGORIES[categoryId];
  const dims = cat.dimensions[locale] ?? cat.dimensions.en;
  const tpls = cat.templates[locale] ?? cat.templates.en;
  const comboIdx = catState.shuffledIndices[catState.cursor];
  const dimIdx = comboIdx % dims.length;
  const tplIdx = Math.floor(comboIdx / dims.length);
  const dimension = dims[dimIdx];
  const template = tpls[tplIdx % tpls.length];
  let prompt = template.replace('{D}', dimension);

  // Anti-repeat context hint
  if (catState.recentDimensions.length > 0) {
    const recentHint = catState.recentDimensions.slice(-5).join(', ');
    const hint = locale === 'zh'
      ? `（请避免与以下最近话题重复：${recentHint}）`
      : locale === 'ru'
        ? `(Избегай пересечения с недавними темами: ${recentHint})`
        : locale === 'de'
          ? `(Vermeide Überschneidungen mit diesen Themen: ${recentHint})`
          : locale === 'fr'
            ? `(Évite de répéter ces sujets récents : ${recentHint})`
            : `(Avoid overlapping with these recent topics: ${recentHint})`;
    prompt += ' ' + hint;
  }

  return { prompt, dimension };
}

function buildCustomPrompt(
  custom: CustomCategory,
  locale: Locale,
  catState: KnowledgeCategoryState,
): { prompt: string; dimension: string } {
  const tpls = GENERIC_TEMPLATES[locale] ?? GENERIC_TEMPLATES.en;
  const tplIdx = catState.shuffledIndices[catState.cursor] % tpls.length;
  const template = tpls[tplIdx];
  const dimension = custom.name;
  let prompt = template.replace('{C}', custom.name).replace('{D}', custom.description || custom.name);

  if (catState.recentDimensions.length > 0) {
    const recentHint = catState.recentDimensions.slice(-5).join(', ');
    const hint = locale === 'zh'
      ? `（请避免与以下最近话题重复：${recentHint}）`
      : `(Avoid overlapping with these recent topics: ${recentHint})`;
    prompt += ' ' + hint;
  }

  return { prompt, dimension };
}

// ─── Public API ───────────────────────────────────────────

export function isBuiltinCategory(id: string): boolean {
  return id in CATEGORIES;
}

export function getBuiltinCategoryIds(): string[] {
  return Object.keys(CATEGORIES);
}

export function pickKnowledgePrompt(
  state: KnowledgeState,
  enabledCategories: string[],
  customCategories: CustomCategory[],
  locale: Locale,
): { prompt: string; updatedState: KnowledgeState } {
  if (enabledCategories.length === 0) {
    enabledCategories = ['tech'];
  }

  // Pick a random enabled category
  const categoryId = enabledCategories[Math.floor(Math.random() * enabledCategories.length)];
  const isBuiltin = isBuiltinCategory(categoryId);
  const customDef = customCategories.find(c => c.id === categoryId);

  // Determine combo count
  let comboCount: number;
  if (isBuiltin) {
    const cat = CATEGORIES[categoryId];
    const dims = cat.dimensions[locale] ?? cat.dimensions.en;
    const tpls = cat.templates[locale] ?? cat.templates.en;
    comboCount = dims.length * tpls.length;
  } else {
    const tpls = GENERIC_TEMPLATES[locale] ?? GENERIC_TEMPLATES.en;
    comboCount = tpls.length;
  }

  // Ensure category state
  const updatedState: KnowledgeState = {
    categories: { ...state.categories },
  };
  const catState = ensureCategoryState(updatedState, categoryId, comboCount);

  // Build prompt
  let prompt: string;
  let dimension: string;

  if (isBuiltin) {
    ({ prompt, dimension } = buildBuiltinPrompt(categoryId, locale, catState));
  } else if (customDef) {
    ({ prompt, dimension } = buildCustomPrompt(customDef, locale, catState));
  } else {
    // Fallback: unknown category, treat as custom with minimal info
    ({ prompt, dimension } = buildCustomPrompt(
      { id: categoryId, name: categoryId, description: categoryId },
      locale,
      catState,
    ));
  }

  // Advance cursor and update recent dimensions
  updatedState.categories[categoryId] = {
    shuffledIndices: catState.shuffledIndices,
    cursor: catState.cursor + 1 >= comboCount ? 0 : catState.cursor + 1,
    recentDimensions: pushRecent(catState.recentDimensions, dimension),
  };

  // Reshuffle if cursor wrapped
  if (catState.cursor + 1 >= comboCount) {
    updatedState.categories[categoryId].shuffledIndices = generateShuffledIndices(comboCount);
  }

  return { prompt, updatedState };
}

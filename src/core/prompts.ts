/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── Built-in Light Prompts (100) ───────────────────────
// Casual, low-cost prompts for window activation.
// These simulate natural human conversations — no heavy tasks.

export const BUILTIN_PROMPTS: string[] = [
  // Greetings & casual chat
  '你好，今天心情怎么样？',
  '早上好，新的一天开始了',
  '下午好，随便聊聊吧',
  '晚上好，今天辛苦了',
  'Hi, how are you today?',
  'Good morning! What\'s new?',
  '嗨，最近过得怎么样？',
  '今天天气真不错，你觉得呢？',
  '周末有什么好玩的推荐吗？',
  '你最近在忙什么有趣的事？',

  // Simple coding tasks
  '写一个冒泡排序算法',
  '写一个简单的斐波那契数列函数',
  '用 Python 写一个 hello world',
  '用 JavaScript 写一个数组去重函数',
  '写一个简单的二分查找',
  '用一行代码翻转一个字符串',
  '写一个判断回文字符串的函数',
  '写一个简单的栈的实现',
  '用 TypeScript 写一个 sleep 函数',
  '写一个计算阶乘的递归函数',

  // Quick explanations
  '用一句话解释什么是递归',
  '什么是费曼学习法？简单说说',
  '简单解释一下什么是闭包',
  'HTTP 和 HTTPS 的区别是什么？',
  '什么是 REST API？一句话概括',
  'Git rebase 和 merge 有什么区别？',
  '解释一下什么是设计模式中的单例模式',
  '什么是 Docker？用大白话说',
  'TCP 和 UDP 的区别是什么？',
  '什么是微服务架构？简单说',

  // Fun & creative
  '随机讲一个冷笑话',
  '讲一个程序员笑话',
  '给我说一个脑筋急转弯',
  '你知道什么有趣的冷知识吗？',
  '讲一个关于程序员和产品经理的段子',
  '说一个让人会心一笑的双关语',
  '你能讲一个反转结局的小故事吗？',
  '编一个只有两句话的恐怖故事',
  '说一句听起来很深奥但其实没意义的话',
  '如果代码会说话，它会说什么？',

  // Writing & prose
  '写一首50字的散文，主题随意',
  '用30字描述一下春天',
  '写一首关于代码的小诗',
  '用50字描写一个下雨的午后',
  '写一段关于咖啡的优美文字',
  '用三句话描述一个日落的场景',
  '写一首关于星空的俳句',
  '用文字描绘一下你想象中的未来城市',
  '写一段关于深夜编程的随想',
  '用50字写一个关于猫的小故事',

  // Recommendations
  '推荐一本值得读的书',
  '推荐一部好看的电影',
  '今天适合喝什么饮料？',
  '推荐一首适合编程时听的歌',
  '有什么好用的效率工具推荐吗？',
  '推荐一个适合周末做的小项目',
  '推荐一款好用的终端工具',
  '有什么好的编程学习资源推荐？',
  '推荐一个有趣的 GitHub 项目',
  '今天午餐吃什么好？给个建议',

  // Trivia & knowledge
  '给我讲一个有趣的历史小故事',
  '说一个关于数学的有趣事实',
  '你知道互联网是怎么发明的吗？简单说说',
  '世界上最早的编程语言是什么？',
  'Linux 是怎么诞生的？',
  '为什么程序员从 0 开始计数？',
  '第一个计算机 bug 是怎么来的？',
  'JavaScript 为什么叫 JavaScript？',
  'Python 这个名字的由来是什么？',
  '二进制是谁发明的？',

  // Quick math & puzzles
  '1到100的所有整数之和是多少？',
  '一个经典的鸡兔同笼问题：有35个头，94只脚，问鸡和兔各几只？',
  '如何用6根火柴棍摆出4个等边三角形？',
  '一个房间有3个开关控制另一个房间的3盏灯，你只能进另一个房间一次，怎么判断？',
  '0.1 + 0.2 为什么不等于 0.3？',

  // Daily life
  '你觉得早起好还是晚睡好？',
  '如何保持专注力？给个小建议',
  '有什么简单的放松方法？',
  '怎么高效地安排一天的时间？',
  '你觉得什么样的工作环境最高效？',

  // Philosophical & fun questions
  '如果时间可以暂停，你最想做什么？',
  '你觉得AI会有意识吗？',
  '如果可以瞬间学会一项技能，你选什么？',
  '你觉得人类最伟大的发明是什么？',
  '如果外星人来地球，我们应该先教他们什么？',
  '你觉得 tabs 还是 spaces 更好？',
  '如果编程语言是人，哪个最有个性？',
  '你觉得100年后的程序员还需要写代码吗？',
  'Vim 和 Emacs 哪个好？',
  '你觉得最被低估的编程语言是什么？',
];

/**
 * Pick a random prompt from the given pool, or from built-in pool if empty.
 */
export function pickRandomPrompt(customPool?: string[]): string {
  const pool = customPool && customPool.length > 0 ? customPool : BUILTIN_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

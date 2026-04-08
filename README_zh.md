# CC-PILOT

**Claude Code Auto Pilot** — 赛博朋克风格的 Claude Code 调度器 + 知识学习引擎

**[English](README.md)** | **[中文文档](README_zh.md)**

<p align="center">
  <img src="https://img.shields.io/npm/v/@springblade/cc-pilot?color=cyan&style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="node version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87%20%7C%20%D0%A0%D0%A3%D0%A1%20%7C%20DE%20%7C%20FR-magenta?style=flat-square" alt="i18n" />
</p>

---

CC-PILOT 是一款 CLI 工具，用于**自动定时调度和触发 Claude Code 对话**，同时也是一个**知识学习引擎**。它能智能触发 Claude Code 的 5 小时速率限制窗口，同时通过推送通知为你推送精选知识（技术、英语、医学、法律、心理学，以及自定义类别）。

> **一举两得**：保持 Claude Code 5 小时窗口活跃，**同时**通过每次定时触发学习各领域知识。

## 核心特性

- **方向键导航菜单** — 主题化交互式菜单，支持方向键选择，匹配全部 6 种视觉主题
- **首次运行自动配置** — 引导式向导，内置 3 个预设任务，开箱即用
- **3 种任务类型** — 定时任务（cron）、随机任务（时间范围）、窗口任务（自动填充间隙）
- **5 小时窗口追踪** — 自动检测限流，推迟到下一个窗口
- **测试模式** — 即时触发任务，实时查看 Claude 的响应，面板风格交互界面
- **主题系统** — 6 种主题：cyber（默认）、mono、neon、matrix、classic、vapor，初始化时可选
- **无边框赛博朋克 UI** — 区块标题 + 装饰线条，无边框字符
- **模型选择** — 可配置 Claude 模型（`claude_model` 字段，通过 `--model` 传递）
- **多语言支持** — English、中文、Русский、Deutsch、Français
- **知识学习模式** — 5 大内置类别（技术、英语、医学、法律、心理）+ 自定义类别，通过推送通知推送知识
- **防重复引擎** — 洗牌迭代机制，每个类别约 150+ 个不重复问题周期，配合 AI 级近期话题提示
- **动态 Prompt 引擎** — 模板 × 维度池 = 1,500+ 种组合/语言，跟随界面语言自动切换
- **版本感知守护进程** — 升级后进入菜单自动重启 daemon，无需手动 stop/start
- **守护进程** — 后台调度 + 系统服务注册（开机自启）
- **消息通知** — 钉钉 & 飞书 Webhook 通知，每次任务执行（成功、失败、限流）均推送
- **执行历史与日志** — 按天滚动日志、任务级历史记录

---

## 安装

```bash
npm install -g @springblade/cc-pilot
```

或直接使用 npx 运行：

```bash
npx @springblade/cc-pilot
```

## 快速开始

```bash
# 直接运行，首次启动会自动进入配置向导
cc-pilot
```

就这么简单。首次运行时，CC-PILOT 会：

1. 检测到无配置文件，自动启动配置向导
2. 让你选择语言、Claude 路径（自动检测）、Claude 模型、主题风格
3. 展示 3 个内置预设任务（确认或自定义）
4. 保存配置，**自动启动调度守护进程**，并进入交互式菜单

一条命令搞定一切，无需额外执行 `start`。

---

## 知识学习

CC-PILOT 同时也是一个智能**知识学习工具**。每次定时任务都会从你选择的知识类别中自动生成问题，通过推送通知（钉钉/飞书）推送给你碎片化的知识点。配置好你感兴趣的类别、开启通知，每次触发都能学到新知识——同时保持你的 Claude Code 窗口活跃。

### 内置类别

| 类别 | 涵盖主题 |
|------|----------|
| **技术** | 编程语言、框架、DevOps、数据库、协议 |
| **英语** | 词汇、习语、语法、发音、学术写作 |
| **医学** | 营养、睡眠科学、急救、运动、心理健康 |
| **法律** | 合同、消费者权益、劳动法、隐私、知识产权 |
| **心理** | 认知偏误、习惯养成、动机、压力管理 |

### 防重复保证

每个类别的所有 `维度 × 模板` 组合（约 120-200 个/类别）被洗牌后排成队列。系统按顺序迭代，**保证在一个完整周期内零重复**。同时将近期话题作为上下文提示传递给 AI，进一步提升多样性。

### 自定义类别

通过名称和描述添加你自己的类别，系统会自动生成针对性的 prompt：

```yaml
global:
  knowledge_categories:
    - tech
    - medical
    - cooking           # 自定义类别
  custom_categories:
    - id: cooking
      name: 烹饪与食谱
      description: 家常烹饪技巧、食材知识、食品科学
```

### 配置方式

通过交互式菜单 `[K]` 键、`cc-pilot knowledge` 命令、或直接编辑 `config.yml`。

**使用场景示例**：选择医学 + 英语类别，开启钉钉通知，每天通过推送通知接收 3 个知识点——同时保持 Claude Code 窗口活跃。

---

## 首次运行向导

首次运行 `cc-pilot` 时，配置向导会自动启动：

```
  ━━━ ▸ WELCOME / 欢迎 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    首次运行 CC-PILOT！
    让我们来配置你的调度方案。

? 选择语言 / Select language: 中文
  ✓ 检测到 Claude CLI: /usr/local/bin/claude
? Claude CLI 路径: /usr/local/bin/claude
? Claude 模型: claude-sonnet-4-6 (fast, recommended)
? 主题风格: cyber (Cyberpunk)
```

向导会展示 3 个默认预设任务：

```
  ━━━ ▸ 默认任务 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ● morning-activate   ── 07:00-08:00 每天随机
      prompt: (动态生成技术类 prompt)

    ● noon-activate      ── 12:00-13:00 每天随机
      prompt: (动态生成技术类 prompt)

    ● evening-activate   ── 17:00-18:00 每天随机
      prompt: (动态生成技术类 prompt)

? 使用以上默认任务？ 是
? 工作目录（所有默认任务）: ~/projects/my-app
? 需要自定义每个任务的 prompt 吗？ 否
```

你可以直接使用默认配置，也可以自定义 prompt、修改工作目录、或追加更多任务。确认后：

```
  ━━━ ▸ 配置完成 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ✓ 配置已保存到 ~/.cc-pilot/config.yml
    ✓ 已配置 3 个任务

    提示：在菜单中使用 [7] 启动调度器
```

---

## 交互式菜单

配置完成后，守护进程自动启动，进入支持**方向键导航**的交互式菜单 —— 样式自动跟随所选主题：

```
  ██████╗ ██████╗   ██████╗ ██╗██╗      ██████╗ ████████╗
 ██╔════╝██╔════╝   ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
 ██║     ██║        ██████╔╝██║██║     ██║   ██║   ██║
 ██║     ██║        ██╔═══╝ ██║██║     ██║   ██║   ██║
 ╚██████╗╚██████╗   ██║     ██║███████╗╚██████╔╝   ██║
  ╚═════╝ ╚═════╝   ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝
  C L A U D E   C O D E   A U T O   P I L O T   v1.2.0

  ● ONLINE    UPTIME 03:41:22    TODAY 5    TASKS 3
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ▸ 任务控制 ───────────────────────────────────
  ❯ 列表    ── 查看任务注册表
    新增    ── 部署新任务
    编辑    ── 修改任务参数
    删除    ── 清除任务
    开关    ── 启用/禁用任务
    测试    ── 触发任务并实时查看响应
  ▸ 守护进程 ───────────────────────────────────
    启动    ── 启动调度引擎
    停止    ── 停止调度引擎
    状态    ── 运行状态面板
  ...
  ──────────────────────────────────────────────
    知识    ── 知识学习类别配置
    语言    ── EN | 中文 | РУС | DE | FR
    主题    ── cyber | mono | neon | matrix | classic | vapor
    关于    ── 作者与项目信息
```

使用 **↑/↓ 方向键** 导航，**回车键** 确认选择。菜单颜色和字符自动适配所选主题。

---

## 测试模式

在菜单中选择 `[6] 测试` 或运行 `cc-pilot tasks test`，即可立即触发任务并在面板界面中查看 Claude 的响应：

```
  ▸ 你  TASK morning-activate  CWD ~/projects/my-app  TIME 07:23:14

    （每次执行随机选一个轻量 prompt）

  ▸ CLAUDE

    我来为你审查当前项目状态。

    **仓库概况：**
    - 自上次审查以来有 12 个文件变更
    - 3 个待处理的 Pull Request
    - 所有测试通过（47/47）

    **主要变更：**
    - 新增用户认证模块
    - 修复连接池内存泄漏问题
    - 更新依赖至最新版本
    ...

    ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    ● 成功  47s  1.8k tokens
```

界面会实时显示 Claude 的响应内容，让你即时了解任务 prompt 的执行效果。

---

## 任务类型

CC-PILOT 支持三种调度模式，覆盖所有使用场景：

### 定时任务（Fixed）

使用 cron 表达式在精确时间执行。

```yaml
- name: "daily-report"
  type: fixed
  cron: "30 17 * * *"              # 每天 17:30
  prompt: |
    查阅当前仓库今天的所有 git commit 记录，
    按格式生成日报保存到 docs/daily/ 目录
  cwd: ~/projects/my-app
  enabled: true
```

**适用场景：** 每日代码审查、测试分析、日报生成。

### 随机任务（Random）

在指定时间范围内随机触发。首次运行向导的 3 个预设任务均为此类型。

```yaml
- name: "morning-activate"
  type: random
  time_range: "07:00-08:00"        # 7:00-8:00 之间随机
  days: "*"                         # 每天（* = 每天, 1-5 = 工作日）
  prompt: "自动"                # 留空 / "auto" / "自动" = 动态生成
  cwd: ~/projects/my-app
  enabled: true
```

**适用场景：** 窗口激活、随机健康检查。

### 窗口任务（Window）

在每个新的 5 小时窗口开始的第一个小时内自动触发。

```yaml
- name: "window-keeper"
  type: window
  active_hours: "08:00-23:00"      # 仅在此时间范围内
  trigger_offset: "0-60m"          # 新窗口开始后 0-60 分钟内随机
  prompts:                          # 每次随机选一个
    - "审查最近的代码变更"
    - "检查依赖是否有安全漏洞"
    - "列出并分析 TODO 注释"
  cwd: ~/projects/my-app
  enabled: true
```

**适用场景：** 最大化窗口利用率，保持会话活跃。

---

## 状态面板

通过 `cc-pilot status` 或菜单选项 `[9]` 查看详细运行信息：

```
  ━━━ 运行状态 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PID       18742
  运行时间   03:41:22
  状态       ● 监控中

  ━━━ 窗口追踪器 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  当前进度   ██████████████░░░░░░░░░░░░  55%
  开始时间   14:22:03
  结束时间   19:22:03  ── 剩余 2h15m
  已执行     本窗口 2 次

  ━━━ 今日统计 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总计       ████████░░  5
  成功       █████████░  4
  限流       █░░░░░░░░░  1
  令牌       已消耗 12.4k
```

---

## 配置说明

配置文件存储在 `~/.cc-pilot/config.yml`，首次运行时自动生成，也可直接编辑或通过 `cc-pilot init` 重新初始化。

### 默认配置

由首次运行向导生成的预设配置：

```yaml
global:
  claude_path: claude
  claude_model: claude-sonnet-4-6
  blackout:
    - "02:00-06:00"
  log_dir: ~/.cc-pilot/logs
  window_duration: 5h
  language: zh
  ui_size: medium
  theme: cyber
  knowledge_categories:            # 启用的知识类别
    - tech
  # custom_categories:             # 可选：自定义类别
  #   - id: cooking
  #     name: 烹饪与食谱
  #     description: 家常烹饪技巧、食材知识
  # prompt_pool:                   # 可选：自定义 prompt 池（覆盖所有生成器）

tasks:
  - name: morning-activate
    type: random
    time_range: "07:00-08:00"
    days: "*"
    prompt: ""                    # 留空或填 "auto"/"自动" = 动态生成
    cwd: ~/projects/my-app
    enabled: true

  - name: noon-activate
    type: random
    time_range: "12:00-13:00"
    days: "*"
    prompt: "自动"                # "auto"/"自动" = 等同于留空
    cwd: ~/projects/my-app
    enabled: true

  - name: evening-activate
    type: random
    time_range: "17:00-18:00"
    days: "*"
    prompt: ""
    cwd: ~/projects/my-app
    enabled: true
```

### 配置字段说明

| 字段 | 说明 |
|------|------|
| `global.claude_path` | `claude` CLI 二进制文件路径（默认：`claude`） |
| `global.claude_model` | Claude 模型，通过 `--model` 参数传递（默认：`claude-sonnet-4-6`） |
| `global.blackout` | 禁止执行任务的时间段数组 |
| `global.window_duration` | Claude Code 限流窗口时长（默认：`5h`） |
| `global.language` | 界面语言：`en`、`zh`、`ru`、`de`、`fr` |
| `global.ui_size` | 终端 UI 面板尺寸：`small`、`medium`、`large` |
| `global.theme` | UI 主题：`cyber`、`mono`、`neon`、`matrix`、`classic`、`vapor`（默认：`cyber`） |
| `global.prompt_pool` | 自定义 prompt 池，配置后覆盖内置动态 prompt 生成器 |
| `global.knowledge_categories` | 启用的知识类别：`tech`、`english`、`medical`、`legal`、`psychology` 或自定义 ID（默认：`['tech']`）|
| `global.custom_categories` | 用户自定义知识类别（`{id, name, description}` 数组）|
| `tasks[].name` | 任务唯一标识 |
| `tasks[].type` | 任务类型：`fixed`、`random`、`window` |
| `tasks[].cwd` | Claude Code 执行的工作目录 |
| `tasks[].enabled` | 启用/禁用（无需删除即可暂停） |
| `tasks[].prompt_categories` | 任务级知识类别（prompt 为 "auto" 时覆盖全局设置）|

---

## 命令列表

所有命令也可通过交互式菜单访问。

```bash
cc-pilot                     # 自动配置 + 自动启动守护进程 + 交互式菜单
cc-pilot init                # 重新初始化配置向导
cc-pilot start               # 手动启动调度守护进程
cc-pilot stop                # 停止调度守护进程
cc-pilot status              # 显示运行状态面板

cc-pilot tasks list          # 查看所有任务
cc-pilot tasks add           # 新增任务（交互式）
cc-pilot tasks remove        # 删除任务
cc-pilot tasks toggle        # 启用/禁用任务
cc-pilot tasks test          # 触发任务并实时查看响应
cc-pilot tasks history       # 查看任务执行历史

cc-pilot knowledge           # 配置知识学习类别

cc-pilot log                 # 查看今日执行日志
cc-pilot log -n 50           # 查看最近 50 行日志
cc-pilot window              # 显示窗口状态监控

cc-pilot install             # 注册为系统开机自启服务
cc-pilot uninstall           # 移除系统开机自启服务
```

---

## 执行日志

通过 `cc-pilot log` 或菜单选项 `[10]` 查看实时执行日志：

```
  ━━━ 实时日志  2026-04-07 ━━━━━━━━━ Ctrl+C 退出 ━━━━━━━━

  07:23:14 ▸ 触发   morning-activate
  07:23:14 ▸ 执行   claude -p "简单介绍下 Docker..." --model claude-sonnet-4-6
  07:24:01 ▸ 完成   morning-activate  47s  1.8k
  07:24:01 ▸ 调度   下次: noon-activate @ 12:37
  12:37:22 ▸ 触发   noon-activate
  12:37:23 ▸ 失败   限流  19:22 后重试
  17:14:55 ▸ 触发   evening-activate
  17:15:38 ▸ 完成   evening-activate  43s  2.1k
```

---

## 任务历史

通过 `cc-pilot tasks history` 或菜单选项 `[11]` 查看执行记录：

```
  ━━━ 历史记录 ━━ morning-activate ━━━━━━━━━━━━━━━━━━━━━━━

  时间                  耗时      状态     令牌
  ──────────────────── ──────── ──────── ────────
  2026-04-07 07:23:14   47s      ✓ 完成   1.8k
  2026-04-06 07:41:02   38s      ✓ 完成   1.5k
  2026-04-05 07:15:33   12s      ✗ 限流   -
```

---

## 主题系统

CC-PILOT 内置 6 种主题，可在初始化向导中选择，或通过编辑 `config.yml` 切换：

| 主题 | 说明 |
|------|------|
| `cyber` | 赛博朋克 — 黄/青/红粉色调（默认） |
| `mono` | 单色 — 简洁黑白灰 |
| `neon` | 霓虹赛博朋克 — 青色/品红渐变 |
| `matrix` | 矩阵 — 绿色终端风格 |
| `classic` | 经典 — 无颜色，纯文本 |
| `vapor` | 蒸汽波 — 粉紫青色调 |

```yaml
global:
  theme: cyber    # cyber | mono | neon | matrix | classic | vapor
```

---

## 消息通知

CC-PILOT 支持通过**钉钉**和**飞书** Webhook 推送任务执行通知。每次任务执行均会推送——无论成功、失败还是限流，手动测试（`[6] 测试`）和自动调度均生效。

通过交互式菜单配置：

```
▸ 通知 ───────────────────────────────────
[13] 钉钉  ── 钉钉通知配置
[14] 飞书  ── 飞书通知配置
```

每个通知渠道提供：
- **设置 Token** — 输入钉钉机器人 Token 或飞书机器人 Hook ID
- **开启/关闭** — 切换通知开关
- **发送测试** — 发送测试消息，不调用 Claude

### 配置

```yaml
notify:
  dingtalk:
    token: "你的钉钉机器人-token"
    enabled: true
  feishu:
    token: "你的飞书机器人-hook-id"
    enabled: true
```

### 通知内容

每条通知包含：任务名、Prompt、执行时间、模型、耗时、Token 数、Claude 完整回复（超过 2000 字符自动截断）。消息标题根据执行结果自动切换：

| 状态 | 标题 |
|------|------|
| 成功 | ✅ CC-PILOT · Task Complete |
| 失败 | ❌ CC-PILOT · Task Failed |
| 限流 | ⚠️ CC-PILOT · Rate Limited |

---

## 系统服务

注册 CC-PILOT 为系统服务，实现开机自启：

```bash
cc-pilot install       # 注册服务
cc-pilot uninstall     # 移除服务
```

| 平台 | 机制 |
|------|------|
| macOS | `launchd` plist，位于 `~/Library/LaunchAgents/` |
| Linux | `systemd` 用户级服务 |
| Windows | 任务计划程序（`schtasks`） |

---

## 调度逻辑

```
首次运行 → 自动配置向导 → 保存配置
                              ↓
            自动启动守护进程 → 进入交互式菜单
                              ↓
启动 → 加载配置 → 计算下次触发时间 → 等待
              ↓
      到达触发时间 → 检查 active_hours 和 blackout
              ↓ 是                        ↓ 否
      选择任务 → 通过 claude -p 执行       推迟到下一个合法时间点
                 (带 --model 参数)
              ↓
      成功 → 记录日志 → 按 5h 窗口计算下次时间
      限流 → 检测 → 推迟到窗口重置后
```

**核心行为：**

- **首次运行** — 自动检测缺失配置，启动配置向导并提供 3 个预设任务，完成后自动启动守护进程
- **模型选择** — 配置中的 `claude_model` 通过 `--model` 参数传递给 Claude CLI
- **定时任务**：精确在 cron 时间触发（黑名单时段跳过）
- **随机任务**：每天午夜预计算当天的随机触发时间
- **窗口任务**：监听窗口状态变化，在 `trigger_offset` 范围内触发
- **限流检测**：解析 Claude Code 输出中的限流信号，自动推迟
- **黑名单时段**：黑名单期间不会触发任何任务

---

## 数据存储

所有数据存储在 `~/.cc-pilot/` 目录下：

```
~/.cc-pilot/
├── config.yml          # 用户配置（首次运行自动生成）
├── state.json          # 运行时状态（守护进程 PID、窗口状态）
├── history.json        # 执行历史（最近 500 条）
└── logs/
    ├── 2026-04-07.log  # 按天滚动日志
    └── 2026-04-06.log
```

---

## 多语言支持

随时通过交互式菜单 `[L]` 键、`cc-pilot init` 或直接编辑 `config.yml` 切换语言：

```yaml
global:
  language: zh    # en | zh | ru | de | fr
```

| 代码 | 语言 |
|------|------|
| `en` | English（默认） |
| `zh` | 中文 |
| `ru` | Русский |
| `de` | Deutsch |
| `fr` | Français |

---

## 环境要求

- **Node.js** >= 18.0.0
- **Claude Code CLI** 已安装且可访问（`claude` 命令）

---

## 开发

```bash
git clone https://github.com/chillzhuang/cc-pilot.git
cd cc-pilot
npm install
npm run build            # 编译 TypeScript
npm run dev              # 通过 tsx 从源码运行
```

### 项目结构

```
src/
├── index.ts             # CLI 入口（Commander.js）
├── menu.ts              # 赛博朋克交互式菜单
├── types.ts             # 共享类型定义
├── commands/            # 9 个命令模块
│   ├── init.ts          #   首次运行向导 + 配置初始化
│   ├── start.ts         #   启动守护进程
│   ├── stop.ts          #   停止守护进程
│   ├── status.ts        #   运行状态面板
│   ├── tasks.ts         #   任务增删改查 + 测试 + 历史
│   ├── knowledge.ts     #   知识类别配置
│   ├── log.ts           #   执行日志查看器
│   ├── window.ts        #   窗口状态监控
│   └── install.ts       #   系统服务注册
├── core/                # 8 个核心模块
│   ├── config.ts        #   YAML 配置加载/保存
│   ├── state.ts         #   运行时状态持久化
│   ├── scheduler.ts     #   调度引擎
│   ├── executor.ts      #   Claude CLI 调用（--model 支持）
│   ├── window.ts        #   5h 窗口追踪器
│   ├── knowledge.ts     #   知识类别引擎（5 大内置 + 自定义）
│   ├── prompts.ts       #   动态 Prompt 生成器（模板 × 维度）
│   ├── daemon.ts        #   守护进程生命周期管理（版本感知）
│   └── daemon-entry.ts  #   守护进程入口
├── i18n/                # 国际化
│   ├── index.ts         #   t() 函数 + 语言加载器
│   ├── types.ts         #   翻译 Schema
│   └── locales/         #   EN, ZH, RU, DE, FR
├── ui/                  # 无边框赛博朋克终端 UI
│   ├── theme.ts         #   6 种主题、颜色、渐变
│   ├── banner.ts        #   ASCII 艺术字 + 状态栏
│   └── render.ts        #   区块、面板、进度条渲染
└── utils/               # 工具模块
    ├── paths.ts         #   ~/.cc-pilot 路径常量
    ├── logger.ts        #   文件 + 控制台日志
    ├── platform.ts      #   系统服务注册助手
    └── time.ts          #   时间范围解析与格式化
```

---

## 许可证

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with Claude Code + Blade Storm</sub>
</p>

# CC-PILOT

**Claude Code Auto Pilot** — Cyberpunk-styled intelligent conversation scheduler

**[English](README.md)** | **[中文文档](README_zh.md)**

<p align="center">
  <img src="https://img.shields.io/npm/v/@springblade/cc-pilot?color=cyan&style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="node version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87%20%7C%20%D0%A0%D0%A3%D0%A1%20%7C%20DE%20%7C%20FR-magenta?style=flat-square" alt="i18n" />
</p>

---

CC-PILOT is a CLI tool that **automatically schedules and triggers Claude Code conversations** on a timer. It maximizes your Claude Code usage by intelligently managing the 5-hour rate-limit window — auto-scheduling tasks, detecting rate limits, and deferring to the next available window.

## Features

- **First-Run Auto Setup** — Guided wizard with 3 built-in preset tasks on first launch
- **3 Task Types** — Fixed (cron), Random (time range), Window (auto-fill gaps)
- **5h Window Tracking** — Detects rate limits, auto-defers to next window
- **Test Mode** — Instantly trigger a task and watch Claude's streaming response in a live panel-style interface
- **Theme System** — 5 themes: mono (default), neon, matrix, classic, vapor — selectable during init
- **Borderless Cyberpunk UI** — Section headers with decorative lines, no box borders
- **Model Selection** — Choose your Claude model (`claude_model` config field, passed via `--model`)
- **i18n** — English, 中文, Русский, Deutsch, Français
- **Daemon Process** — Background scheduling with system service registration
- **Notifications** — DingTalk & Feishu webhook notifications on every task execution (success, error, rate-limited)
- **Execution History & Logs** — Daily rolling logs, per-task history tracking

---

## Installation

```bash
npm install -g @springblade/cc-pilot
```

Or run directly with npx:

```bash
npx @springblade/cc-pilot
```

## Quick Start

```bash
# Just run it — first launch auto-triggers the setup wizard
cc-pilot
```

That's it. On first run, CC-PILOT will:

1. Detect no config exists and launch the setup wizard
2. Ask you to select a language, Claude path (auto-detected), Claude model, and theme
3. Offer 3 built-in preset tasks (confirm or customize)
4. Save config, **auto-start the scheduling daemon**, and enter the interactive menu

Everything is handled in a single command — no separate `start` step needed.

---

## First-Run Setup Wizard

When you run `cc-pilot` for the first time, the setup wizard launches automatically:

```
  ━━━ ▸ WELCOME / 欢迎 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    First time running CC-PILOT!
    Let's set up your configuration.

? Select language / 选择语言: English
  ✓ Claude CLI detected: /usr/local/bin/claude
? Path to Claude CLI binary: /usr/local/bin/claude
? Claude model: claude-sonnet-4-6 (fast, recommended)
? Theme: mono (Monochrome)
```

The wizard presents 3 default preset tasks:

```
  ━━━ ▸ DEFAULT TASKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ● morning-activate   ── 07:00-08:00 random daily
      prompt: (random from 100 built-in light prompts)

    ● noon-activate      ── 12:00-13:00 random daily
      prompt: (random from 100 built-in light prompts)

    ● evening-activate   ── 17:00-18:00 random daily
      prompt: (random from 100 built-in light prompts)

? Add a task? (use defaults above) Yes
? Working directory (for all default tasks): ~/projects/my-app
? Customize task prompts? No
```

You can accept the defaults, customize prompts, change the working directory, or add additional tasks. After confirmation:

```
  ━━━ ▸ SETUP COMPLETE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ✓ Configuration saved to ~/.cc-pilot/config.yml
    ✓ 3 tasks configured

    Tip: Use [7] START in menu to launch the scheduler
```

---

## Interactive Menu

After setup, the daemon auto-starts and the borderless cyberpunk-styled interactive menu loads:

```
  ██████╗ ██████╗   ██████╗ ██╗██╗      ██████╗ ████████╗
 ██╔════╝██╔════╝   ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
 ██║     ██║        ██████╔╝██║██║     ██║   ██║   ██║
 ██║     ██║        ██╔═══╝ ██║██║     ██║   ██║   ██║
 ╚██████╗╚██████╗   ██║     ██║███████╗╚██████╔╝   ██║
  ╚═════╝ ╚═════╝   ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝
  C L A U D E   C O D E   A U T O   P I L O T   v1.0.0

  ● ONLINE    UPTIME 03:41:22    TODAY 5    TASKS 3
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ▸ TASK_CTRL ───────────────────────────────────
  [1] LIST  ── View task registry
  [2] ADD  ── Deploy new task
  [3] EDIT  ── Modify task params
  [4] REMOVE  ── Purge task
  [5] TOGGLE  ── Enable/disable task
  [6] TEST  ── Trigger task with live streaming view
  ▸ DAEMON ───────────────────────────────────
  [7] START  ── Launch scheduling engine
  [8] STOP  ── Halt scheduling engine
  [9] STATUS  ── Runtime status panel
  ▸ DATA_STREAM ───────────────────────────────────
  [10] LOG  ── Live execution stream
  [11] HISTORY  ── Task execution records
  [12] WINDOW  ── Window state monitor
  ▸ NOTIFY ───────────────────────────────────
  [13] DINGTALK  ── DingTalk notification settings
  [14] FEISHU  ── Feishu notification settings
  ▸ SYS_CONFIG ───────────────────────────────────
  [15] INIT  ── Initialize configuration
  [16] CONFIG  ── Edit config matrix
  [17] INSTALL  ── Register auto-boot
  [18] UNINSTALL  ── Remove auto-boot
  [19] EXIT  ── Keep daemon running and exit
  [20] SHUTDOWN  ── Stop daemon and exit

  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  [L] LANG   ── EN | 中文 | РУС | DE | FR
  [T] THEME  ── mono | neon | matrix | classic | vapor
  [X] ABOUT  ── Author & project info

  ░▒▓ INPUT ▓▒░
```

---

## Test Mode

Select `[6] TEST` from the menu or run `cc-pilot tasks test` to immediately trigger a task and watch Claude's response in a live streaming panel-style interface:

```
  ▸ YOU  TASK morning-activate  CWD .  TIME 07:23:14

    Good morning, write a simple bubble sort

  ▸ CLAUDE

    I'll review the current project status for you.

    **Repository Overview:**
    - 12 files changed since last review
    - 3 open pull requests
    - All tests passing (47/47)

    **Key Changes:**
    - Added user authentication module
    - Fixed memory leak in connection pool
    - Updated dependencies to latest versions
    ...

    ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    ● SUCCESS  47s  1.8k tokens
```

The streaming interface shows Claude's response in real time as it generates, giving you immediate feedback on how your task prompts perform.

---

## Task Types

CC-PILOT supports three scheduling modes to cover all use cases:

### Fixed Task (cron)

Execute at an exact time using a cron expression.

```yaml
- name: "daily-report"
  type: fixed
  cron: "30 17 * * *"              # Every day at 17:30
  prompt: |
    Check today's git commits in this repo
    and generate a daily report to docs/daily/
  cwd: ~/projects/my-app
  enabled: true
```

**Use case:** Daily code review, test analysis, report generation.

### Random Task (time range)

Trigger at a random time within a specified range. The 3 default preset tasks use this type.

```yaml
- name: "morning-activate"
  type: random
  time_range: "07:00-08:00"        # Random time between 7:00-8:00
  days: "*"                         # Every day (* = all, 1-5 = weekdays)
  prompt: "Good morning, write a simple bubble sort"
  cwd: ~/projects/my-app
  enabled: true
```

**Use case:** Window activation, randomized health checks.

### Window Task (auto-fill)

Automatically trigger in the first hour of each new 5h window.

```yaml
- name: "window-keeper"
  type: window
  active_hours: "08:00-23:00"      # Only within these hours
  trigger_offset: "0-60m"          # Random offset: 0-60 minutes into new window
  prompts:                          # Randomly picks one each time
    - "Review recent code changes"
    - "Check dependencies for security vulnerabilities"
    - "List and analyze TODO comments"
  cwd: ~/projects/my-app
  enabled: true
```

**Use case:** Maximize window utilization, keep sessions active.

---

## Status Panel

View detailed runtime information with `cc-pilot status` or menu option `[9]`:

```
  ━━━ STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PID       18742
  UPTIME    03:41:22
  STATE     ● WATCHING

  ━━━ WINDOW TRACKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CURRENT   ██████████████░░░░░░░░░░░░  55%
  OPENED    14:22:03
  CLOSES    19:22:03  ── 2h15m remaining
  EXECUTED  2 calls this window

  ━━━ TODAY STATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOTAL      ████████░░  5
  SUCCESS    █████████░  4
  RATE_LMT   █░░░░░░░░░  1
  TOKENS     12.4k consumed
```

---

## Configuration

Configuration is stored at `~/.cc-pilot/config.yml`. Auto-generated on first run, can be edited directly or re-initialized with `cc-pilot init`.

### Default Configuration

Generated by the first-run wizard with preset tasks:

```yaml
global:
  claude_path: claude
  claude_model: claude-sonnet-4-6
  blackout:
    - "02:00-06:00"
  log_dir: ~/.cc-pilot/logs
  window_duration: 5h
  language: en
  ui_size: medium
  theme: mono
  # prompt_pool:                   # optional: custom random prompts
  #   - "Hello, how are you?"
  #   - "Write a haiku"
  #   - "Tell me a joke"

tasks:
  - name: morning-activate
    type: random
    time_range: "07:00-08:00"
    days: "*"
    prompt: ""                    # empty = random from built-in pool
    cwd: ~/projects/my-app
    enabled: true

  - name: noon-activate
    type: random
    time_range: "12:00-13:00"
    days: "*"
    prompt: ""
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

### Configuration Fields

| Field | Description |
|-------|-------------|
| `global.claude_path` | Path to the `claude` CLI binary (default: `claude`) |
| `global.claude_model` | Claude model to use, passed via `--model` flag (default: `claude-sonnet-4-6`) |
| `global.blackout` | Array of time ranges where no tasks will execute |
| `global.window_duration` | Claude Code rate-limit window duration (default: `5h`) |
| `global.language` | Interface language: `en`, `zh`, `ru`, `de`, `fr` |
| `global.ui_size` | Terminal UI panel size: `small`, `medium`, `large` |
| `global.theme` | UI theme: `mono`, `neon`, `matrix`, `classic`, `vapor` (default: `mono`) |
| `global.prompt_pool` | Custom random prompt pool. If set, overrides built-in 100 prompts |
| `tasks[].name` | Unique task identifier |
| `tasks[].type` | `fixed`, `random`, or `window` |
| `tasks[].cwd` | Working directory for Claude Code execution |
| `tasks[].enabled` | Enable/disable without removing |

---

## CLI Commands

All commands are also accessible via the interactive menu.

```bash
cc-pilot                     # Auto-setup + auto-start daemon + interactive menu
cc-pilot init                # Re-initialize configuration wizard
cc-pilot start               # Manually start scheduling daemon
cc-pilot stop                # Stop scheduling daemon
cc-pilot status              # Show runtime status panel

cc-pilot tasks list          # List all tasks
cc-pilot tasks add           # Add a new task (interactive)
cc-pilot tasks remove        # Remove a task
cc-pilot tasks toggle        # Enable/disable a task
cc-pilot tasks test          # Trigger a task with live streaming view
cc-pilot tasks history       # View task execution history

cc-pilot log                 # View today's execution log
cc-pilot log -n 50           # View last 50 log lines
cc-pilot window              # Show window state monitor

cc-pilot install             # Register as system auto-start service
cc-pilot uninstall           # Remove system auto-start service
```

---

## Execution Log

View real-time execution logs with `cc-pilot log` or menu option `[10]`:

```
  ━━━ LIVE LOG  2026-04-07 ━━━━━━━━━ Ctrl+C to exit ━━━━━━

  07:23:14 ▸ FIRE   morning-activate
  07:23:14 ▸ EXEC   claude -p "Review project..." --model claude-sonnet-4-6
  07:24:01 ▸ DONE   morning-activate  47s  1.8k
  07:24:01 ▸ SCHED  next: noon-activate @ 12:37
  12:37:22 ▸ FIRE   noon-activate
  12:37:23 ▸ FAIL   RATE_LIMITED  retry 19:22
  17:14:55 ▸ FIRE   evening-activate
  17:15:38 ▸ DONE   evening-activate  43s  2.1k
```

---

## Task History

View per-task execution records with `cc-pilot tasks history` or menu option `[11]`:

```
  ━━━ HISTORY ━━ morning-activate ━━━━━━━━━━━━━━━━━━━━━━━━━

  TIME                 DURATION  STATUS    TOKENS
  ─────────────────── ───────── ──────── ────────
  2026-04-07 07:23:14  47s       ✓ done    1.8k
  2026-04-06 07:41:02  38s       ✓ done    1.5k
  2026-04-05 07:15:33  12s       ✗ rate    -
```

---

## Theme System

CC-PILOT ships with 5 built-in themes, selectable during the init wizard or by editing `config.yml`:

| Theme | Description |
|-------|-------------|
| `mono` | Monochrome — clean black/white/gray (default) |
| `neon` | Neon Cyberpunk — cyan/magenta gradients |
| `matrix` | Matrix — green terminal aesthetic |
| `classic` | Classic — no colors, plain text |
| `vapor` | Vaporwave — pink/purple/cyan palette |

```yaml
global:
  theme: mono    # neon | mono | matrix | classic | vapor
```

---

## Notifications

CC-PILOT supports webhook notifications via **DingTalk** and **Feishu**. Notifications are sent on every task execution — success, error, and rate-limited — for both manual test (`[6] TEST`) and automated scheduling.

Configure via the interactive menu:

```
▸ NOTIFY ───────────────────────────────────
[13] DINGTALK  ── DingTalk notification settings
[14] FEISHU   ── Feishu notification settings
```

Each channel provides:
- **Set Token** — Enter your DingTalk Robot Token or Feishu Bot Hook ID
- **Enable/Disable** — Toggle notifications on/off
- **Send Test** — Send a test message without calling Claude

### Configuration

```yaml
notify:
  dingtalk:
    token: "your-dingtalk-robot-token"
    enabled: true
  feishu:
    token: "your-feishu-bot-hook-id"
    enabled: true
```

### Notification Content

Each notification includes: task name, prompt, execution time, model, duration, token count, and Claude's full response (truncated at 2000 chars). The message header reflects the execution result:

| Status | DingTalk | Feishu |
|--------|----------|--------|
| Success | ✅ CC-PILOT · Task Complete | ✅ CC-PILOT · Task Complete |
| Error | ❌ CC-PILOT · Task Failed | ❌ CC-PILOT · Task Failed |
| Rate Limited | ⚠️ CC-PILOT · Rate Limited | ⚠️ CC-PILOT · Rate Limited |

---

## System Service

Register CC-PILOT as a system service for auto-start on boot:

```bash
cc-pilot install       # Register service
cc-pilot uninstall     # Remove service
```

| Platform | Mechanism |
|----------|-----------|
| macOS | `launchd` plist at `~/Library/LaunchAgents/` |
| Linux | `systemd` user service |
| Windows | Task Scheduler (`schtasks`) |

---

## Scheduling Logic

```
First Run → Auto Setup Wizard → Save Config
                                     ↓
             Auto-Start Daemon → Enter Interactive Menu
                                     ↓
Startup → Load Config → Calculate Next Trigger → Wait
                ↓
        Trigger Time Reached → Check active_hours & blackout
                ↓ yes                        ↓ no
        Pick Task → Execute via claude -p    Defer to next valid time
                    (with --model flag)
                ↓
        Success → Log → Schedule next (current + 5h window)
        Rate Limited → Detect → Defer to window reset
```

**Key behaviors:**

- **First run** — auto-detects missing config, launches setup wizard with 3 preset tasks, and auto-starts daemon
- **Model selection** — `claude_model` from config is passed as `--model` flag to the Claude CLI
- **Fixed tasks** fire exactly at cron time (skip if in blackout)
- **Random tasks** pre-calculate a random time for today at midnight
- **Window tasks** react to window state changes, trigger within `trigger_offset`
- **Rate limit detection** — parses Claude Code output for limit signals, auto-defers
- **Blackout enforcement** — no task fires during blackout periods, ever

---

## Data Storage

All data is stored under `~/.cc-pilot/`:

```
~/.cc-pilot/
├── config.yml          # User configuration (auto-generated on first run)
├── state.json          # Runtime state (daemon PID, window state)
├── history.json        # Execution history (last 500 entries)
└── logs/
    ├── 2026-04-07.log  # Daily rolling logs
    └── 2026-04-06.log
```

---

## i18n — Language Support

Switch language anytime via the interactive menu `[L]` key, `cc-pilot init`, or by editing `config.yml`:

```yaml
global:
  language: zh    # en | zh | ru | de | fr
```

| Code | Language |
|------|----------|
| `en` | English (default) |
| `zh` | 中文 |
| `ru` | Русский |
| `de` | Deutsch |
| `fr` | Français |

---

## Requirements

- **Node.js** >= 18.0.0
- **Claude Code CLI** installed and accessible (the `claude` command)

---

## Development

```bash
git clone https://github.com/chillzhuang/cc-pilot.git
cd cc-pilot
npm install
npm run build            # Compile TypeScript
npm run dev              # Run from source via tsx
```

### Project Structure

```
src/
├── index.ts             # CLI entry point (Commander.js)
├── menu.ts              # Interactive cyberpunk menu
├── types.ts             # Shared type definitions
├── commands/            # 8 command modules
│   ├── init.ts          #   First-run wizard + configuration setup
│   ├── start.ts         #   Start daemon
│   ├── stop.ts          #   Stop daemon
│   ├── status.ts        #   Runtime status panel
│   ├── tasks.ts         #   Task CRUD + test + history
│   ├── log.ts           #   Execution log viewer
│   ├── window.ts        #   Window state monitor
│   └── install.ts       #   System service registration
├── core/                # 7 core modules
│   ├── config.ts        #   YAML config loader/saver
│   ├── state.ts         #   Runtime state persistence
│   ├── scheduler.ts     #   Main scheduling engine
│   ├── executor.ts      #   Claude CLI invocation (--model support)
│   ├── window.ts        #   5h window tracker
│   ├── daemon.ts        #   Daemon lifecycle management
│   └── daemon-entry.ts  #   Daemon process entry point
├── i18n/                # Internationalization
│   ├── index.ts         #   t() function + locale loader
│   ├── types.ts         #   Translation schema
│   └── locales/         #   EN, ZH, RU, DE, FR
├── ui/                  # Borderless cyberpunk terminal UI
│   ├── theme.ts         #   5 themes, colors, gradients
│   ├── banner.ts        #   ASCII art + status bar
│   └── render.ts        #   Section, panel, progress rendering
└── utils/               # Utilities
    ├── paths.ts         #   ~/.cc-pilot path constants
    ├── logger.ts        #   File + console logger
    ├── platform.ts      #   OS-specific service helpers
    └── time.ts          #   Time range parsing & formatting
```

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with Claude Code + Blade Storm</sub>
</p>

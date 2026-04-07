/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
import { platform } from 'node:os';
import { writeFile, unlink, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const SERVICE_LABEL = 'com.cc-pilot.agent';
const CC_PILOT_ROOT = resolve(join(import.meta.dirname ?? '.', '..', '..'));

function launchAgentDir(): string {
  return join(homedir(), 'Library', 'LaunchAgents');
}

function plistPath(): string {
  return join(launchAgentDir(), `${SERVICE_LABEL}.plist`);
}

function systemdDir(): string {
  return join(homedir(), '.config', 'systemd', 'user');
}

function systemdServicePath(): string {
  return join(systemdDir(), 'cc-pilot.service');
}

function daemonPath(): string {
  return join(CC_PILOT_ROOT, 'dist', 'core', 'daemon.js');
}

export function getPlatform(): 'mac' | 'windows' | 'linux' {
  const p = platform();
  if (p === 'darwin') return 'mac';
  if (p === 'win32') return 'windows';
  return 'linux';
}

// ─── macOS (launchd) ────────────────────────────────────

function buildPlist(): string {
  const nodePath = process.execPath;
  const daemon = daemonPath();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${daemon}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(homedir(), '.cc-pilot', 'daemon.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(homedir(), '.cc-pilot', 'daemon.log')}</string>
</dict>
</plist>
`;
}

async function installMac(): Promise<void> {
  const path = plistPath();
  await writeFile(path, buildPlist(), 'utf-8');
  execSync(`launchctl load -w "${path}"`);
}

async function uninstallMac(): Promise<void> {
  const path = plistPath();
  try {
    execSync(`launchctl unload "${path}"`);
  } catch {
    // service may already be unloaded
  }
  await unlink(path);
}

async function isInstalledMac(): Promise<boolean> {
  try {
    await access(plistPath());
    return true;
  } catch {
    return false;
  }
}

// ─── Linux (systemd user service) ───────────────────────

function buildSystemdUnit(): string {
  const nodePath = process.execPath;
  const daemon = daemonPath();
  return `[Unit]
Description=cc-pilot daemon
After=network.target

[Service]
ExecStart=${nodePath} ${daemon}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`;
}

async function installLinux(): Promise<void> {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(systemdDir(), { recursive: true });
  await writeFile(systemdServicePath(), buildSystemdUnit(), 'utf-8');
  execSync('systemctl --user daemon-reload');
  execSync('systemctl --user enable cc-pilot.service');
  execSync('systemctl --user start cc-pilot.service');
}

async function uninstallLinux(): Promise<void> {
  try {
    execSync('systemctl --user stop cc-pilot.service');
  } catch {
    // service may already be stopped
  }
  try {
    execSync('systemctl --user disable cc-pilot.service');
  } catch {
    // service may already be disabled
  }
  await unlink(systemdServicePath());
  execSync('systemctl --user daemon-reload');
}

async function isInstalledLinux(): Promise<boolean> {
  try {
    await access(systemdServicePath());
    return true;
  } catch {
    return false;
  }
}

// ─── Windows (schtasks) ─────────────────────────────────

const WIN_TASK_NAME = 'CcDialDaemon';

async function installWindows(): Promise<void> {
  const nodePath = process.execPath;
  const daemon = daemonPath();
  execSync(
    `schtasks /Create /TN "${WIN_TASK_NAME}" /TR "\\"${nodePath}\\" \\"${daemon}\\"" /SC ONLOGON /RL HIGHEST /F`,
  );
  // Start immediately as well
  execSync(`schtasks /Run /TN "${WIN_TASK_NAME}"`);
}

async function uninstallWindows(): Promise<void> {
  execSync(`schtasks /Delete /TN "${WIN_TASK_NAME}" /F`);
}

async function isInstalledWindows(): Promise<boolean> {
  try {
    execSync(`schtasks /Query /TN "${WIN_TASK_NAME}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ─── Public API ─────────────────────────────────────────

export async function installService(): Promise<void> {
  const p = getPlatform();
  if (p === 'mac') return installMac();
  if (p === 'linux') return installLinux();
  return installWindows();
}

export async function uninstallService(): Promise<void> {
  const p = getPlatform();
  if (p === 'mac') return uninstallMac();
  if (p === 'linux') return uninstallLinux();
  return uninstallWindows();
}

export async function isServiceInstalled(): Promise<boolean> {
  const p = getPlatform();
  if (p === 'mac') return isInstalledMac();
  if (p === 'linux') return isInstalledLinux();
  return isInstalledWindows();
}

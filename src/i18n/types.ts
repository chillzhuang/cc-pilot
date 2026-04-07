/**
 * CC-PILOT - Claude Code Auto Pilot
 * Copyright (c) 2026-2099 BladeX (bladejava@qq.com)
 * Licensed under the MIT License
 */
// ─── i18n Translation Schema ────────────────────────────

export interface TranslationSchema {
  app: {
    name: string;
    subtitle: string;
  };

  menu: {
    taskCtrl: string;
    daemon: string;
    dataStream: string;
    sysConfig: string;

    list: string;
    listDesc: string;
    add: string;
    addDesc: string;
    edit: string;
    editDesc: string;
    remove: string;
    removeDesc: string;
    toggle: string;
    toggleDesc: string;
    test: string;
    testDesc: string;

    start: string;
    startDesc: string;
    stop: string;
    stopDesc: string;
    status: string;
    statusDesc: string;
    log: string;
    logDesc: string;
    history: string;
    historyDesc: string;
    window: string;
    windowDesc: string;

    init: string;
    initDesc: string;
    config: string;
    configDesc: string;
    install: string;
    installDesc: string;
    uninstall: string;
    uninstallDesc: string;

    exit: string;
    exitDesc: string;
    shutdown: string;
    shutdownDesc: string;
    lang: string;
    langDesc: string;
    theme: string;
    themeDesc: string;
    about: string;
    aboutDesc: string;

    // About page content
    aboutAuthor: string;
    aboutWebsite: string;
    aboutBlade: string;
    aboutBladeAI: string;
    aboutBladeIoT: string;
    aboutBladeScreen: string;

    input: string;
    enterReturn: string;
    pressEnter: string;
    disconnected: string;
    invalidInput: string;
    openingConfig: string;
    daemonAutoStarted: string;
    daemonStopped: string;
    selectTarget: string;
    confirm: string;
    langSwitch: string;
  };

  status: {
    online: string;
    offline: string;
    watching: string;
    uptime: string;
    today: string;
    tasks: string;
    window: string;
    next: string;
    pid: string;
    mem: string;
    state: string;
    current: string;
    opened: string;
    closes: string;
    remain: string;
    executed: string;
    calls: string;
    total: string;
    success: string;
    rateLimited: string;
    tokens: string;
    consumed: string;
  };

  task: {
    name: string;
    type: string;
    schedule: string;
    state: string;
    fixed: string;
    fixedDesc: string;
    random: string;
    randomDesc: string;
    window: string;
    windowDesc: string;
    on: string;
    off: string;
    noTasks: string;
    nextTrigger: string;
    confirmRemove: string;
    selectTask: string;
  };

  fire: {
    title: string;
    connecting: string;
    executing: string;
    complete: string;
    missionComplete: string;
    duration: string;
    output: string;
  };

  log: {
    title: string;
    liveStream: string;
    ctrlC: string;
    fire: string;
    exec: string;
    done: string;
    fail: string;
    sched: string;
    noLogs: string;
  };

  init: {
    welcome: string;
    langSelect: string;
    claudePath: string;
    activeHours: string;
    blackoutAsk: string;
    blackoutAdd: string;
    addTask: string;
    taskName: string;
    taskType: string;
    taskCron: string;
    taskTimeRange: string;
    taskDays: string;
    taskActiveHours: string;
    taskOffset: string;
    taskPrompt: string;
    taskPrompts: string;
    taskCwd: string;
    addAnother: string;
    startDaemon: string;
    complete: string;
  };

  errors: {
    configNotFound: string;
    daemonRunning: string;
    daemonNotRunning: string;
    taskNotFound: string;
    invalidConfig: string;
    rateLimited: string;
    claudeNotFound: string;
  };

  common: {
    yes: string;
    no: string;
    cancel: string;
    back: string;
    loading: string;
    saving: string;
    done: string;
    error: string;
    warning: string;
    info: string;
    confirm: string;
    tomorrow: string;
  };
}

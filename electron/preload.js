const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
  getSettings:     () => ipcRenderer.invoke('settings:get'),
  saveSettings:    (s) => ipcRenderer.invoke('settings:save', s),
  onGameExit:      (cb) => {
    const l = (_e, p) => cb(p);
    ipcRenderer.on('game:exit', l);
    return () => ipcRenderer.removeListener('game:exit', l);
  },

  screenshots: {
    getAll:      (gameId)            => ipcRenderer.invoke('screenshots:getAll', gameId),
    openFolder:  (gameId)            => ipcRenderer.invoke('screenshots:openFolder', gameId),
    delete:      (gameId, fileNames) => ipcRenderer.invoke('screenshots:delete', gameId, fileNames),
    onUpdated:   (cb) => {
      const l = () => cb();
      ipcRenderer.on('screenshots:updated', l);
      return () => ipcRenderer.removeListener('screenshots:updated', l);
    },
  },

  takeScreenshot: (gameId) => ipcRenderer.invoke('screenshots:take', gameId),

  onVoiceStart: (cb) => {
    const l = (_e, payload) => cb(payload);
    ipcRenderer.on('faye:voiceStart', l);
    return () => ipcRenderer.removeListener('faye:voiceStart', l);
  },
  onVoiceStop: (cb) => {
    const l = () => cb();
    ipcRenderer.on('faye:voiceStop', l);
    return () => ipcRenderer.removeListener('faye:voiceStop', l);
  },
  voiceDone:       () => ipcRenderer.send('faye:voiceDone'),
  transcribeAudio: (bufferArray) => ipcRenderer.invoke('faye:transcribeAudio', bufferArray),
  parseIntent:     (text) => ipcRenderer.invoke('faye:parseIntent', text),

  faye: {
    checkInstalled: () => ipcRenderer.invoke('faye:checkInstalled'),
    start:          (model) => ipcRenderer.invoke('faye:start', model),
    stop:           () => ipcRenderer.invoke('faye:stop'),
    isReady:        () => ipcRenderer.invoke('faye:isReady'),
    pullModel:      (model) => ipcRenderer.invoke('faye:pullModel', model),
    chat:           (messages, playerName, playtime, modelName, ctx) =>
                      ipcRenderer.invoke('faye:chat', messages, playerName, playtime, modelName, ctx),
    saveContext:    (ctx) => ipcRenderer.invoke('faye:saveContext', ctx),
    loadContext:    ()    => ipcRenderer.invoke('faye:loadContext'),
  },

  steam: {
    getStatus:          () => ipcRenderer.invoke('steam:getStatus'),
    getAuthTicket:      () => ipcRenderer.invoke('steam:getAuthTicket'),
    getAchievements:    (appId) => ipcRenderer.invoke('steam:getAchievements', appId),
    getInstalledGames:  () => ipcRenderer.invoke('steam:getInstalledGames'),
  },

  workshop: {
    getItems:           (params) => ipcRenderer.invoke('workshop:getItems', params),
    getItem:            (id) => ipcRenderer.invoke('workshop:getItem', id),
    getItemState:       (id) => ipcRenderer.invoke('workshop:getItemState', id),
    downloadItem:       (id, highPriority) => ipcRenderer.invoke('workshop:downloadItem', id, highPriority),
    subscribe:          (id) => ipcRenderer.invoke('workshop:subscribe', id),
    unsubscribe:        (id) => ipcRenderer.invoke('workshop:unsubscribe', id),
    getSubscribedItems: () => ipcRenderer.invoke('workshop:getSubscribedItems'),
    publishItem:        (data) => ipcRenderer.invoke('workshop:publishItem', data),
    getFileInfo:        (filePath) => ipcRenderer.invoke('workshop:getFileInfo', filePath),
    checkNsfw:          (target) => ipcRenderer.invoke('workshop:checkNsfw', target),
    pickVideoFile:      () => ipcRenderer.invoke('dialog:pickVideoFile'),
    pickImageFile:      () => ipcRenderer.invoke('dialog:pickImageFile'),
  },

  verifySteamOwnership: (uid) => ipcRenderer.invoke('verify-steam-ownership', uid),
  launchGame: (args) => ipcRenderer.invoke('launch-game', args),
  isGameRunning: () => ipcRenderer.invoke('game:isRunning'),
  stopGame: () => ipcRenderer.invoke('game:stop'),

readGameSettings: () => ipcRenderer.invoke('settings:readFromGame'),
writeGameSettings: (settings) => ipcRenderer.invoke('settings:writeToGame', settings),

  fs: {
    search:      (query)    => ipcRenderer.invoke('fs:search', query),
    openPath:    (filePath) => ipcRenderer.invoke('fs:openPath', filePath),
    openFolder:  (name)     => ipcRenderer.invoke('fs:openFolder', name),
    recentFiles: ()         => ipcRenderer.invoke('fs:recentFiles'),
  },

  browser: {
    search:        (query) => ipcRenderer.invoke('browser:search', query),
    open:          (url)   => ipcRenderer.invoke('browser:open', url),
    youtubeSearch: (query) => ipcRenderer.invoke('browser:youtubeSearch', query),
  },

  fayeCommand:   (command, args) => ipcRenderer.invoke('faye:command', command, args),

  hideOverlay:   () => ipcRenderer.send('overlay:hide'),
  onOverlayShow: (cb) => {
    const l = () => cb();
    ipcRenderer.on('overlay:show', l);
    return () => ipcRenderer.removeListener('overlay:show', l);
  },

  installOllama: () => ipcRenderer.invoke('ollama:install'),
  onOllamaInstallProgress: (cb) => {
    const l = (_e, msg) => cb(msg);
    ipcRenderer.on('ollama:installProgress', l);
    return () => ipcRenderer.removeListener('ollama:installProgress', l);
  },

  checkOllamaModel: (model) => ipcRenderer.invoke('ollama:checkModel', model),
  getInstalledOllamaModels: () => ipcRenderer.invoke('ollama:getInstalledModels'),
  pullOllamaModel:  (model) => ipcRenderer.invoke('ollama:pullModel', model),
  onOllamaPullProgress: (cb) => {
    const l = (_e, pct) => cb(pct);
    ipcRenderer.on('ollama:pullProgress', l);
    return () => ipcRenderer.removeListener('ollama:pullProgress', l);
  },

  ytmSearch:       (query)   => ipcRenderer.invoke('ytm-search', query),
  getRelatedVideos:(videoId) => ipcRenderer.invoke('yt:getRelated', videoId),

  pullModel: (model) => ipcRenderer.invoke('faye:pullModel', model),
  onPullProgress: (cb) => {
    const l = (_e, msg) => cb(msg);
    ipcRenderer.on('faye:pullProgress', l);
    return () => ipcRenderer.removeListener('faye:pullProgress', l);
  },

  onFayeChunk: (cb) => {
    const l = (_e, chunk) => cb(chunk);
    ipcRenderer.on('faye:chunk', l);
    return () => ipcRenderer.removeListener('faye:chunk', l);
  },

  minimizeWindow:     () => ipcRenderer.send('window:minimize'),
  minimize:           () => ipcRenderer.send('window:minimize'),
  minimizeToTray:     () => ipcRenderer.send('window:minimize'),
  maximizeWindow:     () => ipcRenderer.send('window:maximize'),
  isWindowMaximized:  () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange:  (cb) => {
    const l = (_e, isMax) => cb(isMax);
    ipcRenderer.on('window:maximized-change', l);
    return () => ipcRenderer.removeListener('window:maximized-change', l);
  },
  closeWindow:        () => ipcRenderer.send('window:close'),
  showWindow:         () => ipcRenderer.send('window:show'),

  checkForUpdates:    () => ipcRenderer.invoke('updater:check'),
  downloadUpdate:     () => ipcRenderer.invoke('updater:download'),
  installUpdate:      () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable:  (cb) => ipcRenderer.on('updater:update-available',  (_e, info) => cb(info)),
  onUpToDate:         (cb) => ipcRenderer.on('updater:up-to-date',        ()         => cb()),
  onDownloadProgress: (cb) => ipcRenderer.on('updater:download-progress', (_e, p)    => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('updater:update-downloaded', (_e, info) => cb(info)),
  onUpdaterError:     (cb) => ipcRenderer.on('updater:error',             (_e, msg)  => cb(msg)),

  settingsChanged: (s)   => ipcRenderer.send('settings-changed', s),
  quitApp:         ()    => ipcRenderer.send('app:quit'),
  getAppVersion:   ()    => ipcRenderer.invoke('app:getVersion'),
  openExternal:    (url) => ipcRenderer.send('shell:openExternal', url),
  getLauncherPath: ()    => ipcRenderer.invoke('app:getLauncherPath'),
  setFullscreen:   (flag)=> ipcRenderer.send('set-fullscreen', flag),
  unmaximizeWindow:()    => ipcRenderer.send('window:unmaximize'),
  getRamGB:        ()    => ipcRenderer.invoke('system:getRamGB'),
  getHardwareStats:()    => ipcRenderer.invoke('system:getHardwareStats'),
  checkHDRSupport: ()    => ipcRenderer.invoke('system:checkHDRSupport'),

  onNavigate: (cb) => {
    const l = (_e, page) => cb(page);
    ipcRenderer.on('nav:navigate', l);
    return () => ipcRenderer.removeListener('nav:navigate', l);
  },
  onPlayRequested: (cb) => {
    const l = () => cb();
    ipcRenderer.on('launcher:play', l);
    return () => ipcRenderer.removeListener('launcher:play', l);
  },

  getDiskItems:        () => ipcRenderer.invoke('storage:getDiskItems'),
  getDiskSpace:        () => ipcRenderer.invoke('storage:getDiskSpace'),
  pickVideoFile:       () => ipcRenderer.invoke('dialog:pickVideoFile'),
  openLogsFolder:      () => ipcRenderer.invoke('shell:openLogsFolder'),

  onSettingsSync: (cb) => {
    const l = (_e, s) => cb(s);
    ipcRenderer.on('settings-sync', l);
    return () => ipcRenderer.removeListener('settings-sync', l);
  },

  startListening: () => ipcRenderer.send('speech:start'),
  onSpeechResult: (cb) => {
    const l = (_e, t) => cb(t);
    ipcRenderer.on('speech:result', l);
    return () => ipcRenderer.removeListener('speech:result', l);
  },

  uninstall: {
    isMode:   ()        => ipcRenderer.invoke('uninstall:isMode'),
    execute:  (options) => ipcRenderer.invoke('uninstall:execute', options),
    cancel:   ()        => ipcRenderer.send('uninstall:cancel'),
    quit:     ()        => ipcRenderer.send('uninstall:quit'),
  },
});
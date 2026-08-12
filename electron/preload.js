const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
  getSettings:     () => ipcRenderer.invoke('settings:get'),
  saveSettings:    (s) => ipcRenderer.invoke('settings:save', s),
  launchGame:      () => ipcRenderer.invoke('game:launch'),
  onGameExit:      (cb) => {
    const l = (_e, p) => cb(p);
    ipcRenderer.on('game:exit', l);
    return () => ipcRenderer.removeListener('game:exit', l);
  },

  screenshots: {
    getAll:      (gameId)            => ipcRenderer.invoke('screenshots:getAll', gameId),
    openFolder:  (gameId)            => ipcRenderer.invoke('screenshots:openFolder', gameId),
    delete:      (gameId, fileNames) => ipcRenderer.invoke('screenshots:delete', gameId, fileNames),
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

  verifySteamOwnership: (uid) => ipcRenderer.invoke('verify-steam-ownership', uid),
launchGame: (args) => ipcRenderer.invoke('launch-game', args),

readGameSettings: () => ipcRenderer.invoke('settings:readFromGame'),

// Add inside the contextBridge.exposeInMainWorld('launcherAPI', { ... }) object:
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

  minimizeWindow:  () => ipcRenderer.send('window:minimize'),
  maximizeWindow:  () => ipcRenderer.send('window:maximize'),
  closeWindow:     () => ipcRenderer.send('window:close'),
  showWindow:      () => ipcRenderer.send('window:show'),

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
  getRamGB:        ()    => ipcRenderer.invoke('system:getRamGB'),

  getDiskItems:        () => ipcRenderer.invoke('storage:getDiskItems'),
  getDiskSpace:        () => ipcRenderer.invoke('storage:getDiskSpace'),
  pickInstallLocation: () => ipcRenderer.invoke('dialog:pickInstallLocation'),
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
});
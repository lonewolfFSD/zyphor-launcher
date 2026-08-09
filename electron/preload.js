const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {  // was 'api'
  getSettings:      () => ipcRenderer.invoke('settings:get'),
  saveSettings:     (s) => ipcRenderer.invoke('settings:save', s),
  launchGame:       () => ipcRenderer.invoke('game:launch'),
  onGameExit:       (cb) => {
    const l = (_e, p) => cb(p);
    ipcRenderer.on('game:exit', l);
    return () => ipcRenderer.removeListener('game:exit', l);
  },
  // Screenshots — runtime captures from userData/screenshots/<gameId>/
  screenshots: {
    getAll: (gameId) => ipcRenderer.invoke('screenshots:getAll', gameId),
    openFolder: (gameId) => ipcRenderer.invoke('screenshots:openFolder', gameId),
    delete: (gameId, fileNames) => ipcRenderer.invoke('screenshots:delete', gameId, fileNames),
  },

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
voiceDone: () => ipcRenderer.send('faye:voiceDone'),
transcribeAudio: (bufferArray) => ipcRenderer.invoke('faye:transcribeAudio', bufferArray),

faye: {
  checkInstalled: () => ipcRenderer.invoke('faye:checkInstalled'),
  start:          (model) => ipcRenderer.invoke('faye:start', model),
  stop:           () => ipcRenderer.invoke('faye:stop'),
  isReady:        () => ipcRenderer.invoke('faye:isReady'),
  pullModel:      (model) => ipcRenderer.invoke('faye:pullModel', model),
chat: (messages, playerName, playtime, modelName) => 
  ipcRenderer.invoke('faye:chat', messages, playerName, playtime, modelName),
},
  takeScreenshot: (gameId) => ipcRenderer.invoke('screenshots:take', gameId),
  fayeCommand:    (command, args) => ipcRenderer.invoke('faye:command', command, args),

// ── Overlay ────────────────────────────────────────────────────────
  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  onOverlayShow: (cb) => {
    const l = () => cb();
    ipcRenderer.on('overlay:show', l);
    return () => ipcRenderer.removeListener('overlay:show', l);
  },

  // ── Ollama install ─────────────────────────────────────────────────
  installOllama: () => ipcRenderer.invoke('ollama:install'),
  onOllamaInstallProgress: (cb) => {
    const l = (_e, msg) => cb(msg);
    ipcRenderer.on('ollama:installProgress', l);
    return () => ipcRenderer.removeListener('ollama:installProgress', l);
  },

  installOllama: () => ipcRenderer.invoke('ollama:install'),
onOllamaInstallProgress: (cb) => {
  const l = (_e, msg) => cb(msg);
  ipcRenderer.on('ollama:installProgress', l);
  return () => ipcRenderer.removeListener('ollama:installProgress', l);
},

// ── Ollama model check/pull (used by Settings page) ──────────────
checkOllamaModel: (model) => ipcRenderer.invoke('ollama:checkModel', model),
pullOllamaModel:  (model) => ipcRenderer.invoke('ollama:pullModel', model),
onOllamaPullProgress: (cb) => {
  const l = (_e, pct) => cb(pct);
  ipcRenderer.on('ollama:pullProgress', l);
  return () => ipcRenderer.removeListener('ollama:pullProgress', l);
},

ytmSearch: (query) => ipcRenderer.invoke('ytm-search', query),
pullModel: () => ipcRenderer.invoke('faye:pullModel'),
onPullProgress: (cb) => {
  const listener = (_e, msg) => cb(msg);
  ipcRenderer.on('faye:pullProgress', listener);
  return () => ipcRenderer.removeListener('faye:pullProgress', listener);
},

onFayeChunk: (cb) => ipcRenderer.on('faye:chunk', (_e, chunk) => cb(chunk)),
  
  minimizeWindow:   () => ipcRenderer.send('window:minimize'),
  maximizeWindow:   () => ipcRenderer.send('window:maximize'),
  closeWindow:      () => ipcRenderer.send('window:close'),
  showWindow:       () => ipcRenderer.send('window:show'),
  checkForUpdates:  () => ipcRenderer.invoke('updater:check'),
  downloadUpdate:   () => ipcRenderer.invoke('updater:download'),
  installUpdate:    () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable:  (cb) => ipcRenderer.on('updater:update-available',  (_e, info) => cb(info)),
  onUpToDate:         (cb) => ipcRenderer.on('updater:up-to-date',         ()         => cb()),
  onDownloadProgress: (cb) => ipcRenderer.on('updater:download-progress', (_e, p)    => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('updater:update-downloaded', (_e, info) => cb(info)),
  onUpdaterError:     (cb) => ipcRenderer.on('updater:error',             (_e, msg)  => cb(msg)),
  settingsChanged:  (s) => ipcRenderer.send('settings-changed', s),
  quitApp:          () => ipcRenderer.send('app:quit'),
  getAppVersion:    () => ipcRenderer.invoke('app:getVersion'),
  openExternal:     (url) => ipcRenderer.send('shell:openExternal', url),
  getLauncherPath:  () => ipcRenderer.invoke('app:getLauncherPath'),
  setFullscreen: (flag) => ipcRenderer.send('set-fullscreen', flag),

  getRamGB: () => ipcRenderer.invoke('system:getRamGB'),

  getRelatedVideos: (videoId) => ipcRenderer.invoke('yt:getRelated', videoId),
  
  // ── New: Storage ──────────────────────────────────────────────────
  getDiskItems:         () => ipcRenderer.invoke('storage:getDiskItems'),
  getDiskSpace:         () => ipcRenderer.invoke('storage:getDiskSpace'),
  pickInstallLocation:  () => ipcRenderer.invoke('dialog:pickInstallLocation'),
  pickVideoFile:        () => ipcRenderer.invoke('dialog:pickVideoFile'),
  openLogsFolder:       () => ipcRenderer.invoke('shell:openLogsFolder'),

  // Settings sync
  settingsChanged: (s) => ipcRenderer.send('settings-changed', s),
  quitApp: () => ipcRenderer.send('app:quit'),

  // --- Misc ---------------------------------------------------------
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // --- External browser (AuthGate) ----------------------------------
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),

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
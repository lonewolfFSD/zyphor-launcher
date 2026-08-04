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
  },
  
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
});
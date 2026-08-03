const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- Settings -----------------------------------------------------
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // --- Game launch --------------------------------------------------
  launchGame: () => ipcRenderer.invoke('game:launch'),
  onGameExit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('game:exit', listener);
    return () => ipcRenderer.removeListener('game:exit', listener);
  },

  // --- Window chrome ------------------------------------------------
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  showWindow: () => ipcRenderer.send('window:show'),
  // Updater
  checkForUpdates:  ()  => ipcRenderer.invoke('updater:check'),
  downloadUpdate:   ()  => ipcRenderer.invoke('updater:download'),
  installUpdate:    ()  => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable:   (cb) => ipcRenderer.on('updater:update-available',   (_e, info)     => cb(info)),
  onUpToDate:          (cb) => ipcRenderer.on('updater:up-to-date',          ()             => cb()),
  onDownloadProgress:  (cb) => ipcRenderer.on('updater:download-progress',  (_e, progress) => cb(progress)),
  onUpdateDownloaded:  (cb) => ipcRenderer.on('updater:update-downloaded',  (_e, info)     => cb(info)),
  onUpdaterError:      (cb) => ipcRenderer.on('updater:error',              (_e, msg)      => cb(msg)),

  // Settings sync
  settingsChanged: (s) => ipcRenderer.send('settings-changed', s),
  quitApp: () => ipcRenderer.send('app:quit'),

  // --- Misc ---------------------------------------------------------
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // --- External browser (AuthGate) ----------------------------------
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
});
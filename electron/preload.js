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
  
  quitApp: () => ipcRenderer.send('app:quit'),

  // --- Misc ---------------------------------------------------------
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // --- External browser (AuthGate) ----------------------------------
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
});
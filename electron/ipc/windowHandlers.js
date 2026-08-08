const { app, ipcMain } = require('electron');
const { readSettings } = require('./settingsHandlers');

/**
 * @param {() => import('electron').BrowserWindow | null} getWindow
 */
function registerWindowHandlers(getWindow) {
  ipcMain.on('window:minimize', () => {
    const win = getWindow();
    if (!win) return;
    const s = readSettings();
    if (s.minimizeToTray) win.hide();
    else win.minimize();
  });

  ipcMain.on('window:maximize', () => {
  const win = getWindow();
  if (!win) return;
  if (win.isFullScreen()) {
    win.setFullScreen(false);
  } else if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

  ipcMain.on('window:close', () => {
    const win = getWindow();
    if (!win) return;
    const s = readSettings();
    if (s.closeToTray) win.hide();
    else win.close();
  });

  ipcMain.on('window:show', () => {
    const win = getWindow();
    if (!win) return;
    win.show();
    win.focus();
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
}

module.exports = { registerWindowHandlers };
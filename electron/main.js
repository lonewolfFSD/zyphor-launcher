const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const { autoUpdater } = require('electron-updater');

// Don't auto-download — let the user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('updater:update-available', info);
});

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('updater:up-to-date');
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('updater:download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('updater:update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('updater:error', err.message);
});

// near the other autoUpdater.on(...) blocks
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('updater:checking');
});

ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result == null) {
      // Updater is disabled (unpackaged / forceDevUpdateConfig not set)
      mainWindow?.webContents.send('updater:error', 'Updater inactive — app is not packaged');
      return { error: 'Updater inactive (not packaged)' };
    }
    return result;
  } catch (err) {
    mainWindow?.webContents.send('updater:error', err.message);
    return { error: err.message };
  }
});

// ipcMain.handle('updater:check', async () => {
//   try {
//     return await autoUpdater.checkForUpdates();
//   } catch (err) {
//     return { error: err.message };
//   }
// });

ipcMain.handle('updater:download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

const { registerSettingsHandlers, readSettings } = require('./ipc/settingsHandlers');
const { registerGameHandlers } = require('./ipc/gameHandlers');
const { registerWindowHandlers } = require('./ipc/windowHandlers');
const { registerStorageHandlers } = require('./storageIPC');

// Detect dev mode: either explicitly set, OR dist/index.html doesn't exist yet.
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(distIndex);

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {Tray | null} */
let tray = null;

function createTray() {
  // Put a tray-icon.png (16x16 or 32x32) in your resources/ folder.
  // Falls back to an empty image so the app never crashes without one.
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.jpg');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Zyphor Launcher');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Launcher',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        tray?.destroy();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 740,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0b0e',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // must be false — sandbox blocks require() in preload
    },
  });

  mainWindow.once('ready-to-show', () => {
    // Apply remaining settings whenever renderer signals a change
    ipcMain.on('settings-changed', (_e, s) => {
      // devMode
      if (s.devMode) {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      } else {
        mainWindow?.webContents.closeDevTools();
      }

      // autoUpdate — kick off a check when user enables it
      if (s.autoUpdate) {
        autoUpdater.checkForUpdates().catch(() => {});
      }

      // launchOnStartup stays in sync live too (not just on boot)
      app.setLoginItemSettings({ openAtLogin: !!s.launchOnStartup, openAsHidden: true });
    });

    mainWindow.show();
    // Apply launchOnStartup on every boot so it stays in sync with the setting.
    const s = readSettings();
    app.setLoginItemSettings({ openAtLogin: !!s.launchOnStartup, openAsHidden: true });
  });

  // Close to tray — intercept the close event and hide instead of quitting.
  mainWindow.on('close', (e) => {
    const s = readSettings();
    if (s.closeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Minimize to tray
  mainWindow.on('minimize', (e) => {
    const s = readSettings();
    if (s.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Log renderer-side errors to the main process console so black-screen
  // failures aren't silent.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[main] page failed to load: ${desc} (${code}) — ${url}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] renderer gone:', details);
  });
  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.error('[renderer]', message); // warn + error only
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(distIndex);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('shell:openExternal', (_event, url) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  registerSettingsHandlers();
  registerStorageHandlers();
  registerGameHandlers();
  registerWindowHandlers(() => mainWindow);
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // If closeToTray is on, windows being hidden doesn't mean we should quit.
  const s = readSettings();
  if (!s.closeToTray && process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception:', err);
});
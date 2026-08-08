const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const { spawn } = require('child_process');
let ollamaProcess = null;

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

// main.js
ipcMain.handle('faye:saveMemory', (_e, messages) => {
  const memPath = path.join(app.getPath('userData'), 'faye-memory.json');
  fs.writeFileSync(memPath, JSON.stringify(messages));
});

ipcMain.handle('faye:loadMemory', () => {
  const memPath = path.join(app.getPath('userData'), 'faye-memory.json');
  if (!fs.existsSync(memPath)) return [];
  return JSON.parse(fs.readFileSync(memPath, 'utf-8'));
});

// ipcMain.handle('updater:check', async () => {
//   try {
//     return await autoUpdater.checkForUpdates();
//   } catch (err) {
//     return { error: err.message };
//   }
// });

ipcMain.handle('faye:pullModel', async () => {
  return new Promise((resolve) => {
    const proc = spawn(getOllamaPath(), ['pull', 'phi3:mini'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        OLLAMA_MODELS: path.join(app.getPath('userData'), 'faye-models'),
      },
    });
    proc.stdout.on('data', (d) => {
      mainWindow?.webContents.send('faye:pullProgress', d.toString());
    });
    proc.stderr.on('data', (d) => {
      mainWindow?.webContents.send('faye:pullProgress', d.toString());
    });
    proc.on('close', (code) => resolve({ ok: code === 0 }));
  });
});

ipcMain.handle('updater:download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

const { registerSettingsHandlers, readSettings } = require('./ipc/settingsHandlers');
const { registerGameHandlers } = require('./ipc/gameHandlers');
const { registerWindowHandlers } = require('./ipc/windowHandlers');
const { registerStorageHandlers } = require('./ipc/storageIPC');

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

function getOllamaPath() {
  const bundled = path.join(process.resourcesPath, 'ollama.exe');
  if (fs.existsSync(bundled)) return bundled;
  // dev fallback — use system installed Ollama
  const localApp = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
  if (fs.existsSync(localApp)) return localApp;
  return 'ollama';
}

function startOllama() {
  if (ollamaProcess) return;
  const ollamaPath = getOllamaPath();
  ollamaProcess = spawn(ollamaPath, ['serve'], {
    detached: false,
    stdio: 'pipe',
  });
  ollamaProcess.stdout.on('data', (d) => console.log('[ollama]', d.toString()));
  ollamaProcess.stderr.on('data', (d) => console.error('[ollama err]', d.toString()));
  ollamaProcess.on('error', (err) => console.error('[ollama] failed to start:', err.message));
  ollamaProcess.on('close', (code) => console.log('[ollama] exited with code', code));
}

function stopOllama() {
  if (!ollamaProcess) return;
  ollamaProcess.kill();
  ollamaProcess = null;
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

ipcMain.handle('app:getLauncherPath', () => path.dirname(app.getPath('exe')));

// ── Screenshots ───────────────────────────────────────────────────────────────
function screenshotsDir(gameId) {
  const key = String(gameId || 'stay').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'stay';
  return path.join(app.getPath('userData'), 'screenshots', key);
}

function toFileUrl(filePath) {
  const { pathToFileURL } = require('url');
  return pathToFileURL(filePath).href;
}

ipcMain.handle('screenshots:getAll', async (_e, gameId) => {
  try {
    const dir = screenshotsDir(gameId);
    fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(f))
      .map((f) => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        return { f, full, mtime: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return files.map(({ f, full, mtime, size }) => ({
      name: path.basename(f, path.extname(f)),
      fileName: f,
      src: toFileUrl(full),
      path: full,
      mtime,
      size,
    }));
  } catch (err) {
    console.error('[screenshots:getAll]', err);
    return [];
  }
});

ipcMain.handle('screenshots:openFolder', async (_e, gameId) => {
  const dir = screenshotsDir(gameId);
  fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return dir;
});

ipcMain.handle('screenshots:delete', async (_e, gameId, fileNames) => {
  try {
    const dir = screenshotsDir(gameId);
    const list = Array.isArray(fileNames) ? fileNames : [fileNames];
    const deleted = [];
    for (const name of list) {
      const base = path.basename(String(name));
      const full = path.join(dir, base);
      if (full.startsWith(dir) && fs.existsSync(full)) {
        fs.unlinkSync(full);
        deleted.push(base);
      }
    }
    return { ok: true, deleted };
  } catch (err) {
    console.error('[screenshots:delete]', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.on('shell:openExternal', (_event, url) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  // Create screenshots folder
  const screenshotsDir = path.join(app.getPath('userData'), 'screenshots', 'stay');
  fs.mkdirSync(screenshotsDir, { recursive: true });

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

// ── Faye AI (Ollama) ──────────────────────────────────────────────────────────
ipcMain.handle('faye:checkInstalled', async () => {
  const bundled = path.join(process.resourcesPath, 'ollama.exe');
  if (fs.existsSync(bundled)) return true;
  const localApp = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
  return fs.existsSync(localApp);
});

ipcMain.handle('faye:start', async () => {
  startOllama();
  // Wait for Ollama to boot
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      if (res.ok) return { ok: true };
    } catch {}
  }
  return { ok: false, error: 'Ollama did not start in time' };
});

ipcMain.handle('faye:stop', () => {
  stopOllama();
  return { ok: true };
});

ipcMain.handle('faye:isReady', async () => {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    return res.ok;
  } catch {
    return false;
  }
});

ipcMain.handle('faye:chat', async (_e, messages, playerName, playtime) => {
  try {
    const system = `You are Faye. A cheerful, witty companion for the Zyphor Launcher. You care about the player and speak like a close friend — casual, warm, short. Never robotic. Never formal.
${playerName ? `The player's name is ${playerName}.` : ''}
IMPORTANT: Reply in 1-2 short casual sentences ONLY. No lists. No formatting. No asterisks. No dashes. Just natural conversation.`;

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:mini',
        messages: [{ role: 'system', content: system }, ...messages],
        stream: false,
      }),
    });

    const data = await res.json();
    const content = (data.message?.content ?? '')
        .replace(/--.*$/s, '')        // strip everything after --
        .replace(/\*\*.*$/s, '')      // strip everything after **
        .replace(/#+\s.*$/gm, '')     // strip markdown headers
        .trim();

    // Self-assess mood
    const moodRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:mini',
        messages: [
          { role: 'user', content: `Given this reply: "${content}" — what is Faye's mood in one word: neutral, happy, tired, excited, or worried? Reply with ONLY the single word.` }
        ],
        stream: false,
      }),
    });
    const moodData = await moodRes.json();
    const mood = moodData.message?.content?.trim().toLowerCase().split(/\s/)[0] ?? 'neutral';
    const validMoods = ['neutral', 'happy', 'tired', 'excited', 'worried'];
    const finalMood = validMoods.includes(mood) ? mood : 'neutral';

    return { ok: true, content, mood: finalMood };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Anywhere after app is ready:
ipcMain.on('set-fullscreen', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(Boolean(flag));
});

app.on('window-all-closed', () => {
  // If closeToTray is on, windows being hidden doesn't mean we should quit.
  const s = readSettings();
  if (!s.closeToTray && process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception:', err);
});
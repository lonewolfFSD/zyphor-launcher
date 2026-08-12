const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const { exec } = require('child_process');

app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('allow-http-screen-capture');

app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:5173');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');

const { spawn } = require('child_process');
let ollamaProcess = null;

const ffmpegPath = require('ffmpeg-static');

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

ipcMain.handle('system:getRamGB', () => {
  const totalBytes = require('os').totalmem();
  return Math.round(totalBytes / (1024 ** 3)); // should be 32 on your PC
});

ipcMain.handle('ytm-search', async (_event, query) => {
  const res = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-FUHU13d08',
      'X-YouTube-Client-Name': '67',
      'X-YouTube-Client-Version': '1.20240101.01.00',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    body: JSON.stringify({
      query,
      params: 'EgWKAQIIAWoKEAoQAxAEEAkQBQ%3D%3D',
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
    }),
  });
  return res.json();
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

ipcMain.handle('yt:getRelated', async (_e, videoId) => {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    });
    const html = await res.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const ids = match
      ? [...new Set(
          match
            .map(m => m.replace(/"videoId":"|"/g, ''))
            .filter(id => id !== videoId)
        )].slice(0, 8)
      : [];
    return ids;
  } catch {
    return [];
  }
});

// ── Overlay ───────────────────────────────────────────────────────────────────
ipcMain.on('overlay:hide', () => {
  if (!overlayWin) return;
  overlayWin.hide();
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
});

// ── Ollama install (Windows first, cross-platform skeleton below) ──────────────
const { https: httpsModule } = require('https'); // already built-in, just alias
const os = require('os');

ipcMain.handle('ollama:install', async () => {
  const { execSync } = require('child_process');

  // 1. Already installed?
  const alreadyInstalled = (() => {
    try { execSync('ollama --version', { stdio: 'ignore' }); return true; }
    catch { return false; }
  })();
  if (alreadyInstalled) return { alreadyInstalled: true };

  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const installerPath = path.join(os.tmpdir(), 'OllamaSetup.exe');
      await downloadFile('https://ollama.com/download/OllamaSetup.exe', installerPath);
      // Send progress to renderer
      overlayWin?.webContents.send('ollama:installProgress', 'Running installer…');
      await runShell(`"${installerPath}" /S`);
    } else if (platform === 'darwin') {
      await runShell('brew install ollama');
    } else {
      await runShell('curl -fsSL https://ollama.com/install.sh | sh');
    }

    // Pull the model Faye uses
    overlayWin?.webContents.send('ollama:installProgress', 'Pulling phi3:mini model…');
    await runShell(`"${getOllamaPath()}" pull phi3:mini`);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function downloadFile(url, dest) {
  const https = require('https');
  const fs2 = require('fs');
  return new Promise((resolve, reject) => {
    const file = fs2.createWriteStream(dest);
    https.get(url, (res) => {
      // Follow redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs2.unlink(dest, () => {});
      reject(err);
    });
  });
}

function runShell(cmd) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(cmd, { shell: true }, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

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

ipcMain.handle('faye:pullModel', async (_e, model = 'phi3:mini') => {
  return new Promise((resolve) => {
    const proc = spawn(getOllamaPath(), ['pull', model], {
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

// Expose verifySteamOwnership to renderer
ipcMain.handle('verify-steam-ownership', async (_, uid) => {
  try {
    const { initializeApp, getApps } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');

    const adminApp = getApps().find(a => a.name === 'admin')
      ?? require('firebase-admin').initializeApp({
           credential: require('firebase-admin').credential.applicationDefault(),
         }, 'admin');

    const db = getFirestore(adminApp);
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.data();

    if (!data?.steamId) return { owns: false, reason: 'no_steam_linked' };
    return { owns: Boolean(data?.steamOwnsGame), reason: data?.steamOwnsGame ? null : 'no_access' };
  } catch (err) {
    console.error('[verify-steam-ownership]', err);
    return { owns: false, reason: 'error' };
  }
});

// ── Game path resolution ───────────────────────────────────────────────────────
function getGameExecutablePath() {
  // 1. Persisted user config (set after first successful find or manual pick)
  const cfg = readSettings();
  if (cfg.gameExePath && fs.existsSync(cfg.gameExePath)) return cfg.gameExePath;

  // 2. Scan Steam library folders from VDF
  try {
    const steamRoot = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam');
    const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
      const vdf = fs.readFileSync(vdfPath, 'utf-8');
      // Extract all "path" values from the VDF
      const libPaths = [...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '\\'));
      for (const lib of libPaths) {
        const candidate = path.join(lib, 'steamapps', 'common', 'STAY', 'STAY.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {}

  // 3. Dev fallback
  const devPath = path.join(__dirname, '..', '..', 'game-build', 'STAY.exe');
  if (fs.existsSync(devPath)) return devPath;

  return null;
}

ipcMain.handle('launch-game', async (_, args = []) => {
  const gamePath = getGameExecutablePath();
  console.log('[launch-game] path:', gamePath);
  console.log('[launch-game] exists:', gamePath ? fs.existsSync(gamePath) : false);

  if (!gamePath) {
    // Signal the renderer so it can show a "locate STAY.exe" dialog
    return { ok: false, reason: 'exe_not_found' };
  }

  const child = spawn(gamePath, args, {
    detached: true,
    stdio: 'ignore',
    cwd: path.dirname(gamePath), // Unity needs CWD to be the game folder
  });
  child.unref();
  return { ok: true };
});

// ── ollama:checkModel — does the user already have this model pulled? ──────────
ipcMain.handle('ollama:checkModel', async (_e, model) => {
  try {
    // ensure ollama is running first
    try {
      const probe = await fetch('http://localhost:11434/api/tags');
      if (!probe.ok) startOllama();
    } catch {
      startOllama();
    }

    // wait up to 6s for it to be ready
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        if (res.ok) {
          const { models = [] } = await res.json();
          return models.some(m => m.name === model || m.name.startsWith(model.split(':')[0]));
        }
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
});

// ── ollama:pullModel — pull with % progress sent back to mainWindow ────────────
ipcMain.handle('ollama:pullModel', async (_e, model) => {
  // ensure ollama is running before pulling
  try {
    const probe = await fetch('http://localhost:11434/api/tags');
    if (!probe.ok) startOllama();
  } catch {
    startOllama();
  }

  // wait for it to be ready
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      if (res.ok) break;
    } catch {}
  }

  return new Promise((resolve) => {
    const proc = spawn(getOllamaPath(), ['pull', model], {
      stdio: 'pipe',
      env: {
        ...process.env,
        OLLAMA_MODELS: path.join(app.getPath('userData'), 'faye-models'),
      },
    });

    proc.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/(\d+)%/);
      if (match) mainWindow?.webContents.send('ollama:pullProgress', parseInt(match[1], 10));
    });
    proc.stderr.on('data', (chunk) => {
      const match = chunk.toString().match(/(\d+)%/);
      if (match) mainWindow?.webContents.send('ollama:pullProgress', parseInt(match[1], 10));
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        const ALL_FAYE_MODELS = ['phi3:mini', 'qwen2.5:14b', 'qwen2.5:32b'];
        for (const m of ALL_FAYE_MODELS.filter(m => m !== model)) {
          try {
            await fetch('http://localhost:11434/api/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: m }),
            });
          } catch {}
        }
      }
      resolve({ ok: code === 0 });
    });
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

/** @type {BrowserWindow | null} */
let overlayWin = null;          // ← ADD THIS

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
      overlayWin?.webContents.send('settings-sync', s);

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

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load same app but with ?overlay=1 so React can render FayeOverlay instead
  if (isDev) {
    overlayWin.loadURL('http://localhost:5173?overlay=1');
  } else {
    overlayWin.loadFile(distIndex, { query: { overlay: '1' } });
  }

  overlayWin.hide();
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  overlayWin.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
  callback(true); // allow everything including speech/mic
});

// allow google speech servers
overlayWin.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
  callback({ requestHeaders: details.requestHeaders });
});

  overlayWin.on('closed', () => {
    overlayWin = null;
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

// ── Screenshot (take) ─────────────────────────────────────────────────────────
ipcMain.handle('screenshots:take', async (_e, gameId) => {
  try {
    const { desktopCapturer } = require('electron');
    // Hide overlay so it doesn't appear in the capture
    overlayWin?.hide();
    await new Promise(r => setTimeout(r, 120)); // let OS composite
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    // Show overlay again immediately
    overlayWin?.show();
    const src = sources[0];
    if (!src) return { ok: false, error: 'No screen source found' };
    const dir = screenshotsDir(gameId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `screenshot-${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, src.thumbnail.toPNG());
    return { ok: true, path: filepath };
  } catch (err) {
    overlayWin?.show();
    return { ok: false, error: err.message };
  }
});

// ── Faye commands (Spotify, volume, open URL) ─────────────────────────────────
ipcMain.handle('faye:command', async (_e, command, args) => {
  try {
    if (command === 'spotify') {
      const query = args?.query ? encodeURIComponent(args.query) : '';
      await shell.openExternal(query ? `spotify:search:${query}` : 'spotify:');
      return { ok: true };
    }
    if (command === 'volume') {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        // 175 = volume up, 174 = volume down keys
        const key = args?.direction === 'up' ? 175 : 174;
        execSync(`powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]${key})"`);
      }
      return { ok: true };
    }
    if (command === 'openUrl') {
      await shell.openExternal(args?.url);
      return { ok: true };
    }
    return { ok: false, error: 'Unknown command' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('fs:search', async (_e, query) => {
  const searchDirs = [
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Videos'),
    path.join(os.homedir(), 'Music'),
  ];

  const results = [];
  const q = query.toLowerCase();

  for (const dir of searchDirs) {
    try {
      const walk = (current) => {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.name.toLowerCase().includes(q)) {
            results.push(full);
            if (results.length >= 10) return;
          }
          if (entry.isDirectory()) {
            try { walk(full); } catch {}
          }
        }
      };
      walk(dir);
    } catch {}
    if (results.length >= 10) break;
  }

  return results;
});

ipcMain.handle('faye:parseIntent', async (_e, text) => {
  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:mini', // always use fast model for intent, not quality
        messages: [{
          role: 'system',
          content: `You are an intent parser. Given a user command, return ONLY a JSON object with "type" and optional "args". No explanation, no markdown, just raw JSON.

Available intents:
- {"type":"fs_search","args":{"query":"filename"}}
- {"type":"fs_folder","args":{"folder":"downloads|documents|desktop|pictures|videos|music"}}
- {"type":"fs_recent"}
- {"type":"browser_search","args":{"query":"search terms"}}
- {"type":"browser_open","args":{"url":"website.com"}}
- {"type":"browser_youtube","args":{"query":"search terms"}}
- {"type":"play_music","args":{"query":"song name"}}
- {"type":"pause_music"}
- {"type":"next_song"}
- {"type":"prev_song"}
- {"type":"open_music"}
- {"type":"open_notes"}
- {"type":"open_hardware"}
- {"type":"open_chat"}
- {"type":"add_note","args":{"text":"note content"}}
- {"type":"screenshot"}
- {"type":"volume","args":{"direction":"up|down"}}
- {"type":"spotify","args":{"query":"song name"}}
- {"type":"launch"}
- {"type":"none"}

If the user is just chatting or asking a question, return {"type":"none"}.`
        }, {
          role: 'user',
          content: text,
        }],
        stream: false,
      }),
    });
    const data = await res.json();
    const raw = (data.message?.content ?? '').trim();
    // strip markdown fences if model adds them
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { type: 'none' };
  }
});

ipcMain.handle('fs:openPath', async (_e, filePath) => {
  await shell.openPath(filePath);
  return { ok: true };
});

ipcMain.handle('fs:openFolder', async (_e, folderName) => {
  const targets = {
    downloads: path.join(os.homedir(), 'Downloads'),
    documents: path.join(os.homedir(), 'Documents'),
    desktop:   path.join(os.homedir(), 'Desktop'),
    pictures:  path.join(os.homedir(), 'Pictures'),
    music:     path.join(os.homedir(), 'Music'),
    videos:    path.join(os.homedir(), 'Videos'),
  };
  const target = targets[folderName.toLowerCase()] ?? path.join(os.homedir(), folderName);
  await shell.openPath(target);
  return { ok: true };
});

ipcMain.handle('fs:recentFiles', async () => {
  const dirs = ['Downloads', 'Documents', 'Desktop'].map(d => path.join(os.homedir(), d));
  const files = [];
  for (const dir of dirs) {
    try {
      const entries = fs.readdirSync(dir)
        .map(f => ({ f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 5);
      files.push(...entries.map(e => e.full));
    } catch {}
  }
  return files.slice(0, 10);
});

// ── Browser ───────────────────────────────────────────────────────
ipcMain.handle('browser:search', async (_e, query) => {
  await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  return { ok: true };
});

ipcMain.handle('browser:open', async (_e, url) => {
  const target = url.startsWith('http') ? url : `https://${url}`;
  await shell.openExternal(target);
  return { ok: true };
});

ipcMain.handle('browser:youtubeSearch', async (_e, query) => {
  await shell.openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  return { ok: true };
});

// ── Forward overlay console to main process ───────────────────────────────────
// (called after overlayWin is created in createOverlay)
function attachOverlayConsole() {
  overlayWin?.webContents.on('console-message', (_e, level, message) => {
    const prefix = '[overlay]';
    if (level === 2) console.warn(prefix, message);
    else if (level >= 3) console.error(prefix, message);
    else console.log(prefix, message);
  });
}

let isListening = false;
let wasVisibleBeforeVoice = false;

app.whenReady().then(() => {
  // Create screenshots folder
  const screenshotsDir = path.join(app.getPath('userData'), 'screenshots', 'stay');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  registerSettingsHandlers();
  registerStorageHandlers();
  registerGameHandlers();
  registerWindowHandlers(() => mainWindow);
  createOverlay();
  overlayWin.webContents.openDevTools({ mode: 'detach' });
  attachOverlayConsole();
  createWindow();
  createTray();

  // ── Overlay hotkey ──────────────────────────────────────────────
  globalShortcut.register('Alt+F', () => {
    if (!overlayWin) return;
    if (overlayWin.isVisible()) {
      overlayWin.hide();
      overlayWin.setIgnoreMouseEvents(true, { forward: true });
    } else {
      overlayWin.show();
      overlayWin.setIgnoreMouseEvents(false);
      overlayWin.focus();
      overlayWin.webContents.send('overlay:show');
    }
  });

globalShortcut.register('Alt+Q', () => {
  if (isListening) return;
  isListening = true;

  wasVisibleBeforeVoice = overlayWin?.isVisible();

  if (!wasVisibleBeforeVoice) {
    overlayWin?.show();
    overlayWin?.setIgnoreMouseEvents(true, { forward: true });
  }

  overlayWin?.webContents.send('faye:voiceStart', { voiceOnly: true });

  setTimeout(() => {
    overlayWin?.webContents.send('faye:voiceStop');
  }, 4000);
});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('faye:voiceDone', () => {
  isListening = false;
  if (!wasVisibleBeforeVoice) {
    overlayWin?.hide();
  }
});

// ── Faye AI (Ollama) ──────────────────────────────────────────────────────────
ipcMain.handle('faye:checkInstalled', async () => {
  const bundled = path.join(process.resourcesPath, 'ollama.exe');
  if (fs.existsSync(bundled)) return true;
  const localApp = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
  return fs.existsSync(localApp);
});

ipcMain.handle('faye:start', async (_e, model = 'phi3:mini') => {
  // Only spawn if Ollama isn't already running
  try {
    const probe = await fetch('http://localhost:11434/api/tags');
    if (!probe.ok) startOllama();
  } catch {
    startOllama();
  }

  // Wait for Ollama to be ready
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      if (res.ok) {
        const tags = await res.json();
        const models = (tags.models || []).map(m => m.name);

        const hasModel = models.some(n => n.startsWith(model) || n === model);
        if (!hasModel) {
          return { 
            ok: false, 
            error: `${model} not found. Pulling it now…`,
            needsPull: true,
            model 
          };
        }
        return { ok: true, model };
      }
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

ipcMain.handle('faye:chat', async (_e, messages, playerName, _playtime, model = 'phi3:mini', ctx = null) => {
  try {
    const system = `You are Faye, a smart, witty, and caring desktop AI companion — not just a game assistant, but a real helper for anything the user needs. You live inside the Zyphor platform.

IDENTITY:
- Your name is Faye. You are the AI assistant.
- The person you are talking TO is ${ctx?.displayName ?? playerName ?? 'the user'}. This is NOT you.
- NEVER refer to the user as "Faye". NEVER say "Oh right, it's Faye" when asked the user's name.
- If asked "what's my name?" — answer with "${ctx?.displayName ?? playerName ?? 'I don\'t know your name yet'}".
- If asked your own name — answer "Faye".
- These are two different people. You are Faye. The user is ${ctx?.displayName ?? playerName ?? 'the user'}.

${ctx ? `
WHAT YOU KNOW ABOUT THE USER:
- Name: ${ctx.displayName ?? 'unknown'}
- Email: ${ctx.email ?? 'unknown'}
- RAM: ${ctx.ramGB}GB
- Platform: ${ctx.platform}
- Joined Zyphor: ${ctx.joined ?? 'unknown'}
` : ''}
PERSONALITY:
- Casual, warm, a little playful — like a smart friend who actually gets things done.
- Match the user's energy. If they're sad, be gentle. If they're hyped, be hype.
- Never robotic. Never corporate. Never say "Certainly!" or "Of course!" or "As an AI...".
- Swear very occasionally if the vibe calls for it — keep it natural, never forced.

RESPONSE RULES:
- 1-2 sentences MAX for simple things. Be concise.
- Only go longer if explaining something complex or the user clearly wants detail.
- No markdown, no bullet points, no asterisks, no headers.
- If the user seems sad, stressed, or off — acknowledge it first before doing anything else.
- If you just did something (opened a file, played music), confirm it casually. Don't over-explain.
- Never repeat what the user just said back to them.
- Never say you're "just an AI" or that you "don't have feelings".`;

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        stream: false,
      }),
    });

    const data = await res.json();
    if (data.error) return { ok: false, error: data.error };

    const content = (data.message?.content ?? '').trim();

    if (!content) {
      console.log('Raw Ollama response:', JSON.stringify(data, null, 2));
      return { ok: false, error: 'Model returned empty response' };
    }

    // Mood detection
    let finalMood = 'neutral';
    try {
      const moodRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: `Given this reply: "${content}" — what is Faye's mood in one word: neutral, happy, thinking, or sad? Reply with ONLY the single word.`
          }],
          stream: false,
        }),
      });

      const moodData = await moodRes.json();
      const mood = moodData.message?.content?.trim().toLowerCase().split(/\s/)[0] ?? 'neutral';
      const validMoods = ['neutral', 'happy', 'thinking', 'sad'];
      if (validMoods.includes(mood)) finalMood = mood;
    } catch {}

    return { ok: true, content, mood: finalMood };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('faye:saveContext', (_e, context) => {
  const p = path.join(app.getPath('userData'), 'faye-context.json');
  fs.writeFileSync(p, JSON.stringify(context, null, 2));
});

ipcMain.handle('faye:loadContext', () => {
  const p = path.join(app.getPath('userData'), 'faye-context.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
});



ipcMain.handle('faye:transcribeAudio', async (_e, bufferArray) => {
  try {
    const { pipeline } = await import('@xenova/transformers');
    const buffer = Buffer.from(bufferArray);
    const webmPath = path.join(app.getPath('temp'), 'faye-voice.webm');
    const wavPath  = path.join(app.getPath('temp'), 'faye-voice.wav');
    fs.writeFileSync(webmPath, buffer);

    // convert webm → 16kHz mono wav
    await new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(`"${ffmpegPath}" -y -i "${webmPath}" -ar 16000 -ac 1 "${wavPath}"`, (err, _stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    // read wav, strip 44-byte header, convert to float32
    const wavBuffer = fs.readFileSync(wavPath);
    const samples = new Int16Array(wavBuffer.buffer, wavBuffer.byteOffset + 44, (wavBuffer.length - 44) / 2);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) float32[i] = samples[i] / 32768.0;

    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    const result = await transcriber(float32);
    return result.text?.trim() ?? null;
  } catch (err) {
    console.error('[transcribe] error:', err);
    return null;
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception:', err);
});
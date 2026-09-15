const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen, Notification, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { Readable } = require('stream');

// ── Single Instance Lock ──────────────────────────────────────────────────────
const isUninstallMode = process.argv.includes('--mode=uninstall') || process.argv.includes('--uninstall');

const gotTheLock = isUninstallMode ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[main] Another instance is already running. Quitting duplicate instance.');
  app.quit();
  process.exit(0);
}

const { execFile } = require('child_process');
const Registry = require('winreg');

const { exec } = require('child_process');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:5173');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');

const { spawn } = require('child_process');
let ollamaProcess = null;

const ffmpegPath = require('ffmpeg-static');

let autoUpdater = null;
if (!isUninstallMode) {
  try {
    const updaterModule = require('electron-updater');
    autoUpdater = updaterModule.autoUpdater;
    if (autoUpdater) {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;

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
        mainWindow?.webContents.send('updater:error', err?.message || String(err));
      });

      autoUpdater.on('checking-for-update', () => {
        mainWindow?.webContents.send('updater:checking');
      });
    }
  } catch (err) {
    console.warn('[main] autoUpdater initialization bypassed/failed:', err?.message || err);
  }
}

const immersionEngine = require('./immersionEngine');

let activeLauncherSettings = {
  immersionBlackoutSecondary: true,
  immersionLockCursor: true,
  immersionBlockWinKeys: true,
  immersionAutoAudio: false,
  immersionHighPriority: true,
  immersionAutoHDR: false,
};

ipcMain.on('settings-changed', (_e, s) => {
  activeLauncherSettings = { ...activeLauncherSettings, ...s };
});

ipcMain.handle('system:getRamGB', () => {
  const totalBytes = require('os').totalmem();
  return Math.round(totalBytes / (1024 ** 3));
});

let cachedStaticHardware = {
  motherboardManufacturer: 'Gigabyte Technology Co., Ltd.',
  motherboardModel: 'B450M DS3H V2',
  motherboard: 'Gigabyte Technology Co., Ltd. B450M DS3H V2',
  cpuFullName: '',
};

function fetchStaticBoardAndCpuAsync() {
  const cp = require('child_process');
  cp.exec('wmic baseboard get Manufacturer,Product', { windowsHide: true, timeout: 3000 }, (err, mbOut) => {
    let mbManufacturer = 'Gigabyte Technology Co., Ltd.';
    let mbModel = 'B450M DS3H V2';
    if (!err && mbOut) {
      const lines = mbOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const parts = lines[1].replace(/\s{2,}/g, '|').split('|');
        if (parts.length >= 2) {
          mbManufacturer = parts[0];
          mbModel = parts[1];
        }
      }
    }
    cp.exec('wmic cpu get name', { windowsHide: true, timeout: 3000 }, (err2, cpuOut) => {
      let cpuFull = '';
      if (!err2 && cpuOut) {
        const lines = cpuOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) cpuFull = lines[1];
      }
      cachedStaticHardware = {
        motherboardManufacturer: mbManufacturer,
        motherboardModel: mbModel,
        motherboard: `${mbManufacturer} ${mbModel}`.trim(),
        cpuFullName: cpuFull,
      };
    });
  });
}
fetchStaticBoardAndCpuAsync();

let lastGpuPollTime = 0;
let isGpuPolling = false;
let lastGpuData = {
  gpuName: 'NVIDIA GeForce GTX 1650',
  gpuLoad: 8,
  gpuTemp: 52,
  vramTotal: 4.0,
  vramUsed: 2.0,
  vramFree: 2.0,
  vramPercent: 50,
};

function pollGpuStatsAsync() {
  const now = Date.now();
  if (now - lastGpuPollTime < 3000 || isGpuPolling) return;
  lastGpuPollTime = now;
  isGpuPolling = true;

  const cp = require('child_process');
  cp.exec('nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.total,memory.used,memory.free --format=csv,noheader,nounits', {
    windowsHide: true,
    timeout: 2000,
  }, (err, stdout) => {
    isGpuPolling = false;
    if (!err && stdout) {
      const parts = stdout.trim().split(',').map(s => s.trim());
      if (parts.length >= 6) {
        const name = parts[0];
        const temp = parseInt(parts[1], 10) || 50;
        const load = parseInt(parts[2], 10) || 5;
        const totalMb = parseInt(parts[3], 10) || 4096;
        const usedMb = parseInt(parts[4], 10) || 2048;
        const freeMb = parseInt(parts[5], 10) || (totalMb - usedMb);
        const totalGb = Number((totalMb / 1024).toFixed(1));
        const usedGb = Number((usedMb / 1024).toFixed(1));
        const freeGb = Number((freeMb / 1024).toFixed(1));
        const pct = Math.round((usedMb / totalMb) * 100);
        lastGpuData = {
          gpuName: name,
          gpuLoad: load,
          gpuTemp: temp,
          vramTotal: totalGb,
          vramUsed: usedGb,
          vramFree: freeGb,
          vramPercent: pct,
        };
      }
    }
  });
}

let lastCpuStatsTimes = null;
let lastCpuStatsTimestamp = 0;
let cachedLiveCpuLoad = 8;

function getNonBlockingCpuLoad() {
  const os = require('os');
  const now = Date.now();
  const cpus = os.cpus() || [];
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }

  if (lastCpuStatsTimes && (now - lastCpuStatsTimestamp) >= 500) {
    const idleDiff = idle - lastCpuStatsTimes.idle;
    const totalDiff = total - lastCpuStatsTimes.total;
    if (totalDiff > 0) {
      cachedLiveCpuLoad = Math.max(2, Math.min(100, Math.round(100 - (100 * idleDiff / totalDiff))));
    }
    lastCpuStatsTimes = { idle, total };
    lastCpuStatsTimestamp = now;
  } else if (!lastCpuStatsTimes) {
    lastCpuStatsTimes = { idle, total };
    lastCpuStatsTimestamp = now;
  }
  return cachedLiveCpuLoad;
}

ipcMain.handle('system:getHardwareStats', async () => {
  const os = require('os');
  const cpus = os.cpus() || [];
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'System Multi-Core CPU';
  const cpuSpeed = cpus.length > 0 ? cpus[0].speed : 0;
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramTotalGB = Number((totalMem / (1024 ** 3)).toFixed(1));
  const ramUsedGB = Number((usedMem / (1024 ** 3)).toFixed(1));
  const ramPercent = Math.round((usedMem / totalMem) * 100);
  const cpuLoad = getNonBlockingCpuLoad();

  pollGpuStatsAsync();

  const cpuSpeedGhz = cpuSpeed ? Number((cpuSpeed > 100 ? cpuSpeed / 1000 : cpuSpeed).toFixed(2)) : 3.9;
  const cpuTemp = Math.round(40 + (cpuLoad * 0.3) + Math.max(0, (lastGpuData.gpuTemp - 40) * 0.15));
  const mbTemp = Math.round(36 + (cpuLoad * 0.1) + Math.max(0, (lastGpuData.gpuTemp - 40) * 0.08));

  return {
    cpuName: cachedStaticHardware.cpuFullName || cpuModel,
    cpuCores: 6,
    cpuThreads: cpus.length,
    cpuSpeed: cpuSpeedGhz,
    cpu: cpuLoad,
    cpuTemp,
    ram: ramPercent,
    ramUsed: ramUsedGB,
    ramTotal: ramTotalGB,
    ramFree: Number((freeMem / (1024 ** 3)).toFixed(1)),
    gpuName: lastGpuData.gpuName,
    gpu: lastGpuData.gpuLoad,
    gpuTemp: lastGpuData.gpuTemp,
    vramTotal: lastGpuData.vramTotal,
    vramUsed: lastGpuData.vramUsed,
    vramFree: lastGpuData.vramFree,
    vramPercent: lastGpuData.vramPercent,
    motherboard: cachedStaticHardware.motherboard,
    motherboardManufacturer: cachedStaticHardware.motherboardManufacturer,
    motherboardModel: cachedStaticHardware.motherboardModel,
    motherboardTemp: mbTemp,
    fps: isGameProcessRunning() ? 144 : 60,
    osPlatform: os.platform(),
    osRelease: os.release(),
    osArch: os.arch(),
    uptimeHours: (os.uptime() / 3600).toFixed(1),
  };
});

ipcMain.handle('system:checkHDRSupport', async () => {
  return await immersionEngine.checkHDRSupport();
});

ipcMain.handle('ytm-search', async (_event, query) => {
  try {
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
    const d = await res.json();
    const items = d.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents || [];
    
    const results = [];
    for (const it of items) {
      const r = it.musicResponsiveListItemRenderer;
      if (!r) continue;
      const flex = r.flexColumns || [];
      const title = flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
      const artist = flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
      const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const thumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null;
      const videoId = r.playlistItemData?.videoId || r.doubleTapEndpoint?.watchEndpoint?.videoId;
      
      if (title && videoId) {
        results.push({
          id: videoId,
          videoId,
          title,
          artist: artist || 'Official Artist',
          artwork: thumb,
        });
      }
    }
    return results;
  } catch (err) {
    console.error('[ytm-search] Error:', err);
    return [];
  }
});

ipcMain.handle('updater:check', async () => {
  if (!autoUpdater) {
    return { error: 'Updater inactive' };
  }
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

// ── Steamworks Client Integration ──────────────────────────────────────────
const STEAM_APP_ID = 4956550;
let steamClient = null;

function initSteamworks() {
  if (steamClient) return steamClient;
  try {
    const steamworks = require('steamworks.js');
    steamClient = steamworks.init(STEAM_APP_ID);
    console.log('[Steamworks] Initialized successfully for AppID:', STEAM_APP_ID);
  } catch (err) {
    console.warn('[Steamworks] Failed to initialize (Steam client may not be running):', err.message);
    steamClient = null;
  }
  return steamClient;
}

ipcMain.handle('steam:getStatus', async () => {
  const client = initSteamworks();
  if (!client) return { initialized: false };
  try {
    const steamId = client.localplayer.getSteamId();
    const name = client.localplayer.getName();
    let ownsGame = false;
    try {
      ownsGame = Boolean(client.apps.isSubscribedApp(STEAM_APP_ID) || client.apps.isSubscribed());
    } catch (e) {
      console.warn('[steam:getStatus] isSubscribed error:', e);
    }
    return {
      initialized: true,
      steamId64: steamId.steamId64.toString(),
      name,
      ownsGame,
    };
  } catch (err) {
    console.error('[steam:getStatus] Error:', err);
    return { initialized: false, error: err.message };
  }
});

ipcMain.handle('steam:getAuthTicket', async () => {
  const client = initSteamworks();
  if (!client) return { ok: false, reason: 'steam_not_running' };
  try {
    const ticketObj = await client.auth.getAuthTicketForWebApi('zyphor_backend');
    const buf = ticketObj.getBytes();
    const hex = buf.toString('hex');
    const steamId = client.localplayer.getSteamId().steamId64.toString();
    return {
      ok: true,
      ticket: hex,
      steamId,
    };
  } catch (err) {
    console.error('[steam:getAuthTicket] Error:', err);
    return { ok: false, reason: 'ticket_error', error: err.message };
  }
});

ipcMain.handle('steam:getAchievements', async (_e, appId) => {
  const numAppId = Number(appId) || STEAM_APP_ID;
  const client = initSteamworks();
  if (!client) return { ok: false, reason: 'steam_not_running' };
  try {
    const achList = ['JUSTICE_SERVED', 'MAKE_A_WISH', 'EYES_EVERYWHERE', 'DINNER_TIME', 'UNEXPECTED_VISITOR'];
    const achievements = achList.map((apiName) => {
      let achieved = false;
      try {
        achieved = Boolean(client.achievement.isActivated(apiName));
      } catch {}
      return { apiName, achieved };
    });
    let owns = false;
    try {
      owns = Boolean(client.apps.isSubscribedApp(numAppId) || client.apps.isSubscribed());
    } catch {}
    return {
      ok: true,
      appId: numAppId,
      owns,
      achievements,
    };
  } catch (err) {
    console.error('[steam:getAchievements] Error:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('steam:getInstalledGames', async () => {
  const games = [];
  try {
    const steamRoot = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam');
    const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
    const libPaths = [steamRoot];
    
    if (fs.existsSync(vdfPath)) {
      const vdf = fs.readFileSync(vdfPath, 'utf-8');
      const matches = [...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '\\'));
      for (const p of matches) {
        if (!libPaths.includes(p) && fs.existsSync(p)) {
          libPaths.push(p);
        }
      }
    }

    for (const lib of libPaths) {
      const steamAppsDir = path.join(lib, 'steamapps');
      if (!fs.existsSync(steamAppsDir)) continue;
      
      const files = fs.readdirSync(steamAppsDir);
      for (const file of files) {
        if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
          try {
            const content = fs.readFileSync(path.join(steamAppsDir, file), 'utf-8');
            const appIdMatch = content.match(/"appid"\s+"([^"]+)"/);
            const nameMatch = content.match(/"name"\s+"([^"]+)"/);
            const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
            const sizeMatch = content.match(/"SizeOnDisk"\s+"([^"]+)"/);
            
            if (appIdMatch && nameMatch) {
              const appId = appIdMatch[1];
              const name = nameMatch[1];
              const installDir = installDirMatch ? installDirMatch[1] : '';
              const sizeBytes = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
              
              if (appId !== '228980') {
                games.push({
                  appId,
                  name,
                  installDir,
                  sizeGB: (sizeBytes / (1024 ** 3)).toFixed(2),
                  libraryPath: lib,
                  headerImg: `https://shared.akamai.steamstatic.com/community_assets/images/apps/${appId}/header.jpg`,
                  iconImg: `https://shared.akamai.steamstatic.com/community_assets/images/apps/${appId}/logo.png`,
                });
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('[steam:getInstalledGames] Error:', err);
  }

  // Ensure STAY is always present in library list
  if (!games.some(g => g.appId === '4956550')) {
    games.unshift({
      appId: '4956550',
      name: 'STAY: Possession',
      installDir: 'STAY',
      sizeGB: '14.20',
      libraryPath: 'Default',
      headerImg: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/header.jpg',
      iconImg: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/logo.png',
    });
  }

  return games;
});

// ── Steam Workshop (UGC) Handlers ──────────────────────────────────────────
const { registerWorkshopHandlers } = require('./ipc/workshopHandlers');
registerWorkshopHandlers(initSteamworks, STEAM_APP_ID);

// ── Native File Dialog Handlers ──────────────────────────────────────────
ipcMain.handle('dialog:pickVideoFile', async () => {
  const focusedWin = BrowserWindow.getFocusedWindow() || mainWindow;
  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWin, {
    title: 'Select Background Video',
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'webm', 'mkv', 'mov'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:pickImageFile', async () => {
  const focusedWin = BrowserWindow.getFocusedWindow() || mainWindow;
  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWin, {
    title: 'Select Preview Image',
    filters: [
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
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
  if (cfg.gamePath && fs.existsSync(cfg.gamePath)) return cfg.gamePath;

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

  // 3. Additional fallback candidates
  const additionalCandidates = [
    path.join(__dirname, '..', '..', 'game-build', 'STAY.exe'),
    path.join(process.cwd(), 'game', 'STAY.exe'),
    path.join(__dirname, '..', 'game', 'STAY.exe'),
    path.join(process.resourcesPath || '', 'game', 'STAY.exe'),
    path.join(path.dirname(app.getPath('exe')), 'STAY.exe'),
  ];
  for (const cand of additionalCandidates) {
    try {
      if (cand && fs.existsSync(cand)) return cand;
    } catch {}
  }

  return null;
}

let activeGameChild = null;

function isGameProcessRunning() {
  if (!activeGameChild || !activeGameChild.pid) return false;
  try {
    process.kill(activeGameChild.pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

ipcMain.handle('game:isRunning', () => isGameProcessRunning());

ipcMain.handle('game:stop', () => {
  if (activeGameChild && activeGameChild.pid) {
    try {
      process.kill(activeGameChild.pid);
      activeGameChild = null;
      return true;
    } catch {}
  }
  return false;
});

const TOKEN_SECRET_KEY = "zyphor_secret_token_key_stay_2026";

ipcMain.handle('launch-game', async (_, args = []) => {
  const gamePath = getGameExecutablePath();
  console.log('[launch-game] path:', gamePath);
  console.log('[launch-game] exists:', gamePath ? fs.existsSync(gamePath) : false);

  if (!gamePath) {
    return {
      ok: false,
      reason: 'exe_not_found',
      error: 'Game executable (STAY.exe) could not be found. Please check your game installation folder.',
    };
  }

  // Extract UID from args if passed from renderer
  const uidArg = args.find(a => a.startsWith('--zyphor-uid='));
  const uid = uidArg ? uidArg.split('=')[1] : null;

  const extraArgs = [...args];

  // If steam client is active, generate ephemeral HMAC-SHA256 signed launch token
  try {
    const client = initSteamworks();
    if (client && uid) {
      const crypto = require('crypto');
      const steamId = client.localplayer.getSteamId().steamId64.toString();
      const ts = Math.floor(Date.now() / 1000).toString();
      const payload = `${uid}:${steamId}:${STEAM_APP_ID}:${ts}`;
      const sig = crypto.createHmac('sha256', TOKEN_SECRET_KEY).update(payload).digest('hex');

      extraArgs.push(`--zyphor-token=1`);
      extraArgs.push(`--zyphor-token-sig=${sig}`);
      extraArgs.push(`--zyphor-token-ts=${ts}`);
      extraArgs.push(`--zyphor-steamid=${steamId}`);
      console.log('[launch-game] Generated signed launch token for SteamID:', steamId);
    }
  } catch (err) {
    console.warn('[launch-game] Could not generate launch token:', err.message);
  }

  // Pass screenshot directory to the game executable
  try {
    const sDir = screenshotsDir('stay');
    ensureWatchingScreenshotDir(sDir);
    extraArgs.push(`--zyphor-screenshot-dir=${sDir}`);
  } catch {}

  return new Promise((resolve) => {
    let settled = false;
    let child;

    try {
      child = spawn(gamePath, extraArgs, {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(gamePath), // Unity needs CWD to be the game folder
      });
    } catch (spawnErr) {
      console.error('[launch-game] Spawn error:', spawnErr);
      return resolve({
        ok: false,
        error: `Failed to start game process: ${spawnErr.message || 'Unknown spawn error'}`,
      });
    }

    const onError = (err) => {
      if (settled) return;
      settled = true;
      console.error('[launch-game] Process error:', err);
      resolve({
        ok: false,
        error: `Failed to start game: ${err.message || 'Unknown error'}`,
      });
    };

    const onExit = (code, signal) => {
      if (settled) return;
      settled = true;
      console.error(`[launch-game] Process exited immediately with code ${code}, signal ${signal}`);
      resolve({
        ok: false,
        error: code !== null && code !== 0
          ? `Game crashed or exited immediately (Exit code: ${code})`
          : 'Game closed immediately upon launch.',
      });
    };

    child.once('error', onError);
    child.once('exit', onExit);

    // Give process 1200ms grace period to verify it started and stayed running
    setTimeout(() => {
      if (settled) return;

      let isAlive = false;
      try {
        if (child && child.pid) {
          process.kill(child.pid, 0);
          isAlive = true;
        }
      } catch (err) {
        isAlive = (err.code === 'EPERM');
      }

      if (!isAlive) {
        settled = true;
        child.removeListener('error', onError);
        child.removeListener('exit', onExit);
        return resolve({
          ok: false,
          error: 'Game process terminated abruptly during startup.',
        });
      }

      settled = true;
      child.removeListener('error', onError);
      child.removeListener('exit', onExit);
      activeGameChild = child;

      // Activate Immersion Suite with current settings
      try {
        immersionEngine.onGameLaunch(activeLauncherSettings);
      } catch (e) {
        console.warn('[launch-game] Immersion engine onGameLaunch error:', e);
      }

      const gameCheckInterval = setInterval(() => {
        try {
          if (child && child.pid) {
            process.kill(child.pid, 0); // throws if process terminated
          }
        } catch {
          clearInterval(gameCheckInterval);
          activeGameChild = null;
          immersionEngine.onGameExit(activeLauncherSettings);
          mainWindow?.webContents.send('game:exit', { success: true });
        }
      }, 1500);

      child.on('exit', () => {
        clearInterval(gameCheckInterval);
        activeGameChild = null;
        immersionEngine.onGameExit(activeLauncherSettings);
        mainWindow?.webContents.send('game:exit', { success: true });
      });

      child.on('error', () => {
        clearInterval(gameCheckInterval);
        activeGameChild = null;
        immersionEngine.onGameExit(activeLauncherSettings);
      });

      child.unref();
      resolve({ ok: true, pid: child.pid });
    }, 1200);
  });
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

// ── ollama:getInstalledModels — returns list of model names currently installed ──
ipcMain.handle('ollama:getInstalledModels', async () => {
  try {
    try {
      const probe = await fetch('http://localhost:11434/api/tags');
      if (!probe.ok) startOllama();
    } catch {
      startOllama();
    }

    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        if (res.ok) {
          const { models = [] } = await res.json();
          return models.map(m => m.name);
        }
      } catch {}
    }
    return [];
  } catch {
    return [];
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
  if (autoUpdater) {
    autoUpdater.downloadUpdate();
  }
});

ipcMain.handle('updater:install', () => {
  isQuitting = true;
  if (overlayWin && !overlayWin.isDestroyed()) {
    try { overlayWin.destroy(); } catch {}
    overlayWin = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.destroy(); } catch {}
    mainWindow = null;
  }
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  } else {
    app.quit();
  }
});

const { registerSettingsHandlers, readSettings, writeSettings } = require('./ipc/settingsHandlers');
const { registerGameHandlers } = require('./ipc/gameHandlers');
const { registerWindowHandlers } = require('./ipc/windowHandlers');
const { registerStorageHandlers } = require('./ipc/storageIPC');

// Detect dev mode: either explicitly set, OR dist/index.html doesn't exist yet.
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(distIndex);

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {BrowserWindow | null} */
let overlayWin = null;

/** @type {Tray | null} */
let tray = null;
let isQuitting = false;

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  } else if (app.isReady()) {
    createWindow();
  }
});

function getTrayIcon() {
  const icoPath = path.join(__dirname, 'assets', 'tray.ico');
  const pngPath = path.join(__dirname, 'assets', 'tray.png');
  const png16Path = path.join(__dirname, 'assets', 'tray-16.png');
  const buildIco = path.join(__dirname, '..', 'build-resources', 'icons', 'win', 'icon.ico');
  const buildPng = path.join(__dirname, '..', 'build-resources', 'icon.png');

  if (process.platform === 'win32') {
    if (fs.existsSync(icoPath)) return nativeImage.createFromPath(icoPath);
    if (fs.existsSync(buildIco)) return nativeImage.createFromPath(buildIco);
  }
  if (fs.existsSync(pngPath)) return nativeImage.createFromPath(pngPath);
  if (fs.existsSync(png16Path)) return nativeImage.createFromPath(png16Path);
  if (fs.existsSync(buildPng)) return nativeImage.createFromPath(buildPng);
  return nativeImage.createEmpty();
}

function showLauncherWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
}

function toggleLauncherWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function toggleOverlayWindow() {
  if (!overlayWin || overlayWin.isDestroyed()) {
    createOverlay();
    return;
  }
  if (overlayWin.isVisible()) {
    overlayWin.hide();
    overlayWin.setIgnoreMouseEvents(true, { forward: true });
  } else {
    overlayWin.show();
    overlayWin.setIgnoreMouseEvents(false);
    overlayWin.focus();
    overlayWin.webContents.send('overlay:show');
  }
}

function buildTrayContextMenu() {
  const isRunning = isGameProcessRunning();
  const isWinVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const isOverlayVisible = Boolean(overlayWin && !overlayWin.isDestroyed() && overlayWin.isVisible());
  const version = app.getVersion();

  return Menu.buildFromTemplate([
    {
      label: `Zyphor Launcher (v${version})`,
      enabled: false,
    },
    {
      label: isRunning ? '● STAY: Running' : '○ STAY: Ready to Play',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isWinVisible ? 'Hide Launcher' : 'Open Launcher',
      click: () => {
        toggleLauncherWindow();
      },
    },
    {
      label: isRunning ? 'Stop Game' : 'Launch STAY',
      click: () => {
        if (isRunning) {
          if (activeGameChild && activeGameChild.pid) {
            try {
              process.kill(activeGameChild.pid);
              activeGameChild = null;
            } catch {}
          }
        } else {
          showLauncherWindow();
          mainWindow?.webContents.send('launcher:play');
        }
      },
    },
    {
      label: isOverlayVisible ? 'Hide Faye Overlay (Alt+F)' : 'Show Faye Overlay (Alt+F)',
      click: () => {
        toggleOverlayWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Screenshots Folder',
      click: () => {
        const screenshotsDir = path.join(app.getPath('userData'), 'screenshots', 'stay');
        fs.mkdirSync(screenshotsDir, { recursive: true });
        shell.openPath(screenshotsDir);
      },
    },
    {
      label: 'Check for Updates…',
      click: () => {
        showLauncherWindow();
        autoUpdater.checkForUpdates().catch(() => {});
      },
    },
    {
      label: 'Settings',
      click: () => {
        showLauncherWindow();
        mainWindow?.webContents.send('nav:navigate', 'settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Launcher',
      click: () => {
        isQuitting = true;
        if (tray) {
          try { tray.destroy(); } catch {}
          tray = null;
        }
        if (overlayWin && !overlayWin.isDestroyed()) {
          try { overlayWin.destroy(); } catch {}
          overlayWin = null;
        }
        app.quit();
      },
    },
  ]);
}

function updateTrayMenu() {
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(buildTrayContextMenu());
  }
}

function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Zyphor Launcher');
  tray.setContextMenu(buildTrayContextMenu());

  tray.on('right-click', () => {
    updateTrayMenu();
  });

  tray.on('click', () => {
    toggleLauncherWindow();
  });

  tray.on('double-click', () => {
    showLauncherWindow();
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
  const isCompactMode = isUninstallMode;

  mainWindow = new BrowserWindow({
    width: isCompactMode ? 900 : 1180,
    height: isCompactMode ? 600 : 740,
    minWidth: isCompactMode ? 880 : 960,
    minHeight: isCompactMode ? 560 : 600,
    resizable: !isCompactMode,
    maximizable: !isCompactMode,
    center: true,
    backgroundColor: '#0a0b0e',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // must be false — sandbox blocks require() in preload
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    // Apply remaining settings whenever renderer signals a change
    ipcMain.on('settings-changed', (_e, s) => {
      if (s && typeof s === 'object') {
        writeSettings(s);
      }
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
    updateTrayMenu();
  });

  mainWindow.on('show', () => {
    updateTrayMenu();
  });

  mainWindow.on('hide', () => {
    updateTrayMenu();
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:maximized-change', mainWindow ? Boolean(mainWindow.isMaximized()) : false);
  });

  // Log renderer-side errors to the main process console so black-screen
  // failures aren't silent.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[main] page failed to load: ${desc} (${code}) — ${url}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] renderer gone:', details);
  });
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) console.error('[renderer]', message, `(${sourceId || 'inline'}:${line || 0})`); // warn + error only
  });

  if (isDev) {
    const url = isUninstallMode ? 'http://localhost:5173?mode=uninstall' : 'http://localhost:5173';
    mainWindow.loadURL(url);
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    if (isUninstallMode) {
      mainWindow.loadFile(distIndex, { query: { mode: 'uninstall' } });
    } else {
      mainWindow.loadFile(distIndex);
    }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;

    if (isUninstallMode) {
      isQuitting = true;
      if (tray) {
        try { tray.destroy(); } catch {}
        tray = null;
      }
      if (overlayWin && !overlayWin.isDestroyed()) {
        try { overlayWin.destroy(); } catch {}
        overlayWin = null;
      }
      app.exit(0);
      return;
    }

    const s = readSettings();
    if (s.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
      updateTrayMenu();
    } else {
      isQuitting = true;
      if (tray) {
        try { tray.destroy(); } catch {}
        tray = null;
      }
      if (overlayWin && !overlayWin.isDestroyed()) {
        try { overlayWin.destroy(); } catch {}
        overlayWin = null;
      }
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    updateTrayMenu();
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
      backgroundThrottling: false,
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

// ── Watch Screenshots folder and notify on new files ─────────────────────────
const watchedScreenshotDirs = new Set();
let lastNotificationTime = 0;

function ensureWatchingScreenshotDir(dir) {
  if (watchedScreenshotDirs.has(dir)) return;
  watchedScreenshotDirs.add(dir);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.watch(dir, (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      const fullPath = path.join(dir, filename);
      // If file was created/exists and is an image
      if (fs.existsSync(fullPath) && /\.(png|jpe?g|webp|bmp)$/i.test(filename)) {
        const now = Date.now();
        if (now - lastNotificationTime > 1500) { // debounce notification
          lastNotificationTime = now;
          try {
            mainWindow?.webContents.send('screenshots:updated');
            if (Notification.isSupported()) {
              const notification = new Notification({
                title: 'Screenshot Saved',
                body: `Saved to Zyphor Launcher: ${filename}`,
                silent: false,
              });
              notification.on('click', () => {
                shell.showItemInFolder(fullPath);
              });
              notification.show();
            }
          } catch (e) {
            console.error('[Notification error]', e);
          }
        }
      }
    });
  } catch (err) {
    console.warn('[ensureWatchingScreenshotDir] watch failed:', err.message);
  }
}

// Auto-watch default stay screenshot directory
app.whenReady().then(() => {
  ensureWatchingScreenshotDir(screenshotsDir('stay'));
});

function toFileUrl(filePath) {
  // Convert backslashes to forward slashes and encode for URI
  const normalized = filePath.replace(/\\/g, '/');
  return `media://${encodeURI(normalized)}`;
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

    return files.map(({ f, full, mtime, size }) => {
      let src = toFileUrl(full);
      try {
        const ext = path.extname(f).toLowerCase().replace('.', '') || 'png';
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const buf = fs.readFileSync(full);
        src = `data:${mime};base64,${buf.toString('base64')}`;
      } catch (err) {
        console.warn('[screenshots:getAll] fallback to url for:', f, err.message);
      }

      return {
        name: path.basename(f, path.extname(f)),
        fileName: f,
        src,
        path: full,
        mtime,
        size,
      };
    });
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
  overlayWin?.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const prefix = '[overlay]';
    const loc = `(${sourceId || 'inline'}:${line || 0})`;
    if (level === 2) console.warn(prefix, message, loc);
    else if (level >= 3) console.error(prefix, message, loc);
    else console.log(prefix, message);
  });
}

let isListening = false;
let wasVisibleBeforeVoice = false;

app.whenReady().then(() => {
  // Register media:// protocol to safely load local screenshot images & stream background videos
  protocol.handle('media', (request) => {
    try {
      let raw = request.url.replace(/^media:\/+/i, '');
      let decodedPath = decodeURIComponent(raw);

      if (process.platform === 'win32') {
        if (/^[a-zA-Z]\//.test(decodedPath)) {
          decodedPath = decodedPath[0] + ':/' + decodedPath.slice(2);
        } else if (/^\/+[a-zA-Z]:/.test(decodedPath)) {
          decodedPath = decodedPath.replace(/^\/+/, '');
        } else if (/^\/+[a-zA-Z]\//.test(decodedPath)) {
          const stripped = decodedPath.replace(/^\/+/, '');
          decodedPath = stripped[0] + ':/' + stripped.slice(2);
        }
      }

      const normalized = path.normalize(decodedPath);
      if (!fs.existsSync(normalized)) {
        console.warn('[media protocol] File not found on disk:', normalized, 'from URL:', request.url);
        return new Response('File not found', { status: 404 });
      }

      return net.fetch(pathToFileURL(normalized).href);
    } catch (err) {
      console.error('[media protocol] error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // Create screenshots folder
  const screenshotsDir = path.join(app.getPath('userData'), 'screenshots', 'stay');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  registerSettingsHandlers();
  registerStorageHandlers();
  registerGameHandlers();
  registerWindowHandlers(() => mainWindow);
  createOverlay();
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

// ── Uninstall IPC Handlers ──────────────────────────────────────────────────
ipcMain.handle('uninstall:isMode', () => isUninstallMode);

ipcMain.handle('uninstall:execute', async (_event, options = {}) => {
  const { keepSettings = true, keepSaves = true, keepGameFiles = true, keepScreenshots = true } = options;
  console.log('[uninstall] Performing uninstallation with options:', options);

  const appData = app.getPath('appData');

  // 1. Remove screenshots if requested
  if (!keepScreenshots) {
    const screenshotsDir = path.join(appData, 'ZyphorLauncher', 'screenshots');
    try {
      if (fs.existsSync(screenshotsDir)) {
        fs.rmSync(screenshotsDir, { recursive: true, force: true });
        console.log('[uninstall] Removed screenshots directory:', screenshotsDir);
      }
    } catch (e) {
      console.warn('[uninstall] Failed to remove screenshots:', e);
    }
  }

  // 2. Remove settings / local session data if requested
  if (!keepSettings) {
    const launcherDataDir = path.join(appData, 'stay-launcher');
    const zyphorDataDir = path.join(appData, 'Zyphor Launcher');
    [launcherDataDir, zyphorDataDir].forEach((dir) => {
      try {
        if (fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir);
          for (const entry of entries) {
            if (keepScreenshots && entry === 'screenshots') continue;
            fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
          }
          console.log('[uninstall] Cleaned app data directory:', dir);
        }
      } catch (e) {
        console.warn('[uninstall] Failed to clean app data:', e);
      }
    });
  }

  return { success: true };
});

ipcMain.on('uninstall:cancel', () => {
  console.log('[uninstall] User cancelled uninstallation.');
  isQuitting = true;
  app.exit(1);
});

ipcMain.on('uninstall:quit', () => {
  console.log('[uninstall] Uninstallation completed by user.');
  isQuitting = true;
  app.exit(0);
});

app.on('before-quit', () => {
  isQuitting = true;
  if (tray) {
    try { tray.destroy(); } catch {}
    tray = null;
  }
  if (overlayWin && !overlayWin.isDestroyed()) {
    try { overlayWin.destroy(); } catch {}
    overlayWin = null;
  }
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
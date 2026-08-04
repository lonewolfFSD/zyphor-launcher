// Main-process IPC handlers for launcher disk usage + a native video file picker.
//
// In main.js:
//   const { registerStorageHandlers } = require('./storageIPC');
//   registerStorageHandlers(); // no args needed — uses Electron app paths
//
// In preload.js, add to the existing contextBridge.exposeInMainWorld('launcherAPI', { ... }):
//   getDiskItems: () => ipcRenderer.invoke('storage:get-items'),
//   getDiskSpace: () => ipcRenderer.invoke('storage:get-disk-space'),
//   deleteItems: (paths) => ipcRenderer.invoke('storage:delete-items', paths),
//   pickVideoFile: () => ipcRenderer.invoke('appearance:pick-video'),

const { ipcMain, dialog, app } = require('electron');
const fs = require('fs/promises');
const path = require('path');

// Launcher-owned folders Electron manages automatically.
// These are resolved at call time using app.getPath() so they always
// point to the real locations on disk regardless of OS or username.
function getItemManifest() {
  const userData   = app.getPath('userData');   // %APPDATA%\Zyphor Launcher
  const logs       = app.getPath('logs');        // userData\logs
  const temp       = app.getPath('temp');        // system temp — Electron writes crash dumps here
  const appPath    = path.dirname(app.getPath('exe')); // folder containing the .exe

  return [
    {
      id: 'userdata',
      name: 'App Data',
      fullPath: userData,
      required: true,
      hint: 'Settings, cache, and update files',
    },
    {
      id: 'logs',
      name: 'Logs',
      fullPath: logs,
      required: false,
      hint: 'Launcher log files — safe to delete',
    },
    {
      id: 'updatorcache',
      name: 'Updater Cache',
      fullPath: path.join(userData, 'update-cache'),
      required: false,
      hint: 'Pending or downloaded update files',
    },
    {
      id: 'sessioncache',
      name: 'Session Cache',
      fullPath: path.join(userData, 'Cache'),
      required: false,
      hint: 'Electron renderer cache — safe to delete',
    },
    {
      id: 'gpucache',
      name: 'GPU Cache',
      fullPath: path.join(userData, 'GPUCache'),
      required: false,
      hint: 'Shader / GPU cache — safe to delete',
    },
    {
      id: 'install',
      name: 'Launcher Installation',
      fullPath: appPath,
      required: true,
      hint: 'The launcher executable and resources',
    },
  ];
}

async function getFolderSizeBytes(dir) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await getFolderSizeBytes(full);
    } else {
      try {
        const stat = await fs.stat(full);
        total += stat.size;
      } catch {
        // file vanished mid-walk — skip
      }
    }
  }
  return total;
}

function registerStorageHandlers() {
  ipcMain.handle('storage:get-items', async () => {
    const manifest = getItemManifest();
    const items = [];

    for (const def of manifest) {
      let stat;
      try {
        stat = await fs.stat(def.fullPath);
      } catch {
        // folder doesn't exist yet (e.g. no logs written yet) — skip
        continue;
      }

      const bytes = await getFolderSizeBytes(def.fullPath);
      items.push({
        id: def.id,
        name: def.name,
        path: def.fullPath,
        hint: def.hint,
        sizeMB: bytes / (1024 * 1024),
        required: def.required,
        lastModified: stat.mtime.toLocaleDateString(),
      });
    }

    return items;
  });

  ipcMain.handle('storage:get-disk-space', async () => {
    // Use the userData drive — that's where all launcher files live
    const userData = app.getPath('userData');
    try {
      const stats = await fs.statfs(userData);
      const blockSize = stats.bsize;
      return {
        totalMB: (stats.blocks * blockSize) / (1024 * 1024),
        freeMB:  (stats.bavail * blockSize) / (1024 * 1024),
      };
    } catch {
      return { totalMB: null, freeMB: null };
    }
  });

  ipcMain.handle('storage:delete-items', async (_event, itemPaths) => {
    for (const p of itemPaths) {
      await fs.rm(p, { recursive: true, force: true });
    }
    return true;
  });

  ipcMain.handle('appearance:pick-video', async (event) => {
    const win = event.sender.getOwnerBrowserWindow?.();
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a background video',
      filters: [{ name: 'Video', extensions: ['mp4', 'webm'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
}

module.exports = { registerStorageHandlers };
// Main-process IPC handlers for real disk usage + a native video file picker.
// Wire this into your existing main process — it isn't auto-loaded anywhere.
//
// In main.js:
//   const { registerStorageHandlers } = require('./storageIPC');
//   registerStorageHandlers(() => currentSettings.gamePath); // pass a getter for the install path
//
// In preload.js, add to the existing contextBridge.exposeInMainWorld('launcherAPI', { ... }):
//   getDiskItems: () => ipcRenderer.invoke('storage:get-items'),
//   getDiskSpace: () => ipcRenderer.invoke('storage:get-disk-space'),
//   deleteItems: (paths) => ipcRenderer.invoke('storage:delete-items', paths),
//   pickVideoFile: () => ipcRenderer.invoke('appearance:pick-video'),

const { ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

// Real on-disk folder layout under the install directory. Update the
// relativePath values to match STAY's actual structure — these are folder
// names to scan, not sizes; every size below is computed from the real
// filesystem at call time.
const ITEM_MANIFEST = [
  { id: 'assets', name: 'Game Assets', relativePath: 'assets', required: true },
  { id: 'shaders', name: 'Shader Cache', relativePath: 'shaders', required: false },
  { id: 'libs', name: 'Shared Libraries', relativePath: 'libraries', required: true },
  { id: 'saves', name: 'Save Files', relativePath: 'saves', required: false, instance: true },
  { id: 'versioncache', name: 'Version Cache', relativePath: 'versions', required: true },
  { id: 'update', name: 'Pending Update Files', relativePath: 'update-cache', required: false },
];

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
        // file vanished mid-walk (e.g. concurrent write) — skip it
      }
    }
  }
  return total;
}

function registerStorageHandlers(getGamePath) {
  ipcMain.handle('storage:get-items', async () => {
    const basePath = getGamePath();
    if (!basePath) return [];

    const items = [];
    for (const def of ITEM_MANIFEST) {
      const fullPath = path.join(basePath, def.relativePath);
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue; // folder doesn't exist on this machine — don't fabricate it
      }
      const bytes = await getFolderSizeBytes(fullPath);
      items.push({
        id: def.id,
        name: def.name,
        path: fullPath,
        sizeMB: bytes / (1024 * 1024),
        required: def.required,
        instance: !!def.instance,
        lastPlayed: def.instance ? stat.mtime.toLocaleDateString() : null,
      });
    }
    return items;
  });

  ipcMain.handle('storage:get-disk-space', async () => {
    const basePath = getGamePath();
    if (!basePath) return { totalMB: null, freeMB: null };
    // fs.statfs is cross-platform since Node 18.15 (Windows, macOS, Linux).
    const stats = await fs.statfs(basePath);
    const blockSize = stats.bsize;
    return {
      totalMB: (stats.blocks * blockSize) / (1024 * 1024),
      freeMB: (stats.bavail * blockSize) / (1024 * 1024),
    };
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
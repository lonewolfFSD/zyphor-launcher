const { app, ipcMain, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { readSettings } = require('./settingsHandlers');

const EXECUTABLE_NAME = 'STAY.exe';

/**
 * Where we look for STAY.exe, in priority order:
 *   1. A custom path the player set in Settings.
 *   2. Bundled next to the launcher, under resources/game (production build,
 *      see the `extraResources` entry in package.json).
 *   3. A `game/` folder next to the project root (local dev convenience).
 *   4. Directly beside the launcher's own executable (portable installs).
 */
function resolveGamePath() {
  const settings = readSettings();
  const candidates = [];

  if (settings.gamePath) {
    candidates.push(settings.gamePath);
  }

  if (process.env.NODE_ENV === 'development') {
    candidates.push(path.join(process.cwd(), 'game', EXECUTABLE_NAME));
  } else {
    candidates.push(path.join(process.resourcesPath, 'game', EXECUTABLE_NAME));
  }

  candidates.push(path.join(path.dirname(app.getPath('exe')), EXECUTABLE_NAME));

  return candidates.find((candidatePath) => {
    try {
      return fs.existsSync(candidatePath);
    } catch {
      return false;
    }
  });
}

function registerGameHandlers() {
  ipcMain.handle('game:launch', () => {
    const gamePath = resolveGamePath();

    if (!gamePath) {
      return {
        success: false,
        error: 'not-found',
        message: `Could not find ${EXECUTABLE_NAME}. Set the correct game folder in Settings.`,
      };
    }

    try {
      const child = spawn(gamePath, [], {
        cwd: path.dirname(gamePath),
        detached: true,
        stdio: 'ignore',
      });

      // Detached + unref so the game keeps running independently of the
      // launcher process (and the launcher isn't blocked waiting on it).
      child.unref();

      child.on('error', (err) => {
        console.error('[game] failed to start:', err);
        broadcastGameExit({ success: false, error: 'spawn-failed', message: err.message });
      });

      return { success: true, path: gamePath };
    } catch (err) {
      return { success: false, error: 'spawn-failed', message: err.message };
    }
  });
}

function broadcastGameExit(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('game:exit', payload);
  }
}

module.exports = { registerGameHandlers, resolveGamePath };

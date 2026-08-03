const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS_PATH = path.join(__dirname, '..', '..', 'config', 'settings.default.json');

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'launcher-settings.json');
}

function loadDefaults() {
  try {
    return JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf-8'));
  } catch (err) {
    console.error('[settings] failed to read bundled defaults:', err);
    // Hard-coded last resort so the launcher never crashes on a missing file.
    return {
      resolution: '1920x1080',
      fullscreen: true,
      graphicsQuality: 'High',
      masterVolume: 80,
      gamePath: '',
    };
  }
}

function readSettings() {
  const filePath = getSettingsFilePath();
  const defaults = loadDefaults();

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }

  try {
    const stored = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Merge so a launcher update that adds a new setting doesn't wipe
    // out — or crash on — an older settings file on disk.
    return { ...defaults, ...stored };
  } catch (err) {
    console.error('[settings] settings file was corrupt, restoring defaults:', err);
    fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
}

function writeSettings(nextSettings) {
  const filePath = getSettingsFilePath();
  const prev = readSettings();
  const merged = { ...prev, ...nextSettings };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');

  // Apply launchOnStartup immediately whenever it changes.
  if ('launchOnStartup' in nextSettings && nextSettings.launchOnStartup !== prev.launchOnStartup) {
    app.setLoginItemSettings({ openAtLogin: !!merged.launchOnStartup, openAsHidden: true });
  }

  return merged;
}

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:save', (_event, nextSettings) => writeSettings(nextSettings));
}

module.exports = { registerSettingsHandlers, readSettings, writeSettings };
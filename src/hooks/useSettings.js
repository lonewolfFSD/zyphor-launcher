import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'stay.launcher.settings.v1';

// Live theme/accent tokens the UI actually reads — see applyThemeVars() in SettingsPage.
export const THEMES = {
  oled:     { label: 'OLED Black',   bg: '#000000', surface: '#0a0a0a', border: 'rgba(255,255,255,0.07)' },
  dark:     { label: 'Dark',         bg: '#121212', surface: '#181818', border: 'rgba(255,255,255,0.09)' },
  midnight: { label: 'Midnight',     bg: '#0a0d16', surface: '#111726', border: 'rgba(255,255,255,0.08)' },
  charcoal: { label: 'Charcoal',     bg: '#1a1a1a', surface: '#222222', border: 'rgba(255,255,255,0.10)' },
  graphite: { label: 'Graphite',     bg: '#1c1c1e', surface: '#2c2c2e', border: 'rgba(255,255,255,0.10)' },
  obsidian: { label: 'Obsidian',     bg: '#080808', surface: '#0f0f0f', border: 'rgba(255,255,255,0.06)' },
  navy:     { label: 'Deep Navy',    bg: '#050a14', surface: '#0b1220', border: 'rgba(100,140,255,0.10)' },
  forest:   { label: 'Forest',       bg: '#060e0a', surface: '#0c1610', border: 'rgba(100,200,120,0.10)' },
  wine:     { label: 'Wine',         bg: '#0d0608', surface: '#160a0c', border: 'rgba(200,80,100,0.10)' },
  ash:      { label: 'Ash',          bg: '#111113', surface: '#19191c', border: 'rgba(255,255,255,0.08)' },
};

export const ACCENTS = {
  bulb:     { label: 'Warm Gold',   hex: '#e8b34d', on: '#000000' },
  steel:    { label: 'Cold Steel',  hex: '#8fa6b8', on: '#0a0f14' },
  rust:     { label: 'Rust',        hex: '#c1633a', on: '#140900' },
  mint:     { label: 'Mint',        hex: '#4ecb8d', on: '#001a0d' },
  violet:   { label: 'Violet',      hex: '#9b6dff', on: '#0d0020' },
  coral:    { label: 'Coral',       hex: '#ff6b6b', on: '#200000' },
  sky:      { label: 'Sky',         hex: '#4da8e8', on: '#001525' },
  peach:    { label: 'Peach',       hex: '#f4a261', on: '#1a0800' },
  lilac:    { label: 'Lilac',       hex: '#c084fc', on: '#150025' },
  jade:     { label: 'Jade',        hex: '#2dd4bf', on: '#001a17' },
  crimson:  { label: 'Crimson',     hex: '#e63946', on: '#1a0004' },
  sage:     { label: 'Sage',        hex: '#84a98c', on: '#050d06' },
};

const DEFAULTS = {
  theme: 'oled',
  accent: 'bulb',
  uiScale: '100',
  animations: true,
  reduceMotion: false,
  fontSize: 'normal',

  launchOnStartup: false,
  minimizeToTray: true,
  closeToTray: false,
  hardwareAcceleration: true,
  desktopNotifications: true,
  autoUpdate: true,
  updateChannel: 'stable',

  fullscreenOnLaunch: true,

  gamePath: '',
  logLevel: 'normal',

  devMode: false,
  checkUpdates: true,
  hardwareId: false,

  // Privacy
  userAnalytics: false,
  crashReports: true,
  personalisedContent: true,
  rememberLogin: true,

  // Only the type + a persistable path are stored; blob: URLs from a
  // browser-fallback <input type=file> don't survive a reload so they're
  // deliberately not part of DEFAULTS/persisted settings.
  backgroundVideoType: 'default', // 'default' | 'none' | 'custom'
  backgroundVideoPath: null,
  backgroundVideoName: null,
};

function loadFromDisk() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function persistToDisk(settings) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 300);
  });
}

// ── Singleton store ────────────────────────────────────────────────────────────
// All useSettings() callers share ONE settings object. When update() is called
// anywhere (e.g. SettingsPage), every subscriber (HomePage, NavRail, etc.)
// re-renders immediately — no restart needed.
const listeners = new Set();
let globalSettings = loadFromDisk();

function notifyAll(next) {
  globalSettings = next;
  listeners.forEach((fn) => fn(next));
}

function subscribeToStore(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Real settings store: reads/writes localStorage for user preferences, and
 * pulls actual on-disk usage over IPC (window.launcherAPI) rather than
 * fabricating item sizes. Requires the main process to expose:
 *   - launcherAPI.getDiskItems()   -> Promise<Array<{id,name,path,sizeMB,required,instance?,lastPlayed?}>>
 *   - launcherAPI.getDiskSpace()   -> Promise<{ totalMB, freeMB }>
 *   - launcherAPI.deleteItems(paths: string[]) -> Promise<boolean>
 *   - launcherAPI.pickVideoFile()  -> Promise<string | null>  (absolute file path)
 * See storageIPC.js for a reference main-process implementation of the
 * first three. If these aren't wired up yet, the storage section reports
 * itself as unavailable instead of showing made-up numbers.
 */
export function useSettings() {
  // Subscribe to the singleton — initialise from the already-loaded global
  const [settings, setSettings] = useState(globalSettings);
  const [status, setStatus] = useState('idle');

  const [diskItems, setDiskItems] = useState(null);
  const [diskTotalMB, setDiskTotalMB] = useState(null);
  const [diskFreeMB, setDiskFreeMB] = useState(null);
  const [diskStatus, setDiskStatus] = useState('loading'); // 'loading' | 'ready' | 'unavailable' | 'error'

  const saveTimer = useRef(null);
  const savedTimer = useRef(null);
  const pending = useRef(null);

  // Subscribe so any update() call — from any component — re-renders this one
  useEffect(() => {
    // Sync in case global changed between render and effect
    setSettings(globalSettings);
    return subscribeToStore(setSettings);
  }, []);

  const refreshDiskUsage = useCallback(async () => {
    if (!window.launcherAPI?.getDiskItems || !window.launcherAPI?.getDiskSpace) {
      setDiskStatus('unavailable');
      setDiskItems([]);
      setDiskTotalMB(null);
      setDiskFreeMB(null);
      return;
    }
    setDiskStatus('loading');
    try {
      const [items, space] = await Promise.all([
        window.launcherAPI.getDiskItems(),
        window.launcherAPI.getDiskSpace(),
      ]);
      setDiskItems((Array.isArray(items) ? items : []).map((i) => ({ ...i, selected: false })));
      setDiskTotalMB(space?.totalMB ?? null);
      setDiskFreeMB(space?.freeMB ?? null);
      setDiskStatus('ready');
    } catch {
      setDiskStatus('error');
      setDiskItems([]);
    }
  }, []);

  useEffect(() => {
    refreshDiskUsage();
  }, [refreshDiskUsage]);

  const toggleItemSelected = useCallback((id) => {
    setDiskItems((prev) => (prev ? prev.map((i) => (i.id === id && !i.required ? { ...i, selected: !i.selected } : i)) : prev));
  }, []);

  const uninstallSelected = useCallback(async () => {
    if (!diskItems) return;
    const targets = diskItems.filter((i) => i.selected);
    if (!targets.length) return;
    if (window.launcherAPI?.deleteItems) {
      try {
        await window.launcherAPI.deleteItems(targets.map((i) => i.path));
      } catch {
        // fall through and refresh anyway so the UI reflects real disk state
      }
    }
    await refreshDiskUsage();
  }, [diskItems, refreshDiskUsage]);

  const pickInstallLocation = useCallback(async () => {
    if (window.launcherAPI?.pickFolder) {
      const folder = await window.launcherAPI.pickFolder();
      if (folder) {
        update({ gamePath: folder });
        refreshDiskUsage();
      }
      return folder;
    }
    const folder = window.prompt('Install folder path', settings?.gamePath || '');
    if (folder) {
      update({ gamePath: folder });
      refreshDiskUsage();
    }
    return folder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, refreshDiskUsage]);

  const flush = useCallback((next) => {
    setStatus('saving');
    persistToDisk(next)
      .then(() => {
        setStatus('saved');
        savedTimer.current = setTimeout(() => setStatus('idle'), 1500);
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  const update = useCallback(
    (partial) => {
      const next = { ...globalSettings, ...partial };
      pending.current = next;
      notifyAll(next); // instantly updates every component using useSettings()

      window.launcherAPI?.settingsChanged?.(next); // add this line

      clearTimeout(saveTimer.current);
      clearTimeout(savedTimer.current);
      saveTimer.current = setTimeout(() => {
        if (pending.current) flush(pending.current);
      }, 250);
    },
    [flush]
  );

  const resetAll = useCallback(() => {
    const next = { ...DEFAULTS };
    pending.current = next;
    notifyAll(next);
    flush(next);
  }, [flush]);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(savedTimer.current);
    };
  }, []);

  return {
    settings,
    update,
    status,
    resetAll,

    diskItems,
    diskTotalMB,
    diskFreeMB,
    diskStatus,
    refreshDiskUsage,
    toggleItemSelected,
    uninstallSelected,
    pickInstallLocation,
  };
}
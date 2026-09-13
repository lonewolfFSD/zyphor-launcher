import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { motion, AnimatePresence } from 'framer-motion';
import TitleBar from './components/TitleBar.jsx';
import NavRail from './components/NavRail.jsx';
import AuthGate from './pages/Authgate.jsx';
import HomePage from './pages/HomePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import AchievementsPage from './pages/AchievementsPage.jsx';
import FriendsPage from './pages/Friendspage.jsx';
import { useSettings, THEMES, ACCENTS } from './hooks/useSettings.js';
import { loadUid, saveUid, clearSession } from './lib/authSession.js';
import ScreenshotsPage from './pages/ScreenshotsPage.jsx';
import FayePage from './pages/FayePage.tsx';
import Logo from './Logo/icon.png';
import { useHotkeys } from './hooks/useHotkeys.js';

import UpdateTourPage, { useUpdateTourCheck } from './pages/UpdateTourPage.jsx';
import UninstallPage from './pages/UninstallPage.jsx';
import InstallPage from './pages/InstallPage.jsx';

import DEFAULT_BACKGROUND_VIDEO from './pages/videos/test_video.mp4';
import SplashScreen from './components/SplashScreen.jsx';
import { I18nProvider } from './i18n/index.jsx';

const PRESET_VIDEO_MAP = {};
const PRESET_STATIC_MAP = {};

const PAGE_ORDER = {
  home: 0,
  news: 1,
  friends: 2,
  achievements: 3,
  screenshots: 4,
  settings: 5,
  faye: 6,
};



  
// ─── Global background video ──────────────────────────────────────────────────
function BackgroundVideo({ src, previewSrc, active, quality = 'hd', videoStyle = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    if (quality === 'static') return;
    const el = ref.current;
    if (!el) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active, quality, src]);

  useEffect(() => {
    if (quality === 'static' || !active) return;
    const el = ref.current;
    if (!el) return;
    function handleVisibilityChange() {
      if (document.hidden) el.pause();
      else el.play().catch(() => {});
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active, quality]);

  if (!src && !previewSrc) return null;

  const handleVideoError = (e) => {
    console.warn('[BackgroundVideo] failed to load:', src, e.target?.error);
    if (e.target && e.target.src !== DEFAULT_BACKGROUND_VIDEO) {
      // Fallback to default background video so screen is never black
      e.target.src = DEFAULT_BACKGROUND_VIDEO;
      e.target.play().catch(() => {});
    }
  };

  // Static mode: Use uploaded / Steam Workshop preview image, or still frame
  if (quality === 'static') {
    if (previewSrc) {
      return (
        <img
          src={previewSrc}
          alt="Static Background"
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
          style={videoStyle}
        />
      );
    }
    return (
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        onError={handleVideoError}
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
        style={videoStyle}
      />
    );
  }

  if (quality === 'sd') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: -20, overflow: 'hidden', pointerEvents: 'none' }}>
        <video
          ref={ref}
          src={src}
          autoPlay muted loop playsInline
          onError={handleVideoError}
          style={{ width: '40%', height: '40%', objectFit: 'cover', transform: 'scale(2.6)', transformOrigin: 'top left', filter: 'blur(0.5px)' }}
        />
      </div>
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      autoPlay muted loop playsInline
      onError={handleVideoError}
      onLoadedData={() => console.log('[BackgroundVideo] loaded ok:', src)}
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
      style={videoStyle}
    />
  );
}



function AnimatedGrid({ accent, active }) {
  const size = 42;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.12]"
      style={{
        backgroundImage: `linear-gradient(${accent.hex}66 1px, transparent 1px), linear-gradient(90deg, ${accent.hex}66 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        maskImage: 'radial-gradient(ellipse at 30% 20%, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, black 0%, transparent 70%)',
      }}
      animate={active ? { backgroundPosition: [`0px 0px`, `${size}px ${size}px`] } : {}}
      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
const PAGES = {
  home:         HomePage,
  news:         NewsPage,
  friends:      FriendsPage,
  achievements: AchievementsPage,
  screenshots:  ScreenshotsPage,
  settings:     SettingsPage,
  faye:         FayePage,
};

const MIN_SPLASH_MS = 8000;

export default function App() {
  // App.jsx
  const { settings, update: updateSettings } = useSettings();
  const theme  = THEMES[settings?.theme]   || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  const [profile, setProfile]           = useState(null);
  const [checking, setChecking]         = useState(true);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [pageDirection, setPageDirection] = useState(1);
  const directionRef = useRef(1);

  const [isUninstallMode, setIsUninstallMode] = useState(() => {
    return window.location.search.includes('uninstall') || window.location.hash.includes('uninstall');
  });

  const [isInstallMode, setIsInstallMode] = useState(() => {
    return window.location.search.includes('install') || window.location.hash.includes('install');
  });

  useEffect(() => {
    window.launcherAPI?.uninstall?.isMode?.().then((res) => {
      if (res) setIsUninstallMode(true);
    }).catch(() => {});

    window.launcherAPI?.install?.isMode?.().then((res) => {
      if (res) setIsInstallMode(true);
    }).catch(() => {});

    const handlePreviewUninstall = () => setIsUninstallMode(true);
    const handlePreviewInstall = () => setIsInstallMode(true);

    window.addEventListener('launcher:preview-uninstall', handlePreviewUninstall);
    window.addEventListener('launcher:preview-install', handlePreviewInstall);

    return () => {
      window.removeEventListener('launcher:preview-uninstall', handlePreviewUninstall);
      window.removeEventListener('launcher:preview-install', handlePreviewInstall);
    };
  }, []);

const { shouldShow: shouldShowUpdate, markSeen } = useUpdateTourCheck();
const [showUpdateTour, setShowUpdateTour] = useState(() => shouldShowUpdate());

  function navigateTo(newPage) {
    const dir = (PAGE_ORDER[newPage] ?? 0) > (PAGE_ORDER[activePage] ?? 0) ? 1 : -1;
    directionRef.current = dir;
    setPageDirection(dir);
    setActivePage(newPage);
  }

  useEffect(() => {
    const unsub = window.launcherAPI?.onNavigate?.((page) => {
      if (page && PAGE_ORDER[page] !== undefined) {
        navigateTo(page);
      }
    });
    return () => unsub?.();
  }, [activePage]);

  // ── Dev info overlay ──────────────────────────────────────────────────────
  const [showDevInfo, setShowDevInfo] = useState(false);

  // ── Hotkey handlers ───────────────────────────────────────────────────────
  const THEME_CYCLE = ['oled', 'dark', 'light'];

  function handleCycleTheme() {
  const keys = Object.keys(THEMES);
  const current = settings?.theme ?? keys[0];
  const next = keys[(keys.indexOf(current) + 1) % keys.length];
  updateSettings?.({ theme: next });
}

function handleCycleAccent() {
  const keys = Object.keys(ACCENTS);
  const current = settings?.accent ?? keys[0];
  const next = keys[(keys.indexOf(current) + 1) % keys.length];
  updateSettings?.({ accent: next });
}

  function handleToggleLiquidGlass() {
    const current = settings?.navStyle ?? 'glass';
    updateSettings?.({ navStyle: current === 'liquid-glass' ? 'glass' : 'liquid-glass' });
  }

  function handleCopyUid() {
    if (profile?.uid) navigator.clipboard.writeText(profile.uid).catch(() => {});
  }

  function handleQuitApp() {
    window.launcherAPI?.quitApp?.();
  }

  function handleCheckForUpdates() {
    window.launcherAPI?.checkForUpdates?.();
  }

  function handleGoHome() {
    navigateTo('home');
  }

  function handleCycleQuality() {
    const order = ['hd', 'sd', 'static'];
    const current = settings?.backgroundQuality ?? 'hd';
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateSettings?.({ backgroundQuality: next });
  }

  useHotkeys({
    activePage,
    navigateTo,
    onPlay:              () => window.launcherAPI?.launchGame?.(),
    onRefresh:           () => window.location.reload(),
    onOpenFolder:        () => window.launcherAPI?.screenshots?.openFolder?.('stay'),
    onSelectAll:      () => document.dispatchEvent(new CustomEvent('zyphor:selectAll')),
    onDeselectAll:    () => document.dispatchEvent(new CustomEvent('zyphor:deselectAll')),
    onDeleteSelected: () => document.dispatchEvent(new CustomEvent('zyphor:deleteSelected')),
    onToggleAccount:     () => document.dispatchEvent(new CustomEvent('zyphor:toggleAccount')),
    onCopyUid:           handleCopyUid,
    onCycleTheme:        handleCycleTheme,
    onCycleAccent:       handleCycleAccent,
    onToggleLiquidGlass: handleToggleLiquidGlass,
    onToggleDevInfo:     () => setShowDevInfo(v => !v),
    onQuitApp:           handleQuitApp,
    onCheckForUpdates:   handleCheckForUpdates,
    onGoHome:            handleGoHome,
    onCycleQuality:      handleCycleQuality,
  });

  // ── Derive background video source from settings ──────────────────────────
  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundQuality   = settings?.backgroundQuality ?? 'hd';
  const backgroundPreviewUrl = settings?.backgroundPreviewUrl ?? null;

  const backgroundVideoSrc =
    backgroundVideoType === 'none'
      ? null
      : backgroundVideoType === 'workshop'
      ? settings?.backgroundVideoPath
        ? `media:///${encodeURI(settings.backgroundVideoPath.replace(/\\/g, '/').replace(/^\/+/, ''))}`
        : DEFAULT_BACKGROUND_VIDEO
      : backgroundVideoType === 'custom'
      ? settings?.backgroundVideoPath
        ? `media:///${encodeURI(settings.backgroundVideoPath.replace(/\\/g, '/').replace(/^\/+/, ''))}`
        : null
      : DEFAULT_BACKGROUND_VIDEO;

  const bgVideoStyle = backgroundQuality === 'sd'
    ? { filter: 'blur(0px)', imageRendering: 'auto', transform: 'scale(1.05)', opacity: 1 }
    : {};

  // ── Timers & auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

useEffect(() => {
  const isSpecialScreen = !minSplashDone || !profile || showUpdateTour;
  
  if (!isSpecialScreen && settings?.fullscreenOnLaunch) {
    window.launcherAPI?.setFullscreen?.(true);
  } else {
    window.launcherAPI?.setFullscreen?.(false);
  }
}, [minSplashDone, profile, showUpdateTour, settings?.fullscreenOnLaunch]);

  useEffect(() => {
    if (!settings) return;

    async function tryAutoLogin() {
      // Default rememberLogin to true — if the setting is missing/undefined,
      // treat it as enabled so we don't wipe the session on first load.
      const rememberLogin = settings.rememberLogin ?? true;
      if (!rememberLogin) {
        clearSession();
        setChecking(false);
        return;
      }

      const uid = loadUid();
      if (!uid) {
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          clearSession();
          setChecking(false);
          return;
        }

        const d = snap.data();
        // Re-persist the UID so the session survives hot-reloads and restarts.
        // Without this, saveUid() was never called from App and the key went stale.
        saveUid(uid);

        let steamInfo = null;
        try {
          steamInfo = await window.launcherAPI?.steam?.getStatus?.();
        } catch {}

        const steamConnected = Boolean(steamInfo?.initialized);
        const resolvedSteamId = d.steamId || (steamConnected ? steamInfo.steamId64 : '');
        const resolvedOwnsGame = Boolean(d.steamOwnsGame || d.hasGame || steamInfo?.ownsGame || steamConnected);

        if (steamConnected && (!d.steamId || !d.steamOwnsGame)) {
          setDoc(
            doc(db, 'users', uid),
            {
              steamId: resolvedSteamId,
              steamName: steamInfo?.name || '',
              steamOwnsGame: resolvedOwnsGame,
              hasGame: resolvedOwnsGame,
            },
            { merge: true }
          ).catch((e) => console.warn('Background steam link failed:', e));
        }

        if (d?.activeWallpaperId) {
          window.launcherAPI?.workshop?.getItemState?.(d.activeWallpaperId).then((st) => {
            if (st?.isInstalled && st?.videoPath) {
              updateSettings?.({
                backgroundVideoType: 'workshop',
                backgroundWorkshopId: d.activeWallpaperId,
                backgroundVideoPath: st.videoPath,
                backgroundVideoName: st.title || 'Steam Workshop',
              });
            } else {
              window.launcherAPI?.workshop?.downloadItem?.(d.activeWallpaperId, true).then(() => {
                setTimeout(async () => {
                  const nextSt = await window.launcherAPI?.workshop?.getItemState?.(d.activeWallpaperId);
                  if (nextSt?.isInstalled && nextSt?.videoPath) {
                    updateSettings?.({
                      backgroundVideoType: 'workshop',
                      backgroundWorkshopId: d.activeWallpaperId,
                      backgroundVideoPath: nextSt.videoPath,
                      backgroundVideoName: nextSt.title || 'Steam Workshop',
                    });
                  }
                }, 3000);
              }).catch(() => {});
            }
          }).catch(() => {});
        }

        setProfile({
          uid,
          email:        d.email        ?? '',
          displayName:  d.displayName  ?? 'Unknown',
          photoURL:     d.photoURL     ?? '',
          location:     d.location     ?? '',
          timezone:     d.timezone     ?? 'UTC',
          gender:       d.gender       ?? '',
          isVip:        Boolean(d.isVip),
          hasGame:      resolvedOwnsGame,
          steamOwnsGame: resolvedOwnsGame,
          steamId:      resolvedSteamId,
          rememberMe:   Boolean(d.rememberMe),
          totpLinked:   Boolean(d.totpLinked),
          hasPasskey:   Boolean(d.hasPasskey),
          activeWallpaperId: d.activeWallpaperId ?? null,
          raw: d,
        });
      } catch (err) {
        console.error('Auto-login failed:', err);
        clearSession();
      } finally {
        setChecking(false);
      }
    }

    tryAutoLogin();
  }, [settings]);

  const ActivePageComponent = PAGES[activePage];

  if (isInstallMode) {
    return (
      <I18nProvider language={settings?.language || 'en'} onLanguageChange={(lang) => updateSettings?.({ language: lang })}>
        <InstallPage
          onCancel={() => {
            setIsInstallMode(false);
            if (window.history?.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
          onComplete={({ launchAfterInstall }) => {
            setIsInstallMode(false);
            if (window.history?.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
        />
      </I18nProvider>
    );
  }

  if (isUninstallMode) {
    return (
      <I18nProvider language={settings?.language || 'en'} onLanguageChange={(lang) => updateSettings?.({ language: lang })}>
        <UninstallPage onCancel={() => {
          setIsUninstallMode(false);
          if (window.history?.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={settings?.language || 'en'} onLanguageChange={(lang) => updateSettings?.({ language: lang })}>
      <div className="flex h-screen flex-col overflow-hidden bg-black/70">

        <AnimatePresence>
          {(checking || !settings || !minSplashDone) && <SplashScreen key="splash" />}
        </AnimatePresence>

        {/* Auth or app — splash covers this until ready */}
        {!profile ? (
          <AuthGate onAuthSuccess={(p) => { saveUid(p.uid); setProfile(p); }} />
        ) : showUpdateTour && minSplashDone ? (
          <UpdateTourPage
            onComplete={() => {
              markSeen();                 // write to localStorage
              setShowUpdateTour(false);   // ← this actually removes the page
            }}
          />
        ) : (
          <>
            {/* ── Global background — rendered once, persists across page transitions ── */}
            <BackgroundVideo
              key={backgroundVideoSrc + (backgroundPreviewUrl || '') + backgroundQuality}
              src={backgroundVideoSrc}
              previewSrc={backgroundPreviewUrl}
              active={motionOn}
              quality={backgroundQuality}
              videoStyle={bgVideoStyle}
            />
            <AnimatedGrid accent={accent} active={motionOn} />

            {/* ── Dev info overlay (Ctrl+`) ─────────────────────────────────────── */}
            <AnimatePresence>
              {showDevInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="fixed top-10 left-1/2 z-[200] -translate-x-1/2 rounded-2xl border px-5 py-3 text-[11px] font-mono shadow-2xl"
                  style={{ backgroundColor: `${theme.surface}ee`, borderColor: theme.border, color: theme.text }}
                >
                  <div className="flex items-center gap-6">
                    <span className="opacity-40 uppercase tracking-widest text-[9px]">Zyphor Dev</span>
                    <span>v{import.meta.env.VITE_APP_VERSION ?? '1.2.2'}</span>
                    <span style={{ color: accent.hex }}>theme: {settings?.theme ?? 'oled'}</span>
                    <span style={{ color: accent.hex }}>glass: {settings?.navStyle ?? 'glass'}</span>
                    <span>page: {activePage}</span>
                    <button onClick={() => setShowDevInfo(false)} className="opacity-40 hover:opacity-80 ml-2">✕</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <TitleBar />
            

            <div className="flex min-h-0 flex-1 gap-4 p-4">
              <NavRail
                activePage={activePage}
                onNavigate={navigateTo}
                onExit={() => window.launcherAPI.quitApp()}
                profile={profile}
                onLogout={() => {
                  clearSession();
                  setProfile(null);
                }}
              />
              <main className="min-h-0 flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePage}
                    initial={{ opacity: 0, y: 20 * directionRef.current }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 * directionRef.current }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-full"
                  >
                    <ActivePageComponent profile={profile} />
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </>
        )}
      </div>
    </I18nProvider>
  );
}
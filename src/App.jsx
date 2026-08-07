import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { motion, AnimatePresence } from 'framer-motion';
import TitleBar from './components/TitleBar.jsx';
import NavRail from './components/NavRail.jsx';
import AuthGate from './pages/Authgate.jsx';
import HomePage from './pages/HomePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import AchievementsPage from './pages/AchievementsPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import { useSettings, THEMES, ACCENTS } from './hooks/useSettings.js';
import { loadUid, clearSession } from './lib/authSession.js';
import ScreenshotsPage from './pages/ScreenshotsPage.jsx';
import Logo from './Logo/icon.png';
import { useHotkeys } from './hooks/useHotkeys.js';

import DEFAULT_BACKGROUND_VIDEO from './pages/videos/test_video.mp4';

import VIDEO_ROSSI from './pages/videos/rossi.mp4';
import VIDEO_GAMING from './pages/videos/gaming.mp4';
import VIDEO_DRAGON_TRAVELLER from './pages/videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY from './pages/videos/Lucy Cyberpunk.mp4';
import VIDEO_KALTSIT from './pages/videos/Kaltsit.mp4';

import ROSSI_FRAME from './pages/videos/frames/rossi frame.png';
import KALTSIT_FRAME from './pages/videos/frames/kaltsit frame.png';
import XUANWU_FRAME from './pages/videos/frames/xuanwu frame.png';
import FIREFLY_FRAME from './pages/videos/frames/firefly frame.png';
import LUCY_FRAME from './pages/videos/frames/lucy frame.png';

const PRESET_VIDEO_MAP = {
  'preset-gaming':           VIDEO_GAMING,
  'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
  'preset-lucy':             VIDEO_LUCY,
  'preset-kaltsit':          VIDEO_KALTSIT,
  'preset-rossi':            VIDEO_ROSSI,
};

const PRESET_STATIC_MAP = {
  'preset-gaming':           new URL(FIREFLY_FRAME,  import.meta.url).href,
  'preset-dragon-traveller': new URL(XUANWU_FRAME,   import.meta.url).href,
  'preset-lucy':             new URL(LUCY_FRAME,     import.meta.url).href,
  'preset-kaltsit':          new URL(KALTSIT_FRAME,  import.meta.url).href,
  'preset-rossi':            new URL(ROSSI_FRAME,    import.meta.url).href,
};

// ─── Splash screen ────────────────────────────────────────────────────────────
const SPLASH_MESSAGES = [
  'Initializing launcher',
  'Checking for updates',
  'Connecting to servers',
  'Syncing your library',
  'Almost ready',
];

const PAGE_ORDER = {
  home: 0,
  news: 1,
  friends: 2,
  achievements: 3,
  screenshots: 4,
  settings: 5,
};

function SplashScreen() {
  const videoRef = useRef(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    const cycle = () => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % SPLASH_MESSAGES.length);
        setMsgVisible(true);
      }, 200);
    };
    const id = setInterval(cycle, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
    >
      <video
        ref={videoRef}
        src={DEFAULT_BACKGROUND_VIDEO}
        muted
        loop
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-24 w-24 mt-28 items-center justify-center rounded-3xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <img
            src={Logo}
            alt="Zyphor"
            className="h-full w-full object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-1 -mt-3 mb-24"
        >
          <p
            className="text-[40px] font-medium tracking-wide text-white"
            style={{ letterSpacing: '-0.01em', fontFamily: 'Apple Garamond' }}
          >
            Zyphor Launcher
          </p>
          <p className="text-[14px] uppercase tracking-[0.25em] -mt-1 text-white/30" style={{
            fontFamily: 'Apple Garamond'
          }}>
            v1.1.6
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <svg
            width="40" height="40" viewBox="0 0 22 22" fill="none"
            className="animate-spin"
            style={{ animationDuration: '0.9s' }}
          >
            <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            <path d="M11 2a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p
            className="text-[10px] uppercase tracking-[0.22em] transition-opacity duration-300"
            style={{
              color: 'rgba(255,255,255,0.3)',
              opacity: msgVisible ? 1 : 0,
              minWidth: '220px',
              textAlign: 'center',
            }}
          >
            {SPLASH_MESSAGES[msgIndex]}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Global background video ──────────────────────────────────────────────────
function BackgroundVideo({ src, active, quality = 'hd', videoStyle = {}, staticPoster = null }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || quality === 'static') return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active, quality, src]);

  useEffect(() => {
    if (!active || quality === 'static') return;
    const el = ref.current;
    if (!el) return;
    function handleVisibilityChange() {
      if (document.hidden) el.pause();
      else el.play().catch(() => {});
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active, quality]);

  if (quality === 'static') {
    if (!staticPoster) return null;
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full"
        style={{
          backgroundImage: `url(${staticPoster})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    );
  }

  if (!src) return null;

  if (quality === 'sd') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: -20, overflow: 'hidden', pointerEvents: 'none' }}>
        <video
          ref={ref}
          src={src}
          autoPlay muted loop playsInline
          onError={(e) => console.error('[BackgroundVideo] failed to load:', src, e.target.error)}
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
      onError={(e) => console.error('[BackgroundVideo] failed to load:', src, e.target.error)}
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
  settings:     SettingsPage,
  achievements: AchievementsPage,
  screenshots:  ScreenshotsPage,
  settings:     SettingsPage,
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

  function navigateTo(newPage) {
    const dir = (PAGE_ORDER[newPage] ?? 0) > (PAGE_ORDER[activePage] ?? 0) ? 1 : -1;
    directionRef.current = dir;
    setPageDirection(dir);
    setActivePage(newPage);
  }

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
    onCycleAccent: handleCycleAccent,
    onToggleLiquidGlass: handleToggleLiquidGlass,
    onToggleDevInfo:     () => setShowDevInfo(v => !v),
  });

  // ── Derive background video source from settings ──────────────────────────
  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundQuality   = settings?.backgroundQuality   ?? 'hd';

  const backgroundVideoSrc =
    backgroundVideoType === 'none' || backgroundQuality === 'static'
      ? null
      : backgroundVideoType === 'custom'
      ? settings?.backgroundVideoPath
        ? `file://${settings.backgroundVideoPath}`
        : null
      : backgroundVideoType?.startsWith('preset-')
      ? PRESET_VIDEO_MAP[backgroundVideoType] ?? DEFAULT_BACKGROUND_VIDEO
      : DEFAULT_BACKGROUND_VIDEO;

  const bgVideoStyle = backgroundQuality === 'sd'
    ? { filter: 'blur(0px)', imageRendering: 'auto', transform: 'scale(1.05)', opacity: 1 }
    : {};

  const bgStaticPoster = backgroundQuality === 'static'
    ? (PRESET_STATIC_MAP[backgroundVideoType] ?? null)
    : null;

  // ── Timers & auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!minSplashDone || checking || !settings || !profile) return;
    if (settings.fullscreenOnLaunch) {
      window.launcherAPI?.setFullscreen?.(true);
    }
  }, [minSplashDone, checking, settings, profile]);

  useEffect(() => {
    if (!settings) return;

    async function tryAutoLogin() {
      if (!settings.rememberLogin) {
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
        setProfile({
          uid,
          email:        d.email        ?? '',
          displayName:  d.displayName  ?? 'Unknown',
          photoURL:     d.photoURL     ?? '',
          location:     d.location     ?? '',
          timezone:     d.timezone     ?? 'UTC',
          gender:       d.gender       ?? '',
          isVip:        Boolean(d.isVip),
          hasGame:      Boolean(d.hasGame || d.steamOwnsGame),
          steamOwnsGame: Boolean(d.steamOwnsGame),
          steamId:      d.steamId      ?? '',
          rememberMe:   Boolean(d.rememberMe),
          totpLinked:   Boolean(d.totpLinked),
          hasPasskey:   Boolean(d.hasPasskey),
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

  // ── Splash ────────────────────────────────────────────────────────────────
  if (checking || !settings || !minSplashDone) {
    return (
      <AnimatePresence>
        <SplashScreen />
      </AnimatePresence>
    );
  }

  if (!profile) {
    return <AuthGate onAuthSuccess={setProfile} />;
  }

  const ActivePageComponent = PAGES[activePage];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black/70">
      {/* ── Global background — rendered once, persists across page transitions ── */}
      <BackgroundVideo
        key={backgroundVideoSrc + backgroundQuality}
        src={backgroundVideoSrc}
        active={motionOn}
        quality={backgroundQuality}
        videoStyle={bgVideoStyle}
        staticPoster={bgStaticPoster}
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
              <span>v{import.meta.env.VITE_APP_VERSION ?? '1.1.6'}</span>
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
    </div>
  );
}
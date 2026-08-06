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
import { useSettings } from './hooks/useSettings.js';
import { loadUid, clearSession } from './lib/authSession.js';
import ScreenshotsPage from './pages/ScreenshotsPage.jsx';
import DEFAULT_BACKGROUND_VIDEO from './pages/videos/test_video.mp4';
import PageShell from './PageShell.jsx';
import Logo from './Logo/icon.png';

// ─── Splash screen ────────────────────────────────────────────────────────────
const SPLASH_MESSAGES = [
  'Initializing launcher',
  'Checking for updates',
  'Connecting to servers',
  'Syncing your library',
  'Almost ready',
];

function SplashScreen() {
  const videoRef = useRef(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // Cycle through messages: fade out → swap → fade in
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
      {/* Background video */}
      <video
        ref={videoRef}
        src={DEFAULT_BACKGROUND_VIDEO}
        muted
        loop
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
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

        {/* Name + version */}
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

        {/* Spinner + cycling status text */}
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

          {/* Status message */}
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

const PAGES = {
  home:     HomePage,
  news:     NewsPage,
  friends:  FriendsPage,
  settings: SettingsPage,
  achievements:  AchievementsPage,
  screenshots:   ScreenshotsPage
};

const MIN_SPLASH_MS = 8000;



export default function App() {
  const { settings } = useSettings();
  const [profile, setProfile]       = useState(null);
  const [checking, setChecking]     = useState(true);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [activePage, setActivePage] = useState('home');

  // Enforce minimum splash duration
  useEffect(() => {
    const id = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  // After the existing MIN_SPLASH_MS useEffect, add:
useEffect(() => {
  if (!minSplashDone || checking || !settings || !profile) return;
  if (settings.fullscreenOnLaunch) {
    window.launcherAPI?.setFullscreen?.(true);
  }
}, [minSplashDone, checking, settings, profile]);

  // Auto-login: only stores uid, always fetches fresh profile from Firestore
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
          hasGame: Boolean(d.hasGame || d.steamOwnsGame),
          steamOwnsGame: Boolean(d.steamOwnsGame),
          steamId:      d.steamId      ?? '',   // ← add this
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

  // Let the nav highlight paint first, then swap the page on the next frame
  function handleNavigate(page) {
    requestAnimationFrame(() => setActivePage(page));
  }

  const ActivePageComponent = PAGES[activePage];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black/70">
      <TitleBar />
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <NavRail
          activePage={activePage}
          onNavigate={handleNavigate}
          onExit={() => window.launcherAPI.quitApp()}
          profile={profile}
          onLogout={() => {
            clearSession();
            setProfile(null);
          }}
        />
        <main className="min-h-0 flex-1 overflow-hidden relative">
  {Object.entries(PAGES).map(([id, Page]) => (
    <PageShell key={id} isActive={activePage === id}>
      <Page profile={profile} />
    </PageShell>
  ))}
</main>
      </div>
    </div>
  );
}
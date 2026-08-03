import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';
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

const PAGES = {
  home:     HomePage,
  news:     NewsPage,
  friends:  FriendsPage,
  settings: SettingsPage,
  achievements:  AchievementsPage,
};

export default function App() {
  const { settings } = useSettings();
  const [profile, setProfile]       = useState(null);
  const [checking, setChecking]     = useState(true);
  const [activePage, setActivePage] = useState('home');

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

  if (checking || !settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-ash">
        <p className="font-mono text-xs uppercase tracking-wider">Starting…</p>
      </div>
    );
  }

  if (!profile) {
    return <AuthGate onAuthSuccess={setProfile} />;
  }

  const ActivePageComponent = PAGES[activePage];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black/70">
      <TitleBar />
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <NavRail
          activePage={activePage}
          onNavigate={setActivePage}
          onExit={() => window.api.quitApp()}
          profile={profile}
          onLogout={() => {
            clearSession();
            setProfile(null);
          }}
        />
        <main className="min-h-0 flex-1 overflow-hidden">
          <ActivePageComponent profile={profile} />
        </main>
      </div>
    </div>
  );
}
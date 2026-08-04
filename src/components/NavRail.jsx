import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  faHouse, faNewspaper, faGear, faTrophy, faRightFromBracket, faPlay,
  faShield, faGamepad, faCrown, faCopy, faCheck, faFingerprint,
  faUsers, faImages,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { clearSession } from '../lib/authSession.js';

const NAV_ITEMS = [
  { id: 'home',         label: 'Home',         icon: faHouse },
  { id: 'news',         label: 'News',         icon: faNewspaper },
  { id: 'friends',      label: 'Friends',      icon: faUsers },
  { id: 'achievements', label: 'Achievements', icon: faTrophy },
  { id: 'screenshots',  label: 'Screenshots',  icon: faImages },
];

function maskEmail(email) {
  if (!email) return 'CLASSIFIED';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 4) return `${local[0] ?? ''}*****${local.slice(-1)}@${domain}`;
  return `${local.slice(0, 3)}*****${local.slice(-2)}@${domain}`;
}

function CopyUID({ uid }) {
  const [copied, setCopied] = useState(false);
  const handle = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handle}
      title="Copy UID"
      className="flex items-center gap-1.5 font-mono text-[10px] opacity-40 hover:opacity-90 transition-opacity"
    >
      {copied
        ? <FontAwesomeIcon icon={faCheck} className="text-green-400" style={{ fontSize: 9 }} />
        : <FontAwesomeIcon icon={faCopy} style={{ fontSize: 9 }} />}
      <span className="truncate max-w-[120px]">{uid.slice(0, 16)}…</span>
    </button>
  );
}

export default function NavRail({ activePage, onNavigate, onExit, profile, onLogout }) {
  const { settings } = useSettings();
  const [launchState, setLaunchState] = useState('idle');
  const [accountOpen, setAccountOpen] = useState(false);
  const [fullProfile, setFullProfile] = useState(null);
  const popoverRef = useRef(null);
  const avatarBtnRef = useRef(null);

  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  // Enrich profile from Firestore when popover opens
  useEffect(() => {
    if (!accountOpen || !profile?.uid) return;
    getDoc(doc(db, 'users', profile.uid)).then((snap) => {
      if (snap.exists()) setFullProfile({ ...profile, ...snap.data() });
    });
  }, [accountOpen, profile]);

  // Close on outside click — but ignore the avatar button itself (toggle handles that)
  useEffect(() => {
    if (!accountOpen) return;
    function onDocClick(e) {
      const inPopover = popoverRef.current?.contains(e.target);
      const onAvatar  = avatarBtnRef.current?.contains(e.target);
      if (!inPopover && !onAvatar) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountOpen]);

  const p = fullProfile ?? profile;
  const avatarLetter = (p?.displayName ?? p?.email ?? '?').charAt(0).toUpperCase();
  const isVip   = Boolean(p?.isVip);
  const hasGame = Boolean(p?.steamOwnsGame);
  const vipGold = '#FDB515';
  const accentColor = isVip ? vipGold : accent.hex;

  async function handleQuickLaunch() {
    setLaunchState('launching');
    const result = await window.launcherAPI?.launchGame?.();
    if (!result?.success) {
      setLaunchState('error');
      setTimeout(() => setLaunchState('idle'), 2000);
      return;
    }
    setTimeout(() => setLaunchState('idle'), 2500);
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      clearSession();
      setAccountOpen(false);
      onLogout();
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }

  function openExternal(url) {
    if (window.launcherAPI?.openExternal) window.launcherAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  function toggleAccount() {
    setAccountOpen((o) => !o);
  }

  return (
    <>
      {/* ── COMPACT ACCOUNT POPOVER ─────────────────────────────────────── */}
      <AnimatePresence>
        {accountOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-50 ml-4 overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              left: 92,
              top: 56,
              width: 260,
              backgroundColor: `${theme.surface}f5`,
              borderColor: isVip ? `${vipGold}40` : theme.border,
              backdropFilter: 'blur(16px)',
              color: theme.text,
            }}
          >
            {/* Header — avatar + name + uid */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="relative h-12 w-12 mt-1 shrink-0 overflow-hidden rounded-2xl border"
                style={{
                  borderColor: isVip ? `${vipGold}66` : theme.border,
                  boxShadow: isVip ? `0 0 12px ${vipGold}30` : undefined,
                }}
              >
                {p?.photoURL ? (
                  <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                  >
                    {avatarLetter}
                  </div>
                )}
                {isVip && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: vipGold }}
                  >
                    <FontAwesomeIcon icon={faCrown} style={{ fontSize: 7, color: '#000' }} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] mt-2.5 font-semibold leading-tight">
                  {p?.displayName ?? 'Unknown'}
                </p>
                <p className="mt-0.5 truncate text-[10px] opacity-40">
                  {maskEmail(p?.email)}
                </p>
                {p?.uid && (
                  <div className="mt-1">
                    <CopyUID uid={p.uid} />
                  </div>
                )}
              </div>
            </div>

            {/* Status chips */}
            <div className="flex gap-1.5 px-3.5 pb-2.5">
              {/* <span
                className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: hasGame ? '#22c55e18' : `${theme.border}`,
                  color: hasGame ? '#22c55e' : undefined,
                  opacity: hasGame ? 1 : 0.45,
                }}
              >
                {hasGame ? 'Owned' : 'No game'}
              </span> */}
              <span
                className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: isVip ? `${vipGold}18` : `${theme.border}`,
                  color: isVip ? vipGold : undefined,
                  opacity: isVip ? 1 : 0.5,
                }}
              >
                {isVip ? 'VIP Account' : 'Standard Account'}
              </span>
            </div>

            <div className="mx-3 h-px" style={{ backgroundColor: theme.border }} />

            {/* Compact action list */}
            <div className="py-1.5">
              {[
                {
                  icon: faGear,
                  label: 'Settings',
                  sub: 'Launcher preferences',
                  action: () => { setAccountOpen(false); onNavigate('settings'); },
                },
                {
                  icon: faGamepad,
                  label: 'Steam account',
                  sub: p?.steamId ? 'Linked' : 'Not Linked',
                  action: () => { setAccountOpen(false); openExternal('https://zyphorstudios.com/profile'); },
                },
                {
                  icon: faShield,
                  label: 'Security',
                  sub: p?.totpLinked ? '2FA on' : '2FA off',
                  action: () => { setAccountOpen(false); openExternal('https://zyphorstudios.com/profile'); },
                },
                {
                  icon: faFingerprint,
                  label: 'Edit profile',
                  sub: 'zyphorstudios.com/profile',
                  action: () => { setAccountOpen(false); openExternal('https://zyphorstudios.com/profile'); },
                },
              ].map(({ icon, label, sub, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accentColor}12`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  >
                    <span className="flex items-center justify-center ml-0.5">
                      <FontAwesomeIcon icon={icon} style={{ fontSize: 13 }} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-tight">{label}</p>
                    {sub && <p className="text-[10px] opacity-40 mt-0.5">{sub}</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className="mx-3 h-px" style={{ backgroundColor: theme.border }} />

            {/* Sign out */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-b-2xl px-3 py-2 text-left transition-colors hover:bg-red-500/10"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 12 }} />
                </div>
                <span className="text-[12px] font-medium text-red-400">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV RAIL ──────────────────────────────────────────────────────── */}
      <nav
        className="relative flex w-[80px] shrink-0 flex-col items-center gap-1 overflow-hidden rounded-3xl border py-4 backdrop-blur-glass"
        style={{ backgroundColor: `${theme.surface}cc`, borderColor: theme.border }}
      >
        {/* Avatar button — toggles open/close */}
        <button
          ref={avatarBtnRef}
          type="button"
          onClick={toggleAccount}
          title={p?.displayName ?? 'Account'}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: accountOpen
              ? accentColor
              : isVip ? `${vipGold}66` : theme.border,
            boxShadow: isVip ? `0 0 12px ${vipGold}33` : undefined,
          }}
        >
          {p?.photoURL ? (
            <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
            >
              {avatarLetter}
            </div>
          )}
          {isVip && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ boxShadow: `inset 0 0 0 1.5px ${vipGold}66` }}
            />
          )}
        </button>

        <div className="my-3 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Quick launch */}
        <button
          type="button"
          onClick={handleQuickLaunch}
          disabled={launchState === 'launching'}
          title="Quick Launch"
          style={{
            backgroundColor: launchState === 'error' ? undefined : accent.hex,
            color: accent.on,
          }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-150 ${
            launchState === 'launching'
              ? 'cursor-wait opacity-70'
              : launchState === 'error'
                ? 'bg-rust text-bone'
                : 'hover:scale-[1.05] active:scale-95'
          }`}
        >
          {launchState === 'launching' ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              className="block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <FontAwesomeIcon icon={faPlay} style={{ fontSize: 20 }} />
          )}
        </button>

        <div className="my-3 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Nav items */}
        <ul className="flex flex-1 flex-col items-center gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <li key={item.id} className="relative">
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: accent.hex }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  style={{ color: isActive ? accent.on : undefined }}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 ${
                    isActive ? '' : 'text-ash hover:bg-white/[0.05] hover:text-bone'
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize: 20 }} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Settings + exit */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            title="Settings"
            aria-current={activePage === 'settings' ? 'page' : undefined}
            style={{ color: activePage === 'settings' ? accent.hex : undefined }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ash/70 transition-colors hover:bg-white/[0.05] hover:text-bone"
          >
            <FontAwesomeIcon icon={faGear} style={{ fontSize: 20 }} />
          </button>
          <button
            type="button"
            onClick={onExit}
            title="Exit"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ash/50 transition-colors hover:bg-rust/10 hover:text-rust"
          >
            <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 20 }} />
          </button>
        </div>
      </nav>
    </>
  );
}

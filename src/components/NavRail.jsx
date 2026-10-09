import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  faHouse, faNewspaper, faGear, faTrophy, faRightFromBracket, faPlay,
  faShield, faGamepad, faCrown, faCopy, faCheck, faFingerprint,
  faUsers, faImages, faUserGear, faCircleQuestion
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { clearSession } from '../lib/authSession.js';
import { useTranslation } from '../i18n/index.jsx';

import GlassSurface from '../effects/GlassSurface.tsx';

gsap.registerPlugin(useGSAP);

const NAV_ITEMS_DEF = [
  { id: 'home',         key: 'nav.home',         defaultLabel: 'Home',         icon: faHouse },
  { id: 'news',         key: 'nav.news',         defaultLabel: 'News',         icon: faNewspaper },
  { id: 'friends',      key: 'nav.friends',      defaultLabel: 'Friends',      icon: faUsers },
  { id: 'achievements', key: 'nav.achievements', defaultLabel: 'Achievements', icon: faTrophy },
  { id: 'screenshots',  key: 'nav.screenshots',  defaultLabel: 'Screenshots',  icon: faImages },
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

function NavItems({ items, activePage, onNavigate, accent, isLiquidGlass }) {
  return (
    <ul className="flex flex-1 flex-col items-center gap-3 select-none">
      {items.map((item) => {
        const isActive = activePage === item.id;

        return (
          <li key={item.id} className="nr-item relative">
            {/* Active indicator pill with Apple fluid spring */}
            {isActive && (
              <motion.span
                layoutId="nav-active"
                transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
              >
                {isLiquidGlass ? (
                  <span className="absolute inset-0 rounded-2xl overflow-hidden">
                    {/* Accent tint so the pill is visibly active */}
                    <span
                      className="absolute inset-0"
                      style={{ backgroundColor: accent.hex, opacity: 0.25 }}
                    />
                    <GlassSurface
                      width={44}
                      height={44}
                      borderRadius={14}
                      brightness={60}
                      opacity={0.95}
                      blur={10}
                      distortionScale={-80}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    />
                  </span>
                ) : (
                  <span
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: accent.hex }}
                  />
                )}
              </motion.span>
            )}

            <motion.button
              type="button"
              onClick={() => onNavigate(item.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.90 }}
              transition={{ type: 'spring', stiffness: 460, damping: 26 }}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              style={{
                color: isActive
                  ? isLiquidGlass ? accent.hex : accent.on
                  : undefined,
                filter: isActive && isLiquidGlass
                  ? `drop-shadow(0 0 6px ${accent.hex}cc)`
                  : undefined,
              }}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200 ${
                isActive ? '' : 'text-ash hover:bg-white/[0.06] hover:text-bone'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} style={{ fontSize: 20 }} />
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}

export default function NavRail({ activePage, onNavigate, onExit, profile, onLogout }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [launchState, setLaunchState] = useState('idle');
  const [accountOpen, setAccountOpen] = useState(false);
  const [fullProfile, setFullProfile] = useState(null);
  const popoverRef = useRef(null);
  const avatarBtnRef = useRef(null);
  const railRef = useRef(null);

  const navItems = useMemo(() => NAV_ITEMS_DEF.map((item) => ({
    ...item,
    label: t(item.key, {}, item.defaultLabel),
  })), [t]);

  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations !== false && !settings.reduceMotion : true;
const isLiquidGlass = (settings?.navStyle ?? 'glass') === 'liquid-glass';

  // GSAP intro — section-wise stagger (avatar → play → items → footer)
  useGSAP(() => {
    if (!railRef.current || !motionOn) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Start hidden
      gsap.set('.nr-section', { opacity: 0, y: 14 });
      gsap.set('.nr-item', { opacity: 0, scale: 0.75 });
      gsap.set(railRef.current, { opacity: 0, x: -18 });

      tl.to(railRef.current, { opacity: 1, x: 0, duration: 0.45 }, 0)
        // Avatar block
        .to('.nr-avatar', { opacity: 1, y: 0, duration: 0.4 }, 0.08)
        // Divider + quick launch
        .to('.nr-launch', { opacity: 1, y: 0, duration: 0.4 }, 0.16)
        // Nav items — staggered with Apple fluid ease
        .to('.nr-item', {
          opacity: 1,
          scale: 1,
          duration: 0.42,
          stagger: 0.045,
          ease: 'power3.out',
        }, 0.22)
        // Footer (settings + exit)
        .to('.nr-footer', { opacity: 1, y: 0, duration: 0.4 }, 0.38);
    }, railRef);

    return () => ctx.revert();
  }, [motionOn]);

  // Soft pulse on active page change with Apple fluid settling
  useGSAP(() => {
    if (!railRef.current || !motionOn) return;
    const activeBtn = railRef.current.querySelector('[aria-current="page"]');
    if (!activeBtn) return;
    gsap.fromTo(
      activeBtn,
      { scale: 0.94 },
      { scale: 1, duration: 0.35, ease: 'power2.out' }
    );
  }, [activePage, motionOn]);

  // Enrich profile from Firestore when popover opens
  useEffect(() => {
    if (!accountOpen || !profile?.uid) return;
    getDoc(doc(db, 'users', profile.uid)).then((snap) => {
      if (snap.exists()) setFullProfile({ ...profile, ...snap.data() });
    });
  }, [accountOpen, profile]);

  // Close on outside click — ignore the avatar button (toggle handles that)
  useEffect(() => {
    if (!accountOpen) return;
    function onDocClick(e) {
      const inPopover = popoverRef.current?.contains(e.target);
      const onAvatar  = avatarBtnRef.current?.contains(e.target);
      if (!inPopover && !onAvatar) setAccountOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountOpen]);

  const p = fullProfile ?? profile;
  const avatarLetter = (p?.displayName ?? p?.email ?? '?').charAt(0).toUpperCase();
  const isVip   = Boolean(p?.isVip);
  const hasGame = Boolean(p?.steamOwnsGame || p?.hasGame);
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
    // Micro feedback on success
    if (motionOn && railRef.current) {
      gsap.fromTo(
        '.nr-launch-btn',
        { scale: 0.9 },
        { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
      );
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

  function handleNav(id) {
    if (id === activePage) return;
    onNavigate(id);
  }

  return (
    <>
      {/* ── COMPACT ACCOUNT POPOVER ─────────────────────────────────────── */}
      <AnimatePresence>
        {accountOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, x: -10, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed z-50 ml-4 overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              left: 92,
              top: 56,
              width: 260,
              backgroundColor: `${theme.surface}aa`,
              borderColor: isVip ? `${vipGold}40` : theme.border,
              backdropFilter: 'blur(16px)',
              color: theme.text,
            }}
          >
            
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

            <div className="flex gap-1.5 px-3.5 pb-2.5">
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

            <div className="py-2">
              {[
                {
                  icon: faUserGear,
                  label: 'Manage Account',
                  sub: 'Profile & subscription',
                  action: () => { setAccountOpen(false); openExternal('https://zyphorstudios.com/profile'); },
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
                  icon: faCircleQuestion,
                  label: 'Help & Support',
                  sub: 'zyphorstudios.com/support',
                  action: () => { setAccountOpen(false); openExternal('https://zyphorstudios.com/support'); },
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

            <div className="p-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-b-2xl px-3 py-2 text-left transition-colors hover:bg-red-500/10"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 12 }} />
                </div>
                <span className="text-[12px] font-medium text-red-400">{t('nav.signOut', {}, 'Sign out')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV RAIL ──────────────────────────────────────────────────────── */}
      <nav
        ref={railRef}
        className="relative flex w-[80px] shrink-0 flex-col items-center gap-1 overflow-hidden rounded-3xl border py-4"
        style={{ borderColor: theme.border }}
      >

        {/* Glass background — purely visual */}
        <div className="absolute inset-0 z-0 pointer-events-none">
  {isLiquidGlass ? (
    <GlassSurface
      width={80}
      height="100%"
      borderRadius={24}
      brightness={50}
      opacity={0.93}
      blur={11}
      distortionScale={-180}
      style={{ width: '100%', height: '100%' }}
    />
  ) : (
    <div
      className="absolute inset-0 rounded-3xl"
      style={{
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        background: `${theme.surface}cc`,
        border: `1px solid ${theme.border}`,
      }}
    />
  )}
</div>
        {/* Avatar */}
        <div className="nr-section nr-avatar flex flex-col items-center">
          <motion.button
            ref={avatarBtnRef}
            type="button"
            onClick={toggleAccount}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            title={p?.displayName ?? 'Account'}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border transition-colors"
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
                animate={motionOn ? { opacity: [0.4, 0.8, 0.4] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ boxShadow: `inset 0 0 0 1.5px ${vipGold}66` }}
              />
            )}
          </motion.button>
        </div>

        <div className="nr-section nr-launch my-3 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Quick launch */}
        <div className="nr-section nr-launch">
          <motion.button
            type="button"
            onClick={handleQuickLaunch}
            disabled={launchState === 'launching'}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 460, damping: 24 }}
            title={t('home.quickLaunch', {}, 'Quick Launch')}
            style={{
              backgroundColor: launchState === 'error' ? undefined : accent.hex,
              color: accent.on,
            }}
            className={`nr-launch-btn flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
              launchState === 'launching'
                ? 'cursor-wait opacity-70'
                : launchState === 'error'
                  ? 'bg-rust text-bone'
                  : ''
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
          </motion.button>
        </div>

        <div className="nr-section nr-launch my-3 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Nav items — drag-to-slide */}
        <NavItems
          items={navItems}
          activePage={activePage}
          onNavigate={handleNav}
          accent={accent}
          isLiquidGlass={isLiquidGlass}
        />

        <div className="nr-section nr-footer mt-2 h-px w-8" style={{ backgroundColor: theme.border }} />

        {/* Settings + exit */}
        <div className="nr-section nr-footer mt-2 flex flex-col items-center gap-3">
          <motion.button
            type="button"
            onClick={() => handleNav('settings')}
            whileHover={{ scale: 1.10 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 480, damping: 25 }}
            title={t('settings.title', {}, 'Settings')}
            aria-current={activePage === 'settings' ? 'page' : undefined}
            style={{ color: activePage === 'settings' ? accent.hex : undefined }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ash/70 transition-colors hover:bg-white/[0.06] hover:text-bone"
          >
            <FontAwesomeIcon icon={faGear} style={{ fontSize: 20 }} />
          </motion.button>
          <motion.button
            type="button"
            onClick={onExit}
            whileHover={{ scale: 1.10 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 480, damping: 25 }}
            title={t('common.close', {}, 'Exit')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ash/50 transition-colors hover:bg-rust/10 hover:text-rust"
          >
            <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 20 }} />
          </motion.button>
        </div>
      </nav>
    </>
  );
}
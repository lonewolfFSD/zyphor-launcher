import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  faHouse, faNewspaper, faGear, faTrophy, faRightFromBracket, faPlay,
  faShield, faGamepad, faStar, faXmark, faCrown, faMapPin, faClock,
  faCopy, faCheck, faBolt, faFingerprint, faGlobe, faChevronRight,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import {
  faTwitter, faYoutube, faTwitch,
} from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { clearSession, saveUid } from '../lib/authSession.js'

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',    icon: faHouse },
  { id: 'news',    label: 'News',    icon: faNewspaper },
  { id: 'friends', label: 'Friends', icon: faUsers },
  { id: 'achievements', label: 'Achievements', icon: faTrophy },
];

// Mask email like the website does
function maskEmail(email) {
  if (!email) return 'CLASSIFIED'
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 4) return `${local[0] ?? ''}*****${local.slice(-1)}@${domain}`
  return `${local.slice(0, 3)}*****${local.slice(-2)}@${domain}`
}

// Tiny uid copy button
function CopyUID({ uid, accent }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(uid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 font-mono text-[10px] opacity-40 hover:opacity-80 transition-opacity"
    >
      {copied ? <FontAwesomeIcon icon={faCheck} className="text-green-400" style={{ fontSize: 10 }} /> : <FontAwesomeIcon icon={faCopy} style={{ fontSize: 10 }} />}
      {uid.slice(0, 20)}…
    </button>
  )
}

// Animated barcode — same vibe as the website ID card
function Barcode({ uid, color }) {
  const bars = Array.from({ length: 48 }, (_, i) => ({
    h: 30 + ((uid.charCodeAt(i % uid.length) + i * 7) % 60),
  }))
  return (
    <div className="flex gap-[2px] h-7 items-end w-full">
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{ height: `${b.h}%`, backgroundColor: color, opacity: 0.35 }}
        />
      ))}
    </div>
  )
}

export default function NavRail({ activePage, onNavigate, onExit, profile, onLogout }) {
  const { settings } = useSettings();
  const [launchState, setLaunchState]   = useState('idle');
  const [accountOpen, setAccountOpen]   = useState(false);
  const [fullProfile,  setFullProfile]  = useState(null);   // enriched from Firestore
  const [profileTab,   setProfileTab]   = useState('info'); // info | bio | friends | steam | security | pass

  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  // Fetch fresh full profile from Firestore when modal opens
  useEffect(() => {
    if (!accountOpen || !profile?.uid) return
    getDoc(doc(db, 'users', profile.uid)).then(snap => {
      if (snap.exists()) setFullProfile({ ...profile, ...snap.data() })
    })
  }, [accountOpen])

  const p = fullProfile ?? profile   // use enriched if available, fallback to prop

  const avatarLetter = (p?.displayName ?? p?.email ?? '?').charAt(0).toUpperCase()
  const isVip   = Boolean(p?.isVip)
  const hasGame = Boolean(p?.steamOwnsGame)

  async function handleQuickLaunch() {
    setLaunchState('launching');
    const result = await window.api.launchGame();
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
      clearSession();          // removes the uid
      setAccountOpen(false);
      onLogout();              // sets user = null in App
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }

  // VIP shimmer colours
  const vipGold    = '#FDB515'
  const accentColor = isVip ? vipGold : accent.hex

  return (
    <>
      {/* ── ACCOUNT MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
  {accountOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-lg p-6"
      onClick={() => setAccountOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-4xl overflow-hidden rounded-[28px] border shadow-2xl"
        style={{
          backgroundColor: theme.surface,
          borderColor: isVip ? `${vipGold}50` : theme.border,
          color: theme.text,
          maxHeight: '92vh',
        }}
      >
        {/* ════════ LEFT PANEL ════════ */}
        <div
          className="relative flex w-[280px] py-10 shrink-0 flex-col overflow-hidden"
          style={{
            background: isVip
              ? 'linear-gradient(165deg, #1a1200 0%, #2e2000 45%, #120c00 100%)'
              : `linear-gradient(165deg, ${theme.bg} 0%, ${accent.hex}15 50%, ${theme.bg} 100%)`,
          }}
        >
          {/* grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(${isVip ? vipGold : accent.hex} 1px, transparent 1px), linear-gradient(90deg, ${isVip ? vipGold : accent.hex} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* avatar */}
          <div className="relative z-10 flex flex-col items-center px-6 pt-10">
            <div
              className="relative h-36 w-36 overflow-hidden rounded-3xl border-[3px] shadow-2xl"
              style={{
                borderColor: isVip ? vipGold : theme.border,
                boxShadow: isVip ? `0 0 40px ${vipGold}40` : `0 0 30px ${accent.hex}20`,
              }}
            >
              {p?.photoURL ? (
                <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-4xl font-black"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  {avatarLetter}
                </div>
              )}
              {isVip && (
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  style={{ boxShadow: `inset 0 0 0 2px ${vipGold}60` }}
                />
              )}
            </div>

            {/* name */}
            <h2 className="mt-5 text-center text-xl font-bold tracking-tight">
              {p?.displayName ?? 'Unknown'}
            </h2>
            <p className="mt-1 text-center text-xs opacity-45">{maskEmail(p?.email)}</p>

            {/* tier badge */}
            <div
              className="mt-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                backgroundColor: isVip ? `${vipGold}18` : `${theme.border}`,
                color: isVip ? vipGold : undefined,
                opacity: isVip ? 1 : 0.5,
              }}
            >
              <FontAwesomeIcon icon={isVip ? faCrown : faShield} style={{ fontSize: 10 }} />
              {isVip ? 'VIP Operative' : 'Standard Operative'}
            </div>
          </div>

          {/* left status list */}
          <div className="relative z-10 mt-8 flex flex-1 flex-col gap-1 px-5">
            {[
              { icon: faGamepad, label: 'Game Access', value: hasGame ? 'Owned' : 'None', ok: hasGame },
              { icon: faShield, label: 'Two-Factor', value: p?.totpLinked ? 'Active' : 'Off', ok: p?.totpLinked },
              { icon: faFingerprint, label: 'Passkey', value: p?.hasPasskey ? 'Set' : 'None', ok: p?.hasPasskey },
            ].map(({ icon, label, value, ok }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl px-3 py-3 backdrop-blur-md transition hover:scale-[1.01] hover:backdrop-blur-md"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
              >
                <FontAwesomeIcon
                  icon={icon}
                  style={{ fontSize: 14, color: ok ? '#666' : '#666' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] opacity-40">{label}</p>
                  <p className="text-xs font-semibold" style={{ color: ok ? '#22c55e' : undefined }}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* uid */}
          {p?.uid && (
            <div className="relative z-10 px-5 pb-6 pt-4">
              <CopyUID uid={p.uid} accent={accentColor} />
            </div>
          )}
        </div>

        {/* ════════ RIGHT PANEL ════════ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* close */}
          <button
            onClick={() => setAccountOpen(false)}
            className="absolute right-5 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:text-white"
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} />
          </button>

          {/* tabs */}
          <div className="flex gap-1 border-b px-6 pt-1" style={{ borderColor: theme.border }}>
            {[
              { id: 'info', label: 'Dossier', icon: faShield },
              { id: 'bio', label: 'Bio', icon: faStar },
              { id: 'steam', label: 'Steam', icon: faGamepad },
              { id: 'security', label: 'Security', icon: faFingerprint },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setProfileTab(t.id)}
                className="relative flex items-center gap-2 px-4 py-3 text-[12px] font-semibold transition-all"
                style={{
                  color: profileTab === t.id ? accentColor : undefined,
                  opacity: profileTab === t.id ? 1 : 0.4,
                }}
              >
                <FontAwesomeIcon icon={t.icon} style={{ fontSize: 12 }} />
                {t.label}
                {profileTab === t.id && (
                  <motion.div
                    layoutId="account-tab-line"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ backgroundColor: accentColor }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* content */}
          <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
            <AnimatePresence mode="wait">
              {/* DOSSIER */}
              {profileTab === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { icon: faMapPin, label: 'Location', value: p?.location || 'Classified' },
                    { icon: faGlobe, label: 'Timezone', value: p?.timezone || 'UTC' },
                    { icon: faCrown, label: 'Clearance', value: isVip ? 'Maximum — VIP' : 'Standard' },
                    { icon: faGamepad, label: 'Access Level', value: hasGame ? 'Granted' : 'Restricted' },
                    ...(p?.gender && p.gender !== 'Prefer not to say'
                      ? [{ icon: faStar, label: 'Gender', value: p.gender }]
                      : []),
                  ].map(({ icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3.5 rounded-2xl px-4 py-4"
                      style={{ backgroundColor: `${theme.bg}aa` }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                      >
                        <FontAwesomeIcon icon={icon} style={{ fontSize: 19 }} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[11px] opacity-40">{label}</p>
                        <p className="mt-0 truncate text-[12px] font-semibold">{value}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* BIO */}
              {profileTab === 'bio' && (
                <motion.div
                  key="bio"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl px-5 py-4" style={{
                          backgroundColor: `${theme.bg}aa`,
                        }}>
                    <div className="mb-2 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faStar} style={{ fontSize: 12, color: accentColor }} />
                      <p className="text-[12px] opacity-40">About</p>
                    </div>
                    <p className="text-[14px] leading-relaxed opacity-80">
                      {p?.bio ? (
                        p.bio
                      ) : (
                        <>
                          No bio set yet. You can add a short description about yourself in your{" "}
                          <a
                            href="https://zyphorstudios.com/profile"
                            target="_blank"
                            className="font-semibold underline transition hover:opacity-80"
                            style={{ color: accentColor }}
                            rel="noopener noreferrer"
                          >
                            profile
                          </a>
                          .
                        </>
                      )}
                      
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { icon: faUsers, label: 'Friends', value: p?.friendCount ?? 0 },
                      { icon: faClock, label: 'Hours', value: p?.steamHours ?? 0 },
                      { icon: faGamepad, label: 'Games', value: p?.steamGames ?? 0 },
                    ].map(({ icon, label, value }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center rounded-2xl py-5"
                        style={{
                          backgroundColor: `${theme.bg}aa`
                        }}
                      >
                        {/* <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: accentColor, marginBottom: 8 }} /> */}
                        <p className="text-[28px] font-extrabold" style={{ color: accentColor }}>{value}</p>
                        <p className="mt-0.5 text-[11px] opacity-40">{label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* NETWORK */}
              {profileTab === 'friends' && (
                <motion.div
                  key="friends"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2"
                >
                  {(p?.friends ?? []).length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl py-16" style={{ backgroundColor: `${theme.bg}aa` }}>
                      <FontAwesomeIcon icon={faUsers} style={{ fontSize: 28, opacity: 0.15 }} />
                      <p className="mt-3 text-sm opacity-40">No friends yet</p>
                    </div>
                  ) : (
                    (p.friends).map((f, i) => {
                      const online = f.status === 'online' || f.status === 'ingame'
                      const color = f.status === 'online' ? '#22c55e' : f.status === 'ingame' ? '#3b82f6' : '#555'
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-4 rounded-2xl px-4 py-3"
                          style={{ backgroundColor: `${theme.bg}aa` }}
                        >
                          <div className="relative">
                            <div
                              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl text-sm font-bold"
                              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                            >
                              {f.photoURL ? (
                                <img src={f.photoURL} alt="" className="h-full w-full object-cover" />
                              ) : (
                                (f.displayName ?? '?').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div
                              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                              style={{
                                backgroundColor: color,
                                borderColor: theme.surface,
                                boxShadow: online ? `0 0 8px ${color}` : 'none',
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{f.displayName ?? 'Unknown'}</p>
                            <p className="text-[12px]" style={{ color }}>
                              {f.currentGame ? `Playing ${f.currentGame}` : f.status ?? 'offline'}
                            </p>
                          </div>
                          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11, opacity: 0.25 }} />
                        </div>
                      )
                    })
                  )}
                </motion.div>
              )}

             {/* STEAM */}
{/* STEAM */}
{profileTab === 'steam' && (
  <motion.div
    key="steam"
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -12 }}
    transition={{ duration: 0.18 }}
    className="space-y-5"
  >
    {/* Steam account row */}
    <div
      className="flex items-center gap-4 rounded-2xl px-5 py-4"
      style={{ backgroundColor: `${theme.bg}aa` }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        <FontAwesomeIcon icon={faGamepad} style={{ fontSize: 20 }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] opacity-40">Steam Account</p>
        <p className="truncate text-[15px] font-semibold">
          {p?.steamId ?? 'Not linked'}
        </p>
      </div>
      <div
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: p?.steamId ? '#22c55e' : '#ef4444' }}
      />
    </div>

    {/* Games you own */}
    <div>
      <p className="mb-3 text-[12px] font-semibold opacity-50">Games you own</p>

      <div className="grid grid-cols-3 gap-3">
        {/* STAY card */}
        <div
          className="group relative overflow-hidden border transition-all"
          style={{
            borderColor: hasGame ? `${accentColor}44` : theme.border,
            backgroundColor: `${theme.bg}aa`,
          }}
        >
          {/* Poster */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/40">
            {/* Replace src with real poster when you have one */}
            {/* Poster */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/40">
              {hasGame ? (
                <img
                  src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/cf73f970e8df35997b1dd12bcb5e0c6e9cc78255/library_capsule.jpg?t=1784562601"
                  alt="STAY: Chapter One"
                  className="h-full w-full object-cover transition-transform duration-500 "
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: 'linear-gradient(160deg, #111, #0a0a0a)' }}
                >
                  <span className="font-display text-2xl tracking-wide text-[#444]">
                    STAY
                  </span>
                </div>
              )}

              {/* Owned badge */}
              {hasGame && (
                <div
                  className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#22c55e22', color: '#26bd60' }}
                >
                  Owned
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Empty slot / coming soon */}
        <div
          className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-dashed opacity-30"
          style={{ borderColor: theme.border }}
        >
          <FontAwesomeIcon icon={faGamepad} style={{ fontSize: 22, marginBottom: 8 }} />
          <p className="text-[11px]">More soon</p>
        </div>
      </div>
    </div>

    {!p?.steamId && (
      <p className="text-center text-[12px] opacity-30">
        Link Steam at zyphorstudios.com/profile
      </p>
    )}
  </motion.div>
)}

              {/* SECURITY */}
              {profileTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  {[
                    { icon: faShield, label: 'Two-Factor Authentication', ok: p?.totpLinked, value: p?.totpLinked ? 'Active' : 'Not set up' },
                    { icon: faFingerprint, label: 'Passkey / Biometric', ok: p?.hasPasskey, value: p?.hasPasskey ? 'Registered' : 'Not registered' },
                    { icon: faGamepad, label: 'Game Ownership', ok: hasGame, value: hasGame ? 'Verified via Steam' : 'Unverified' },
                  ].map(({ icon, label, ok, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-4 rounded-2xl px-5 py-4"
                      style={{ backgroundColor: `${theme.bg}aa` }}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: ok ? '#22c55e18' : '#ef444418',
                          color: ok ? '#22c55e' : '#ef4444',
                        }}
                      >
                        <FontAwesomeIcon icon={icon} style={{ fontSize: 18 }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] opacity-40">{label}</p>
                        <p className="text-[13px] font-semibold mt-0.5" style={{ color: ok ? '#22c55e' : '#ef4444' }}>
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* footer */}
          <div className="flex gap-3 border-t px-6 py-4" style={{ borderColor: theme.border }}>
            <button
              onClick={handleSignOut}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl border py-3 text-sm font-semibold transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
              style={{ borderColor: theme.border }}
            >
              <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 14 }} />
              Sign out
            </button>
            <button
              onClick={() => {
                setAccountOpen(false)
                onNavigate('settings')
              }}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl py-3 text-sm font-semibold transition"
              style={{
                backgroundColor: accentColor,
                color: isVip ? '#000' : accent.on,
              }}
            >
              <FontAwesomeIcon icon={faGear} style={{ fontSize: 14 }} />
              Settings
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* ── NAV RAIL ──────────────────────────────────────────────────────── */}
      <nav
        className="relative flex w-[80px] shrink-0 flex-col items-center gap-1 overflow-hidden rounded-3xl border py-4 backdrop-blur-glass"
        style={{ backgroundColor: `${theme.surface}cc`, borderColor: theme.border }}
      >
        {/* Avatar button */}
        <button
          type="button"
          onClick={() => { setProfileTab('info'); setAccountOpen(true); }}
          title={p?.displayName ?? 'Account'}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: isVip ? `${vipGold}66` : theme.border,
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
          {/* VIP glow ring */}
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
            const Icon = item.icon;
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
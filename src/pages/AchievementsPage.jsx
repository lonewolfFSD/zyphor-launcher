import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { Lock, Unlock, Trophy, AlertTriangle, RefreshCw, ExternalLink, ChevronDown } from 'lucide-react';

import GlassSurface from '../effects/GlassSurface.tsx';

// GlassLayer IS the container — it renders as the element itself, not behind it.
// Pass all layout classes, style, and children just like you would a <div>.
function GlassLayer({ children, className = '', style = {}, borderRadius = 16, distortionScale = -60, blur = 11 }) {
  const { settings } = useSettings();
  const theme = THEMES[settings?.theme] || THEMES.oled;
  const isLiquidGlass = (settings?.navStyle ?? 'glass') === 'liquid-glass';

  if (isLiquidGlass) {
    return (
      <GlassSurface
        width="100%"
        height="auto"
        borderRadius={borderRadius}
        brightness={50}
        opacity={0.93}
        blur={blur}
        distortionScale={distortionScale}
        className={className}
        style={style}
      >
        {children}
      </GlassSurface>
    );
  }

  return (
    <div
      className={className}
      style={{
        borderRadius,
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        background: `${theme.surface}88`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

gsap.registerPlugin(useGSAP);


// ─── Game registry ────────────────────────────────────────────────────────────
// To add a new game later: add an entry here. That's it.
const GAMES = [
  {
    id:        'stay',
    appId:     '4956550',
    name:      'STAY: Possession • Obsession • Permanence',
    fullName:  'STAY: Possession • Obsession • Permanence',
    url: 'https://avatars.fastly.steamstatic.com/b696b00d13eaa6ddef314f3c85162c7bb72a5f7a_full.jpg',
    developer: 'Zyphor Studios',
    status:    'released', // 'released' | 'coming_soon'
    achievementIcons: {
      JUSTICE_SERVED: {
        locked:   'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/7ee73b63785346248bb25844564f66fdfa76a9f8.jpg',
        unlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/ee26db6f940b2b87cb6e10c9ae408cea97eafd5d.jpg',
      },
      MAKE_A_WISH: {
        locked:   'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/f53765bad5c621c2e705e379345b11f436a1428f.jpg',
        unlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/692bfc2bbbca04c1a4117b965b23a4372655af26.jpg',
      },
      EYES_EVERYWHERE: {
        locked:   'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/1314e4bf9a445526318d2e6392ba20fe31d5741d.jpg',
        unlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/08fee551b6596b0d167a69f95fc2d9214e87a702.jpg',
      },
      DINNER_TIME: {
        locked:   'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/7fbfa3e44582686ee3aa52d2a0f77e2cd99e2015.jpg',
        unlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/fb4a0c7784d818422df0808a10819b96bb1fe808.jpg',
      },
      UNEXPECTED_VISITOR: {
        locked:   'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/eb2cd4d59c5290afa1d15a0d2ec5f500d1c391d2.jpg',
        unlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/90c750fa1ac002348e2e4019e34085d8134c2514.jpg',
      },
    },
  },
  // ── Add future games below ──────────────────────────────────────────────
  // {
  //   id:       'game2',
  //   appId:    '0000000',
  //   name:     'Game 2',
  //   fullName: 'Game 2: Subtitle',
  //   developer: 'Zyphor Studios',
  //   status:   'coming_soon',
  //   achievementIcons: {},
  // },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function AchievementSkeleton({ theme }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 animate-pulse"
      style={{ backgroundColor: theme.surface }}
    >
      <div className="w-14 h-14 rounded-xl shrink-0" style={{ backgroundColor: theme.border }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full w-1/3" style={{ backgroundColor: theme.border }} />
        <div className="h-2 rounded-full w-2/3 opacity-50" style={{ backgroundColor: theme.border }} />
      </div>
      <div className="w-16 h-5 rounded-full shrink-0" style={{ backgroundColor: theme.border }} />
    </div>
  );
}

// ─── Achievement row ──────────────────────────────────────────────────────────
function AchievementRow({ achievement, accent, theme, iconMap }) {
  const { apiName, displayName, description, achieved, unlockTime } = achievement;
  const icons   = iconMap?.[apiName];
  const iconSrc = icons?.[achieved ? 'unlocked' : 'locked'];
  const [imgFailed, setImgFailed] = useState(false);

  const unlockDate = unlockTime
    ? new Date(unlockTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const rowContent = (
    <>
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-xl mr-2.5 shrink-0 overflow-hidden border flex items-center justify-center"
        style={{
          borderColor:       achieved ? `${accent.hex}44` : theme.border,
          backgroundColor:   theme.bg,
          filter:            achieved ? 'none' : 'grayscale(100%) brightness(0.45)',
        }}
      >
        {iconSrc && !imgFailed ? (
          <img
            src={iconSrc}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Trophy size={22} style={{ color: achieved ? accent.hex : 'rgba(255,255,255,0.15)' }} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-medium tracking-tight leading-snug truncate"
          style={{ color: achieved ? theme.text : `${theme.text}55`, fontFamily: 'Apple Garamond' }}
        >
          {displayName}
        </p>
        {description && (
          <p className="text-[11px] mt-0.5 leading-snug opacity-40 truncate">{description}</p>
        )}
        {achieved && unlockDate && (
          <p className="text-[9px] mt-0.5 font-mono" style={{ color: `${accent.hex}88` }}>
            Unlocked {unlockDate}
          </p>
        )}
      </div>

      {/* Status pill */}
      <div
        className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest"
        style={{
          backgroundColor: achieved ? `${accent.hex}18` : 'rgba(255,255,255,0.04)',
          color:           achieved ? accent.hex         : 'rgba(255,255,255,0.2)',
        }}
      >
        {achieved ? <><Unlock size={10} /> <span className='mt-0.5'>Achieved</span></> : <><Lock size={10} /> <span className='mt-0.5'>Locked</span></>}
      </div>
    </>
  );

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <GlassLayer
        borderRadius={16}
        distortionScale={-180}
        blur={20}
        className="flex items-center gap-4 px-4 py-3 transition-all duration-200"
        style={{
          border: `1px solid ${achieved ? `${accent.hex}28` : theme.border}`,
          backgroundColor: achieved ? `${accent.hex}0d` : `${theme.surface}88`,  // ← this was missing
        }}
      >
        {rowContent}
      </GlassLayer>
    </motion.div>
  );
}

// ─── Game selector dropdown ───────────────────────────────────────────────────
function GameSelector({ games, selected, onSelect, accent, theme }) {
  const [open, setOpen] = useState(false);
  const current = games.find(g => g.id === selected) ?? games[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 rounded-2xl px-4 py-2.5 transition hover:opacity-80 z-100"
        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
      >
        {/* Mini poster */}
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black/40">
          {current.status === 'released' ? (
            <img
              src={current.url}
              alt={current.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy size={14} style={{ color: `${accent.hex}44` }} />
            </div>
          )}
        </div>

        <div className="text-left min-w-0">
          <p className="text-[13px] font-semibold leading-none truncate" style={{ color: theme.text }}>
            {current.name}
          </p>
          {current.status === 'coming_soon' && (
            <p className="text-[9px] mt-0.5 font-bold uppercase tracking-widest opacity-40">Coming Soon</p>
          )}
        </div>

        <ChevronDown
          size={14}
          className="shrink-0 transition-transform"
          style={{
            color: `${theme.text}55`,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,  y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full mt-1.5 left-0 z-50 min-w-[220px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
          >
            {games.map(game => {
              const isActive = game.id === selected;
              return (
                <button
                  key={game.id}
                  onClick={() => { onSelect(game.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                  style={{
                    backgroundColor: isActive ? `${accent.hex}14` : 'transparent',
                  }}
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-black/40">
                    {game.status === 'released' ? (
                      <img
                        src={game.url}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${accent.hex}10` }}
                      >
                        <Trophy size={14} style={{ color: `${accent.hex}44` }} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-semibold truncate leading-none"
                      style={{ color: isActive ? accent.hex : theme.text }}
                    >
                      {game.name}
                    </p>
                    <p className="text-[10px] opacity-40 mt-0.5 truncate">{game.developer}</p>
                  </div>

                  {game.status === 'coming_soon' && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 shrink-0"
                      style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                    >
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Module-level: skip GSAP intro on revisits (same pattern as HomePage)
let achievementsVisited = false;

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AchievementsPage({ profile }) {
  const { settings } = useSettings();
  const theme    = THEMES[settings?.theme]   || THEMES.oled;
  const accent   = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  // Selected game
  const [selectedGameId, setSelectedGameId] = useState(GAMES[0].id);
  const game = GAMES.find(g => g.id === selectedGameId) ?? GAMES[0];

  // Steam state
  const [steamData,  setSteamData]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState('all');
  const fetchIdRef = useRef(0);

  const steamId = profile?.steamId ?? profile?.raw?.steamId ?? null;

  // GSAP intro state — skip on revisits
  const pageRef  = useRef(null);
  const didIntro = useRef(achievementsVisited);
  const [pageReady, setPageReady] = useState(achievementsVisited);

  // Delay page reveal on first visit so GSAP has DOM to animate
  useEffect(() => {
    if (achievementsVisited) return;
    const id = setTimeout(() => setPageReady(true), 50);
    return () => clearTimeout(id);
  }, []);

  // GSAP intro
  useGSAP(() => {
    if (!pageReady || !pageRef.current || didIntro.current) return;
    didIntro.current    = true;
    achievementsVisited = true;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.ap-header',  { y: -16, opacity: 0, duration: 0.5 },  0)
        .from('.ap-banner',  { y: 24,  opacity: 0, scale: 0.98, duration: 0.6 }, 0.08)
        .from('.ap-filters', { y: 12,  opacity: 0, duration: 0.4 }, 0.22)
        .from('.ap-row',     { y: 16,  opacity: 0, duration: 0.4, stagger: 0.05 }, 0.28);
    }, pageRef);
    return () => ctx.revert();
  }, [pageReady]);

  const fetchSteam = async (id) => {
    if (!id) return;
    const reqId = ++fetchIdRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://www.zyphorstudios.com/api/steam?steamId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const b = await res.json(); detail = b?.error || b?.message || detail; } catch {}
        throw new Error(detail);
      }
      const data = await res.json();
      if (reqId !== fetchIdRef.current) return;
      setSteamData(data);
    } catch (err) {
      if (reqId !== fetchIdRef.current) return;
      setError(err.message || 'Failed to fetch Steam data.');
    } finally {
      if (reqId === fetchIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!steamId) return;
    // Defer until after the nav transition paint — keeps navigation snappy
    const cb = () => fetchSteam(steamId);
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(cb, { timeout: 400 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(cb, 100);
    return () => clearTimeout(id);
  }, [steamId]);

  // Reset filter when game changes
  useEffect(() => { setFilter('all'); }, [selectedGameId]);

  const ownsGame   = Boolean(steamData?.gameStats?.owns);
  const achievements = steamData?.gameStats?.achievements ?? [];
  const total      = steamData?.gameStats?.achievementsTotal    ?? achievements.length;
  const unlocked   = steamData?.gameStats?.achievementsUnlocked ?? achievements.filter(a => a.achieved).length;
  const progress   = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  const filtered = useMemo(() => {
    if (filter === 'achieved') return achievements.filter(a => a.achieved);
    if (filter === 'locked')   return achievements.filter(a => !a.achieved);
    return achievements;
  }, [achievements, filter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => a.achieved === b.achieved ? 0 : a.achieved ? -1 : 1),
  [filtered]);

  const storeUrl = `https://store.steampowered.com/app/${game.appId}`;

  return (
    <div ref={pageRef} className="relative h-full overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif', opacity: pageReady ? 1 : 0 }}>

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: `linear-gradient(to bottom, ${theme.bg}cc 0%, ${theme.bg}88 40%, ${theme.bg}cc 100%)`, opacity: 0.2 }}
      />

      <div className="px-9 py-7">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="ap-header flex items-start justify-between gap-4 flex-wrap mb-7">
          <div>
            <h2
              className="text-4xl font-medium tracking-tight"
              style={{ color: theme.text, fontFamily: 'Apple Garamond' }}
            >
              Achievements
            </h2>
            <p className="mt-0 text-lg opacity-40"><span style={{
              fontFamily: 'Apple Garamond'
            }}>Track your progress across Zyphor Studio games.</span></p>
          </div>

          <div className="flex items-center gap-3">
            {/* Game selector */}
            <GameSelector
              games={GAMES}
              selected={selectedGameId}
              onSelect={setSelectedGameId}
              accent={accent}
              theme={theme}
            />
          </div>
        </div>

        {/* ── Coming soon state ─────────────────────────────────────────────── */}
        {game.status === 'coming_soon' && (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-2xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
          >
            <Trophy size={32} className="mb-4" style={{ color: `${accent.hex}44` }} />
            <p className="text-[15px] font-semibold" style={{ color: theme.text }}>{game.fullName}</p>
            <p className="text-[12px] opacity-40 mt-1">Achievements will appear here after launch.</p>
          </div>
        )}

        {/* ── No Steam linked ───────────────────────────────────────────────── */}
        {game.status === 'released' && !steamId && !loading && (
          <div
            className="flex items-start gap-3 rounded-2xl px-5 py-4 border"
            style={{ backgroundColor: theme.surface, borderColor: `${accent.hex}33` }}
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: accent.hex }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.text }}>Steam account not linked</p>
              <p className="text-[12px] opacity-50 mt-0.5">
                Link at{' '}
                <a href="https://zyphorstudios.com/profile" target="_blank" rel="noreferrer"
                  className="underline" style={{ color: accent.hex }}>
                  zyphorstudios.com/profile
                </a>{' '}
                to see your achievements here.
              </p>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {game.status === 'released' && error && !loading && steamId && (
          <div
            className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 border"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
            <button
              onClick={() => fetchSteam(steamId)}
              className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-3 py-1.5 transition hover:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        {/* ── Game not owned ────────────────────────────────────────────────── */}
        {game.status === 'released' && steamId && !loading && !error && steamData && !ownsGame && (
          <div
            className="flex items-start gap-3 rounded-2xl px-5 py-4 border"
            style={{ backgroundColor: theme.surface, borderColor: `${accent.hex}33` }}
          >
            <Trophy size={15} className="mt-0.5 shrink-0" style={{ color: `${accent.hex}66` }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.text }}>
                {game.name} not detected in your library
              </p>
              <p className="text-[12px] opacity-50 mt-0.5">
                Achievements will appear here once you own the game on Steam.
              </p>
            </div>
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────────────────── */}
        {game.status === 'released' && steamId && (loading || ownsGame) && (
          <div className="space-y-5">

            {/* Game banner + progress */}
            <div
              className="ap-banner relative overflow-hidden rounded-[2rem] border"
              style={{ borderColor: `${accent.hex}28`, backgroundColor: theme.surface }}
            >
              <div className="relative h-16 -z-5">
                <img
                  src={`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/76bc20881fac10578131cd62da809d70aef8ffa3/library_hero.jpg?t=1784562601`}
                  alt={game.name}
                  className="w-full h-[180px] object-cover opacity-60"
                />
              </div>

              <div className="px-5 pb-5 -mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: `${accent.hex}88` }}>
                  {game.fullName}
                </p>

                {loading ? (
                  <div className="flex items-center gap-2 mt-3">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: accent.hex, animationDelay: `${d}ms` }} />
                    ))}
                    <span className="text-[11px] opacity-40 ml-1">Fetching achievements…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between mt-2 mb-3 px-2.5 font-[Manrope]">
                      <div>
                        <span className="text-7xl font-medium z-[100]" style={{ color: accent.hex, fontFamily: 'Apple Garamond' }}>{unlocked}</span>
                        <span className="text-4xl opacity-30 ml-1" style={{
                          fontFamily: 'Apple Garamond'
                        }}>/ {total}</span>
                        <span className="text-[18px] opacity-40 ml-2" style={{
                          fontFamily: 'Apple Garamond'
                        }}>achievements</span>
                      </div>
                      <span className="text-[12px] font-bold rounded-full px-3 py-1"
                        style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full px-4"
                        style={{ backgroundColor: accent.hex }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>



            {/* Filter tabs */}
            {!loading && achievements.length > 0 && (
              <div
                className="ap-filters flex gap-1 px-1 py-1 w-fit"
                style={{ fontFamily: 'Apple Garamond' }}
              >
                {[
                  { id: 'all',      label: `All (${achievements.length})` },
                  { id: 'achieved', label: `Achieved (${unlocked})` },
                  { id: 'locked',   label: `Locked (${total - unlocked})` },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id)}
                    className="px-6 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                    style={{
                      backgroundColor: filter === opt.id ? accent.hex  : 'transparent',
                      color:           filter === opt.id ? accent.on   : `${"#ffffff80"}`,
                      fontWeight:       filter === opt.id ? 800         : 200,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Achievement list */}
            {loading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((a, i) => <AchievementSkeleton key={i} theme={theme} />)}
              </div>
            ) : achievements.length === 0 && !error ? (
              <div
                className="flex flex-col items-center justify-center py-16 rounded-2xl border"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
              >
                <Trophy size={28} className="opacity-15 mb-2" />
                <p className="text-[13px] opacity-30">No achievement data yet — play the game first.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-3 gap-2">
                  {sorted.map((a, i) => (
                    <motion.div
                      key={a.apiName}
                      className="ap-row"
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.03, duration: 0.18 }}
                    >
                      <AchievementRow
                        achievement={a}
                        accent={accent}
                        theme={theme}
                        iconMap={game.achievementIcons}
                      />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
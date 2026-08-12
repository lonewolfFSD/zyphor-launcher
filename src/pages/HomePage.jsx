import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay, faSquare, faXmark, faClock, faCircleCheck, faCircleArrowUp,
  faWifi, faTriangleExclamation, faNewspaper, faChevronRight,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import PlayButton from './images/play.png';
import SquareButton from './images/square.png';
import {
  faDiscord, faXTwitter, faYoutube, faRedditAlien, faTiktok, faInstagram,
} from '@fortawesome/free-brands-svg-icons';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import Logo from '../../build-resources/logo.png';
import GlassSurface from '../effects/GlassSurface.tsx';

// ── Status check endpoints ─────────────────────────────────────────────────────
const SERVER_STATUS_URL    = import.meta.env.VITE_SERVER_STATUS_URL    ?? null;
const VERSION_MANIFEST_URL = import.meta.env.VITE_VERSION_MANIFEST_URL ?? null;
const CURRENT_VERSION      = import.meta.env.VITE_APP_VERSION          ?? '0.0.0';

// ── Game identity ──────────────────────────────────────────────────────────────
const STAY_STEAM_APP_ID    = '4956550';
const STAY_STEAM_STORE_URL = `https://store.steampowered.com/app/${STAY_STEAM_APP_ID}`;
const STAY_GAME_NAME       = 'STAY: Possession • Obsession • Permanence';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// ── Dynamic greeting ───────────────────────────────────────────────────────────
const GREETINGS = {
  // 5am–11:59am
  morning: [
    (n) => `Good morning, ${n}.`,
    (n) => `Rise and shine, ${n}.`,
    (n) => `Morning, ${n}. Ready to play?`,
    (n) => `Early bird, ${n}.`,
    (n) => `Hey ${n}, morning.`,
    (n) => `Good morning, operative ${n}.`,
  ],
  // 12pm–4:59pm
  afternoon: [
    (n) => `Good afternoon, ${n}.`,
    (n) => `Hey ${n}, afternoon already.`,
    (n) => `What's up, ${n}?`,
    (n) => `Afternoon, ${n}. Loading up?`,
    (n) => `Welcome back, ${n}.`,
    (n) => `Good to see you, ${n}.`,
  ],
  // 5pm–8:59pm
  evening: [
    (n) => `Good evening, ${n}.`,
    (n) => `Evening, ${n}. Time to play?`,
    (n) => `Hey ${n}, evening session?`,
    (n) => `Welcome back, ${n}.`,
    (n) => `Evening, operative ${n}.`,
    (n) => `Good evening, ${n}. Ready?`,
  ],
  // 9pm–4:59am
  night: [
    (n) => `Still up, ${n}?`,
    (n) => `Late night session, ${n}?`,
    (n) => `Night owl mode, ${n}.`,
    (n) => `Hey ${n}, burning the midnight oil?`,
    (n) => `Dark hours, ${n}. Let's go.`,
    (n) => `Late night, ${n}. Welcome.`,
  ],
};

function getGreeting(displayName) {
  const name = (displayName ?? 'Operative').split(' ')[0];
  const h = new Date().getHours();
  const bucket =
    h >= 5  && h < 12 ? 'morning'   :
    h >= 12 && h < 17 ? 'afternoon' :
    h >= 17 && h < 21 ? 'evening'   : 'night';
  const pool = GREETINGS[bucket];
  return pool[Math.floor(Math.random() * pool.length)](name);
}

let homeVisited = false;

const placeholderNews = [];

const HP_SHIMMER_CSS = `
@keyframes hp-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.hp-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.05) 40%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,255,255,0.05) 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: hp-shimmer 1.5s ease-in-out infinite;
}
`;

function Bone({ className = '', style = {}, theme }) {
  return (
    <div
      className={`hp-skel relative overflow-hidden ${className}`}
      style={{ backgroundColor: theme.surface, borderColor: theme.border, ...style }}
    >
      <div className="absolute inset-0 hp-shimmer" />
    </div>
  );
}

function HomeSkeleton({ theme, accent }) {
  const skelRef = useRef(null);

  useGSAP(() => {
    if (!skelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hp-skel',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' }
      );
    }, skelRef);
    return () => ctx.revert();
  }, []);

  return (
    <motion.div
      ref={skelRef}
      key="hp-skeleton"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="absolute inset-0 z-30 flex gap-4 px-8 pointer-events-none"
    >
      <style>{HP_SHIMMER_CSS}</style>
      <div className="flex min-w-0 flex-1 flex-col gap-4 py-0">
        <Bone className="h-[52px] rounded-2xl border" theme={theme} style={{ backgroundColor: `${theme.surface}99` }} />
        <Bone className="h-64 rounded-[2.5em] border" theme={theme} style={{ backgroundColor: `${theme.surface}aa` }} />
        <Bone className="h-6 mt-4 rounded-lg" theme={theme} style={{ width: '55%', border: 'none' }} />
        <div className="flex gap-3 mt-1">
          <Bone className="h-[177px] w-[308px] rounded-3xl border" theme={theme} />
          <Bone
            className="h-[177px] w-[308px] rounded-3xl border border-dashed"
            theme={theme}
            style={{ borderColor: `${accent.hex}55`, backgroundColor: `${theme.surface}80` }}
          />
        </div>
      </div>
      <div className="flex w-80 shrink-0 flex-col gap-3">
        <Bone className="h-12 rounded-[1.8em] border" theme={theme} style={{ backgroundColor: `${theme.surface}88` }} />
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-36 rounded-2xl border" theme={theme} style={{ backgroundColor: `${theme.surface}66` }} />
        ))}
        <Bone className="mt-auto h-16 rounded-2xl border" theme={theme} style={{ backgroundColor: `${theme.surface}55` }} />
      </div>
    </motion.div>
  );
}

export default function HomePage({ profile }) {
  const { settings } = useSettings();
  const theme   = THEMES[settings?.theme]   || THEMES.oled;
  const accent  = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  const hasGame = Boolean(profile?.hasGame || profile?.steamOwnsGame || profile?.steamId);

  const [launchState, setLaunchState]       = useState('idle');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [news, setNews]                     = useState([]);
  const [bannerIndex, setBannerIndex]       = useState(0);
  const [serverStatus, setServerStatus]     = useState('checking');
  const [updateStatus, setUpdateStatus]     = useState('checking');
  const [playtime, setPlaytime]             = useState(null);
  const [updateInfo, setUpdateInfo]         = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDlState, setUpdateDlState]   = useState('idle');
  const [pageReady, setPageReady]           = useState(homeVisited);

  const [showSteamLinkModal, setShowSteamLinkModal] = useState(false);

  const isLiquidGlass = (settings?.navStyle ?? 'glass') === 'liquid-glass';
  const [greeting] = useState(() => getGreeting(profile?.displayName));

  const pageRef  = useRef(null);
  const didIntro = useRef(homeVisited);

  const fadeMask = {
    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
    maskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
    opacity: 1,
  };

  useEffect(() => { (async () => {
    try {
      const q = query(collection(db, 'news'), orderBy('date', 'desc'), limit(5));
      const snap = await getDocs(q);
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setNews([]);
    }

    window.launcherAPI?.getPlaytime?.().then((p) => setPlaytime(p ?? null)).catch(() => {});

    try {
      const snap = await getDoc(doc(db, 'meta', 'status'));
      setServerStatus(snap.exists() ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }

    try {
      if (window.launcherAPI?.checkForUpdates) {
        await window.launcherAPI.checkForUpdates();
      } else {
        const snap = await getDoc(doc(db, 'meta', 'version'));
        const latest = snap.data()?.version ?? CURRENT_VERSION;
        setUpdateStatus(latest !== CURRENT_VERSION ? 'available' : 'current');
      }
    } catch {
      setUpdateStatus('current');
    }

      // Steam link check on mount
      // Steam link check on mount — check Firestore directly
      if (profile?.uid) {
        try {
          const snap = await getDoc(doc(db, 'users', profile.uid));
          const data = snap.data();
          if (!data?.steamId) {
            setShowSteamLinkModal(true);
          }
        } catch {}
      }
  })(); }, []);

  useEffect(() => {
    if (homeVisited) return;
    const id = setTimeout(() => setPageReady(true), 700);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    window.launcherAPI?.onUpdateAvailable?.((info) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
      if (settings?.autoUpdate) setShowUpdateModal(true);
    });
    window.launcherAPI?.onUpToDate?.(() => setUpdateStatus('current'));
    window.launcherAPI?.onDownloadProgress?.((p) => {
      setDownloadProgress(Math.round(p.percent ?? 0));
      setUpdateDlState('downloading');
    });
    window.launcherAPI?.onUpdateDownloaded?.(() => setUpdateDlState('downloaded'));
  }, []); // eslint-disable-line



  const banners = news.length ? news : placeholderNews;
  useEffect(() => {
    if (banners.length < 2 || !motionOn) return;
    const t = setInterval(() => setBannerIndex((i) => (i + 1) % banners.length), 7000);
    return () => clearInterval(t);
  }, [banners.length, motionOn]);
  const banner = banners[bannerIndex];

  function GlassLayer({ borderRadius, distortionScale = -180, blur = 11 }) {
  const { settings } = useSettings();
  const theme = THEMES[settings?.theme] || THEMES.oled;
  const isLiquidGlass = (settings?.navStyle ?? 'glass') === 'liquid-glass';

  if (isLiquidGlass) {
    return (
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={borderRadius}
        brightness={50}
        opacity={0.93}
        blur={blur}
        distortionScale={distortionScale}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius,
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        background: `${theme.surface}55`,
      }}
    />
  );
}

  function handlePurchase() {
    if (window.launcherAPI?.openExternal) {
      window.launcherAPI.openExternal(STAY_STEAM_STORE_URL);
    } else {
      window.open(STAY_STEAM_STORE_URL, '_blank', 'noopener,noreferrer');
    }
  }

  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  function startGamePolling() {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const running = await window.launcherAPI?.isGameRunning?.();
        if (running === false) {
          clearInterval(pollRef.current);
          setLaunchState('idle');
        }
      } catch {}
    }, 3000);
  }

  async function handlePlay() {
  const isVip = Boolean(profile?.isVip)
  
  setLaunchState('launching')
  setShowLaunchModal(true)

  try {
    let hasAccess = isVip // VIPs skip Steam check

    if (!hasAccess && window.launcherAPI?.verifySteamOwnership && profile?.uid) {
      const result = await window.launcherAPI.verifySteamOwnership(profile.uid)

      if (result?.reason === 'no_steam_linked') {
        // First time — they need to link Steam first
        setLaunchState('idle')
        setShowLaunchModal(false)
        window.launcherAPI?.openExternal(
          `https://zyphorstudios.com/steam-activate?uid=${profile.uid}`
        )
        return
      }

      hasAccess = Boolean(result?.owns)
    }

    if (!hasAccess) {
      setLaunchState('idle')
      setShowLaunchModal(false)
      // setShowNoAccessModal(true)
      return
    }

    // verified — launch
    const result = await window.launcherAPI.launchGame(launchArgs)
    if (result?.reason === 'exe_not_found') {
      // TODO: show a modal asking the user to locate STAY.exe
      setLaunchState('idle')
      setShowLaunchModal(false)
      return
    }

    // in handlePlay(), right before launchGame call
    const launchArgs = [
      '--zyphor-access-verified',
      `--zyphor-uid=${profile.uid}`,
      `--zyphor-name=${profile.displayName}`,
      `--zyphor-vip=${profile.isVip ? '1' : '0'}`,
      `--zyphor-avatar=${profile.photoURL ?? ''}`,
      `--zyphor-location=${profile.location ?? ''}`,
      `--zyphor-timezone=${profile.timezone ?? ''}`,
      `--zyphor-gender=${profile.gender ?? ''}`,
    ]

    await window.launcherAPI.launchGame(launchArgs)

    setTimeout(() => {
      setLaunchState('running')
      setShowLaunchModal(false)
      startGamePolling()
      window.launcherAPI?.minimizeToTray?.()
      window.launcherAPI?.minimize?.()
    }, 3000)

  } catch {
    setLaunchState('idle')
    setShowLaunchModal(false)
  }
}

  async function handleStop() {
    clearInterval(pollRef.current);
    try {
      if (window.launcherAPI?.stopGame) {
        await window.launcherAPI.stopGame();
      } else {
        await window.launcherAPI?.openExternal?.(`steam://exit/${STAY_STEAM_APP_ID}`);
      }
    } catch {}
    setLaunchState('idle');
  }

  function handlePlayToggle() {
    if (launchState === 'running') handleStop();
    else if (launchState === 'idle') handlePlay();
  }

  useGSAP(() => {
    if (!pageReady || !pageRef.current || didIntro.current) return;
    didIntro.current = true;
    homeVisited = true;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hp-status',       { y: -16, opacity: 0, duration: 0.55 }, 0)
        .from('.hp-banner',       { y: 28,  opacity: 0, scale: 0.98, duration: 0.7 }, 0.08)
        .from('.hp-section-title',{ y: 12,  opacity: 0, duration: 0.45 }, 0.22)
        .from('.hp-game-card',    { y: 24,  opacity: 0, duration: 0.5, stagger: 0.1 }, 0.28)
        .from('.hp-aside',        { x: 32,  opacity: 0, duration: 0.6 }, 0.12);
    }, pageRef);
    return () => ctx.revert();
  }, [pageReady]);

  return (
    <div ref={pageRef} className="relative flex h-full gap-4" style={{ color: 'inherit', fontFamily: 'Apple Garamond' }}>
      {/* Background and grid are now rendered globally in App.jsx */}

      <AnimatePresence>
        {!pageReady && <HomeSkeleton theme={theme} accent={accent} />}
      </AnimatePresence>

      <UpdateModal
        visible={showUpdateModal}
        info={updateInfo}
        dlState={updateDlState}
        progress={downloadProgress}
        accent={accent}
        theme={theme}
        onClose={() => setShowUpdateModal(false)}
        onDownload={() => {
          setUpdateDlState('downloading');
          setDownloadProgress(0);
          window.launcherAPI?.downloadUpdate?.();
        }}
        onInstall={() => window.launcherAPI?.installUpdate?.()}
      />

      <LaunchModal
        visible={showLaunchModal}
        gameName={STAY_GAME_NAME}
        onCancel={() => {
          clearInterval(pollRef.current);
          setShowLaunchModal(false);
          setLaunchState('idle');
        }}
        accent={accent}
        theme={theme}
      />

      <SteamLinkModal
        visible={showSteamLinkModal}
        uid={profile?.uid}
        accent={accent}
        theme={theme}
        onClose={() => setShowSteamLinkModal(false)}
      />

      {/* ── LEFT / CENTER ── */}
      <div
        className="relative flex min-w-0 flex-1 flex-col gap-4 px-8 overflow-y-auto transition-opacity duration-300"
        style={{ opacity: pageReady ? 1 : 0 }}
      >
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35 }}
          className="hp-status flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-4 backdrop-blur-sm"
          style={{ borderColor: theme.border, backgroundColor: `${theme.surface}22`, }}
        >
          <div className="absolute inset-0 z-0">
  <GlassLayer borderRadius={16} distortionScale={-10} />
</div>
          <StatusChip
            icon={updateStatus === 'available' ? faCircleArrowUp : faCircleCheck}
            label={updateStatus === 'available' ? `Update available — v${updateInfo?.version ?? ''}` : updateStatus === 'checking' ? 'Checking for updates…' : 'Up to date'}
            tone={updateStatus === 'available' ? accent.hex : undefined}
            onClick={updateStatus === 'available' ? () => setShowUpdateModal(true) : undefined}
          />
          <Divider theme={theme} />
          <StatusChip
            icon={serverStatus === 'online' ? faWifi : faTriangleExclamation}
            label={serverStatus === 'online' ? 'Servers online' : serverStatus === 'checking' ? 'Checking servers…' : 'Servers offline'}
            tone={serverStatus === 'offline' ? '#c1633a' : accent.hex}
          />
          {playtime != null && (
            <>
              <Divider theme={theme} />
              <StatusChip icon={faClock} label={`${playtime} hrs played`} />
            </>
          )}
        </motion.div>

        {/* Banner */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="hp-banner relative h-64 3xl:h-70 shrink-0 overflow-hidden rounded-[2.5em] border"
          style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66`, }}
        >
          <AnimatePresence mode="wait">
            
            <motion.div
              key={bannerIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {banner?.video ? (
                <BannerVideo src={banner.video} poster={banner.image} active={motionOn} fadeMask={fadeMask} />
              ) : banner?.image ? (
                <motion.img
                  src={banner.image}
                  alt=""
                  className="h-full w-full object-cover"
                  style={fadeMask}
                  animate={motionOn ? { scale: [1, 1.05] } : {}}
                  transition={{ duration: 7, ease: 'linear' }}
                />
              ) : (
                <motion.img
                  src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/76bc20881fac10578131cd62da809d70aef8ffa3/library_hero.jpg?t=1784562601"
                  alt=""
                  className="h-full w-full object-cover"
                  style={fadeMask}
                  animate={motionOn ? { scale: [1, 1.05] } : {}}
                  transition={{ duration: 7, ease: 'linear' }}
                />
                
              )}
            </motion.div>

            <div className="absolute inset-0 -z-10">
  <GlassLayer borderRadius={40} distortionScale={-240} blur={60} />
</div>
            
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 py-10 px-12">
            <h2 className="mt-1 text-[2.1em] font-medium text-bone">
              {banner?.title ?? greeting}
            </h2>
            {banner?.date && <p className="mt-1 text-[13px] text-ash/60">{banner.date}</p>}
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-8 right-10 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: i === bannerIndex ? 80 : 12,
                    backgroundColor: i === bannerIndex ? accent.hex : 'rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>

        <hr className="mt-4 border-ash/20" />

        <h3 className='hp-section-title text-2xl font-medium mt-4 font-["Apple Garamond"]'>
          STAY: Possession • Obsession • Permanence{' '}
          <span className="text-ash/40 px-0.5">|</span>{' '}
          <span className="text-xs font-extrabold font-[Manrope]" style={{ color: accent.hex }}>SERIES</span>
        </h3>

        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.4 }}>
          <div className="flex flex-wrap gap-3">
            <div
              className="hp-game-card group relative overflow-hidden rounded-3xl border-2 transition-colors duration-200"
              style={{ width: 262, height: 151, borderColor: 'rgba(255,255,255,0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent.hex; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <img
                src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/5987fca53a2c7e7bc87bc460bbe59b761dc02251/capsule_616x353.jpg?t=1784562601"
                alt="STAY"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />

              <div className="absolute inset-0 -z-10">
  <GlassLayer borderRadius={20} distortionScale={40} />
</div>
              <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(160deg, #1a1510 0%, #0a0908 100%)' }} />
              <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/60" />

              
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                {hasGame ? (
                  <button
                    type="button"
                    onClick={handlePlayToggle}
                    disabled={launchState === 'launching' || launchState === 'error'}
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 scale-90 group-hover:scale-100 disabled:cursor-wait bg-transparent backdrop-blur-sm"
                    style={{ border: `3px solid ${accent.hex}88`, backgroundColor: `${accent.hex}22` }}
                  >
                    {launchState === 'launching' ? (
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : launchState === 'running' ? (
                      <img src={SquareButton} className="w-7" />
                    ) : (
                      <img src={PlayButton} className="w-7 translate-x-0.5" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePurchase}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold shadow-lg transition-transform duration-200 scale-90 group-hover:scale-100"
                    style={{ backgroundColor: '#1b2838', color: '#c7d5e0', border: '1px solid #4c6b8a' }}
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 11 }} />
                    Buy on Steam
                  </button>
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {hasGame ? '' : 'Not owned'}
                </span>
              </div>

              
            </div>



            <div
              className="hp-game-card flex h-[151px] w-[262px] flex-col items-center justify-center rounded-3xl border border-dashed backdrop-blur-glass text-ash/40 transition-colors hover:text-ash/60"
              style={{ backgroundColor: `${theme.surface}90`, border: `2px dashed ${accent.hex}95` }}
            >
              <p className="text-xs font-['Manrope'] text-ash/40">More titles coming soon</p>
              
            </div>
            
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT: News sidebar ── */}
      <motion.aside
        className="hp-aside relative flex w-80 shrink-0 flex-col overflow-hidden rounded-[1.8em] border transition-opacity duration-300"
        style={{ borderColor: theme.border, backgroundColor: `${theme.surface}99`, opacity: pageReady ? 1 : 0 }}
      >
        <div className="absolute inset-0 -z-10">
  <GlassLayer borderRadius={20} distortionScale={-180} blur={60} />
</div>
        <div className="flex shrink-0 items-center gap-2.5 border-b px-6 py-3.5" style={{ borderColor: theme.border }}>
          <h2 className="text-[18.5px] mt-0.5 font-medium tracking-tight text-bone" style={{ fontFamily: 'Apple Garamond' }}>
            What's New?
          </h2>
          <span
            className="ml-auto rounded-lg px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: `${accent.hex}22`, color: `#${accent.hex}99`, border: `2px solid ${accent.hex}66` }}
          >
            {banners.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col font-[Manrope]">
            {banners.map((item, i) => (
              <a
                key={item.id ?? i}
                href={item.url ?? '#'}
                className="group flex flex-col items-center gap-3 border-b px-4 py-3.5 transition-colors hover:bg-white/[0.05]"
                style={{ borderColor: theme.border }}
              >
                <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.bg})` }}
                    >
                      <FontAwesomeIcon icon={faNewspaper} className="text-[16px] text-ash/20" />
                    </div>
                  )}
                </div>
                <div className="flex w-full items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-bone/80 transition-colors group-hover:text-bone">
                      {item.title}{' '}
                      <FontAwesomeIcon icon={faChevronRight} className="shrink-0 text-[9px] text-ash/80 transition-all group-hover:text-ash/60 group-hover:translate-x-0.5" />
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium text-ash/40">{item.date}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="p-3">
            <div
              className="overflow-hidden rounded-2xl border font-[Manrope]"
              style={{ borderColor: theme.border, backgroundColor: `${theme.surface}60` }}
            >
              <p className="px-3 py-2.5 text-[11px] leading-relaxed text-ash/50">
                Follow development, report bugs, and stay up to date with everything STAY. <br />
                <hr className="my-1.5 border-ash/20" />
                <a
                  href="https://store.steampowered.com/app/4956550"
                  className="underline font-semibold text-[10px]"
                  style={{ color: accent.hex }}
                >
                  Click here to join the Steam community hub{' '}
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1 text-[9px]" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-around border-t px-3 py-3" style={{ borderColor: theme.border }}>
          {[
            { icon: faDiscord,     href: '#', color: '#5865F2', label: 'Discord'   },
            { icon: faXTwitter,    href: '#', color: '#e7e7e7', label: 'X'         },
            { icon: faYoutube,     href: '#', color: '#FF0000', label: 'YouTube'   },
            { icon: faInstagram,   href: '#', color: '#FF4500', label: 'Instagram' },
            { icon: faRedditAlien, href: '#', color: '#FF4500', label: 'Reddit'    },
            { image: Logo, href: 'https://zyphorstudios.com', label: 'Website', type: 'image' },
          ].map(({ icon, image, href, color, label, type }) => (
            <a
              key={label}
              href={href}
              title={label}
              className="group flex flex-col items-center gap-1"
              onMouseEnter={(e) => {
                const svg  = e.currentTarget.querySelector('svg');
                const span = e.currentTarget.querySelector('span');
                if (svg)  svg.style.color  = color;
                if (span) span.style.color = color;
              }}
              onMouseLeave={(e) => {
                const svg  = e.currentTarget.querySelector('svg');
                const span = e.currentTarget.querySelector('span');
                if (svg)  svg.style.color  = '';
                if (span) span.style.color = '';
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl transition-colors hover:bg-white/[0.06]">
                {type === 'image' ? (
                  <img src={image} alt={label} className="h-[28px] w-[28px] object-contain opacity-20 transition-opacity group-hover:opacity-100" />
                ) : (
                  <FontAwesomeIcon icon={icon} className="text-[22px] text-ash/40 transition-colors" />
                )}
              </div>
            </a>
          ))}
        </div>
      </motion.aside>
    </div>
  );
}

function SteamLinkModal({ visible, uid, accent, theme, onClose }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-center justify-center "
          style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.72)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex flex-col overflow-hidden rounded-[2.5rem] border shadow-2xl p-8 gap-5"
            style={{ width: 560, backgroundColor: `${theme.surface}f0`, borderColor: theme.border }}
          >
            {/* Steam icon */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#1b2838' }}
            >
              <i
                className="fa-brands fa-steam"
                style={{ fontSize: 43, color: '#c7d5e0' }}
              ></i>
            </div>

            <div>
              <h2 className="text-2xl font-medium text-bone">Link your Steam account</h2>
              <p className="mt-2 text-sm text-ash/60 leading-relaxed font-[Manrope]">
                To verify your copy of STAY and unlock the launcher, you need to connect your Steam account. This only takes a moment.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  window.launcherAPI?.openExternal(`https://zyphorstudios.com/steam-activate?uid=${uid}`);
                  onClose();
                }}
                className="flex-1 rounded-2xl py-4 text-[13px] font-semibold font-[Manrope] transition hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#1b2838', color: '#c7d5e0', border: '1px solid #4c6b8a' }}
              >
                Connect Steam
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-3 text-sm underline font-[Manrope] font-medium transition hover:bg-white/5"
                style={{ color: `${theme.text}60` }}
              >
                Later
              </button>
            </div>

            <div
              className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full blur-3xl opacity-15"
              style={{ backgroundColor: accent.hex }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LaunchModal({ visible, gameName, onCancel, accent, theme }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.72)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex overflow-hidden rounded-[2rem] border shadow-2xl"
            style={{ width: 680, backgroundColor: `${theme.surface}f0`, borderColor: theme.border }}
          >
            <div className="overflow-hidden" style={{ width: 220, aspectRatio: '2 / 3' }}>
              <img
                src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/cf73f970e8df35997b1dd12bcb5e0c6e9cc78255/library_capsule.jpg?t=1784562601"
                alt={gameName}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <h2 className="text-2xl font-medium text-bone mt-3">{gameName}</h2>
                <p className="mt-1 text-base text-ash/60">Preparing to launch via Steam…</p>
                <div className="mt-6 flex items-center gap-3 font-[Manrope] text-xs text-ash/70">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v8z" fill="currentColor" className="opacity-75" />
                  </svg>
                  <span>Handing off to Steam…</span>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="self-end rounded-xl font-[Manrope] px-5 py-3 text-xs font-semibold text-ash/60 transition hover:bg-white/5 hover:text-bone"
              >
                Cancel Launch
              </button>
            </div>
            <div
              className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: accent.hex }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UpdateModal({ visible, info, dlState, progress, accent, theme, onClose, onDownload, onInstall }) {
  const highlights = Array.isArray(info?.highlights) && info.highlights.length ? info.highlights : null;

  const notesText = !info?.releaseNotes
    ? ''
    : typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : info.releaseNotes?.map?.((n) => (typeof n === 'string' ? n : n?.note)).filter(Boolean).join('\n') ?? '';

  const fileSizeMb = info?.files?.[0]?.size != null
    ? (info.files[0].size / (1024 * 1024)).toFixed(1)
    : null;

  const statusLabel =
    dlState === 'downloaded'  ? 'Ready to install'
    : dlState === 'downloading' ? 'Downloading'
    : 'Update Available';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="update-fs-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget && dlState !== 'downloading') onClose(); }}
        >
          <motion.div
            key="update-fs-card"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative z-10 flex w-full max-w-[560px] max-h-[min(90vh,780px)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-5" style={{ borderBottom: `0.5px solid ${theme.border}` }}>
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent.hex}18` }}>
                  <FontAwesomeIcon
                    icon={dlState === 'downloaded' ? faCircleCheck : faCircleArrowUp}
                    style={{ color: accent.hex, fontSize: 18 }}
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: accent.hex }}>
                    {statusLabel}
                  </p>
                  <h2 className="text-[18px] font-semibold leading-tight truncate" style={{ color: theme.text }}>
                    Zyphor Launcher{info?.version ? ` v${info.version}` : ''}
                  </h2>
                  {info?.tagline ? (
                    <p className="text-[13px] mt-0.5 truncate" style={{ color: `${theme.text}60` }}>{info.tagline}</p>
                  ) : (
                    <p className="text-[13px] mt-0.5" style={{ color: `${theme.text}55` }}>A newer build is ready for your launcher.</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={dlState === 'downloading'}
                className="rounded-lg p-1.5 transition hover:bg-white/8 disabled:opacity-30"
                style={{ color: `${theme.text}55` }}
              >
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
              </button>
            </div>

            {(info?.version || fileSizeMb) && (
              <div className="flex items-center gap-2 px-6 py-3.5" style={{ borderBottom: `0.5px solid ${theme.border}` }}>
                {info?.currentVersion && (
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-mono" style={{ backgroundColor: `${theme.text}0e`, color: `${theme.text}55` }}>
                    v{info.currentVersion}
                  </span>
                )}
                {info?.currentVersion && info?.version && (
                  <span className="text-[11px]" style={{ color: `${theme.text}30` }}>→</span>
                )}
                {info?.version && (
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold" style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}>
                    v{info.version}
                  </span>
                )}
                {fileSizeMb && (
                  <span className="text-[11px] ml-1" style={{ color: `${theme.text}40` }}>{fileSizeMb} MB</span>
                )}
              </div>
            )}

            <div className="relative min-h-0 flex-1 overflow-y-auto p-6">
              {highlights && dlState === 'idle' && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: `${theme.text}40` }}>What's new</p>
                  <ul className="flex flex-col gap-2.5">
                    {highlights.slice(0, 5).map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: `${theme.text}80` }}>
                        <span className="mt-[3px] shrink-0 text-[10px]" style={{ color: `${theme.text}30` }}>—</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {notesText && !highlights && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: `${theme.text}40` }}>What's new</p>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto" style={{ color: `${theme.text}70` }}>
                    {notesText}
                  </p>
                </div>
              )}

              {dlState === 'downloading' && (
                <div className="mb-5">
                  <div className="flex justify-between text-[12px] mb-2" style={{ color: `${theme.text}55` }}>
                    <span>Downloading update…</span>
                    <span className="font-mono font-semibold" style={{ color: accent.hex }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.text}12` }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: accent.hex }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'linear', duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {dlState === 'downloaded' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[13px]"
                  style={{ backgroundColor: `${accent.hex}12`, border: `0.5px solid ${accent.hex}33`, color: accent.hex }}
                >
                  <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 14, flexShrink: 0 }} />
                  Download complete — ready to install.
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: `0.5px solid ${theme.border}` }}>
              <button
                type="button"
                onClick={onClose}
                disabled={dlState === 'downloading'}
                className="rounded-xl px-4 py-2 text-[13px] font-medium transition hover:bg-white/6 disabled:opacity-30"
                style={{ color: `${theme.text}60` }}
              >
                {dlState === 'idle' ? 'Remind me later' : 'Close'}
              </button>
              {dlState === 'idle' && (
                <button type="button" onClick={onDownload} className="rounded-xl px-5 py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: accent.hex, color: accent.on }}>
                  Download update
                </button>
              )}
              {dlState === 'downloading' && (
                <button type="button" disabled className="rounded-xl px-5 py-2 text-[13px] font-semibold opacity-45 cursor-not-allowed" style={{ backgroundColor: accent.hex, color: accent.on }}>
                  Downloading… {Math.round(progress)}%
                </button>
              )}
              {dlState === 'downloaded' && (
                <button type="button" onClick={onInstall} className="rounded-xl px-5 py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: accent.hex, color: accent.on }}>
                  Restart &amp; install
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusChip({ icon, label, tone, onClick }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 text-[11px] font-[Manrope] ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      style={{ color: tone }}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} className={`text-[12px] ${tone ? '' : 'text-ash/70'}`} />
      <span className={tone ? '' : 'text-ash/70'}>{label}</span>
    </div>
  );
}

function Divider({ theme }) {
  return <span className="h-3.5 w-px" style={{ backgroundColor: theme.border }} />;
}

function BannerVideo({ src, poster, active, fadeMask }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    function handleVisibilityChange() {
      if (document.hidden) el.pause();
      else el.play().catch(() => {});
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay muted loop playsInline
      className="h-full w-full object-cover"
      style={fadeMask}
    />
  );
}
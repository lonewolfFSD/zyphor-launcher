import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import Logo from '../../build-resources/logo.png';
import VIDEO_ROSSI from './videos/rossi.mp4';

import ROSSI_FRAME from './videos/frames/rossi frame.png';
import KALTSIT_FRAME from './videos/frames/kaltsit frame.png';
import XUANWU_FRAME from './videos/frames/xuanwu frame.png';
import FIREFLY_FRAME from './videos/frames/firefly frame.png';
import LUCY_FRAME from './videos/frames/lucy frame.png';

// ── Preset background videos ──────────────────────────────────────────────────
// Drop your video files in the same ./videos/ folder and update the paths here.
// import VIDEO_AURORA    from '';
import VIDEO_GAMING    from './videos/gaming.mp4';
import VIDEO_DRAGON_TRAVELLER from './videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY from './videos/Lucy Cyberpunk.mp4';
import VIDEO_KALTSIT from './videos/Kaltsit.mp4';

const PRESET_VIDEO_MAP = {
  // 'preset-aurora':    VIDEO_AURORA,
  'preset-gaming':    VIDEO_GAMING,
  'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
  'preset-lucy':      VIDEO_LUCY,
  'preset-kaltsit':   VIDEO_KALTSIT,
  'preset-rossi': VIDEO_ROSSI,
};

const PRESET_STATIC_MAP = {
  'preset-gaming':           new URL(FIREFLY_FRAME,           import.meta.url).href,
  'preset-dragon-traveller': new URL(XUANWU_FRAME, import.meta.url).href,
  'preset-lucy':             new URL(LUCY_FRAME,   import.meta.url).href,
  'preset-kaltsit':          new URL(KALTSIT_FRAME,          import.meta.url).href,
  'preset-rossi':            new URL(ROSSI_FRAME,            import.meta.url).href,
};

// ── Status check endpoints ─────────────────────────────────────────────────────
// Set these in your .env (VITE_SERVER_STATUS_URL, VITE_VERSION_MANIFEST_URL,
// VITE_APP_VERSION). The component tries window.launcherAPI IPC first; if it isn't
// wired up yet, falls back to a direct HTTP fetch against these URLs.
const SERVER_STATUS_URL   = import.meta.env.VITE_SERVER_STATUS_URL   ?? null;
const VERSION_MANIFEST_URL = import.meta.env.VITE_VERSION_MANIFEST_URL ?? null;
const CURRENT_VERSION     = import.meta.env.VITE_APP_VERSION          ?? '0.0.0';

// ── Game identity ──────────────────────────────────────────────────────────────
const STAY_STEAM_APP_ID  = '4956550';
const STAY_STEAM_STORE_URL = `https://store.steampowered.com/app/${STAY_STEAM_APP_ID}`;
const STAY_POSTER_URL    = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${STAY_STEAM_APP_ID}/5987fca53a2c7e7bc87bc460bbe59b761dc02251/capsule_616x353.jpg?t=1784562601`;
const STAY_GAME_NAME     = 'STAY: Possession • Obsession • Permanence';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const placeholderNews = [
      
];

export default function HomePage({ profile }) {
  const { settings } = useSettings();
  const theme = THEMES[settings?.theme] || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  // Same logic as NavRail — true only when Steam ownership is verified
  const hasGame = Boolean(profile?.hasGame || profile?.steamOwnsGame);

  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundQuality = settings?.backgroundQuality ?? 'hd';
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
  // SD: render video at lower resolution via CSS (scale down then up)
  const bgVideoStyle = backgroundQuality === 'sd'
    ? { filter: 'blur(0px)', imageRendering: 'auto', transform: 'scale(1.05)', opacity: 1 }
    : {};
  // Static fallback poster (first frame shown as bg image when quality=static)
  const bgStaticPoster = backgroundQuality === 'static'
  ? (PRESET_STATIC_MAP[backgroundVideoType] ?? null)
  : null;

  const [launchState, setLaunchState] = useState('idle'); // 'idle' | 'launching' | 'running'
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [news, setNews] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [serverStatus, setServerStatus] = useState('checking');
  const [updateStatus, setUpdateStatus] = useState('checking');
  const [playtime, setPlaytime] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDlState, setUpdateDlState] = useState('idle');

  const fadeMask = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
  opacity: 1,
};


 useEffect(() => { (async () => {
  // News
  try {
    const q = query(collection(db, 'news'), orderBy('date', 'desc'), limit(5));
    const snap = await getDocs(q);
    setNews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch {
    setNews([]);
  }

  // Playtime
  window.launcherAPI?.getPlaytime?.().then((p) => setPlaytime(p ?? null)).catch(() => {});

  // Server status
  try {
    const snap = await getDoc(doc(db, 'meta', 'status'));
    setServerStatus(snap.exists() ? 'online' : 'offline');
  } catch {
    setServerStatus('offline');
  }

  // Update check
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
})(); }, []);

  // Wire electron-updater events
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

  function handlePurchase() {
    if (window.launcherAPI?.openExternal) {
      window.launcherAPI.openExternal(STAY_STEAM_STORE_URL);
    } else {
      window.open(STAY_STEAM_STORE_URL, '_blank', 'noopener,noreferrer');
    }
  }

  // Poll interval ref — cleared when game closes or component unmounts
  const pollRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  function startGamePolling() {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        // window.launcherAPI.isGameRunning() should return true/false
        // Falls back to checking via steam://  — if not available, poll stops after 30s
        const running = await window.launcherAPI?.isGameRunning?.();
        if (running === false) {
          clearInterval(pollRef.current);
          setLaunchState('idle');
        }
      } catch {
        // If IPC isn't wired, silently ignore — button stays as Stop
      }
    }, 3000); // check every 3 seconds
  }

  async function handlePlay() {
    setLaunchState('launching');
    setShowLaunchModal(true);

    try {
      if (window.launcherAPI?.openExternal) {
        await window.launcherAPI.openExternal(`steam://run/${STAY_STEAM_APP_ID}`);
      } else {
        window.location.href = `steam://run/${STAY_STEAM_APP_ID}`;
      }
      // Give Steam ~3s to start, then flip to running, begin polling,
      // and minimize the launcher to tray so it gets out of the way.
      setTimeout(() => {
        setLaunchState('running');
        setShowLaunchModal(false);
        startGamePolling();
        // Minimize to tray AND keep the taskbar button visible.
        // minimizeToTray  → tells main process to show the tray icon (window.hide() equivalent)
        // minimize        → also calls window.minimize() so the taskbar entry stays present
        // Both are called together so the launcher disappears from screen but remains
        // accessible from both the system tray and the taskbar.
        if (window.launcherAPI?.minimizeToTray) window.launcherAPI.minimizeToTray();
        if (window.launcherAPI?.minimize) window.launcherAPI.minimize();
      }, 3000);
    } catch {
      setLaunchState('idle');
      setShowLaunchModal(false);
    }
  }

  async function handleStop() {
    clearInterval(pollRef.current);
    try {
      // Try IPC kill first, then fallback to steam://exit
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

  return (
    <div className="relative flex h-full gap-4 font-['Manrope']" style={{ color: 'inherit' }}>
      <BackgroundVideo key={backgroundVideoSrc + backgroundQuality} src={backgroundVideoSrc} active={motionOn} quality={backgroundQuality} videoStyle={bgVideoStyle} staticPoster={bgStaticPoster} />
      <AnimatedGrid accent={accent} theme={theme} active={motionOn} />

      {/* ── Update modal ── */}
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

      {/* ── Launch modal ── */}
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

      {/* ── LEFT / CENTER ── */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-4 px-8 overflow-y-auto">
        {/* Status strip: version / update / server — the stuff a launcher actually needs up top */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35 }}
          className="flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-4 backdrop-blur-lg"
          style={{ borderColor: theme.border, backgroundColor: `${theme.surface}99` }}
        >
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
          className="relative h-72 shrink-0 overflow-hidden rounded-[2.5em] border backdrop-blur-md"
          style={{ borderColor: theme.border }}
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
                <BannerVideo
                  src={banner.video}
                  poster={banner.image}
                  active={motionOn}
                  fadeMask={fadeMask}
                />
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
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 py-10 px-12">

            <h2 className="mt-1 font-['Manrope'] text-[1.8em] font-bold tracking-tight text-bone">
              {banner?.title ?? 'No Updates Available'}
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
            backgroundColor:
              i === bannerIndex
                ? accent.hex
                : "rgba(255,255,255,0.3)",
          }}
        />
      ))}
    </div>
  )}
        </motion.div>
        <hr className="mt-4 border-ash/20" />

        <h3 className='text-xl font-bold mt-4 font-["Manrope"]'>STAY: Possession • Obsession • Permanence <span className="text-ash/40 px-2">|</span> <span className="text-base font-extrabold" style={{ color: accent.hex }}>SERIES</span></h3>

        {/* Games */}
        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.4 }}>
          <div className="flex flex-wrap gap-3">
            {/* STAY card — poster + play or purchase on hover */}
<div
  className="group relative overflow-hidden rounded-3xl border-2  transition-colors duration-200"
  style={{
width: 308,
height: 177,
    borderColor: "rgba(255,255,255,0.1)",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = accent.hex;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
  }}
>
              {/* Poster image — Steam portrait capsule ratio (600×900) */}
              <img
                src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/5987fca53a2c7e7bc87bc460bbe59b761dc02251/capsule_616x353.jpg?t=1784562601"
                alt="STAY"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  // fallback gradient if image 404s (placeholder App ID)
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback gradient shown behind image */}
              <div
                className="absolute inset-0 -z-10"
                style={{ background: 'linear-gradient(160deg, #1a1510 0%, #0a0908 100%)' }}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/60" />

              {/* Action button — hidden until hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                {hasGame ? (
                  /* ── OWNED: Play / Stop button ── */
                  <button
                    type="button"
                    onClick={handlePlayToggle}
                    disabled={launchState === 'launching' || launchState === 'error'}
                    className="flex h-[70px] w-[70px] items-center justify-center rounded-3xl shadow-lg transition-transform duration-200 scale-90 group-hover:scale-100 disabled:cursor-wait bg-transparent backdrop-blur-sm"
                    style={{ border: `3px solid ${accent.hex}88`, backgroundColor: `${accent.hex}22` }}
                  >
                    {launchState === 'launching' ? (
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : launchState === 'running' ? (
                      <img src={SquareButton} className="w-8" style={{ color: '#fff' }} />
                    ) : (
                      <img src={PlayButton} className="w-8 translate-x-0.5" style={{ color: '#fff' }} />
                    )}
                  </button>
                ) : (
                  /* ── NOT OWNED: Purchase on Steam ── */
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

                {/* Game title label */}
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {hasGame ? '' : 'Not owned'}
                </span>
              </div>
            </div>

            {/* Coming-soon slot */}
            <div
              className="flex h-[177px] w-[308px] flex-col items-center justify-center rounded-3xl border border-dashed backdrop-blur-glass text-ash/40 transition-colors hover:text-ash/60"
              style={{ backgroundColor: `${theme.surface}90`, border: `2px dashed ${accent.hex}95` }}
            >
              <p className="text-sm font-['Manrope'] text-ash/40">More titles coming soon</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT: News sidebar ── */}
      <motion.aside
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.12, duration: 0.4 }}
  className="relative flex w-80 shrink-0 flex-col overflow-hidden rounded-[1.8em] border  backdrop-blur-lg"
  style={{ borderColor: theme.border, backgroundColor: `${theme.surface}99` }}
>
  {/* Header */}
  <div className="flex shrink-0 items-center gap-2.5 border-b px-6 py-3.5" style={{ borderColor: theme.border }}>
    <FontAwesomeIcon icon={faNewspaper} className="text-[20px] hidden" style={{ color: accent.hex }} />
    <h2 className="font-['Manrope'] text-[15.5px] mt-0.5 font-bold tracking-tight text-bone">What's New?</h2>
    <span
      className="ml-auto rounded-lg px-2 py-1 text-[10px] font-bold"
      style={{ backgroundColor: `${accent.hex}22`, color: `#${accent.hex}99`, border: `2px solid ${accent.hex}66` }}
    >
      {banners.length}
    </span>
  </div>

  {/* News list */}
  <div className="flex-1 overflow-y-auto">
    <div className="flex flex-col">
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
              {item.title} <FontAwesomeIcon
            icon={faChevronRight}
            className="shrink-0 text-[9px] text-ash/80 transition-all group-hover:text-ash/60 group-hover:translate-x-0.5"
          />
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-ash/40">{item.date}</p>
          </div>

          
          </div>
        </a>
      ))}
    </div>

    {/* Promo card */}
    <div className="p-3">
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: theme.border, backgroundColor: `${theme.surface}60` }}
      >
        <div className="relative h-ful overflow-hidden">
          
        </div>
        <p className="px-3 py-2.5 text-[11px] leading-relaxed text-ash/50">
          Follow development, report bugs, and stay up to date with everything STAY. <br />
          <hr className="my-1.5 border-ash/20" />
          <a
            href="https://store.steampowered.com/app/4956550"
            className="underline font-semibold text-[10px]"
            style={{ color: accent.hex }}
          >
            Click here to join the Steam community hub <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1 text-[9px]" />
          </a>
        </p>
        
      </div>
    </div>
  </div>

  {/* Socials bar */}
  <div
  className="flex shrink-0 items-center justify-around border-t px-3 py-3"
  style={{ borderColor: theme.border }}
>
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
        const svg = e.currentTarget.querySelector('svg');
        const span = e.currentTarget.querySelector('span');
        if (svg) svg.style.color = color;
        if (span) span.style.color = color;
      }}
      onMouseLeave={(e) => {
        const svg = e.currentTarget.querySelector('svg');
        const span = e.currentTarget.querySelector('span');
        if (svg) svg.style.color = '';
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
            {/* Left — portrait capsule */}
            <div className="overflow-hidden" style={{ width: 220, aspectRatio: '2 / 3' }}>
              <img
                src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4956550/cf73f970e8df35997b1dd12bcb5e0c6e9cc78255/library_capsule.jpg?t=1784562601"
                alt={gameName}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Right */}
            <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <h2 className="text-xl font-bold text-bone">{gameName}</h2>
                <p className="mt-1 text-sm text-ash/60">Preparing to launch via Steam…</p>

                {/* Clean spinner — no error state here */}
                <div className="mt-6 flex items-center gap-3 text-sm text-ash/70">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v8z" fill="currentColor" className="opacity-75" />
                  </svg>
                  <span>Handing off to Steam…</span>
                </div>
              </div>

              <button
                onClick={onCancel}
                className="self-end rounded-xl px-5 py-2 text-sm font-semibold text-ash/60 transition hover:bg-white/5 hover:text-bone"
              >
                <FontAwesomeIcon icon={faXmark} className="mr-2" />
                Cancel
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
  const hero = info?.banner || info?.image || info?.hero || null;

  const highlights = Array.isArray(info?.highlights) && info.highlights.length
    ? info.highlights
    : null;

  const notesText = !info?.releaseNotes
    ? ''
    : typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : info.releaseNotes?.map?.((n) => (typeof n === 'string' ? n : n?.note)).filter(Boolean).join('\n') ?? '';

  const fileSizeMb = info?.files?.[0]?.size != null
    ? (info.files[0].size / (1024 * 1024)).toFixed(1)
    : null;

  const statusLabel =
    dlState === 'downloaded' ? 'Ready to install'
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
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(0,0,0,0.75)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && dlState !== 'downloading') onClose();
      }}
    >
      <motion.div
        key="update-fs-card"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative z-10 flex w-full max-w-[560px] max-h-[min(90vh,780px)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 p-6 pb-5"
          style={{ borderBottom: `0.5px solid ${theme.border}` }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent.hex}18` }}
            >
              <FontAwesomeIcon
                icon={dlState === 'downloaded' ? faCircleCheck : faCircleArrowUp}
                style={{ color: accent.hex, fontSize: 18 }}
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1"
                style={{ color: accent.hex }}
              >
                {statusLabel}
              </p>
              <h2
                className="text-[18px] font-semibold leading-tight truncate"
                style={{ color: theme.text }}
              >
                Zyphor Launcher{info?.version ? ` v${info.version}` : ''}
              </h2>
              {info?.tagline ? (
                <p className="text-[13px] mt-0.5 truncate" style={{ color: `${theme.text}60` }}>
                  {info.tagline}
                </p>
              ) : (
                <p className="text-[13px] mt-0.5" style={{ color: `${theme.text}55` }}>
                  A newer build is ready for your launcher.
                </p>
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

        {/* Version chips + file size */}
        {(info?.version || fileSizeMb) && (
          <div
            className="flex items-center gap-2 px-6 py-3.5"
            style={{ borderBottom: `0.5px solid ${theme.border}` }}
          >
            {info?.currentVersion && (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-mono"
                style={{ backgroundColor: `${theme.text}0e`, color: `${theme.text}55` }}
              >
                v{info.currentVersion}
              </span>
            )}
            {info?.currentVersion && info?.version && (
              <span className="text-[11px]" style={{ color: `${theme.text}30` }}>→</span>
            )}
            {info?.version && (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold"
                style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
              >
                v{info.version}
              </span>
            )}
            {fileSizeMb && (
              <span className="text-[11px] ml-1" style={{ color: `${theme.text}40` }}>
                {fileSizeMb} MB
              </span>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="relative min-h-0 flex-1 overflow-y-auto p-6">

          {/* Highlights */}
          {highlights && dlState === 'idle' && (
            <div className="mb-5">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3"
                style={{ color: `${theme.text}40` }}
              >
                What's new
              </p>
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

          {/* Notes fallback */}
          {notesText && !highlights && (
            <div className="mb-5">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3"
                style={{ color: `${theme.text}40` }}
              >
                What's new
              </p>
              <p
                className="text-[13px] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto"
                style={{ color: `${theme.text}70` }}
              >
                {notesText}
              </p>
            </div>
          )}

          {/* Download progress */}
          {dlState === 'downloading' && (
            <div className="mb-5">
              <div className="flex justify-between text-[12px] mb-2" style={{ color: `${theme.text}55` }}>
                <span>Downloading update…</span>
                <span className="font-mono font-semibold" style={{ color: accent.hex }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div
                className="h-[3px] w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${theme.text}12` }}
              >
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

          {/* Downloaded banner */}
          {dlState === 'downloaded' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[13px]"
              style={{
                backgroundColor: `${accent.hex}12`,
                border: `0.5px solid ${accent.hex}33`,
                color: accent.hex,
              }}
            >
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 14, flexShrink: 0 }} />
              Download complete — ready to install.
            </motion.div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: `0.5px solid ${theme.border}` }}
        >
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
            <button
              type="button"
              onClick={onDownload}
              className="rounded-xl px-5 py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: accent.hex, color: accent.on }}
            >
              Download update
            </button>
          )}

          {dlState === 'downloading' && (
            <button
              type="button"
              disabled
              className="rounded-xl px-5 py-2 text-[13px] font-semibold opacity-45 cursor-not-allowed"
              style={{ backgroundColor: accent.hex, color: accent.on }}
            >
              Downloading… {Math.round(progress)}%
            </button>
          )}

          {dlState === 'downloaded' && (
            <button
              type="button"
              onClick={onInstall}
              className="rounded-xl px-5 py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: accent.hex, color: accent.on }}
            >
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
      className={`flex items-center gap-1.5 px-1.5 text-[12px] font-medium ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
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


/**
 * Inline video used inside the rotating news banner.
 * Respects the Page Visibility API — pauses when the tab is hidden.
 */
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
      autoPlay
      muted
      loop
      playsInline
      className="h-full w-full object-cover"
      style={fadeMask}
    />
  );
}

/**
 * Full-page ambient video background, sitting behind the grid and all
 * content at low opacity. Logs load/error state so a bad path is obvious
 * in the console instead of just silently showing nothing.
 *
 * Automatically pauses when the tab/window is hidden (Page Visibility API)
 * and resumes when it becomes visible again — saves GPU/CPU while the user
 * is on a different tab or the launcher is in the background.
 */
function BackgroundVideo({ src, active, quality = 'hd', videoStyle = {}, staticPoster = null }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || quality === 'static') return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active, quality]);

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
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-1"
      style={videoStyle}
    />
  );
}

function AnimatedGrid({ accent, active }) {
  const size = 42;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
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
import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { Image, AlertTriangle, ChevronDown, X, ZoomIn, Download } from 'lucide-react';

// ─── Video imports (same ambient background as other pages) ───────────────────
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import VIDEO_GAMING             from './videos/gaming.mp4';
import VIDEO_DRAGON_TRAVELLER   from './videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY               from './videos/Lucy Cyberpunk.mp4';
import VIDEO_FOREST             from './videos/Forest Cafe.mp4';
import VIDEO_KALTSIT            from './videos/Kaltsit.mp4';

const PRESET_VIDEO_MAP = {
  'preset-gaming':           VIDEO_GAMING,
  'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
  'preset-lucy':             VIDEO_LUCY,
  'preset-forest':           VIDEO_FOREST,
  'preset-kaltsit':          VIDEO_KALTSIT,
};

// ─── Game registry ────────────────────────────────────────────────────────────
// Folder key maps to ./screenshots/<folderKey>/*  (png/jpg/webp/jpeg)
// Drop image files into src/pages/screenshots/stay/  (or whatever folderKey you set)
const GAMES = [
  {
    id:        'stay',
    folderKey: 'stay',
    appId:     '4956550',
    name:      'STAY: Possession • Obsession • Permanence',
    fullName:  'STAY: Possession • Obsession • Permanence',
    url: 'https://avatars.fastly.steamstatic.com/b696b00d13eaa6ddef314f3c85162c7bb72a5f7a_full.jpg',
    developer: 'Zyphor Studios',
    status:    'released',
  },
  // ── Add future games ──────────────────────────────────────────────────────
  // {
  //   id: 'game2',
  //   folderKey: 'game2',
  //   appId: '0000000',
  //   name: 'Game 2',
  //   fullName: 'Game 2: Subtitle',
  //   developer: 'Zyphor Studios',
  //   status: 'coming_soon',
  // },
];

// Eager-load all screenshot images under ./screenshots/<game>/*
// Vite resolves these at build time. Place files in:
//   src/pages/screenshots/stay/*.png|jpg|webp
const ALL_SCREENSHOT_MODULES = import.meta.glob(
  './screenshots/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  { eager: true, import: 'default' }
);

/** Build { folderKey: [{ src, name }] } from the glob map */
function buildScreenshotIndex() {
  const index = {};
  for (const [path, mod] of Object.entries(ALL_SCREENSHOT_MODULES)) {
    // path like "./screenshots/stay/shot1.png"
    const parts = path.replace(/^\.\//, '').split('/');
    // ["screenshots", "stay", "shot1.png"]
    if (parts.length < 3 || parts[0] !== 'screenshots') continue;
    const folderKey = parts[1];
    const fileName  = parts.slice(2).join('/');
    const src = typeof mod === 'string' ? mod : mod?.default ?? mod;
    if (!src) continue;
    if (!index[folderKey]) index[folderKey] = [];
    index[folderKey].push({
      src,
      name: fileName.replace(/\.[^.]+$/, ''),
      fileName,
    });
  }
  // Stable sort by filename
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => a.fileName.localeCompare(b.fileName));
  }
  return index;
}

const SCREENSHOT_INDEX = buildScreenshotIndex();

// ─── Game selector (same pattern as Achievements) ─────────────────────────────
function GameSelector({ games, selected, onSelect, accent, theme }) {
  const [open, setOpen] = useState(false);
  const current = games.find((g) => g.id === selected) ?? games[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-2xl px-4 py-2.5 transition hover:opacity-80"
        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black/40">
          {current.status === 'released' ? (
            <img src={current.url} alt={current.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image size={14} style={{ color: `${accent.hex}44` }} />
            </div>
          )}
        </div>
        <div className="text-left">
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
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full mt-1.5 left-0 z-50 min-w-[220px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
          >
            {games.map((game) => {
              const isActive = game.id === selected;
              return (
                <button
                  key={game.id}
                  onClick={() => { onSelect(game.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                  style={{ backgroundColor: isActive ? `${accent.hex}14` : 'transparent' }}
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-black/40">
                    {game.status === 'released' ? (
                      <img src={game.url} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${accent.hex}10` }}
                      >
                        <Image size={14} style={{ color: `${accent.hex}44` }} />
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

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ shot, onClose, onPrev, onNext, hasPrev, hasNext, accent, theme }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/10"
        style={{ color: theme.text }}
      >
        <X size={20} />
      </button>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/10"
          style={{ color: theme.text }}
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/10"
          style={{ color: theme.text }}
        >
          ›
        </button>
      )}

      <motion.img
        key={shot.src}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        src={shot.src}
        alt={shot.name}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl px-4 py-2"
        style={{ backgroundColor: `${theme.surface}ee`, border: `1px solid ${theme.border}` }}
      >
        <span className="text-[12px] font-medium" style={{ color: theme.text }}>{shot.name}</span>
        <a
          href={shot.src}
          download={shot.fileName}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[11px] font-semibold transition hover:opacity-80"
          style={{ color: accent.hex }}
        >
          <Download size={12} /> Save
        </a>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ScreenshotsPage() {
  const { settings } = useSettings();
  const theme    = THEMES[settings?.theme]   || THEMES.oled;
  const accent   = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundVideoSrc =
    backgroundVideoType === 'none' ? null
    : backgroundVideoType === 'custom'
      ? settings?.backgroundVideoPath ? `file://${settings.backgroundVideoPath}` : null
      : backgroundVideoType?.startsWith('preset-')
        ? PRESET_VIDEO_MAP[backgroundVideoType] ?? DEFAULT_BACKGROUND_VIDEO
        : DEFAULT_BACKGROUND_VIDEO;

  const videoRef = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (motionOn) el.play().catch(() => {});
    else el.pause();
  }, [motionOn, backgroundVideoSrc]);

  const [selectedGameId, setSelectedGameId] = useState(GAMES[0].id);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const game = GAMES.find((g) => g.id === selectedGameId) ?? GAMES[0];
  const shots = useMemo(
    () => SCREENSHOT_INDEX[game.folderKey] ?? [],
    [game.folderKey]
  );

  return (
    <div className="relative h-full overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background video */}
      {backgroundVideoSrc && (
        <video
          ref={videoRef}
          src={backgroundVideoSrc}
          autoPlay muted loop playsInline
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.8]"
        />
      )}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(to bottom, ${theme.bg}cc 0%, ${theme.bg}88 40%, ${theme.bg}cc 100%)`,
        }}
      />

      <div className="px-9 py-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
          <div>
            <h2
              className="font-['Manrope'] text-3xl font-bold tracking-tight"
              style={{ color: theme.text }}
            >
              Screenshots
            </h2>
            <p className="mt-1 text-sm opacity-40">
              Official captures from Zyphor Studio titles.
            </p>
          </div>

          <GameSelector
            games={GAMES}
            selected={selectedGameId}
            onSelect={setSelectedGameId}
            accent={accent}
            theme={theme}
          />
        </div>

        {/* Coming soon */}
        {game.status === 'coming_soon' && (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-2xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
          >
            <Image size={32} className="mb-4" style={{ color: `${accent.hex}44` }} />
            <p className="text-[15px] font-semibold" style={{ color: theme.text }}>{game.fullName}</p>
            <p className="text-[12px] opacity-40 mt-1">Screenshots will appear here after launch.</p>
          </div>
        )}

        {/* Released */}
        {game.status === 'released' && (
          <>
            {/* Count bar */}
            <div
              className="flex items-center justify-between rounded-3xl px-8 py-4 mb-5 border"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
                  {game.fullName}
                </p>
                <p className="text-[14px] font-semibold mt-1" style={{ color: theme.text }}>
                  {shots.length} screenshot{shots.length === 1 ? '' : 's'}
                </p>
              </div>
              <span
                className="text-[11px] font-mono opacity-30"
                title="Loaded from folder"
              >
                screenshots/{game.folderKey}/
              </span>
            </div>

            {/* Empty */}
            {shots.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-20 rounded-[2.5rem] border opacity-80 gap-1"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
              >
                <AlertTriangle size={40} className="mb-3 opacity-20" />
                <p className="text-[15px] font-semibold" style={{ color: theme.text }}>
                  No screenshots found
                </p>
                <p className="text-[13px] opacity-40 mt-1.5 text-center max-w-sm">
                  Press <code
                    className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                    style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                  >
                    F2
                  </code>{' '}
                  while in-game to capture screenshots. They'll appear here automatically.
                </p>
              </div>
            )}

            {/* Grid */}
            {shots.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {shots.map((shot, i) => (
                  <motion.button
                    key={shot.src}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => setLightboxIndex(i)}
                    className="group relative aspect-video overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${accent.hex}66`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.border;
                    }}
                  >
                    <img
                      src={shot.src}
                      alt={shot.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-[11px] font-medium text-white/90 truncate max-w-[70%]">
                        {shot.name}
                      </span>
                      <ZoomIn size={14} className="text-white/70 shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex != null && shots[lightboxIndex] && (
          <Lightbox
            shot={shots[lightboxIndex]}
            accent={accent}
            theme={theme}
            hasPrev={lightboxIndex > 0}
            hasNext={lightboxIndex < shots.length - 1}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
            onNext={() => setLightboxIndex((i) => Math.min(shots.length - 1, i + 1))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { Image, AlertTriangle, ChevronDown, X, ZoomIn, Download, FolderOpen, RefreshCw } from 'lucide-react';

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
// folderKey = subfolder under userData/screenshots/<folderKey>/
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
];

// ─── Game selector ────────────────────────────────────────────────────────────
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
        <div className="text-left min-w-0">
          <p className="text-[13px] font-semibold leading-none truncate max-w-[200px]" style={{ color: theme.text }}>
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
            className="absolute top-full mt-1.5 left-0 z-50 min-w-[240px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
          >
            {games.map((g) => {
              const isActive = g.id === selected;
              return (
                <button
                  key={g.id}
                  onClick={() => { onSelect(g.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                  style={{ backgroundColor: isActive ? `${accent.hex}14` : 'transparent' }}
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-black/40">
                    {g.status === 'released' ? (
                      <img src={g.url} alt={g.name} className="w-full h-full object-cover" />
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
                      {g.name}
                    </p>
                    <p className="text-[10px] opacity-40 mt-0.5 truncate">{g.developer}</p>
                  </div>
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
          className="absolute left-5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition hover:bg-white/10"
          style={{ color: theme.text }}
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition hover:bg-white/10"
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
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const game = GAMES.find((g) => g.id === selectedGameId) ?? GAMES[0];

  // Fetch screenshots from disk via Electron IPC when game changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLightboxIndex(null);

    const api = window.launcherAPI?.screenshots;
    if (!api?.getAll) {
      console.warn('[Screenshots] launcherAPI.screenshots not available');
      setShots([]);
      setLoading(false);
      return;
    }

    api.getAll(game.folderKey)
      .then((list) => {
        if (!cancelled) setShots(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn('[Screenshots] getAll failed:', err);
        if (!cancelled) setShots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedGameId, game.folderKey]);

  function refresh() {
    setLoading(true);
    window.launcherAPI?.screenshots?.getAll?.(game.folderKey)
      .then((list) => setShots(Array.isArray(list) ? list : []))
      .catch(() => setShots([]))
      .finally(() => setLoading(false));
  }

  function openFolder() {
    window.launcherAPI?.screenshots?.openFolder?.(game.folderKey);
  }

  return (
    <div className="relative h-full overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
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

          <div className="flex items-center gap-2">
            <GameSelector
              games={GAMES}
              selected={selectedGameId}
              onSelect={setSelectedGameId}
              accent={accent}
              theme={theme}
            />
            <button
              type="button"
              onClick={refresh}
              title="Refresh"
              className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-80"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={openFolder}
              title="Open folder"
              className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-80"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

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

        {game.status === 'released' && (
          <>
            <div
              className="flex items-center justify-between rounded-3xl px-8 py-4 mb-5 border"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
                  {game.fullName}
                </p>
                <p className="text-[14px] font-semibold mt-1" style={{ color: theme.text }}>
                  {loading ? 'Loading…' : `${shots.length} screenshot${shots.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <span className="text-[11px] font-mono opacity-30" title="On-disk folder">
                screenshots/{game.folderKey}/
              </span>
            </div>

            {!loading && shots.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-20 rounded-[2.5rem] border opacity-80 gap-1"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
              >
                <AlertTriangle size={40} className="mb-3 opacity-20" />
                <p className="text-[15px] font-semibold" style={{ color: theme.text }}>
                  No screenshots found
                </p>
                <p className="text-[13px] opacity-40 mt-1.5 text-center max-w-sm">
                  Press{' '}
                  <code
                    className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                    style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                  >
                    F2
                  </code>{' '}
                  while in-game to capture screenshots. They&apos;ll appear here automatically.
                </p>
                <button
                  type="button"
                  onClick={openFolder}
                  className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition hover:opacity-80"
                  style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                >
                  <FolderOpen size={13} /> Open screenshots folder
                </button>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-2xl animate-pulse"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                  />
                ))}
              </div>
            )}

            {!loading && shots.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {shots.map((shot, i) => (
                  <motion.button
                    key={shot.src + (shot.fileName || i)}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
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

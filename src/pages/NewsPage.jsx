import { useRef, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import newsEntries from '../data/news.json';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import VIDEO_GAMING    from './videos/gaming.mp4';
import VIDEO_DRAGON_TRAVELLER from './videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY from './videos/Lucy Cyberpunk.mp4';
import VIDEO_FOREST from './videos/Forest Cafe.mp4';
import VIDEO_KALTSIT from './videos/Kaltsit.mp4';
import { FaCross, FaIdBadge, FaRegNewspaper, FaSearch } from 'react-icons/fa';
import { AlertCircle, AlertTriangle, Search, ListFilter } from 'lucide-react';

const PRESET_VIDEO_MAP = {
    'preset-gaming':    VIDEO_GAMING,
    'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
    'preset-lucy':      VIDEO_LUCY,
    'preset-forest':    VIDEO_FOREST,
    'preset-kaltsit':   VIDEO_KALTSIT,
};

export default function NewsPage() {
  const { settings } = useSettings();
  const theme = THEMES[settings?.theme] || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundVideoSrc =
    backgroundVideoType === 'none'
      ? null
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
  }, [motionOn]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set();
    newsEntries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, []);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return newsEntries.filter((entry) => {
      const matchesTag = tagFilter === 'all' || entry.tags?.includes(tagFilter);
      if (!matchesTag) return false;
      if (!q) return true;
      const haystack = [entry.title, ...(entry.notes ?? [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, tagFilter]);

  return (
    <div className="relative h-full overflow-y-auto font-['Inter']">
      {/* Background video */}
      {backgroundVideoSrc && (
        <video
          ref={videoRef}
          src={backgroundVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.8]"
        />
      )}

      <div className="px-9 py-7">
      <h2 className="font-['Manrope'] text-3xl font-bold tracking-tight text-bone">Updates & Patch Notes</h2>
      <p className="mt-3 text-sm text-ash/70">Patch notes for the latest updates.</p>

      {/* Caution note — short, always-visible heads-up about patch note lag */}
      <div
        className="mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed text-ash/80"
        style={{ borderColor: `${accent.hex}40`, backgroundColor: `${theme.surface}66` }}
      >
        <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: accent.hex }} />
        <span>Patch notes are compiled after each release and may not reflect hotfixes pushed without a full client update.</span>
      </div>

      {/* Combined search + tag filter bar */}
      <div
        className="mt-5 flex items-center gap-0 overflow-hidden rounded-2xl border"
        style={{ borderColor: theme.border, backgroundColor: `${theme.surface}99` }}
      >
        {/* Search — shorter, fixed width */}
        <div className="flex w-[350px] shrink-0 items-center gap-2 border-r px-3 py-3" style={{ borderColor: theme.border }}>
          <FaSearch size={16} className="shrink-0 text-ash/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm ml-1 text-bone placeholder:text-ash/40 focus:outline-none"
          />
        </div>

        {/* Tag pills — scroll horizontally if there are many */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
          <span className="text-[13px] font-[Manrope] font-semibold text-ash/60">Filters:</span>
          {[{ value: 'all', label: 'All' }, ...allTags.map((t) => ({ value: t, label: t }))].map((opt) => {
            const active = tagFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTagFilter(opt.value)}
                style={active
                  ? { backgroundColor: accent.hex, color: accent.on, borderColor: accent.hex }
                  : { borderColor: theme.border }
                }
                className="shrink-0 rounded-lg border px-5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                {active ? '' : ''}{opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="wait">
          {loading ? (
            // ── Skeleton cards ──────────────────────────────────────────
            <motion.div
              key="skeletons"
              className="contents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} theme={theme} delay={i * 60} />
              ))}
            </motion.div>
          ) : (
            // ── Real content ────────────────────────────────────────────
            <motion.div
              key="content"
              className="contents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {newsEntries.length === 0 && (
                <p className="col-span-full mt-3 flex w-full px-6 py-4 text-sm text-ash/60 backdrop-blur-glass" style={{
                  backgroundColor: `${theme.surface}66`,
                  borderColor: `${accent.hex}66`,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderRadius: '1.2em',
                }}>
                  <AlertCircle size={20} className="mr-2.5" style={{ color: accent.hex }} />
                  No news yet. Check back after the next update.
                </p>
              )}

              {newsEntries.length > 0 && filteredEntries.length === 0 && (
                <div className="col-span-full flex w-full flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center" style={{
                  backgroundColor: `${theme.surface}66`,
                  borderColor: theme.border,
                }}>
                  <Search size={28} className="text-ash/30" />
                  <p className="text-sm font-medium text-ash/60">
                    No patch notes match
                    {search && <span className="ml-1 text-bone/70">"{search}"</span>}
                    {tagFilter !== 'all' && <span className="ml-1 text-bone/70">in <span style={{ color: accent.hex }}>{tagFilter}</span></span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setTagFilter('all'); }}
                    className="text-[11px] font-medium underline text-ash/50 hover:text-bone/70 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {filteredEntries.map((entry, i) => (
                <motion.article
                  key={entry.version}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="overflow-hidden rounded-xl border transition-colors"
                  style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66` }}
                >
                  {entry.image && (
                    <div className="h-48 w-full overflow-hidden bg-white/5">
                      <img src={entry.image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-['Manrope'] text-lg font-bold tracking-tight text-bone">{entry.title}</h3>
                      <time className="text-[11px] font-medium text-ash/60">{entry.date}</time>
                    </div>

                    {entry.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                            style={{ borderColor: `${accent.hex}4d`, color: accent.hex }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <ul className="mt-3 flex flex-col gap-1.5">
                      {entry.notes.map((note, i) => (
                        <li key={i} className="flex gap-2 text-sm text-bone/80">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: `${accent.hex}80` }} />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
}

// ── Skeleton shimmer ───────────────────────────────────────────────────────────
const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s infinite',
};

if (typeof document !== 'undefined' && !document.getElementById('skeleton-shimmer-kf')) {
  const style = document.createElement('style');
  style.id = 'skeleton-shimmer-kf';
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`;
  document.head.appendChild(style);
}

function SkeletonCard({ theme, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66` }}
    >
      {/* Image placeholder */}
      <div className="h-48 w-full" style={shimmerStyle} />

      <div className="px-5 py-4 flex flex-col gap-3">
        {/* Title + date row */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-2/3 rounded-md" style={shimmerStyle} />
          <div className="h-3 w-12 rounded-md" style={shimmerStyle} />
        </div>

        {/* Tag pills */}
        <div className="flex gap-2">
          <div className="h-4 w-14 rounded-full" style={shimmerStyle} />
          <div className="h-4 w-10 rounded-full" style={shimmerStyle} />
        </div>

        {/* Note lines */}
        <div className="flex flex-col gap-2 mt-1">
          {[80, 95, 65, 85].map((w, i) => (
            <div key={i} className="h-3 rounded-md" style={{ ...shimmerStyle, width: `${w}%` }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
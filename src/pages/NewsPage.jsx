import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import VIDEO_GAMING    from './videos/gaming.mp4';
import VIDEO_DRAGON_TRAVELLER from './videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY from './videos/Lucy Cyberpunk.mp4';
import VIDEO_KALTSIT from './videos/Kaltsit.mp4';
import { FaSearch } from 'react-icons/fa';
import { AlertCircle, AlertTriangle, Search, X, ExternalLink, RefreshCw } from 'lucide-react';
import VIDEO_ROSSI from './videos/rossi.mp4';

import ROSSI_FRAME    from './videos/frames/rossi frame.png';
import KALTSIT_FRAME  from './videos/frames/kaltsit frame.png';
import XUANWU_FRAME   from './videos/frames/xuanwu frame.png';
import FIREFLY_FRAME  from './videos/frames/firefly frame.png';
import LUCY_FRAME     from './videos/frames/lucy frame.png';

const GITHUB_REPO = 'lonewolfFSD/zyphor-launcher';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=100`;

const PRESET_VIDEO_MAP = {
  'preset-gaming':           VIDEO_GAMING,
  'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
  'preset-lucy':             VIDEO_LUCY,
  'preset-kaltsit':          VIDEO_KALTSIT,
  'preset-rossi':            VIDEO_ROSSI,
};

const PRESET_STATIC_MAP = {
  'preset-gaming':           FIREFLY_FRAME,
  'preset-dragon-traveller': XUANWU_FRAME,
  'preset-lucy':             LUCY_FRAME,
  'preset-kaltsit':          KALTSIT_FRAME,
  'preset-rossi':            ROSSI_FRAME,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractPreviewNotes(body = '', max = 4) {
  return body
    .split('\n')
    .filter((l) => /^[-*]\s/.test(l.trim()))
    .map((l) => l.trim().replace(/^[-*]\s+/, ''))
    .slice(0, max);
}

function deriveTagsFromRelease(release) {
  const tags = [];
  if (release.prerelease) tags.push('pre-release');
  else tags.push('stable');

  const name = (release.name ?? release.tag_name ?? '').toLowerCase();
  if (name.includes('hotfix') || name.includes('patch')) tags.push('hotfix');
  if (name.includes('major') || /v?\d+\.0\.0/.test(release.tag_name)) tags.push('major');

  return tags;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function mapRelease(release) {
  return {
    version:   release.tag_name,
    title:     release.name || release.tag_name,
    date:      formatDate(release.published_at),
    tags:      deriveTagsFromRelease(release),
    notes:     extractPreviewNotes(release.body),
    body:      release.body ?? '',
    url:       release.html_url,
    image:     null,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsPage() {
  const { settings } = useSettings();
  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const motionOn = settings ? settings.animations && !settings.reduceMotion : true;

  const backgroundVideoType = settings?.backgroundVideoType ?? 'default';
  const backgroundQuality   = settings?.backgroundQuality   ?? 'hd';

  const backgroundVideoSrc =
    backgroundVideoType === 'none' || backgroundQuality === 'static'
      ? null
      : backgroundVideoType === 'custom'
      ? settings?.backgroundVideoPath ? `file://${settings.backgroundVideoPath}` : null
      : backgroundVideoType?.startsWith('preset-')
      ? PRESET_VIDEO_MAP[backgroundVideoType] ?? DEFAULT_BACKGROUND_VIDEO
      : DEFAULT_BACKGROUND_VIDEO;

  const bgStaticPoster = backgroundQuality === 'static'
    ? (PRESET_STATIC_MAP[backgroundVideoType] ?? null)
    : null;

  const videoRef   = useRef(null);
  const headerRef  = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el || backgroundQuality === 'static') return;
    if (motionOn) el.play().catch(() => {});
    else el.pause();
  }, [motionOn, backgroundQuality]);

  // ── GSAP header entrance ─────────────────────────────────────────────────────
  useGSAP(() => {
    if (!headerRef.current) return;
    gsap.from(headerRef.current.children, {
      opacity: 0,
      y: 22,
      duration: 0.55,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.1,
    });
  }, { scope: headerRef });

  // ── GitHub fetch state ───────────────────────────────────────────────────────
  const [releases, setReleases]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null); // modal

  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState('all');

const fetchReleases = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const [listRes, latestRes] = await Promise.all([
      fetch(`${RELEASES_URL}?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } }),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } }),
    ]);

    if (!listRes.ok) throw new Error(`GitHub API returned ${listRes.status}`);
    
    const list = await listRes.json();
    const latest = latestRes.ok ? await latestRes.json() : null;

    // Merge: put latest first, remove duplicate if already in list
    const merged = latest
      ? [latest, ...list.filter(r => r.tag_name !== latest.tag_name)]
      : list;

    setReleases(merged.map(mapRelease));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchReleases(); }, 1000);
    return () => clearTimeout(timer);
  }, [fetchReleases]);

  // ── Close modal on Escape ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedEntry(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Filter / tag logic ───────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set();
    releases.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [releases]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return releases.filter((entry) => {
      const matchesTag = tagFilter === 'all' || entry.tags?.includes(tagFilter);
      if (!matchesTag) return false;
      if (!q) return true;
      const haystack = [entry.title, ...entry.notes].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, tagFilter, releases]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full overflow-y-auto font-['Inter']">

      {/* Background */}
      {backgroundQuality === 'static' && bgStaticPoster ? (
        <div
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full"
          style={{ backgroundImage: `url(${bgStaticPoster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : backgroundQuality === 'sd' && backgroundVideoSrc ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: -20, overflow: 'hidden', pointerEvents: 'none' }}>
          <video
            ref={videoRef}
            src={backgroundVideoSrc}
            autoPlay muted loop playsInline
            style={{ width: '40%', height: '40%', objectFit: 'cover', transform: 'scale(2.6)', transformOrigin: 'top left', filter: 'blur(0.5px)' }}
          />
        </div>
      ) : backgroundVideoSrc ? (
        <video
          ref={videoRef}
          src={backgroundVideoSrc}
          autoPlay muted loop playsInline
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.8]"
        />
      ) : null}

      <div className="px-9 py-7">
        <div ref={headerRef} className="flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className=" text-4xl font-medium tracking-tight text-bone" style={{
              fontFamily: 'Apple Garamond'
            }}>Updates & Patch Notes</h2>
            <p className="mt-1 text-base text-ash/70" style={{
              fontFamily: 'Apple Garamond'
            }}>Fetched live from GitHub Releases.</p>
          </div>
          <button
            type="button"
            onClick={fetchReleases}
            title="Refresh"
            className="flex items-center gap-1.5 backdrop-blur-glass rounded-xl border px-3 py-2 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
            style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66` }}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Caution banner */}
        <div
          className="mt-4 flex backdrop-blur-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-[15px] leading-relaxed text-ash/80"
          style={{ borderColor: `${accent.hex}40`, backgroundColor: `${theme.surface}66`, fontFamily: 'Apple Garamond' }}
        >
          <AlertTriangle size={15} className="mt-1 shrink-0" style={{ color: accent.hex }} />
          <span>Patch notes are compiled after each release and may not reflect hotfixes pushed without a full client update.</span>
        </div>

        {/* Search + tag filter bar */}
        <div
          className="mt-5 flex backdrop-blur-sm items-center gap-0 overflow-hidden rounded-2xl border"
          style={{ borderColor: theme.border, backgroundColor: `${theme.surface}99` }}
        >
          <div className="flex w-[350px] shrink-0 items-center gap-2 border-r px-3 py-3.5" style={{ borderColor: theme.border }}>
            <FaSearch size={16} className="shrink-0 text-ash/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="ml-1 w-full bg-transparent text-sm text-bone placeholder:text-ash/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
            <span className="font-['Manrope'] text-[13px] font-semibold text-ash/60">Filters:</span>
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
                  className="shrink-0 whitespace-nowrap rounded-lg border px-5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        </div>{/* /headerRef */}

        {/* Cards grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeletons" className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} theme={theme} delay={i * 60} />
                ))}
              </motion.div>
            ) : error ? (
              <motion.div key="error" className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  className="col-span-full flex w-full flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center"
                  style={{ backgroundColor: `${theme.surface}66`, borderColor: theme.border }}
                >
                  <AlertCircle size={28} style={{ color: accent.hex }} />
                  <p className="text-sm font-medium text-bone/70">Failed to load releases</p>
                  <p className="text-xs text-ash/50">{error}</p>
                  <button
                    type="button"
                    onClick={fetchReleases}
                    className="mt-1 rounded-lg border px-4 py-1.5 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
                    style={{ borderColor: theme.border }}
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="content" className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {releases.length === 0 && (
                  <p
                    className="col-span-full mt-3 flex w-full px-6 py-4 text-sm text-ash/60"
                    style={{ backgroundColor: `${theme.surface}66`, borderColor: `${accent.hex}66`, borderWidth: 2, borderStyle: 'solid', borderRadius: '1.2em' }}
                  >
                    <AlertCircle size={20} className="mr-2.5" style={{ color: accent.hex }} />
                    No releases found on GitHub yet.
                  </p>
                )}

                {releases.length > 0 && filteredEntries.length === 0 && (
                  <div
                    className="col-span-full flex w-full flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center"
                    style={{ backgroundColor: `${theme.surface}66`, borderColor: theme.border }}
                  >
                    <Search size={28} className="text-ash/30" />
                    <p className="text-sm font-medium text-ash/60">
                      No patch notes match
                      {search && <span className="ml-1 text-bone/70">"{search}"</span>}
                      {tagFilter !== 'all' && <span className="ml-1 text-bone/70">in <span style={{ color: accent.hex }}>{tagFilter}</span></span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setTagFilter('all'); }}
                      className="text-[11px] font-medium text-ash/50 underline transition-colors hover:text-bone/70"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {filteredEntries.map((entry, i) => (
                  <ReleaseCard
                    key={entry.version}
                    entry={entry}
                    index={i}
                    isLatest={i === 0}
                    theme={theme}
                    accent={accent}
                    onOpen={() => setSelectedEntry({ ...entry, isLatest: i === 0 })}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {selectedEntry && (
          <ReleaseModal
            entry={selectedEntry}
            theme={theme}
            accent={accent}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Release card ───────────────────────────────────────────────────────────────

function ReleaseCard({ entry, index, isLatest, theme, accent, onOpen }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`flex flex-col overflow-hidden rounded-3xl backdrop-blur-lg border transition-colors ${ isLatest ? 'border border-white/80' : 'border-white/10'}`}
      style={{ backgroundColor: `${theme.surface}66` }}
    >
      {entry.image && (
        <div className="h-48 w-full overflow-hidden bg-white/5">
          <img src={entry.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xl font-medium tracking-tight text-bone" style={{
            fontFamily: 'Apple Garamond'
          }}>v{entry.title}</h3>
          <time className="text-[12px] font-medium text-ash/60" style={{
            fontFamily: 'Apple Garamond'
          }}>{entry.date}</time>
        </div>

        {entry.tags?.length > 0 && (
          <div className="mt-2 flex flex-row gap-2">
            {isLatest && (
              <span
                className="rounded-lg border border-transparent px-3 py-[5px] text-[9px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: accent.hex, color: accent.on }}
              >
                Latest
              </span>
            )}
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border px-3 py-[5px] text-[9px] font-medium uppercase tracking-wide"
                style={{ borderColor: `${accent.hex}4d`, color: accent.hex }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Preview notes */}
        {/* Release Information */}
<div
  className="mb-8 overflow-hidden rounded-2xl mt-4 border"
  style={{ borderColor: theme.border }}
>
  <div
    className="flex items-center justify-between border-b px-5 py-3"
    style={{ borderColor: theme.border, background: `${theme.surface}99` }}
  >
    <h3 className="text-[15px] font-medium text-bone" style={{
      fontFamily: 'Apple Garamond'
    }}>
      Release Info
    </h3>

    <span
      className="rounded-lg px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide"
      style={{
        background:
          entry.title.toLowerCase().includes('alpha')
            ? '#ef444420'
            : entry.title.toLowerCase().includes('beta')
            ? '#facc1520'
            : '#22c55e20',
        color:
          entry.title.toLowerCase().includes('alpha')
            ? '#ef4444'
            : entry.title.toLowerCase().includes('beta')
            ? '#facc15'
            : '#22c55e',
      }}
    >
      {entry.title.toLowerCase().includes('alpha')
        ? 'Alpha'
        : entry.title.toLowerCase().includes('beta')
        ? 'Beta'
        : 'Stable'}
    </span>
  </div>

  <div className="space-y-4 px-5 py-4">
    <div className="flex flex-col gap-y-2 text-xs">
      <span className="text-ash/50">Recommendation</span>

<span className="text-bone/80 font-medium text-[15px] mb-1 -mt-1" style={{
  fontFamily: 'Apple Garamond', lineHeight: '1.3'
}}>
  {isLatest ? (
    'This is the latest release and is recommended for all users.'
  ) : entry.tags.includes('major') ? (
    'This is a stable major release. While fully supported, we always recommend using the latest available version.'
  ) : entry.title.toLowerCase().includes('alpha') ? (
    'Experimental build. Not recommended for everyday use.'
  ) : entry.title.toLowerCase().includes('beta') ? (
    'Preview build. Use with caution as bugs or incomplete features may still exist.'
  ) : (
    'Stable release. Safe to use, though updating to the latest version is always recommended.'
  )}
</span>

      <span className="text-ash/50">Download</span>

      <span className="text-bone/80">
        This version can be downloaded from the official GitHub Releases page.
      </span>
    </div>

    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border px-5 py-2 text-[13px] font-medium transition-all hover:scale-[1.02]"
      style={{
        borderColor: `${accent.hex}55`,
        color: accent.hex,
        fontFamily: 'Apple Garamond',
        backgroundColor: `${accent.hex}10`,
      }}
    >
      <ExternalLink size={12} /> Download this Version
    </a>
  </div>
</div>
<div className="">
          <button
            type="button"
            onClick={onOpen}
            className="w-full rounded-2xl border py-2.5 text-[14px] font-medium tracking-wide transition-colors hover:text-bone"
            style={{ borderColor: `${accent.hex}55`, color: accent.hex, backgroundColor: `${accent.hex}10`, fontFamily: 'Apple Garamond' }}
          >
            View Full Notes
          </button>
        </div>
</div>
    </motion.article>
  );
}

// ── Release modal ──────────────────────────────────────────────────────────────

function ReleaseModal({ entry, theme, accent, onClose }) {
  return (
    <motion.div
      key="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex h-full max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-6 py-4"
          style={{ borderColor: theme.border }}
        >
          <div>
            <h2 className="font-['Manrope'] text-2xl font-bold tracking-tight text-bone">v{entry.title}</h2>
            <div className="mt-1 flex items-center gap-3">
              <time className="text-[11px] text-ash/50">{entry.date}</time>
              
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
          </div>
          <div className="flex items-center gap-2">
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
              style={{ borderColor: theme.border }}
            >
              <ExternalLink size={12} />
              GitHub
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border p-1.5 text-ash/50 transition-colors hover:text-bone"
              style={{ borderColor: theme.border }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Markdown body */}
        <div className="flex-1 overflow-y-auto px-20 text-sm py-16 font-mono">
          {entry.body ? (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:font-['Manrope'] prose-headings:tracking-tight prose-headings:text-bone
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
              prose-p:text-bone/80 prose-p:leading-relaxed
              prose-li:text-bone/80
              prose-strong:text-bone
              prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[11px] prose-code:text-bone/90
              prose-pre:rounded-xl prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
              prose-a:no-underline
              prose-hr:border-white/10"
            >
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" style={{ color: accent.hex }} className="hover:underline">
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => <h1 className="mt-6 mt-10 mb-4 text-2xl font-bold first:mt-0">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="mt-10 mb-4 text-xl font-bold border-b pb-1.5 first:mt-0" style={{ borderColor: theme.border }}>{children}</h2>
                  ),
                }}
              >
                {entry.body}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-ash/50">No release notes provided.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
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
      <div className="h-48 w-full" style={shimmerStyle} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-2/3 rounded-md" style={shimmerStyle} />
          <div className="h-3 w-12 rounded-md" style={shimmerStyle} />
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-14 rounded-full" style={shimmerStyle} />
          <div className="h-4 w-10 rounded-full" style={shimmerStyle} />
        </div>
        <div className="mt-1 flex flex-col gap-2">
          {[80, 95, 65].map((w, i) => (
            <div key={i} className="h-3 rounded-md" style={{ ...shimmerStyle, width: `${w}%` }} />
          ))}
        </div>
        <div className="h-7 w-full rounded-lg" style={shimmerStyle} />
      </div>
    </motion.div>
  );
}
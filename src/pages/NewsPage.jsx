import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { useTranslation } from '../i18n/index.jsx';
import { FaSearch } from 'react-icons/fa';
import { AlertCircle, AlertTriangle, Search, X, ExternalLink, RefreshCw, Newspaper, Terminal } from 'lucide-react';
import GlassSurface from '../effects/GlassSurface.tsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import StayBanner from './images/stay_banner.jpg';
import FayePinkImg from './images/faye/faye-pink.png';

// ── GlassLayer — IS the container, not a layer behind it ──────────────────────
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

const GITHUB_REPO = 'lonewolfFSD/zyphor-launcher';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=100`;

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
    id: release.id ?? release.tag_name,
    type: 'release',
    version: release.tag_name,
    title:   release.name || release.tag_name,
    date:    formatDate(release.published_at),
    rawDate: new Date(release.published_at).getTime(),
    tags:    deriveTagsFromRelease(release),
    notes:   extractPreviewNotes(release.body),
    body:    release.body ?? '',
    url:     release.html_url,
    image:   null,
    category: 'Launcher Release',
  };
}

function parseItemDate(data) {
  if (!data) return new Date(0);
  const t = data.timestamp ?? data.createdAt ?? data.date;
  if (!t) return new Date(0);
  if (typeof t.toDate === 'function') return t.toDate();
  if (typeof t === 'object' && t.seconds) return new Date(t.seconds * 1000);
  const d = new Date(t);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function mapDevlog(d) {
  const data = d.data();
  const dObj = parseItemDate(data);
  return {
    id: d.id,
    type: 'devlog',
    version: null,
    title: data.title || 'STAY Devlog',
    date: formatDate(dObj),
    rawDate: dObj.getTime(),
    tags: ['devlog', 'stay'],
    notes: extractPreviewNotes(data.content),
    body: data.content || '',
    url: data.externalLink || data.url || null,
    image: StayBanner,
    category: 'STAY Devlog',
  };
}

function mapFayeUpdate(d) {
  const data = d.data();
  const dObj = parseItemDate(data);
  return {
    id: d.id,
    type: 'faye',
    version: null,
    title: data.title || 'Faye AI Update',
    date: formatDate(dObj),
    rawDate: dObj.getTime(),
    tags: ['faye-update', 'faye'],
    notes: extractPreviewNotes(data.content),
    body: data.content || '',
    url: data.externalLink || data.url || null,
    image: FayePinkImg,
    category: 'Faye Update',
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const theme  = THEMES[settings?.theme]   || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const headerRef = useRef(null);

  useGSAP(() => {
    if (!headerRef.current) return;
    gsap.from(headerRef.current.children, {
      opacity: 0, y: 22, duration: 0.55, stagger: 0.12, ease: 'power3.out', delay: 0.1,
    });
  }, { scope: headerRef });

  const [releases,      setReleases]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [tagFilter,     setTagFilter]     = useState('all');
  const [activeTab,     setActiveTab]     = useState('all'); // 'all' | 'news' | 'patches'
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch GitHub Releases
      let ghReleases = [];
      try {
        const data = await window.launcherAPI?.getReleases?.();
        if (Array.isArray(data) && data.length) {
          ghReleases = data.map(mapRelease);
        } else {
          const res = await fetch('https://api.github.com/repos/lonewolfFSD/zyphor-launcher/releases');
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) ghReleases = json.map(mapRelease);
          }
        }
      } catch (err) {
        console.warn('[NewsPage] Failed to fetch GitHub releases:', err);
      }

      // 2. Fetch Firestore devlogs and faye_updates
      let devlogItems = [];
      let fayeItems = [];
      try {
        const [devlogsSnap, fayeSnap, fayeHyphenSnap] = await Promise.all([
          getDocs(collection(db, 'devlogs')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'faye_updates')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'faye-updates')).catch(() => ({ docs: [] })),
        ]);

        devlogItems = (devlogsSnap.docs || []).map(mapDevlog);

        const seenFaye = new Set();
        fayeItems = [...(fayeSnap.docs || []), ...(fayeHyphenSnap.docs || [])]
          .filter((d) => {
            if (seenFaye.has(d.id)) return false;
            seenFaye.add(d.id);
            return true;
          })
          .map(mapFayeUpdate);
      } catch (err) {
        console.warn('[NewsPage] Failed to fetch Firestore news:', err);
      }

      const combined = [...devlogItems, ...fayeItems, ...ghReleases];
      combined.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));

      setReleases(combined);
    } catch (err) {
      setError(err.message ?? 'Failed to fetch news.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedEntry(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set();
    releases.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [releases]);

  const filteredEntries = useMemo(() => {
    return releases.filter((r) => {
      const matchTag =
        tagFilter === 'all' ||
        r.tags?.includes(tagFilter) ||
        (tagFilter === 'devlog' && r.type === 'devlog') ||
        (tagFilter === 'faye-update' && r.type === 'faye');
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        (r.version && r.version.toLowerCase().includes(q)) ||
        r.body?.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q));
      return matchTag && matchSearch;
    });
  }, [releases, tagFilter, search]);

  const devlogEntries = useMemo(() => {
    return filteredEntries.filter((r) => r.type === 'devlog' || r.type === 'faye');
  }, [filteredEntries]);

  const patchEntries = useMemo(() => {
    return filteredEntries.filter((r) => r.type === 'release');
  }, [filteredEntries]);

  const totalNewsCount = useMemo(() => releases.filter((e) => e.type === 'devlog' || e.type === 'faye').length, [releases]);
  const totalPatchCount = useMemo(() => releases.filter((e) => e.type === 'release').length, [releases]);

  return (
    <div className="relative h-full overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: `linear-gradient(to bottom, ${theme.bg}cc 0%, ${theme.bg}88 40%, ${theme.bg}cc 100%)`, opacity: 0.2 }}
      />
      <div className="px-9 py-7">
        <div ref={headerRef} className="flex flex-col gap-5">

          {/* ── Header row ── */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl uppercase font-bold tracking-tight text-bone">
                {t('news.title', {}, 'Updates & Patch Notes')}
              </h2>
              <p className="mt-1 text-sm text-ash/70 font-body">
                {t('news.subtitle', {}, 'Latest announcements, patch notes, and community highlights')}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchReleases}
              title="Refresh"
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
              style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66` }}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* ── Section selector tabs ── */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Updates', count: releases.length },
              { id: 'news', label: 'Studio News & Devlogs', count: totalNewsCount, icon: Newspaper },
              { id: 'patches', label: 'Launcher Patch Notes', count: totalPatchCount, icon: Terminal },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={
                    active
                      ? { backgroundColor: accent.hex, color: accent.on, borderColor: accent.hex }
                      : { borderColor: theme.border, backgroundColor: `${theme.surface}55` }
                  }
                  className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all hover:border-white/30"
                >
                  {Icon && <Icon size={14} />}
                  <span>{tab.label}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: active ? 'rgba(0,0,0,0.25)' : `${theme.surface}99`,
                      color: active ? accent.on : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Search + filter bar ── */}
          <div
            className="flex items-center gap-0 overflow-hidden rounded-2xl border backdrop-blur-sm"
            style={{ borderColor: theme.border, backgroundColor: `${theme.surface}66` }}
          >
            <div className="flex w-[350px] shrink-0 items-center gap-2 border-r px-3 py-4" style={{ borderColor: theme.border }}>
              <FaSearch size={16} className="shrink-0 text-ash/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('news.searchPlaceholder', {}, 'Search…')}
                className="ml-1 w-full bg-transparent text-sm text-bone placeholder:text-ash/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
              <span className="font-['Manrope'] text-[13px] font-semibold text-ash/60">{t('news.filters', {}, 'Filters:')}</span>
              {[{ value: 'all', label: t('news.filterAll', {}, 'All') }, ...allTags.map((t) => ({ value: t, label: t }))].map((opt) => {
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
        </div>

        {/* ── Content Area with 2 Sections ── */}
        <div className="mt-8 flex flex-col gap-10">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeletons" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} theme={theme} delay={i * 60} />
                ))}
              </motion.div>
            ) : error ? (
              <motion.div key="error" className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center"
                  style={{ backgroundColor: `${theme.surface}66`, borderColor: theme.border }}
                >
                  <AlertCircle size={28} style={{ color: accent.hex }} />
                  <p className="text-sm font-medium text-bone/70">{t('news.failedToLoad', {}, 'Failed to load updates')}</p>
                  <p className="text-xs text-ash/50">{error}</p>
                  <button
                    type="button"
                    onClick={fetchReleases}
                    className="mt-1 rounded-lg border px-4 py-1.5 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
                    style={{ borderColor: theme.border }}
                  >
                    {t('common.retry', {}, 'Retry')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="content" className="flex flex-col gap-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {releases.length === 0 && (
                  <p
                    className="flex w-full px-6 py-4 text-sm text-ash/60"
                    style={{ backgroundColor: `${theme.surface}66`, borderColor: `${accent.hex}66`, borderWidth: 2, borderStyle: 'solid', borderRadius: '1.2em' }}
                  >
                    <AlertCircle size={20} className="mr-2.5" style={{ color: accent.hex }} />
                    {t('news.noReleases', {}, 'No news or patch notes found yet.')}
                  </p>
                )}

                {releases.length > 0 && filteredEntries.length === 0 && (
                  <div
                    className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center"
                    style={{ backgroundColor: `${theme.surface}66`, borderColor: theme.border }}
                  >
                    <Search size={28} className="text-ash/30" />
                    <p className="text-sm font-medium text-ash/60">
                      {t('news.noMatches', {}, 'No updates match')}
                      {search && <span className="ml-1 text-bone/70">"{search}"</span>}
                      {tagFilter !== 'all' && <span className="ml-1 text-bone/70">in <span style={{ color: accent.hex }}>{tagFilter}</span></span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setTagFilter('all'); }}
                      className="text-[11px] font-medium text-ash/50 underline transition-colors hover:text-bone/70"
                    >
                      {t('news.clearFilters', {}, 'Clear filters')}
                    </button>
                  </div>
                )}

                {/* ════ SECTION 1: STUDIO NEWS & DEVLOGS ════ */}
                {(activeTab === 'all' || activeTab === 'news') && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-['Manrope'] text-xl uppercase font-bold tracking-tight text-bone">Studio News & Devlogs</h3>
                          <p className="text-sm font-bold text-ash/60">STAY game production updates and Faye AI ecosystem announcements</p>
                        </div>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-mono font-semibold"
                        style={{ backgroundColor: `${theme.surface}99`, color: accent.hex, border: `1px solid ${theme.border}` }}
                      >
                        {devlogEntries.length} {devlogEntries.length === 1 ? 'article' : 'articles'}
                      </span>
                    </div>

                    {devlogEntries.length === 0 ? (
                      <div className="rounded-2xl border px-6 py-8 text-center text-xs text-ash/50" style={{ borderColor: theme.border, backgroundColor: `${theme.surface}44` }}>
                        No studio devlogs match the current filters.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
                        {devlogEntries.map((entry, i) => (
                          <ReleaseCard
                            key={entry.id ?? i}
                            entry={entry}
                            index={i}
                            isLatest={i === 0}
                            theme={theme}
                            accent={accent}
                            onOpen={() => setSelectedEntry({ ...entry, isLatest: i === 0 })}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ════ SECTION 2: LAUNCHER PATCH NOTES ════ */}
                {(activeTab === 'all' || activeTab === 'patches') && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-['Manrope'] text-xl uppercase font-bold tracking-tight text-bone">Client Updates & Patch Notes</h3>
                          <p className="text-sm text-ash/60 font-bold">Zyphor Launcher version releases, build notes, and client changelogs</p>
                        </div>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-mono font-semibold"
                        style={{ backgroundColor: `${theme.surface}99`, color: '#22c55e', border: `1px solid ${theme.border}` }}
                      >
                        {patchEntries.length} {patchEntries.length === 1 ? 'release' : 'releases'}
                      </span>
                    </div>

                    {/* Caution banner specific to client patch notes */}
                    <div
                      className="flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed text-ash/80 backdrop-blur-sm font-body"
                      style={{ borderColor: `${accent.hex}40`, backgroundColor: `${theme.surface}66` }}
                    >
                      <AlertTriangle size={14} className="mt-1 shrink-0" style={{ color: accent.hex }} />
                      <span>{t('news.cautionBanner', {}, 'Patch notes are compiled after each release and may not reflect hotfixes pushed without a full client update.')}</span>
                    </div>

                    {patchEntries.length === 0 ? (
                      <div className="rounded-2xl border px-6 py-8 text-center text-xs text-ash/50" style={{ borderColor: theme.border, backgroundColor: `${theme.surface}44` }}>
                        No patch notes match the current filters.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
                        {patchEntries.map((entry, i) => (
                          <ReleaseCard
                            key={entry.id ?? entry.version ?? i}
                            entry={entry}
                            index={i}
                            isLatest={i === 0}
                            theme={theme}
                            accent={accent}
                            onOpen={() => setSelectedEntry({ ...entry, isLatest: i === 0 })}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
  const { t } = useTranslation();

  const isDevlog = entry.type === 'devlog';
  const isFaye = entry.type === 'faye';
  const isGameOrFaye = isDevlog || isFaye;

  const stabilityColor = isDevlog
    ? accent.hex
    : isFaye
    ? '#f472b6'
    : entry.title.toLowerCase().includes('alpha') ? '#ef4444'
    : entry.title.toLowerCase().includes('beta') ? '#facc15'
    : '#22c55e';

  const stabilityBg = isDevlog
    ? `${accent.hex}20`
    : isFaye
    ? '#f472b620'
    : entry.title.toLowerCase().includes('alpha') ? '#ef444420'
    : entry.title.toLowerCase().includes('beta') ? '#facc1520'
    : '#22c55e20';

  const stabilityLabel = isDevlog
    ? 'Devlog'
    : isFaye
    ? 'Faye AI'
    : entry.title.toLowerCase().includes('alpha') ? t('news.stability.alpha', {}, 'Alpha')
    : entry.title.toLowerCase().includes('beta') ? t('news.stability.beta', {}, 'Beta')
    : t('news.stability.stable', {}, 'Stable');

  const recommendation = isDevlog
    ? 'Official game production & dev update for STAY.'
    : isFaye
    ? 'System intelligence and community ecosystem update for Faye.'
    : isLatest
      ? t('news.recLatest', {}, 'This is the latest release and is recommended for all users.')
      : entry.tags.includes('major')
      ? t('news.recMajor', {}, 'Stable major release. We always recommend using the latest version.')
      : entry.title.toLowerCase().includes('alpha')
      ? t('news.recAlpha', {}, 'Experimental build. Not recommended for everyday use.')
      : entry.title.toLowerCase().includes('beta')
      ? t('news.recBeta', {}, 'Preview build. Bugs or incomplete features may exist.')
      : t('news.recStable', {}, 'Stable release. Updating to the latest version is recommended.');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <GlassLayer
        borderRadius={30}
        distortionScale={-180}
        blur={40}
        className="flex flex-col overflow-hidden h-full"
        style={{
          border: isLatest && !isGameOrFaye ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* {entry.image && (
          <div className="h-44 w-full overflow-hidden bg-white/5 relative">
            <img src={entry.image} alt={entry.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
            {isGameOrFaye && (
              <span
                className="absolute top-3 left-3 rounded-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
                style={{
                  backgroundColor: isFaye ? '#ec489944' : `${accent.hex}33`,
                  color: isFaye ? '#f472b6' : accent.hex,
                  border: `1px solid ${isFaye ? '#ec489966' : accent.hex + '66'}`,
                }}
              >
                {entry.category}
              </span>
            )}
          </div>
        )} */}

        <div className="flex flex-1 flex-col px-6 py-6 bg-black/10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[17px] font-semibold tracking-tight text-bone line-clamp-2">
              {entry.type === 'release' ? `v${entry.title}` : entry.title}
            </h3>
            <time className="text-[11px] font-mono opacity-40">
              {entry.date}
            </time>
          </div>

          {entry.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono">
              {isLatest && !isGameOrFaye && (
                <span
                  className="rounded-md border border-transparent px-2.5 py-[3px] text-[8.5px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: accent.hex, color: accent.on }}
                >
                  {t('news.latest', {}, 'Latest')}
                </span>
              )}
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border px-2.5 py-[3px] text-[8.5px] font-medium uppercase tracking-wide"
                  style={{
                    borderColor: tag.includes('faye') ? '#f472b666' : `${accent.hex}4d`,
                    color: tag.includes('faye') ? '#f472b6' : accent.hex,
                    backgroundColor: tag.includes('faye') ? '#f472b615' : 'transparent',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mb-5 overflow-hidden rounded-xl mt-3 border" style={{ borderColor: theme.border }}>
            <div
              className="flex items-center justify-between border-b px-4 py-2"
              style={{ borderColor: theme.border, background: `${theme.surface}99` }}
            >
              <h3 className="text-[12.5px] font-semibold text-bone">
                {isDevlog ? 'STAY Production' : isFaye ? 'Zyphor Ecosystem' : t('news.releaseInfo', {}, 'Release Info')}
              </h3>
              <span
                className="rounded-md px-2 py-0.5 text-[8px] font-mono font-semibold uppercase tracking-wide"
                style={{ background: stabilityBg, color: stabilityColor }}
              >
                {stabilityLabel}
              </span>
            </div>

            <div className="space-y-3 px-4 py-3 font-body">
              <div className="flex flex-col gap-y-1 text-[11px]">
                <span className="text-ash/50 text-[10px] uppercase font-mono tracking-wider">
                  {isGameOrFaye ? 'Summary' : t('news.recommendation', {}, 'Recommendation')}
                </span>
                <span className="text-bone/80 font-medium text-[12px] leading-snug line-clamp-3">
                  {entry.notes?.length ? entry.notes[0] : recommendation}
                </span>
                {entry.url && (
                  <>
                    <span className="text-ash/50 text-[10px] uppercase font-mono tracking-wider mt-1">
                      {isDevlog ? 'Official Link' : isFaye ? 'Community Link' : t('news.download', {}, 'Download')}
                    </span>
                    <span className="text-bone/80 text-[11px] truncate">
                      {isDevlog ? 'Available on Steam & Official Site' : isFaye ? 'Available on Discord & Community' : t('news.downloadHint', {}, 'Available from the official GitHub Releases page.')}
                    </span>
                  </>
                )}
              </div>
              {entry.url && (
                <a
                  href={entry.url}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.launcherAPI?.openExternal) {
                      window.launcherAPI.openExternal(entry.url);
                    } else {
                      window.open(entry.url, '_blank', 'noreferrer');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover:scale-[1.02] ${
                    !isGameOrFaye && (isLatest || entry.title.toLowerCase().includes('alpha') || entry.title.toLowerCase().includes('beta'))
                      ? 'opacity-0 pointer-events-none'
                      : 'block'
                  }`}
                  style={{
                    borderColor: isFaye ? '#f472b666' : `${accent.hex}55`,
                    color: isFaye ? '#f472b6' : accent.hex,
                    backgroundColor: isFaye ? '#f472b615' : `${accent.hex}10`,
                  }}
                >
                  <ExternalLink size={11} /> {isDevlog ? 'View Announcement' : isFaye ? 'View on Discord' : t('news.downloadThisVersion', {}, 'Download this Version')}
                </a>
              )}
            </div>
          </div>

          <div className="-mt-1">
            <button
              type="button"
              onClick={onOpen}
              className="w-full rounded-xl border py-2.5 text-[11px] uppercase font-extrabold tracking-wide transition-colors hover:text-bone"
              style={{ borderColor: `${accent.hex}55`, color: accent.hex, backgroundColor: `${accent.hex}10`, fontFamily: 'Manrope, sans-serif' }}
            >
              {isGameOrFaye ? 'Read Full Article' : t('news.viewFullNotes', {}, 'View Full Notes')}
            </button>
          </div>
        </div>
      </GlassLayer>
    </motion.div>
  );
}

// ── Release modal ──────────────────────────────────────────────────────────────

function ReleaseModal({ entry, theme, accent, onClose }) {
  const { t } = useTranslation();
  const isDevlog = entry.type === 'devlog';
  const isFaye = entry.type === 'faye';

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
        className="relative flex h-full max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: theme.border }}>
          <div>
            <h2 className="font-['Manrope'] text-2xl font-bold tracking-tight text-bone">
              {entry.type === 'release' ? `v${entry.title}` : entry.title}
            </h2>
            <div className="mt-1 flex items-center gap-3">
              <time className="text-[10px] text-ash/50">{entry.date}</time>
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    borderColor: tag.includes('faye') ? '#f472b666' : `${accent.hex}4d`,
                    color: tag.includes('faye') ? '#f472b6' : accent.hex,
                    backgroundColor: tag.includes('faye') ? '#f472b615' : 'transparent',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entry.url && (
              <a
                href={entry.url}
                onClick={(e) => {
                  e.preventDefault();
                  if (window.launcherAPI?.openExternal) {
                    window.launcherAPI.openExternal(entry.url);
                  } else {
                    window.open(entry.url, '_blank', 'noreferrer');
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-ash/60 transition-colors hover:text-bone"
                style={{ borderColor: theme.border }}
              >
                <ExternalLink size={12} /> {isDevlog ? 'Website / Steam' : isFaye ? 'Discord' : 'GitHub'}
              </a>
            )}
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

        <div className="flex-1 overflow-y-auto px-10 md:px-16 py-10 text-sm font-mono">
          {entry.image && (
            <div className="mb-6 h-48 md:h-60 w-full overflow-hidden rounded-2xl border" style={{ borderColor: theme.border }}>
              <img src={entry.image} alt={entry.title} className="h-full w-full object-cover" />
            </div>
          )}

          {entry.body ? (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:font-['Manrope'] prose-headings:tracking-tight prose-headings:text-bone
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
              prose-p:text-bone/80 prose-p:leading-relaxed
              prose-li:text-bone/80 prose-strong:text-bone
              prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[11px] prose-code:text-bone/90
              prose-pre:rounded-xl prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
              prose-a:no-underline prose-hr:border-white/10"
            >
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.launcherAPI?.openExternal) {
                          window.launcherAPI.openExternal(href);
                        } else {
                          window.open(href, '_blank', 'noreferrer');
                        }
                      }}
                      style={{ color: accent.hex }}
                      className="hover:underline cursor-pointer"
                    >
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => <h1 className="mt-8 mb-4 text-2xl font-bold first:mt-0">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="mt-8 mb-4 text-xl font-bold border-b pb-1.5 first:mt-0" style={{ borderColor: theme.border }}>{children}</h2>
                  ),
                }}
              >
                {entry.body}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-ash/50">{t('news.noNotesProvided', {}, 'No notes provided.')}</p>
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
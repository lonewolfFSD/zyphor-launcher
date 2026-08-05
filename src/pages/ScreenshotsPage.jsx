import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import {
  Image, AlertTriangle, ChevronDown, X, ZoomIn, ZoomOut,
  Download, FolderOpen, RefreshCw, Trash2, Copy, Share2,
  Check, Maximize2, Minimize2, Info, RotateCcw,
} from 'lucide-react';

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

const GAMES = [
  {
    id: 'stay',
    folderKey: 'stay',
    appId: '4956550',
    name: 'STAY: Possession • Obsession • Permanence',
    fullName: 'STAY: Possession • Obsession • Permanence',
    url: 'https://avatars.fastly.steamstatic.com/b696b00d13eaa6ddef314f3c85162c7bb72a5f7a_full.jpg',
    developer: 'Zyphor Studios',
    status: 'released',
  },
];

const TILE_SIZES = {
  sm: 'grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
  md: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  lg: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
};

function formatBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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
          <img src={current.url} alt="" className="w-full h-full object-cover" />
        </div>
        <p className="text-[13px] font-semibold leading-none truncate max-w-[180px]" style={{ color: theme.text }}>
          {current.name}
        </p>
        <ChevronDown size={14} style={{ color: `${theme.text}55`, transform: open ? 'rotate(180deg)' : undefined }} className="shrink-0 transition-transform" />
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
            {games.map((g) => (
              <button
                key={g.id}
                onClick={() => { onSelect(g.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{ backgroundColor: g.id === selected ? `${accent.hex}14` : 'transparent' }}
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-black/40">
                  <img src={g.url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: g.id === selected ? accent.hex : theme.text }}>{g.name}</p>
                  <p className="text-[10px] opacity-40 mt-0.5">{g.developer}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContextMenu({ x, y, onClose, actions, theme, accent }) {
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[120] min-w-[180px] overflow-hidden rounded-xl border shadow-2xl py-1"
      style={{
        left: Math.min(x, window.innerWidth - 200),
        top: Math.min(y, window.innerHeight - 280),
        backgroundColor: `${theme.surface}f8`,
        borderColor: theme.border,
        backdropFilter: 'blur(12px)',
      }}
    >
      {actions.map((a, i) =>
        a.divider ? (
          <div key={i} className="my-1 h-px mx-2" style={{ backgroundColor: theme.border }} />
        ) : (
          <button
            key={a.label}
            type="button"
            onClick={() => { a.action(); onClose(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors"
            style={{ color: a.danger ? '#f87171' : theme.text }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = a.danger ? 'rgba(239,68,68,0.12)' : `${accent.hex}14`; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {a.icon && <a.icon size={13} className="opacity-60" />}
            {a.label}
          </button>
        )
      )}
    </motion.div>
  );
}

function Lightbox({ shot, shots, index, onClose, onNavigate, onDelete, accent, theme }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [meta, setMeta] = useState({ w: null, h: null });
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMeta({ w: null, h: null });
  }, [shot?.src]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.25));
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.25));
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
      if (e.key === 'i' || e.key === 'I') setShowInfo((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate]);

  function onImgLoad(e) {
    setMeta({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.min(5, Math.max(0.5, +(z + delta).toFixed(2))));
  }

  function onPointerDown(e) {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }
  function onPointerUp() { setDragging(false); }

  async function copyImage() {
    try {
      const res = await fetch(shot.src);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(shot.fileName || shot.name);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { /* ignore */ }
    }
  }

  async function shareImage() {
    try {
      if (navigator.share) {
        const res = await fetch(shot.src);
        const blob = await res.blob();
        const file = new File([blob], shot.fileName || 'screenshot.png', { type: blob.type });
        await navigator.share({ files: [file], title: shot.name });
      } else {
        await copyImage();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('Share failed', err);
    }
  }

  function saveImage() {
    const a = document.createElement('a');
    a.href = shot.src;
    a.download = shot.fileName || `${shot.name}.png`;
    a.click();
  }

  if (!shot) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
    >
      <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-3 shrink-0">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold truncate text-white/90">{shot.name}</p>
          <p className="text-[11px] text-white/40">
            {index + 1} / {shots.length}
            {meta.w ? ` · ${meta.w}×${meta.h}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {[
            { icon: ZoomOut, label: 'Zoom out', action: () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2))) },
            { icon: null, label: `${Math.round(zoom * 100)}%`, action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
            { icon: ZoomIn, label: 'Zoom in', action: () => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2))) },
            { icon: RotateCcw, label: 'Reset', action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
            { icon: Info, label: 'Info', action: () => setShowInfo((v) => !v), active: showInfo },
            { icon: copied ? Check : Copy, label: 'Copy', action: copyImage },
            { icon: Download, label: 'Save', action: saveImage },
            { icon: Share2, label: 'Share', action: shareImage },
            { icon: Trash2, label: 'Delete', action: () => onDelete(shot), danger: true },
            { icon: X, label: 'Close', action: onClose },
          ].map((b, i) => (
            <button
              key={i}
              type="button"
              title={b.label}
              onClick={b.action}
              className="flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-[11px] font-semibold transition hover:bg-white/10"
              style={{
                color: b.danger ? '#f87171' : b.active ? accent.hex : 'rgba(255,255,255,0.75)',
                backgroundColor: b.active ? `${accent.hex}22` : 'transparent',
              }}
            >
              {b.icon ? <b.icon size={15} /> : b.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center select-none"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onWheel={onWheel}
      >
        {index > 0 && (
          <button type="button" onClick={() => onNavigate(-1)}
            className="absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-white/70 transition hover:bg-white/10 hover:text-white">‹</button>
        )}
        {index < shots.length - 1 && (
          <button type="button" onClick={() => onNavigate(1)}
            className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-white/70 transition hover:bg-white/10 hover:text-white">›</button>
        )}

        <img
          key={shot.src}
          src={shot.src}
          alt={shot.name}
          onLoad={onImgLoad}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="max-h-[calc(80vh-140px)] max-w-[90vw] rounded-3xl object-contain shadow-2xl will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
            transition: dragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative z-10 mx-auto mb-20 w-full max-w-lg rounded-2xl border px-5 py-5"
            style={{ backgroundColor: `${theme.surface}ee`, borderColor: theme.border, color: theme.text }}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-40">Filename</p>
                <p className="font-medium truncate">{shot.fileName || shot.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-40">Date</p>
                <p className="font-medium">{formatDate(shot.mtime)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-40">Resolution</p>
                <p className="font-medium">{meta.w ? `${meta.w} × ${meta.h}` : '…'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-40">Size</p>
                <p className="font-medium">{formatBytes(shot.size)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
  const [sortBy, setSortBy] = useState('date-desc');
  const [tileSize, setTileSize] = useState('md');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [ctxMenu, setCtxMenu] = useState(null);

  const game = GAMES.find((g) => g.id === selectedGameId) ?? GAMES[0];

  const loadShots = useCallback(() => {
    setLoading(true);
    const api = window.launcherAPI?.screenshots;
    if (!api?.getAll) {
      setShots([]);
      setLoading(false);
      return;
    }
    api.getAll(game.folderKey)
      .then((list) => setShots(Array.isArray(list) ? list : []))
      .catch(() => setShots([]))
      .finally(() => setLoading(false));
  }, [game.folderKey]);

  useEffect(() => {
    setLightboxIndex(null);
    setSelected(new Set());
    setSelectMode(false);
    loadShots();
  }, [selectedGameId, loadShots]);

  const sorted = useMemo(() => {
    const list = [...shots];
    switch (sortBy) {
      case 'date-asc':  return list.sort((a, b) => (a.mtime || 0) - (b.mtime || 0));
      case 'name-asc':  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-desc': return list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      default:          return list.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    }
  }, [shots, sortBy]);

  function toggleSelect(fileName) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  }

  async function deleteShots(fileNames) {
    const list = Array.isArray(fileNames) ? fileNames : [fileNames];
    if (!list.length) return;
    const ok = window.confirm(list.length === 1 ? `Delete "${list[0]}"?` : `Delete ${list.length} screenshots?`);
    if (!ok) return;
    const res = await window.launcherAPI?.screenshots?.delete?.(game.folderKey, list);
    if (res?.ok !== false) {
      setShots((prev) => prev.filter((s) => !list.includes(s.fileName)));
      setSelected((prev) => {
        const next = new Set(prev);
        list.forEach((f) => next.delete(f));
        return next;
      });
      setLightboxIndex(null);
    }
  }

  function bulkDownload() {
    sorted.filter((s) => selected.has(s.fileName)).forEach((s, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = s.src;
        a.download = s.fileName || `${s.name}.png`;
        a.click();
      }, i * 150);
    });
  }

  function openFolder() {
    window.launcherAPI?.screenshots?.openFolder?.(game.folderKey);
  }

  const ctxActions = ctxMenu ? [
    { icon: Maximize2, label: 'Open', action: () => {
      const i = sorted.findIndex((s) => s.fileName === ctxMenu.shot.fileName);
      if (i >= 0) setLightboxIndex(i);
    }},
    { icon: Copy, label: 'Copy image', action: async () => {
      try {
        const res = await fetch(ctxMenu.shot.src);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      } catch { /* ignore */ }
    }},
    { icon: Download, label: 'Save', action: () => {
      const a = document.createElement('a');
      a.href = ctxMenu.shot.src;
      a.download = ctxMenu.shot.fileName;
      a.click();
    }},
    { icon: Share2, label: 'Share', action: async () => {
      try {
        if (navigator.share) {
          const res = await fetch(ctxMenu.shot.src);
          const blob = await res.blob();
          await navigator.share({
            files: [new File([blob], ctxMenu.shot.fileName, { type: blob.type })],
            title: ctxMenu.shot.name,
          });
        }
      } catch { /* ignore */ }
    }},
    { divider: true },
    { icon: Trash2, label: 'Delete', danger: true, action: () => deleteShots([ctxMenu.shot.fileName]) },
  ] : [];

  return (
    <div className="relative h-full overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {backgroundVideoSrc && (
        <video ref={videoRef} src={backgroundVideoSrc} autoPlay muted loop playsInline
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.8]" />
      )}
      <div className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: `linear-gradient(to bottom, ${theme.bg}cc 0%, ${theme.bg}88 40%, ${theme.bg}cc 100%)` }} />

      <div className="px-9 py-7">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="font-['Manrope'] text-3xl font-bold tracking-tight" style={{ color: theme.text }}>Screenshots</h2>
            <p className="mt-1 text-sm opacity-40">Official captures from Zyphor Studio titles.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GameSelector games={GAMES} selected={selectedGameId} onSelect={setSelectedGameId} accent={accent} theme={theme} />
            <button type="button" onClick={loadShots} title="Refresh" className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-80"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={openFolder} title="Open folder" className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-80"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}>
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        {game.status === 'released' && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 mb-4"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <span className="text-[11px] opacity-40 px-1">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none"
                style={{ backgroundColor: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>

              <div className="h-5 w-px mx-1" style={{ backgroundColor: theme.border }} />
              <span className="text-[11px] opacity-40 px-1">Size</span>
              {[
                { id: 'sm', icon: Minimize2, label: 'Small' },
                { id: 'md', icon: Image, label: 'Medium' },
                { id: 'lg', icon: Maximize2, label: 'Large' },
              ].map((t) => (
                <button key={t.id} type="button" title={t.label} onClick={() => setTileSize(t.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition"
                  style={{
                    backgroundColor: tileSize === t.id ? `${accent.hex}22` : 'transparent',
                    color: tileSize === t.id ? accent.hex : `${theme.text}66`,
                  }}>
                  <t.icon size={14} />
                </button>
              ))}

              <div className="h-5 w-px mx-1" style={{ backgroundColor: theme.border }} />
              <button type="button"
                onClick={() => { setSelectMode((v) => !v); if (selectMode) setSelected(new Set()); }}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition"
                style={{
                  backgroundColor: selectMode ? `${accent.hex}22` : 'transparent',
                  color: selectMode ? accent.hex : theme.text,
                  border: `1px solid ${selectMode ? accent.hex + '44' : theme.border}`,
                }}>
                {selectMode ? 'Cancel select' : 'Select'}
              </button>

              {selectMode && (
                <>
                  <button type="button" onClick={() => setSelected(new Set(sorted.map((s) => s.fileName)))}
                    className="text-[12px] opacity-60 hover:opacity-100 px-2">All</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-[12px] opacity-60 hover:opacity-100 px-2">None</button>
                  <span className="text-[11px] opacity-40">{selected.size} selected</span>
                  <button type="button" disabled={selected.size === 0} onClick={bulkDownload}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-30"
                    style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}>
                    <Download size={12} /> Download
                  </button>
                  <button type="button" disabled={selected.size === 0} onClick={() => deleteShots([...selected])}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-30 text-red-400 hover:bg-red-500/10">
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}

              <span className="ml-auto text-[11px] opacity-30 font-mono">
                {loading ? '…' : `${sorted.length} shot${sorted.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {!loading && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 rounded-[2.5rem] border opacity-80 gap-1"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <AlertTriangle size={40} className="mb-3 opacity-20" />
                <p className="text-[15px] font-semibold" style={{ color: theme.text }}>No screenshots found</p>
                <p className="text-[13px] opacity-40 mt-1.5 text-center max-w-sm">
                  Press <code className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                    style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}>F2</code> in-game to capture a moment. Your screenshots will appear here automatically.
                </p>
                <button type="button" onClick={openFolder}
                  className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold"
                  style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}>
                  <FolderOpen size={13} /> Open screenshots folder
                </button>
              </div>
            )}

            {loading && (
              <div className={`grid ${TILE_SIZES[tileSize]} gap-3`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-2xl animate-pulse"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }} />
                ))}
              </div>
            )}

            {!loading && sorted.length > 0 && (
              <div className={`grid ${TILE_SIZES[tileSize]} gap-3`}>
                {sorted.map((shot, i) => {
                  const isSel = selected.has(shot.fileName);
                  return (
                    <motion.button
                      key={shot.fileName || shot.src}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25), duration: 0.18 }}
                      onClick={() => {
                        if (selectMode) toggleSelect(shot.fileName);
                        else setLightboxIndex(i);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, shot });
                      }}
                      className="group relative aspect-video overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                      style={{
                        borderColor: isSel ? accent.hex : theme.border,
                        backgroundColor: theme.surface,
                        boxShadow: isSel ? `0 0 0 2px ${accent.hex}55` : undefined,
                      }}
                    >
                      <img src={shot.src} alt={shot.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-[11px] font-medium text-white/90 truncate max-w-[70%]">{shot.name}</span>
                        <ZoomIn size={13} className="text-white/70 shrink-0" />
                      </div>
                      {selectMode && (
                        <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-md border"
                          style={{
                            backgroundColor: isSel ? accent.hex : 'rgba(0,0,0,0.45)',
                            borderColor: isSel ? accent.hex : 'rgba(255,255,255,0.3)',
                          }}>
                          {isSel && <Check size={11} color={accent.on || '#000'} />}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}
            actions={ctxActions} theme={theme} accent={accent} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxIndex != null && sorted[lightboxIndex] && (
          <Lightbox
            shot={sorted[lightboxIndex]}
            shots={sorted}
            index={lightboxIndex}
            accent={accent}
            theme={theme}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(dir) => {
              setLightboxIndex((i) => {
                const next = i + dir;
                if (next < 0 || next >= sorted.length) return i;
                return next;
              });
            }}
            onDelete={(shot) => deleteShots([shot.fileName])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

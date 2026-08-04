import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import VIDEO_GAMING from './videos/Gaming.mp4';
import VIDEO_DRAGON_TRAVELLER from './videos/Xuanwu - Dragon Traveler.mp4';
import VIDEO_LUCY from './videos/Lucy Cyberpunk.mp4';
import VIDEO_FOREST from './videos/Forest Cafe.mp4';
import VIDEO_KALTSIT from './videos/Kaltsit.mp4';
/**
 * Add these once to your index.html <head> (or import via CSS @import) so the
 * type treatment below renders correctly:
 *
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 *
 * Manrope carries the display/headings, Inter carries labels and body text.
 * Nothing here uses a monospace face anymore.
 */

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: IconAppearance },
  { id: 'behavior',   label: 'Behavior',   icon: IconBehavior },
  { id: 'privacy',    label: 'Privacy',     icon: IconPrivacy },
  { id: 'storage',    label: 'Storage',     icon: IconStorage },
  { id: 'advanced',   label: 'Advanced',    icon: IconAdvanced },
  { id: 'about',      label: 'About',       icon: IconAbout },
];

const BG_VIDEO_PRESETS = [
  { id: 'preset-gaming',    label: 'Gaming' },
  { id: 'preset-dragon-traveller', label: 'Dragon Traveller' },
  { id: 'preset-lucy',      label: 'Lucy Cyberpunk' },
  { id: 'preset-forest',    label: 'Forest Cafe' },
  { id: 'preset-kaltsit',   label: 'Kaltsit' },
];

const PRESET_VIDEO_MAP = {
  'preset-gaming': VIDEO_GAMING,
  'preset-dragon-traveller': VIDEO_DRAGON_TRAVELLER,
  'preset-lucy': VIDEO_LUCY,
  'preset-forest': VIDEO_FOREST,
  'preset-kaltsit': VIDEO_KALTSIT,
};

// Shows the launcher's own installation folder -- read-only, fetched from main process.
function LauncherPathRow({ theme }) {
  const [launcherPath, setLauncherPath] = useState('Loading...');

  useEffect(() => {
    window.launcherAPI?.getLauncherPath?.()
      .then((p) => setLauncherPath(p || 'Unknown'))
      .catch(() => setLauncherPath('Unknown'));
  }, []);

  function copyPath() { navigator.clipboard.writeText(launcherPath); }

  function openFolder() {
    if (launcherPath && launcherPath !== 'Unknown' && launcherPath !== 'Loading...') {
      window.launcherAPI?.openExternal?.('file:///' + launcherPath.replace(/\\/g, '/'));
    }
  }

  return (
    <div className="px-5 pt-4 pb-2">
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
        style={{ borderColor: theme.border, backgroundColor: `${theme.bg}99` }}
      >
        <IconFolder className="h-3.5 w-3.5 shrink-0 text-ash/50" />
        <span className="flex-1 truncate text-[12px] text-bone/80 font-mono" title={launcherPath}>
          {launcherPath}
        </span>
        <button type="button" onClick={copyPath}
          className="shrink-0 rounded-md p-1 text-ash/50 hover:text-bone transition-colors"
          title="Copy path">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button type="button" onClick={openFolder}
          className="shrink-0 rounded-md p-1 text-ash/50 hover:text-bone transition-colors"
          title="Open in Explorer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ash/50">Zyphor Launcher installation folder.</p>
    </div>
  );
}


export default function SettingsPage() {
  const {
    settings,
    update,
    status,
    resetAll,
    diskItems,
    diskTotalMB,
    diskFreeMB,
    diskStatus,
    refreshDiskUsage,
    toggleItemSelected,
    uninstallSelected,
    pickInstallLocation,
  } = useSettings();
  const [activeSection, setActiveSection] = useState('appearance');
  const [toast, setToast] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [cacheSize, setCacheSize] = useState(128);
  const [sortBy, setSortBy] = useState('size');
  const [customVideoUrl, setCustomVideoUrl] = useState(null);
  const bgVideoInputRef = useRef(null);
  const carouselRef = useRef(null);
  const [updateState, setUpdateState] = useState('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo]   = useState(null);
  const [scanState, setScanState] = useState({}); // { [key]: 'idle'|'scanning'|'done'|'error' }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center text-ash">
        <p className="font-['Inter'] text-sm text-ash/70">Loading settings…</p>
      </div>
    );
  }

  const theme = THEMES[settings.theme] || THEMES.oled;
  const accent = ACCENTS[settings.accent] || ACCENTS.bulb;
  const motionOn = settings.animations && !settings.reduceMotion;

  const items = diskItems ?? [];
  const sortedItems = [...items].sort((a, b) =>
    sortBy === 'size' ? b.sizeMB - a.sizeMB : a.name.localeCompare(b.name)
  );
  const instancesMB = items.filter((i) => i.instance).reduce((s, i) => s + i.sizeMB, 0);
  const sharedMB = items.reduce((s, i) => s + i.sizeMB, 0) - instancesMB;
  const selectedCount = items.filter((i) => i.selected).length;
  const hasDiskTotals = diskTotalMB != null && diskFreeMB != null;

  function clearCache() {
    setCacheSize(0);
    setToast('Download cache cleared');
  }

  // Native picker (real file path, persists across restarts) when running in
  // Electron; falls back to a browser <input type=file> + object URL for
  // preview when launcherAPI isn't available (e.g. viewing this in a
  // plain browser). The fallback preview won't survive a reload.
  async function chooseCustomBackgroundVideo() {
    if (window.launcherAPI?.pickVideoFile) {
      const filePath = await window.launcherAPI.pickVideoFile();
      if (!filePath) return;
      const name = filePath.split(/[\\/]/).pop();
      update({ backgroundVideoType: 'custom', backgroundVideoPath: filePath, backgroundVideoName: name });
      setCustomVideoUrl(null);
      setToast('Custom background video set');
      return;
    }
    bgVideoInputRef.current?.click();
  }

  function handleBackgroundVideoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
    update({ backgroundVideoType: 'custom', backgroundVideoPath: null, backgroundVideoName: file.name });
    setToast('Custom background video set (preview only until launcherAPI.pickVideoFile is wired up)');
    e.target.value = '';
  }

  useEffect(() => {
  window.launcherAPI?.onUpdateAvailable?.((info) => {
    setUpdateState('available');
    setUpdateInfo(info);
  });
  window.launcherAPI?.onUpToDate?.(() => setUpdateState('up-to-date'));
  window.launcherAPI?.onUpdateDownloaded?.(() => setUpdateState('downloaded'));
  window.launcherAPI?.onUpdaterError?.(() => setUpdateState('error'));
  window.launcherAPI?.onDownloadProgress?.((p) => {
    setUpdateState('downloading');
    setDownloadProgress(Math.round(p.percent ?? 0));
  });
}, []);

async function handleCheckUpdate() {
  setUpdateState('checking');
  try {
    const result = await window.launcherAPI?.checkForUpdates?.();
    if (result?.error) {
      setUpdateState('error');
      setToast(result.error);
      return;
    }
    // If events arrive they will overwrite this; otherwise fall back after a few seconds
  } catch {
    setUpdateState('error');
    setToast('Update check failed');
    return;
  }
  setTimeout(() => {
    setUpdateState((s) => (s === 'checking' ? 'up-to-date' : s));
  }, 8000);
}

  function setDefaultBackgroundVideo() {
    setCustomVideoUrl(null);
    update({ backgroundVideoType: 'default', backgroundVideoPath: null, backgroundVideoName: null });
    setToast('Using default background video');
  }

  function disableBackgroundVideo() {
    setCustomVideoUrl(null);
    update({ backgroundVideoType: 'none', backgroundVideoPath: null, backgroundVideoName: null });
    setToast('Background video disabled');
  }

    const previewSrc =
    settings.backgroundVideoType === 'none' ? null
    : settings.backgroundVideoType === 'custom'
      ? (settings.backgroundVideoPath ? `file://${settings.backgroundVideoPath}` : customVideoUrl)
    : settings.backgroundVideoType?.startsWith('preset-')
      ? PRESET_VIDEO_MAP[settings.backgroundVideoType]
    : DEFAULT_BACKGROUND_VIDEO;


  async function openLogsFolder() {
    if (window.launcherAPI?.openLogsFolder) {
      try {
        await window.launcherAPI.openLogsFolder();
        setToast('Logs folder opened');
      } catch {
        setToast('Could not open logs folder');
      }
    } else {
      setToast('Logs folder opened');
    }
  }

  function exportSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stay-launcher-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    setToast('Settings exported');
  }

  function importSettings(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        update(parsed);
        setToast('Settings imported');
      } catch {
        setToast('That file could not be read');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    resetAll();
    setConfirmingReset(false);
    setToast('Settings reset to defaults');
  }

  return (
    <div
      className="flex h-full font-['Inter']"
      style={{ backgroundColor: theme.bg, '--accent': accent.hex, '--accent-on': accent.on }}
    >
      {/* Left section nav */}
      <div className="w-56 shrink-0 border-r px-4 py-7" style={{ borderColor: theme.border }}>
        <h2 className="mb-6 px-2 font-['Manrope'] text-xl font-bold tracking-tight text-bone">
          Settings
        </h2>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                style={active ? { backgroundColor: accent.hex, color: accent.on } : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                  active ? 'font-extrabold' : 'text-ash hover:bg-white/[0.04] hover:text-bone'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? '' : 'text-ash/70'}`}
                  style={{ color: active ? accent.on : undefined }}
                />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 px-2">
          <StatusPill status={status} />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-y-auto px-8 py-7" style={{ backgroundColor: theme.surface }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={motionOn ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -8 } : {}}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
        {activeSection === 'appearance' && (
          <Section title="Appearance" description="How the launcher looks on your screen.">
          {/* Two-column layout: settings left, preview right */}
          <div className="col-span-full flex gap-6 items-start">

            {/* LEFT — all settings + carousel */}
            <div className="flex-1 min-w-0 flex flex-col gap-3" style={{ maxWidth: '680px' }}>

            <SettingRow label="Theme" hint="OLED Black is the default and recommended.">
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2" style={{ maxWidth: '100%' }}>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      title={t.label ?? key}
                      onClick={() => { update({ theme: key }); setToast(`Theme: ${t.label ?? key}`); }}
                      className="h-7 w-7 rounded-full transition-all duration-150"
                      style={{
                        backgroundColor: t.bg,
                        border: `1.5px solid ${t.border}`,
                        boxShadow: settings.theme === key ? `0 0 0 2px ${accent.hex}` : 'none',
                        transform: settings.theme === key ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-ash/60">{THEMES[settings.theme]?.label ?? settings.theme}</span>
              </div>
            </SettingRow>

            <SettingRow label="Accent color">
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-3" style={{ maxWidth: '260px' }}>
                  {Object.entries(ACCENTS).map(([key, a]) => (
                    <button
                      key={key}
                      type="button"
                      title={a.label}
                      onClick={() => { update({ accent: key }); setToast(`Accent: ${a.label}`); }}
                      className="h-7 w-7 rounded-full transition-all duration-150"
                      style={{
                        backgroundColor: a.hex,
                        boxShadow: settings.accent === key ? `0 0 0 2px ${theme.surface}, 0 0 0 4px ${a.hex}` : 'none',
                        transform: settings.accent === key ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-ash/60">{accent.label}</span>
              </div>
            </SettingRow>

            <SettingRow label="UI scale">
              <Dropdown
                value={settings.uiScale}
                onChange={(v) => update({ uiScale: v })}
                theme={theme}
                accent={accent}
                options={[
                  { value: '90', label: '90%' },
                  { value: '100', label: '100%' },
                  { value: '110', label: '110%' },
                  { value: '125', label: '125%' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Text size">
              <Dropdown
                value={settings.fontSize}
                onChange={(v) => update({ fontSize: v })}
                theme={theme}
                accent={accent}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Show animations">
              <Toggle checked={settings.animations} onChange={(checked) => update({ animations: checked })} />
            </SettingRow>

            <SettingRow label="Reduce motion" hint="Minimizes transitions for motion sensitivity.">
              <Toggle checked={settings.reduceMotion} onChange={(checked) => update({ reduceMotion: checked })} />
            </SettingRow>
            {/* ── Background video carousel ── */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-bone/90">Background video</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { carouselRef.current?.scrollBy({ left: -180, behavior: 'smooth' }); }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => { carouselRef.current?.scrollBy({ left: 180, behavior: 'smooth' }); }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>

                {/* Scrollable strip */}
                <div
                  ref={carouselRef}
                  style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}
                >
                  {[{ id: 'default', label: 'Default', src: DEFAULT_BACKGROUND_VIDEO },
                    ...BG_VIDEO_PRESETS.map(p => ({ ...p, src: PRESET_VIDEO_MAP[p.id] })),
                    { id: 'none', label: 'None', src: null },
                  ].map((opt) => {
                    const isActive = (settings.backgroundVideoType ?? 'default') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (opt.id === 'none') { disableBackgroundVideo(); return; }
                          if (opt.id === 'default') { setDefaultBackgroundVideo(); return; }
                          setCustomVideoUrl(null);
                          update({ backgroundVideoType: opt.id, backgroundVideoPath: null, backgroundVideoName: opt.label });
                          setToast(`Background: ${opt.label}`);
                        }}
                        style={{
                          flexShrink: 0,
                          width: '180px',
                          borderRadius: '10px',
                          border: isActive ? `2px solid ${accent.hex}` : '2px solid rgba(255,255,255,0.08)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          padding: 0,
                          background: 'transparent',
                          position: 'relative',
                          transition: 'border-color 150ms',
                          boxShadow: isActive ? `0 0 0 1px ${accent.hex}33` : 'none',
                        }}
                      >
                        <div style={{ width: '100%', height: '90px', position: 'relative', background: '#0a0a0a', overflow: 'hidden' }}>
                          {opt.src ? (
                            <video
                              src={opt.src}
                              muted
                              playsInline
                              preload="none"
                              onMouseEnter={e => e.currentTarget.play()}
                              onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#111,#0a0a0a)' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
                                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5"/>
                                <path d="M9 9l6 3-6 3V9z" fill="white"/>
                                <line x1="4" y1="4" x2="20" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
                          {isActive && <div style={{ position: 'absolute', inset: 0, background: `${accent.hex}22` }} />}
                          {isActive && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', background: accent.hex, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke={accent.on} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '5px 7px 6px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          <p style={{ fontSize: '11px', fontWeight: 500, color: isActive ? accent.hex : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {opt.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom tile */}
                  <button
                    type="button"
                    onClick={chooseCustomBackgroundVideo}
                    style={{
                      flexShrink: 0,
                      width: '180px',
                      borderRadius: '10px',
                      border: settings.backgroundVideoType === 'custom' ? `2px solid ${accent.hex}` : '2px dashed rgba(255,255,255,0.15)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      padding: 0,
                      background: 'transparent',
                      position: 'relative',
                      transition: 'border-color 150ms',
                    }}
                  >
                    <div style={{ width: '100%', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: settings.backgroundVideoType === 'custom' ? `${accent.hex}15` : 'rgba(255,255,255,0.02)', position: 'relative' }}>
                      {settings.backgroundVideoType === 'custom' && (customVideoUrl || settings.backgroundVideoPath) ? (
                        <video
                          src={settings.backgroundVideoPath ? `file://${settings.backgroundVideoPath}` : customVideoUrl}
                          muted
                          playsInline
                          preload="none"
                          onMouseEnter={e => e.currentTarget.play()}
                          onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, position: 'absolute', inset: 0 }}
                        />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      )}
                    </div>
                    <div style={{ padding: '5px 7px 6px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: settings.backgroundVideoType === 'custom' ? accent.hex : 'rgba(255,255,255,0.4)', margin: 0 }}>
                        {settings.backgroundVideoType === 'custom' && settings.backgroundVideoName ? settings.backgroundVideoName : 'Custom…'}
                      </p>
                    </div>
                  </button>
                  <input ref={bgVideoInputRef} type="file" accept="video/mp4,video/webm" onChange={handleBackgroundVideoFile} className="hidden" />
                </div>
              </div>
            </div>{/* end LEFT col */}

            {/* RIGHT — preview panel, fixed width, aspect-ratio locked */}
            <div
              className="w-[55%] shrink-0 overflow-hidden rounded-xl border"
              style={{ borderColor: theme.border, backgroundColor: theme.bg }}
            >
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: theme.border }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ash/60">Preview</p>
                {settings.backgroundVideoType === 'custom' && !settings.backgroundVideoPath && !customVideoUrl && (
                  <p className="text-[10px] text-ash/40">No file</p>
                )}
              </div>
              {/* 16:9 box — video fits inside without cropping */}
              <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
                {previewSrc ? (
                  <video
                    key={previewSrc}
                    src={previewSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.bg})` }}
                  >
                    <p className="text-[11px] text-ash/40">No background video</p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <p className="text-[10px] font-medium text-bone/80">
                    {settings.backgroundVideoType === 'none'
                      ? 'Off'
                      : settings.backgroundVideoType === 'custom'
                      ? settings.backgroundVideoName || 'Custom video'
                      : settings.backgroundVideoType?.startsWith('preset-')
                      ? BG_VIDEO_PRESETS.find(p => p.id === settings.backgroundVideoType)?.label ?? 'Preset'
                      : 'Default'}
                  </p>
                </div>
              </div>
            </div>{/* end RIGHT col */}

          </div>{/* end col-span-full flex */}
          </Section>
        )}

        {activeSection === 'behavior' && (
          <Section title="Behavior" description="How the launcher runs on your machine.">
            <SettingRow label="Launch on startup" hint="Start the launcher when Windows starts.">
              <Toggle
                checked={settings.launchOnStartup}
                onChange={(checked) => update({ launchOnStartup: checked })}
                />
            </SettingRow>

            <SettingRow label="Minimize to tray" hint="Keep the launcher running in the system tray.">
              <Toggle
                checked={settings.minimizeToTray}
                onChange={(checked) => update({ minimizeToTray: checked })}
              />
            </SettingRow>

            <SettingRow label="Close to tray" hint="Closing the window sends it to the tray instead of quitting.">
              <Toggle checked={settings.closeToTray} onChange={(checked) => update({ closeToTray: checked })} />
            </SettingRow>

            <SettingRow label="Hardware acceleration">
              <Toggle
                checked={settings.hardwareAcceleration}
                onChange={(checked) => update({ hardwareAcceleration: checked })}
              />
            </SettingRow>

            <SettingRow label="Desktop notifications" hint="Update and news alerts.">
              <Toggle
                checked={settings.desktopNotifications}
                onChange={(checked) => update({ desktopNotifications: checked })}
              />
            </SettingRow>

            <SettingRow label="Automatic updates">
              <Toggle checked={settings.autoUpdate} onChange={(checked) => update({ autoUpdate: checked })} />
            </SettingRow>

            <SettingRow label="Update channel">
              <Dropdown
                value={settings.updateChannel}
                onChange={(v) => update({ updateChannel: v })}
                theme={theme}
                accent={accent}
                options={[
                  { value: 'stable', label: 'Stable' },
                  { value: 'beta', label: 'Beta' },
                ]}
              />
            </SettingRow>
          </Section>
        )}

        {activeSection === 'privacy' && (
          <Section title="Privacy" description="Control what STAY checks, scans, and reports.">

            {/* Game integrity */}
            <div className="col-span-full">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Game integrity</p>
            </div>

            <SettingRow label="Verify game files" hint="Scans your install folder and cross-checks file hashes against the manifest.">
              <ScanButton
                state={scanState.gameFiles}
                onScan={async () => {
                  setScanState(s => ({ ...s, gameFiles: 'scanning' }));
                  await new Promise(r => setTimeout(r, 2200));
                  const ok = await window.launcherAPI?.verifyGameFiles?.() ?? true;
                  setScanState(s => ({ ...s, gameFiles: ok ? 'done' : 'error' }));
                  setToast(ok ? 'Game files verified — all good' : 'Some files failed verification');
                }}
                doneLabel="Verified"
                scanLabel="Verify now"
                accent={accent}
              />
            </SettingRow>

            <SettingRow label="Locate STAY.exe via Steam" hint="Searches your Steam library paths for STAY.exe. Useful if you moved the install.">
              <ScanButton
                state={scanState.steamExe}
                onScan={async () => {
                  setScanState(s => ({ ...s, steamExe: 'scanning' }));
                  await new Promise(r => setTimeout(r, 1800));
                  const path = await window.launcherAPI?.findSteamExe?.() ?? null;
                  setScanState(s => ({ ...s, steamExe: path ? 'done' : 'error' }));
                  setToast(path ? `Found: ${path}` : 'STAY.exe not found in Steam library');
                }}
                doneLabel="Found"
                scanLabel="Search Steam"
                accent={accent}
              />
            </SettingRow>

            <SettingRow label="Malware scan" hint="Runs a quick hash check of launcher binaries against known-good signatures.">
              <ScanButton
                state={scanState.malware}
                onScan={async () => {
                  setScanState(s => ({ ...s, malware: 'scanning' }));
                  await new Promise(r => setTimeout(r, 2800));
                  const clean = await window.launcherAPI?.runMalwareScan?.() ?? true;
                  setScanState(s => ({ ...s, malware: clean ? 'done' : 'error' }));
                  setToast(clean ? 'No threats detected' : 'Suspicious files found — check logs');
                }}
                doneLabel="Clean"
                scanLabel="Scan now"
                accent={accent}
                dangerOnError
              />
            </SettingRow>

            {/* Data & analytics */}
            <div className="col-span-full mt-2">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Data &amp; analytics</p>
            </div>

            <SettingRow label="User analytics" hint="Shares anonymous usage data to help improve the launcher experience.">
              <Toggle
                checked={settings.userAnalytics ?? false}
                onChange={(checked) => { update({ userAnalytics: checked }); setToast(checked ? 'Analytics enabled' : 'Analytics disabled'); }}
              />
            </SettingRow>

            <SettingRow label="Crash reports" hint="Automatically sends crash logs so issues can be investigated faster.">
              <Toggle
                checked={settings.crashReports ?? true}
                onChange={(checked) => { update({ crashReports: checked }); setToast(checked ? 'Crash reports enabled' : 'Crash reports disabled'); }}
              />
            </SettingRow>

            <SettingRow label="Hardware diagnostics" hint="Sends GPU, CPU, and RAM info alongside crash reports.">
              <Toggle
                checked={settings.hardwareId}
                onChange={(checked) => { update({ hardwareId: checked }); setToast(checked ? 'Hardware diagnostics on' : 'Hardware diagnostics off'); }}
              />
            </SettingRow>

            <SettingRow label="Personalised news &amp; offers" hint="Shows content tailored to your play history in the launcher home screen.">
              <Toggle
                checked={settings.personalisedContent ?? true}
                onChange={(checked) => { update({ personalisedContent: checked }); setToast(checked ? 'Personalised content on' : 'Personalised content off'); }}
              />
            </SettingRow>

            {/* Session */}
            <div className="col-span-full mt-2">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Session</p>
            </div>

            <SettingRow label="Remember login" hint="Keeps you signed in between launcher restarts.">
              <Toggle
                checked={settings.rememberLogin ?? true}
                onChange={(checked) => { update({ rememberLogin: checked }); setToast(checked ? 'Login will be remembered' : 'Login will not be remembered'); }}
              />
            </SettingRow>

            <SettingRow label="Clear session data" hint="Signs you out and removes all cached login tokens.">
              <ActionButton
                variant="danger"
                onClick={() => {
                  window.launcherAPI?.clearSession?.();
                  setToast('Session data cleared');
                }}
              >
                Clear now
              </ActionButton>
            </SettingRow>

          </Section>
        )}

        {activeSection === 'storage' && (
          <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-['Manrope'] text-lg font-bold tracking-tight text-bone">Storage</h3>
                <p className="mt-0.5 text-[13px] text-ash/60">See where disk space is used and remove instances</p>
              </div>
              <button
                type="button"
                onClick={refreshDiskUsage}
                disabled={diskStatus === 'loading'}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-medium text-ash transition-colors hover:text-bone disabled:cursor-wait disabled:opacity-60"
                style={{ borderColor: theme.border }}
              >
                {diskStatus === 'loading' ? 'Scanning…' : 'Rescan'}
              </button>
            </div>

            {diskStatus === 'unavailable' && (
              <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: theme.border }}>
                <p className="text-[13px] font-medium text-bone/80">Storage info isn't available</p>
                <p className="mt-1 text-[12px] text-ash/50">
                  Needs <code className="text-ash/70">getDiskItems</code> / <code className="text-ash/70">getDiskSpace</code> APIs.
                </p>
              </div>
            )}

            {diskStatus === 'error' && (
              <div className="rounded-xl border p-5 text-center" style={{ borderColor: theme.border }}>
                <p className="text-[13px] font-medium text-rust">Couldn't read disk usage</p>
                <p className="mt-1 text-[12px] text-ash/50">Check that the install folder still exists, then rescan.</p>
              </div>
            )}

            {(diskStatus === 'ready' || diskStatus === 'loading') && (
              <>
                {/* Location card */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.border }}>
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: theme.border }}>
                        <IconStorage className="h-4 w-4 text-bone" />
                      </div>
                      <p className="text-[13px] font-semibold text-bone">Location</p>
                    </div>
                    <span className="text-[12px] font-medium text-ash/60">
                      {hasDiskTotals
                        ? `${(diskFreeMB / 1024).toFixed(1)} GB free of ${(diskTotalMB / 1024).toFixed(1)} GB`
                        : 'Calculating…'}
                    </span>
                  </div>

                  {/* Launcher path row */}
                  <LauncherPathRow theme={theme} accent={accent} />

                  {/* Usage bar */}
                  {hasDiskTotals && (() => {
                    const usedMB = diskTotalMB - diskFreeMB;
                    const launcherMB = items.reduce((s, i) => s + i.sizeMB, 0);
                    const usedPct = Math.min((usedMB / diskTotalMB) * 100, 100);
                    const launcherPct = Math.min((launcherMB / diskTotalMB) * 100, 100);
                    const usedColor = usedPct > 85 ? '#e05252' : usedPct > 65 ? '#e8a23a' : accent.hex;
                    return (
                    <div className="px-5 pb-5 pt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="flex h-full">
                          {/* total used space on drive */}
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${usedPct}%`, backgroundColor: usedColor }}
                          />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-5 text-[11px]">
                        <LegendDot color={usedColor} label="Used" value={`${(usedMB / 1024).toFixed(1)} GB`} />
                        <LegendDot color={accent.hex} label="Launcher" value={`${launcherMB.toFixed(0)} MB`} />
                        <LegendDot color="rgba(255,255,255,0.2)" label="Free" value={`${(diskFreeMB / 1024).toFixed(1)} GB`} />
                      </div>
                    </div>
                    );
                  })()}
                </div>

                {/* Items list */}
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-bone">
                      Items <span className="ml-1 text-ash/50">{items.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Dropdown
                        value={sortBy}
                        onChange={setSortBy}
                        theme={theme}
                        accent={accent}
                        className="w-36"
                        options={[
                          { value: 'size', label: 'Size on disk' },
                          { value: 'name', label: 'Name' },
                        ]}
                      />

                    </div>
                  </div>

                  {items.length === 0 && diskStatus === 'ready' && (
                    <p className="mt-3 text-[12px] text-ash/50">
                      Nothing found — try Rescan after the game finishes installing.
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    {sortedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:border-white/10"
                        style={{ borderColor: theme.border, backgroundColor: `${theme.bg}55` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon — use game thumbnail if available, else box icon */}
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden"
                            style={{ backgroundColor: theme.border }}
                          >
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <IconBox className="h-4 w-4 text-ash" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-bone/90 truncate">{item.name}</p>
                              {item.required && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ash/50">
                                  <IconLock className="h-2.5 w-2.5" /> Required
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-ash/40 truncate">
                              {item.path}
                              {item.lastPlayed && (
                                <span className="ml-2">Last played {item.lastPlayed}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 ml-4">
                          <span className="text-[13px] font-medium text-bone/70 tabular-nums">
                            {item.sizeMB >= 1000
                              ? `${(item.sizeMB / 1024).toFixed(1)} GB`
                              : item.sizeMB === 0
                              ? '0 KB'
                              : `${item.sizeMB.toFixed(1)} MB`}
                          </span>
                          {!item.required ? (
                            <input
                              type="checkbox"
                              checked={!!item.selected}
                              onChange={() => toggleItemSelected(item.id)}
                              className="h-4 w-4 rounded"
                              style={{ accentColor: accent.hex }}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Bottom utilities */}
            <div className="mt-6 flex flex-col gap-3">
              <SettingRow label="Download cache" hint="Temporary files used while updating.">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ash">{cacheSize} MB</span>
                  <ActionButton onClick={clearCache} variant="danger">Clear cache</ActionButton>
                </div>
              </SettingRow>
              <SettingRow label="Logs" hint="Crash and debug logs.">
                <ActionButton onClick={openLogsFolder}>Open logs folder</ActionButton>
              </SettingRow>
              <SettingRow label="Backup settings" hint="Save or load your launcher configuration as a file.">
                <div className="flex items-center gap-2">
                  <ActionButton onClick={exportSettings}>Export</ActionButton>
                  <label>
                    <ActionButton as="span">Import</ActionButton>
                    <input type="file" accept="application/json" onChange={importSettings} className="hidden" />
                  </label>
                </div>
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <Section title="Advanced" description="For debugging and troubleshooting.">
            <SettingRow label="Developer mode" hint="Shows extra debug information.">
              <Toggle checked={settings.devMode} onChange={(checked) => update({ devMode: checked })} />
            </SettingRow>

            <SettingRow label="Check for updates on launch">
              <Toggle checked={settings.checkUpdates} onChange={(checked) => update({ checkUpdates: checked })} />
            </SettingRow>

            <SettingRow label="Send hardware diagnostics" hint="Anonymous crash and performance data.">
              <Toggle checked={settings.hardwareId} onChange={(checked) => update({ hardwareId: checked })} />
            </SettingRow>

            <SettingRow label="Reset all settings" hint="This cannot be undone.">
              <button
                type="button"
                onClick={handleReset}
                onBlur={() => setConfirmingReset(false)}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  confirmingReset
                    ? 'border-rust bg-rust/10 text-rust'
                    : 'border-rust/40 text-rust/80 hover:bg-rust/10 hover:text-rust'
                }`}
              >
                {confirmingReset ? 'Click again to confirm' : 'Reset to defaults'}
              </button>
            </SettingRow>
          </Section>
        )}

        {activeSection === 'about' && (
        <Section title="About" description="App version, build, and update settings.">

          {/* Application */}
          <div className="col-span-full">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Application</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] text-ash/50">Version</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">STAY Launcher 1.0.0</p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">Build channel</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">Stable</p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">Operating system</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">
                    {window.launcherAPI?.platform?.() ?? 'Windows'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">Architecture</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">
                    {window.launcherAPI?.arch?.() ?? 'x64'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Updates */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Updates</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-bone">Check for updates</p>
                  <p className="mt-0.5 text-[12px] text-ash/50">
                    {updateState === 'idle'        && 'Check for the latest version'}
                    {updateState === 'checking'    && 'Checking for updates…'}
                    {updateState === 'up-to-date'  && "You're up to date"}
                    {updateState === 'available'   && `v${updateInfo?.version} is available`}
                    {updateState === 'downloading' && `Downloading… ${downloadProgress}%`}
                    {updateState === 'downloaded'  && 'Update ready — restart to install'}
                    {updateState === 'error'       && 'Update check failed'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {updateState === 'downloaded' && (
                    <button
                      type="button"
                      onClick={() => window.launcherAPI?.installUpdate?.()}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                      style={{ backgroundColor: accent.hex, color: accent.on }}
                    >
                      Restart & install
                    </button>
                  )}
                  {updateState === 'available' && (
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateState('downloading');
                        setDownloadProgress(0);
                        window.launcherAPI?.downloadUpdate?.();
                      }}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                      style={{ backgroundColor: accent.hex, color: accent.on }}
                    >
                      Download v{updateInfo?.version}
                    </button>
                  )}
                  {updateState === 'downloading' && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%`, backgroundColor: accent.hex }}
                        />
                      </div>
                      <span className="text-[11px] text-ash/50">{downloadProgress}%</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    disabled={['checking', 'downloading', 'downloaded'].includes(updateState)}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-bone/80 transition-all hover:bg-white/10 hover:text-bone disabled:opacity-40"
                  >
                    {updateState === 'checking' ? 'Checking…' : 'Check now'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Found a bug */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Found a bug?</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between gap-6">
                <p className="text-[12px] leading-relaxed text-ash/60">
                  If something looks broken or behaves unexpectedly, let us know on our Discord.
                  Describe what you did, what you expected, and include your launcher version so
                  we can reproduce and fix it faster.
                </p>
                <a
                  href="https://discord.gg/your-invite"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: accent.hex, color: accent.on }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                  </svg>
                  Report on Discord
                </a>
              </div>
            </div>
          </div>

          {/* Launcher logs */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">Launcher logs</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-ash/60">Share your log on mclo.gs to get help</p>
                <button
                  type="button"
                  onClick={openLogsFolder}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-bone/80 transition-all hover:bg-white/10 hover:text-bone"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Share launcher logs
                </button>
              </div>
            </div>
          </div>

        </Section>
      )}

        
          </motion.div>
        </AnimatePresence>

        {toast && (
          <div className="pointer-events-auto fixed bottom-6 right-6 z-50" style={{ maxWidth: 'min(560px, calc(100vw - 48px))' }}>
            <div className="rounded-xl border border-white/10 bg-[#1a1a1a]/95 px-4 py-3 text-[13px] font-medium text-bone shadow-2xl backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                {/* break-all so long URLs / error strings wrap instead of overflowing */}
                <span className="flex-1 break-all leading-relaxed">{toast}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(toast)}
                  className="ml-1 mt-0.5 shrink-0 rounded-md p-1 text-ash/50 transition-colors hover:bg-white/10 hover:text-bone"
                  title="Copy message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div>
      <h3 className="font-['Manrope'] text-lg font-bold tracking-tight text-bone">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-ash/60">{description}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === 'idle' || status === 'loading') return null;
  const label = { saving: 'Saving…', saved: 'Saved', error: 'Could not save' }[status];
  const color = status === 'error' ? 'text-rust' : 'text-ash';
  return <span className={`text-[11px] font-medium ${color}`}>{label}</span>;
}

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-edge-soft px-5 py-4 transition-colors hover:border-bulb/20">
      <div className="pr-6">
        <p className="text-[13px] font-medium text-bone/90">{label}</p>
        {hint && <p className="mt-1 max-w-xs text-[12px] leading-snug text-ash/60">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '24px',
        borderRadius: '9999px',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        backgroundColor: checked ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
        transition: 'background-color 200ms',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          width: '18px',
          height: '18px',
          borderRadius: '9999px',
          backgroundColor: '#f0ece4',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          transition: 'left 200ms',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
}

function ActionButton({ onClick, children, variant = 'default', as: Tag = 'button' }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150 cursor-pointer select-none';
  const variants = {
    default: 'border-white/10 bg-white/5 text-bone/80 hover:bg-white/10 hover:text-bone hover:border-white/20 active:scale-95',
    danger:  'border-rust/30 bg-rust/5 text-rust/80 hover:bg-rust/15 hover:text-rust hover:border-rust/50 active:scale-95',
  };
  if (Tag === 'button') {
    return (
      <button type="button" onClick={onClick} className={`${base} ${variants[variant]}`}>
        {children}
      </button>
    );
  }
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}

function ScanButton({ state, onScan, scanLabel, doneLabel, accent, dangerOnError = false }) {
  const isScanning = state === 'scanning';
  const isDone     = state === 'done';
  const isError    = state === 'error';

  if (isDone) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#4ecb8d' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#4ecb8d" strokeWidth="1.3"/><path d="M4 7l2 2 4-4" stroke="#4ecb8d" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {doneLabel}
    </span>
  );

  if (isError) return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: dangerOnError ? '#e05c5c' : '#f4a261' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="9.5" r="0.6" fill="currentColor"/></svg>
        {dangerOnError ? 'Issue found' : 'Not found'}
      </span>
      <button type="button" onClick={onScan} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>retry</button>
    </div>
  );

  return (
    <button
      type="button"
      onClick={onScan}
      disabled={isScanning}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        fontSize: '12px', fontWeight: 500,
        padding: '6px 12px', borderRadius: '8px',
        border: `1px solid rgba(255,255,255,0.10)`,
        background: 'rgba(255,255,255,0.05)',
        color: isScanning ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
        cursor: isScanning ? 'wait' : 'pointer',
        transition: 'all 150ms',
      }}
    >
      {isScanning ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin 0.9s linear infinite' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none"/>
            <path d="M6 1.5A4.5 4.5 0 0110.5 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
          Scanning…
        </>
      ) : scanLabel}
    </button>
  );
}

/**
 * Custom dropdown replacing the native <select> so it can actually follow
 * the theme/accent tokens (native selects can't be restyled consistently
 * across platforms). Closes on outside click and Escape.
 */
function Dropdown({ value, onChange, options, theme, accent, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ borderColor: theme.border, backgroundColor: `${theme.surface}cc` }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs text-bone/90 transition-colors hover:border-white/20"
      >
        <span className="truncate">{current?.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M1.5 3.5L5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 min-w-max overflow-hidden rounded-lg border py-1 shadow-lg"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={selected ? { backgroundColor: `${accent.hex}22`, color: accent.hex } : undefined}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors ${
                      selected ? '' : 'text-bone/80 hover:bg-white/[0.06]'
                    }`}
                  >
                    {opt.label}
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegendDot({ color, label, value }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="uppercase tracking-wide text-ash/50">{label}</span>
      <span className="text-bone/70">{value}</span>
    </span>
  );
}

/* --- Section icons: small, single-weight strokes, no icon library dependency --- */

function IconAppearance({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5a8.5 8.5 0 010 17V3.5z" fill="currentColor" fillOpacity="0.5" stroke="none" />
    </svg>
  );
}

function IconBehavior({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 12a8 8 0 0114.9-4M20 12a8 8 0 01-14.9 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17 5.5v3h3M7 18.5v-3H4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStorage({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 6v6c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6V6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 12v6c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6v-6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconFolder({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 6.5A1.5 1.5 0 015.5 5h4l2 2h8A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBox({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3.5l8 4.2v8.6l-8 4.2-8-4.2V7.7l8-4.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7.7L12 12l8-4.3M12 12v9.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconPrivacy({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3L4 6.5v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5v-5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconAdvanced({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.5 1.5M16.2 16.2l1.5 1.5M6.3 17.7l1.5-1.5M16.2 7.8l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconAbout({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" />
    </svg>
  );
}
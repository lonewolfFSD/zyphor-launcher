import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n/index.jsx';
import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import WorkshopWallpapersModal from '../components/WorkshopWallpapersModal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSteam } from '@fortawesome/free-brands-svg-icons';
import {
  Compass,
  Sparkles,
  Film,
  UploadCloud,
  RotateCcw,
  Power,
  FolderOpen,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

const SECTIONS = [
  { id: 'language',   label: 'Language',   key: 'settings.tabs.language',   icon: IconLanguage },
  { id: 'appearance', label: 'Appearance', key: 'settings.tabs.appearance', icon: IconAppearance },
  { id: 'behavior',   label: 'Behavior',   key: 'settings.tabs.behavior',   icon: IconBehavior },
  { id: 'voice',      label: 'Voice & Audio', key: 'settings.tabs.voice',   icon: IconVoice },
  { id: 'immersion',  label: 'Immersion',  key: 'settings.tabs.immersion',  icon: IconImmersion },
  { id: 'privacy',    label: 'Privacy',    key: 'settings.tabs.privacy',    icon: IconPrivacy },
  { id: 'storage',    label: 'Storage',    key: 'settings.tabs.storage',    icon: IconStorage },
  { id: 'advanced',   label: 'Advanced',   key: 'settings.tabs.advanced',   icon: IconAdvanced },
  { id: 'hotkeys',    label: 'Hotkeys',    key: 'settings.tabs.hotkeys',    icon: IconKeyboard },
  { id: 'about',      label: 'About',      key: 'settings.tabs.about',      icon: IconAbout },
];

const BG_VIDEO_PRESETS = [];

const VIDEO_QUALITY_OPTIONS = [
  { id: 'hd', label: 'HD', hint: 'Full resolution · best quality' },
  { id: 'sd', label: 'SD', hint: 'Lower resolution · saves performance' },
  { id: 'static', label: 'Static', hint: 'Static image wallpaper · lowest resource usage' },
];

const ALL_VIDEO_TAGS = ['all'];

const PRESET_VIDEO_MAP = {};

const FAYE_MODELS = [
  { id: 'fast',     label: 'Fast',     desc: '', model: 'phi3:mini',   displayModel: 'Faye Spark'   },
  { id: 'balanced', label: 'Balanced', desc: '', model: 'qwen2.5:14b', displayModel: 'Faye Core'    },
  { id: 'quality',  label: 'Quality',  desc: '', model: 'qwen2.5:32b', displayModel: 'Faye Ultra'   },
];

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

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

function StorageItemSkeleton({ theme }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-4 py-3"
      style={{ borderColor: theme.border, backgroundColor: `${theme.bg}55` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-lg" style={shimmerStyle} />
        <div className="space-y-2">
          <div className="h-3 w-36 rounded-md" style={shimmerStyle} />
          <div className="h-2 w-56 rounded-md" style={shimmerStyle} />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="h-3 w-14 rounded-md" style={shimmerStyle} />
        <div className="h-4 w-4 rounded" style={shimmerStyle} />
      </div>
    </div>
  );
}


export default function SettingsPage({ profile }) {
  const { t } = useTranslation();
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
  
  // Add after the existing state declarations (around line 190)
const [modelDownloadState, setModelDownloadState] = useState('idle'); 
// 'idle' | 'checking' | 'not-found' | 'downloading' | 'done' | 'error'
const [modelDownloadProgress, setModelDownloadProgress] = useState(0);
const [pendingModel, setPendingModel] = useState(null); // the FAYE_MODELS entry awaiting download

const [ramGB, setRamGB] = useState(null);
const [installedModels, setInstalledModels] = useState([]); // list of downloaded model names

useEffect(() => {
  let isMounted = true;
  async function checkInstalledFayeModels() {
    try {
      const models = await window.launcherAPI?.getInstalledOllamaModels?.();
      if (!isMounted || !Array.isArray(models)) return;
      setInstalledModels(models);

      // Check if any FAYE_MODELS is installed
      const installedFayeModel = FAYE_MODELS.find(m =>
        models.some(n => n === m.model || n.startsWith(m.model.split(':')[0]))
      );

      if (installedFayeModel) {
        // If current setting is not set or not installed, sync to installed model
        if (!settings.fayeModel || !models.some(n => {
          const current = FAYE_MODELS.find(fm => fm.id === settings.fayeModel);
          return current && (n === current.model || n.startsWith(current.model.split(':')[0]));
        })) {
          update({ fayeModel: installedFayeModel.id });
        }
      } else {
        // No model downloaded on user's computer — deselect all initially
        if (settings.fayeModel !== null) {
          update({ fayeModel: null });
        }
      }
    } catch (e) {
      console.error('Failed to check installed models:', e);
    }
  }
  checkInstalledFayeModels();
  return () => { isMounted = false; };
}, []);

useEffect(() => {
  window.launcherAPI?.getRamGB?.()
    .then((gb) => {
      console.log('Detected RAM:', gb);
      setRamGB(gb);
    })
    .catch((err) => {
      console.error('RAM detection failed:', err);
      setRamGB(16);
    });
}, []);

const [hdrStatus, setHdrStatus] = useState({ supported: false, enabled: false, loading: true });

useEffect(() => {
  let isMounted = true;
  if (window.launcherAPI?.checkHDRSupport) {
    window.launcherAPI.checkHDRSupport()
      .then((res) => {
        if (isMounted) setHdrStatus({ ...res, loading: false });
      })
      .catch(() => {
        if (isMounted) setHdrStatus({ supported: false, enabled: false, loading: false });
      });
  } else {
    const supported = (typeof window !== 'undefined' && window.matchMedia)
      ? window.matchMedia('(dynamic-range: high)').matches || (window.screen.colorDepth >= 30)
      : false;
    setHdrStatus({ supported, enabled: false, loading: false });
  }
  return () => { isMounted = false; };
}, []);

// ── Voice & Audio Device Detection & Mic Test ─────────────────────────────
const [audioInputs, setAudioInputs] = useState([{ value: 'default', label: 'Default Microphone' }]);
const [audioOutputs, setAudioOutputs] = useState([{ value: 'default', label: 'Default Output' }]);
const [isTestingMic, setIsTestingMic] = useState(false);
const [micVolumeLevel, setMicVolumeLevel] = useState(0); // 0 - 100
const micTestStreamRef = useRef(null);
const micTestAudioCtxRef = useRef(null);
const micAnimFrameRef = useRef(null);
const micFeedbackAudioRef = useRef(null);

const refreshAudioDevices = useCallback(async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({
        value: d.deviceId || 'default',
        label: d.label || `Microphone ${i + 1}`,
      }));
    const outputs = devices
      .filter((d) => d.kind === 'audiooutput')
      .map((d, i) => ({
        value: d.deviceId || 'default',
        label: d.label || `Speaker / Headset ${i + 1}`,
      }));

    if (inputs.length > 0) setAudioInputs(inputs);
    if (outputs.length > 0) setAudioOutputs(outputs);
  } catch (err) {
    console.warn('[Audio] Failed to enumerate devices:', err);
  }
}, []);

useEffect(() => {
  refreshAudioDevices();
  const md = navigator.mediaDevices;
  if (md?.addEventListener) {
    md.addEventListener('devicechange', refreshAudioDevices);
    return () => md.removeEventListener('devicechange', refreshAudioDevices);
  }
}, [refreshAudioDevices]);

const stopMicTest = useCallback(() => {
  if (micAnimFrameRef.current) {
    cancelAnimationFrame(micAnimFrameRef.current);
    micAnimFrameRef.current = null;
  }
  if (micTestStreamRef.current) {
    micTestStreamRef.current.getTracks().forEach((track) => track.stop());
    micTestStreamRef.current = null;
  }
  if (micTestAudioCtxRef.current) {
    micTestAudioCtxRef.current.close().catch(() => {});
    micTestAudioCtxRef.current = null;
  }
  if (micFeedbackAudioRef.current) {
    micFeedbackAudioRef.current.pause();
    micFeedbackAudioRef.current.srcObject = null;
    micFeedbackAudioRef.current = null;
  }
  setIsTestingMic(false);
  setMicVolumeLevel(0);
}, []);

const startMicTest = useCallback(async () => {
  stopMicTest();
  try {
    const selectedId = settings?.audioInputDevice;
    const constraints = {
      audio: selectedId && selectedId !== 'default' ? { deviceId: { exact: selectedId } } : true,
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    micTestStreamRef.current = stream;

    refreshAudioDevices();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    micTestAudioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    if (settings?.audioMicFeedback) {
      const audioEl = new Audio();
      audioEl.srcObject = stream;
      audioEl.volume = Math.max(0, Math.min(1, (settings?.audioOutputVolume ?? 100) / 100));
      if (settings?.audioOutputDevice && settings.audioOutputDevice !== 'default' && audioEl.setSinkId) {
        audioEl.setSinkId(settings.audioOutputDevice).catch(() => {});
      }
      audioEl.play().catch(() => {});
      micFeedbackAudioRef.current = audioEl;
    }

    setIsTestingMic(true);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let smoothed = 0;

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const gain = ((settings?.audioInputVolume ?? 100) / 100);
      const normalized = Math.min(100, Math.round((avg / 120) * 100 * gain));
      smoothed = smoothed * 0.65 + normalized * 0.35;
      setMicVolumeLevel(Math.round(smoothed));
      micAnimFrameRef.current = requestAnimationFrame(checkVolume);
    };

    micAnimFrameRef.current = requestAnimationFrame(checkVolume);
  } catch (err) {
    console.error('[Mic Test] Error:', err);
    setToast('Microphone access denied or device not found');
    stopMicTest();
  }
}, [settings?.audioInputDevice, settings?.audioOutputDevice, settings?.audioInputVolume, settings?.audioOutputVolume, settings?.audioMicFeedback, refreshAudioDevices, stopMicTest]);

useEffect(() => {
  return () => {
    stopMicTest();
  };
}, [stopMicTest]);

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

  const previewSrc =
  settings.backgroundVideoType === 'none' ? null
  : settings.backgroundVideoType === 'custom'
    ? (settings.backgroundVideoPath ? `media:///${encodeURI(settings.backgroundVideoPath.replace(/\\/g, '/').replace(/^\/+/, ''))}` : customVideoUrl)
  : settings.backgroundVideoType === 'workshop'
    ? (settings.backgroundVideoPath ? `media:///${encodeURI(settings.backgroundVideoPath.replace(/\\/g, '/').replace(/^\/+/, ''))}` : DEFAULT_BACKGROUND_VIDEO)
  : DEFAULT_BACKGROUND_VIDEO;

  const items = diskItems ?? [];
  const sortedItems = [...items].sort((a, b) =>
    sortBy === 'size' ? b.sizeMB - a.sizeMB : a.name.localeCompare(b.name)
  );
  const instancesMB = items.filter((i) => i.instance).reduce((s, i) => s + i.sizeMB, 0);
  const sharedMB = items.reduce((s, i) => s + i.sizeMB, 0) - instancesMB;
  const selectedCount = items.filter((i) => i.selected).length;
  const hasDiskTotals = diskTotalMB != null && diskFreeMB != null;
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoTag, setVideoTag] = useState('all');

  const previewVideoRef = useRef(null);

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
      update({
        backgroundVideoType: 'custom',
        backgroundVideoPath: filePath,
        backgroundVideoName: name,
        backgroundWorkshopId: null,
      });
      if (profile?.uid) {
        setDoc(doc(db, 'users', profile.uid), { activeWallpaperId: null }, { merge: true }).catch(() => {});
      }
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

useEffect(() => {
  const el = previewVideoRef.current;
  if (!el) return;
  el.src = previewSrc ?? '';
  if (previewSrc) el.play().catch(() => {});
}, [previewSrc]);

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
    update({ backgroundVideoType: 'default', backgroundVideoPath: null, backgroundVideoName: null, backgroundWorkshopId: null });
    if (profile?.uid) {
      setDoc(doc(db, 'users', profile.uid), { activeWallpaperId: null }, { merge: true }).catch(() => {});
    }
    setToast('Using default background video');
  }

  function disableBackgroundVideo() {
    setCustomVideoUrl(null);
    update({ backgroundVideoType: 'none', backgroundVideoPath: null, backgroundVideoName: null, backgroundWorkshopId: null });
    if (profile?.uid) {
      setDoc(doc(db, 'users', profile.uid), { activeWallpaperId: null }, { merge: true }).catch(() => {});
    }
    setToast('Background video disabled');
  }


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
        <h2 className="mb-6 px-2 text-[1.45em] font-semibold tracking-tight text-bone">
          {t('settings.title', {}, 'Settings')}
        </h2>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            const label = s.key ? t(s.key, {}, s.label) : s.label;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                style={active ? { backgroundColor: accent.hex, color: accent.on } : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                  active ? 'font-extrabold' : 'text-ash hover:bg-white/[0.04] hover:text-bone'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? '' : 'text-ash/70'}`}
                  style={{ color: active ? accent.on : undefined }}
                />
                {label}
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
        {activeSection === 'language' && (
          <Section
            title={t('settings.language.title', {}, 'Language & Localization')}
            description={t('settings.language.description', {}, 'Choose your preferred language for the launcher user interface.')}
          >
            <div className="col-span-full flex flex-col gap-5">
              {/* Active language banner */}
              <div
                className="flex items-center justify-between rounded-2xl border p-5 transition-all"
                style={{
                  borderColor: theme.border,
                  backgroundColor: `${theme.bg}99`,
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl select-none">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || 'en'))?.flag || '🌐'}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-ash/50">
                      {t('settings.language.current', {}, 'Current Language')}
                    </p>
                    <p className="text-base font-bold text-bone mt-0.5">
                      {SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || 'en'))?.nativeName || 'English'}
                      <span className="ml-2 text-xs font-normal text-ash/60">
                        ({SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || 'en'))?.name || 'English'})
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${accent.hex}22`,
                    color: accent.hex,
                    border: `1px solid ${accent.hex}44`,
                  }}
                >
                  {(settings.language || 'en').toUpperCase()}
                </div>
              </div>

              {/* Grid of languages */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/50">
                  {t('settings.language.select', {}, 'Available Languages')}
                </p>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = (settings.language || 'en') === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          update({ language: lang.code });
                          setToast(`${lang.nativeName} (${lang.name})`);
                        }}
                        className="group relative flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          borderColor: isSelected ? accent.hex : theme.border,
                          backgroundColor: isSelected ? `${accent.hex}14` : `${theme.bg}66`,
                          boxShadow: isSelected ? `0 0 16px ${accent.hex}25` : 'none',
                        }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="text-2xl shrink-0 select-none">{lang.flag}</span>
                          <div className="min-w-0">
                            <p
                              className="text-[13px] font-semibold truncate transition-colors"
                              style={{ color: isSelected ? accent.hex : theme.text }}
                            >
                              {lang.nativeName}
                            </p>
                            <p className="text-[11px] text-ash/50 truncate">{lang.name}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: accent.hex, color: accent.on }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>
        )}

        {activeSection === 'appearance' && (
          <Section title={t('settings.appearance.title', {}, 'Appearance')} description={t('settings.appearance.description', {}, 'How the launcher looks on your screen.')}>
          {/* Two-column layout: settings left, preview right */}
          <div className="col-span-full flex gap-6 items-start">

            {/* LEFT — all settings + carousel */}
            <div className="flex-1 min-w-0 flex flex-col gap-3" style={{ maxWidth: '680px' }}>

            {/* <SettingRow
              label={t('settings.language.select', {}, 'Interface Language')}
              hint={t('settings.language.description', {}, 'Change the language of the launcher interface.')}
            >
              <select
                value={settings.language || 'en'}
                onChange={(e) => {
                  update({ language: e.target.value });
                  const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                  if (found) setToast(`${found.nativeName} (${found.name})`);
                }}
                className="rounded-lg border px-3 py-1.5 text-[12px] font-medium outline-none transition-colors"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} style={{ backgroundColor: '#181818', color: '#fff' }}>
                    {l.flag} {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </SettingRow> */}

            <SettingRow label={t('settings.appearance.theme', {}, 'Theme')} hint={t('settings.appearance.themeDesc', {}, 'OLED Black is the default and recommended.')}>
              <div className="flex flex-col items-end gap-2">
                <div className="grid grid-cols-6 justify-end gap-2" style={{ maxWidth: '100%' }}>
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
                <span className="text-[11px] text-ash/60 -mt-6">{THEMES[settings.theme]?.label ?? settings.theme}</span>
              </div>
            </SettingRow>

            <SettingRow label={t('settings.appearance.accent', {}, 'Accent color')}>
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

            <SettingRow label={t('settings.appearance.uiScale', {}, 'UI scale')}>
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

            <SettingRow label={t('settings.appearance.fontSize', {}, 'Text size')}>
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

            <SettingRow label={t('settings.appearance.animations', {}, 'Show animations')}>
              <Toggle checked={settings.animations} onChange={(checked) => update({ animations: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.appearance.reduceMotion', {}, 'Reduce motion')} hint={t('settings.appearance.reduceMotionDesc', {}, 'Minimizes transitions for motion sensitivity.')}>
              <Toggle checked={settings.reduceMotion} onChange={(checked) => update({ reduceMotion: checked })} />
            </SettingRow>

            <SettingRow
  label={t('settings.appearance.navStyle', {}, 'Interface Style')}
  hint={
    <>
      Choose the visual appearance of the launcher interface. <br />
      {(settings.navStyle ?? 'glass') === 'liquid-glass' && (
        <>
          <br />
          <span className='mt-1' style={{ color: '#fbbf24' }}>
            ⚠️ Liquid Glass may increase GPU usage and reduce performance on lower-end hardware.
          </span>
        </>
      )}
    </>
  }
>
  <div className="flex gap-1.5">
    {[
      { id: 'glass', label: 'Glass' },
      { id: 'liquid-glass', label: 'Liquid Glass' },
    ].map((opt) => {
      const isActive = (settings.navStyle ?? 'glass') === opt.id;

      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            update({ navStyle: opt.id });
            setToast(`Interface style: ${opt.label} — reloading…`);
            setTimeout(() => window.location.reload(), 900);
          }}
          style={{
            padding: '4px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            transition: 'all 150ms',
            background: isActive ? accent.hex : 'rgba(255,255,255,0.07)',
            color: isActive ? accent.on : 'rgba(255,255,255,0.5)',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
</SettingRow>

            <SettingRow label={t('settings.appearance.backgroundQuality', {}, 'Background quality')} hint={t('settings.appearance.backgroundQualityDesc', {}, 'HD provides maximum fidelity; SD compresses and downscales video to save performance.')}>
              <div className="flex gap-1.5">
                {VIDEO_QUALITY_OPTIONS.map((q) => {
                  const isActive = (settings.backgroundQuality ?? 'hd') === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      title={q.hint}
                      onClick={() => { update({ backgroundQuality: q.id }); setToast(`Video quality: ${q.label}`); }}
                      style={{
                        padding: '4px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', border: 'none', transition: 'all 150ms',
                        background: isActive ? accent.hex : 'rgba(255,255,255,0.07)',
                        color: isActive ? accent.on : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>
            {/* ── Background Video & Steam Workshop Section ── */}
            <div className="mt-4 flex flex-col gap-3 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-bone/90">
                    {t('settings.appearance.backgroundVideo', {}, 'Background Video')}
                  </p>
                  <p className="text-[11px] text-ash/60 mt-0.5">
                    Stream animated backgrounds from the Steam Workshop or use a local video
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:brightness-110 active:scale-98 shadow-sm"
                    style={{ backgroundColor: accent.hex, color: accent.on }}
                  >
                    
                    Browse Workshop
                  </button>

                  <button
                    type="button"
                    onClick={chooseCustomBackgroundVideo}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-bone/80 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Custom File…
                  </button>
                </div>
              </div>

              {/* Current Active Background Info Card */}
              <div
                className="flex items-center justify-between rounded-xl border p-3.5 transition-colors"
                style={{ backgroundColor: `${theme.surface}66`, borderColor: theme.border }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                  >
                    <Film className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-bone">
                        {settings.backgroundVideoType === 'none'
                          ? 'Background video disabled'
                          : settings.backgroundVideoType === 'workshop'
                          ? settings.backgroundVideoName || 'Steam Workshop Background'
                          : settings.backgroundVideoType === 'custom'
                          ? settings.backgroundVideoName || 'Custom Video File'
                          : 'Default Animated Background'}
                      </p>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9.5px] font-medium ${
                          settings.backgroundVideoType === 'none'
                            ? 'bg-rose-500/10 text-rose-300'
                            : settings.backgroundVideoType === 'workshop'
                            ? 'bg-cyan-500/10 text-cyan-300'
                            : settings.backgroundVideoType === 'custom'
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {settings.backgroundVideoType === 'none'
                          ? 'Off'
                          : settings.backgroundVideoType === 'workshop'
                          ? 'Steam UGC'
                          : settings.backgroundVideoType === 'custom'
                          ? 'Local'
                          : 'Default'}
                      </span>
                    </div>

                    <p className="text-[11px] text-ash/60 truncate mt-0.5">
                      {settings.backgroundVideoType === 'workshop'
                        ? 'Downloaded and synced via Steam Workshop'
                        : settings.backgroundVideoType === 'custom'
                        ? 'Playing from local disk'
                        : settings.backgroundVideoType === 'none'
                        ? 'Video playback disabled to save resources'
                        : 'Default launcher animated loop'}
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {settings.backgroundVideoType !== 'default' && (
                    <button
                      type="button"
                      onClick={setDefaultBackgroundVideo}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-ash hover:bg-white/10 hover:text-bone transition-all"
                    >
                      Reset Default
                    </button>
                  )}
                  {settings.backgroundVideoType !== 'none' ? (
                    <button
                      type="button"
                      onClick={disableBackgroundVideo}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 transition-all"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={setDefaultBackgroundVideo}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden input fallback for browser dev */}
              <input ref={bgVideoInputRef} type="file" accept="video/mp4,video/webm" onChange={handleBackgroundVideoFile} className="hidden" />
            </div>

            {/* Steam Workshop Backgrounds Modal */}
            <WorkshopWallpapersModal
              isOpen={showVideoModal}
              onClose={() => setShowVideoModal(false)}
              profile={profile}
              currentWorkshopId={settings.backgroundWorkshopId}
              onApplyWallpaper={(item, videoPath) => {
                update({
                  backgroundVideoType: 'workshop',
                  backgroundWorkshopId: item.publishedFileId,
                  backgroundVideoPath: videoPath,
                  backgroundVideoName: item.title,
                  backgroundPreviewUrl: item.previewUrl || null,
                });
                setToast(`Background applied: ${item.title}`);
                setShowVideoModal(false);
              }}
              onResetActiveBackground={() => {
                update({
                  backgroundVideoType: 'default',
                  backgroundWorkshopId: null,
                  backgroundVideoPath: null,
                  backgroundVideoName: null,
                  backgroundPreviewUrl: null,
                });
                setToast('Active background reset to default');
              }}
              theme={theme}
              accent={accent}
            />
            </div>{/* end LEFT col */}

            {/* RIGHT — preview panel, fixed width, aspect-ratio locked */}
            <div
              className="w-[48%] shrink-0 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md"
              style={{ borderColor: theme.border, backgroundColor: `${theme.bg}dd` }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-2.5"
                style={{ borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex items-center gap-2">
                  <Film className="h-3.5 w-3.5" style={{ color: accent.hex }} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ash/70">Live Monitor</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: settings.backgroundVideoType === 'none' ? '#ef4444' : '#10b981',
                      boxShadow: settings.backgroundVideoType === 'none' ? 'none' : '0 0 8px #10b98188',
                    }}
                  />
                  <span className="text-[10px] font-semibold text-ash/60">
                    {settings.backgroundVideoType === 'none' ? 'MUTED' : (settings.backgroundQuality === 'static' ? 'STATIC' : 'ACTIVE')}
                  </span>
                </div>
              </div>

              {/* 16:9 box — video fits inside without cropping */}
              <div className="relative w-full bg-black/90 overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {settings.backgroundVideoType === 'none' ? (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.bg})` }}
                  >
                    <Power className="h-6 w-6 text-ash/30" />
                    <p className="text-[11px] font-medium text-ash/50">Animated Backdrop Disabled</p>
                  </div>
                ) : settings.backgroundQuality === 'static' ? (
                  settings.backgroundPreviewUrl ? (
                    <img
                      src={settings.backgroundPreviewUrl}
                      alt="Static preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : previewSrc ? (
                    <video
                      ref={previewVideoRef}
                      src={previewSrc}
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.bg})` }}
                    >
                      <Film className="h-6 w-6 text-ash/30" />
                      <p className="text-[11px] font-medium text-ash/50">Static Backdrop Active</p>
                    </div>
                  )
                ) : previewSrc ? (
                  <video
                    ref={previewVideoRef}
                    src={previewSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.bg})` }}
                  >
                    <Power className="h-6 w-6 text-ash/30" />
                    <p className="text-[11px] font-medium text-ash/50">Animated Backdrop Disabled</p>
                  </div>
                )}
                
                {/* Cinematic gradient & status watermark */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white drop-shadow-md">
                      {settings.backgroundVideoType === 'none'
                        ? 'Disabled'
                        : settings.backgroundVideoType === 'custom'
                        ? settings.backgroundVideoName || 'Custom video'
                        : settings.backgroundVideoType === 'workshop'
                        ? settings.backgroundVideoName || 'Steam Workshop'
                        : 'Default Animated Atmosphere'}
                    </p>
                    <p className="text-[9.5px] text-white/60 drop-shadow">
                      {settings.backgroundVideoType === 'none' ? 'Static background' : 'Seamless 60 FPS loop'}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm border border-white/10">
                    16:9
                  </span>
                </div>
              </div>
            </div>{/* end RIGHT col */}

          </div>{/* end col-span-full flex */}
          </Section>
        )}

        {activeSection === 'behavior' && (
          <Section title={t('settings.sections.behavior', {}, 'Behavior')} description={t('settings.sections.behaviorDesc', {}, 'How the launcher runs on your machine.')}>
            <SettingRow label={t('settings.behavior.launchOnStartup', {}, 'Launch on startup')} hint={t('settings.behavior.launchOnStartupDesc', {}, 'Start the launcher when Windows starts.')}>
              <Toggle
                checked={settings.launchOnStartup}
                onChange={(checked) => update({ launchOnStartup: checked })}
                />
            </SettingRow>

            <SettingRow label={t('settings.behavior.minimizeToTray', {}, 'Minimize to tray')} hint={t('settings.behavior.minimizeToTrayDesc', {}, 'Keep the launcher running in the system tray.')}>
              <Toggle
                checked={settings.minimizeToTray}
                onChange={(checked) => update({ minimizeToTray: checked })}
              />
            </SettingRow>

            <SettingRow label={t('settings.behavior.closeToTray', {}, 'Close to tray')} hint={t('settings.behavior.closeToTrayDesc', {}, 'Closing the window sends it to the tray instead of quitting.')}>
              <Toggle checked={settings.closeToTray} onChange={(checked) => update({ closeToTray: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.behavior.hardwareAcceleration', {}, 'Hardware acceleration')}>
              <Toggle
                checked={settings.hardwareAcceleration}
                onChange={(checked) => update({ hardwareAcceleration: checked })}
              />
            </SettingRow>

            <SettingRow label={t('settings.behavior.desktopNotifications', {}, 'Desktop notifications')} hint={t('settings.behavior.desktopNotificationsDesc', {}, 'Update and news alerts.')}>
              <Toggle
                checked={settings.desktopNotifications}
                onChange={(checked) => update({ desktopNotifications: checked })}
              />
            </SettingRow>

            <SettingRow label={t('settings.behavior.autoUpdate', {}, 'Automatic updates')}>
              <Toggle checked={settings.autoUpdate} onChange={(checked) => update({ autoUpdate: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.behavior.updateChannel', {}, 'Update channel')}>
              <Dropdown
                value={settings.updateChannel}
                onChange={(v) => update({ updateChannel: v })}
                theme={theme}
                accent={accent}
                options={[
                  { value: 'stable', label: t('settings.about.stable', {}, 'Stable') },
                  { value: 'beta', label: 'Beta' },
                ]}
              />
            </SettingRow>
            <SettingRow label={t('settings.behavior.fullscreenOnLaunch', {}, 'Fullscreen on launch')} hint={t('settings.behavior.fullscreenOnLaunchDesc', {}, 'Automatically enters fullscreen after the splash screen finishes.')}>
              <Toggle
                checked={settings.fullscreenOnLaunch ?? false}
                onChange={(checked) => {
                  update({ fullscreenOnLaunch: checked });
                  window.launcherAPI?.setFullscreen?.(checked);
                }}
              />
            </SettingRow>
            <div className='mt-6'>
              <p className='text-gray-500 text-sm font-bold font-[Manrope] mb-2'>{t('faye.title', {}, 'Faye AI')}</p>

            <SettingRow
  label={t('faye.model', {}, 'Faye AI Model')}
  hint={
    <>
      {t('faye.modelHint', {}, "Choose the Faye AI model based on your system's available RAM.")}
      <p
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 3,
        }}
      >
        {t('faye.detectedRam', { ram: ramGB ?? '…' }, `Detected RAM: ${ramGB ?? '…'} GB`)}
      </p>
    </>
  }
>

  <div className="flex gap-1.5">
    {FAYE_MODELS.map((m) => {
      const isDownloaded = installedModels.some(n => n === m.model || n.startsWith(m.model.split(':')[0]));
      const isActive = settings.fayeModel === m.id;
        
        // Disable rules
        const disabled =
        (m.id === 'balanced' && ramGB < 20) ||
        (m.id === 'quality' && ramGB < 28);
        
        return (
          <button
          key={m.id}
          type="button"
          disabled={disabled}
          onClick={async () => {
            if (disabled) return;

            // Check if model is already pulled in Ollama
            setModelDownloadState('checking');
            setPendingModel(m);

            try {
              const available = await window.launcherAPI?.checkOllamaModel?.(m.model);
              if (available) {
                // Already downloaded — just activate
                update({ fayeModel: m.id });
                setToast(`Faye model → ${m.label}`);
                setModelDownloadState('idle');
                setPendingModel(null);
              } else {
                // Not found — show download panel
                setModelDownloadState('not-found');
              }
            } catch {
              setModelDownloadState('not-found'); // assume not found on error
            }
          }}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            border: 'none',
            opacity: disabled ? 0.4 : 1,
            background: isActive
            ? accent.hex
            : 'rgba(255,255,255,0.07)',
            color: isActive
            ? accent.on
            : 'rgba(255,255,255,0.55)',
            minWidth: '78px',
            textAlign: 'center',
          }}
          title={
            disabled
              ? `Needs more RAM (you have ~${ramGB} GB)`
              : m.desc
          }
          >
          <div className="flex items-center justify-center gap-1">
            <span>{t(`faye.${m.id}`, {}, m.label)}</span>
            {isDownloaded && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isActive ? accent.on : '#10b981' }}
                title="Installed"
              />
            )}
          </div>

          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: 2 }}>
            {m.displayModel}
          </div>
        </button>
      );
    })}
  </div>
</SettingRow>

{/* ── Faye model download panel ── */}
{pendingModel && modelDownloadState !== 'idle' && (
  <div
    className="mt-3 rounded-xl border px-5 py-4"
    style={{ borderColor: modelDownloadState === 'error' ? '#ef4444' : accent.hex + '55', backgroundColor: `${accent.hex}0d` }}
  >
    {modelDownloadState === 'checking' && (
      <p className="text-[13px] text-bone/70">{t('faye.checkingModel', { model: pendingModel.label }, `Checking if ${pendingModel.label} is available…`)}</p>
    )}

    {modelDownloadState === 'not-found' && (
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-bone">
            <span style={{ color: accent.hex }}>{pendingModel.label}</span> {t('faye.notDownloaded', {}, 'model not downloaded')}
          </p>
          <p className="mt-1 text-[12px] text-ash/60">
            {t('faye.needDownload', { model: pendingModel.displayModel }, `${pendingModel.displayModel} needs to be downloaded before Faye can use it.`)}
            {pendingModel.id === 'balanced' && (
              <span className="block mt-1.5" style={{ color: '#fbbf24' }}>
                {t('faye.ramWarningBalanced', {}, '⚠️ Balanced uses more RAM. Lower-end systems may experience reduced performance.')}
              </span>
            )}
            {pendingModel.id === 'quality' && (
              <span className="block mt-1.5" style={{ color: '#fbbf24' }}>
                {t('faye.ramWarningQuality', {}, '⚠️ Quality requires significantly more RAM (~28GB+). Lower-end systems may experience reduced performance or slow responses.')}
              </span>
            )}
            {settings.fayeModel && settings.fayeModel !== pendingModel.id && (
              <span className="block mt-1 text-ash/70">
                {t('faye.replaceWarning', {}, '⚠️ Your current model will be removed to free up space.')}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => { setModelDownloadState('idle'); setPendingModel(null); }}
            className="rounded-lg px-3 py-1.5 text-[12px] text-ash/60 hover:text-bone transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {t('common.cancel', {}, 'Cancel')}
          </button>
          <button
            type="button"
           onClick={async () => {
              setModelDownloadState('downloading');
              setModelDownloadProgress(0);

              // Subscribe to progress events from main
              const unsub = window.launcherAPI?.onOllamaPullProgress?.((pct) => {
                setModelDownloadProgress(pct);
              });

              try {
                const result = await window.launcherAPI?.pullOllamaModel?.(pendingModel.model);
                unsub?.(); // clean up listener
                if (result?.ok) {
                  update({ fayeModel: pendingModel.id });
                  setInstalledModels((prev) => [...prev, pendingModel.model]);
                  setModelDownloadState('done');
                  setToast(`${pendingModel.label} downloaded — Faye is ready`);
                  setTimeout(() => { setModelDownloadState('idle'); setPendingModel(null); }, 2000);
                } else {
                  setModelDownloadState('error');
                }
              } catch {
                unsub?.();
                setModelDownloadState('error');
              }
            }}
            className="rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-colors"
            style={{ background: accent.hex, color: accent.on }}
          >
            {t('common.download', {}, 'Download')}
          </button>
        </div>
      </div>
    )}

    {modelDownloadState === 'downloading' && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] text-bone/80">{t('faye.downloadingModel', { model: pendingModel.label }, `Downloading ${pendingModel.label}…`)}</p>
          <p className="text-[12px] text-ash/60">{modelDownloadProgress}%</p>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${modelDownloadProgress}%`, backgroundColor: accent.hex }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ash/40">{t('faye.downloadTime', {}, 'This may take a few minutes depending on your connection.')}</p>
      </div>
    )}

    {modelDownloadState === 'done' && (
      <p className="text-[13px]" style={{ color: accent.hex }}>{t('faye.modelReady', { model: pendingModel.label }, `✓ ${pendingModel.label} ready — Faye will use it on next launch.`)}</p>
    )}

    {modelDownloadState === 'error' && (
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-red-400">{t('faye.downloadError', {}, 'Download failed. Check your connection or Ollama install.')}</p>
        <button
          type="button"
          onClick={() => { setModelDownloadState('idle'); setPendingModel(null); }}
          className="text-[12px] text-ash/50 hover:text-bone transition-colors"
        >
          {t('common.dismiss', {}, 'Dismiss')}
        </button>
      </div>
    )}
  </div>
)}
    </div>
            
          </Section>
        )}

        {activeSection === 'voice' && (
          <Section
            title={t('settings.sections.voice', {}, 'Voice & Audio')}
            description={t('settings.sections.voiceDesc', {}, 'Configure microphone, output speakers, and test audio levels.')}
          >
            {/* Input Device */}
            <div className="col-span-1 flex flex-col justify-between rounded-xl border border-edge-soft px-5 py-4 transition-colors hover:border-bulb/20">
              <div className="mb-2">
                <p className="text-[13px] font-semibold text-bone">{t('settings.voice.inputDevice', {}, 'Input Device')}</p>
                <p className="text-[11px] text-ash/60">{t('settings.voice.inputDeviceDesc', {}, 'Microphone used for voice commands and Faye.')}</p>
              </div>
              <Dropdown
                value={settings.audioInputDevice || 'default'}
                onChange={(val) => {
                  update({ audioInputDevice: val });
                  if (isTestingMic) {
                    setTimeout(() => startMicTest(), 50);
                  }
                }}
                options={audioInputs}
                theme={theme}
                accent={accent}
                className="w-full mt-2"
              />
            </div>

            {/* Output Device */}
            <div className="col-span-1 flex flex-col justify-between rounded-xl border border-edge-soft px-5 py-4 transition-colors hover:border-bulb/20">
              <div className="mb-2">
                <p className="text-[13px] font-semibold text-bone">{t('settings.voice.outputDevice', {}, 'Output Device')}</p>
                <p className="text-[11px] text-ash/60">{t('settings.voice.outputDeviceDesc', {}, 'Playback device for sound effects and music.')}</p>
              </div>
              <Dropdown
                value={settings.audioOutputDevice || 'default'}
                onChange={(val) => {
                  update({ audioOutputDevice: val });
                  if (isTestingMic && micFeedbackAudioRef.current?.setSinkId) {
                    micFeedbackAudioRef.current.setSinkId(val === 'default' ? '' : val).catch(() => {});
                  }
                }}
                options={audioOutputs}
                theme={theme}
                accent={accent}
                className="w-full mt-2"
              />
            </div>

            {/* Input Volume Slider */}
            <SettingRow
              label={t('settings.voice.inputVolume', {}, 'Input Volume')}
              hint={`${settings.audioInputVolume ?? 100}% sensitivity`}
            >
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={settings.audioInputVolume ?? 100}
                  onChange={(e) => update({ audioInputVolume: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11px] font-mono text-ash/70 w-9 text-right">
                  {settings.audioInputVolume ?? 100}%
                </span>
              </div>
            </SettingRow>

            {/* Output Volume Slider */}
            <SettingRow
              label={t('settings.voice.outputVolume', {}, 'Output Volume')}
              hint={`${settings.audioOutputVolume ?? 100}% master volume`}
            >
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.audioOutputVolume ?? 100}
                  onChange={(e) => update({ audioOutputVolume: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11px] font-mono text-ash/70 w-9 text-right">
                  {settings.audioOutputVolume ?? 100}%
                </span>
              </div>
            </SettingRow>

            {/* ── Discord-Style Mic Test Card ── */}
            <div className="col-span-full rounded-2xl border border-white/10 bg-black/40 p-5 mt-2 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[14px] font-bold text-bone flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isTestingMic ? '#4ecb8d' : accent.hex }} />
                    {t('settings.voice.testMic', {}, 'Mic Test')}
                  </h4>
                  <p className="text-[12px] text-ash/60 mt-0.5">
                    {t('settings.voice.testMicDesc', {}, 'Speak into your microphone to verify your input audio levels.')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isTestingMic) stopMicTest();
                    else startMicTest();
                  }}
                  style={{
                    backgroundColor: isTestingMic ? 'rgba(239,68,68,0.15)' : accent.hex,
                    color: isTestingMic ? '#f87171' : accent.on,
                    borderColor: isTestingMic ? 'rgba(239,68,68,0.3)' : 'transparent',
                  }}
                  className="px-5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 border shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  {isTestingMic ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                      {t('settings.voice.stopTest', {}, 'Stop Testing')}
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      {t('settings.voice.startTest', {}, "Let's Check")}
                    </>
                  )}
                </button>
              </div>

              {/* Real-time Voice Level Meter (Discord-style segmented LED bar) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-ash/50 font-mono">
                  <span>INPUT LEVEL</span>
                  <span style={{ color: isTestingMic ? (micVolumeLevel > 75 ? '#ef4444' : '#4ecb8d') : 'inherit' }}>
                    {isTestingMic ? `${micVolumeLevel}%` : 'OFFLINE'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-black/60 p-0.5 border border-white/10 overflow-hidden flex items-center gap-[2px]">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const stepThreshold = (i / 32) * 100;
                    const isActive = isTestingMic && micVolumeLevel > stepThreshold;
                    const isPeaking = i >= 28;
                    const isHigh = i >= 22;
                    const activeColor = isPeaking ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';

                    return (
                      <div
                        key={i}
                        className="h-full flex-1 rounded-sm transition-all duration-75"
                        style={{
                          backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.06)',
                          boxShadow: isActive ? `0 0 6px ${activeColor}80` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Loopback Hear Yourself Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <p className="text-[12px] font-medium text-bone/90">{t('settings.voice.micFeedback', {}, 'Hear yourself during mic test')}</p>
                  <p className="text-[10px] text-ash/50">{t('settings.voice.micFeedbackDesc', {}, 'Routes your voice back to your output device so you can hear yourself.')}</p>
                </div>
                <Toggle
                  checked={settings.audioMicFeedback ?? true}
                  onChange={(checked) => {
                    update({ audioMicFeedback: checked });
                    if (isTestingMic) {
                      setTimeout(() => startMicTest(), 50);
                    }
                  }}
                />
              </div>
            </div>
          </Section>
        )}

        {activeSection === 'immersion' && (
          <Section title={t('settings.sections.immersion', {}, 'Immersion & Focus')} description={t('settings.sections.immersionDesc', {}, 'Hardware, display, and distraction-free gaming optimizations.')}>
            <SettingRow
              label={t('settings.immersion.blackoutSecondary', {}, 'Auto-blackout secondary displays')}
              hint={t('settings.immersion.blackoutSecondaryDesc', {}, 'Dims 2nd and 3rd monitors to pure black when a game starts.')}
            >
              <Toggle
                checked={settings.immersionBlackoutSecondary ?? true}
                onChange={(checked) => update({ immersionBlackoutSecondary: checked })}
              />
            </SettingRow>

            <SettingRow
              label={t('settings.immersion.lockCursor', {}, 'Lock mouse cursor to game window')}
              hint={t('settings.immersion.lockCursorDesc', {}, 'Prevents the mouse from slipping off-screen during fast movements.')}
            >
              <Toggle
                checked={settings.immersionLockCursor ?? true}
                onChange={(checked) => update({ immersionLockCursor: checked })}
              />
            </SettingRow>

            <SettingRow
              label={t('settings.immersion.blockWinKeys', {}, 'Block Windows key & Sticky keys')}
              hint={t('settings.immersion.blockWinKeysDesc', {}, 'Suppresses accidental Start menu popups and Shift chime alerts.')}
            >
              <Toggle
                checked={settings.immersionBlockWinKeys ?? true}
                onChange={(checked) => update({ immersionBlockWinKeys: checked })}
              />
            </SettingRow>

            <SettingRow
              label={t('settings.immersion.autoAudio', {}, 'Auto-switch audio device')}
              hint={t('settings.immersion.autoAudioDesc', {}, 'Automatically routes audio to your gaming headset on launch.')}
            >
              <Toggle
                checked={settings.immersionAutoAudio ?? false}
                onChange={(checked) => update({ immersionAutoAudio: checked })}
              />
            </SettingRow>

            <SettingRow
              label={t('settings.immersion.highPriority', {}, 'High process priority & RAM purge')}
              hint={t('settings.immersion.highPriorityDesc', {}, 'Allocates maximum CPU/GPU priority and clears standby memory before launch.')}
            >
              <Toggle
                checked={settings.immersionHighPriority ?? true}
                onChange={(checked) => update({ immersionHighPriority: checked })}
              />
            </SettingRow>

            <SettingRow
              label={t('settings.immersion.autoHDR', {}, 'Auto-toggle Windows HDR')}
              hint={
                hdrStatus.loading
                  ? 'Detecting display HDR capability...'
                  : !hdrStatus.supported
                  ? 'HDR is not supported by your current display.'
                  : t('settings.immersion.autoHDRDesc', {}, 'Enables HDR exclusively while the game is running.')
              }
            >
              <div className="flex items-center gap-2">
                {!hdrStatus.loading && !hdrStatus.supported && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-white/10 text-ash/40">
                    UNSUPPORTED
                  </span>
                )}
                <Toggle
                  disabled={!hdrStatus.supported}
                  checked={hdrStatus.supported ? (settings.immersionAutoHDR ?? false) : false}
                  onChange={(checked) => {
                    if (!hdrStatus.supported) {
                      setToast('HDR not supported by your display');
                      return;
                    }
                    update({ immersionAutoHDR: checked });
                  }}
                />
              </div>
            </SettingRow>
          </Section>
        )}

        {activeSection === 'privacy' && (
          <Section title={t('settings.sections.privacy', {}, 'Privacy')} description={t('settings.sections.privacyDesc', {}, 'Control what launcher checks, scans, and reports.')}>

            {/* Game integrity */}
            <div className="col-span-full">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.privacy.gameIntegrity', {}, 'Game integrity')}</p>
            </div>

            <SettingRow label={t('settings.privacy.verifyFiles', {}, 'Verify game files')} hint={t('settings.privacy.verifyFilesDesc', {}, 'Scans your install folder and cross-checks file hashes against the manifest.')}>
              <ScanButton
                state={scanState.gameFiles}
                onScan={async () => {
                  setScanState(s => ({ ...s, gameFiles: 'scanning' }));
                  await new Promise(r => setTimeout(r, 2200));
                  const ok = await window.launcherAPI?.verifyGameFiles?.() ?? true;
                  setScanState(s => ({ ...s, gameFiles: ok ? 'done' : 'error' }));
                  setToast(ok ? 'Game files verified — all good' : 'Some files failed verification');
                }}
                doneLabel={t('settings.privacy.verified', {}, 'Verified')}
                scanLabel={t('settings.privacy.verifyNow', {}, 'Verify now')}
                accent={accent}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.findSteam', {}, 'Locate games via Steam')} hint={t('settings.privacy.findSteamDesc', {}, 'Searches your Steam library paths for zyphor titles. Useful if you moved the install.')}>
              <ScanButton
                state={scanState.steamExe}
                onScan={async () => {
                  setScanState(s => ({ ...s, steamExe: 'scanning' }));
                  await new Promise(r => setTimeout(r, 1800));
                  const path = await window.launcherAPI?.findSteamExe?.() ?? null;
                  setScanState(s => ({ ...s, steamExe: path ? 'done' : 'error' }));
                  setToast(path ? `Found: ${path}` : 'STAY.exe not found in Steam library');
                }}
                doneLabel={t('settings.privacy.found', {}, 'Found')}
                scanLabel={t('settings.privacy.searchSteam', {}, 'Search Steam')}
                accent={accent}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.malwareScan', {}, 'Malware scan')} hint={t('settings.privacy.malwareScanDesc', {}, 'Runs a quick hash check of launcher binaries against known-good signatures.')}>
              <ScanButton
                state={scanState.malware}
                onScan={async () => {
                  setScanState(s => ({ ...s, malware: 'scanning' }));
                  await new Promise(r => setTimeout(r, 2800));
                  const clean = await window.launcherAPI?.runMalwareScan?.() ?? true;
                  setScanState(s => ({ ...s, malware: clean ? 'done' : 'error' }));
                  setToast(clean ? 'No threats detected' : 'Suspicious files found — check logs');
                }}
                doneLabel={t('settings.privacy.clean', {}, 'Clean')}
                scanLabel={t('settings.privacy.scanNow', {}, 'Scan now')}
                accent={accent}
                dangerOnError
              />
            </SettingRow>

            {/* Data & analytics */}
            <div className="col-span-full mt-2">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.privacy.dataAnalytics', {}, 'Data & analytics')}</p>
            </div>

            <SettingRow label={t('settings.privacy.analytics', {}, 'User analytics')} hint={t('settings.privacy.analyticsDesc', {}, 'Shares anonymous usage data to help improve the launcher experience.')}>
              <Toggle
                checked={settings.userAnalytics ?? false}
                onChange={(checked) => { update({ userAnalytics: checked }); setToast(checked ? 'Analytics enabled' : 'Analytics disabled'); }}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.crashReports', {}, 'Crash reports')} hint={t('settings.privacy.crashReportsDesc', {}, 'Automatically sends crash logs so issues can be investigated faster.')}>
              <Toggle
                checked={settings.crashReports ?? true}
                onChange={(checked) => { update({ crashReports: checked }); setToast(checked ? 'Crash reports enabled' : 'Crash reports disabled'); }}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.diagnostics', {}, 'Hardware diagnostics')} hint={t('settings.privacy.diagnosticsDesc', {}, 'Sends GPU, CPU, and RAM info alongside crash reports.')}>
              <Toggle
                checked={settings.hardwareId}
                onChange={(checked) => { update({ hardwareId: checked }); setToast(checked ? 'Hardware diagnostics on' : 'Hardware diagnostics off'); }}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.personalised', {}, 'Personalised news & offers')} hint={t('settings.privacy.personalisedDesc', {}, 'Shows content tailored to your play history in the launcher home screen.')}>
              <Toggle
                checked={settings.personalisedContent ?? true}
                onChange={(checked) => { update({ personalisedContent: checked }); setToast(checked ? 'Personalised content on' : 'Personalised content off'); }}
              />
            </SettingRow>

            {/* Session */}
            <div className="col-span-full mt-2">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.privacy.session', {}, 'Session')}</p>
            </div>

            <SettingRow label={t('settings.privacy.rememberLogin', {}, 'Remember login')} hint={t('settings.privacy.rememberLoginDesc', {}, 'Keeps you signed in between launcher restarts.')}>
              <Toggle
                checked={settings.rememberLogin ?? true}
                onChange={(checked) => { update({ rememberLogin: checked }); setToast(checked ? 'Login will be remembered' : 'Login will not be remembered'); }}
              />
            </SettingRow>

            <SettingRow label={t('settings.privacy.clearSession', {}, 'Clear session data')} hint={t('settings.privacy.clearSessionDesc', {}, 'Signs you out and removes all cached login tokens.')}>
              <ActionButton
                variant="danger"
                onClick={() => {
                  window.launcherAPI?.clearSession?.();
                  setToast('Session data cleared');
                }}
              >
                {t('common.clear', {}, 'Clear now')}
              </ActionButton>
            </SettingRow>

          </Section>
        )}

        {activeSection === 'storage' && (
          <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-['Manrope'] text-lg font-bold tracking-tight text-bone">{t('settings.sections.storage', {}, 'Storage')}</h3>
                <p className="mt-0.5 text-[13px] text-ash/60">{t('settings.sections.storageDesc', {}, 'See where disk space is used and remove instances')}</p>
              </div>
              <button
                type="button"
                onClick={refreshDiskUsage}
                disabled={diskStatus === 'loading'}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-medium text-ash transition-colors hover:text-bone disabled:cursor-wait disabled:opacity-60"
                style={{ borderColor: theme.border }}
              >
                {diskStatus === 'loading' ? t('common.loading', {}, 'Scanning…') : t('common.retry', {}, 'Rescan')}
              </button>
            </div>

            {diskStatus === 'unavailable' && (
              <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: theme.border }}>
                <p className="text-[13px] font-medium text-bone/80">{t('settings.storage.unavailable', {}, "Storage info isn't available")}</p>
                <p className="mt-1 text-[12px] text-ash/50">
                  {t('settings.storage.unavailableDesc', {}, 'Needs storage APIs.')}
                </p>
              </div>
            )}

            {diskStatus === 'error' && (
              <div className="rounded-xl border p-5 text-center" style={{ borderColor: theme.border }}>
                <p className="text-[13px] font-medium text-rust">{t('settings.storage.readError', {}, "Couldn't read disk usage")}</p>
                <p className="mt-1 text-[12px] text-ash/50">{t('settings.storage.readErrorDesc', {}, 'Check that the install folder still exists, then rescan.')}</p>
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
                      <p className="text-[13px] font-semibold text-bone">{t('settings.storage.location', {}, 'Location')}</p>
                    </div>
                    <span className="text-[12px] font-medium text-ash/60">
                      {hasDiskTotals
                        ? `${(diskFreeMB / 1024).toFixed(1)} GB ${t('settings.storage.free', {}, 'free')} / ${(diskTotalMB / 1024).toFixed(1)} GB`
                        : t('common.loading', {}, 'Calculating…')}
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
                        <LegendDot color={usedColor} label={t('settings.storage.used', {}, 'Used')} value={`${(usedMB / 1024).toFixed(1)} GB`} />
                        <LegendDot color={accent.hex} label={t('settings.storage.launcher', {}, 'Launcher')} value={`${launcherMB.toFixed(0)} MB`} />
                        <LegendDot color="rgba(255,255,255,0.2)" label={t('settings.storage.free', {}, 'Free')} value={`${(diskFreeMB / 1024).toFixed(1)} GB`} />
                      </div>
                    </div>
                    );
                  })()}
                </div>

                {/* Items list */}
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-bone">
                      {t('settings.storage.items', {}, 'Items')} <span className="ml-1 text-ash/50">{items.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Dropdown
                        value={sortBy}
                        onChange={setSortBy}
                        theme={theme}
                        accent={accent}
                        className="w-36"
                        options={[
                          { value: 'size', label: t('settings.storage.sizeOnDisk', {}, 'Size on disk') },
                          { value: 'name', label: t('settings.storage.name', {}, 'Name') },
                        ]}
                      />

                    </div>
                  </div>

                  {items.length === 0 && diskStatus === 'ready' && (
                    <p className="mt-3 text-[12px] text-ash/50">
                      {t('settings.storage.nothingFound', {}, 'Nothing found — try Rescan after the game finishes installing.')}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    {diskStatus === 'loading'
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <StorageItemSkeleton key={i} theme={theme} />
                        ))
                      : sortedItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:border-white/10"
                            style={{ borderColor: theme.border, backgroundColor: `${theme.bg}55` }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
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
                                      <IconLock className="h-2.5 w-2.5" /> {t('settings.storage.required', {}, 'Required')}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-ash/40 truncate">
                                  {item.path}
                                  {item.lastPlayed && (
                                    <span className="ml-2">{t('settings.storage.lastPlayed', { date: item.lastPlayed }, `Last played ${item.lastPlayed}`)}</span>
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
                        ))
                    }
                
                  </div>
                </div>
              </>
            )}

            {/* Bottom utilities */}
            <div className="mt-6 flex flex-col gap-3">
              <SettingRow label={t('settings.storage.clearCache', {}, 'Download cache')} hint={t('settings.storage.clearCacheDesc', {}, 'Temporary files used while updating.')}>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ash">{cacheSize} MB</span>
                  <ActionButton onClick={clearCache} variant="danger">{t('settings.storage.clearCacheBtn', {}, 'Clear cache')}</ActionButton>
                </div>
              </SettingRow>
              <SettingRow label={t('settings.storage.logs', {}, 'Logs')} hint={t('settings.storage.logsDesc', {}, 'Crash and debug logs.')}>
                <ActionButton onClick={openLogsFolder}>{t('settings.storage.openLogs', {}, 'Open logs folder')}</ActionButton>
              </SettingRow>
              <SettingRow label={t('settings.storage.backup', {}, 'Backup settings')} hint={t('settings.storage.backupDesc', {}, 'Save or load your launcher configuration as a file.')}>
                <div className="flex items-center gap-2">
                  <ActionButton onClick={exportSettings}>{t('common.export', {}, 'Export')}</ActionButton>
                  <label>
                    <ActionButton as="span">{t('common.import', {}, 'Import')}</ActionButton>
                    <input type="file" accept="application/json" onChange={importSettings} className="hidden" />
                  </label>
                </div>
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <Section title={t('settings.sections.advanced', {}, 'Advanced')} description={t('settings.sections.advancedDesc', {}, 'For debugging and troubleshooting.')}>
            <SettingRow label={t('settings.advanced.developerMode', {}, 'Developer mode')} hint={t('settings.advanced.developerModeDesc', {}, 'Shows extra debug information.')}>
              <Toggle checked={settings.devMode} onChange={(checked) => update({ devMode: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.advanced.checkUpdatesOnLaunch', {}, 'Check for updates on launch')}>
              <Toggle checked={settings.checkUpdates} onChange={(checked) => update({ checkUpdates: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.privacy.diagnostics', {}, 'Send hardware diagnostics')} hint={t('settings.privacy.diagnosticsDesc', {}, 'Anonymous crash and performance data.')}>
              <Toggle checked={settings.hardwareId} onChange={(checked) => update({ hardwareId: checked })} />
            </SettingRow>

            <SettingRow label={t('settings.advanced.resetDefaults', {}, 'Reset all settings')} hint={t('settings.advanced.resetDefaultsDesc', {}, 'This cannot be undone.')}>
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
                {confirmingReset ? t('settings.advanced.confirmReset', {}, 'Click again to confirm') : t('settings.advanced.resetDefaults', {}, 'Reset to defaults')}
              </button>
            </SettingRow>
          </Section>
        )}

        {activeSection === 'hotkeys' && (
          <Section title={t('hotkeys.title', {}, 'Hotkeys')} description={t('hotkeys.description', {}, 'Keyboard shortcuts available throughout the launcher.')}>
            <div className="col-span-full flex flex-col gap-6">

              {/* Navigation */}
              <HotkeyGroup label={t('hotkeys.groups.navigation', {}, 'Navigation')} accent={accent} theme={theme} rows={[
                { keys: ['Ctrl', '1–5'],        desc: t('hotkeys.navPages', {}, 'Go to Home / News / Friends / Achievements / Screenshots') },
                { keys: ['Ctrl', ','],           desc: t('hotkeys.openSettings', {}, 'Open Settings') },
                { keys: ['Ctrl', 'Tab'],         desc: t('hotkeys.cycleForward', {}, 'Cycle pages forward') },
                { keys: ['Ctrl', 'Shift', 'Tab'], desc: t('hotkeys.cycleBackward', {}, 'Cycle pages backward') },
              ]} />

              {/* Launcher actions */}
              <HotkeyGroup label={t('hotkeys.groups.launcher', {}, 'Launcher')} accent={accent} theme={theme} rows={[
                { keys: ['Ctrl', 'R'],           desc: t('hotkeys.reloadLauncher', {}, 'Reload Launcher') },
                { keys: ['Ctrl', 'Shift', 'S'],  desc: t('hotkeys.openScreenshotsFolder', {}, 'Open screenshots folder') },
                { keys: ['Ctrl', 'H'],           desc: t('hotkeys.goHome', {}, 'Go home from anywhere') },
                { keys: ['Ctrl', 'Shift', 'U'],  desc: t('hotkeys.checkUpdates', {}, 'Check for updates') },
                { keys: ['Ctrl', 'Shift', 'X'],  desc: t('hotkeys.quitLauncher', {}, 'Quit launcher') },
              ]} />

              {/* Screenshots */}
              <HotkeyGroup label={t('hotkeys.groups.screenshots', {}, 'Screenshots page')} accent={accent} theme={theme} rows={[
                { keys: ['Ctrl', 'A'],           desc: t('hotkeys.selectAll', {}, 'Select all screenshots') },
                { keys: ['Ctrl', 'D'],           desc: t('hotkeys.deselectAll', {}, 'Deselect all') },
                { keys: ['Delete'],              desc: t('hotkeys.deleteSelected', {}, 'Delete selected screenshots') },
              ]} />

              {/* Account */}
              <HotkeyGroup label={t('hotkeys.groups.account', {}, 'Account')} accent={accent} theme={theme} rows={[
                { keys: ['Ctrl', 'Shift', 'A'],  desc: t('hotkeys.toggleAccount', {}, 'Toggle account popover') },
                { keys: ['Ctrl', 'Shift', 'C'],  desc: t('hotkeys.copyUid', {}, 'Copy UID to clipboard') },
              ]} />

              {/* Appearance */}
              <HotkeyGroup label={t('hotkeys.groups.appearance', {}, 'Appearance')} accent={accent} theme={theme} rows={[
                { keys: ['Ctrl', 'Shift', 'D'],  desc: t('hotkeys.cycleTheme', {}, 'Cycle theme (OLED → Dark → More)') },
                { keys: ['Ctrl', 'Shift', 'E'], desc: t('hotkeys.cycleAccent', {}, 'Cycle accent color') },
                { keys: ['Ctrl', 'Shift', 'Q'],  desc: t('hotkeys.cycleBgQuality', {}, 'Cycle background quality (HD ↔ SD)') },
              ]} />

            </div>
          </Section>
        )}

        {activeSection === 'about' && (
        <Section title={t('settings.sections.about', {}, 'About')} description={t('settings.sections.aboutDesc', {}, 'App version, build, and update settings.')}>

          {/* Application */}
          <div className="col-span-full">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.about.application', {}, 'Application')}</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] text-ash/50">{t('settings.about.launcherName', {}, 'Launcher Name')}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">Zyphor Launcher</p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">{t('settings.about.version', {}, 'Version')}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">v{CURRENT_VERSION}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">{t('settings.about.buildChannel', {}, 'Build channel')}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">{t('settings.about.stable', {}, 'Stable')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">{t('settings.about.os', {}, 'Operating system')}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">
                    {window.launcherAPI?.platform?.() ?? 'Windows'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ash/50">{t('settings.about.arch', {}, 'Architecture')}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-bone">
                    {window.launcherAPI?.arch?.() ?? 'x64'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Updates */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.about.updates', {}, 'Updates')}</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-bone">{t('settings.about.checkUpdates', {}, 'Check for updates')}</p>
                  <p className="mt-0.5 text-[12px] text-ash/50">
                    {updateState === 'idle'        && t('settings.about.checkDesc', {}, 'Check for the latest version')}
                    {updateState === 'checking'    && t('home.checkUpdates', {}, 'Checking for updates…')}
                    {updateState === 'up-to-date'  && t('settings.about.upToDate', {}, "You're up to date")}
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
                    {updateState === 'checking' ? 'Checking…' : t('settings.about.checkNow', {}, 'Check now')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Found a bug */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.about.foundBug', {}, 'Found a bug?')}</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between gap-6">
                <p className="text-[12px] leading-relaxed text-ash/60">
                  {t('settings.about.foundBugDesc', {}, 'If something looks broken or behaves unexpectedly, let us know on our Discord. Describe what you did, what you expected, and include your launcher version so we can reproduce and fix it faster.')}
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
                  {t('settings.about.reportDiscord', {}, 'Report on Discord')}
                </a>
              </div>
            </div>
          </div>

          {/* Launcher logs */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ash/40">{t('settings.about.launcherLogs', {}, 'Launcher logs')}</p>
            <div className="rounded-xl border p-5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-ash/60">{t('settings.about.shareLogsDesc', {}, 'Share your log on mclo.gs to get help')}</p>
                <button
                  type="button"
                  onClick={openLogsFolder}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-bone/80 transition-all hover:bg-white/10 hover:text-bone"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('settings.about.shareLogs', {}, 'Share launcher logs')}
                </button>
              </div>
            </div>
          </div>

          {/* Uninstallation Test / Preview */}


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
  const { t } = useTranslation();
  if (status === 'idle' || status === 'loading') return null;
  const label = {
    saving: t('common.saving', {}, 'Saving…'),
    saved: t('common.saved', {}, 'Saved'),
    error: t('common.saveError', {}, 'Could not save'),
  }[status];
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

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '24px',
        borderRadius: '9999px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
        backgroundColor: checked && !disabled ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
        transition: 'background-color 200ms, opacity 200ms',
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
  const { t } = useTranslation();
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
        {dangerOnError ? t('settings.privacy.issueFound', {}, 'Issue found') : t('settings.privacy.notFound', {}, 'Not found')}
      </span>
      <button type="button" onClick={onScan} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>{t('common.retry', {}, 'retry')}</button>
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
          {t('common.loading', {}, 'Scanning…')}
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

function IconLanguage({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 12h17M12 3.5a13 13 0 010 17M12 3.5a13 13 0 000 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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

function IconVoice({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconImmersion({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

function IconKeyboard({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h4M18 14h.01"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Kbd({ children, accent }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '28px',
        padding: '2px 7px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.01em',
        background: `${accent.hex}18`,
        color: accent.hex,
        border: `1px solid ${accent.hex}33`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function HotkeyGroup({ label, rows, accent, theme }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {label}
      </p>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.border }}>
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-6 px-5 py-3"
            style={{
              borderBottom: i < rows.length - 1 ? `1px solid ${theme.border}` : 'none',
            }}
          >
            <span className="text-[13px] text-ash/70">{row.desc}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {row.keys.map((k, ki) => (
                <span key={ki} className="flex items-center gap-1.5">
                  <Kbd accent={accent}>{k}</Kbd>
                  {ki < row.keys.length - 1 && (
                    <span className="text-[10px] text-ash/30">+</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
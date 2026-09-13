import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay as fPlay, faPause as fPause, faRotate as fRotate, faCamera as fCamera, faTrashCan as fTrashCan,
  faPaperPlane as fPaperPlane, faMicrochip as fMicrochip, faMusic as fMusic, faNoteSticky as fNoteSticky, faTrophy as fTrophy, faImages as fImages,
  faXmark as fXmark, faCheck as fCheck, faArrowUpRightFromSquare as fArrowUpRight,
  faFolderOpen as fFolderOpen, faThumbtack as fThumbtack, faMagnifyingGlass as fSearch,
  faGamepad as fGamepad, faCommentDots as fCommentDots, faGaugeHigh as fGaugeHigh,
  faForwardStep as fNext, faBackwardStep as fPrev, faStop as fStop,
  faDice as fDice, faChevronDown as fChevronDown,
  faUpRightAndDownLeftFromCenter as fResize, faVolumeHigh as fVolumeHigh, faVolumeXmark as fVolumeMute,
  faTemperatureHigh as fTemp, faServer as fServer, faMemory as fMemory
} from '@fortawesome/free-solid-svg-icons';
import { faSteam } from '@fortawesome/free-brands-svg-icons';
import { useSettings } from '../hooks/useSettings.js';

import Neutral from './images/faye/excited.png';
import Happy from './images/faye/happy.png';
import Thinking from './images/faye/curious.png';
import Sad from './images/faye/sad.png';
import FayePink from './images/faye/faye-pink.png';
import FayeFace from './images/faye/faye-face.png';
import ZyphorLogo from '../Logo/trans-logo.png';
import StayLogo from '../../build-resources/logo.png';

import DEFAULT_BG_VIDEO from './videos/test_video.mp4';

const EXPRESSIONS: Record<string, string> = {
  neutral: Neutral,
  happy: Happy,
  thinking: Thinking,
  sad: Sad,
};

const FAYE_MODELS = [
  { id: 'fast', label: 'Fast', model: 'phi3:mini', displayModel: 'Faye Spark', vram: '3.8 GB', latency: '18ms', desc: 'Instant local response, optimal in-game efficiency' },
  { id: 'balanced', label: 'Balanced', model: 'qwen2.5:14b', displayModel: 'Faye Core', vram: '8.5 GB', latency: '42ms', desc: 'Advanced reasoning, tactical game guidance' },
  { id: 'quality', label: 'Quality', model: 'qwen2.5:32b', displayModel: 'Faye Ultra', vram: '18 GB', latency: '90ms', desc: 'Maximum analytical depth and creative strategy' },
];

const STAY_APP_ID = '4956550';
const STAY_FULL_NAME = 'STAY: Possession • Obsession • Permanence';
const STAY_STORE_URL = `https://store.steampowered.com/app/${STAY_APP_ID}`;
const STAY_COMMUNITY_URL = `https://steamcommunity.com/app/${STAY_APP_ID}`;
const STAY_DISCUSSIONS_URL = `https://steamcommunity.com/app/${STAY_APP_ID}/discussions/`;
const STAY_WORKSHOP_URL = `https://steamcommunity.com/app/${STAY_APP_ID}/workshop/`;

const POPULAR_ARTISTS = [
  'Sabrina Carpenter',
  'The Weeknd',
  'Charli XCX',
  'Billie Eilish',
  'Post Malone',
  'Dua Lipa',
  'Travis Scott',
  'Drake',
  'Taylor Swift',
  'Bruno Mars',
];

const STAY_ACHIEVEMENTS_META: Record<string, { displayName: string; description: string; iconUnlocked: string; iconLocked: string; rarity?: string }> = {
  JUSTICE_SERVED: {
    displayName: 'Justice Served',
    description: 'Face the consequences and settle what was left behind.',
    iconUnlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/ee26db6f940b2b87cb6e10c9ae408cea97eafd5d.jpg',
    iconLocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/7ee73b63785346248bb25844564f66fdfa76a9f8.jpg',
    rarity: '42.8%',
  },
  MAKE_A_WISH: {
    displayName: 'Make A Wish',
    description: 'A silent plea in the dark where no one can hear you.',
    iconUnlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/692bfc2bbbca04c1a4117b965b23a4372655af26.jpg',
    iconLocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/f53765bad5c621c2e705e379345b11f436a1428f.jpg',
    rarity: '28.4%',
  },
  EYES_EVERYWHERE: {
    displayName: 'Eyes Everywhere',
    description: 'You are never truly alone. Something is always watching.',
    iconUnlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/08fee551b6596b0d167a69f95fc2d9214e87a702.jpg',
    iconLocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/1314e4bf9a445526318d2e6392ba20fe31d5741d.jpg',
    rarity: '19.2%',
  },
  DINNER_TIME: {
    displayName: 'Dinner Time',
    description: 'Gather around the table for an unsettling feast.',
    iconUnlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/fb4a0c7784d818422df0808a10819b96bb1fe808.jpg',
    iconLocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/7fbfa3e44582686ee3aa52d2a0f77e2cd99e2015.jpg',
    rarity: '14.5%',
  },
  UNEXPECTED_VISITOR: {
    displayName: 'Unexpected Visitor',
    description: 'An uninvited guest arrives when least expected.',
    iconUnlocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/90c750fa1ac002348e2e4019e34085d8134c2514.jpg',
    iconLocked: 'https://shared.akamai.steamstatic.com/community_assets/images/apps/4956550/eb2cd4d59c5290afa1d15a0d2ec5f500d1c391d2.jpg',
    rarity: '8.1%',
  },
};

type PanelId = 'steam' | 'achievements' | 'screenshots' | 'faye' | 'telemetry' | 'media' | 'notes';

interface PanelPos {
  x: number;
  y: number;
}

function clampPos(x: number, y: number, _panelW: number = 600, _panelH: number = 600): PanelPos {
  return {
    x: isNaN(x) ? 400 : Math.round(x),
    y: isNaN(y) ? 100 : Math.round(y),
  };
}

const getDefaultPos = (panelId: PanelId, _width: number = 600, _height: number = 600): PanelPos => {
  const offsets: Record<PanelId, PanelPos> = {
    steam:        { x: 380, y: 100 },
    achievements: { x: 440, y: 120 },
    screenshots:  { x: 500, y: 140 },
    faye:         { x: 560, y: 100 },
    telemetry:    { x: 620, y: 130 },
    media:        { x: 680, y: 110 },
    notes:        { x: 740, y: 100 },
  };
  return offsets[panelId] || { x: 400, y: 100 };
};

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec: number) {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Voice Command Intent Detection for Faye Alt+Q HUD
function detectIntent(text: string): { type: string; args?: any } | null {
  const t = text.toLowerCase().trim();

  // Music Commands
  if (
    t.match(/^(can you play|play|put on|start)\s+(.+)/) ||
    t.includes('play music') ||
    t.includes('play some music') ||
    t.includes('play a song') ||
    t.includes('play song')
  ) {
    const match = t.match(/(?:play|put on|start)\s+(.+)/);
    return { type: 'play_music', args: { query: match ? match[1] : '' } };
  }

  if (t.includes('pause') || t.includes('stop music') || t.includes('pause music')) {
    return { type: 'pause_music' };
  }

  if (t.includes('next song') || t.includes('skip') || t.includes('next track')) {
    return { type: 'next_song' };
  }

  if (t.includes('previous song') || t.includes('last song') || t.includes('go back')) {
    return { type: 'prev_song' };
  }

  // Open Panels
  if (t.match(/\b(open|show|bring up)\b.*\b(music|player|song)\b/) || t === 'music') {
    return { type: 'open_music' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(notes|note)\b/) || t === 'notes') {
    return { type: 'open_notes' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(hardware|system|stats|performance|telemetry)\b/) || t === 'telemetry') {
    return { type: 'open_hardware' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(chat|conversation|faye)\b/)) {
    return { type: 'open_chat' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(steam|hub)\b/)) {
    return { type: 'open_steam' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(achievement|achievements|trophy)\b/)) {
    return { type: 'open_achievements' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(captures|screenshot|screenshots|gallery)\b/)) {
    return { type: 'open_screenshots' };
  }

  // Quick Notes via Voice
  if (t.match(/^(add note|note down|write down|remember|save note)\s+(.+)/)) {
    const match = t.match(/^(?:add note|note down|write down|remember|save note)\s+(.+)/);
    return { type: 'add_note', args: { text: match ? match[1] : '' } };
  }

  // System Actions
  if (t.match(/\b(screenshot|take a screenshot|snap|capture screen)\b/)) {
    return { type: 'screenshot' };
  }

  return null;
}

// Robust parser for raw or mapped YouTube Music API responses
function parseYTMResults(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data) && data.length > 0 && (data[0].videoId || data[0].id)) {
    return data.map((d: any) => ({
      id: d.videoId || d.id,
      videoId: d.videoId || d.id,
      title: d.title,
      artist: d.artist || d.channel || 'Official Artist',
      artwork: d.artwork || d.thumbnail || FayePink,
      duration: 210,
    }));
  }
  const results: any[] = [];
  try {
    const contents =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
        ?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];
    for (const section of contents) {
      const items =
        section?.musicShelfRenderer?.contents ??
        section?.itemSectionRenderer?.contents ?? [];
      for (const item of items) {
        const r = item?.musicResponsiveListItemRenderer;
        if (!r) continue;
        const videoId =
          r.playlistItemData?.videoId ??
          r.overlay?.musicItemThumbnailOverlayRenderer
            ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId;
        if (!videoId) continue;
        const flex = r.flexColumns ?? [];
        const title =
          flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? '';
        const channel =
          flex[1]?.musicResponsiveListItemFlexColumnRenderer
            ?.text?.runs?.find((run: any) => run?.navigationEndpoint?.browseEndpoint)?.text ??
          flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? '';
        const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? '';
        results.push({
          id: videoId,
          videoId,
          title: title || 'Official Track',
          artist: channel || 'Official Artist',
          artwork: thumbnail || FayePink,
          duration: 210,
        });
      }
    }
  } catch {}
  return results;
}

export default function FayeOverlay({ profile }: { profile?: any }) {
  const { settings, update } = useSettings();

  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Multi-Window Open Panels - Initially ALL tabs OFF (no active tab by default)
  const [openPanels, setOpenPanels] = useState<PanelId[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('faye_open_panels_v3') || 'null');
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });
  const [activeZIndex, setActiveZIndex] = useState<Record<PanelId, number>>({
    steam: 10, achievements: 10, screenshots: 10,
    faye: 10, telemetry: 10, media: 10, notes: 10,
  });

  // Persistent Coordinates for every panel
  const [panelPositions, setPanelPositions] = useState<Record<string, PanelPos>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('faye_panels_pos_v8') || '{}');
      const cleaned: Record<string, PanelPos> = {};
      Object.entries(saved).forEach(([pid, val]: [string, any]) => {
        if (val && typeof val.x === 'number' && typeof val.y === 'number') {
          cleaned[pid] = clampPos(val.x, val.y);
        }
      });
      return cleaned;
    } catch {
      return {};
    }
  });

  // Persistent Custom Dimensions for resizable panels
  const [panelSizes, setPanelSizes] = useState<Record<string, { width: number; height: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('faye_panels_size_v1') || '{}');
    } catch {
      return {};
    }
  });

  // Track playback history stack for standard "previous" button navigation
  const playHistoryRef = useRef<any[]>([]);

  // Steam Status & Game Data
  const [steamStatus, setSteamStatus] = useState<any>(null);
  const [achievementsData, setAchievementsData] = useState<any[]>([]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [screenshotsList, setScreenshotsList] = useState<any[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Selected Game for Achievements Dropdown
  const [selectedAchievementGame, setSelectedAchievementGame] = useState(STAY_APP_ID);

  // Real Hardware Telemetry
  const [hwStats, setHwStats] = useState<any>({
    cpu: 12,
    cpuTemp: 48,
    cpuName: 'AMD Ryzen 5 5600G with Radeon Graphics',
    cpuCores: 6,
    cpuThreads: 12,
    cpuSpeed: 3.9,
    gpu: 12,
    gpuTemp: 52,
    gpuName: 'NVIDIA GeForce GTX 1650',
    vramTotal: 4.0,
    vramUsed: 2.0,
    vramFree: 2.0,
    vramPercent: 50,
    ram: 28,
    ramUsed: 8.2,
    ramTotal: 32.0,
    ramFree: 23.8,
    motherboard: 'Gigabyte Technology Co., Ltd. B450M DS3H V2',
    motherboardManufacturer: 'Gigabyte Technology Co., Ltd.',
    motherboardModel: 'B450M DS3H V2',
    motherboardTemp: 41,
    osPlatform: 'win32',
    osRelease: '10.0',
    osArch: 'x64',
    uptimeHours: '4.2',
    fps: 144,
  });

  // Music Stream State (Full-length Streaming Engine — NO AUTOPLAY ON STARTUP)
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(210);

  // Notes State
  const [notes, setNotes] = useState<Array<{ id: number; text: string; ts: string; pinned?: boolean }>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('faye_quick_notes_v1') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  const [noteInput, setNoteInput] = useState('');

  // Faye AI States & Engine Detection
  const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [checkingEngine, setCheckingEngine] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; ts?: string }>>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [expression, setExpression] = useState('neutral');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const checkEngineStatus = useCallback(async () => {
    try {
      setCheckingEngine(true);
      const isInstalled = await window.launcherAPI?.faye?.checkInstalled?.();
      const isReady = await window.launcherAPI?.faye?.isReady?.();
      const hasOllama = Boolean(isInstalled || isReady);
      setOllamaInstalled(hasOllama);

      if (hasOllama) {
        const models = await window.launcherAPI?.getInstalledOllamaModels?.();
        if (Array.isArray(models)) {
          setInstalledModels(models);
        } else {
          setInstalledModels([]);
        }
      } else {
        setInstalledModels([]);
      }
    } catch {
      setOllamaInstalled(false);
      setInstalledModels([]);
    } finally {
      setCheckingEngine(false);
    }
  }, []);

  useEffect(() => {
    checkEngineStatus();
  }, [checkEngineStatus]);

  // Voice States
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceOnly, setVoiceOnly] = useState(false);

  // Overlay Background Video (Fixed to test_video.mp4)
  const backgroundVideoSrc = DEFAULT_BG_VIDEO;

  // Background Starfield Animation
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0.5, 6);
    camera.lookAt(0, 0, 0);

    function buildStars(count: number, spread: number, size: number, opacity: number) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3 - 5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size,
          transparent: true,
          opacity,
          color: 0xffffff,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
      );
    }

    const dust = buildStars(900, 60, 0.01, 0.35);
    scene.add(dust);

    let animId: number, t = 0;
    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.01;
      dust.rotation.y = t * 0.003;
      renderer.render(scene, camera);
    }
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // Poll Hardware Telemetry & Steam Status (STAY 4956550)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const st = await window.launcherAPI?.steam?.getStatus?.();
        if (st) setSteamStatus(st);

        const ach = await window.launcherAPI?.steam?.getAchievements?.(STAY_APP_ID);
        if (ach?.achievements && Array.isArray(ach.achievements)) {
          setAchievementsData(ach.achievements);
        } else if (Array.isArray(ach)) {
          setAchievementsData(ach);
        }

        const running = await window.launcherAPI?.isGameRunning?.();
        setIsGameRunning(Boolean(running));

        const hw = await window.launcherAPI?.getHardwareStats?.();
        if (hw) {
          setHwStats((prev: any) => ({ ...prev, ...hw }));
        }
      } catch {}
    };

    fetchData();
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, []);

  // Live Screenshots Fetching & Auto-Sync
  const loadScreenshots = useCallback(async () => {
    try {
      const list = await window.launcherAPI?.screenshots?.getAll?.('stay');
      setScreenshotsList(Array.isArray(list) ? list : []);
    } catch {
      setScreenshotsList([]);
    }
  }, []);

  useEffect(() => {
    loadScreenshots();
    const unsub = window.launcherAPI?.screenshots?.onUpdated?.(() => {
      loadScreenshots();
    });
    const interval = setInterval(loadScreenshots, 2000);
    return () => {
      unsub?.();
      clearInterval(interval);
    };
  }, [loadScreenshots]);

  const handleDeleteScreenshot = async (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.launcherAPI?.screenshots?.delete?.('stay', [fileName]);
      loadScreenshots();
      if (selectedScreenshot && selectedScreenshot.includes(fileName)) {
        setSelectedScreenshot(null);
      }
      setActionFeedback('Screenshot Deleted');
      setTimeout(() => setActionFeedback(null), 2000);
    } catch {}
  };

  // Official Studio Music Search (Full-Length Songs via backend ytmSearch)
  const handleSearchMedia = async (query = mediaQuery, autoPlayFirst = false) => {
    const fallbackArtist = POPULAR_ARTISTS[Math.floor(Math.random() * POPULAR_ARTISTS.length)];
    const term = query && query.trim() ? query.trim() : fallbackArtist;
    setMediaLoading(true);
    try {
      let rawData: any = null;
      if (window.launcherAPI?.ytmSearch) {
        rawData = await window.launcherAPI.ytmSearch(term);
      }
      const items = parseYTMResults(rawData);

      if (items.length > 0) {
        setMediaResults(items);
        // Only start track if autoPlayFirst is explicitly true (never on passive search or initial mount)
        if (autoPlayFirst) {
          handlePlayTrack(items[0]);
        }
      }
    } catch (err) {
      console.warn('[Music Fetch Error]', err);
    } finally {
      setMediaLoading(false);
    }
  };

  // Shuffle & Play Similar Vibe Song
  const handleShuffleAndPlaySimilar = async () => {
    setMediaLoading(true);
    try {
      if (currentTrack) {
        // Query similar vibe / radio based on current track & artist
        const query = `${currentTrack.artist} ${currentTrack.title} radio`;
        let rawData: any = null;
        if (window.launcherAPI?.ytmSearch) {
          rawData = await window.launcherAPI.ytmSearch(query);
        }
        let items = parseYTMResults(rawData).filter(
          (t) => t.videoId !== currentTrack.videoId && t.id !== currentTrack.id
        );

        // Fallback to artist radio if track query had few results
        if (items.length === 0 && window.launcherAPI?.ytmSearch) {
          rawData = await window.launcherAPI.ytmSearch(`${currentTrack.artist} radio`);
          items = parseYTMResults(rawData).filter(
            (t) => t.videoId !== currentTrack.videoId && t.id !== currentTrack.id
          );
        }

        if (items.length > 0) {
          const shuffled = [...items].sort(() => Math.random() - 0.5);
          setMediaResults(shuffled);
          handlePlayTrack(shuffled[0]);
          return;
        }

        // If no radio results, pick another track from current list
        const remaining = mediaResults.filter(
          (t) => t.videoId !== currentTrack.videoId && t.id !== currentTrack.id
        );
        if (remaining.length > 0) {
          const randomPick = remaining[Math.floor(Math.random() * remaining.length)];
          handlePlayTrack(randomPick);
          return;
        }
      }

      // If nothing is playing yet, pick from currently suggested mediaResults if present
      if (mediaResults.length > 0) {
        const randomPick = mediaResults[Math.floor(Math.random() * mediaResults.length)];
        handlePlayTrack(randomPick);
        return;
      }

      // Otherwise pick a random artist from POPULAR_ARTISTS
      const randomArtist = POPULAR_ARTISTS[Math.floor(Math.random() * POPULAR_ARTISTS.length)];
      setMediaQuery(randomArtist);
      await handleSearchMedia(randomArtist, true);
    } catch (err) {
      console.warn('[Shuffle Error]', err);
    } finally {
      setMediaLoading(false);
    }
  };

  // Send command to audio stream iframe
  const sendIframeCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  // Live progress ticker
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= audioDuration) {
            handleNextTrack();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, audioDuration]);

  const handlePlayTrack = (track: any, recordHistory = true) => {
    if (!track?.videoId) return;
    if (recordHistory && currentTrack && currentTrack.id !== track.id) {
      playHistoryRef.current.push(currentTrack);
    }
    setCurrentTrack(track);
    setCurrentVideoId(track.videoId);
    setAudioProgress(0);
    setAudioDuration(track.duration || 210);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      sendIframeCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      if (!currentVideoId && currentTrack.videoId) {
        setCurrentVideoId(currentTrack.videoId);
      } else {
        sendIframeCommand('playVideo');
      }
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    // Next plays random similar vibe track
    handleShuffleAndPlaySimilar();
  };

  const handlePrevTrack = () => {
    if (!currentTrack) return;
    // If already half through (or played more than 4 seconds), replay the current music
    if (audioProgress >= Math.floor(audioDuration / 2) || audioProgress > 4) {
      setAudioProgress(0);
      sendIframeCommand('seekTo', [0, true]);
      return;
    }

    // Else if clicked again or near the start, play previously played track
    if (playHistoryRef.current.length > 0) {
      const prevTrack = playHistoryRef.current.pop();
      handlePlayTrack(prevTrack, false);
      return;
    }

    // Fallback: previous item in the queue or replay from start
    if (mediaResults.length > 1) {
      const currentIndex = mediaResults.findIndex((t) => t.id === currentTrack.id);
      const prevIndex = (currentIndex - 1 + mediaResults.length) % mediaResults.length;
      handlePlayTrack(mediaResults[prevIndex], false);
    } else {
      setAudioProgress(0);
      sendIframeCommand('seekTo', [0, true]);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.round(pos * audioDuration);
    setAudioProgress(newTime);
    sendIframeCommand('seekTo', [newTime, true]);
  };

  // Window Management (Bring to front, toggle open, save position)
  const bringToFront = (panelId: PanelId) => {
    const maxZ = Math.max(...Object.values(activeZIndex)) + 1;
    setActiveZIndex((prev) => ({ ...prev, [panelId]: maxZ }));
  };

  const togglePanel = (panelId: PanelId) => {
    setOpenPanels((prev) => {
      const next = prev.includes(panelId)
        ? prev.filter((p) => p !== panelId)
        : [...prev, panelId];
      try {
        localStorage.setItem('faye_open_panels_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    bringToFront(panelId);
  };

  const closePanel = (panelId: PanelId) => {
    setOpenPanels((prev) => {
      const next = prev.filter((p) => p !== panelId);
      try {
        localStorage.setItem('faye_open_panels_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const savePanelPosition = (panelId: PanelId, x: number, y: number) => {
    const clamped = clampPos(x, y);
    setPanelPositions((prev) => {
      const next = {
        ...prev,
        [panelId]: clamped,
      };
      try {
        localStorage.setItem('faye_panels_pos_v8', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Natural Window Drag Handler - zero magnet, zero snapping, drags anywhere
  const handleDragStart = (panelId: PanelId, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    e.preventDefault();
    bringToFront(panelId);

    const startX = e.clientX;
    const startY = e.clientY;
    const currentPos = panelPositions[panelId] || getDefaultPos(panelId);
    const originX = currentPos.x;
    const originY = currentPos.y;

    let finalX = originX;
    let finalY = originY;

    const onPointerMove = (moveEv: PointerEvent) => {
      finalX = originX + (moveEv.clientX - startX);
      finalY = originY + (moveEv.clientY - startY);
      setPanelPositions((prev) => ({
        ...prev,
        [panelId]: { x: finalX, y: finalY },
      }));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      savePanelPosition(panelId, finalX, finalY);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Panel Resizing Drag Handler (expands right and down without shifting panel position)
  const handleResizeStart = (panelId: PanelId, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const currentW = panelSizes[panelId]?.width || (panelId === 'screenshots' || panelId === 'media' || panelId === 'telemetry' ? 640 : 600);
    const currentH = panelSizes[panelId]?.height || (panelId === 'media' || panelId === 'faye' || panelId === 'achievements' || panelId === 'telemetry' ? 660 : 580);

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;

      const newW = Math.max(360, currentW + deltaX);
      const newH = Math.max(280, currentH + deltaY);

      setPanelSizes((prev) => {
        const next = { ...prev, [panelId]: { width: Math.round(newW), height: Math.round(newH) } };
        try { localStorage.setItem('faye_panels_size_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Play feedback audio cue
  const playFayeAudio = (name: string) => {
    try {
      const base = import.meta.env.DEV ? '' : '.';
      const audio = new Audio(`${base}/faye-audio/${name}.mp3`);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch {}
  };

  // Faye Voice Command Handler (Alt+Q Hotkey)
  const handleVoiceCommand = async (transcript: string) => {
    setVoiceState('processing');
    const intent = detectIntent(transcript);
    if (!intent) {
      setVoiceState('idle');
      return;
    }
    switch (intent.type) {
      case 'screenshot':
        await handleTakeScreenshot();
        playFayeAudio('screenshot');
        break;
      case 'play_music':
        setVoiceOnly(false);
        if (!openPanels.includes('media')) {
          setOpenPanels((prev) => [...prev, 'media']);
        }
        bringToFront('media');
        if (intent.args?.query) {
          setMediaQuery(intent.args.query);
          await handleSearchMedia(intent.args.query, true);
        } else {
          handleShuffleAndPlaySimilar();
        }
        playFayeAudio('music');
        break;
      case 'open_music':
        setVoiceOnly(false);
        if (!openPanels.includes('media')) setOpenPanels((prev) => [...prev, 'media']);
        bringToFront('media');
        playFayeAudio('music');
        break;
      case 'next_song':
        handleNextTrack();
        playFayeAudio('music');
        break;
      case 'prev_song':
        handlePrevTrack();
        playFayeAudio('music');
        break;
      case 'pause_music':
        if (isPlaying) handleTogglePlay();
        playFayeAudio('music');
        break;
      case 'open_notes':
        setVoiceOnly(false);
        if (!openPanels.includes('notes')) setOpenPanels((prev) => [...prev, 'notes']);
        bringToFront('notes');
        playFayeAudio('note');
        break;
      case 'open_hardware':
        setVoiceOnly(false);
        if (!openPanels.includes('telemetry')) setOpenPanels((prev) => [...prev, 'telemetry']);
        bringToFront('telemetry');
        break;
      case 'open_chat':
        setVoiceOnly(false);
        if (!openPanels.includes('faye')) setOpenPanels((prev) => [...prev, 'faye']);
        bringToFront('faye');
        break;
      case 'open_steam':
        setVoiceOnly(false);
        if (!openPanels.includes('steam')) setOpenPanels((prev) => [...prev, 'steam']);
        bringToFront('steam');
        break;
      case 'open_achievements':
        setVoiceOnly(false);
        if (!openPanels.includes('achievements')) setOpenPanels((prev) => [...prev, 'achievements']);
        bringToFront('achievements');
        break;
      case 'open_screenshots':
        setVoiceOnly(false);
        if (!openPanels.includes('screenshots')) setOpenPanels((prev) => [...prev, 'screenshots']);
        bringToFront('screenshots');
        break;
      case 'add_note': {
        setVoiceOnly(false);
        const text = intent.args?.text?.trim();
        if (text) {
          const next = [{ id: Date.now(), text, ts: nowTime(), pinned: false }, ...notes];
          setNotes(next);
          try { localStorage.setItem('faye_quick_notes_v1', JSON.stringify(next)); } catch {}
          playFayeAudio('note');
        }
        break;
      }
      default:
        break;
    }
    setVoiceState('idle');
  };

  // Alt+Q Voice Command Listener & Audio Recorder
  useEffect(() => {
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];

    const unsubStart = window.launcherAPI?.onVoiceStart?.((payload: any) => {
      setVoiceOnly(!!payload?.voiceOnly);
      setVoiceState('listening');
      chunks = [];

      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.start();
        })
        .catch((err) => {
          console.error('[voice] mic error:', err);
          setVoiceState('idle');
        });
    });

    const unsubStop = window.launcherAPI?.onVoiceStop?.(() => {
      if (!mediaRecorder) return;
      setVoiceState('processing');

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const audioData = Array.from(new Uint8Array(arrayBuffer));
          const transcript = await window.launcherAPI?.transcribeAudio?.(audioData);
          if (transcript) {
            setLastTranscript(transcript);
            handleVoiceCommand(transcript);
          }
        } catch (err) {
          console.error('[voice] error:', err);
        } finally {
          setVoiceState('idle');
          setVoiceOnly(false);
          window.launcherAPI?.voiceDone?.();
        }
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    });

    return () => {
      unsubStart?.();
      unsubStop?.();
    };
  }, [openPanels, isPlaying, notes]);

  // Initial song suggestions on mount (NO AUTOPLAY, NO FORCED TRACK)
  useEffect(() => {
    const initialArtist = POPULAR_ARTISTS[Math.floor(Math.random() * POPULAR_ARTISTS.length)];
    handleSearchMedia(initialArtist, false);
  }, []);

  const handleTakeScreenshot = async () => {
    setActionFeedback('Screenshot Captured');
    try {
      await window.launcherAPI?.takeScreenshot?.('stay');
      setTimeout(loadScreenshots, 600);
    } catch {}
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    const next = [{ id: Date.now(), text: noteInput.trim(), ts: nowTime(), pinned: false }, ...notes];
    setNotes(next);
    localStorage.setItem('faye_quick_notes_v1', JSON.stringify(next));
    setNoteInput('');
  };

  const handleDeleteNote = (id: number) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    localStorage.setItem('faye_quick_notes_v1', JSON.stringify(next));
  };

  const handleTogglePinNote = (id: number) => {
    const next = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    setNotes(next);
    localStorage.setItem('faye_quick_notes_v1', JSON.stringify(next));
  };

  const handleEnableFaye = async () => {
    setEnabled(true);
    setStarting(true);
    update({ fayeAiEnabled: true });
    const modelMap: Record<string, string> = {
      fast: 'phi3:mini',
      balanced: 'qwen2.5:14b',
      quality: 'qwen2.5:32b',
    };
    const desired = modelMap[settings?.fayeModel || 'fast'] || (installedModels.length > 0 ? installedModels[0] : 'phi3:mini');
    const result = await window.launcherAPI?.faye?.start?.(desired);
    setStarting(false);
    if (result?.ok) {
      setReady(true);
      setMessages([{ role: 'assistant', content: `Zyphor System Telemetry & Faye Intelligence online for ${STAY_FULL_NAME}. How can I assist you?`, ts: nowTime() }]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || thinking || !ready) return;
    const userMsg = { role: 'user', content: input.trim(), ts: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');

    setThinking(true);
    setExpression('thinking');
    try {
      const res = await window.launcherAPI?.faye?.chat?.(
        next.filter((m) => m.role !== 'system'),
        profile?.displayName || 'Operative',
        null,
        settings?.fayeModel || 'fast'
      );
      if (res?.ok) {
        setExpression('happy');
        setMessages([...next, { role: 'assistant', content: res.content, ts: nowTime() }]);
      } else {
        setExpression('sad');
        setMessages([...next, { role: 'system', content: `Engine alert: ${res?.error || 'No response'}`, ts: nowTime() }]);
      }
    } finally {
      setThinking(false);
    }
  };

  // STAY Achievements computation (Unlocked appear at the top)
  const fullAchievements = useMemo(() => {
    const list = Object.entries(STAY_ACHIEVEMENTS_META).map(([id, meta]) => {
      const match = achievementsData.find((a) => a.apiName === id || a.id === id || a.name === id);
      const isAchieved = Boolean(match?.achieved);
      return {
        id,
        displayName: meta.displayName,
        description: meta.description,
        achieved: isAchieved,
        rarity: meta.rarity || '15.0%',
        icon: isAchieved ? meta.iconUnlocked : meta.iconLocked,
        unlockTime: match?.unlockTime,
      };
    });

    return list.sort((a, b) => {
      if (a.achieved === b.achieved) return 0;
      return a.achieved ? -1 : 1;
    });
  }, [achievementsData]);

  const unlockedCount = fullAchievements.filter((a) => a.achieved).length;
  const progressPercent = Math.round((unlockedCount / (fullAchievements.length || 1)) * 100);
  const activeModelObj = FAYE_MODELS.find((m) => m.id === (settings?.fayeModel || 'fast')) || FAYE_MODELS[0];

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-transparent text-white font-sans antialiased" style={{ pointerEvents: 'none' }}>
      {/* Audio Streaming Engine (Direct Embedded Stream — persists across pause/play) */}
      {currentVideoId && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1`}
          allow="autoplay"
          title="Zyphor Audio Stream"
          style={{ position: 'fixed', left: -9999, top: -9999, width: 240, height: 240, pointerEvents: 'none', opacity: 0 }}
        />
      )}

      {!voiceOnly && (
        <>
          {/* Dynamic Video Background */}
          {backgroundVideoSrc && (
            <video
              ref={bgVideoRef}
              src={backgroundVideoSrc}
              muted
              loop
              playsInline
              autoPlay
              className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60 backdrop-blur-sm"
              style={{ zIndex: 0 }}
            />
          )}

          <canvas ref={starsCanvasRef} className="pointer-events-none fixed inset-0 h-full w-full z-[1]" />

          {/* Minimalist Backdrop Dismissal */}
          <div
            className="fixed inset-0 z-[2] bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => {
              if (openPanels.length > 0) setOpenPanels([]);
              else window.launcherAPI?.hideOverlay?.();
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TESLA STEALTH HEADER: ZYPHOR STUDIOS COCKPIT                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <header className="fixed top-5 left-8 right-8 z-[100] pointer-events-auto flex items-center justify-between px-6 py-3.5 rounded-[24px] bg-black/80 backdrop-blur-2xl border border-white/20">
            {/* Left: Zyphor Studios & STAY Branding */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3.5">
                <img src={ZyphorLogo} alt="Zyphor Studios" className="h-8 w-auto object-contain" />
                <div>
                  <h1 className="text-sm font-bold tracking-wider font-heading uppercase text-white flex items-center gap-2">
                    ZYPHOR LAUNCHER
                    <span className="text-[10px] font-mono text-white/70 font-normal">
                      HUD v1.9
                    </span>
                  </h1>
                  <p className="text-[11px] text-white/55 font-mono">
                    {isGameRunning ? (steamStatus?.gameName || STAY_FULL_NAME) : 'NOT IN-GAME'} • {isGameRunning ? 'ACTIVE IN-SESSION' : 'STANDBY'}
                  </p>
                </div>
              </div>

              <div className="h-5 w-px bg-white/15 hidden md:block" />

              <div className="hidden lg:flex items-center gap-5 text-xs font-mono text-white/65">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faSteam} className="text-white text-sm" />
                  <span>{steamStatus?.name || 'Steam Connected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={fGaugeHigh} className="text-white text-sm" />
                  <span>{hwStats.fps || 144} FPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={fMicrochip} className="text-white text-sm" />
                  <span>CPU {hwStats.cpu}%</span>
                </div>
              </div>
            </div>

            {/* Center: Multi-Panel Toggles (No black dot on active tabs) */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-[18px] bg-white/[0.05] border border-white/10">
              {[
                { id: 'steam', label: 'Steam Hub', icon: faSteam },
                { id: 'achievements', label: 'Achievements', icon: fTrophy },
                { id: 'screenshots', label: 'Captures', icon: fImages },
                { id: 'faye', label: 'Faye AI', icon: fCommentDots },
                { id: 'telemetry', label: 'Telemetry', icon: fMicrochip },
                { id: 'media', label: 'Music', icon: fMusic },
                { id: 'notes', label: 'Notes', icon: fNoteSticky },
              ].map((tab) => {
                const isOpen = openPanels.includes(tab.id as PanelId);
                return (
                  <button
                    key={tab.id}
                    onClick={() => togglePanel(tab.id as PanelId)}
                    className={`relative px-4 py-2 rounded-xl text-[11.5px] font-heading font-bold tracking-wider uppercase flex items-center gap-2.5 transition-all ${
                      isOpen
                        ? 'bg-white text-black font-extrabold scale-105 shadow-md shadow-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="text-xs" />
                    <span className="hidden xl:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Controls (F12 Screenshot & X Close Button) */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleTakeScreenshot}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-white font-bold text-xs font-medium flex items-center gap-2 transition-colors"
                title="Take In-Game Snapshot (F12)"
              >
                <FontAwesomeIcon icon={fCamera} />
                <span>F12</span>
              </button>

              <button
                onClick={() => window.launcherAPI?.hideOverlay?.()}
                className="w-9 h-9 rounded-xl bg-white/[0.08] hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
                title="Close Overlay"
              >
                <FontAwesomeIcon icon={fXmark} className="text-sm" />
              </button>
            </div>
          </header>

          {/* Action Feedback Banner */}
          <AnimatePresence>
            {actionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] px-5 py-2.5 rounded-full bg-black/90 border border-white/30 text-white text-xs font-heading font-medium tracking-wide flex items-center gap-2.5 backdrop-blur-xl"
              >
                <FontAwesomeIcon icon={fCheck} className="text-white text-xs" />
                <span>{actionFeedback}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FAYE AI CHARACTER: SLEEK COMMANDER EMBODIMENT                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="fixed bottom-0 left-6 z-10 pointer-events-none flex flex-col items-start select-none">
            <motion.img
              key={expression}
              src={EXPRESSIONS[expression] || EXPRESSIONS.neutral}
              alt="Faye"
              initial={{ opacity: 0.85, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-[92vh] w-auto max-w-[460px] xl:max-w-[500px] 2xl:max-w-[560px] object-contain object-bottom"
            />

            {/* Status Card Under Faye */}
            <div className="absolute bottom-6 left-2 right-6 pointer-events-auto p-5 rounded-[28px] bg-black/80 backdrop-blur-2xl border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full transition-all ${
                      ready
                        ? 'bg-white'
                        : starting
                        ? 'bg-white animate-pulse'
                        : checkingEngine
                        ? 'bg-white/40 animate-pulse'
                        : !ollamaInstalled || installedModels.length === 0
                        ? 'bg-white/20'
                        : 'bg-white/40'
                    }`}
                  />
                  <span className="font-heading font-bold text-sm text-white">Faye AI Companion</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-white/10 text-white/80">
                  {ready
                    ? thinking
                      ? 'Thinking…'
                      : 'Online'
                    : starting
                    ? 'Starting…'
                    : checkingEngine
                    ? 'Detecting…'
                    : !ollamaInstalled
                    ? 'No Runtime'
                    : installedModels.length === 0
                    ? 'No Model'
                    : 'Standby'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3.5 border-t border-white/10 text-xs font-mono text-white/65">
                <div>
                  <span className="text-[10px] uppercase text-white/40 block">INTELLIGENCE</span>
                  <span className="text-white font-medium">
                    {checkingEngine
                      ? 'Detecting…'
                      : !ollamaInstalled
                      ? 'Ollama Required'
                      : installedModels.length === 0
                      ? 'No Model'
                      : ready || starting
                      ? activeModelObj.displayModel
                      : `${activeModelObj.displayModel} (Standby)`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-white/40 block">SPECS</span>
                  <span className="text-white font-medium">
                    {checkingEngine
                      ? 'Hardware Probe'
                      : !ollamaInstalled
                      ? 'Not Installed'
                      : installedModels.length === 0
                      ? 'Setup In Settings'
                      : ready
                      ? `${activeModelObj.latency} • ${activeModelObj.vram}`
                      : starting
                      ? 'Loading Model…'
                      : 'Standby • Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* INDIVIDUAL DRAGGABLE & RESIZABLE WINDOW PANELS                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {openPanels.map((panelId) => {
            const size = panelSizes[panelId] || {
              width: panelId === 'screenshots' || panelId === 'media' || panelId === 'telemetry' ? 640 : 600,
              height: panelId === 'media' || panelId === 'faye' || panelId === 'achievements' || panelId === 'telemetry' ? 660 : 580,
            };
            const rawPos = panelPositions[panelId] || getDefaultPos(panelId, size.width, size.height);
            const pos = clampPos(rawPos.x, rawPos.y, size.width, size.height);
            const zIndex = activeZIndex[panelId] || 20;

            return (
              <motion.div
                key={panelId}
                onPointerDown={() => bringToFront(panelId)}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed',
                  left: pos.x,
                  top: pos.y,
                  zIndex,
                  width: size.width,
                  height: size.height,
                  minWidth: 360,
                  minHeight: 280,
                }}
                className="pointer-events-auto flex flex-col rounded-[32px] bg-black/80 backdrop-blur-3xl border-2 border-white/50 overflow-hidden select-auto"
              >
                {/* ── DRAG HEADER WITH SLIMMER HIGH WHITE CAPSULE PILL ── */}
                <div
                  onPointerDown={(e) => handleDragStart(panelId, e)}
                  className="px-6 pt-3.5 pb-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02] cursor-grab active:cursor-grabbing select-none shrink-0 relative"
                >
                  {/* Slimmer White Capsule Pill Positioned High */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-2.5">
                    <div className="w-8 h-1 rounded-full bg-white/80 hover:bg-white transition-all cursor-grab active:cursor-grabbing" />
                  </div>

                  {/* Left: Window Title */}
                  <div className="pt-1.5">
                    <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wide">
                      {panelId === 'steam' && 'Steam Command Center'}
                      {panelId === 'achievements' && 'Steam Achievements'}
                      {panelId === 'screenshots' && 'Captures Gallery'}
                      {panelId === 'faye' && 'Faye Tactical AI'}
                      {panelId === 'telemetry' && 'System Telemetry'}
                      {panelId === 'media' && 'Official Music Engine'}
                      {panelId === 'notes' && 'Strategy Scratchpad'}
                    </h3>
                    <p className="text-[10px] font-mono text-white/50">
                      {panelId === 'steam' && 'Steam Integration & Community'}
                      {panelId === 'achievements' && 'Trophy Tracking & Progression'}
                      {panelId === 'screenshots' && 'In-Game Capture Vault'}
                      {panelId === 'faye' && 'AI Tactical Companion'}
                      {panelId === 'telemetry' && 'Hardware Performance Monitor'}
                      {panelId === 'media' && 'Background Audio Stream'}
                      {panelId === 'notes' && 'Quick Scratchpad & Objectives'}
                    </p>
                  </div>

                  {/* Right: Window Controls */}
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      onClick={() => closePanel(panelId)}
                      className="w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                      title="Close Window"
                    >
                      <FontAwesomeIcon icon={fXmark} className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* ── PANEL VIEW CONTENT ── */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
                  {/* STEAM HUB CONTENT */}
                  {panelId === 'steam' && (
                    <>
                      <div className="p-5 rounded-[26px] bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={faSteam} className="text-4xl text-white" />
                            <div>
                              <h4 className="font-heading font-bold text-white text-sm">Steam Client Connected</h4>
                              <span className="px-3 py-1.5 mt-6 rounded-full bg-white/10 text-white font-mono text-[9px]">
                            {steamStatus?.ownsGame || steamStatus?.initialized ? 'Verified License' : 'Active'}
                          </span>
                            </div>
                          </div>
                          
                        </div>
                        

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs font-mono text-white/70">
                          <div>
                            <span className="text-[10px] uppercase text-white/40 block">STEAM ACCOUNT</span>
                            <span className="text-white font-semibold">{steamStatus?.name || 'Steam User'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-white/40 block">STEAM ID 64</span>
                            <span className="text-white font-semibold">{steamStatus?.steamId64 || 'Connected'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => window.launcherAPI?.openExternal ? window.launcherAPI.openExternal(STAY_COMMUNITY_URL) : window.open(STAY_COMMUNITY_URL, '_blank')}
                          className="p-4 rounded-[20px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-white font-heading">Community Hub</p>
                            <p className="text-[11px] text-white/50">Discussions & Guides</p>
                          </div>
                          <FontAwesomeIcon icon={fArrowUpRight} className="text-white/40 text-xs" />
                        </button>

                        <button
                          onClick={() => window.launcherAPI?.openExternal ? window.launcherAPI.openExternal(STAY_STORE_URL) : window.open(STAY_STORE_URL, '_blank')}
                          className="p-4 rounded-[20px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-white font-heading">Steam Store</p>
                            <p className="text-[11px] text-white/50">News & Updates</p>
                          </div>
                          <FontAwesomeIcon icon={fArrowUpRight} className="text-white/40 text-xs" />
                        </button>

                        <button
                          onClick={() => window.launcherAPI?.openExternal ? window.launcherAPI.openExternal(STAY_DISCUSSIONS_URL) : window.open(STAY_DISCUSSIONS_URL, '_blank')}
                          className="p-4 rounded-[20px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-white font-heading">Official Discussions</p>
                            <p className="text-[11px] text-white/50">Bug reports & patches</p>
                          </div>
                          <FontAwesomeIcon icon={fArrowUpRight} className="text-white/40 text-xs" />
                        </button>

                        <button
                          onClick={() => window.launcherAPI?.openExternal ? window.launcherAPI.openExternal(STAY_WORKSHOP_URL) : window.open(STAY_WORKSHOP_URL, '_blank')}
                          className="p-4 rounded-[20px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-white font-heading">Steam Workshop</p>
                            <p className="text-[11px] text-white/50">Wallpapers & UGC</p>
                          </div>
                          <FontAwesomeIcon icon={fArrowUpRight} className="text-white/40 text-xs" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* ACHIEVEMENTS CONTENT (With Game Selector Dropdown) */}
                  {panelId === 'achievements' && (
                    <>
                      <div className="flex flex-col gap-3 pb-4 border-b border-white/10">
                        <div className="flex items-center justify-between gap-3">
                          {/* Dedicated Game Selector Dropdown with STAY as the sole option */}
                          <div className="relative flex-1 min-w-0">
                            <select
                              value={selectedAchievementGame}
                              onChange={(e) => setSelectedAchievementGame(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/20 text-white font-heading text-xs font-semibold focus:outline-none focus:border-white appearance-none cursor-pointer pr-9 transition-colors"
                            >
                              <option value={STAY_APP_ID} className="bg-neutral-900 text-white font-medium py-2">
                                {STAY_FULL_NAME}
                              </option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/60 text-xs">
                              <FontAwesomeIcon icon={fChevronDown} />
                            </div>
                          </div>

                          
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-white/60 px-0.5">
                          <span>Progress: {unlockedCount} of {fullAchievements.length} Unlocked</span>
                          <span className="font-bold text-white">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden shrink-0">
                            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                          </div>
                      </div>

                      <div className="space-y-3">
                        {fullAchievements.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-[10px] border flex items-center gap-3.5 transition-all ${
                              item.achieved
                                ? 'bg-white/[0.06] border-white/20'
                                : 'bg-white/[0.01] border-white/5 opacity-40'
                            }`}
                          >
                            <img src={item.icon} alt="" className="w-12 h-12 object-cover shrink-0 border border-white/10 bg-black/60" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <h5 className="font-heading font-semibold text-white text-sm truncate">{item.displayName}</h5>
                                {item.achieved && (
                                <span className="inline-block mt-0.5  text-white text-[8px] font-mono">
                                  UNLOCKED
                                </span>
                              )}
                                </span>
                                <span className="text-[11px] font-mono text-white/50">{item.rarity}</span>
                                
                              </div>
                              <p className="text-[12px] text-white/65 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                              
                              
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* CAPTURES CONTENT (Live Load & Delete Sync) */}
                  {panelId === 'screenshots' && (
                    <>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h4 className="text-sm font-bold font-heading text-white">CAPTURES VAULT</h4>
                          <p className="text-xs text-white/50 font-mono mt-0.5">{screenshotsList.length} captures recorded (Live Sync)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleTakeScreenshot}
                            className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-2"
                          >
                            <FontAwesomeIcon icon={fCamera} />
                            <span>Capture (F12)</span>
                          </button>
                          <button
                            onClick={() => window.launcherAPI?.screenshots?.openFolder?.('stay')}
                            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-white text-xs font-medium flex items-center gap-2"
                          >
                            <FontAwesomeIcon icon={fFolderOpen} />
                            <span>Open Folder</span>
                          </button>
                        </div>
                      </div>

                      {screenshotsList.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                          <FontAwesomeIcon icon={fCamera} className="text-3xl text-white/20" />
                          <p className="text-xs font-heading text-white/60">No screenshots found in folder.</p>
                          <p className="text-[11px] text-white/40">Press F12 in-game or click Capture to take snapshots.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {screenshotsList.map((item, idx) => {
                            const imgSrc = item.src || (item.path ? `media:///${encodeURI(item.path.replace(/\\/g, '/'))}` : (typeof item === 'string' ? item : item.url));
                            const fileName = item.fileName || (typeof item === 'string' ? item.split(/[/\\]/).pop() : item.name || `Capture_${idx + 1}`);

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedScreenshot(imgSrc)}
                                className="group relative aspect-video rounded-[18px] overflow-hidden bg-black/60 border border-white/20 cursor-pointer hover:border-white/50 transition-all"
                              >
                                <img
                                  src={imgSrc}
                                  alt={fileName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    if (item.path && !e.currentTarget.src.startsWith('data:')) {
                                      e.currentTarget.src = `file:///${item.path.replace(/\\/g, '/')}`;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex items-end justify-between">
                                  <span className="text-[10px] text-white font-mono truncate max-w-[140px]">{fileName}</span>
                                  <button
                                    onClick={(e) => handleDeleteScreenshot(fileName, e)}
                                    className="w-7 h-7 rounded-lg bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center text-xs transition-colors border border-white/20"
                                    title="Delete Screenshot"
                                  >
                                    <FontAwesomeIcon icon={fTrashCan} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* FAYE AI INTELLIGENCE */}
                  {panelId === 'faye' && (
                    <div className="flex flex-col h-full space-y-4">
                      {checkingEngine ? (
                        <div className="py-12 text-center space-y-3 bg-white/[0.02] border border-white/10 rounded-[24px] p-6">
                          <FontAwesomeIcon icon={fRotate} className="text-2xl text-white/40 animate-spin" />
                          <p className="text-xs text-white/50 font-mono">Detecting local Ollama engine & models…</p>
                        </div>
                      ) : !ollamaInstalled ? (
                        <div className="py-10 text-center space-y-4 bg-white/[0.02] border border-white/10 rounded-[24px] p-6">
                          <div className="w-14 h-14 rounded-full mx-auto bg-white/5 border border-white/20 flex items-center justify-center text-white/40">
                            <FontAwesomeIcon icon={fMicrochip} className="text-xl" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-sm text-white">Ollama Runtime Not Detected</h4>
                            <p className="text-xs text-white/60 mt-2 max-w-sm mx-auto leading-relaxed">
                              Faye AI requires Ollama to run private on-device intelligence models with zero cloud latency.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              onClick={() => {
                                if (window.launcherAPI?.openExternal) {
                                  window.launcherAPI.openExternal('https://ollama.com/download');
                                } else {
                                  window.open('https://ollama.com/download', '_blank');
                                }
                              }}
                              className="px-5 py-2.5 rounded-xl bg-white text-black font-heading font-bold text-xs hover:bg-white/90 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={fArrowUpRight} className="text-xs" />
                              <span>Install Ollama</span>
                            </button>
                            <button
                              onClick={checkEngineStatus}
                              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <FontAwesomeIcon icon={fRotate} className={checkingEngine ? 'animate-spin' : ''} />
                              <span>Refresh Detection</span>
                            </button>
                          </div>
                        </div>
                      ) : installedModels.length === 0 ? (
                        <div className="py-10 text-center space-y-4 bg-white/[0.02] border border-white/10 rounded-[24px] p-6">
                          <div className="w-14 h-14 rounded-full mx-auto bg-white/5 border border-white/20 flex items-center justify-center text-white/40">
                            <FontAwesomeIcon icon={fMicrochip} className="text-xl" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-sm text-white">No AI Model Detected</h4>
                            <p className="text-xs text-white/60 mt-2 max-w-sm mx-auto leading-relaxed">
                              Ollama runtime is installed, but no model is downloaded yet. Please install a model from <span className="text-white font-semibold">Settings &gt; Behaviour &gt; Faye AI</span>.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              onClick={checkEngineStatus}
                              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <FontAwesomeIcon icon={fRotate} className={checkingEngine ? 'animate-spin' : ''} />
                              <span>Refresh Detection</span>
                            </button>
                          </div>
                        </div>
                      ) : !ready ? (
                        <div className="py-12 text-center space-y-4 bg-white/[0.02] border border-white/10 rounded-[24px] p-6">
                          <img src={FayeFace} alt="Faye" className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-white/30" />
                          <div>
                            <h4 className="font-heading font-bold text-base text-white">Activate Faye Tactical Intelligence</h4>
                            <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                              Local AI model detected. Click below to initialize real-time tactical advice and guidance.
                            </p>
                          </div>
                          <button
                            onClick={handleEnableFaye}
                            disabled={starting}
                            className="px-6 py-2.5 rounded-xl bg-white text-black font-heading font-bold text-xs hover:bg-white/90 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {starting ? 'Initializing Engine…' : 'Initialize Faye AI'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
                          {messages.length === 0 ? (
                            <div className="py-10 text-center space-y-2">
                              <p className="text-xs font-mono text-white/50">Faye Core initialized for {STAY_FULL_NAME}.</p>
                              <p className="text-[11px] text-white/30">Ask questions regarding lore, puzzle solutions, or system performance.</p>
                            </div>
                          ) : (
                            <>
                              {messages.map((m, idx) => {
                                const isUser = m.role === 'user';
                                return (
                                  <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    {!isUser && (
                                      <img src={FayePink} alt="" className="w-7 h-7 rounded-full object-contain shrink-0 mt-0.5" />
                                    )}
                                    <div
                                      className={`p-3.5 rounded-[20px] max-w-[80%] text-xs leading-relaxed ${
                                        isUser
                                          ? 'bg-white text-black font-medium rounded-tr-sm'
                                          : 'bg-white/[0.06] border border-white/15 text-white/90 rounded-tl-sm'
                                      }`}
                                    >
                                      {m.content}
                                    </div>
                                  </div>
                                );
                              })}

                              {thinking && (
                                <div className="flex gap-2.5 items-center">
                                  <img src={FayePink} alt="" className="w-7 h-7 rounded-full object-contain" />
                                  <div className="px-4 py-2 rounded-[16px] bg-white/[0.05] border border-white/10 flex items-center gap-1.5">
                                    {[0, 1, 2].map((i) => (
                                      <motion.span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-white"
                                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {ready && (
                        <div className="pt-3 border-t border-white/10 mt-auto">
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-[18px] bg-white/[0.04] border border-white/10 focus-within:border-white/30 transition-colors">
                            <input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                              placeholder="Message Faye…"
                              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={!input.trim() || thinking || !ready}
                              className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold transition-transform active:scale-95 disabled:opacity-30 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={fPaperPlane} className="text-xs" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TELEMETRY CONTENT */}
                  {panelId === 'telemetry' && (
                    <div className="space-y-4">
                      {/* Top Metric Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-[16px] bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/50 uppercase">CPU TEMP</span>
                          <span className="text-xs font-mono font-bold text-white">{hwStats.cpuTemp || 48}°C</span>
                        </div>
                        <div className="p-2.5 rounded-[16px] bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/50 uppercase">GPU TEMP</span>
                          <span className="text-xs font-mono font-bold text-white">{hwStats.gpuTemp || 52}°C</span>
                        </div>
                        <div className="p-2.5 rounded-[16px] bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/50 uppercase">MOBO TEMP</span>
                          <span className="text-xs font-mono font-bold text-white">{hwStats.motherboardTemp || 41}°C</span>
                        </div>
                        <div className="p-2.5 rounded-[16px] bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/50 uppercase">UPTIME</span>
                          <span className="text-xs font-mono font-bold text-white">{hwStats.uptimeHours || '4.2'}h</span>
                        </div>
                      </div>

                      {/* GPU Dedicated Graphics Card */}
                      <div className="p-4 rounded-[22px] bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                              <FontAwesomeIcon icon={fGamepad} className="text-xs" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono text-white/40 uppercase block">GRAPHICS PROCESSOR (GPU)</span>
                              <span className="font-heading font-semibold text-white text-xs truncate block">{hwStats.gpuName || 'NVIDIA GeForce GTX 1650'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[9px] block mb-1">
                              {hwStats.gpuTemp || 52}°C
                            </span>
                            <span className="font-mono text-xs font-bold text-white">{hwStats.gpu}% LOAD</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-white/50">
                            <span>Core Utilization</span>
                            <span>{hwStats.gpu}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.min(hwStats.gpu, 100)}%` }} />
                          </div>
                        </div>

                        {/* VRAM Telemetry */}
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <div className="flex justify-between text-[9px] font-mono text-white/50">
                            <span>Dedicated VRAM</span>
                            <span>{hwStats.vramUsed || 2.0} GB / {hwStats.vramTotal || 4.0} GB ({hwStats.vramPercent || 50}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-white/70 transition-all duration-500" style={{ width: `${Math.min(hwStats.vramPercent || 50, 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-white/40 pt-0.5">
                            <span>Free VRAM: {hwStats.vramFree || 2.0} GB</span>
                            <span>DirectX 3D Acceleration</span>
                          </div>
                        </div>
                      </div>

                      {/* CPU & RAM Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Processor (CPU) */}
                        <div className="p-4 rounded-[22px] bg-white/[0.03] border border-white/10 space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                                <FontAwesomeIcon icon={fMicrochip} className="text-xs" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-mono text-white/40 uppercase block">PROCESSOR (CPU)</span>
                                <span className="font-heading font-semibold text-white text-xs truncate block max-w-[150px]" title={hwStats.cpuName}>
                                  {hwStats.cpuName || 'AMD Ryzen Processor'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-mono text-white/60 block">{hwStats.cpuTemp || 48}°C</span>
                              <span className="font-mono text-sm font-bold text-white">{hwStats.cpu}%</span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.min(hwStats.cpu, 100)}%` }} />
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-white/50 pt-1">
                            <div>
                              <span className="text-[8px] text-white/30 uppercase block">CORES / THREADS</span>
                              <span>{hwStats.cpuCores || 6}C / {hwStats.cpuThreads || 12}T</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-white/30 uppercase block">BASE CLOCK</span>
                              <span>{hwStats.cpuSpeed || 3.9} GHz</span>
                            </div>
                          </div>
                        </div>

                        {/* System Memory (RAM) */}
                        <div className="p-4 rounded-[22px] bg-white/[0.03] border border-white/10 space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                                <FontAwesomeIcon icon={fMemory} className="text-xs" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-mono text-white/40 uppercase block">SYSTEM MEMORY</span>
                                <span className="font-heading font-semibold text-white text-xs">RAM ALLOCATION</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-mono text-white/60 block">{hwStats.ramUsed} GB</span>
                              <span className="font-mono text-sm font-bold text-white">{hwStats.ram}%</span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.min(hwStats.ram, 100)}%` }} />
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-white/50 pt-1">
                            <div>
                              <span className="text-[8px] text-white/30 uppercase block">USED / TOTAL</span>
                              <span>{hwStats.ramUsed} / {hwStats.ramTotal} GB</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-white/30 uppercase block">AVAILABLE FREE</span>
                              <span>{hwStats.ramFree} GB</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Motherboard & Platform Architecture */}
                      <div className="p-4 rounded-[22px] bg-white/[0.03] border border-white/10 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                              <FontAwesomeIcon icon={fServer} className="text-xs" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono text-white/40 uppercase block">MOTHERBOARD & BASEBOARD</span>
                              <span className="font-heading font-semibold text-white text-xs truncate block" title={hwStats.motherboard}>
                                {hwStats.motherboard || 'Gigabyte Technology Co., Ltd. B450M DS3H V2'}
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] shrink-0">
                            {hwStats.motherboardTemp || 41}°C
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono text-white/60">
                          <div>
                            <span className="text-[8px] text-white/30 uppercase block">MANUFACTURER</span>
                            <span className="text-white/80 truncate block">{hwStats.motherboardManufacturer || 'Gigabyte Technology Co., Ltd.'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-white/30 uppercase block">PRODUCT / MODEL</span>
                            <span className="text-white/80 truncate block">{hwStats.motherboardModel || 'B450M DS3H V2'}</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[8px] text-white/30 uppercase block">OS ARCHITECTURE</span>
                            <span className="text-white/80 truncate block">{hwStats.osPlatform || 'win32'} ({hwStats.osArch || 'x64'})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MUSIC ENGINE CONTENT (Full-Length Studio Audio Playback) */}
                  {panelId === 'media' && (
                    <div className="space-y-4">
                      {/* Search Bar + Shuffle */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-[20px] bg-white/[0.04] border border-white/10 focus-within:border-white/30 transition-colors">
                          <FontAwesomeIcon icon={fSearch} className="text-white/40 text-xs" />
                          <input
                            value={mediaQuery}
                            onChange={(e) => setMediaQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchMedia(mediaQuery, true)}
                            placeholder="Search official artist, track, or album…"
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/35 outline-none"
                          />
                          <button
                            onClick={() => handleSearchMedia(mediaQuery, true)}
                            className="px-3.5 py-1 rounded-xl bg-white text-black font-semibold text-xs transition-transform active:scale-95"
                          >
                            Search
                          </button>
                        </div>

                        <button
                          onClick={handleShuffleAndPlaySimilar}
                          className="px-3.5 py-2.5 rounded-[20px] bg-white/[0.08] hover:bg-white/20 border border-white/15 text-white text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                          title="Shuffle Similar Vibe"
                        >
                          <FontAwesomeIcon icon={fDice} className="text-xs" />
                          <span className="hidden sm:inline">Shuffle</span>
                        </button>
                      </div>

                      {/* Artist Quick Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_ARTISTS.slice(0, 6).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setMediaQuery(preset);
                              handleSearchMedia(preset, true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/[0.03] hover:bg-white/15 text-white/70 hover:text-white border border-white/5 transition-all"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Active Player Deck (Full Song Playback) */}
                      {currentTrack ? (
                        <div className="p-5 rounded-[24px] bg-white/[0.05] border border-white/15 flex flex-col gap-3.5">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={currentTrack.artwork || FayePink}
                              alt=""
                              className="w-14 h-14 rounded-[16px] object-cover border border-white/15 bg-black shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-heading font-bold text-white text-xs truncate">{currentTrack.title}</h4>
                              <p className="text-[11px] text-white/60 mt-0.5 truncate">{currentTrack.artist}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono text-[9px]">
                                Full Track • Studio Audio
                              </span>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handlePrevTrack}
                                className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/15 text-white flex items-center justify-center text-xs transition-colors"
                              >
                                <FontAwesomeIcon icon={fPrev} />
                              </button>

                              <button
                                onClick={handleTogglePlay}
                                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm transition-transform active:scale-95"
                              >
                                <FontAwesomeIcon icon={isPlaying ? fPause : fPlay} />
                              </button>

                              <button
                                onClick={handleNextTrack}
                                className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/15 text-white flex items-center justify-center text-xs transition-colors"
                              >
                                <FontAwesomeIcon icon={fNext} />
                              </button>
                            </div>
                          </div>

                          {/* Full Progress Scrubber */}
                          <div className="space-y-1">
                            <div
                              onClick={handleSeek}
                              className="w-full h-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer overflow-hidden relative transition-colors"
                            >
                              <div
                                className="h-full rounded-full bg-white transition-all"
                                style={{ width: `${(audioProgress / (audioDuration || 1)) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
                              <span>{formatDuration(audioProgress)}</span>
                              <span>{formatDuration(audioDuration)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-[20px] bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 text-xs">
                              <FontAwesomeIcon icon={fMusic} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">No Track Selected</p>
                              <p className="text-[10px] text-white/40">Select a suggested track below or shuffle to play</p>
                            </div>
                          </div>
                          <button
                            onClick={handleShuffleAndPlaySimilar}
                            className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs transition-transform active:scale-95 flex items-center gap-1.5"
                          >
                            <FontAwesomeIcon icon={fDice} className="text-xs" />
                            <span>Shuffle</span>
                          </button>
                        </div>
                      )}

                      {/* Track Results List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {mediaResults.map((item) => {
                          const isCurrent = currentTrack?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handlePlayTrack(item)}
                              className={`p-3 rounded-[18px] border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isCurrent
                                  ? 'bg-white/15 border-white/30'
                                  : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                                <img src={item.artwork || FayePink} alt="" className="w-10 h-10 rounded-[12px] object-cover shrink-0 bg-black/40 border border-white/10" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                                  <p className="text-[10px] text-white/50 truncate mt-0.5">{item.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {isCurrent && isPlaying && (
                                  <div className="flex items-center gap-0.5 shrink-0 px-1">
                                    {[0.3, 1, 0.6].map((h, i) => (
                                      <motion.span
                                        key={i}
                                        className="w-1 bg-white rounded-full"
                                        style={{ height: 12 }}
                                        animate={{ scaleY: [h, 1.4, h * 0.3, 1.4, h] }}
                                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* NOTES SCRATCHPAD */}
                  {panelId === 'notes' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                          placeholder="Quick objective, note, or code…"
                          className="flex-1 px-4 py-2.5 rounded-[18px] bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-white/35 outline-none focus:border-white/30 transition-colors"
                        />
                        <button
                          onClick={handleSaveNote}
                          disabled={!noteInput.trim()}
                          className="px-4 py-2.5 rounded-[18px] bg-white text-black font-semibold text-xs transition-transform active:scale-95 disabled:opacity-30"
                        >
                          Save
                        </button>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {notes.length === 0 ? (
                          <div className="py-12 text-center text-xs text-white/40 font-mono">
                            No active notes recorded.
                          </div>
                        ) : (
                          notes.map((note) => (
                            <div
                              key={note.id}
                              className={`p-3.5 rounded-[20px] border flex items-start justify-between gap-3 ${
                                note.pinned
                                  ? 'bg-white/[0.08] border-white/25'
                                  : 'bg-white/[0.02] border-white/5'
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className="text-xs text-white leading-relaxed break-words">{note.text}</p>
                                <span className="text-[9px] font-mono text-white/40">{note.ts}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleTogglePinNote(note.id)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                    note.pinned ? 'text-white' : 'text-white/30 hover:text-white'
                                  }`}
                                  title="Pin Note"
                                >
                                  <FontAwesomeIcon icon={fThumbtack} />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="w-7 h-7 rounded-lg text-white/30 hover:text-white flex items-center justify-center text-xs transition-colors"
                                  title="Delete Note"
                                >
                                  <FontAwesomeIcon icon={fTrashCan} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Corner Resize Handle */}
                <div
                  onPointerDown={(e) => handleResizeStart(panelId, e)}
                  className="absolute bottom-2.5 right-2.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize text-white/30 hover:text-white transition-colors select-none z-30 group"
                  title="Drag to resize panel"
                >
                  <FontAwesomeIcon icon={fResize} className="text-xs group-hover:scale-125 transition-transform" />
                </div>
              </motion.div>
            );
          })}

          {/* Screenshot Modal Viewer */}
          <AnimatePresence>
            {selectedScreenshot && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedScreenshot(null)}
                className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8 pointer-events-auto"
              >
                <div className="relative max-w-5xl max-h-[85vh] rounded-[24px] overflow-hidden border border-white/30 bg-black">
                  <img src={selectedScreenshot} alt="Capture Preview" className="max-w-full max-h-[80vh] object-contain" />
                  <button
                    onClick={() => setSelectedScreenshot(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center text-sm transition-colors border border-white/20"
                  >
                    <FontAwesomeIcon icon={fXmark} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Screen border glow on voice interaction */}
      <AnimatePresence>
        {voiceState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
              pointerEvents: 'none',
              boxShadow:
                voiceState === 'listening'
                  ? 'inset 0 0 60px 8px rgba(255,255,255,0.35), inset 0 0 120px 20px rgba(255,255,255,0.15)'
                  : 'inset 0 0 40px 4px rgba(255,255,255,0.1)',
              transition: 'box-shadow 0.4s ease',
            }}
          />
        )}
      </AnimatePresence>

      {/* Voice indicator pill (Alt+Q) */}
      <AnimatePresence>
        {voiceState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 36,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 22px',
              borderRadius: 999,
              background: 'rgba(10,10,16,0.95)',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.15)',
            }}
          >
            {voiceState === 'listening' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {[0.6, 1, 0.7, 1, 0.5].map((h, i) => (
                    <motion.div
                      key={i}
                      style={{ width: 3, borderRadius: 99, background: '#fff', height: 14 }}
                      animate={{ scaleY: [h, 1.4, h * 0.4, 1.4, h] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                  Listening…
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                  Alt+Q to stop
                </span>
              </>
            ) : (
              <>
                <motion.div
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500 }}>
                  Processing…
                </span>
                {lastTranscript && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.6)',
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    "{lastTranscript}"
                  </span>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

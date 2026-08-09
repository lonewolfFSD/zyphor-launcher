import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

import Neutral  from './images/faye/excited.png';
import Happy    from './images/faye/happy.png';
import Thinking from './images/faye/curious.png';
import Sad      from './images/faye/sad.png';
import FayeStatic from './images/faye/neutral.png';
import FayePink from './images/faye/faye-pink.png';
import FayeFace from './images/faye/faye-face.png';

import DEFAULT_BG_VIDEO from './videos/test_video.mp4';

const EXPRESSIONS: Record<string, string> = {
  neutral: Neutral,
  happy: Happy,
  thinking: Thinking,
  sad: Sad,
};

// Recommended mapping
const FAYE_MODELS = [
  { id: 'fast',     label: 'Fast',     model: 'phi3:mini',   displayModel: 'Faye Spark' },
  { id: 'balanced', label: 'Balanced', model: 'qwen2.5:14b', displayModel: 'Faye Core'  },
  { id: 'quality',  label: 'Quality',  model: 'qwen2.5:32b', displayModel: 'Faye Ultra' },
];

/* ─── Font Awesome style icons ───────────────────────────────────── */
const Icons = {
  chat: <i className="fas fa-comment-dots" style={{ fontSize: 18 }} />,
  screenshot: <i className="fas fa-camera" style={{ fontSize: 17 }} />,
  launch: <i className="fas fa-play" style={{ fontSize: 16 }} />,
  update: <i className="fas fa-sync-alt" style={{ fontSize: 16 }} />,
  theme: <i className="fas fa-palette" style={{ fontSize: 16 }} />,
  settings: <i className="fas fa-cog" style={{ fontSize: 17 }} />,
  ollama: <i className="fas fa-download" style={{ fontSize: 16 }} />,
  close: <i className="fas fa-times" style={{ fontSize: 15 }} />,
  send: <i className="fas fa-paper-plane" style={{ fontSize: 14 }} />,
  trash: <i className="fas fa-trash-alt" style={{ fontSize: 15 }} />,
  hardware: <i className="fas fa-microchip" style={{ fontSize: 17 }} />,
  music: <i className="fas fa-music" style={{ fontSize: 16 }} />,
  notes: <i className="fas fa-sticky-note" style={{ fontSize: 16 }} />,
  prev: <i className="fas fa-step-backward" style={{ fontSize: 18 }} />,
  next: <i className="fas fa-step-forward" style={{ fontSize: 18 }} />,
  play: <i className="fas fa-play" style={{ fontSize: 14 }} />,
  pause: <i className="fas fa-pause" style={{ fontSize: 14 }} />,
};

/* ─── draggable hook ─────────────────────────────────────────────── */
function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { pos, onMouseDown };
}

/* ─── intent detection ───────────────────────────────────────────── */
function detectIntent(text: string): { type: string; args?: any } | null {
  const t = text.toLowerCase().trim();

  // Music
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

  // Open panels
  if (t.match(/\b(open|show|bring up)\b.*\b(music|player)\b/) || t === 'music') {
    return { type: 'open_music' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(notes|note)\b/) || t === 'notes') {
    return { type: 'open_notes' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(hardware|system|stats|performance)\b/) || t === 'hardware') {
    return { type: 'open_hardware' };
  }
  if (t.match(/\b(open|show|bring up)\b.*\b(chat|conversation)\b/)) {
    return { type: 'open_chat' };
  }

  // Notes via voice
  if (t.match(/^(add note|note down|write down|remember|save note)\s+(.+)/)) {
    const match = t.match(/^(?:add note|note down|write down|remember|save note)\s+(.+)/);
    return { type: 'add_note', args: { text: match ? match[1] : '' } };
  }

  // System actions
  if (t.match(/\b(screenshot|take a screenshot|snap|capture screen)\b/)) {
    return { type: 'screenshot' };
  }
  if (t.match(/\b(launch|start|open)\b.*\b(game|games)\b/) || t === 'launch game') {
    return { type: 'launch' };
  }
  if (t.match(/volume up|louder|turn up the volume|increase volume/)) {
    return { type: 'volume', args: { direction: 'up' } };
  }
  if (t.match(/volume down|quieter|turn down the volume|decrease volume|lower volume/)) {
    return { type: 'volume', args: { direction: 'down' } };
  }

  // Spotify specific
  if (t.includes('spotify')) {
    const match = t.match(/play (.+?) (?:on|in) spotify/) || t.match(/play (.+)/);
    return { type: 'spotify', args: { query: match ? match[1] : '' } };
  }

  return null;
}

const GLOW_COLOR: Record<string, string> = {
  neutral:  '120,120,160',
  happy:    '120,200,140',
  thinking: '100,160,220',
  sad:      '160,100,120',
};

function pickExpression(text: string) {
  if (!text) return 'neutral';
  const t = text.toLowerCase();
  if (t.includes('sorry') || t.includes('unfortunate')) return 'sad';
  if (t.includes('!') || t.includes('excit') || t.includes('great')) return 'happy';
  if (t.includes('hmm') || t.includes('well') || t.includes('think')) return 'thinking';
  return 'neutral';
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── onboarding ─────────────────────────────────────────────────── */
const ONBOARD_KEY = 'faye_onboarded_v1';

function OnboardingCard({ accent, onDone }: { accent: any; onDone: () => void }) {
  const { pos, onMouseDown } = useDraggable({
    x: window.innerWidth / 2 - 250,
    y: window.innerHeight / 2 - 300,
  });

  const tips = [
    {
      icon: '💬',
      title: 'Chat',
      desc: 'Open the chat panel anytime and talk to me like a normal person. Ask questions, give commands, request help, or just talk. I remember context within the session so you don’t have to repeat yourself.',
    },
    {
      icon: '🎵',
      title: 'Music',
      desc: 'Search YouTube Music instantly, play tracks, build a queue, skip, pause, and go previous. The next song starts automatically when the current one ends.',
    },
    {
      icon: '🖥️',
      title: 'Hardware',
      desc: 'Real-time monitoring of CPU usage, GPU load, VRAM, RAM, and temperatures. Keep an eye on performance and thermals so you know exactly how hard your system is working.',
    },
    {
      icon: '📝',
      title: 'Notes',
      desc: 'A fast scratchpad that auto-saves. Supports bold, italic, strikethrough, code, pinning important notes, editing, and filtering. Ideal for quick todos, strats, or random thoughts mid-session.',
    },
    {
      icon: '🎮',
      title: 'Launch Game',
      desc: 'Say “launch a game” or click the play button. I can start games from your library directly so you don’t have to dig through Steam, Epic, or desktop shortcuts.',
    },
    {
      icon: '📸',
      title: 'Screenshot',
      desc: 'Instantly capture your screen by saying “screenshot” or hitting the camera icon. Useful for sharing clips, bugs, funny moments, or saving a clean shot without opening other tools.',
    },
    {
      icon: '🖱️',
      title: 'Draggable Panels',
      desc: 'Every panel (chat, music, notes, hardware, etc.) can be freely dragged by its top bar. Place them wherever feels comfortable and they will stay in that position.',
    },
    {
      icon: '⌨️',
      title: 'Hotkey',
      desc: 'Press Alt + F at any time to show or hide the entire Faye interface. Works even when a game is in focus, so you can bring me up or put me away without leaving the game.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 500,
        zIndex: 9999,
        background: '#0b0b0e',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20,
        boxShadow: `0 40px 100px rgba(0,0,0,0.85), 0 0 50px ${accent.hex}18`,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}35, transparent)` }} />

      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '18px 22px 14px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          userSelect: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <img
          src={FayePink}
          alt="Faye"
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            border: `1.5px solid ${accent.hex}55`,
            objectFit: 'contain',
            boxShadow: `0 0 20px ${accent.hex}30`,
          }}
        />
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0, letterSpacing: '-0.02em' }}>
            Hey, I’m Faye
          </p>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, margin: '3px 0 0' }}>
            Your gaming companion · drag me anywhere · dismiss when ready
          </p>
        </div>
      </div>

      <div style={{ padding: '14px 20px 6px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {tips.map((tip) => (
          <div
            key={tip.title}
            style={{
              display: 'flex',
              gap: 13,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span
              style={{
                fontSize: 18,
                flexShrink: 0,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 9,
              }}
            >
              {tip.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: 650, margin: 0 }}>
                {tip.title}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>
                {tip.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px 20px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDone}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 650,
            background: accent.hex,
            color: accent.on || '#000',
            boxShadow: `0 0 28px ${accent.hex}45`,
          }}
        >
          Got it, let’s go
        </motion.button>
        <p style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
          You can reopen this anytime from Settings
        </p>
      </div>
    </motion.div>
  );
}

/* ─── actions ────────────────────────────────────────────────────── */
const SIDEBAR_ACTIONS = [
  {
    id: 'screenshot',
    label: 'Screenshot',
    shortcut: 'F12',
    icon: Icons.screenshot,
    run: async () => {
      const p = await window.launcherAPI?.takeScreenshot?.();
      return p ? `📸 Saved → ${p}` : '📸 Screenshot taken!';
    },
  },
  {
    id: 'launch',
    label: 'Launch Game',
    shortcut: null,
    icon: Icons.launch,
    run: async () => {
      await window.launcherAPI?.launchGame?.();
      return '🎮 Launching…';
    },
  },
  {
    id: 'update',
    label: 'Check Updates',
    shortcut: null,
    icon: Icons.update,
    run: async () => {
      const res = await window.launcherAPI?.checkForUpdates?.();
      return res?.hasUpdate ? `🔄 v${res.version} ready — restart to install.` : '✅ Up to date.';
    },
  },
  {
    id: 'theme',
    label: 'Cycle Theme',
    shortcut: null,
    icon: Icons.theme,
    run: async (settings: any, update: any) => {
      const keys = Object.keys(THEMES);
      const next = keys[(keys.indexOf(settings.theme) + 1) % keys.length];
      update({ theme: next });
      return `🎨 Theme → ${THEMES[next].label}`;
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    shortcut: null,
    icon: Icons.settings,
    run: async () => {
      window.launcherAPI?.navigateTo?.('settings');
      return '⚙️ Opening Settings…';
    },
  },
  {
    id: 'ollama',
    label: 'Install Ollama',
    shortcut: null,
    icon: Icons.ollama,
    run: async () => {
      const res = await window.launcherAPI?.installOllama?.();
      if (res?.alreadyInstalled) return '✅ Ollama already installed.';
      if (res?.ok) return '🚀 Ollama installed! Pulling model…';
      return `⚠️ Failed: ${res?.error || 'unknown'}`;
    },
  },
  {
    id: 'uninstall',
    label: 'Uninstall',
    shortcut: null,
    icon: Icons.trash,
    danger: true,
    run: async () => {
      const ok = await window.launcherAPI?.confirmUninstall?.();
      return ok ? '🗑️ Uninstall started.' : '❌ Cancelled.';
    },
  },
];

/* ─── message bubble ─────────────────────────────────────────────── */
function MessageBubble({ m, expression, accent, profile }: { m: any; expression: string; accent: any; profile?: any }) {
  const isUser = m.role === 'user';
  const isSystem = m.role === 'system';

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center my-1">
        <span
          className="text-[11px] px-3 py-1 rounded-full font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {m.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2 group ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <img
          src={FayePink}
          alt="Faye"
          className="shrink-0 object-contain rounded-full self-end mb-0.5"
          style={{ width: 28, height: 28, border: '1.5px solid rgba(255,255,255,0.1)' }}
        />
      )}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-3.5 py-2.5 text-[13px] leading-[1.55]"
          style={
            isUser
              ? {
                  background: `linear-gradient(145deg, ${accent.hex}, ${accent.hex}cc)`,
                  color: accent.on || '#fff',
                  borderRadius: '14px 14px 3px 14px',
                  boxShadow: `0 4px 16px ${accent.hex}30`,
                  fontWeight: 500,
                }
              : {
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.92)',
                  borderRadius: '14px 14px 14px 3px',
                }
          }
        >
          {m.content}
        </div>
        {m.ts && (
          <span
            className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity px-1 tabular-nums"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {m.ts}
          </span>
        )}
      </div>
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-full overflow-hidden self-end mb-0.5"
          style={{ border: `1.5px solid ${accent.hex}50` }}
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: `${accent.hex}30`, color: accent.hex }}
            >
              {(profile?.displayName ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── chat panel ─────────────────────────────────────────────────── */
function ChatPanel({
  accent, messages, input, setInput, thinking, expression, ready,
  onSend, onClose, enabled, onEnable, starting, onDisable, onClearChat, profile, pulling, pullProgress, settings,
  update
}: any) {
  const bottomRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="flex flex-col overflow-hidden"
      style={{
        width: 400,
        height: 580,
        background: '#0a0a0c',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03), 0 0 50px ${accent.hex}12`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}30, transparent)`, borderRadius: '20px 20px 0 0' }} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="relative shrink-0">
          <img
            src={FayePink}
            alt="Faye"
            className="relative z-10 object-contain rounded-full"
            style={{
              width: 40,
              height: 40,
              border: `1.5px solid ${thinking ? accent.hex + '80' : 'rgba(255,255,255,0.12)'}`,
              transition: 'border-color 0.3s',
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] mt-1 font-semibold leading-none tracking-tight" style={{ color: '#fff' }}>
              Faye
            </p>
            {ready && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${accent.hex}20`,
                  color: accent.hex,
                  border: `1px solid ${accent.hex}40`,
                  marginTop: 4,
                }}
              >
                {FAYE_MODELS.find(m => m.id === (settings?.fayeModel ?? 'fast'))?.displayModel ?? 'Faye Spark'}
              </span>
            )}
          </div>
          <p
            className="text-[11px] mt-0.5 flex items-center gap-1.5"
            style={{
              color: thinking ? accent.hex : ready ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.22)',
            }}
          >
            {thinking ? (
              <>
                <motion.span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: accent.hex }}
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
                Thinking…
              </>
            ) : ready ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8080' }} />
                Online ·{' '}
                <span style={{ color: accent.hex, fontWeight: 600 }}>
                  {FAYE_MODELS.find(m => m.id === (settings?.fayeModel ?? 'fast'))?.displayModel ?? 'Faye Spark'}
                </span>
              </>
            ) : enabled ? (
              'Starting…'
            ) : (
              'Offline'
            )}
          </p>
        </div>

        

        {pulling && (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      borderRadius: 20,
      gap: 12,
      padding: 24,
    }}
  >
    <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
      Downloading model…
    </div>
    <div
      style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 1.4,
      }}
    >
      {pullProgress || 'Please wait…'}
    </div>
    <div
      style={{
        width: 180,
        height: 4,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 99,
        overflow: 'hidden',
        marginTop: 8,
      }}
    >
      <motion.div
        style={{
          height: '100%',
          background: accent.hex,
          borderRadius: 99,
        }}
        animate={{ width: ['0%', '70%', '90%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  </div>
)}

        <div className="flex items-center gap-1">
          {enabled && (
            <button
              onClick={onClearChat}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
              style={{ color: 'rgba(255,255,255,0.28)' }}
              title="Clear chat"
            >
              <i className="fas fa-trash-alt" style={{ fontSize: 13 }} />
            </button>
          )}
          {enabled && (
            <button
              onClick={onDisable}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
              style={{ color: 'rgba(255,255,255,0.28)' }}
              title="Sleep Faye"
            >
              <i className="fas fa-moon" style={{ fontSize: 13 }} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            {Icons.close}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5 min-h-0">
        {!enabled ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">


              <img
                src={FayeFace}
                alt=""
                className="-mb-30"
                style={{ opacity: 1 }}
              />

            <div className="text-center">
              <p className="text-[18px] font-semibold mb-2.5 tracking-tight" style={{ color: '#fff' }}>
                Wake Faye
              </p>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Fully offline · Local AI ·{' '}
                <span style={{ color: accent.hex }}>
                  {FAYE_MODELS.find(m => m.id === (settings?.fayeModel ?? 'fast'))?.displayModel ?? 'Faye Spark'}
                </span>
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onEnable}
              disabled={starting}
              className="px-9 py-3 rounded-2xl text-[13px] font-semibold transition-all"
              style={{
                background: accent.hex,
                color: accent.on || '#000',
                opacity: starting ? 0.7 : 1,
                boxShadow: `0 0 28px ${accent.hex}50`,
              }}
            >
              {starting ? 'Waking up…' : 'Wake Faye'}
            </motion.button>
          </div>
        ) : (
          <>
            {messages.length === 0 && !thinking && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Say something…
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m: any, i: number) => (
                <MessageBubble
                  key={i}
                  m={m}
                  expression={i === messages.length - 1 && m.role === 'assistant' ? expression : 'neutral'}
                  accent={accent}
                  profile={profile}
                />
              ))}
            </AnimatePresence>

            {thinking && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2.5">
                <img
                  src={FayePink}
                  alt=""
                  className="shrink-0 object-contain rounded-full"
                  style={{ width: 30, height: 30, border: '1.5px solid rgba(255,255,255,0.1)' }}
                />
                <div
                  className="flex items-center gap-1.5 px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px 16px 16px 4px',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="block w-1.5 h-1.5 rounded-full"
                      style={{ background: accent.hex }}
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -3.5, 0] }}
                      transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.16 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      {enabled && (
        <div className="pb-4 rounded pt-1 shrink-0">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.045)',
              border: `1.5px solid ${input.trim() && ready ? `${accent.hex}50` : 'rgba(255,255,255,0.07)'}`,
              boxShadow: input.trim() && ready ? `0 0 0 3px ${accent.hex}10` : 'none',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
              placeholder={ready ? 'Message Faye…' : 'Starting…'}
              disabled={!ready || thinking}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/20"
              style={{ color: 'rgba(255,255,255,0.92)' }}
              autoFocus
            />
            <button
              onClick={onSend}
              disabled={!ready || thinking || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90"
              style={{
                background: input.trim() && ready ? accent.hex : 'rgba(255,255,255,0.06)',
                color: input.trim() && ready ? (accent.on || '#000') : 'rgba(255,255,255,0.2)',
                boxShadow: input.trim() && ready ? `0 0 14px ${accent.hex}45` : 'none',
              }}
            >
              {Icons.send}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── hardware panel ─────────────────────────────────────────────── */
function StatBar({ label, value, color, unit = '%' }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(0)}{unit}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 999, background: color }}
        />
      </div>
    </div>
  );
}

function HwBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 10,
        padding: '9px 11px',
        border: '1px solid rgba(255,255,255,0.045)',
      }}
    >
      {children}
    </div>
  );
}

function HwRowHeader({ label, temp, hot }: { label: string; temp: number; hot: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {temp > 0 && (
        <span
          style={{
            fontSize: 10,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
            color: hot ? '#f87171' : 'rgba(255,255,255,0.28)',
            background: hot ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)',
            padding: '1px 6px',
            borderRadius: 5,
            border: `1px solid ${hot ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {temp}°C
        </span>
      )}
    </div>
  );
}

function NetTile({ label, value, color, arrow }: { label: string; value: string; color: string; arrow: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 10,
        padding: '8px 10px',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {arrow} {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {value}
        <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.25)', marginLeft: 3 }}>MB/s</span>
      </div>
    </div>
  );
}

function HardwarePanel({ accent, onClose }: { accent: any; onClose: () => void }) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 380, y: 80 });
  const [stats, setStats] = useState<any>({
    cpu: 0, gpu: 0, ram: 0, ramUsed: 0, ramTotal: 0,
    vram: 0, vramUsed: 0, vramTotal: 0,
    disk: 0, net: { up: 0, down: 0 },
    cpuTemp: 0, gpuTemp: 0,
    gpuName: 'GPU', cpuName: 'CPU',
  });

  useEffect(() => {
    const poll = async () => {
      const s = await window.launcherAPI?.getHardwareStats?.();
      if (s) setStats(s);
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const cpuColor  = stats.cpu  > 85 ? '#f87171' : stats.cpu  > 60 ? '#fb923c' : '#34d399';
  const gpuColor  = stats.gpu  > 85 ? '#f87171' : stats.gpu  > 60 ? '#fb923c' : '#818cf8';
  const ramColor  = stats.ram  > 85 ? '#f87171' : stats.ram  > 60 ? '#fb923c' : '#38bdf8';
  const diskColor = stats.disk > 85 ? '#f87171' : '#a78bfa';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 300,
        pointerEvents: 'auto',
        zIndex: 200,
        background: '#0d0d0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '11px 14px 10px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>{Icons.hardware}</span>
          <span style={{ color: '#e8e8e8', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em' }}>System</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.05)',
              padding: '2px 6px',
              borderRadius: 5,
              border: '1px solid rgba(255,255,255,0.07)',
              letterSpacing: '0.06em',
            }}
          >
            LIVE
          </span>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
          {Icons.close}
        </button>
      </div>

      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <HwBlock>
          <HwRowHeader label={stats.cpuName || 'CPU'} temp={stats.cpuTemp} hot={stats.cpuTemp > 85} />
          <StatBar label="Load" value={stats.cpu} color={cpuColor} />
        </HwBlock>

        <HwBlock>
          <HwRowHeader label={stats.gpuName || 'GPU'} temp={stats.gpuTemp} hot={stats.gpuTemp > 85} />
          <StatBar label="Load" value={stats.gpu} color={gpuColor} />
          {stats.vramTotal > 0 && (
            <div style={{ marginTop: 8 }}>
              <StatBar
                label={`VRAM  ${stats.vramUsed?.toFixed(1)} / ${stats.vramTotal?.toFixed(1)} GB`}
                value={(stats.vramUsed / stats.vramTotal) * 100}
                color="#7c6fcd"
              />
            </div>
          )}
        </HwBlock>

        <HwBlock>
          <StatBar label={`RAM  ${stats.ramUsed?.toFixed(1)} / ${stats.ramTotal?.toFixed(1)} GB`} value={stats.ram} color={ramColor} />
          <div style={{ marginTop: 8 }}>
            <StatBar label="Disk" value={stats.disk} color={diskColor} />
          </div>
        </HwBlock>

        <div style={{ display: 'flex', gap: 6 }}>
          <NetTile label="Upload" value={(stats.net?.up ?? 0).toFixed(1)} color="#34d399" arrow="↑" />
          <NetTile label="Download" value={(stats.net?.down ?? 0).toFixed(1)} color="#5b9bd5" arrow="↓" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Music Player (real auto-next) ──────────────────────────────── */
interface YTResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
}

function parseYTMResults(data: any): YTResult[] {
  const results: YTResult[] = [];
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
        const cols: any[] = r.flexColumns ?? [];
        const title =
          cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? '';
        const channel =
          cols[1]?.musicResponsiveListItemFlexColumnRenderer
            ?.text?.runs?.find((run: any) => run?.navigationEndpoint?.browseEndpoint)?.text ??
          cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? '';
        const thumbs: any[] = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? '';
        const fixedCols: any[] = r.fixedColumns ?? [];
        const duration =
          fixedCols[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ?? '';
        results.push({ videoId, title, channel, thumbnail, duration });
      }
    }
  } catch {}
  return results;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

function MusicPanel({ 
  accent, 
  onClose,
  initialQuery = '',
  onCommandRef,
}: { 
  accent: any; 
  onClose: () => void;
  initialQuery?: string;
  onCommandRef?: (fn: (cmd: string) => void) => void;
}) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 380, y: 80 });

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YTResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<YTResult | null>(null);
  const [queue, setQueue] = useState<YTResult[]>([]);
  const [history, setHistory] = useState<YTResult[]>([]);
  const [view, setView] = useState<'search' | 'queue'>('search');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<any>(null);
  const playNextRef = useRef<() => void>(() => {});
  const currentRef = useRef<YTResult | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<number | null>(null);
  const hasAutoPlayed = useRef(false);

  const search = async (q: string, autoPlay = false) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await window.launcherAPI.ytmSearch(q);
      const items = parseYTMResults(data);
      setResults(items);
      if (items.length === 0) {
        setError('No results — try a different search.');
      } else if (autoPlay && items.length > 0) {
        play(items[0]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  // Auto search + play when opened with a query from Faye
  // Auto search + play when opened with a query
useEffect(() => {
  if (initialQuery.trim()) {
    setQuery(initialQuery);
    // small delay so the panel is mounted
    setTimeout(async () => {
      setLoading(true);
      try {
        const data = await window.launcherAPI.ytmSearch(initialQuery);
        const items = parseYTMResults(data);
        setResults(items);
        if (items.length > 0) {
          play(items[0]);          // auto play the first result
        } else {
          setError('No results found');
        }
      } catch (e: any) {
        setError(e.message ?? 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);
  }
}, [initialQuery]);

  const destroyPlayer = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
  };

  useEffect(() => { playNextRef.current = playNext; });

  const createPlayer = async (videoId: string) => {
    await loadYouTubeAPI();
    destroyPlayer();

    if (!playerContainerRef.current) return;

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: (e: any) => {
          setIsPlaying(true);
          setDuration(e.target.getDuration());
          progressInterval.current = window.setInterval(() => {
            if (playerRef.current?.getCurrentTime) {
              setProgress(playerRef.current.getCurrentTime());
              setDuration(playerRef.current.getDuration());
            }
          }, 400);
        },
        onStateChange: (e: any) => {
          if (e.data === 0) {
            playNextRef.current();
          } else if (e.data === 1) {
            setIsPlaying(true);
          } else if (e.data === 2) {
            setIsPlaying(false);
          }
        },
      },
    });
  };

  const play = (track: YTResult) => {
  if (current) setHistory((h) => [...h, current]);
  setCurrent(track);
  currentRef.current = track;  // keep ref in sync
  setView('search');
  createPlayer(track.videoId);
};

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const playNext = async () => {
  if (queue.length > 0) {
    const [next, ...rest] = queue;
    if (currentRef.current) setHistory((h) => [...h, currentRef.current!]);
    setCurrent(next);
    currentRef.current = next;  // sync ref
    setQueue(rest);
    createPlayer(next.videoId);
    return;
  }

  if (!currentRef.current) { setIsPlaying(false); return; }

  try {
    setLoading(true);
    const ids: string[] = await window.launcherAPI.getRelatedVideos(currentRef.current.videoId) ?? [];

    if (ids.length === 0) {
      const artist = currentRef.current.channel.replace(/\s*-\s*Topic$/, '').trim();
      const data = await window.launcherAPI.ytmSearch(artist);
      const items = parseYTMResults(data).filter(i => i.videoId !== currentRef.current!.videoId);
      if (items.length === 0) { setIsPlaying(false); return; }
      setQueue(items.slice(1, 5));
      if (currentRef.current) setHistory((h) => [...h, currentRef.current!]);
      setCurrent(items[0]);
      currentRef.current = items[0];
      createPlayer(items[0].videoId);
      return;
    }

    const fetchMeta = async (vid: string): Promise<YTResult> => {
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
        const d = await r.json();
        return { videoId: vid, title: d.title ?? 'Unknown', channel: d.author_name ?? '', thumbnail: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` };
      } catch {
        return { videoId: vid, title: 'Unknown', channel: '', thumbnail: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` };
      }
    };

    const tracks = await Promise.all(ids.slice(0, 6).map(fetchMeta));
    const [nextTrack, ...queueTracks] = tracks;

    if (currentRef.current) setHistory((h) => [...h, currentRef.current!]);
    setCurrent(nextTrack);
    currentRef.current = nextTrack;  // sync ref
    setQueue(queueTracks);
    createPlayer(nextTrack.videoId);

  } catch (err) {
    console.error('playNext failed', err);
    setIsPlaying(false);
  } finally {
    setLoading(false);
  }
};

  const playPrev = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    if (current) setQueue((q) => [current, ...q]);
    setCurrent(prev);
    createPlayer(prev.videoId);
  };

  const addToQueue = (track: YTResult) => {
    if (!current) {
      play(track);
      return;
    }
    setQueue((q) => [...q, track]);
  };

  const removeFromQueue = (idx: number) => setQueue((q) => q.filter((_, i) => i !== idx));

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;
    playerRef.current.seekTo(time, true);
    setProgress(time);
  };

  useEffect(() => {
    return () => destroyPlayer();
  }, []);

  useEffect(() => {
  onCommandRef?.((cmd) => {
    if (cmd === 'next') playNext();
    if (cmd === 'pause') togglePlay();
  });
}, []);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 360,
        maxHeight: 640,
        pointerEvents: 'auto',
        zIndex: 200,
        background: '#0a0a0b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '13px 16px',
          cursor: 'grab',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#1DB954' }}>{Icons.music}</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', flex: 1 }}>
          Music
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setView((v) => (v === 'queue' ? 'search' : 'queue'));
          }}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            background: view === 'queue' ? 'rgba(29,185,84,0.18)' : 'rgba(255,255,255,0.06)',
            color: view === 'queue' ? '#1DB954' : 'rgba(255,255,255,0.45)',
          }}
        >
          Queue {queue.length > 0 && `· ${queue.length}`}
        </button>

        <button
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 3 }}
        >
          {Icons.close}
        </button>
      </div>

      {/* Now Playing */}
      {current && (
        <div style={{ flexShrink: 0, background: '#111113' }}>
          <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
            <div ref={playerContainerRef} />
          </div>

          <div style={{ padding: '16px 16px 10px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <img
              src={current.thumbnail}
              alt=""
              style={{
                width: 68,
                height: 68,
                borderRadius: 10,
                objectFit: 'cover',
                boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.title}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.channel}
              </p>
            </div>
          </div>

          <div style={{ padding: '0 16px 6px' }}>
            <div
              onClick={seek}
              style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${duration ? (progress / duration) * 100 : 0}%`,
                  background: '#1DB954',
                  borderRadius: 2,
                  transition: 'width 0.15s linear',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '6px 16px 18px' }}>
            <button
              onClick={playPrev}
              disabled={history.length === 0}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: history.length ? 'pointer' : 'default',
                color: history.length ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)',
                display: 'flex',
              }}
            >
              {Icons.prev}
            </button>

            <button
              onClick={togglePlay}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                border: 'none',
                background: '#fff',
                color: '#000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
              }}
            >
              {isPlaying ? Icons.pause : Icons.play}
            </button>

            <button
              onClick={playNext}
              disabled={queue.length === 0}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: queue.length ? 'pointer' : 'default',
                color: queue.length ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)',
                display: 'flex',
              }}
            >
              {Icons.next}
            </button>
          </div>
        </div>
      )}

      {/* Queue + Search views stay exactly the same as your current code */}
      {view === 'queue' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 16px' }}>
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>
              Queue is empty
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {queue.map((t, i) => (
                <motion.div
                  key={t.videoId + i}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16, transition: { duration: 0.12 } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 10px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    marginBottom: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    play(t);
                    removeFromQueue(i);
                  }}
                >
                  <img src={t.thumbnail} alt="" style={{ width: 48, height: 48, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>{t.channel}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(i);
                    }}
                    style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {view === 'search' && (
        <>
          <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.055)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '10px 14px',
              }}
            >
              <i className="fas fa-search" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') search(query);
                }}
                placeholder="Search music…"
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#fff',
                  caretColor: '#1DB954',
                }}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setError('');
                    searchRef.current?.focus();
                  }}
                  style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 16px' }}>
            {error && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,100,100,0.7)', fontSize: 13 }}>
                {error}
              </div>
            )}
            {!error && results.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.16)', fontSize: 13 }}>
                {current ? 'Search for more' : 'Search to start listening'}
              </div>
            )}
            {loading && (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Searching…
              </div>
            )}

            <AnimatePresence initial={false}>
              {results.map((r, i) => {
                const isPlayingNow = current?.videoId === r.videoId;
                return (
                  <motion.div
                    key={r.videoId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 10px',
                      borderRadius: 10,
                      marginBottom: 4,
                      background: isPlayingNow ? 'rgba(29,185,84,0.1)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isPlayingNow) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isPlayingNow) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={r.thumbnail}
                        alt=""
                        style={{ width: 48, height: 48, borderRadius: 7, objectFit: 'cover', display: 'block' }}
                      />
                      {isPlayingNow && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 7,
                            background: 'rgba(0,0,0,0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
                            {[0, 1, 2].map((b) => (
                              <motion.div
                                key={b}
                                style={{ width: 3, background: '#1DB954', borderRadius: 1 }}
                                animate={{ height: [4, 14, 4] }}
                                transition={{ duration: 0.65, repeat: Infinity, delay: b * 0.13, ease: 'easeInOut' }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: isPlayingNow ? '#1DB954' : '#e5e5e5',
                          fontWeight: isPlayingNow ? 600 : 400,
                          fontSize: 13,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.title}
                      </p>
                      <p
                        style={{
                          color: 'rgba(255,255,255,0.32)',
                          fontSize: 11,
                          margin: '2px 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.channel}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!isPlayingNow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            play(r);
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {Icons.play}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(r);
                        }}
                        title="Add to queue"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ─── Notes Panel ────────────────────────────────────────────────── */
const NOTES_KEY = 'faye_quick_notes_v1';

function NotesPanel({ accent, onClose }: { accent: any; onClose: () => void }) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth / 2 + 60, y: 80 });

  type Note = { id: number; text: string; ts: string; pinned?: boolean };

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
      return Array.isArray(raw)
        ? raw.map((n: any, i: number) =>
            typeof n === 'string' ? { id: Date.now() + i, text: n, ts: nowTime() } : n
          )
        : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const save = (n: Note[]) => {
    setNotes(n);
    localStorage.setItem(NOTES_KEY, JSON.stringify(n));
  };

  const addNote = () => {
    const t = input.trim();
    if (!t) return;
    if (editingId !== null) {
      save(notes.map((n) => (n.id === editingId ? { ...n, text: t, ts: nowTime() } : n)));
      setEditingId(null);
    } else {
      save([{ id: Date.now(), text: t, ts: nowTime(), pinned: false }, ...notes]);
    }
    setInput('');
  };

  const deleteNote = (id: number) => save(notes.filter((n) => n.id !== id));
  const togglePin = (id: number) =>
    save(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setInput(note.text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const wrapSelection = (before: string, after: string = before) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = input.slice(start, end);
    const newText = input.slice(0, start) + before + selected + after + input.slice(end);
    setInput(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const filtered = notes
    .filter((n) => n.text.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const renderText = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:4px;font-size:11px">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 340,
        maxHeight: 520,
        pointerEvents: 'auto',
        zIndex: 200,
        background: '#0c0c0e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 40px ${accent.hex}12`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}30, transparent)` }} />

      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '13px 16px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: accent.hex }}>{Icons.notes}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
            Notes
          </span>
          {notes.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 7px',
                borderRadius: 20,
              }}
            >
              {notes.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {notes.length > 0 && (
            <button
              onClick={() => save([])}
              title="Clear all"
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
          >
            {Icons.close}
          </button>
        </div>
      </div>

      {notes.length > 3 && (
        <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter notes…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 12,
              color: '#fff',
              outline: 'none',
              caretColor: accent.hex,
            }}
          />
        </div>
      )}

      <div style={{ padding: '12px 14px 10px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 8,
            opacity: input.length > 0 || editingId ? 1 : 0.4,
            transition: 'opacity 0.15s',
          }}
        >
          {[
            { label: 'B', title: 'Bold', action: () => wrapSelection('**') },
            { label: 'I', title: 'Italic', action: () => wrapSelection('*') },
            { label: 'S', title: 'Strikethrough', action: () => wrapSelection('~~') },
            { label: '`', title: 'Code', action: () => wrapSelection('`') },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              title={btn.title}
              style={{
                width: 28,
                height: 26,
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: btn.label === 'B' ? 700 : 500,
                fontStyle: btn.label === 'I' ? 'italic' : 'normal',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.045)',
            borderRadius: 12,
            border: `1px solid ${input.trim() || editingId ? `${accent.hex}50` : 'rgba(255,255,255,0.07)'}`,
            overflow: 'hidden',
            transition: 'border-color 0.15s',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addNote();
              }
            }}
            placeholder={editingId ? 'Edit note…' : 'Write a note… (Shift+Enter for new line)'}
            rows={3}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '11px 12px 8px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.92)',
              caretColor: accent.hex,
              lineHeight: 1.45,
              fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px 9px' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              {editingId ? 'Editing…' : '**bold**  *italic*  ~~strike~~'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setInput('');
                  }}
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  Cancel
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={addNote}
                disabled={!input.trim()}
                style={{
                  height: 28,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: input.trim() ? 'pointer' : 'default',
                  background: input.trim() ? accent.hex : 'rgba(255,255,255,0.06)',
                  color: input.trim() ? (accent.on || '#000') : 'rgba(255,255,255,0.25)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {editingId ? 'Save' : 'Add'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.16)', fontSize: 13 }}>
            {filter ? 'No matching notes' : 'No notes yet'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                layout
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: n.pinned ? `${accent.hex}12` : 'rgba(255,255,255,0.035)',
                  borderRadius: 12,
                  padding: '11px 12px',
                  border: `1px solid ${n.pinned ? `${accent.hex}30` : 'rgba(255,255,255,0.05)'}`,
                  position: 'relative',
                }}
              >
                {n.pinned && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: accent.hex,
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderText(n.text) }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      {n.ts}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => togglePin(n.id)}
                    title={n.pinned ? 'Unpin' : 'Pin'}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: 'none',
                      background: 'transparent',
                      color: n.pinned ? accent.hex : 'rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => startEdit(n)}
                    title="Edit"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteNote(n.id)}
                    title="Delete"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Side button ────────────────────────────────────────────────── */
function SideBtn({
  icon, label, onClick, accent, active = false, danger = false, shortcut, activeColor,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent: any;
  active?: boolean;
  danger?: boolean;
  shortcut?: string | null;
  activeColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const aColor = activeColor || accent.hex;

  return (
    <div className="relative flex items-center">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150"
        style={{
          background: active
            ? `${aColor}25`
            : danger
            ? hovered
              ? 'rgba(239,68,68,0.18)'
              : 'rgba(239,68,68,0.08)'
            : hovered
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.05)',
          border: active
            ? `1.5px solid ${aColor}50`
            : danger
            ? '1px solid rgba(239,68,68,0.2)'
            : '1px solid rgba(255,255,255,0.07)',
          color: active
            ? aColor
            : danger
            ? 'rgba(248,113,113,0.85)'
            : hovered
            ? '#fff'
            : 'rgba(255,255,255,0.45)',
          boxShadow: active ? `0 0 16px ${aColor}30` : 'none',
        }}
      >
        {icon}
      </motion.button>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-[56px] flex items-center gap-2 pointer-events-none z-50"
            style={{ whiteSpace: 'nowrap' }}
          >
            <div
              className="px-2.5 py-1.5 rounded-xl text-[12px] font-medium"
              style={{
                background: 'rgba(18,18,26,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              {label}
              {shortcut && (
                <span
                  className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {shortcut}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Overlay ───────────────────────────────────────────────── */
export default function FayeOverlay({ profile }: { profile?: any }) {
  const { settings, update } = useSettings();
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  

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

    function buildStars(count: number, spread: number, size: number, opacity: number, brightFraction = 0) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3 - 5;
        const r = Math.random();
        if (i < count * brightFraction) {
          col[i * 3] = 0.85 + Math.random() * 0.15;
          col[i * 3 + 1] = 0.9 + Math.random() * 0.1;
          col[i * 3 + 2] = 1.0;
        } else if (r < 0.08) {
          col[i * 3] = 1.0;
          col[i * 3 + 1] = 0.92 + Math.random() * 0.08;
          col[i * 3 + 2] = 0.75 + Math.random() * 0.15;
        } else {
          const v = 0.82 + Math.random() * 0.18;
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
        }
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size,
          transparent: true,
          opacity,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
      );
    }

    const dustA = buildStars(2200, 80, 0.008, 0.55);
    const dustB = buildStars(800, 50, 0.014, 0.45);
    const midStars = buildStars(400, 35, 0.026, 0.6, 0.05);
    const brightStars = buildStars(60, 20, 0.055, 0.7, 1.0);
    scene.add(dustA, dustB, midStars, brightStars);

    let animId: number, t = 0;
    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.01;
      dustA.rotation.y = t * 0.005;
      dustB.rotation.y = t * 0.009;
      midStars.rotation.y = t * 0.013;
      brightStars.rotation.y = t * 0.018;
      dustA.rotation.x = t * 0.002;
      dustB.rotation.x = -t * 0.003;
      camera.position.x = Math.sin(t * 0.1) * 0.3;
      camera.position.y = 0.5 + Math.cos(t * 0.07) * 0.15;
      camera.lookAt(0, 0, 0);
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

  useEffect(() => {
    bgVideoRef.current?.play().catch(() => {});
  }, []);

  const [chatOpen, setChatOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem(ONBOARD_KEY));
  const [enabled, setEnabled] = useState(settings?.fayeAiEnabled ?? false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [expression, setExpression] = useState('neutral');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [pulling, setPulling] = useState(false);
const [pullProgress, setPullProgress] = useState('');

const [voiceOnly, setVoiceOnly] = useState(false);
const [lastTranscript, setLastTranscript] = useState('');

  const currentModelRef = useRef('phi3:mini');
  const musicCommandRef = useRef<((cmd: string) => void) | null>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing'>('idle');

  useEffect(() => {
  const unsub = window.launcherAPI?.onSettingsSync?.((s: any) => {
    localStorage.setItem('stay.launcher.settings.v1', JSON.stringify(s));
    update(s);
  });
  return () => unsub?.();
}, []);

  useEffect(() => {
    const unsub = window.launcherAPI?.onOverlayShow?.(() => {
      setChatOpen(false);
    });
    return () => unsub?.();
  }, []);

useEffect(() => {
  const unsub = window.launcherAPI?.onPullProgress?.((msg: string) => {
    setPullProgress(msg.trim());
  });



  

  return () => {
    if (typeof unsub === 'function') unsub();
  };
}, []);

  useEffect(() => {
    if (enabled) window.launcherAPI?.faye?.isReady().then(setReady);
  }, []);

  // Restart Faye when the user changes the model in Settings
const switchingModelRef = useRef(false);

useEffect(() => {
  if (!enabled || !settings?.fayeModel || switchingModelRef.current) return;

  const modelMap: Record<string, string> = {
    fast: 'phi3:mini',
    balanced: 'qwen2.5:14b',
    quality: 'qwen2.5:32b',
  };

  const desired = modelMap[settings.fayeModel] || 'phi3:mini';
  if (currentModelRef.current === desired) return;

  switchingModelRef.current = true;

  (async () => {
    setReady(false);
    setThinking(true);
    await window.launcherAPI.faye.stop();
    let result = await window.launcherAPI.faye.start(desired);

    if (result?.needsPull) {
      setPulling(true);
      setPullProgress('Starting download…');
      const pull = await window.launcherAPI.faye.pullModel(desired);
      setPulling(false);
      setPullProgress('');
      if (!pull?.ok) {
        setThinking(false);
        switchingModelRef.current = false;
        return;
      }
      result = await window.launcherAPI.faye.start(desired);
    }

    if (result?.ok) {
      currentModelRef.current = desired;
      setReady(true);
      setMessages(m => [...m, { role: 'system', content: `Switched to ${settings.fayeModel} model`, ts: nowTime() }]);
    }

    setThinking(false);
    switchingModelRef.current = false;
  })();
}, [settings?.fayeModel, enabled]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        else window.launcherAPI?.hideOverlay?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chatOpen]);

  const playFayeAudio = (name: string) => {
    const base = import.meta.env.DEV ? '' : '.';
    const audio = new Audio(`${base}/faye-audio/${name}.mp3`);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  };

  const handleVoiceCommand = async (transcript: string) => {
      setVoiceState('processing');
      const intent = detectIntent(transcript);
      if (!intent) { 
        playFayeAudio('unknown'); 
        setVoiceState('idle');
        return; 
      }
      switch (intent.type) {
        case 'screenshot':
          await window.launcherAPI?.takeScreenshot?.();
          playFayeAudio('screenshot');
          break;
        case 'play_music':
          setVoiceOnly(false);
          setMusicOpen(false);        // ← close first to force remount
          setMusicQuery('');          // ← reset query
          setTimeout(() => {
            setMusicQuery(intent.args?.query ?? '');
            setMusicOpen(true);       // ← reopen fresh
          }, 50);
          playFayeAudio('music');
          break;
        case 'open_music':
          setVoiceOnly(false);
          setMusicOpen(true);
          playFayeAudio('music');
          break;
        case 'next_song':
          musicCommandRef.current?.('next');
          playFayeAudio('music');
          break;
        case 'pause_music':
          musicCommandRef.current?.('pause');
          playFayeAudio('music');
          break;
        case 'volume':
          await window.launcherAPI?.fayeCommand?.('volume', intent.args);
          playFayeAudio(intent.args?.direction === 'up' ? 'volume_up' : 'volume_down');
          break;
        case 'open_notes':
          setVoiceOnly(false);
          setNotesOpen(true);
          playFayeAudio('note');
          break;
        case 'add_note': {
          setVoiceOnly(false);
          const existing = JSON.parse(localStorage.getItem('faye_quick_notes_v1') || '[]');
          const newNote = { id: Date.now(), text: intent.args?.text ?? '', ts: nowTime(), pinned: false };
          localStorage.setItem('faye_quick_notes_v1', JSON.stringify([newNote, ...existing]));
          setNotesOpen(false);
          setTimeout(() => setNotesOpen(true), 50);
          playFayeAudio('note');
          break;
        }
        default:
          playFayeAudio('unknown');
    }
    setVoiceState('idle');
  };

  useEffect(() => {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const unsubStart = window.launcherAPI?.onVoiceStart?.((payload: any) => {
  setVoiceOnly(!!payload?.voiceOnly);  // was: setVoiceOnly(!!payload?.voiceOnly) but payload wasn't in scope
    setVoiceState('listening');
    playFayeAudio('wake');
    chunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();
    }).catch((err) => {
      console.error('[voice] mic error:', err);
      setVoiceState('idle');
    });
  });

  const unsubStop = window.launcherAPI?.onVoiceStop?.(() => {
    if (!mediaRecorder) return;
    setVoiceState('processing');

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const audioData = Array.from(new Uint8Array(arrayBuffer));

      const transcript = await window.launcherAPI?.transcribeAudio?.(audioData);

if (transcript) {
  setLastTranscript(transcript);
  handleVoiceCommand(transcript);
} else {
  playFayeAudio('unknown');
}
      setVoiceState('idle');
      setVoiceOnly(false);
      window.launcherAPI?.voiceDone?.();
    };

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  });

  return () => {
    unsubStart?.();
    unsubStop?.();
  };
}, []);

  

async function handleEnable() {
  setEnabled(true);
  setStarting(true);
  update({ fayeAiEnabled: true });
  const modelMap: Record<string, string> = {
    fast: 'phi3:mini',
    balanced: 'qwen2.5:14b',
    quality: 'qwen2.5:32b',
  };
  // Read directly from localStorage in case overlay settings are stale
  const rawSettings = JSON.parse(localStorage.getItem('stay.launcher.settings.v1') || '{}');
  const modelKey = rawSettings?.fayeModel ?? settings?.fayeModel ?? 'fast';
  const modelName = modelMap[modelKey] || 'phi3:mini';

  const result = await window.launcherAPI.faye.start(modelName);
console.log('[faye] start result:', JSON.stringify(result));

if (result.needsPull) {
  const fallback = await window.launcherAPI.faye.start('phi3:mini');
  currentModelRef.current = 'phi3:mini';
  if (!fallback.ok) { setStarting(false); return; }
  // replace result so the rest of handleEnable continues normally
  Object.assign(result, fallback);
} else {
  currentModelRef.current = modelName;
}
  setStarting(false);
  if (result.ok) {
    setReady(true);
    setThinking(true);
    setExpression('thinking');
    const res = await window.launcherAPI.faye.chat(
      [{ role: 'user', content: 'greet me, you just woke up' }],
      profile?.displayName || null,
      null,
      modelName
    );
    console.log('[faye] chat result:', JSON.stringify(res));
    setThinking(false);
    if (res.ok) {
      setExpression(pickExpression(res.content));
      setMessages([{ role: 'assistant', content: res.content, ts: nowTime() }]);
    } else {
      setMessages([{ role: 'system', content: `⚠️ Faye failed to respond: ${res?.error || JSON.stringify(res)}`, ts: nowTime() }]);
    }
  }
}

  async function handleDisable() {
    await window.launcherAPI.faye.stop();
    setReady(false);
    setEnabled(false);
    update({ fayeAiEnabled: false });
    setMessages([]);
    setExpression('neutral');
  }

  async function sendMessage() {
    if (!input.trim() || thinking || !ready) return;
    const userMsg = { role: 'user', content: input.trim(), ts: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');

    const intent = detectIntent(input.trim());

if (intent) {
  // Music commands
if (intent.type === 'play_music') {
  const q = intent.args?.query?.trim() || '';
  setMusicQuery(q);
  setMusicOpen(true);

  setMessages([...next, { 
    role: 'assistant', 
    content: q 
      ? `Playing "${q}"...` 
      : 'Opening music player...', 
    ts: nowTime() 
  }]);
  setExpression('happy');
  return;
}

  if (intent.type === 'open_music') {
    setMusicOpen(true);
    setMessages([...next, { role: 'assistant', content: 'Opening music player.', ts: nowTime() }]);
    return;
  }

  if (intent.type === 'open_notes') {
    setNotesOpen(true);
    setMessages([...next, { role: 'assistant', content: 'Opening notes.', ts: nowTime() }]);
    return;
  }

  if (intent.type === 'open_hardware') {
    setHwOpen(true);
    setMessages([...next, { role: 'assistant', content: 'Opening hardware stats.', ts: nowTime() }]);
    return;
  }

  if (intent.type === 'screenshot') {
    const res = await window.launcherAPI?.takeScreenshot?.();
    setMessages([...next, { 
      role: 'assistant', 
      content: res ? `Screenshot saved!` : 'Screenshot taken!', 
      ts: nowTime() 
    }]);
    setExpression('happy');
    return;
  }

  if (intent.type === 'launch') {
    await window.launcherAPI?.launchGame?.();
    setMessages([...next, { role: 'assistant', content: 'Launching game...', ts: nowTime() }]);
    setExpression('happy');
    return;
  }

  if (intent.type === 'volume') {
    await window.launcherAPI?.fayeCommand?.('volume', intent.args);
    setMessages([...next, { 
      role: 'assistant', 
      content: intent.args.direction === 'up' ? 'Volume up!' : 'Volume down!', 
      ts: nowTime() 
    }]);
    return;
  }

  if (intent.type === 'spotify') {
    await window.launcherAPI?.fayeCommand?.('spotify', intent.args);
    setMessages([...next, { 
      role: 'assistant', 
      content: intent.args?.query 
        ? `Opening Spotify for "${intent.args.query}"` 
        : 'Opening Spotify...', 
      ts: nowTime() 
    }]);
    setExpression('happy');
    return;
  }
}

        setThinking(true);
    setExpression('thinking');

    const modelMap: Record<string, string> = {
      fast: 'phi3:mini',
      balanced: 'qwen2.5:14b',
      quality: 'qwen2.5:32b',
    };
    const modelName = modelMap[currentModelRef.current === 'phi3:mini' ? 'fast' : 
  Object.keys(modelMap).find(k => modelMap[k] === currentModelRef.current) ?? 'fast'] || 'phi3:mini';

    try {
      const res = await window.launcherAPI.faye.chat(
        next.filter((m: any) => m.role !== 'system'),
        profile?.displayName || profile?.email?.split('@')[0] || null,
        null,
        modelName
      );

      if (res.ok) {
        setExpression(res.mood || pickExpression(res.content));
        setMessages([...next, { role: 'assistant', content: res.content, ts: nowTime() }]);
      } else {
        setMessages([...next, { role: 'system', content: `⚠️ ${res?.error || 'No response from Faye'}`, ts: nowTime() }]);
      }
    } finally {
      setThinking(false);
    }
  }

  async function runAction(action: any) {
    setActionFeedback(`${action.label}…`);
    try {
      const msg = await action.run(settings, update);
      setActionFeedback(msg);
    } catch {
      setActionFeedback(`⚠️ ${action.label} failed.`);
    }
    setTimeout(() => setActionFeedback(null), 3000);
  }

  const glowRgb = GLOW_COLOR[expression] || GLOW_COLOR.neutral;

  return (
    <div className="fixed inset-0" style={{ background: 'transparent', pointerEvents: 'none' }}>
      {!voiceOnly && (
        <>
      <video
        ref={bgVideoRef}
        src={DEFAULT_BG_VIDEO}
        muted
        loop
        playsInline
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        style={{ zIndex: 0, opacity: 0.62 }}
      />
      <canvas
        ref={starsCanvasRef}
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 1, mixBlendMode: 'screen' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{
          zIndex: 2,
          background: 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(1.5px)',
          WebkitBackdropFilter: 'blur(1.5px)',
          pointerEvents: 'auto',
        }}
        onClick={() => {
          if (chatOpen) setChatOpen(false);
          else window.launcherAPI?.hideOverlay?.();
        }}
      />

      {/* Left Faye art */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-0 bottom-0 flex items-end justify-start"
        style={{ width: 520, pointerEvents: 'none', zIndex: 10 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 60%, rgba(${glowRgb},0.28) 0%, transparent 65%)` }}
        />
        <motion.img
          key={expression}
          src={EXPRESSIONS[expression] || EXPRESSIONS.neutral}
          alt="Faye"
          initial={{ opacity: 0.6, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '96vh',
            width: 'auto',
            maxWidth: 520,
            objectFit: 'contain',
            objectPosition: 'bottom left',
            filter: `drop-shadow(0 0 80px rgba(${glowRgb},0.45)) drop-shadow(0 40px 80px rgba(0,0,0,0.6))`,
            marginLeft: 60,
          }}
        />
        <div className="absolute bottom-10 left-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl"
            style={{
              background: 'rgba(8,8,14,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {ready ? (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8080' }} />
            ) : (
              <motion.span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: accent.hex }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <span className="text-[14px] font-bold" style={{ color: '#fff', letterSpacing: '-0.01em' }}>
              Faye
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {ready ? (thinking ? 'Thinking…' : 'Online') : enabled ? 'Starting…' : 'Local AI'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Sidebar */}
      <DraggableSidebar
        accent={accent}
        chatOpen={chatOpen}
        hwOpen={hwOpen}
        musicOpen={musicOpen}
        notesOpen={notesOpen}
        pulling={pulling}
        pullProgress={pullProgress}
        settings={settings}
        update={update}
        onChatToggle={() => setChatOpen((v) => !v)}
        onHwToggle={() => setHwOpen((v) => !v)}
        onMusicToggle={() => setMusicOpen((v) => !v)}
        onNotesToggle={() => setNotesOpen((v) => !v)}
        onClose={() => window.launcherAPI?.hideOverlay?.()}
        onAction={runAction}
      />

      {/* Action toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            className="fixed"
            style={{
              left: '15%',
              transform: 'translateX(-50%)',
              bottom: 40,
              background: 'rgba(12,12,20,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '10px 16px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              maxWidth: 340,
            }}
          >
            {actionFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence>
        {chatOpen && (
          <DraggableChatPanel
            accent={accent}
            messages={messages}
            input={input}
            setInput={setInput}
            thinking={thinking}
            expression={expression}
            ready={ready}
            onSend={sendMessage}
            onClose={() => setChatOpen(false)}
            enabled={enabled}
            onEnable={handleEnable}
            starting={starting}
            onDisable={handleDisable}
            onClearChat={() => {
              setMessages([]);
              setExpression('neutral');
            }}
            profile={profile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hwOpen && <HardwarePanel accent={accent} onClose={() => setHwOpen(false)} />}
      </AnimatePresence>

      {/* Music panel */}
      <AnimatePresence>
        {musicOpen && (
          <MusicPanel
            accent={accent}
            onClose={() => { setMusicOpen(false); setMusicQuery(''); }}
            initialQuery={musicQuery}
            onCommandRef={(fn: (cmd: string) => void) => { musicCommandRef.current = fn; }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notesOpen && <NotesPanel accent={accent} onClose={() => setNotesOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {!onboarded && (
          <OnboardingCard
            accent={accent}
            onDone={() => {
              localStorage.setItem(ONBOARD_KEY, '1');
              setOnboarded(true);
            }}
          />
        )}
      </AnimatePresence>
      </>
      )}

      {/* Screen border glow */}
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
        borderRadius: 0,
        boxShadow: voiceState === 'listening'
          ? `inset 0 0 60px 8px ${accent.hex}55, inset 0 0 120px 20px ${accent.hex}22`
          : `inset 0 0 40px 4px rgba(255,255,255,0.08)`,
        transition: 'box-shadow 0.4s ease',
      }}
    />
  )}
</AnimatePresence>

{/* Voice indicator pill */}
<AnimatePresence>
  {voiceState !== 'idle' && (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 999,
        background: 'rgba(10,10,16,0.95)',
        border: `1px solid ${voiceState === 'listening' ? accent.hex + '60' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: voiceState === 'listening'
          ? `0 0 32px ${accent.hex}50, 0 8px 32px rgba(0,0,0,0.6)`
          : '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {voiceState === 'listening' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {[0.6, 1, 0.7, 1, 0.5].map((h, i) => (
              <motion.div
                key={i}
                style={{ width: 3, borderRadius: 99, background: accent.hex, height: 14 }}
                animate={{ scaleY: [h, 1, h * 0.4, 1, h] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            Listening…
          </span>
          <motion.span
            style={{
              fontSize: 10,
              color: accent.hex,
              fontWeight: 500,
              opacity: 0.7,
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Alt+Q to stop
          </motion.span>
        </>
      ) : (
        <>
          <motion.div
            style={{ width: 8, height: 8, borderRadius: '50%', background: accent.hex }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
            Processing…
          </span>
          {lastTranscript && voiceState === 'processing' && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              "{lastTranscript}"
            </motion.span>
          )}
        </>
      )}
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}

/* ─── Draggable wrappers ─────────────────────────────────────────── */
function DraggableSidebar({
  accent, chatOpen, hwOpen, musicOpen, notesOpen,
  onChatToggle, onHwToggle, onMusicToggle, onNotesToggle, onClose, onAction,
}: any) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 80, y: window.innerHeight / 2 - 200 });

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.06 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '8px 8px 12px',
        background: 'rgba(10,10,16,0.92)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        pointerEvents: 'auto',
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          width: 28,
          height: 4,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.12)',
          cursor: 'grab',
          margin: '4px 0 6px',
          flexShrink: 0,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 12,
          right: 12,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accent.hex}80, transparent)`,
          borderRadius: 999,
        }}
      />

      <SideBtn icon={Icons.chat} label="Chat with Faye" onClick={onChatToggle} accent={accent} active={chatOpen} />
      <SideBtn icon={Icons.hardware} label="Hardware Stats" onClick={onHwToggle} accent={accent} active={hwOpen} activeColor="#34d399" />
      <SideBtn icon={Icons.music} label="Music Player" onClick={onMusicToggle} accent={accent} active={musicOpen} activeColor="#1DB954" />
      <SideBtn icon={Icons.notes} label="Quick Notes" onClick={onNotesToggle} accent={accent} active={notesOpen} />

      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />

      {SIDEBAR_ACTIONS.map((action) => (
        <SideBtn
          key={action.id}
          icon={action.icon}
          label={action.label}
          shortcut={action.shortcut}
          onClick={() => onAction(action)}
          accent={accent}
          danger={action.danger}
        />
      ))}

      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
      <SideBtn icon={Icons.close} label="Close overlay (Esc)" onClick={onClose} accent={accent} />

      <div style={{ marginTop: 4 }}>
        <kbd
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: 9,
            fontFamily: 'monospace',
            padding: '3px 8px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          Alt+F
        </kbd>
      </div>
    </motion.div>
  );
}

function DraggableChatPanel(props: any) {
  const { pos, onMouseDown } = useDraggable({
    x: window.innerWidth / 2 - 190,
    y: window.innerHeight / 2 - 280,
  });

  return (
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'auto', zIndex: 200 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 20,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <ChatPanel {...props} />
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

import Neutral  from './images/faye/excited.png';
import Happy    from './images/faye/happy.png';
import Thinking from './images/faye/curious.png';
import Sad      from './images/faye/sad.png';
import FayeStatic from './images/faye/neutral.png';

import DEFAULT_BG_VIDEO from './videos/test_video.mp4';

const EXPRESSIONS: Record<string, string> = { neutral: Neutral, happy: Happy, thinking: Thinking, sad: Sad };

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
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  return { pos, onMouseDown };
}

/* ─── intent detection ───────────────────────────────────────────── */
function detectIntent(text: string): { type: string; args: any } | null {
  const t = text.toLowerCase();
  const spotifyMatch = t.match(/play (.+?) (?:on spotify|in spotify|on spot)/);
  if (spotifyMatch) return { type: 'spotify', args: { query: spotifyMatch[1] } };
  if ((t.includes('spotify') || t.includes('spot')) && (t.includes('play') || t.includes('open')))
    return { type: 'spotify', args: { query: '' } };
  if (t.match(/\blaunch\b|\bstart game\b|\bopen game\b/)) return { type: 'launch', args: {} };
  if (t.match(/\bscreenshot\b|\bsnap\b|\btake a screen\b/)) return { type: 'screenshot', args: {} };
  if (t.match(/volume up|louder|turn up/)) return { type: 'volume', args: { direction: 'up' } };
  if (t.match(/volume down|quieter|turn down|lower/)) return { type: 'volume', args: { direction: 'down' } };
  return null;
}

/* ─── onboarding card (shown once) ──────────────────────────────── */
const ONBOARD_KEY = 'faye_onboarded_v1';

function OnboardingCard({ accent, onDone }: { accent: any; onDone: () => void }) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 });
  const tips = [
    ['💬', 'Chat', 'Hit the chat icon and talk to me'],
    ['🎵', 'Music', 'Control Spotify or YT Music while gaming'],
    ['🖥️', 'Hardware', 'Live CPU / GPU / RAM diagnostics'],
    ['📝', 'Notes', 'Quick scratchpad — persists between sessions'],
    ['🎮', 'Launch game', 'Say "launch a game" or hit play'],
    ['📸', 'Screenshot', 'Say "screenshot" or hit the camera'],
    ['🖱️', 'Draggable', 'Drag any panel by its top bar'],
    ['⌨️', 'Hotkey', 'Alt+F to open/close me anytime'],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, width: 380, zIndex: 9999,
        background: 'rgba(10,10,18,0.98)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${accent.hex}20`,
        overflow: 'hidden', pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}40, transparent)` }} />
      <div onMouseDown={onMouseDown}
        style={{ padding: '14px 20px 10px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
        <img src={FayeStatic} alt="Faye"
          style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.1)', objectFit: 'contain' }} />
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Hey, I'm Faye 👋</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>Drag me around · dismiss when ready</p>
        </div>
      </div>
      <div style={{ padding: '4px 20px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {tips.map(([icon, title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: 600, margin: 0 }}>{title}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
          style={{ width: '100%', padding: '10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: accent.hex, color: accent.on || '#000', boxShadow: `0 0 24px ${accent.hex}50` }}>
          Got it, let's go
        </motion.button>
      </div>
    </motion.div>
  );
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

/* ─── icons ──────────────────────────────────────────────────────── */

const Icons = {
  chat: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v8A1.5 1.5 0 0115.5 14H11l-3 3v-3H4.5A1.5 1.5 0 013 12.5v-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  screenshot: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="7" y="2" width="6" height="2.5" rx="0.8" fill="currentColor"/>
    </svg>
  ),
  launch: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 3L16.5 10 5 17V3Z" fill="currentColor"/>
    </svg>
  ),
  update: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v5l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 3C6.134 3 3 6.134 3 10s3.134 7 7 7 7-3.134 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  theme: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.3"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.2 4.2l1.8 1.8M14 14l1.8 1.8M4.2 15.8l1.8-1.8M14 6l1.8-1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  ollama: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 14.5v1.5A1.5 1.5 0 004.5 17.5h11A1.5 1.5 0 0017 16V14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
    </svg>
  ),
  trash: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3.5 5h13M8 5V3.5h4V5M4.5 5l.5 11.5h10L15.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 9v5M12 9v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  hardware: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6 2v3M10 2v3M14 2v3M6 15v3M10 15v3M14 15v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  music: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="14" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9.5 15V6l7-2v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6.5 7h7M6.5 10h7M6.5 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  prev: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3v10M13 3L6 8l7 5V3z" fill="currentColor"/>
    </svg>
  ),
  next: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13 3v10M3 3l7 5-7 5V3z" fill="currentColor"/>
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 2l10 6-10 6V2z" fill="currentColor"/>
    </svg>
  ),
  pause: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/>
      <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/>
    </svg>
  ),
};

/* ─── actions ────────────────────────────────────────────────────── */

const SIDEBAR_ACTIONS = [
  {
    id: 'screenshot', label: 'Screenshot', shortcut: 'F12', icon: Icons.screenshot,
    run: async () => {
      const p = await window.launcherAPI?.takeScreenshot?.();
      return p ? `📸 Saved → ${p}` : '📸 Screenshot taken!';
    },
  },
  {
    id: 'launch', label: 'Launch Game', shortcut: null, icon: Icons.launch,
    run: async () => { await window.launcherAPI?.launchGame?.(); return '🎮 Launching…'; },
  },
  {
    id: 'update', label: 'Check Updates', shortcut: null, icon: Icons.update,
    run: async () => {
      const res = await window.launcherAPI?.checkForUpdates?.();
      return res?.hasUpdate ? `🔄 v${res.version} ready — restart to install.` : '✅ Up to date.';
    },
  },
  {
    id: 'theme', label: 'Cycle Theme', shortcut: null, icon: Icons.theme,
    run: async (settings: any, update: any) => {
      const keys = Object.keys(THEMES);
      const next = keys[(keys.indexOf(settings.theme) + 1) % keys.length];
      update({ theme: next });
      return `🎨 Theme → ${THEMES[next].label}`;
    },
  },
  {
    id: 'settings', label: 'Settings', shortcut: null, icon: Icons.settings,
    run: async () => { window.launcherAPI?.navigateTo?.('settings'); return '⚙️ Opening Settings…'; },
  },
  {
    id: 'ollama', label: 'Install Ollama', shortcut: null, icon: Icons.ollama,
    run: async () => {
      const res = await window.launcherAPI?.installOllama?.();
      if (res?.alreadyInstalled) return '✅ Ollama already installed.';
      if (res?.ok) return '🚀 Ollama installed! Pulling model…';
      return `⚠️ Failed: ${res?.error || 'unknown'}`;
    },
  },
  {
    id: 'uninstall', label: 'Uninstall', shortcut: null, icon: Icons.trash, danger: true,
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
        <span className="text-[11px] px-3 py-1 rounded-full font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {m.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2 group ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <img src={FayeStatic} alt="Faye"
          className="shrink-0 object-contain rounded-full self-end mb-0.5"
          style={{ width: 28, height: 28, border: '1.5px solid rgba(255,255,255,0.1)' }}
        />
      )}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="px-3.5 py-2.5 text-[13px] leading-[1.55]"
          style={isUser ? {
            background: `linear-gradient(145deg, ${accent.hex}, ${accent.hex}cc)`,
            color: accent.on || '#fff', borderRadius: '14px 14px 3px 14px',
            boxShadow: `0 4px 16px ${accent.hex}30`, fontWeight: 500,
          } : {
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.92)', borderRadius: '14px 14px 14px 3px',
          }}>
          {m.content}
        </div>
        {m.ts && (
          <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity px-1 tabular-nums"
            style={{ color: 'rgba(255,255,255,0.2)' }}>
            {m.ts}
          </span>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden self-end mb-0.5"
          style={{ border: `1.5px solid ${accent.hex}50` }}>
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: `${accent.hex}30`, color: accent.hex }}>
              {(profile?.displayName ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── chat panel (slides in from center) ────────────────────────── */

function ChatPanel({
  accent, messages, input, setInput, thinking, expression, ready,
  onSend, onClose, enabled, onEnable, starting, onDisable, onClearChat, profile,
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
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="flex flex-col overflow-hidden"
      style={{
        width: 380,
        height: 560,
        background: 'rgba(10,10,16,0.97)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${accent.hex}15`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* top accent */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}40, transparent)`, borderRadius: '20px 20px 0 0' }} />

      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, rgba(${GLOW_COLOR[expression]},0.5) 0%, transparent 70%)`, transform: 'scale(2.2)' }} />
          <img src={FayeStatic} alt="Faye"
            className="relative z-10 object-contain rounded-full"
            style={{ width: 36, height: 36, border: '1.5px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-none" style={{ color: '#fff' }}>Faye</p>
          <p className="text-[11px] mt-1 flex items-center gap-1.5"
            style={{ color: thinking ? accent.hex : ready ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }}>
            {thinking ? (
              <>
                <motion.span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: accent.hex }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
                Thinking…
              </>
            ) : ready ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade8080' }} />
                Online · Local AI
              </>
            ) : enabled ? 'Starting…' : 'Offline'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {enabled && (
            <button onClick={onClearChat}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.3)' }} title="Clear chat">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 3.5h9M5 3.5V2.5h4v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {enabled && (
            <button onClick={onDisable}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.3)' }} title="Sleep Faye">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v1.5M7 10.5V12M2 7h1.5M10.5 7H12M3.6 3.6l1.1 1.1M9.3 9.3l1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </button>
          )}
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            {Icons.close}
          </button>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {!enabled ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="relative" style={{ width: 80, height: 80 }}>
              <motion.div className="absolute inset-0 rounded-full"
                style={{ border: `1.5px solid ${accent.hex}40` }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }} />
              <img src={FayeStatic} alt="" className="absolute inset-2 object-contain rounded-full"
                style={{ opacity: 0.7, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold mb-1" style={{ color: '#fff' }}>Wake Faye</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Runs fully offline · ~2GB RAM</p>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onEnable} disabled={starting}
              className="px-8 py-2.5 rounded-2xl text-[13px] font-semibold transition-all"
              style={{ background: accent.hex, color: accent.on || '#000', opacity: starting ? 0.7 : 1, boxShadow: `0 0 24px ${accent.hex}50` }}>
              {starting ? 'Waking up…' : 'Wake Faye'}
            </motion.button>
          </div>
        ) : (
          <>
            {messages.length === 0 && !thinking && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Say something…</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m: any, i: number) => (
                <MessageBubble key={i} m={m}
                  expression={i === messages.length - 1 && m.role === 'assistant' ? expression : 'neutral'}
                  accent={accent} profile={profile} />
              ))}
            </AnimatePresence>
            {thinking && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
                <img src={FayeStatic} alt="" className="shrink-0 object-contain rounded-full"
                  style={{ width: 28, height: 28, border: '1.5px solid rgba(255,255,255,0.1)' }} />
                <div className="flex items-center gap-1.5 px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 3px' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: accent.hex }}
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* input */}
      {enabled && (
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${input.trim() && ready ? `${accent.hex}55` : 'rgba(255,255,255,0.08)'}`,
              boxShadow: input.trim() && ready ? `0 0 0 3px ${accent.hex}12` : 'none',
            }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
              placeholder={ready ? 'Message Faye…' : 'Starting…'}
              disabled={!ready || thinking}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/20"
              style={{ color: 'rgba(255,255,255,0.92)' }}
              autoFocus
            />
            <button onClick={onSend} disabled={!ready || thinking || !input.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90"
              style={{
                background: input.trim() && ready ? accent.hex : 'rgba(255,255,255,0.06)',
                color: input.trim() && ready ? (accent.on || '#000') : 'rgba(255,255,255,0.2)',
                boxShadow: input.trim() && ready ? `0 0 12px ${accent.hex}50` : 'none',
              }}>
              {Icons.send}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── hardware diagnostics panel ─────────────────────────────────── */

function StatBar({ label, value, color, unit = '%' }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
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
    <div style={{
      background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: '9px 11px',
      border: '1px solid rgba(255,255,255,0.045)',
    }}>
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
        <span style={{
          fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 500,
          color: hot ? '#f87171' : 'rgba(255,255,255,0.28)',
          background: hot ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)',
          padding: '1px 6px', borderRadius: 5, border: `1px solid ${hot ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          {temp}°C
        </span>
      )}
    </div>
  );
}

function NetTile({ label, value, color, arrow }: { label: string; value: string; color: string; arrow: string }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: '8px 10px',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
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
      initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: 300, pointerEvents: 'auto', zIndex: 200,
        background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* header / drag */}
      <div onMouseDown={onMouseDown} style={{ padding: '11px 14px 10px', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>{Icons.hardware}</span>
          <span style={{ color: '#e8e8e8', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em' }}>System</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.07)', letterSpacing: '0.06em' }}>LIVE</span>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
          {Icons.close}
        </button>
      </div>

      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* CPU row */}
        <HwBlock>
          <HwRowHeader label={stats.cpuName || 'CPU'} temp={stats.cpuTemp} hot={stats.cpuTemp > 85} />
          <StatBar label="Load" value={stats.cpu} color={cpuColor} />
        </HwBlock>

        {/* GPU row */}
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

        {/* RAM + Disk */}
        <HwBlock>
          <StatBar label={`RAM  ${stats.ramUsed?.toFixed(1)} / ${stats.ramTotal?.toFixed(1)} GB`} value={stats.ram} color={ramColor} />
          <div style={{ marginTop: 8 }}>
            <StatBar label="Disk" value={stats.disk} color={diskColor} />
          </div>
        </HwBlock>

        {/* Network */}
        <div style={{ display: 'flex', gap: 6 }}>
          <NetTile label="Upload" value={(stats.net?.up ?? 0).toFixed(1)} color="#34d399" arrow="↑" />
          <NetTile label="Download" value={(stats.net?.down ?? 0).toFixed(1)} color="#5b9bd5" arrow="↓" />
        </div>

      </div>
    </motion.div>
  );
}

/* ─── Faye Player — YouTube search + iframe embed ─────────────────── */

interface YTResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
}

// Parses YTM's internal renderer tree to extract video results
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
        const videoId = r.playlistItemData?.videoId
          ?? r.overlay?.musicItemThumbnailOverlayRenderer
              ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
              ?.watchEndpoint?.videoId;
        if (!videoId) continue;
        const cols: any[] = r.flexColumns ?? [];
        const title   = cols[0]?.musicResponsiveListItemFlexColumnRenderer
          ?.text?.runs?.[0]?.text ?? '';
        const channel = cols[1]?.musicResponsiveListItemFlexColumnRenderer
          ?.text?.runs?.find((run: any) => run?.navigationEndpoint?.browseEndpoint)
          ?.text ?? cols[1]?.musicResponsiveListItemFlexColumnRenderer
          ?.text?.runs?.[0]?.text ?? '';
        const thumbs: any[] = r.thumbnail?.musicThumbnailRenderer
          ?.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? '';
        // duration from fixed columns
        const fixedCols: any[] = r.fixedColumns ?? [];
        const duration = fixedCols[0]?.musicResponsiveListItemFixedColumnRenderer
          ?.text?.runs?.[0]?.text ?? '';
        results.push({ videoId, title, channel, thumbnail, duration });
      }
    }
  } catch { /* swallow parse errors */ }
  return results;
}

function MusicPanel({ accent, onClose }: { accent: any; onClose: () => void }) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 370, y: 80 });

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<YTResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [current, setCurrent]   = useState<YTResult | null>(null);
  const [queue, setQueue]       = useState<YTResult[]>([]);
  const [view, setView]         = useState<'search' | 'queue'>('search');
  const iframeRef               = useRef<HTMLIFrameElement>(null);
  const searchRef               = useRef<HTMLInputElement>(null);

  const search = async (q: string) => {
  if (!q.trim()) return;
  setLoading(true);
  setError('');
  try {
    const data = await window.launcherAPI.ytmSearch(q);
    const items = parseYTMResults(data);
    setResults(items);
    if (items.length === 0) setError('No results — try a different search.');
  } catch (e: any) {
    setError(e.message ?? 'Search failed.');
  } finally {
    setLoading(false);
  }
};

  const play = (track: YTResult) => {
    setCurrent(track);
    setView('search');
  };

  const addToQueue = (track: YTResult) => {
    if (!current) { play(track); return; }
    setQueue((q) => [...q, track]);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  };

  const removeFromQueue = (idx: number) => setQueue((q) => q.filter((_, i) => i !== idx));

  const embedSrc = current
    ? `https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&controls=1&rel=0&modestbranding=1`
    : '';

  const P = { /* panel colors — neutral, no accent bleed */ } as const;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: 340, maxHeight: 580, pointerEvents: 'auto', zIndex: 200,
        background: '#0d0d0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* subtle top rule */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* ── header / drag ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '11px 14px 10px', cursor: 'grab', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.05)', userSelect: 'none',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{Icons.music}</span>
        <span style={{ color: '#e8e8e8', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em', flex: 1 }}>
          Faye Player
        </span>

        {/* queue tab */}
        <button
          onClick={(e) => { e.stopPropagation(); setView((v) => v === 'queue' ? 'search' : 'queue'); }}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: view === 'queue' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: view === 'queue' ? '#e8e8e8' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.15s',
          }}
        >
          Queue {queue.length > 0 && `· ${queue.length}`}
        </button>

        <button
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
        >
          {Icons.close}
        </button>
      </div>

      {/* ── now playing embed ── */}
      {current && (
        <div style={{ flexShrink: 0, background: '#000', position: 'relative' }}>
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={current.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ display: 'block', width: '100%', height: 192, border: 'none' }}
          />
          {/* track info below embed */}
          <div style={{ padding: '9px 14px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#e8e8e8', fontWeight: 600, fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.title}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.channel}
              </p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={playNext}
                style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 6, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Next ›
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── queue view ── */}
      {view === 'queue' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>
              Queue is empty
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {queue.map((t, i) => (
                <motion.div
                  key={t.videoId + i}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 16, transition: { duration: 0.12 } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: 5, cursor: 'pointer',
                  }}
                  onClick={() => { play(t); removeFromQueue(i); }}
                >
                  <img src={t.thumbnail} alt="" style={{ width: 44, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#d8d8d8', fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, margin: '2px 0 0' }}>{t.channel}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                    style={{ color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2, flexShrink: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ── search view ── */}
      {view === 'search' && (
        <>
          {/* search bar */}
          <div style={{ padding: '10px 12px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.07)', padding: '7px 10px',
            }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: 'rgba(255,255,255,0.25)' }}>
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search(query); }}
                placeholder="Search music…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  caretColor: 'rgba(255,255,255,0.6)',
                }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setError(''); searchRef.current?.focus(); }}
                  style={{ color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}
                >
                  ×
                </button>
              )}
              <button
                onClick={() => search(query)}
                disabled={loading || !query.trim()}
                style={{
                  flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                  color: query.trim() ? '#e8e8e8' : 'rgba(255,255,255,0.2)',
                  cursor: query.trim() ? 'pointer' : 'default', transition: 'all 0.15s',
                }}
              >
                {loading ? '…' : 'Go'}
              </button>
            </div>
          </div>

          {/* results list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 12px' }}>
            {error && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,100,100,0.7)', fontSize: 12 }}>{error}</div>
            )}
            {!error && results.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>
                {current ? 'Search for more music' : 'Search to start listening'}
              </div>
            )}
            <AnimatePresence initial={false}>
              {results.map((r, i) => {
                const isPlaying = current?.videoId === r.videoId;
                return (
                  <motion.div
                    key={r.videoId}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 8px', borderRadius: 8, marginBottom: 4,
                      background: isPlaying ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isPlaying ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    {/* thumbnail */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={r.thumbnail} alt="" style={{ width: 52, height: 34, borderRadius: 5, objectFit: 'cover', display: 'block' }} />
                      {isPlaying && (
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 5, background: 'rgba(0,0,0,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <motion.div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
                            {[0, 1, 2].map((b) => (
                              <motion.div key={b} style={{ width: 2.5, background: '#fff', borderRadius: 1 }}
                                animate={{ height: [4, 12, 4] }} transition={{ duration: 0.7, repeat: Infinity, delay: b * 0.15, ease: 'easeInOut' }} />
                            ))}
                          </motion.div>
                        </div>
                      )}
                    </div>

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: isPlaying ? '#fff' : '#d0d0d0', fontWeight: isPlaying ? 600 : 400, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.channel}
                      </p>
                    </div>

                    {/* actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!isPlaying && (
                        <button
                          onClick={(e) => { e.stopPropagation(); play(r); }}
                          title="Play"
                          style={{
                            width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {Icons.play}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); addToQueue(r); }}
                        title="Add to queue"
                        style={{
                          width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
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

/* ─── quick notes panel ───────────────────────────────────────────── */

const NOTES_KEY = 'faye_quick_notes_v1';

function NotesPanel({ accent, onClose }: { accent: any; onClose: () => void }) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth / 2 + 60, y: 80 });
  const [notes, setNotes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const save = (n: string[]) => { setNotes(n); localStorage.setItem(NOTES_KEY, JSON.stringify(n)); };
  const addNote = () => {
    const t = input.trim();
    if (!t) return;
    save([{ text: t, ts: nowTime(), id: Date.now() } as any, ...notes]);
    setInput('');
  };
  const deleteNote = (idx: number) => save(notes.filter((_, i) => i !== idx));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: 300, maxHeight: 420, pointerEvents: 'auto', zIndex: 200,
        background: 'rgba(10,10,16,0.97)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${accent.hex}10`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}40, transparent)` }} />

      {/* header / drag */}
      <div onMouseDown={onMouseDown} style={{ padding: '12px 14px 10px', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: accent.hex }}>{Icons.notes}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Quick Notes</span>
          {notes.length > 0 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>{notes.length}</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {notes.length > 0 && (
            <button onClick={() => save([])} title="Clear all"
              style={{ color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, padding: '2px 6px', borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
              Clear all
            </button>
          )}
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            {Icons.close}
          </button>
        </div>
      </div>

      {/* input */}
      <div style={{ padding: '0 14px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 10px', border: `1px solid ${input.trim() ? `${accent.hex}55` : 'rgba(255,255,255,0.07)'}` }}>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
            placeholder="Jot something down…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'rgba(255,255,255,0.9)', caretColor: accent.hex }}
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={addNote}
            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: input.trim() ? accent.hex : 'rgba(255,255,255,0.06)', color: input.trim() ? (accent.on || '#000') : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </motion.button>
        </div>
      </div>

      {/* notes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>No notes yet</div>
        ) : (
          <AnimatePresence initial={false}>
            {(notes as any[]).map((n, i) => (
              <motion.div key={n.id ?? i}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)', group: true } as any}
              >
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: accent.hex, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, wordBreak: 'break-word', lineHeight: 1.5 }}>{n.text}</p>
                  {n.ts && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, margin: '3px 0 0', fontVariantNumeric: 'tabular-nums' }}>{n.ts}</p>}
                </div>
                <button onClick={() => deleteNote(i)}
                  style={{ color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontSize: 14, lineHeight: 1, padding: 0, transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

/* ─── icon sidebar button ────────────────────────────────────────── */

function SideBtn({
  icon, label, onClick, accent, active = false, danger = false, shortcut, activeColor,
}: {
  icon: React.ReactNode; label: string; onClick: () => void;
  accent: any; active?: boolean; danger?: boolean; shortcut?: string | null; activeColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const aColor = activeColor || accent.hex;

  return (
    <div className="relative flex items-center">
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150"
        style={{
          background: active
            ? `${aColor}25`
            : danger
              ? hovered ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.08)'
              : hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          border: active
            ? `1.5px solid ${aColor}50`
            : danger
              ? '1px solid rgba(239,68,68,0.2)'
              : '1px solid rgba(255,255,255,0.07)',
          color: active
            ? aColor
            : danger
              ? 'rgba(248,113,113,0.85)'
              : hovered ? '#fff' : 'rgba(255,255,255,0.45)',
          boxShadow: active ? `0 0 16px ${aColor}30` : 'none',
        }}
      >
        {icon}
      </motion.button>

      {/* tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-[56px] flex items-center gap-2 pointer-events-none z-50"
            style={{ whiteSpace: 'nowrap' }}
          >
            <div className="px-2.5 py-1.5 rounded-xl text-[12px] font-medium"
              style={{ background: 'rgba(18,18,26,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {label}
              {shortcut && (
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
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

/* ─── main overlay ───────────────────────────────────────────────── */

export default function FayeOverlay({ profile }: { profile?: any }) {
  const { settings, update } = useSettings();
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgVideoRef     = useRef<HTMLVideoElement>(null);

  // ── star-field background (mirrors SplashScreen) ────────────────────
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0.5, 6);
    camera.lookAt(0, 0, 0);

    function buildStars(count: number, spread: number, size: number, opacity: number, brightFraction = 0) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3 - 5;
        const r = Math.random();
        if (i < count * brightFraction) {
          col[i * 3] = 0.85 + Math.random() * 0.15;
          col[i * 3 + 1] = 0.90 + Math.random() * 0.10;
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
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      return new THREE.Points(geo, new THREE.PointsMaterial({
        size, transparent: true, opacity, vertexColors: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      }));
    }

    const dustA      = buildStars(2200, 80, 0.008, 0.55);
    const dustB      = buildStars(800,  50, 0.014, 0.45);
    const midStars   = buildStars(400,  35, 0.026, 0.60, 0.05);
    const brightStars = buildStars(60,  20, 0.055, 0.70, 1.0);
    scene.add(dustA, dustB, midStars, brightStars);

    let animId: number, t = 0;
    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.01;
      dustA.rotation.y       =  t * 0.005;
      dustB.rotation.y       =  t * 0.009;
      midStars.rotation.y    =  t * 0.013;
      brightStars.rotation.y =  t * 0.018;
      dustA.rotation.x       =  t * 0.002;
      dustB.rotation.x       = -t * 0.003;
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

  // play bg video
  useEffect(() => { bgVideoRef.current?.play().catch(() => {}); }, []);

  const [chatOpen, setChatOpen]         = useState(false);
  const [hwOpen, setHwOpen]             = useState(false);
  const [musicOpen, setMusicOpen]       = useState(false);
  const [notesOpen, setNotesOpen]       = useState(false);
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem(ONBOARD_KEY));
  const [enabled, setEnabled] = useState(settings?.fayeAiEnabled ?? false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [expression, setExpression] = useState('neutral');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = window.launcherAPI?.onOverlayShow?.(() => {
      setChatOpen(false); // reset to default state on each open
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (enabled) window.launcherAPI?.faye?.isReady().then(setReady);
  }, []);

  // Escape to close
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

  async function handleEnable() {
    setEnabled(true);
    setStarting(true);
    update({ fayeAiEnabled: true });
    const result = await window.launcherAPI.faye.start();
    console.log('[Faye] start result:', result);
    setStarting(false);
    if (result.ok) {
      setReady(true);
      setThinking(true);
      setExpression('thinking');
      const res = await window.launcherAPI.faye.chat([{ role: 'user', content: 'greet me, you just woke up' }]);
      console.log('[Faye] greeting response:', res);
      setThinking(false);
      if (res.ok) {
        setExpression(pickExpression(res.content));
        setMessages([{ role: 'assistant', content: res.content, ts: nowTime() }]);
      } else {
        console.error('[Faye] greeting failed — full response:', JSON.stringify(res));
        setMessages([{ role: 'system', content: `⚠️ Faye failed to respond: ${res?.error || JSON.stringify(res)}`, ts: nowTime() }]);
      }
    }
  }

  async function handleDisable() {
    await window.launcherAPI.faye.stop();
    setReady(false); setEnabled(false);
    update({ fayeAiEnabled: false });
    setMessages([]); setExpression('neutral');
  }

  async function sendMessage() {
    if (!input.trim() || thinking || !ready) return;
    const userMsg = { role: 'user', content: input.trim(), ts: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next); setInput('');

    // Intent shortcut — handle locally before hitting Ollama
    const intent = detectIntent(input.trim());
    if (intent) {
      if (intent.type === 'screenshot') {
        const res = await window.launcherAPI?.takeScreenshot?.();
        setMessages([...next, { role: 'assistant', content: res ? `📸 Screenshot saved!` : '📸 Screenshot taken!', ts: nowTime() }]);
        setExpression('happy');
        return;
      }
      if (intent.type === 'spotify') {
        await window.launcherAPI?.fayeCommand?.('spotify', intent.args);
        setMessages([...next, { role: 'assistant', content: intent.args.query ? `🎵 Opening Spotify for "${intent.args.query}"!` : '🎵 Opening Spotify!', ts: nowTime() }]);
        setExpression('happy');
        return;
      }
      if (intent.type === 'launch') {
        await window.launcherAPI?.launchGame?.();
        setMessages([...next, { role: 'assistant', content: '🎮 Launching…', ts: nowTime() }]);
        setExpression('happy');
        return;
      }
      if (intent.type === 'volume') {
        await window.launcherAPI?.fayeCommand?.('volume', intent.args);
        setMessages([...next, { role: 'assistant', content: intent.args.direction === 'up' ? '🔊 Volume up!' : '🔉 Volume down!', ts: nowTime() }]);
        setExpression('neutral');
        return;
      }
    }

    setThinking(true); setExpression('thinking');
    const res = await window.launcherAPI.faye.chat(
      next.filter((m: any) => m.role !== 'system'), profile?.displayName, null
    );
    console.log('[Faye] chat response:', res);
    setThinking(false);
    if (res.ok) {
      setExpression(res.mood || pickExpression(res.content));
      setMessages([...next, { role: 'assistant', content: res.content, ts: nowTime() }]);
    } else {
      console.error('[Faye] chat failed — full response:', JSON.stringify(res));
      setMessages([...next, { role: 'system', content: `⚠️ ${res?.error || 'No response from Faye'}`, ts: nowTime() }]);
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
    <div
      className="fixed inset-0"
      style={{ background: 'transparent', pointerEvents: 'none' }}
    >
      {/* ── Background: video + stars ── */}
      <video
        ref={bgVideoRef}
        src={DEFAULT_BG_VIDEO}
        muted loop playsInline
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        style={{ zIndex: 0, opacity: 0.62 }}
      />
      <canvas
        ref={starsCanvasRef}
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 1, mixBlendMode: 'screen' }}
      />

      {/* dim backdrop — only where panels aren't */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{ zIndex: 2, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)', pointerEvents: 'auto' }}
        onClick={() => {
          if (chatOpen) setChatOpen(false);
          else window.launcherAPI?.hideOverlay?.();
        }}
      />

      {/* ── LEFT: big Faye art, full height ── */}
      <motion.div
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-0 bottom-0 flex items-end justify-start"
        style={{ width: 520, pointerEvents: 'none', zIndex: 10 }}
      >
        {/* ambient glow behind faye */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 60%, rgba(${glowRgb},0.28) 0%, transparent 65%)` }} />

        {/* faye image — big, bottom-anchored */}
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

        {/* name + status badge bottom-left */}
        <div className="absolute bottom-10 left-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl"
            style={{ background: 'rgba(8,8,14,0.85)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            {ready ? (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8080' }} />
            ) : (
              <motion.span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent.hex }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            )}
            <span className="text-[14px] font-bold" style={{ color: '#fff', letterSpacing: '-0.01em' }}>Faye</span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {ready ? (thinking ? 'Thinking…' : 'Online') : enabled ? 'Starting…' : 'Local AI'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT: vertical icon sidebar — draggable ── */}
      <DraggableSidebar
        accent={accent}
        chatOpen={chatOpen}
        hwOpen={hwOpen}
        musicOpen={musicOpen}
        notesOpen={notesOpen}
        onChatToggle={() => setChatOpen((v) => !v)}
        onHwToggle={() => setHwOpen((v) => !v)}
        onMusicToggle={() => setMusicOpen((v) => !v)}
        onNotesToggle={() => setNotesOpen((v) => !v)}
        onClose={() => window.launcherAPI?.hideOverlay?.()}
        onAction={runAction}
      />

      {/* ── action feedback toast ── */}
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

      {/* ── chat panel — draggable ── */}
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
            onClearChat={() => { setMessages([]); setExpression('neutral'); }}
            profile={profile}
          />
        )}
      </AnimatePresence>

      {/* ── hardware diagnostics panel ── */}
      <AnimatePresence>
        {hwOpen && <HardwarePanel accent={accent} onClose={() => setHwOpen(false)} />}
      </AnimatePresence>

      {/* ── music panel ── */}
      <AnimatePresence>
        {musicOpen && <MusicPanel accent={accent} onClose={() => setMusicOpen(false)} />}
      </AnimatePresence>

      {/* ── quick notes panel ── */}
      <AnimatePresence>
        {notesOpen && <NotesPanel accent={accent} onClose={() => setNotesOpen(false)} />}
      </AnimatePresence>

      {/* ── onboarding — shown once ── */}
      <AnimatePresence>
        {!onboarded && (
          <OnboardingCard
            accent={accent}
            onDone={() => { localStorage.setItem(ONBOARD_KEY, '1'); setOnboarded(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── draggable sidebar wrapper ──────────────────────────────────── */
function DraggableSidebar({ accent, chatOpen, hwOpen, musicOpen, notesOpen, onChatToggle, onHwToggle, onMusicToggle, onNotesToggle, onClose, onAction }: any) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 80, y: window.innerHeight / 2 - 200 });
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.06 }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '8px 8px 12px',
        background: 'rgba(10,10,16,0.92)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24, backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)', pointerEvents: 'auto', zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* drag handle */}
      <div onMouseDown={onMouseDown}
        style={{ width: 28, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.12)', cursor: 'grab', margin: '4px 0 6px', flexShrink: 0 }} />

      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 2, background: `linear-gradient(90deg, transparent, ${accent.hex}80, transparent)`, borderRadius: 999 }} />

      <SideBtn icon={Icons.chat} label="Chat with Faye" onClick={onChatToggle} accent={accent} active={chatOpen} />
      <SideBtn icon={Icons.hardware} label="Hardware Stats" onClick={onHwToggle} accent={accent} active={hwOpen} activeColor="#34d399" />
      <SideBtn icon={Icons.music} label="Music Player" onClick={onMusicToggle} accent={accent} active={musicOpen} activeColor="#1DB954" />
      <SideBtn icon={Icons.notes} label="Quick Notes" onClick={onNotesToggle} accent={accent} active={notesOpen} />

      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
      {SIDEBAR_ACTIONS.map((action) => (
        <SideBtn key={action.id} icon={action.icon} label={action.label} shortcut={action.shortcut}
          onClick={() => onAction(action)} accent={accent} danger={action.danger} />
      ))}
      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
      <SideBtn icon={Icons.close} label="Close overlay (Esc)" onClick={onClose} accent={accent} />
      <div style={{ marginTop: 4 }}>
        <kbd style={{ display: 'block', textAlign: 'center', fontSize: 9, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Alt+F
        </kbd>
      </div>
    </motion.div>
  );
}

/* ─── draggable chat panel wrapper ───────────────────────────────── */
function DraggableChatPanel(props: any) {
  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth / 2 - 190, y: window.innerHeight / 2 - 280 });
  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'auto', zIndex: 200 }}
      onClick={(e) => e.stopPropagation()}>
      {/* drag handle bar above the panel */}
      <div onMouseDown={onMouseDown}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 20, cursor: 'grab', userSelect: 'none' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <ChatPanel {...props} />
    </div>
  );
}
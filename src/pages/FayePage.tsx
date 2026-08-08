import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

import Neutral  from './images/faye/neutral.png';
import Happy    from './images/faye/happy.png';
import Thinking from './images/faye/curious.png';
import Sad      from './images/faye/sad.png';

const EXPRESSIONS = { neutral: Neutral, happy: Happy, thinking: Thinking, sad: Sad };

const GLOW_COLOR = {
  neutral: '120,120,160',
  happy:   '120,200,140',
  thinking:'100,160,220',
  sad:     '160,100,120',
};

function pickExpression(text) {
  if (!text) return 'neutral';
  const t = text.toLowerCase();
  if (t.includes('sorry') || t.includes('unfortunate')) return 'sad';
  if (t.includes('!') || t.includes('excit') || t.includes('great')) return 'happy';
  if (t.includes('hmm') || t.includes('well') || t.includes('think')) return 'thinking';
  return 'neutral';
}

const ACTIONS = [
  {
    id: 'launch',
    label: 'Launch',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2.5L11.5 7 3 11.5V2.5Z" fill="currentColor" />
      </svg>
    ),
    run: async () => {
      await window.launcherAPI?.launchGame?.();
      return '🎮 Launching the game now…';
    },
  },
  {
    id: 'update',
    label: 'Updates',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v3M7 12.5v-3M1.5 7h3M12.5 7h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M3.5 3.5l2 2M8.5 8.5l2 2M3.5 10.5l2-2M8.5 5.5l2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    run: async () => {
      const res = await window.launcherAPI?.checkForUpdates?.();
      return res?.hasUpdate
        ? `🔄 Update available — v${res.version}. Restart to install.`
        : '✅ You\'re on the latest version.';
    },
  },
  {
    id: 'screenshot',
    label: 'Shot',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="5" y="1.5" width="4" height="1.5" rx="0.5" fill="currentColor"/>
      </svg>
    ),
    run: async () => {
      const path = await window.launcherAPI?.takeScreenshot?.();
      return path ? `📸 Screenshot saved to ${path}` : '📸 Screenshot taken!';
    },
  },
  {
    id: 'theme',
    label: 'Theme',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.4"/>
      </svg>
    ),
    run: async (settings, update) => {
      const keys = Object.keys(THEMES);
      const next = keys[(keys.indexOf(settings.theme) + 1) % keys.length];
      update({ theme: next });
      return `🎨 Theme switched to ${THEMES[next].label}.`;
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7 1.5v1.5M7 11v1.5M1.5 7h1.5M11 7h1.5M3.1 3.1l1.1 1.1M9.8 9.8l1.1 1.1M3.1 10.9l1.1-1.1M9.8 4.2l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    run: async () => {
      window.launcherAPI?.navigateTo?.('settings');
      return '⚙️ Opening Settings…';
    },
  },
  {
    id: 'uninstall',
    label: 'Uninstall',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 3.5h9M5 3.5V2.5h4v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 6v3.5M8.5 6v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    danger: true,
    run: async () => {
      const ok = await window.launcherAPI?.confirmUninstall?.();
      return ok ? '🗑️ Uninstall initiated.' : '❌ Uninstall cancelled.';
    },
  },
];

function CopyBtn({ text, accent }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-md p-1 flex items-center justify-center"
      style={{
        color: copied ? accent.hex : 'rgba(255,255,255,0.25)',
        background: copied ? `${accent.hex}20` : 'transparent',
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="4" y="1.5" width="6.5" height="7.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M1.5 4v6.5h6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

function MessageBubble({ m, expression, accent }) {
  const isUser = m.role === 'user';
  const isSystem = m.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex justify-center my-1"
      >
        <span
          className="text-[11px] px-3 py-1 rounded-full font-medium"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {m.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2.5 group ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="relative shrink-0 self-end mb-0.5">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${GLOW_COLOR[expression] || GLOW_COLOR.neutral},0.35) 0%, transparent 70%)`,
              transform: 'scale(1.6)',
            }}
          />
          <motion.img
            key={expression}
            src={EXPRESSIONS[expression] || EXPRESSIONS.neutral}
            alt="Faye"
            initial={{ opacity: 0.4, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 object-contain rounded-full"
            style={{
              width: 30,
              height: 30,
              border: '1.5px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[76%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-[15px] py-[10px] text-[13.5px] leading-[1.55]"
          style={isUser ? {
            background: `linear-gradient(145deg, ${accent.hex} 0%, ${accent.hex}cc 100%)`,
            color: accent.on || '#fff',
            borderRadius: '16px 16px 4px 16px',
            boxShadow: `0 4px 16px ${accent.hex}30`,
            fontWeight: 500,
          } : {
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
            borderRadius: '16px 16px 16px 4px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          }}
        >
          {m.content}
        </div>

        <div className={`flex items-center gap-1 px-0.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <CopyBtn text={m.content} accent={accent} />
          {m.ts && (
            <span
              className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 tabular-nums"
              style={{ color: 'rgba(255,255,255,0.18)' }}
            >
              {m.ts}
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div
          className="shrink-0 rounded-full flex items-center justify-center self-end mb-0.5 text-[11px] font-bold"
          style={{
            width: 30,
            height: 30,
            background: `linear-gradient(145deg, ${accent.hex}50, ${accent.hex}25)`,
            border: `1.5px solid ${accent.hex}50`,
            color: accent.hex,
          }}
        >
          U
        </div>
      )}
    </motion.div>
  );
}

function StartupScreen({ accent, onEnable, starting }) {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <motion.div
      key="startup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Large soft glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 480,
          height: 480,
          background: `radial-gradient(circle, ${accent.hex}18 0%, transparent 60%)`,
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Portrait */}
      <div className="relative flex items-center justify-center mb-10" style={{ width: 168, height: 168 }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1.5px solid ${accent.hex}30` }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1px solid ${accent.hex}18` }}
          animate={{ scale: [1, 1.32, 1], opacity: [0.3, 0.05, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${accent.hex}25 0%, transparent 65%)`,
          }}
        />
        <motion.img
          src={EXPRESSIONS.neutral}
          alt="Faye"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 object-contain"
          style={{
            width: 128,
            height: 128,
            filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.4))',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="text-center"
      >
        <h1
          className="text-[28px] font-bold tracking-tight"
          style={{ color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}
        >
          Faye
        </h1>
        <p
          className="text-[11px] mt-2 font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Local AI · Private · Offline
        </p>
      </motion.div>

      <div className="h-11" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45 }}
        className="flex flex-col items-center gap-4"
      >
        <button
          onClick={() => setShowWarning(true)}
          disabled={starting}
          className="relative px-10 py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.97]"
          style={{
            background: accent.hex,
            color: accent.on || '#000',
            opacity: starting ? 0.7 : 1,
            boxShadow: `0 0 40px ${accent.hex}55, 0 8px 24px rgba(0,0,0,0.4)`,
          }}
        >
          {starting ? (
            <span className="flex items-center gap-2.5">
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accent.on || '#000' }}
              />
              Waking up…
            </span>
          ) : (
            'Wake Faye'
          )}
        </button>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          ~2 GB RAM while active
        </p>
      </motion.div>

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(20px)' }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-[380px] rounded-[24px] p-6 flex flex-col gap-5"
              style={{
                background: '#16161c',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              }}
            >
              <div>
                <h2 className="text-[16px] font-bold mb-1.5" style={{ color: '#fff' }}>
                  Before waking Faye
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Runs fully offline. A few things to know:
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  ['~2 GB RAM', "used while she's active"],
                  ['First reply is slower', 'model warms up once'],
                  ['Disable before gaming', 'frees memory for max FPS'],
                ].map(([label, note]) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <span className="text-[11px] font-bold shrink-0 mt-0.5" style={{ color: accent.hex }}>
                      {label}
                    </span>
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {note}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 py-3 rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-transform"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowWarning(false); onEnable(); }}
                  className="flex-1 py-3 rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-transform"
                  style={{
                    background: accent.hex,
                    color: accent.on || '#000',
                    boxShadow: `0 0 20px ${accent.hex}40`,
                  }}
                >
                  Wake Faye
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ChatView({
  accent,
  messages,
  input,
  setInput,
  thinking,
  expression,
  ready,
  onSend,
  onDisable,
  onClearChat,
  onRunAction,
}) {
  const bottomRef = useRef(null);
  const glowRgb = GLOW_COLOR[expression] || GLOW_COLOR.neutral;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, rgba(${glowRgb},0.5) 0%, transparent 70%)`,
                transform: 'scale(2)',
                transition: 'background 0.6s ease',
              }}
            />
            <motion.img
              key={expression}
              src={EXPRESSIONS[expression]}
              alt="Faye"
              initial={{ opacity: 0.5, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 object-contain rounded-full"
              style={{
                width: 42,
                height: 42,
                border: '1.5px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-none" style={{ color: '#fff' }}>
              Faye
            </p>
            <p
              className="text-[11px] mt-1.5 font-medium flex items-center gap-1.5"
              style={{ color: thinking ? accent.hex : 'rgba(255,255,255,0.35)' }}
            >
              {thinking ? (
                <>
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accent.hex }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  Thinking…
                </>
              ) : ready ? (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#4ade80',
                      boxShadow: '0 0 8px #4ade8080',
                    }}
                  />
                  Online
                </>
              ) : (
                'Starting…'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearChat}
            title="Clear chat"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 3.5h9M5 3.5V2.5h4v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onDisable}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accent.hex, boxShadow: `0 0 6px ${accent.hex}` }}
            />
            Disable
          </button>
        </div>
      </div>

      {/* Action chips - compact icon+label pills */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onRunAction(action)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95"
            style={{
              background: action.danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${action.danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
              color: action.danger ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.45)',
            }}
            onMouseEnter={(e) => {
              if (action.danger) {
                e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                e.currentTarget.style.color = '#f87171';
              } else {
                e.currentTarget.style.background = `${accent.hex}18`;
                e.currentTarget.style.color = accent.hex;
                e.currentTarget.style.borderColor = `${accent.hex}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = action.danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = action.danger ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.45)';
              e.currentTarget.style.borderColor = action.danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)';
            }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 min-h-0">
        {messages.length === 0 && !thinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${accent.hex}20 0%, transparent 70%)`,
              }}
            >
              <img
                src={EXPRESSIONS.neutral}
                alt=""
                className="object-contain"
                style={{ width: 48, height: 48, opacity: 0.6 }}
              />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Say hello to Faye
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.22)' }}>
                She runs fully on your machine
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              m={m}
              expression={i === messages.length - 1 && m.role === 'assistant' ? expression : 'neutral'}
              accent={accent}
            />
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2.5"
          >
            <img
              src={EXPRESSIONS.thinking}
              alt=""
              className="shrink-0 object-contain rounded-full"
              style={{ width: 30, height: 30, border: '1.5px solid rgba(255,255,255,0.1)' }}
            />
            <div
              className="flex items-center gap-1.5 px-4 py-3.5"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px 16px 16px 4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-1.5 h-1.5 rounded-full"
                  style={{ background: accent.hex }}
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-5 pt-2 shrink-0">
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${input.trim() && ready ? `${accent.hex}50` : 'rgba(255,255,255,0.08)'}`,
            boxShadow: input.trim() && ready
              ? `0 0 0 3px ${accent.hex}15, 0 4px 20px rgba(0,0,0,0.2)`
              : '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder={ready ? 'Message Faye…' : 'Starting…'}
            disabled={!ready || thinking}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/25"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          />
          <button
            onClick={onSend}
            disabled={!ready || thinking || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90"
            style={{
              background: input.trim() && ready ? accent.hex : 'rgba(255,255,255,0.06)',
              color: input.trim() && ready ? (accent.on || '#000') : 'rgba(255,255,255,0.2)',
              boxShadow: input.trim() && ready ? `0 0 16px ${accent.hex}50` : 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function FayePage({ profile }) {
  const { settings, update } = useSettings();
  const theme = THEMES[settings?.theme] || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const [enabled, setEnabled] = useState(settings?.fayeAiEnabled ?? false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [expression, setExpression] = useState('neutral');

  useEffect(() => {
    if (enabled) window.launcherAPI?.faye?.isReady().then(setReady);
  }, []);

  async function handleEnable() {
    setEnabled(true);
    setStarting(true);
    update({ fayeAiEnabled: true });
    const result = await window.launcherAPI.faye.start();
    setStarting(false);
    if (result.ok) {
      setReady(true);
      setThinking(true);
      setExpression('thinking');
      const res = await window.launcherAPI.faye.chat([
        { role: 'user', content: 'greet me, you just woke up' },
      ]);
      setThinking(false);
      if (res.ok) {
        setExpression(pickExpression(res.content));
        setMessages([{ role: 'assistant', content: res.content, ts: nowTime() }]);
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

  function handleClearChat() {
    setMessages([]);
    setExpression('neutral');
  }

  async function sendMessage() {
    if (!input.trim() || thinking || !ready) return;
    const userMsg = { role: 'user', content: input.trim(), ts: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setThinking(true);
    setExpression('thinking');

    const res = await window.launcherAPI.faye.chat(
      next.filter((m) => m.role !== 'system'),
      profile?.displayName,
      null
    );
    setThinking(false);
    if (res.ok) {
      setExpression(res.mood || pickExpression(res.content));
      setMessages([...next, { role: 'assistant', content: res.content, ts: nowTime() }]);
    }
  }

  async function handleRunAction(action) {
    if (!ready) return;
    const systemEcho = { role: 'system', content: `Running: ${action.label}…` };
    setMessages((prev) => [...prev, systemEcho]);
    try {
      const msg = await action.run(settings, update);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'system', content: msg },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'system', content: `⚠️ ${action.label} failed.` },
      ]);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ color: theme.text, background: theme.bg ?? 'transparent' }}
    >
      <AnimatePresence mode="wait">
        {!enabled ? (
          <StartupScreen
            key="startup"
            accent={accent}
            starting={starting}
            onEnable={handleEnable}
          />
        ) : (
          <ChatView
            key="chat"
            accent={accent}
            messages={messages}
            input={input}
            setInput={setInput}
            thinking={thinking}
            expression={expression}
            ready={ready}
            onSend={sendMessage}
            onDisable={handleDisable}
            onClearChat={handleClearChat}
            onRunAction={handleRunAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

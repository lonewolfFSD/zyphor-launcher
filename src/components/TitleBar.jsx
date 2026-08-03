import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBug, faCircleInfo, faRotate, faCircleQuestion,
  faChevronDown, faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

export default function TitleBar({ profile }) {
  const { settings } = useSettings();
  const theme       = THEMES[settings?.theme]  || THEMES.oled;
  const accent      = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const [menuOpen, setMenuOpen] = useState(false);

  const isVip       = Boolean(profile?.isVip);
  const vipGold     = '#FDB515';
  const accentColor = isVip ? vipGold : accent.hex;

  function openExternal(url) {
    if (window.api?.openExternal) window.api.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  const menuItems = [
    {
      icon: faBug,
      label: 'Report a bug',
      sub: 'Open GitHub issue',
      action: () => openExternal('https://github.com/zyphorstudios/launcher/issues/new?template=bug_report.md'),
    },
    {
      icon: faCircleQuestion,
      label: 'Help & support',
      sub: 'Docs and FAQs',
      action: () => openExternal('https://zyphorstudios.com/support'),
    },
    {
      icon: faDiscord,
      label: 'Join Discord',
      sub: 'Community server',
      action: () => openExternal('https://discord.gg/zyphor'),
    },
    { divider: true },
    {
      icon: faRotate,
      label: 'Check for updates',
      sub: `Current: v${import.meta.env.VITE_APP_VERSION ?? '2.0.0'}`,
      action: () => window.api?.checkForUpdates?.(),
    },
    {
      icon: faCircleInfo,
      label: 'About Zyphor Launcher',
      sub: 'Version info',
      action: () => window.api?.openAbout?.(),
    },
  ];

  return (
    <div
      className="relative flex h-9 shrink-0 items-center justify-between border-b"
      style={{
        WebkitAppRegion: 'drag',
        backgroundColor: `${theme.surface}e0`,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Full-width accent underline */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ backgroundColor: accentColor }}
        initial={{ scaleX: 0, opacity: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1, opacity: isVip ? 0.55 : 0.25 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />

      {/* Left — wordmark + menu trigger */}
      <div
        className="flex items-center gap-0 pl-3"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {isVip && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mr-2 text-[10px] select-none"
            style={{ color: vipGold }}
          >
            ✦
          </motion.span>
        )}

        {/* Clickable wordmark opens menu */}
        <button
          type="button"
          className="flex items-center gap-2 rounded px-2 py-1 transition-all duration-150"
          style={{ WebkitAppRegion: 'no-drag' }}

        >
          <span
            className="font-mono text-[11px] uppercase tracking-widest select-none"
            style={{ color: `${theme.text}77` }}
          >
            Zyphor Launcher
          </span>
          <span
            className="rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}33`,
            }}
          >
            2.0 BETA
          </span>
          <FontAwesomeIcon
            icon={faChevronDown}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = `${accentColor}12`}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => setMenuOpen(o => !o)}
            className="text-[9px] transition-transform duration-200 p-1.5 rounded"
            style={{
              color: `${theme.text}44`,
              backgroundColor: `${accentColor}18`,
              transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-3 top-full z-50 mt-1 min-w-[260px] overflow-hidden rounded-xl border shadow-2xl"
                style={{
                  backgroundColor: `${theme.surface}f8`,
                  borderColor: theme.border,
                  backdropFilter: 'blur(12px)',
                  WebkitAppRegion: 'no-drag',
                }}
              >
                {/* Header */}
                <div
                  className="px-3 py-2.5 border-b"
                  style={{ borderColor: theme.border }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: `${theme.text}44` }}>
                    2.0 BETA
                  </p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: theme.text }}>
                    ZYPHOR Launcher
                  </p>
                </div>

                <div className="py-1">
                  {menuItems.map((item, i) =>
                    item.divider ? (
                      <div
                        key={i}
                        className="my-1 h-px mx-2"
                        style={{ backgroundColor: theme.border }}
                      />
                    ) : (
                      <button
                        key={i}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 transition-colors duration-100 text-left"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = `${accentColor}12`}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => { item.action(); setMenuOpen(false); }}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${accentColor}18` }}
                        >
                          <FontAwesomeIcon
                            icon={item.icon}
                            className="text-[11px]"
                            style={{ color: accentColor }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight" style={{ color: theme.text }}>
                            {item.label}
                          </p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: `${theme.text}55` }}>
                            {item.sub}
                          </p>
                        </div>
                        <FontAwesomeIcon
                          icon={faArrowUpRightFromSquare}
                          className="ml-auto text-[9px] opacity-20 shrink-0"
                          style={{ color: theme.text }}
                        />
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Right — window controls */}
      <div
        className="flex items-center gap-0.5 pr-2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <TitleBarButton label="Minimize" onClick={() => window.api.minimizeWindow()} accentColor={accentColor} theme={theme}>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </TitleBarButton>

        <TitleBarButton label="Maximize" onClick={() => window.api.maximizeWindow()} accentColor={accentColor} theme={theme}>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </TitleBarButton>

        <TitleBarButton label="Close" onClick={() => window.api.closeWindow()} accentColor={accentColor} theme={theme} danger>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </TitleBarButton>
      </div>
    </div>
  );
}

function TitleBarButton({ children, label, onClick, danger = false, accentColor, theme }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-8 items-center justify-center rounded transition-all duration-150"
      style={{ color: `${theme.text}55` }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(185,50,50,0.55)' : `${accentColor}18`;
        e.currentTarget.style.color = danger ? '#ff8080' : accentColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = `${theme.text}55`;
      }}
    >
      {children}
    </button>
  );
}
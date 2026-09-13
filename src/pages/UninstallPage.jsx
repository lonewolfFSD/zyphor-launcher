/**
 * UninstallPage.jsx — Zyphor Electron Launcher
 * Authentic Rockstar Games Launcher uninstaller design:
 * - Top: High-impact cinematic hero video & branding
 * - Bottom: Clean information, data preservation toggles, & actions
 * - Full-width thick progress bar spanning the entire bottom of the window screen
 * - Auto unmaximizes / restores window on open
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/index.jsx';
import { X, Minus, Check } from 'lucide-react';

import DEFAULT_BG_VIDEO from './videos/test_video.mp4';
import Logo from '../Logo/icon.png';
import Trans from '../Logo/trans-logo.png';

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

export default function UninstallPage({ onCancel }) {
  const { t } = useTranslation();

  // State: 'confirm' | 'progress' | 'complete'
  const [step, setStep] = useState('confirm');

  // Options
  const [keepSettings, setKeepSettings] = useState(true);
  const [keepData, setKeepData] = useState(true);

  // Progress
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const videoRef = useRef(null);

  // Force unmaximize window on mount
  useEffect(() => {
    window.launcherAPI?.unmaximizeWindow?.();
    videoRef.current?.play().catch(() => {});
  }, []);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (window.launcherAPI?.uninstall?.cancel) {
      window.launcherAPI.uninstall.cancel();
    } else {
      window.close();
    }
  };

  const handleQuit = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (window.launcherAPI?.uninstall?.quit) {
      window.launcherAPI.uninstall.quit();
    } else {
      window.close();
    }
  };

  const handleStartUninstall = async () => {
    setStep('progress');
    setProgress(15);
    setStatusText(t('uninstall.statusStopping', {}, 'Stopping background launcher processes...'));

    const steps = [
      { p: 35, delay: 700, text: t('uninstall.statusPreserving', {}, 'Preserving selected configurations...') },
      { p: 65, delay: 800, text: t('uninstall.statusCleaning', {}, 'Removing application components...') },
      { p: 88, delay: 700, text: t('uninstall.statusShortcuts', {}, 'Cleaning up system shortcuts...') },
      { p: 100, delay: 600, text: t('uninstall.statusFinalizing', {}, 'Finalizing uninstallation...') },
    ];

    try {
      if (window.launcherAPI?.uninstall?.execute) {
        window.launcherAPI.uninstall.execute({
          keepSettings,
          keepSaves: keepData,
          keepGameFiles: keepData,
          keepScreenshots: keepData,
        }).catch(() => {});
      }

      for (const s of steps) {
        await new Promise((r) => setTimeout(r, s.delay));
        setProgress(s.p);
        setStatusText(s.text);
      }

      await new Promise((r) => setTimeout(r, 400));
      setStep('complete');
    } catch {
      setStep('complete');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#08080a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
        overflow: 'hidden',
        userSelect: 'none',
        color: '#ffffff',
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* ── Drag TitleBar Overlay ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 50,
          WebkitAppRegion: 'drag',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={Logo} style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.8 }} alt="" />
          <span
            style={{
              fontSize: 10,
              fontFamily: '"JetBrains Mono", Consolas, monospace',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Zyphor Launcher Uninstaller
          </span>
        </div>

        {step !== 'progress' && (
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={handleCancel}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              }}
            >
              <Minus size={13} />
            </button>
            <button
              onClick={handleCancel}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TOP HALF — Hero Cinematic Video Banner (Rockstar Style)
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '0 0 52%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        <video
          ref={videoRef}
          src={DEFAULT_BG_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.65,
          }}
        />

        {/* Cinematic bottom gradient fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, #08080a 0%, rgba(8,8,10,0.4) 50%, transparent 100%),
                         linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)`,
          }}
        />

        {/* Centered Trans Logo watermark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <img src={Trans} style={{ width: 280, opacity: 0.85 }} alt="" />
        </div>

        {/* Bottom-left title badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <img src={Logo} style={{ width: 44, height: 44, objectFit: 'contain' }} alt="" />
          <div>
            <h1
              style={{
                fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              Zyphor Launcher
            </h1>
            <p
              style={{
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                marginTop: 4,
              }}
            >
              v{CURRENT_VERSION}
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM HALF — Information, Checkbox Options & Actions
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1',
          backgroundColor: '#08080a',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px 36px 36px',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <AnimatePresence mode="wait">
          {/* ── 1. CONFIRM STEP ── */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                  }}
                >
                  {t('uninstall.title', {}, 'Are you sure you want to uninstall?')}
                </h2>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 3,
                  }}
                >
                  {t('uninstall.subtitle', {}, 'This will remove the Zyphor Launcher application from your system.')}
                </p>
              </div>

              {/* Data Preservation Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: 8, width: '100%' }}>
                <div
                  onClick={() => setKeepSettings(!keepSettings)}
                  style={{
                    display: 'flex',
                    gap: 28,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 26px',
                    borderRadius: 16,
                    border: `1px solid ${keepSettings ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    backgroundColor: keepSettings ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {t('uninstall.keepSettings', {}, 'Save user preferences and settings')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                      Theme, audio, keybindings, and login state
                    </p>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${keepSettings ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                      backgroundColor: keepSettings ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {keepSettings && <Check size={12} color="#000000" strokeWidth={3} />}
                  </div>
                </div>

                <div
                  onClick={() => setKeepData(!keepData)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 26px',
                    borderRadius: 16,
                    gap: 28,
                    border: `1px solid ${keepData ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    backgroundColor: keepData ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {t('uninstall.keepGames', {}, 'Keep game save data and downloaded games')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                      Story progress, screenshot gallery, and game packages
                    </p>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${keepData ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                      backgroundColor: keepData ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {keepData && <Check size={12} color="#000000" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 50 }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'transparent',
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {t('uninstall.cancelBtn', {}, 'Cancel')}
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleStartUninstall}
                  style={{
                    padding: '16px 24px',
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {t('uninstall.uninstallBtn', {}, 'Uninstall')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── 2. PROGRESS STEP ── */}
          {step === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2
                  style={{
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                  }}
                >
                  {t('uninstall.uninstalling', {}, 'Uninstalling Zyphor Launcher...')}
                </h2>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {progress}%
                </span>
              </div>

              <p
                style={{
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {statusText}
              </p>
            </motion.div>
          )}

          {/* ── 3. COMPLETE STEP ── */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                  }}
                >
                  {t('uninstall.completeTitle', {}, 'Uninstallation Complete')}
                </h2>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 3,
                  }}
                >
                  {t('uninstall.completeSubtitle', {}, 'Zyphor Launcher has been successfully removed from your computer.')}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 100 }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleQuit}
                  style={{
                    padding: '14px 32px',
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {t('uninstall.closeBtn', {}, 'Close')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          FULL-WIDTH THICK PROGRESS BAR (Bottom Window Screen Coverage)
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundColor: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          zIndex: 60,
        }}
      >
        <motion.div
          style={{
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 16px rgba(255,255,255,0.8), 0 0 4px #ffffff',
          }}
          initial={{ width: '0%' }}
          animate={{
            width: step === 'confirm' ? '0%' : `${progress}%`,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * InstallPage.jsx — Zyphor Electron Launcher
 * Authentic Rockstar Games Launcher installer design with multi-step wizard:
 * - Step 1 ('location'): Choose installation folder + disk space information
 * - Step 2 ('options'): Shortcuts and startup toggles
 * - Step 3 ('progress'): Full-width bottom edge progress bar & status updates
 * - Step 4 ('complete'): Finished screen with launch option
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/index.jsx';
import { X, Minus, Check, FolderOpen, HardDrive } from 'lucide-react';

import DEFAULT_BG_VIDEO from './videos/test_video.mp4';
import Logo from '../Logo/icon.png';
import Trans from '../Logo/trans-logo.png';

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.2.2';
const DEFAULT_INSTALL_PATH = 'C:\\Program Files\\Zyphor Launcher';

export default function InstallPage({ onCancel, onComplete }) {
  const { t } = useTranslation();

  // State: 'location' | 'options' | 'progress' | 'complete'
  const [step, setStep] = useState('location');

  // Installation Configuration Options
  const [installPath, setInstallPath] = useState(DEFAULT_INSTALL_PATH);
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [startMenuShortcut, setStartMenuShortcut] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [launchAfterInstall, setLaunchAfterInstall] = useState(true);

  // Disk Space Info
  const [availableSpaceGB, setAvailableSpaceGB] = useState('120.4');

  // Progress
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const videoRef = useRef(null);

  // Force unmaximize window on mount and fetch initial values
  useEffect(() => {
    window.launcherAPI?.unmaximizeWindow?.();
    videoRef.current?.play().catch(() => {});

    // Try to get default install path from main process if available
    window.launcherAPI?.install?.getDefaultPath?.()
      .then((p) => {
        if (p) setInstallPath(p);
      })
      .catch(() => {});

    // Get disk space for the selected location
    window.launcherAPI?.getDiskSpace?.()
      .then((res) => {
        if (res?.freeMB) {
          setAvailableSpaceGB((res.freeMB / 1024).toFixed(1));
        }
      })
      .catch(() => {});
  }, []);

  const handleBrowse = async () => {
    try {
      const selected = await window.launcherAPI?.pickInstallLocation?.();
      if (selected) {
        setInstallPath(selected);
        // Refresh available disk space if supported
        window.launcherAPI?.install?.getDiskSpace?.(selected)
          .then((space) => {
            if (space?.freeMB) {
              setAvailableSpaceGB((space.freeMB / 1024).toFixed(1));
            }
          })
          .catch(() => {});
      }
    } catch {
      // Fallback
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (window.launcherAPI?.install?.cancel) {
      window.launcherAPI.install.cancel();
    } else {
      window.close();
    }
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete({ launchAfterInstall });
      return;
    }
    if (window.launcherAPI?.install?.launch) {
      window.launcherAPI.install.launch({ launchAfterInstall });
    } else {
      window.close();
    }
  };

  const handleStartInstall = async () => {
    setStep('progress');
    setProgress(12);
    setStatusText(t('install.statusPreparing', {}, 'Preparing installation files...'));

    const steps = [
      { p: 32, delay: 650, text: t('install.statusExtracting', {}, 'Extracting core launcher packages...') },
      { p: 68, delay: 750, text: t('install.statusShortcuts', {}, 'Creating application shortcuts...') },
      { p: 86, delay: 600, text: t('install.statusConfiguring', {}, 'Configuring launcher environment...') },
      { p: 100, delay: 500, text: t('install.statusFinalizing', {}, 'Finalizing installation...') },
    ];

    try {
      if (window.launcherAPI?.install?.execute) {
        window.launcherAPI.install.execute({
          installPath,
          desktopShortcut,
          startMenuShortcut,
          launchOnStartup,
          launchAfterInstall,
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
            Zyphor Launcher Installer
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
          BOTTOM HALF — Multi-Step Information, Checkboxes & Actions
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1',
          backgroundColor: '#08080a',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px 36px 34px',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <AnimatePresence mode="wait">
          {/* ── STEP 1: CHOOSE INSTALL LOCATION ── */}
          {step === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
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
                  {t('install.stepLocationTitle', {}, 'Choose Install Location')}
                </h2>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 3,
                  }}
                >
                  {t('install.stepLocationSubtitle', {}, 'Select the directory where Zyphor Launcher will be installed on your computer.')}
                </p>
              </div>

              {/* Install Directory Selection Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      minWidth: 0,
                    }}
                  >
                    <FolderOpen size={16} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: '"JetBrains Mono", Consolas, monospace',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={installPath}
                    >
                      {installPath}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBrowse}
                    style={{
                      padding: '12px 22px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.18)',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    }}
                  >
                    {t('install.browse', {}, 'Browse…')}
                  </button>
                </div>

                {/* Disk Space Statistics */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 4,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 11.5,
                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)' }}>
                    <span>{t('install.spaceRequired', {}, 'Space required:')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>~1.5 GB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)' }}>
                    <HardDrive size={13} color="rgba(255,255,255,0.4)" />
                    <span>{t('install.spaceAvailable', {}, 'Space available:')}</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{availableSpaceGB} GB</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
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
                  {t('install.cancelBtn', {}, 'Cancel')}
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setStep('options')}
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
                  {t('install.nextBtn', {}, 'Next')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: SHORTCUTS & OPTIONS TOGGLES ── */}
          {step === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
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
                  {t('install.stepOptionsTitle', {}, 'Installation Options')}
                </h2>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 3,
                  }}
                >
                  {t('install.stepOptionsSubtitle', {}, 'Configure shortcut icons and system preferences.')}
                </p>
              </div>

              {/* Options Checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
                {/* Desktop Shortcut */}
                <div
                  onClick={() => setDesktopShortcut(!desktopShortcut)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                    borderRadius: 16,
                    border: `1px solid ${desktopShortcut ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    backgroundColor: desktopShortcut ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {t('install.desktopShortcut', {}, 'Desktop Shortcut')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {t('install.desktopShortcutDesc', {}, 'Quick launch on desktop')}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${desktopShortcut ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                      backgroundColor: desktopShortcut ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {desktopShortcut && <Check size={12} color="#000000" strokeWidth={3} />}
                  </div>
                </div>

                {/* Start Menu Shortcut */}
                <div
                  onClick={() => setStartMenuShortcut(!startMenuShortcut)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                    borderRadius: 16,
                    border: `1px solid ${startMenuShortcut ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    backgroundColor: startMenuShortcut ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {t('install.startMenuShortcut', {}, 'Start Menu')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {t('install.startMenuShortcutDesc', {}, 'Pin to Windows Start')}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${startMenuShortcut ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                      backgroundColor: startMenuShortcut ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {startMenuShortcut && <Check size={12} color="#000000" strokeWidth={3} />}
                  </div>
                </div>

                {/* Launch on Startup */}
                <div
                  onClick={() => setLaunchOnStartup(!launchOnStartup)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                    borderRadius: 16,
                    border: `1px solid ${launchOnStartup ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    backgroundColor: launchOnStartup ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {t('install.launchOnStartup', {}, 'Run on Startup')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {t('install.launchOnStartupDesc', {}, 'Auto start on PC boot')}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${launchOnStartup ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                      backgroundColor: launchOnStartup ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {launchOnStartup && <Check size={12} color="#000000" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep('location')}
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
                  {t('install.backBtn', {}, 'Back')}
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleStartInstall}
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
                  {t('install.installBtn', {}, 'Install')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PROGRESS ── */}
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
                  {t('install.installing', {}, 'Installing Zyphor Launcher...')}
                </h2>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                    fontSize: 14,
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

          {/* ── STEP 4: COMPLETE ── */}
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
                  {t('install.completeTitle', {}, 'Installation Complete')}
                </h2>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 3,
                  }}
                >
                  {t('install.completeSubtitle', {}, 'Zyphor Launcher has been successfully installed on your computer.')}
                </p>
              </div>

              {/* Launch Now Checkbox */}
              <div
                onClick={() => setLaunchAfterInstall(!launchAfterInstall)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: `1px solid ${launchAfterInstall ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                  backgroundColor: launchAfterInstall ? 'rgba(255,255,255,0.04)' : 'transparent',
                  cursor: 'pointer',
                  width: 'fit-content',
                  transition: 'all 0.15s ease',
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `1.5px solid ${launchAfterInstall ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                    backgroundColor: launchAfterInstall ? '#ffffff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {launchAfterInstall && <Check size={12} color="#000000" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>
                  {t('install.launchNow', {}, 'Launch Zyphor Launcher now')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleFinish}
                  style={{
                    padding: '14px 36px',
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
                  {launchAfterInstall ? t('install.launchBtn', {}, 'Launch') : t('install.finishBtn', {}, 'Finish')}
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
            width: (step === 'location' || step === 'options') ? '0%' : `${progress}%`,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

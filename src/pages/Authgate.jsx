/**
 * AuthGate.jsx — Zyphor Electron Launcher
 * REDESIGNED: Split-panel layout. Left = full cinematic video. Right = auth drawer.
 *
 * Generates a random session ID, opens zyphorstudios.com/handshake?session=<ID>
 * in the browser, then listens to Firestore auth_sessions/<ID>.
 * The moment the website writes the UID there, we fetch the profile and call
 * onAuthSuccess(profile) — exactly how ZyphorDeeplink.cs works.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js'
import { ExternalLink, ShieldAlert, RefreshCw, ArrowRight, Zap, Globe } from 'lucide-react'
import { clearSession, saveUid } from '../lib/authSession.js'
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n/index.jsx'

import DEFAULT_BACKGROUND_VIDEO from './videos/test_video.mp4'

import Logo from '../Logo/icon.png';
import Trans from '../Logo/trans-logo.png';

const HANDSHAKE_BASE = 'https://zyphorstudios.com/login-game-handshake'
const SESSION_TTL_MS = 5 * 60 * 1000

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

const newSessionId = () => crypto.randomUUID()

/* ─── Spinner: clean arc, no wobble ─── */
function ArcSpinner({ size = 32, color = '#8b5cf6', thickness = 6 }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={thickness} />
      {/* Arc */}
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.7} ${circ * 0.3}`}
        style={{ originX: '50%', originY: '50%' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
      />
    </svg>
  )
}

/* ─── Countdown ring ─── */
function CountdownRing({ secondsLeft, total, color }) {
  const { t } = useTranslation()
  const size = 72
  const thickness = 2
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const progress = secondsLeft / total
  const mins = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const isLow = secondsLeft < 60

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={isLow ? '#ef4444' : color} strokeOpacity={0.12} strokeWidth={thickness} />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={isLow ? '#ef4444' : color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circ * progress} ${circ * (1 - progress)}`}
          animate={{ strokeDasharray: `${circ * progress} ${circ * (1 - progress)}` }}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 1,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: isLow ? '#ef4444' : '#ffffff',
          lineHeight: 1,
        }}>
          {mins}:{secs}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: 8,
          marginTop: 2,
          opacity: 0.4,
          color: '#ffffff',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {t('auth.left', {}, 'left')}
        </span>
      </div>
    </div>
  )
}

export default function AuthGate({ onAuthSuccess }) {
  const { t, language, setLanguage } = useTranslation()
  const { settings, update: updateSettings } = useSettings()
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb

  const motionOn            = settings ? settings.animations && !settings.reduceMotion : true

  // AuthGate always uses the default ambient video — it's the first thing
  // the user sees, so it should be consistent regardless of their theme choice.
  const backgroundVideoSrc  = DEFAULT_BACKGROUND_VIDEO
  const bgStaticPoster      = null

  const [status,      setStatus]      = useState('idle')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [dots,        setDots]        = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)

  const unsubRef   = useRef(null)
  const timerRef   = useRef(null)
  const expiryRef  = useRef(null)
  const sessionRef = useRef(null)
  const videoRef   = useRef(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (motionOn) el.play().catch(() => {})
    else el.pause()
  }, [motionOn])

  useEffect(() => {
    if (status !== 'waiting') return
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => () => stopListening(), [])

  const stopListening = () => {
    unsubRef.current?.()
    clearInterval(timerRef.current)
    clearTimeout(expiryRef.current)
  }

  const handleLogin = () => {
    stopListening()
    const sessionId = newSessionId()
    sessionRef.current = sessionId
    window.open(`${HANDSHAKE_BASE}?session=${sessionId}`)
    setStatus('waiting')
    setErrorMsg('')

    const expiry = Date.now() + SESSION_TTL_MS
    setSecondsLeft(Math.round(SESSION_TTL_MS / 1000))
    timerRef.current = setInterval(() => {
      setSecondsLeft(Math.max(Math.round((expiry - Date.now()) / 1000), 0))
    }, 1000)

    expiryRef.current = setTimeout(() => {
      stopListening()
      setStatus('error')
      setErrorMsg(t('auth.errorExpired', {}, 'Session expired. The 5-minute window closed before you signed in.'))
    }, SESSION_TTL_MS)

    const sessionDoc = doc(db, 'auth_sessions', sessionId)
    unsubRef.current = onSnapshot(sessionDoc, async (snap) => {
      if (!snap.exists()) return
      const { uid } = snap.data()
      if (!uid) return

      stopListening()
      setStatus('loading')

      try {
        const userSnap = await getDoc(doc(db, 'users', uid))
        if (!userSnap.exists()) {
          setErrorMsg(t('auth.errorNoProfile', {}, 'Account found but no profile exists. Complete sign-up on the website first.'))
          setStatus('error')
          return
        }
        const d = userSnap.data()

        let steamInfo = null
        try {
          steamInfo = await window.launcherAPI?.steam?.getStatus?.()
        } catch {}

        const steamConnected = Boolean(steamInfo?.initialized)
        const resolvedSteamId = d.steamId || (steamConnected ? steamInfo.steamId64 : '')
        const resolvedOwnsGame = Boolean(d.steamOwnsGame || d.hasGame || steamInfo?.ownsGame || steamConnected)

        if (steamConnected && (!d.steamId || !d.steamOwnsGame)) {
          setDoc(
            doc(db, 'users', uid),
            {
              steamId: resolvedSteamId,
              steamName: steamInfo?.name || '',
              steamOwnsGame: resolvedOwnsGame,
              hasGame: resolvedOwnsGame,
            },
            { merge: true }
          ).catch((e) => console.warn('Background steam link failed:', e))
        }

        const profile = {
          uid,
          email:       d.email        ?? '',
          displayName: d.displayName  ?? 'Unknown',
          photoURL:    d.photoURL     ?? '',
          location:    d.location     ?? '',
          timezone:    d.timezone     ?? 'UTC',
          gender:      d.gender       ?? '',
          isVip:       Boolean(d.isVip),
          hasGame:     resolvedOwnsGame,
          steamOwnsGame: resolvedOwnsGame,
          steamId:     resolvedSteamId,
          rememberMe:  Boolean(d.rememberMe),
          totpLinked:  Boolean(d.totpLinked),
          hasPasskey:  Boolean(d.hasPasskey),
          raw: d,
        }
        if (settings?.rememberLogin) saveUid(uid)
        else clearSession()
        onAuthSuccess(profile)
      } catch (err) {
        console.error('Profile fetch failed:', err)
        setErrorMsg(t('auth.errorLoadProfile', {}, 'Failed to load your profile. Check your connection and try again.'))
        setStatus('error')
      }
    }, (err) => {
      console.error('Firestore listener error:', err)
      stopListening()
      setErrorMsg(t('auth.errorConnection', {}, 'Lost connection to the server. Try again.'))
      setStatus('error')
    })
  }

  const handleRetry = () => {
    stopListening()
    setStatus('idle')
    setErrorMsg('')
    setDots('')
  }

  /* ── Design tokens — always OLED, always white CTA ── */
  const A  = '#ffffff'                  // button / accent → white
  const BG = '#000000'                  // OLED black base
  const S  = '#0a0a0a'                  // panel surface
  const B  = 'rgba(255,255,255,0.07)'  // border
  const T  = '#ffffff'                  // text
  const M  = 'rgba(255,255,255,0.45)'  // muted text

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: BG,
      display: 'flex',
      fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── Global helper style ── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ════════════════════════════════════════
          LEFT PANEL — Full cinematic media
      ════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Always the default ambient video — consistent first impression */}
        <video
          ref={videoRef}
          src={backgroundVideoSrc}
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Gradient vignette — right edge fades into panel */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to right, transparent 40%, ${BG} 100%),
                       linear-gradient(to top, ${BG}cc 0%, transparent 40%)`,
        }} />

        {/* Logo centered */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <img src={Trans} style={{ width: 380, opacity: 0.95 }} />
        </div>

        
      </div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Auth drawer
          Pinned flush to the right edge
      ════════════════════════════════════════ */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 580,
          flexShrink: 0,
          backgroundColor: S,
          borderLeft: `1px solid ${B}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 90px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle glow behind the panel content */}
        <div style={{
          position: 'absolute',
          top: -160, right: -160,
          width: 600, height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${A}14 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* ── Logo / Brand ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{ marginBottom: 40, display: 'flex', alignItems: 'center' }}
        >
          <div className='flex gap-3'>
            <img className='w-[70px] h-[70px]' src={Logo} alt="" />
            <span>
              <h1 style={{
                fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                marginTop: 4,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: T,
                lineHeight: 1,
              }}>
                Zyphor Launcher
              </h1>
              {/* <p style={{
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginTop: 8,
                color: M,
                marginBottom: 6,
              }}>
                v{CURRENT_VERSION}
              </p> */}
            </span>
          </div>
        </motion.div>

        {/* ── State content ── */}
        <AnimatePresence mode="wait">

          {/* ── IDLE ── */}
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className='-mt-4'
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <p style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
                fontWeight: 400,
              }}>
                {t('auth.signInToContinue', {}, "Sign in or create an account on the Zyphor website. The launcher connects automatically once you're done.")}
              </p>

              <motion.button
                onClick={handleLogin}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: A,
                  color: '#000000',
                  fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t('auth.signIn', {}, 'Sign in through Zyphor Portal')}
                </span>
                <ArrowRight size={18} strokeWidth={2.2} style={{ opacity: 0.7 }} />
              </motion.button>

              {/* Divider hint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  fontWeight: 600,
                }}>
                  {t('auth.browserAuth', {}, 'BROWSER AUTHENTICATION')}
                </span>
                <div style={{ flex: 1, height: 1, backgroundColor: B }} />
              </div>

              <p style={{
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.35)',
                marginTop: -10,
                lineHeight: 1.5,
                textAlign: 'left',
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
              }}>
                {t('auth.browserHint', {}, 'A browser window will open. Sign in there — the launcher detects it automatically.')}
              </p>
            </motion.div>
          )}

          {/* ── WAITING ── */}
          {status === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* Status row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 22,
                backgroundColor: `${A}0d`,
                border: `1px solid ${A}25`,
              }}>
                <ArcSpinner size={28} color={A} thickness={2.5} />
                <div>
                  <p style={{
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    color: T,
                    lineHeight: 1,
                  }}>
                    {t('auth.waitingForBrowser', {}, 'Waiting for browser')}{dots}
                  </p>
                  <p style={{
                    fontSize: 12.5,
                    color: M,
                    marginTop: 4,
                    lineHeight: 1.4,
                    fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
                  }}>
                    {t('auth.completeSignIn', {}, 'Complete sign-in on the website')}
                  </p>
                </div>

                {/* Countdown ring — right side */}
                <div style={{ marginLeft: 'auto' }}>
                  <CountdownRing secondsLeft={secondsLeft} total={SESSION_TTL_MS / 1000} color={A} />
                </div>
              </div>

              {/* Steps */}
              {[
                { n: '1', t: t('auth.stepBrowserOpened', {}, 'Browser opened'), done: true },
                { n: '2', t: t('auth.stepSignInWebsite', {}, 'Sign in on website'), done: false },
                { n: '3', t: t('auth.stepAutoConnect', {}, 'Auto-connect'), done: false },
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: step.done ? 0.4 : 0.85,
                }}>
                  <div style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    border: `1.5px solid ${step.done ? A : B}`,
                    backgroundColor: step.done ? `${A}20` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {step.done
                      ? <span style={{ fontSize: 10, color: A, marginTop: 1 }}>✓</span>
                      : <span style={{ fontSize: 10, color: M, marginTop: 1, fontFamily: '"JetBrains Mono", Consolas, monospace', fontWeight: 700 }}>{step.n}</span>
                    }
                  </div>
                  <span style={{ fontSize: 13.5, fontFamily: '"Manrope", "Inter", system-ui, sans-serif', color: step.done ? M : T }}>{step.t}</span>
                </div>
              ))}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleLogin}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '14px 14px',
                    borderRadius: 14,
                    border: `1px solid ${B}`,
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    backgroundColor: 'transparent',
                    color: T,
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <RefreshCw size={14} strokeWidth={2.2} />
                  {t('auth.reopenBrowser', {}, 'Reopen browser')}
                </button>
                <button
                  onClick={handleRetry}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 14,
                    border: `1px solid ${B}`,
                    backgroundColor: 'transparent',
                    fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                    color: M,
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T}
                  onMouseLeave={e => e.currentTarget.style.color = M}
                >
                  {t('auth.cancel', {}, 'Cancel')}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 16,
                padding: '16px 0',
              }}
            >
              <ArcSpinner size={44} color={A} thickness={2.5} />
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: T,
                  marginBottom: 4,
                }}>
                  {t('auth.loadingProfile', {}, 'Loading profile')}
                </p>
                <p style={{ fontSize: 12, color: M, fontFamily: '"Manrope", "Inter", system-ui, sans-serif' }}>
                  {t('auth.oneMoment', {}, 'One moment…')}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Error card */}
              <div style={{
                borderRadius: 14,
                border: '1px solid rgba(239,68,68,0.2)',
                backgroundColor: 'rgba(239,68,68,0.07)',
                padding: '14px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  <ShieldAlert size={13} color="#f87171" strokeWidth={2.2} />
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: '#f87171', fontFamily: '"Manrope", "Inter", system-ui, sans-serif' }}>
                  {errorMsg}
                </p>
              </div>

              <motion.button
                onClick={handleLogin}
                whileHover={{ scale: 1.015, boxShadow: `0 8px 28px ${A}55` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '15px 22px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: A,
                  color: '#000000',
                  fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                  fontSize: 13.5,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  boxShadow: `0 4px 20px ${A}40`,
                  transition: 'box-shadow 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ExternalLink size={15} strokeWidth={2.2} />
                  {t('auth.tryAgain', {}, 'Try again')}
                </span>
                <ArrowRight size={15} strokeWidth={2.2} style={{ opacity: 0.7 }} />
              </motion.button>

              <button
                onClick={handleRetry}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: M,
                  fontSize: 12,
                  fontFamily: '"Clash Display", "Manrope", system-ui, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '4px 0',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = T}
                onMouseLeave={e => e.currentTarget.style.color = M}
              >
                {t('auth.backToStart', {}, 'Back to start')}
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Bottom bar (Language on left, Version on right) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{
            position: 'absolute', bottom: 24, left: 40, right: 40,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          {/* Quick Language Dropdown on bottom left */}
          <div className="relative">
            <span className="text-[11px] font-medium text-bone/70">{t('auth.language', {}, 'Language')}: </span>
            <select
              value={language || 'en'}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage?.(newLang);
                updateSettings?.({ language: newLang });
              }}
              className="appearance-none rounded-xl border border-white/10 bg-white/5 py-1.5 pl-3 pr-7 text-[11px] font-medium text-bone/70 outline-none transition hover:bg-white/10 hover:text-white"
              style={{ cursor: 'pointer', fontFamily: '"Manrope", "Inter", system-ui, sans-serif' }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} style={{ backgroundColor: '#181818', color: '#fff' }}>
                  {l.flag} {l.nativeName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] opacity-40">▼</div>
          </div>

          <span style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.25)',
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            v{CURRENT_VERSION}
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}
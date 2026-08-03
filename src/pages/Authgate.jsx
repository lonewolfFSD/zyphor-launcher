/**
 * AuthGate.jsx — Zyphor Electron Launcher
 *
 * Generates a random session ID, opens zyphorstudios.com/handshake?session=<ID>
 * in the browser, then listens to Firestore auth_sessions/<ID>.
 * The moment the website writes the UID there, we fetch the profile and call
 * onAuthSuccess(profile) — exactly how ZyphorDeeplink.cs works.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js'
import Grainient from '../effects/Grainient.jsx'
import { ExternalLink, Loader2, ShieldAlert, RefreshCw } from 'lucide-react'
import { clearSession, saveUid } from '../lib/authSession.js'

const HANDSHAKE_BASE = 'https://zyphorstudios.com/login-game-handshake'
const SESSION_TTL_MS = 5 * 60 * 1000   // 5 min — matches the website timer

/** Generates a random session ID like the C# Guid.NewGuid() */
const newSessionId = () => crypto.randomUUID()

export default function AuthGate({ onAuthSuccess }) {
  const { settings } = useSettings()
  const theme  = THEMES[settings?.theme]  || THEMES.oled
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb

  const [status, setStatus]   = useState('idle')   // idle | waiting | loading | error
  const [errorMsg, setErrorMsg] = useState('')
  const [dots, setDots]         = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)

  const unsubRef    = useRef(null)   // Firestore listener
  const timerRef    = useRef(null)   // countdown interval
  const expiryRef   = useRef(null)   // expiry timeout
  const sessionRef  = useRef(null)   // current session ID

  // ── Animated waiting dots ─────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'waiting') return
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [status])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopListening(), [])

  const stopListening = () => {
    unsubRef.current?.()
    clearInterval(timerRef.current)
    clearTimeout(expiryRef.current)
  }

  // ── Main handler — generate session, open browser, start listener ─────────
  const handleLogin = () => {
    stopListening()

    const sessionId = newSessionId()
    sessionRef.current = sessionId

    const url = `${HANDSHAKE_BASE}?session=${sessionId}`
    window.open(url)   // intercepted by setWindowOpenHandler → shell.openExternal

    setStatus('waiting')
    setErrorMsg('')

    // Countdown
    const expiry = Date.now() + SESSION_TTL_MS
    setSecondsLeft(Math.round(SESSION_TTL_MS / 1000))
    timerRef.current = setInterval(() => {
      const left = Math.round((expiry - Date.now()) / 1000)
      setSecondsLeft(Math.max(left, 0))
    }, 1000)

    // Expire after TTL
    expiryRef.current = setTimeout(() => {
      stopListening()
      setStatus('error')
      setErrorMsg('Session expired. The 5-minute window closed before you signed in. Try again.')
    }, SESSION_TTL_MS)

    // Listen to auth_sessions/<sessionId> in Firestore
    const sessionDoc = doc(db, 'auth_sessions', sessionId)
    unsubRef.current = onSnapshot(sessionDoc, async (snap) => {
      if (!snap.exists()) return          // not written yet — keep waiting
      const { uid } = snap.data()
      if (!uid) return

      stopListening()
      setStatus('loading')

      try {
        const userSnap = await getDoc(doc(db, 'users', uid))
        if (!userSnap.exists()) {
          setErrorMsg('Account found but no profile exists. Complete sign-up on the website first.')
          setStatus('error')
          return
        }
        const d = userSnap.data();

        const profile = {
          uid,
          email:        d.email        ?? '',
          displayName:  d.displayName  ?? 'Unknown',
          photoURL:     d.photoURL     ?? '',
          location:     d.location     ?? '',
          timezone:     d.timezone     ?? 'UTC',
          gender:       d.gender       ?? '',
          isVip:        Boolean(d.isVip),
          hasGame:      Boolean(d.hasGame || d.steamOwnsGame),
          steamId:      d.steamId      ?? '',   // ← add this
          rememberMe:   Boolean(d.rememberMe),
          totpLinked:   Boolean(d.totpLinked),
          hasPasskey:   Boolean(d.hasPasskey),
          raw: d,
        };

        // Only store the uid when rememberLogin is enabled
        if (settings?.rememberLogin) {
          saveUid(uid);
        } else {
          clearSession();
        }

        onAuthSuccess(profile);
      } catch (err) {
        console.error('Profile fetch failed:', err)
        setErrorMsg('Failed to load your profile. Check your connection and try again.')
        setStatus('error')
      }
    }, (err) => {
      console.error('Firestore listener error:', err)
      stopListening()
      setErrorMsg('Lost connection to the server. Try again.')
      setStatus('error')
    })
  }

  const handleRetry = () => {
    stopListening()
    setStatus('idle')
    setErrorMsg('')
    setDots('')
  }

  // ── Shared styles from NavRail tokens ─────────────────────────────────────
  const card = {
    backgroundColor: `${theme.surface}ee`,
    borderColor:     theme.border,
    color:           theme.text,
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div>
      <span className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
        <Grainient
          color1="#FF9FFC" color2="#5227FF" color3="#B497CF"
          timeSpeed={0.25} colorBalance={0}
          warpStrength={1} warpFrequency={5} warpSpeed={2} warpAmplitude={50}
          blendAngle={0} blendSoftness={0.05} rotationAmount={500}
          noiseScale={2} grainAmount={0.1} grainScale={2} grainAnimated={false}
          contrast={1.5} gamma={1} saturation={1}
          centerX={0} centerY={0} zoom={0.9}
        />
      </span>

      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60">

        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${accent.hex}22, transparent)` }}
        />

        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[380px] rounded-2xl border overflow-hidden shadow-2xl"
          style={card}
        >
          {/* Banner */}
          <div className="relative h-36 overflow-hidden">
            <img
              src="https://i.pinimg.com/1200x/2c/ec/c4/2cecc43c8878eba88a376f5c88353547.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, transparent 40%, ${theme.surface}ee 100%)` }}
            />
            <div className="absolute bottom-3 left-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Welcome to</p>
              <h1 className="text-xl font-black uppercase tracking-wider leading-none">Zyphor</h1>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-7 pt-5 flex flex-col gap-4">
            <AnimatePresence mode="wait">

              {/* ── IDLE ── */}
              {status === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-sm opacity-50 leading-relaxed">
                    Sign in or create an account on the Zyphor website. The launcher connects automatically once you're done.
                  </p>
                  <motion.button
                    onClick={handleLogin}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold"
                    style={{ backgroundColor: accent.hex, color: accent.on }}
                  >
                    <ExternalLink size={15} />
                    Sign in / Create account
                  </motion.button>
                </motion.div>
              )}

              {/* ── WAITING ── */}
              {status === 'waiting' && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="flex flex-col items-center gap-4 py-2"
                >
                  {/* Pulsing ring */}
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      className="absolute h-14 w-14 rounded-full"
                      style={{ backgroundColor: accent.hex }}
                    />
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${accent.hex}22`, border: `2px solid ${accent.hex}55` }}
                    >
                      <Loader2 size={22} className="animate-spin" style={{ color: accent.hex }} />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold">Waiting for browser{dots}</p>
                    <p className="text-xs opacity-40 mt-1 leading-relaxed">
                      Complete sign-in on the website — we'll connect automatically.
                    </p>
                  </div>

                  {/* Countdown */}
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-bold"
                    style={{ backgroundColor: `${theme.border}44` }}
                  >
                    <span className="opacity-40">Session expires in</span>
                    <span style={{ color: secondsLeft < 60 ? '#ef4444' : accent.hex }}>
                      {mins}:{secs}
                    </span>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleLogin}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition hover:bg-white/5"
                      style={{ borderColor: theme.border }}
                    >
                      <RefreshCw size={12} /> Reopen browser
                    </button>
                    <button
                      onClick={handleRetry}
                      className="text-xs opacity-30 hover:opacity-60 transition-opacity px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── LOADING ── */}
              {status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <Loader2 size={28} className="animate-spin" style={{ color: accent.hex }} />
                  <p className="text-sm opacity-50">Loading your profile…</p>
                </motion.div>
              )}

              {/* ── ERROR ── */}
              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5">
                    <ShieldAlert size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400 leading-relaxed">{errorMsg}</p>
                  </div>
                  <motion.button
                    onClick={handleLogin}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
                    style={{ backgroundColor: accent.hex, color: accent.on }}
                  >
                    <ExternalLink size={15} /> Try again
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
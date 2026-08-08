import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── same assets as onboarding ────────────────────────────────────────────────
import DEFAULT_BG_VIDEO from '../pages/videos/test_video.mp4';

import Sad from './images/faye/sad.png';
import Excited from './images/faye/excited.png';
import Happy from './images/faye/happy.png';
import Neutral from './images/faye/neutral.png';
import Proud from './images/faye/proud.png';
import Sleepy from './images/faye/sleepy.png';
import Waving from './images/faye/waving.png';
import Wink from './images/faye/wink.png';
import Curious from './images/faye/curious.png';

import Dragging from './videos/1.2.2/dragging.mp4';
import Liquid from './videos/1.2.2/liquid.mp4';
import Hotkeys from './videos/1.2.2/hotkeys.mp4';

import first from './videos/1.2.2/audio/first.mp3';
import second from './videos/1.2.2/audio/second.mp3';
import third from './videos/1.2.2/audio/third.mp3';
import fourth from './videos/1.2.2/audio/forth.mp3';
import fifth from './videos/1.2.2/audio/fifth.mp3';
import sixth from './videos/1.2.2/audio/sixth.mp3';
import seventh from './videos/1.2.2/audio/seventh.mp3';
import eight from './videos/1.2.2/audio/eigth.mp3';

import Faye from './videos/1.2.2/faye.png';


// ═══════════════════════════════════════════════════════════════════════════════
//  HARD-CODED UPDATES
//  Add a new key for every release. Faye will only show the tour for the
//  current app version if the user has never seen it.
// ═══════════════════════════════════════════════════════════════════════════════
const UPDATES = {
'1.2.6': {
  version: '1.2.6',
  title: 'Faye & UI Update',
  steps: [
    {
      id: 'welcome',
      expression: 'happy',
      text: "Heyyy, player~! How's everything going? Ready to see what's new in Zyphor?",
      subtext: "There's quite a bit this time... ehehe~",
      action: 'continue',
      btn: "Show me!",
      voice: first,
    },

    {
      id: 'faye',
      expression: 'excited',
      text: "Oh, and I have some news too! I'm officially joining you for future updates now~!",
      subtext: "Looks like you'll be seeing this face again. ✨",
      image: Faye,
      action: 'continue',
      btn: "Yaaay~!",
      voice: second,
    },

    {
      id: 'drag-nav',
      expression: 'curious',
      text: "Moving around the launcher just got a little more fun! You can drag the active indicator straight onto another page.",
      subtext: "It's oddly satisfying... try it.",
      video: Dragging,
      action: 'continue',
      btn: "Ooh, nice!",
      voice: third,
    },

    {
      id: 'splash',
      expression: 'proud',
      text: "The splash screen has been refreshed too! Everything should feel a little cleaner when you start up.",
      subtext: "First impressions are important, y'know~",
      action: 'continue',
      btn: "Pretty!",
      voice: fourth,
    },

    {
      id: 'glass',
      expression: 'excited',
      text: "And then... Liquid Glass! A whole new interface style with a much more dynamic look.",
      subtext: "It is a bit heavier on the GPU, though. Don't say I didn't warn you~",
      action: 'continue',
      video: Liquid,
      btn: "I wanna see it!",
      voice: fifth,
    },

    {
      id: 'hotkeys',
      expression: 'wink',
      text: "Hotkeys finally got some love too! You can now manage and check your shortcuts from Settings.",
      subtext: "Less clicking, more keyboard smashing. Hehe~",
      action: 'continue',
      btn: "Nice!",
      video: Hotkeys,
      voice: sixth,
    },

    {
      id: 'fixes',
      expression: 'happy',
      text: "And there's a bunch of smaller fixes underneath it all, so the launcher should feel smoother overall.",
      subtext: "Some very annoying bugs have officially lost their jobs. 🪲",
      action: 'continue',
      btn: "Good riddance!",
      voice: seventh,
    },

    {
      id: 'goodbye',
      expression: 'waving',
      text: "That's the tour for v1.2.6! Thanks for stopping by, player~!",
      subtext: "Now go play with all the new stuff. ✨",
      action: 'finish',
      btn: "Let's Go! 🚀",
      voice: eight,
    },
  ],
},

  
};

// Current app version – change this (or import from package.json / electron)
// const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';
const CURRENT_VERSION = '1.2.6';

// ═══════════════════════════════════════════════════════════════════════════════
const EXPRESSIONS = {
  neutral: Neutral,
  happy: Happy,
  excited: Excited,
  proud: Proud,
  wink: Wink,
  curious: Curious,
  waving: Waving,
  sleepy: Sleepy,
  sad: Sad,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  THREE.JS STARFIELD  (identical to onboarding)
// ═══════════════════════════════════════════════════════════════════════════════
function GalacticStarfield({ accentHex }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0.4, 6);
    camera.lookAt(0, 0, 0);

    function buildStars(count, spread, size, opacity, brightFraction = 0) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3 - 5;

        const r = Math.random();
        if (i < count * brightFraction) {
          col[i * 3]     = 0.85 + Math.random() * 0.15;
          col[i * 3 + 1] = 0.90 + Math.random() * 0.10;
          col[i * 3 + 2] = 1.0;
        } else if (r < 0.07) {
          const hex = accentHex.replace('#', '');
          const ar = parseInt(hex.substring(0, 2), 16) / 255;
          const ag = parseInt(hex.substring(2, 4), 16) / 255;
          const ab = parseInt(hex.substring(4, 6), 16) / 255;
          col[i * 3]     = ar * 0.9 + 0.1;
          col[i * 3 + 1] = ag * 0.9 + 0.1;
          col[i * 3 + 2] = ab * 0.9 + 0.1;
        } else if (r < 0.12) {
          col[i * 3]     = 1.0;
          col[i * 3 + 1] = 0.92 + Math.random() * 0.08;
          col[i * 3 + 2] = 0.75 + Math.random() * 0.15;
        } else {
          const v = 0.78 + Math.random() * 0.22;
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size,
        transparent: true,
        opacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      return new THREE.Points(geo, mat);
    }

    const dustA       = buildStars(2400, 85, 0.008, 0.50);
    const dustB       = buildStars(900,  55, 0.013, 0.42);
    const midStars    = buildStars(420,  38, 0.025, 0.58, 0.06);
    const brightStars = buildStars(70,   22, 0.052, 0.72, 1.0);

    scene.add(dustA, dustB, midStars, brightStars);

    let animId, t = 0;
    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.008;

      dustA.rotation.y       =  t * 0.004;
      dustB.rotation.y       =  t * 0.007;
      midStars.rotation.y    =  t * 0.011;
      brightStars.rotation.y =  t * 0.016;

      dustA.rotation.x =  t * 0.0015;
      dustB.rotation.x = -t * 0.0025;

      camera.position.x = Math.sin(t * 0.08) * 0.25;
      camera.position.y = 0.4 + Math.cos(t * 0.06) * 0.12;
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
  }, [accentHex]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: 0, mixBlendMode: 'screen' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function AmbientOrbs({ accentHex }) {
  const orbs = useMemo(() => [
    { size: 420, x: '8%',  y: '15%', delay: 0,  duration: 28 },
    { size: 280, x: '78%', y: '55%', delay: 6,  duration: 32 },
    { size: 190, x: '55%', y: '8%',  delay: 12, duration: 24 },
    { size: 340, x: '25%', y: '75%', delay: 4,  duration: 30 },
  ], []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${accentHex}14 0%, transparent 68%)`,
            filter: 'blur(80px)',
          }}
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -50, 35, 0],
            scale: [1, 1.12, 0.92, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function ParticleBurst({ trigger, accentHex, originRef }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger || !originRef.current) return;
    const rect = originRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i,
      x: cx,
      y: cy,
      angle: (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.4,
      distance: 90 + Math.random() * 140,
      size: 2 + Math.random() * 5,
      color: Math.random() > 0.45 ? accentHex : '#ffffff',
      delay: Math.random() * 80,
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1400);
  }, [trigger, accentHex, originRef]);

  return (
    <AnimatePresence>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
          animate={{
            x: p.x + Math.cos(p.angle) * p.distance,
            y: p.y + Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: p.delay * 0.001 }}
          className="pointer-events-none fixed rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}55`,
            zIndex: 100,
          }}
        />
      ))}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STEP MEDIA PREVIEW  (optional image or video per step)
// ═══════════════════════════════════════════════════════════════════════════════
function StepMediaPreview({ step, accentHex }) {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const src   = step?.video || step?.image || null;
  const isVid = !!step?.video && !videoError;

  // Reset error/loaded state when the step changes
  useEffect(() => {
    setVideoError(false);
    setImageError(false);
    setIsVideoLoaded(false);
  }, [step?.id]);

  // Auto-play / reset video when it comes into view
  useEffect(() => {
    if (!isVid || !videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
  }, [step?.id, isVid]);

  if (!src || (videoError && imageError)) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id + '-media'}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[460px] overflow-hidden rounded-lg"
        style={{
          border: `1px solid ${accentHex}30`,
          background: 'rgba(8,8,14,0.60)',
          backdropFilter: 'blur(14px)',
          boxShadow: `0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Thin accent top-bar */}
        <motion.div
          className="absolute top-0 left-5 right-5 h-[1.5px] rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${accentHex}99, transparent)`, zIndex: 2 }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />

        {isVid ? (
          <>
            <video
              ref={videoRef}
              src={step.video}
              muted
              loop
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              onError={() => setVideoError(true)}
              className="w-auto h-[260px] object-cover block"
              style={{
                opacity: isVideoLoaded ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
            />
            {/* Loading shimmer while video loads */}
            {!isVideoLoaded && (
              <div
                className="w-full h-[160px] animate-pulse"
                style={{ background: `linear-gradient(90deg, ${accentHex}08, ${accentHex}16, ${accentHex}08)` }}
              />
            )}
            {/* Video badge */}
            <div
              className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.65)',
                border: `1px solid ${accentHex}30`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentHex }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Live Preview
              </span>
            </div>
          </>
        ) : (
          !imageError && (
            <img
              src={step.image}
              alt={step.id}
              onError={() => setImageError(true)}
              className="w-full max-h-[220px] object-cover block"
              style={{ transition: 'opacity 0.35s ease' }}
            />
          )
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN UPDATE TOUR
// ═══════════════════════════════════════════════════════════════════════════════
export default function UpdateTourPage({ onComplete }) {
  const { settings } = useSettings();
  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const tour = UPDATES[CURRENT_VERSION];
  if (!tour) return null; // safety

  const SCRIPT = tour.steps;

  const videoRef      = useRef(null);
  const audioRef      = useRef(null);
  const typingRef     = useRef(null);
  const actionAreaRef = useRef(null);

  const [stepIndex, setStepIndex]         = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping]           = useState(true);
  const [showHint, setShowHint]           = useState(false);
  const [burstTrigger, setBurstTrigger]   = useState(0);
  const [isMobile, setIsMobile]           = useState(false);
  const [exiting, setExiting]             = useState(false);

  const currentStep = SCRIPT[stepIndex];
  const isLastStep  = stepIndex === SCRIPT.length - 1;

  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
  async function loadVersion() {
    try {
      const snap = await getDoc(doc(db, 'meta', 'version'));
      const version = snap.data()?.version ?? '0.0.0';
      setCurrentVersion(version);
    } catch {
      setCurrentVersion('0.0.0');
    }
  }
  loadVersion();
}, []);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Background video
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // Typewriter
  useEffect(() => {
    if (!currentStep) return;
    setIsTyping(true);
    setDisplayedText('');
    setShowHint(false);

    const text = currentStep.text;
    let i = 0;
    const speed = 20;

    typingRef.current = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingRef.current);
        setIsTyping(false);
        setTimeout(() => setShowHint(true), 280);
      }
    }, speed);

    return () => clearInterval(typingRef.current);
  }, [stepIndex, currentStep?.text]);

  // Voice
  useEffect(() => {
    if (!currentStep?.voice) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioRef.current = new Audio(currentStep.voice);
    audioRef.current.volume = 0.75;
    audioRef.current.play().catch(() => {});
    return () => audioRef.current?.pause();
  }, [currentStep?.id]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
      setExiting(true);
      setTimeout(() => onComplete?.(), 1200);
      return;
    }
    setStepIndex(p => p + 1);
    setBurstTrigger(t => t + 1);
  }, [isLastStep, onComplete]);

  const skipTyping = useCallback(() => {
    if (!isTyping || !typingRef.current) return;
    clearInterval(typingRef.current);
    setDisplayedText(currentStep?.text || '');
    setIsTyping(false);
    setShowHint(true);
  }, [isTyping, currentStep?.text]);

  if (!settings) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      onClick={skipTyping}
    >
      {/* Background video */}
      <video
        ref={videoRef}
        src={DEFAULT_BG_VIDEO}
        muted
        loop
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.55 }}
      />

      <GalacticStarfield accentHex={accent.hex} />
      <AmbientOrbs accentHex={accent.hex} />

      {/* Soft accent bloom */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 2,
          background: [
            `radial-gradient(ellipse 70% 45% at 50% 100%, ${accent.hex}0a 0%, transparent 55%)`,
            `radial-gradient(ellipse 50% 35% at 15% 20%, ${accent.hex}06 0%, transparent 45%)`,
          ].join(', '),
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 3,
          background: [
            'radial-gradient(ellipse 65% 55% at 50% 50%, transparent 8%, rgba(0,0,0,0.72) 100%)',
            'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 18%, transparent 80%, rgba(0,0,0,0.6) 100%)',
          ].join(', '),
        }}
      />

      <ParticleBurst trigger={burstTrigger} accentHex={accent.hex} originRef={actionAreaRef} />

      {/* ═══ CONTENT ═══ */}
      <div
        className="relative flex items-center justify-center min-h-screen px-5 py-10 lg:px-10"
        style={{ zIndex: 10 }}
      >
        <div
          className={`flex ${isMobile ? 'flex-col items-center gap-8' : 'flex-row items-end gap-10 lg:gap-14'} w-full max-w-6xl`}
        >
          {/* ── CHARACTER ── */}
          <motion.div
            className={`relative flex-shrink-0 ${isMobile ? 'w-56 h-72' : 'w-[380px] lg:w-[520px] h-[520px] lg:h-[600px]'}`}
            initial={{ opacity: 0, x: -60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="absolute inset-0 rounded-[40px] blur-[60px]"
              style={{
                backgroundColor: accent.hex,
                opacity: 0.12,
                transform: 'scale(0.75) translateY(40px)',
              }}
              animate={{ opacity: [0.08, 0.16, 0.08] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <AnimatePresence mode="wait">
              <motion.img
                key={currentStep?.expression || 'neutral'}
                src={EXPRESSIONS[currentStep?.expression || 'neutral']}
                alt="Faye"
                className="absolute inset-0 w-full h-full object-contain object-bottom"
                initial={{ opacity: 0, scale: 1.04, y: 120 }}
                animate={{ opacity: 1, scale: 1, y: 80 }}
                exit={{ opacity: 0, scale: 0.96, y: 120 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.7))' }}
              />
            </AnimatePresence>
          </motion.div>

          {/* ── DIALOGUE + ACTIONS ── */}
          <div className="flex-1 flex flex-col gap-4 w-full max-w-xl" ref={actionAreaRef}>

                        {/* Optional media preview */}
            <div className='-ml-5 flex flex-col gap-3 -mb-3'>
              <AnimatePresence>
              {(currentStep?.video || currentStep?.image) && !isTyping && (
                <StepMediaPreview step={currentStep} accentHex={accent.hex} />
              )}
            </AnimatePresence>

            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-1"
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                style={{
                  background: `${accent.hex}18`,
                  color: accent.hex,
                  border: `1px solid ${accent.hex}40`,
                }}
              >
                v{tour.version}
              </span>
              <span className="text-[11px] opacity-40">{tour.title}</span>
            </motion.div>
            </div>
            

            {/* Dialogue panel */}
            <motion.div
              className="relative rounded-[2em] mr-6 -ml-6 px-6 py-5 lg:px-8 lg:py-6"
              style={{
                background: 'rgba(8,8,14,0.55)',
                border: `1px solid ${accent.hex}28`,
                backdropFilter: 'blur(18px)',
                boxShadow: `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="absolute top-0 left-5 right-5 h-[1.5px] rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${accent.hex}aa, transparent)` }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
              />

              <p
                className="text-[13px] lg:text-[18.5px] font-medium leading-[1.35] tracking-[-0.01em]"
                style={{ color: 'rgba(245,242,235,0.95)', minHeight: '3.2em', fontFamily: 'Apple Garamond' }}
              >
                {displayedText}
                {isTyping && (
                  <motion.span
                    className="inline-block w-[2px] h-[1.05em] ml-1 align-middle rounded-full"
                    style={{ backgroundColor: accent.hex }}
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.45, repeat: Infinity }}
                  />
                )}
              </p>

              <AnimatePresence>
                {showHint && currentStep?.subtext && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-[13px] lg:text-[12px] italic leading-relaxed"
                    style={{ color: `${accent.hex}cc` }}
                  >
                    {currentStep.subtext}
                  </motion.p>
                )}
              </AnimatePresence>

              {isTyping && (
                <motion.p
                  className="absolute bottom-3.5 right-5 text-[9px] uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(255,255,255,0.18)' }}
                  animate={{ opacity: [0.15, 0.4, 0.15] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                >
                  click to skip
                </motion.p>
              )}
            </motion.div>



            {/* Action area */}
            <div className="min-h-[80px]">
              <AnimatePresence mode="wait">
                {(currentStep?.action === 'continue' || currentStep?.action === 'finish') && !isTyping && (
                  <motion.div
                    key="continue"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={{ duration: 0.28 }}
                    className="flex justify-end"
                  >
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); nextStep(); }}
                      className="group relative flex items-center gap-2.5 rounded-xl px-6 py-2.5 mr-6 text-[13px] font-semibold tracking-wide transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: accent.hex,
                        color: accent.on,
                        boxShadow: `0 4px 28px ${accent.hex}45, 0 0 0 1px ${accent.hex}30`,
                      }}
                      animate={isLastStep ? {
                        boxShadow: [
                          `0 4px 28px ${accent.hex}45, 0 0 0 1px ${accent.hex}30`,
                          `0 4px 48px ${accent.hex}90, 0 0 0 3px ${accent.hex}60`,
                          `0 4px 28px ${accent.hex}45, 0 0 0 1px ${accent.hex}30`,
                        ],
                      } : {}}
                      transition={isLastStep ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
                    >
                      {currentStep.btn || 'Continue'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1.5 mt-1">
              {SCRIPT.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-[3px] rounded-full"
                  style={{
                    width: i === stepIndex ? 22 : 5,
                    backgroundColor: i <= stepIndex ? accent.hex : 'rgba(255,255,255,0.1)',
                  }}
                  animate={{ scale: i === stepIndex ? 1 : 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              ))}
              <span className="ml-2.5 text-[9px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.18)' }}>
                {stepIndex + 1}/{SCRIPT.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ delay: exiting ? 0 : 2.8 }}
        onClick={(e) => { e.stopPropagation(); setExiting(true); setTimeout(() => onComplete?.(), 1200); }}
        className="fixed bottom-5 right-5 z-50 text-[10px] font-medium px-3.5 py-1.5 rounded-lg border transition-all duration-200 hover:bg-white/[0.04] hover:border-white/12"
        style={{
          color: 'rgba(255,255,255,0.22)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        Skip →
      </motion.button>

      {/* Exit transition */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: 200, background: 'black' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.4, 0, 1, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── small helper hook ────────────────────────────────────────────────────────
export function useUpdateTourCheck() {
  const shouldShow = () => {
    if (!UPDATES[CURRENT_VERSION]) return false;
    const lastSeen = localStorage.getItem('zyphor_last_seen_version');
    return lastSeen !== CURRENT_VERSION;
  };

  const markSeen = () => {
    localStorage.setItem('zyphor_last_seen_version', CURRENT_VERSION);
  };

  return { shouldShow, markSeen };
}
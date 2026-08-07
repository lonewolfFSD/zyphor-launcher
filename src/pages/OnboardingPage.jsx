import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

import DEFAULT_BG_VIDEO from '../pages/videos/test_video.mp4';
import VIDEO_GAMING             from './videos/gaming.mp4'
import VIDEO_DRAGON_TRAVELLER   from './videos/Xuanwu - Dragon Traveler.mp4'
import VIDEO_LUCY               from './videos/Lucy Cyberpunk.mp4'
import VIDEO_KALTSIT            from './videos/Kaltsit.mp4'
import VIDEO_ROSSI              from './videos/rossi.mp4'

import Sad from './images/faye/sad.png';
import Excited from './images/faye/excited.png';
import Happy from './images/faye/happy.png';
import Neutral from './images/faye/neutral.png';
import Proud from './images/faye/proud.png';
import Sleepy from './images/faye/sleepy.png';
import Waving from './images/faye/waving.png';
import Wink from './images/faye/wink.png';
import Curious from './images/faye/curious.png';

import first from './audio/first.mp3';
import second from './audio/second.mp3';
import third from './audio/third.mp3';
import fourth from './audio/fourth.mp3';
import fifth from './audio/fifth.mp3';
import sixth from './audio/sixth.mp3';
import seventh from './audio/seventh.mp3';
import eighth from './audio/eighth.mp3'; 
import nineth from './audio/nineth.mp3';
import tenth from './audio/tenth.mp3';
import evenventh from './audio/evenventh.mp3';
import oled from  './audio/oled.mp3';
import aww from './audio/aww.mp3';

// ═══════════════════════════════════════════════════════════════════════════════
//  ONBOARDING — Cinematic Galactic Experience
// ═══════════════════════════════════════════════════════════════════════════════

const EXPRESSIONS = {
  neutral:  Neutral,
  happy:    Happy,
  excited:  Excited,
  proud:    Proud,
  wink:     Wink,
  curious:  Curious,
  waving:   Waving,
  sleepy:   Sleepy,
  sad:      Sad,
};

const VOICE_LINES = {
  greeting: first,
  intro:    second,
  theme: third,
  react: fourth,
  accent: fifth,
  areact: sixth,
  bg: seventh,
  bgreact: eighth,
  nav: nineth,
  hotkeys: tenth,
  goodbye: evenventh,
  favt: oled,
  aww: aww
};

const SCRIPT = [
  {
    id: 'greeting',
    expression: 'excited',
    text: "Eeeeeee!! Hiiiii~!! Welcome to Zyphor Launcher! I'm Faye, and I'm sooo happy you're here!! 💖",
    subtext: "I may have practiced this greeting... like... 47 times. 🤭",
    action: 'continue',
    btn: "Hi, Faye~!",
  },
  {
    id: 'intro',
    expression: 'happy',
    text: "I'll help you get everything looking nice before you start! It won't take long, promiseee~!",
    subtext: "Besides... default settings are kinda... bleh. 😗",
    action: 'continue',
    btn: "Let's do it!",
  },
  {
    id: 'theme',
    expression: 'curious',
    text: "Let's start with a theme! Pick whichever one makes you smile the most~! ✨",
    subtext: "Mine? OLED Black... but shhh, I'm not supposed to have favorites. 🤫",
    action: 'pick-theme',
  },
  {
    id: 'react',
    expression: 'wink',
    text: "Ooooooo~!! That looks soooo much better already!! Great choice! 💖",
    subtext: "Hehe~ I knew you had good taste.",
    action: 'continue',
    btn: "Next!",
  },
  {
    id: 'accent',
    expression: 'happy',
    text: "Now let's add some colorrr~!! This is the fun part! 🌈",
    subtext: "Pretty colors make everything feel faster. I refuse to elaborate. 😌",
    action: 'pick-accent',
  },
  {
    id: 'areact',
    expression: 'excited',
    text: "EEEEEE!! I LOVE IT!! Your launcher is getting prettier and prettier!! ✨",
    subtext: "Okay okay... I'm trying not to get too excited. It's not working. 😭",
    action: 'continue',
    btn: "Backgrounds!",
  },
  {
    id: 'bg',
    expression: 'curious',
    text: "Time for the background~! Pick one that matches your vibe! 🎬",
    subtext: "Hover over them! Watching them is weirdly satisfying. Ehehe~",
    action: 'pick-background',
  },
  {
    id: 'bgreact',
    expression: 'proud',
    text: "Wooooow... that looks absolutely gorgeous!! I really like this one! 💕",
    subtext: "Can I secretly keep this setup? No? Aww...",
    action: 'continue',
    btn: "What's next?",
  },
  {
    id: 'nav',
    expression: 'happy',
    text: "Before you gooo~! Here's where everything is! Home, Friends, News, Achievements, Screenshots, and Settings! Easy peasy! ✨",
    subtext: "I still get lost sometimes... don't tell the developers. 🤫",
    action: 'continue',
    btn: "Got it!",
  },
  {
    id: 'hotkeys',
    expression: 'wink',
    text: "Oh! And keyboard shortcuts! Ctrl+1 to Ctrl+5 jumps between pages, and Ctrl+, opens Settings! Also there moree!!",
    subtext: "You'll look like a computer wizard using them. Hehe~ 🪄",
    action: 'continue',
    btn: "I'll remember!",
  },
  {
    id: 'goodbye',
    expression: 'waving',
    text: "Everything's ready! I hope you have lots and lots of fun with Zyphor Launcher! 💖",
    subtext: "If you ever see me again... it probably means you reinstalled the launcher. 😂 Byeee~!",
    action: 'finish',
    btn: "Launch! 🚀",
  },
];

const BG_PRESETS = [
  { id: 'default',               label: 'Default',          video: DEFAULT_BG_VIDEO },
  { id: 'preset-gaming',         label: 'Firefly Gaming',   video: VIDEO_GAMING },
  { id: 'preset-dragon-traveller', label: 'Dragon Traveller', video: VIDEO_DRAGON_TRAVELLER },
  { id: 'preset-lucy',           label: 'Lucy Cyberpunk',   video: VIDEO_LUCY },
  { id: 'preset-kaltsit',        label: 'Kaltsit',          video: VIDEO_KALTSIT },
  { id: 'preset-rossi',          label: 'Rossi',            video: VIDEO_ROSSI },
  { id: 'none',                  label: 'No Video',         color: '#0a0a0a' },
];

// Preferred values for Faye reactions
const FAYE_FAV_THEME  = 'oled';
const FAYE_FAV_ACCENT = ''; // change if your preferred accent key is different

// ═══════════════════════════════════════════════════════════════════════════════
//  THREE.JS STARFIELD
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
//  AMBIENT ORBS
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
//  PARTICLE BURST
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
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function OnboardingPage({ onComplete, profile }) {
  const { settings, update } = useSettings();
  const theme  = THEMES[settings?.theme]  || THEMES.oled;
  const accent = ACCENTS[settings?.accent] || ACCENTS.bulb;

  const videoRef      = useRef(null);
  const audioRef      = useRef(null);
  const typingRef     = useRef(null);
  const actionAreaRef = useRef(null);

  const [stepIndex, setStepIndex]           = useState(0);
  const [displayedText, setDisplayedText]   = useState('');
  const [isTyping, setIsTyping]             = useState(true);
  const [showHint, setShowHint]             = useState(false);
  const [selectedTheme, setSelectedTheme]   = useState(settings?.theme || 'oled');
  const [selectedAccent, setSelectedAccent] = useState(settings?.accent || 'bulb');
  const [selectedBg, setSelectedBg]         = useState(settings?.backgroundVideoType || 'default');
  const [burstTrigger, setBurstTrigger]     = useState(0);
  const [isMobile, setIsMobile]             = useState(false);

  const currentStep = SCRIPT[stepIndex];
  const isLastStep  = stepIndex === SCRIPT.length - 1;

  // ── Dynamic reaction dialogue ──────────────────────────────────────────────
  const activeDialogue = useMemo(() => {
    if (!currentStep) return null;

    // Theme reaction
    if (currentStep.id === 'theme-react') {
      if (selectedTheme === FAYE_FAV_THEME) {
        return {
          ...currentStep,
          id: 'favt',
          expression: 'excited',
          text: "AAAAAHHH!! OLED Black!! That's literally my favorite one!! You read my mind!! 💖💖",
          subtext: "Okay I'm not supposed to have favorites... but you just picked mine. I might cry. 😭✨",
        };
      }
      return currentStep;
    }

    // Accent reaction
    if (currentStep.id === 'accent-react') {
      if (selectedAccent === FAYE_FAV_ACCENT) {
        return {
          ...currentStep,
          expression: 'excited',
          text: "YES YES YES!! That accent is so perfect on you!! It matches the whole vibe so well!! ✨",
          subtext: "I was secretly hoping you'd pick that one... hehe. 🤭",
        };
      }
      return currentStep;
    }

    // Background reaction
    if (currentStep.id === 'bg-react') {
      if (selectedBg === 'none') {
        return {
          ...currentStep,
          expression: 'sad',
          id: 'aww',
          text: "Aww... no video? That's okay... I guess... 🥺",
          subtext: "The stars are still pretty though! ...right? 💔",
        };
      }
      return {
        ...currentStep,
        expression: 'proud',
        text: "Wooooow... that looks absolutely gorgeous!! I really like this one! 💕",
        subtext: "Can I secretly keep this setup? No? Aww...",
      };
    }

    return currentStep;
  }, [currentStep, selectedTheme, selectedAccent, selectedBg]);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Play background video
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // Typewriter (uses activeDialogue)
  useEffect(() => {
    if (!activeDialogue) return;
    setIsTyping(true);
    setDisplayedText('');
    setShowHint(false);

    const text = activeDialogue.text;
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
  }, [stepIndex, activeDialogue?.text]);

  // Voice
  useEffect(() => {
    if (!currentStep?.id || !VOICE_LINES[currentStep.id]) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioRef.current = new Audio(VOICE_LINES[currentStep.id]);
    audioRef.current.volume = 0.75;
    audioRef.current.play().catch(() => {});
    return () => audioRef.current?.pause();
  }, [stepIndex]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      return;
    }
    setStepIndex(p => p + 1);
  }, [isLastStep, onComplete]);

  const skipTyping = useCallback(() => {
    if (!isTyping || !typingRef.current) return;
    clearInterval(typingRef.current);
    setDisplayedText(activeDialogue?.text || '');
    setIsTyping(false);
    setShowHint(true);
  }, [isTyping, activeDialogue?.text]);

  const handleTheme = (key) => {
    setSelectedTheme(key);
    update({ theme: key });
    setBurstTrigger(t => t + 1);
    setTimeout(nextStep, 650);
  };

  const handleAccent = (key) => {
    setSelectedAccent(key);
    update({ accent: key });
    setBurstTrigger(t => t + 1);
    setTimeout(nextStep, 650);
  };

  const handleBg = (id) => {
    setSelectedBg(id);
    if (id === 'none') {
      update({ backgroundVideoType: 'none', backgroundVideoPath: null, backgroundVideoName: null });
    } else if (id === 'default') {
      update({ backgroundVideoType: 'default', backgroundVideoPath: null, backgroundVideoName: null });
    } else {
      const preset = BG_PRESETS.find(p => p.id === id);
      update({ backgroundVideoType: id, backgroundVideoPath: null, backgroundVideoName: preset?.label });
    }
    setBurstTrigger(t => t + 1);
    setTimeout(nextStep, 850);
  };

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

      {/* Galactic layers */}
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
                key={activeDialogue?.expression || 'neutral'}
                src={EXPRESSIONS[activeDialogue?.expression || 'neutral']}
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
                {showHint && activeDialogue?.subtext && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-[13px] lg:text-[12px] italic leading-relaxed"
                    style={{ color: `${accent.hex}cc` }}
                  >
                    {activeDialogue.subtext}
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
            <div className="min-h-[110px]">
              <AnimatePresence mode="wait">

                {/* Continue */}
                {currentStep?.action === 'continue' && !isTyping && (
                  <motion.div
                    key="continue"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={{ duration: 0.28 }}
                    className="flex justify-end"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); nextStep(); }}
                      className="group relative flex items-center gap-2.5 rounded-xl px-6 py-2.5 mr-6 text-[13px] font-semibold tracking-wide transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: accent.hex,
                        color: accent.on,
                        boxShadow: `0 4px 28px ${accent.hex}45, 0 0 0 1px ${accent.hex}30`,
                      }}
                    >
                      {currentStep.btn || 'Continue'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </motion.div>
                )}

                {/* Theme picker */}
                {currentStep?.action === 'pick-theme' && !isTyping && (
                  <motion.div
                    key="theme"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Choose your theme
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {Object.entries(THEMES).map(([key, t]) => (
                        <button
                          key={key}
                          onClick={() => handleTheme(key)}
                          className="group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                          style={{
                            borderColor: selectedTheme === key ? accent.hex : 'rgba(255,255,255,0.07)',
                            background: selectedTheme === key ? `${accent.hex}12` : 'rgba(255,255,255,0.025)',
                            boxShadow: selectedTheme === key ? `0 0 20px ${accent.hex}20` : 'none',
                          }}
                        >
                          <div
                            className="w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-transform duration-200 group-hover:scale-110"
                            style={{
                              backgroundColor: t.bg,
                              border: `1.5px solid ${t.border || 'rgba(255,255,255,0.12)'}`,
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                            }}
                          />
                          <span
                            className="text-[10px] lg:text-[11px] font-medium"
                            style={{ color: selectedTheme === key ? accent.hex : 'rgba(255,255,255,0.45)' }}
                          >
                            {t.label || key}
                          </span>
                          {selectedTheme === key && (
                            <motion.div
                              layoutId="theme-check"
                              className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: accent.hex, width: 18, height: 18 }}
                            >
                              <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke={accent.on} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Accent picker */}
                {currentStep?.action === 'pick-accent' && !isTyping && (
                  <motion.div
                    key="accent"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Pick an accent color
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {Object.entries(ACCENTS).map(([key, a]) => (
                        <button
                          key={key}
                          onClick={() => handleAccent(key)}
                          className="group relative w-11 h-11 lg:w-12 lg:h-12 rounded-xl border-2 transition-all duration-200 hover:scale-110 hover:rotate-2 active:scale-95"
                          style={{
                            backgroundColor: a.hex,
                            borderColor: selectedAccent === key ? '#fff' : 'transparent',
                            boxShadow: selectedAccent === key
                              ? `0 0 28px ${a.hex}70, 0 0 0 1px rgba(255,255,255,0.2)`
                              : `0 4px 16px ${a.hex}25`,
                          }}
                        >
                          {selectedAccent === key && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <svg width="18" height="18" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke={a.on} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Background picker — with real video previews */}
                {currentStep?.action === 'pick-background' && !isTyping && (
                  <motion.div
                    key="bg"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Choose your background
                    </p>
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide snap-x">
                      {BG_PRESETS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleBg(opt.id)}
                          className="group relative flex-shrink-0 w-28 lg:w-32 rounded-xl border overflow-hidden transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] snap-start"
                          style={{
                            borderColor: selectedBg === opt.id ? accent.hex : 'rgba(255,255,255,0.07)',
                            aspectRatio: '16/10',
                            boxShadow: selectedBg === opt.id ? `0 0 24px ${accent.hex}30` : 'none',
                          }}
                        >
                          {opt.video ? (
                            <video
                              src={opt.video}
                              muted
                              loop
                              playsInline
                              className="absolute inset-0 h-full w-full object-cover"
                              onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                              onMouseLeave={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                          ) : (
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: opt.color || '#0a0a0a' }}
                            />
                          )}

                          {/* Label overlay */}
                          <div className="absolute inset-0 flex items-end justify-center p-2 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                            <span className="text-[10px] lg:text-[11px] font-semibold text-center leading-tight text-white/90">
                              {opt.label}
                            </span>
                          </div>

                          {selectedBg === opt.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: accent.hex }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke={accent.on} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
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
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
        onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
        className="fixed bottom-5 right-5 z-50 text-[10px] font-medium px-3.5 py-1.5 rounded-lg border transition-all duration-200 hover:bg-white/[0.04] hover:border-white/12"
        style={{
          color: 'rgba(255,255,255,0.22)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        Skip intro →
      </motion.button>
    </div>
  );
}

export function useOnboardingCheck() {
  const { settings } = useSettings();

  const shouldShowOnboarding = () => {
    if (localStorage.getItem('zyphor_onboarding_complete') === 'true') return false;
    if (settings?.onboardingComplete) return false;
    return true;
  };

  const markOnboardingComplete = () => {
    localStorage.setItem('zyphor_onboarding_complete', 'true');
  };

  return { shouldShowOnboarding, markOnboardingComplete };
}
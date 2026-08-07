import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

import Logo             from '../Logo/icon.png';
import DEFAULT_BG_VIDEO from '../pages/videos/test_video.mp4';

import STARTUP_SOUND from '../pages/sounds/intro.mp3';

const SPLASH_MESSAGES = [
  'Initializing launcher',
  'Checking for updates',
  'Connecting to servers',
  'Syncing your library',
  'Almost ready',
];

export default function SplashScreen() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [msgIndex,   setMsgIndex]   = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0.5, 6);
    camera.lookAt(0, 0, 0);

    // ── helper: build a star layer ─────────────────────────────────────────
    function buildStars(count, spread, size, opacity, brightFraction = 0) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3 - 5;

        // most stars pure white, occasional warm/cold tint
        const r = Math.random();
        if (i < count * brightFraction) {
          // bright blue-white star
          col[i * 3]     = 0.85 + Math.random() * 0.15;
          col[i * 3 + 1] = 0.90 + Math.random() * 0.10;
          col[i * 3 + 2] = 1.0;
        } else if (r < 0.08) {
          // warm yellow-white
          col[i * 3]     = 1.0;
          col[i * 3 + 1] = 0.92 + Math.random() * 0.08;
          col[i * 3 + 2] = 0.75 + Math.random() * 0.15;
        } else {
          // plain white with slight variance
          const v = 0.82 + Math.random() * 0.18;
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size,
        transparent:  true,
        opacity,
        vertexColors: true,
        blending:     THREE.AdditiveBlending,
        depthWrite:   false,
        sizeAttenuation: true,
      });
      return new THREE.Points(geo, mat);
    }

    // ── scene objects ──────────────────────────────────────────────────────
    // Background dust — thousands of faint tiny stars
    const dustA = buildStars(2200, 80, 0.008, 0.55);
    const dustB = buildStars(800,  50, 0.014, 0.45);
    // Mid-ground stars
    const midStars = buildStars(400, 35, 0.026, 0.60, 0.05);
    // Foreground bright stars — few, large
    const brightStars = buildStars(60, 20, 0.055, 0.70, 1.0);

    scene.add(dustA, dustB, midStars, brightStars);

    // ── tick ───────────────────────────────────────────────────────────────
    let animId, t = 0;

    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.01;

      // very slow parallax rotation per layer — depth illusion
      dustA.rotation.y      =  t * 0.005;
      dustB.rotation.y      =  t * 0.009;
      midStars.rotation.y   =  t * 0.013;
      brightStars.rotation.y =  t * 0.018;

      dustA.rotation.x      =  t * 0.002;
      dustB.rotation.x      = -t * 0.003;

      // gentle camera float
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

  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % SPLASH_MESSAGES.length);
        setMsgVisible(true);
      }, 220);
    }, 1800);
    return () => clearInterval(id);
  }, []);

useEffect(() => {
  const audio = new Audio(STARTUP_SOUND);
  audio.volume = 0;

  const delay = setTimeout(() => {
    audio.play().catch(() => {});
    const fade = setInterval(() => {
      if (audio.volume < 0.55) audio.volume = Math.min(0.55, audio.volume + 0.05);
      else clearInterval(fade);
    }, 80);
  }, 1500); // ← delay in ms, change to whatever you want

  return () => {
    clearTimeout(delay);
    audio.pause();
    audio.currentTime = 0;
  };
}, []);

  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 1.0, ease: 'easeInOut' }}
    >
      {/* Video — sits under everything, screen blend */}
      <video
        ref={videoRef}
        src={DEFAULT_BG_VIDEO}
        muted loop playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.55 }}
      />

      {/* Stars canvas — screen blend so black = invisible */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1, mixBlendMode: 'screen' }}
      />

      {/* Vignette — dark edges, open centre */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 2,
          background: [
            'radial-gradient(ellipse 65% 60% at 50% 50%, transparent 5%, rgba(0,0,0,0.78) 100%)',
            'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 78%, rgba(0,0,0,0.65) 100%)',
          ].join(', '),
        }}
      />

      {/* UI */}
      <div className="relative flex flex-col items-center gap-8" style={{ zIndex: 10 }}>

        <motion.div
          initial={{ opacity: 0, scale: 0.65, y: 24 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-24 w-24 mt-28 items-center justify-center rounded-3xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.08)',
            boxShadow:  '0 0 50px rgba(150,180,255,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <img
            src={Logo} alt="Zyphor"
            className="h-full w-full object-contain"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-1 -mt-3 mb-24"
        >
          <p
            className="text-[40px] font-medium text-white"
            style={{ letterSpacing: '-0.01em', fontFamily: 'Apple Garamond' }}
          >
            Zyphor Launcher
          </p>
          <p
            className="text-[16px] uppercase tracking-[0.25em] -mt-1"
            style={{ fontFamily: 'Apple Garamond', color: 'rgba(255,255,255,0.22)' }}
          >
            v1.1.6
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative" style={{ width: 40, height: 40 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
              <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" fill="none" />
            </svg>
            <svg
              width="40" height="40" viewBox="0 0 40 40"
              className="absolute inset-0 animate-spin"
              style={{ animationDuration: '1.2s', animationTimingFunction: 'linear' }}
            >
              <circle
                cx="20" cy="20" r="16"
                stroke="white" strokeWidth="1.2" fill="none"
                strokeLinecap="round" strokeDasharray="22 80"
              />
            </svg>
          </div>

          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{
              color:      'rgba(255,255,255,0.25)',
              opacity:     msgVisible ? 1 : 0,
              transition: 'opacity 0.22s ease',
              minWidth:   '220px',
              textAlign:  'center',
            }}
          >
            {SPLASH_MESSAGES[msgIndex]}
          </p>
        </motion.div>

      </div>
    </motion.div>
  );
}
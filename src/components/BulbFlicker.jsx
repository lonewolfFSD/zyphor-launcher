import { useEffect, useRef } from 'react';

/**
 * A real incandescent flicker isn't a sine wave — it's mostly steady
 * with occasional irregular dips, like a loose filament. We drive that
 * by hand with randomized timeouts rather than a CSS keyframe loop, so
 * it never falls into an obviously-looping rhythm.
 */
export default function BulbFlicker({ className = '' }) {
  const glowRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !glowRef.current) return;

    let cancelled = false;
    let timeoutId = null;

    function schedule() {
      const el = glowRef.current;
      if (!el || cancelled) return;

      const isDip = Math.random() < 0.22;
      const targetOpacity = isDip ? 0.35 + Math.random() * 0.25 : 0.85 + Math.random() * 0.15;
      const transitionMs = isDip ? 60 + Math.random() * 90 : 220 + Math.random() * 260;

      el.style.transition = `opacity ${transitionMs}ms ease-out`;
      el.style.opacity = String(targetOpacity);

      const nextDelay = isDip ? 80 + Math.random() * 160 : 900 + Math.random() * 2200;
      timeoutId = setTimeout(schedule, nextDelay);
    }

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{
        background:
          'radial-gradient(circle, rgba(227,168,87,0.9) 0%, rgba(227,168,87,0.25) 45%, rgba(227,168,87,0) 70%)',
        opacity: 0.85,
      }}
    />
  );
}

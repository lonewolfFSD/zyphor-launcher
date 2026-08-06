// PageShell.jsx — wraps every page
import { useState, useEffect } from 'react';

export default function PageShell({ isActive, children, onReady }) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowContent(false);
      return;
    }

    // If already loaded before, show instantly
    if (hasLoaded) {
      setShowContent(true);
      onReady?.();
      return;
    }

    // First time: play skeleton, then reveal
    const timer = setTimeout(() => {
      setHasLoaded(true);
      setShowContent(true);
      onReady?.();
    }, 800); // match your skeleton duration

    return () => clearTimeout(timer);
  }, [isActive]);

  if (!isActive && !hasLoaded) return null; // never visited = don't mount yet

  return (
    <div
      className="h-full w-full"
      style={{
        display: isActive ? 'block' : 'none',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}
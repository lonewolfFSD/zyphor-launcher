import { useEffect, useRef } from 'react';

export default function RainBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let width = 0;
    let height = 0;
    let drops = [];

    const createDrop = () => ({
      x: Math.random() * width,
      y: Math.random() * -height,
      length: 16 + Math.random() * 32,
      speed: 7 + Math.random() * 13,
      drift: 0.5 + Math.random() * 1.1,
      opacity: 0.18 + Math.random() * 0.35,
      thickness: 1 + Math.random() * 1.4,
    });

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      const count = Math.floor((width * height) / 2200);
      drops = Array.from({ length: count }, createDrop);
    };

    const draw = () => {
      // Soft trail so the rain feels continuous without covering the UI
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgb(175, 200, 225)';
      ctx.lineCap = 'round';

      for (const drop of drops) {
        ctx.globalAlpha = drop.opacity;
        ctx.lineWidth = drop.thickness;

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - drop.drift * 2.6, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= drop.drift;

        if (drop.y > height + 40) {
          drop.y = -drop.length - Math.random() * 80;
          drop.x = Math.random() * width;
        }
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,          // behind everything
        pointerEvents: 'none',
        background: '#000000',
      }}
    />
  );
}
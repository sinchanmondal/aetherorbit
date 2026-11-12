'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkle: number;
  phase: number;
  tint: string;
}

const TINTS = ['235, 240, 255', '235, 240, 255', '235, 240, 255', '190, 210, 255', '255, 228, 205'];

/**
 * Fixed background starfield on a canvas. Very quiet by design: stars
 * shimmer slowly, nothing moves across the screen. Static when the user
 * prefers reduced motion, paused while the tab is hidden.
 */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const context = el?.getContext('2d');
    if (!el || !context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let frame = 0;
    let last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((width * height) / 5200);
      stars = Array.from({ length: count }, () => {
        const bright = Math.random() > 0.94;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: bright ? Math.random() * 1.1 + 0.9 : Math.random() * 0.8 + 0.2,
          alpha: bright ? Math.random() * 0.3 + 0.6 : Math.random() * 0.45 + 0.15,
          twinkle: Math.random() * 0.9 + 0.2,
          phase: Math.random() * Math.PI * 2,
          tint: TINTS[Math.floor(Math.random() * TINTS.length)] ?? TINTS[0]!,
        };
      });
      draw(performance.now());
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        const a = reduceMotion ? s.alpha : s.alpha * (0.7 + 0.3 * Math.sin(t * 0.0008 * s.twinkle + s.phase));
        ctx.fillStyle = `rgba(${s.tint}, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(t: number) {
      // ~30 fps is plenty for a slow shimmer
      if (t - last > 33) {
        draw(t);
        last = t;
      }
      frame = requestAnimationFrame(loop);
    }

    function onVisibility() {
      cancelAnimationFrame(frame);
      if (document.visibilityState === 'visible' && !reduceMotion) frame = requestAnimationFrame(loop);
    }

    resize();
    if (!reduceMotion) frame = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}

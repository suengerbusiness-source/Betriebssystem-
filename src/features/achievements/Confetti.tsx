import { useEffect, useRef } from "react";

/*
  Leichtgewichtiges Konfetti (Canvas, ohne Abhängigkeit). Läuft ~2,5 s und
  entfernt sich selbst. Rein dekorativ, blockiert keine Klicks.
*/
const COLORS = ["#7c6cff", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];

export function Confetti({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    ctx.scale(dpr, dpr);
    const w = window.innerWidth;

    const N = Math.min(160, Math.floor(w / 6));
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * window.innerHeight * 0.4,
      r: 4 + Math.random() * 5,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
    }));

    const start = performance.now();
    const DURATION = 2500;
    let raf = 0;

    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - t / DURATION);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      }
      if (t < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[100]" aria-hidden />;
}

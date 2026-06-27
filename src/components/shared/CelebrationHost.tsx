// ============================================================================
// CelebrationHost  -  the "big moment" overlay. When the empire crosses a real
// threshold (a milestone unlocked, an echelon climbed, a new era, a prestige),
// this paints a full-screen procedural confetti burst behind a centered title
// card that swells in, holds, and fades.
//
//   celebrate({ kind: 'milestone', icon: '🏦', title: 'The First Million',
//               subtitle: 'Prestige beckons.' })
//
// Confetti is canvas-rendered, fully procedural (no images): colored ribbons
// with gravity, drift, spin, and flutter, tinted from the empire palette. Big
// moments queue so two never collide. Honors reduce-motion by skipping the
// confetti entirely and showing only the (calm) title card.
//
// Same decoupled bus pattern as toast/fx  -  fire from anywhere.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { getPalette } from '../../utils/palette';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type CelebrationKind = 'milestone' | 'echelon' | 'era' | 'prestige';

export interface Celebration {
  id: number;
  kind: CelebrationKind;
  icon: string;
  title: string;
  subtitle?: string;
  /** Headline accent; defaults to the empire accent at render time. */
  color?: string;
}

type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function celebrate(c: Omit<Celebration, 'id'>): void {
  const item: Celebration = { ...c, id: nextId++ };
  listeners.forEach((l) => l(item));
}

const KIND_LABEL: Record<CelebrationKind, string> = {
  milestone: 'Milestone',
  echelon: 'Echelon Up',
  era: 'New Era',
  prestige: 'Rebirth',
};

const HOLD_MS = 3000;

// ---- Confetti controller (imperative, canvas) ------------------------------

interface Ribbon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  wobble: number;
}

function launchConfetti(canvas: HTMLCanvasElement, colors: string[]): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.scale(dpr, dpr);

  // Two emitters near the top so confetti rains across the whole column.
  const N = 150;
  const ribbons: Ribbon[] = Array.from({ length: N }, () => {
    const fromLeft = Math.random() < 0.5;
    const ox = fromLeft ? W * 0.2 : W * 0.8;
    return {
      x: ox + (Math.random() - 0.5) * W * 0.5,
      y: -20 - Math.random() * H * 0.3,
      vx: (Math.random() - 0.5) * 3.4,
      vy: 2 + Math.random() * 3.2,
      w: 5 + Math.random() * 6,
      h: 9 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
      wobble: Math.random() * Math.PI * 2,
    };
  });

  let raf = 0;
  let stopped = false;
  const start = performance.now();
  const GRAV = 0.06;

  const frame = (now: number) => {
    if (stopped) return;
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    // Fade the whole field out over the last 700ms.
    const fade = elapsed > HOLD_MS - 700 ? Math.max(0, (HOLD_MS - elapsed) / 700) : 1;
    ctx.globalAlpha = fade;

    for (const r of ribbons) {
      r.wobble += 0.1;
      r.vy += GRAV;
      r.x += r.vx + Math.sin(r.wobble) * 0.6;
      r.y += r.vy;
      r.rot += r.vr;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = r.color;
      // Flutter: scale width by the cosine of the wobble for a 3D ribbon feel.
      const sx = Math.cos(r.wobble) * 0.7 + 0.3;
      ctx.fillRect((-r.w / 2) * sx, -r.h / 2, r.w * sx, r.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (elapsed < HOLD_MS) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
  };
}

// ---- Host -------------------------------------------------------------------

export function CelebrationHost() {
  const { state } = useGame();
  const reduce = useReducedMotion();
  const accent = state.setup?.accent ?? '#6366f1';

  const [queue, setQueue] = useState<Celebration[]>([]);
  const [current, setCurrent] = useState<Celebration | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to the bus.
  useEffect(() => {
    const l: Listener = (c) => setQueue((q) => (q.length > 6 ? q : [...q, c]));
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // Pump the queue: show one celebration at a time.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    const t = window.setTimeout(() => setCurrent(null), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [queue, current]);

  // Fire confetti when a celebration becomes current.
  useEffect(() => {
    if (!current || reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pal = getPalette(current.color ?? accent);
    const colors = [pal.accent, pal.secondary, pal.glow, '#fbbf24', '#ffffff'];
    const stop = launchConfetti(canvas, colors);
    return stop;
  }, [current, reduce, accent]);

  if (!current) return null;

  const color = current.color ?? accent;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden">
      {!reduce && <canvas ref={canvasRef} className="absolute inset-0" />}

      {/* Title card */}
      <div className="celebr-card relative mx-6 flex flex-col items-center text-center">
        <div
          className="celebr-glow absolute -inset-10 rounded-full blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${color}55, transparent 70%)` }}
          aria-hidden
        />
        <div
          className="celebr-icon relative grid h-20 w-20 place-items-center rounded-3xl text-5xl"
          style={{
            background: 'rgba(14,20,32,0.86)',
            border: `1.5px solid ${color}`,
            boxShadow: `0 0 0 1px ${color}40, 0 16px 50px -12px ${color}aa`,
          }}
        >
          {current.icon}
        </div>
        <div
          className="relative mt-4 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color }}
        >
          {KIND_LABEL[current.kind]}
        </div>
        <div className="relative mt-1 text-2xl font-extrabold text-[#f2f5fb] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
          {current.title}
        </div>
        {current.subtitle && (
          <div className="relative mt-1.5 max-w-[300px] text-sm text-[#aab4c8]">
            {current.subtitle}
          </div>
        )}
      </div>

      <CelebrationStyles />
    </div>
  );
}

function CelebrationStyles() {
  return (
    <style>{`
      @keyframes celebr-card-kf {
        0%   { transform: scale(0.8); opacity: 0; }
        12%  { transform: scale(1.04); opacity: 1; }
        24%  { transform: scale(1); }
        82%  { transform: scale(1); opacity: 1; }
        100% { transform: scale(0.97); opacity: 0; }
      }
      .celebr-card { animation: celebr-card-kf ${HOLD_MS}ms cubic-bezier(.22,1,.36,1) both; }
      @keyframes celebr-icon-kf {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      .celebr-icon { animation: celebr-icon-kf 1.6s ease-in-out infinite; }
      @keyframes celebr-glow-kf { 0%,100% { opacity: .5; } 50% { opacity: .9; } }
      .celebr-glow { animation: celebr-glow-kf 1.8s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .celebr-icon, .celebr-glow { animation: none !important; }
      }
    `}</style>
  );
}

// ============================================================================
// FxLayer — the "juice" host. A single mounted overlay that listens to a tiny
// module-level event bus and paints transient feedback at screen coordinates:
//
//   fx.gain(x, y, '+$1.2K')        floating value that rises and fades
//   fx.burst(x, y, { color })      radial spark burst (e.g. on a purchase)
//   fx.ripple(x, y)                expanding tap ring
//
// Same architecture as the toast bus: fire from anywhere (components, handlers)
// without prop-drilling. Items auto-expire after their animation. The layer is
// pointer-transparent and fixed above the app. Honors reduce-motion by dropping
// bursts/ripples and showing only a brief static gain label.
//
// Coordinates are viewport pixels (clientX/clientY or a getBoundingClientRect
// center) — the layer is position:fixed so they map 1:1.
// ============================================================================

import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// ---- Event bus --------------------------------------------------------------

export interface GainFx {
  kind: 'gain';
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}
export interface BurstFx {
  kind: 'burst';
  id: number;
  x: number;
  y: number;
  color: string;
  count: number;
  /** Per-particle vectors, precomputed at emit time. */
  parts: { dx: number; dy: number; s: number }[];
}
export interface RippleFx {
  kind: 'ripple';
  id: number;
  x: number;
  y: number;
  color: string;
}
type FxItem = GainFx | BurstFx | RippleFx;

type Listener = (item: FxItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

function emit(item: FxItem) {
  listeners.forEach((l) => l(item));
}

export interface GainOptions {
  color?: string;
}
export interface BurstOptions {
  color?: string;
  count?: number;
}

export const fx = {
  /** Floating value (e.g. "+$1.2K") that rises from (x, y). */
  gain(x: number, y: number, text: string, opts: GainOptions = {}) {
    emit({ kind: 'gain', id: nextId++, x, y, text, color: opts.color ?? 'var(--accent)' });
  },
  /** Radial spark burst centered at (x, y). */
  burst(x: number, y: number, opts: BurstOptions = {}) {
    const count = Math.max(4, Math.min(18, opts.count ?? 10));
    const parts = Array.from({ length: count }, (_, i) => {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 26 + Math.random() * 30;
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist,
        s: 0.6 + Math.random() * 0.8,
      };
    });
    emit({ kind: 'burst', id: nextId++, x, y, color: opts.color ?? 'var(--accent)', count, parts });
  },
  /** Expanding tap ring at (x, y). */
  ripple(x: number, y: number, color = 'var(--accent)') {
    emit({ kind: 'ripple', id: nextId++, x, y, color });
  },
  /** Convenience: emit gain + burst from a DOM element's center. */
  fromElement(el: Element | null, text: string, opts: GainOptions = {}) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    fx.burst(x, y, { color: opts.color });
    fx.gain(x, y - 6, text, opts);
  },
};

// ---- Host -------------------------------------------------------------------

const LIFETIMES: Record<FxItem['kind'], number> = {
  gain: 1000,
  burst: 700,
  ripple: 560,
};

export function FxLayer() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<FxItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      // In reduce-motion mode, suppress kinetic effects; keep gain labels only.
      if (reduce && item.kind !== 'gain') return;
      setItems((prev) => {
        // Cap total live FX so a rapid-buy spree can't flood the DOM.
        const next = prev.length > 28 ? prev.slice(prev.length - 28) : prev;
        return [...next, item];
      });
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, LIFETIMES[item.kind]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [reduce]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <FxStyles />
      {items.map((item) => {
        if (item.kind === 'gain') {
          return (
            <span
              key={item.id}
              className={reduce ? 'fx-gain-static' : 'fx-gain'}
              style={{
                left: item.x,
                top: item.y,
                color: item.color,
              }}
            >
              {item.text}
            </span>
          );
        }
        if (item.kind === 'ripple') {
          return (
            <span
              key={item.id}
              className="fx-ripple"
              style={{ left: item.x, top: item.y, borderColor: item.color }}
            />
          );
        }
        // burst
        return (
          <span key={item.id} className="fx-burst-anchor" style={{ left: item.x, top: item.y }}>
            {item.parts.map((p, i) => (
              <span
                key={i}
                className="fx-spark"
                style={
                  {
                    background: item.color,
                    ['--dx' as string]: `${p.dx}px`,
                    ['--dy' as string]: `${p.dy}px`,
                    ['--s' as string]: p.s,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

// ---- Styles (declared once) -------------------------------------------------

function FxStyles() {
  return (
    <style>{`
      .fx-gain, .fx-gain-static {
        position: absolute;
        transform: translate(-50%, -50%);
        font: 700 14px ui-monospace, SFMono-Regular, Menlo, monospace;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 1px 6px rgba(0,0,0,0.65);
        white-space: nowrap;
        will-change: transform, opacity;
      }
      @keyframes fx-gain-kf {
        0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
        18%  { transform: translate(-50%, -64%) scale(1.06); opacity: 1; }
        100% { transform: translate(-50%, -160%) scale(1); opacity: 0; }
      }
      .fx-gain { animation: fx-gain-kf 1s cubic-bezier(.22,1,.36,1) forwards; }
      @keyframes fx-gain-static-kf { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
      .fx-gain-static { animation: fx-gain-static-kf 1s ease forwards; }

      .fx-burst-anchor { position: absolute; width: 0; height: 0; }
      .fx-spark {
        position: absolute;
        left: 0; top: 0;
        width: 6px; height: 6px;
        border-radius: 9999px;
        transform: translate(-50%, -50%);
        will-change: transform, opacity;
        animation: fx-spark-kf 700ms cubic-bezier(.2,.8,.3,1) forwards;
        box-shadow: 0 0 8px -1px currentColor;
      }
      @keyframes fx-spark-kf {
        0%   { transform: translate(-50%, -50%) scale(var(--s)); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0); opacity: 0; }
      }

      .fx-ripple {
        position: absolute;
        width: 14px; height: 14px;
        border-radius: 9999px;
        border: 2px solid;
        transform: translate(-50%, -50%) scale(0.4);
        opacity: 0.7;
        will-change: transform, opacity;
        animation: fx-ripple-kf 560ms ease-out forwards;
      }
      @keyframes fx-ripple-kf {
        0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.7; }
        100% { transform: translate(-50%, -50%) scale(3.6); opacity: 0; }
      }
    `}</style>
  );
}

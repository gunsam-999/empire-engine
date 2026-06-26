// AnimatedCounter — smoothly counts the displayed number toward `value`.
//
// Designed for idle games where the underlying value changes every game tick
// (~100ms). A single persistent requestAnimationFrame loop eases the displayed
// value toward the latest target with exponential smoothing, so the number
// rises smoothly and monotonically instead of restarting a tween (and flashing)
// on every tick — which read as nonstop flicker. We only re-render when the
// *formatted* text actually changes, keeping it cheap and jitter-free.

import { useEffect, useRef, useState } from 'react';
import { formatValue, type NumberFormatterProps } from './NumberFormatter';

export interface AnimatedCounterProps {
  value: number;
  /** Smoothing window in ms (~time to converge on a new target). Defaults to 450. */
  durationMs?: number;
  mode?: NumberFormatterProps['mode'];
  symbol?: string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** @deprecated No-op. Flashing on every change caused continuous flicker. */
  flash?: boolean;
  className?: string;
}

export default function AnimatedCounter({
  value,
  durationMs = 450,
  mode = 'number',
  symbol = '$',
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}: AnimatedCounterProps) {
  const targetRef = useRef(value);
  const displayRef = useRef(value);
  const lastTextRef = useRef<string>('');
  const [, forceRender] = useState(0);

  // Always track the latest target without restarting any animation.
  targetRef.current = value;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const fmt = (n: number) =>
      `${prefix}${formatValue(n, mode, symbol, decimals)}${suffix}`;
    lastTextRef.current = fmt(displayRef.current);
    const tau = Math.max(60, durationMs) / 3;

    const loop = (now: number) => {
      const dt = Math.min(120, now - last);
      last = now;
      const target = targetRef.current;
      const cur = displayRef.current;

      if (!Number.isFinite(target)) {
        displayRef.current = target;
      } else {
        const diff = target - cur;
        const eps = Math.max(0.5, Math.abs(target) * 1e-6);
        if (Math.abs(diff) <= eps) {
          displayRef.current = target; // settle exactly
        } else {
          const k = 1 - Math.exp(-dt / tau);
          displayRef.current = cur + diff * k;
        }
      }

      const text = fmt(displayRef.current);
      if (text !== lastTextRef.current) {
        lastTextRef.current = text;
        forceRender((x) => (x + 1) & 0xffff);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, mode, symbol, decimals, prefix, suffix]);

  return (
    <span className={`font-mono tabular-nums inline-block ${className}`}>
      {prefix}
      {formatValue(displayRef.current, mode, symbol, decimals)}
      {suffix}
    </span>
  );
}

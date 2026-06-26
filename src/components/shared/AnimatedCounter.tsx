// AnimatedCounter — smoothly counts the displayed number toward `value`.
//
// Idle values change every game tick (~100ms). A single persistent rAF loop
// eases the displayed value toward the latest target with exponential smoothing,
// so numbers rise smoothly and monotonically — no per-tick tween restart / flash
// (which read as flicker). The displayed text lives in STATE (set from the loop),
// and the target is tracked by a dedicated effect on `value`, so a counter that
// starts at 0 and grows (e.g. Reach) animates up reliably. React bails out of the
// re-render whenever the formatted text is unchanged, keeping it cheap.

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
  const [text, setText] = useState(
    () => `${prefix}${formatValue(value, mode, symbol, decimals)}${suffix}`
  );

  // Reliably track the latest target whenever the prop changes (independent of
  // the animation re-render), so growth from 0 is always picked up.
  useEffect(() => {
    if (Number.isFinite(value)) targetRef.current = value;
  }, [value]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tau = Math.max(60, durationMs) / 3;
    const fmt = (n: number) =>
      `${prefix}${formatValue(n, mode, symbol, decimals)}${suffix}`;

    const loop = (now: number) => {
      const dt = Math.min(120, now - last);
      last = now;
      const target = targetRef.current;
      const cur = displayRef.current;

      let next: number;
      if (!Number.isFinite(target)) {
        next = 0;
      } else {
        const diff = target - cur;
        const eps = Math.max(0.5, Math.abs(target) * 1e-6);
        next = Math.abs(diff) <= eps ? target : cur + diff * (1 - Math.exp(-dt / tau));
      }
      displayRef.current = next;
      setText(fmt(next)); // React bails out when the string is unchanged
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, mode, symbol, decimals, prefix, suffix]);

  return <span className={`font-mono tabular-nums inline-block ${className}`}>{text}</span>;
}

// AnimatedCounter — count-up tween over ~300ms when `value` changes.
// Pure requestAnimationFrame, no external libs. Monospace tabular-nums.

import { useEffect, useRef, useState } from 'react';
import { formatValue, type NumberFormatterProps } from './NumberFormatter';

export interface AnimatedCounterProps {
  value: number;
  /** Tween duration in ms. Defaults to 300. */
  durationMs?: number;
  mode?: NumberFormatterProps['mode'];
  symbol?: string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** Flash the accent color when the value changes. */
  flash?: boolean;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function AnimatedCounter({
  value,
  durationMs = 300,
  mode = 'number',
  symbol = '$',
  decimals = 0,
  suffix = '',
  prefix = '',
  flash = false,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const flashRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;

    // Skip the tween for non-finite or unchanged values.
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    if (flash && flashRef.current) {
      const el = flashRef.current;
      el.classList.remove('animate-count-flash');
      // Force reflow so the animation restarts on rapid changes.
      void el.offsetWidth;
      el.classList.add('animate-count-flash');
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span ref={flashRef} className={`font-mono tabular-nums inline-block ${className}`}>
      {prefix}
      {formatValue(display, mode, symbol, decimals)}
      {suffix}
    </span>
  );
}

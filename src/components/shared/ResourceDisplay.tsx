// ResourceDisplay  -  icon + formatted value, with optional per-second rate.
// Used for cash, insight, influence, resource counters in the HUD and panels.

import type { ReactNode } from 'react';
import AnimatedCounter from './AnimatedCounter';
import { formatValue } from './NumberFormatter';

export interface ResourceDisplayProps {
  /** Emoji or node rendered before the value. */
  icon: ReactNode;
  value: number;
  /** Optional per-second rate shown beneath/after the value. */
  perSec?: number;
  /** Formatting mode for the main value. Defaults to 'number'. */
  mode?: 'number' | 'money' | 'percent';
  /** Currency/resource symbol when mode='money'. */
  symbol?: string;
  /** Small caption above the value (e.g. "CASH"). */
  label?: string;
  /** Animate the main value when it changes. Defaults to true. */
  animate?: boolean;
  /** Layout: 'row' (icon left of value) or 'stacked'. Defaults to 'row'. */
  layout?: 'row' | 'stacked';
  /** Tint the value with the accent color. */
  accent?: boolean;
  className?: string;
}

export default function ResourceDisplay({
  icon,
  value,
  perSec,
  mode = 'number',
  symbol = '$',
  label,
  animate = true,
  layout = 'row',
  accent = false,
  className = '',
}: ResourceDisplayProps) {
  const valueCls = `text-base font-semibold ${accent ? 'text-[var(--accent)]' : 'text-[#e7ecf5]'}`;

  const valueNode = animate ? (
    <AnimatedCounter value={value} mode={mode} symbol={symbol} className={valueCls} />
  ) : (
    <span className={`font-mono tabular-nums ${valueCls}`}>{formatValue(value, mode, symbol)}</span>
  );

  const rateNode =
    perSec !== undefined ? (
      <span
        className={`font-mono tabular-nums text-xs ${
          perSec >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'
        }`}
      >
        {perSec >= 0 ? '+' : ''}
        {formatValue(perSec, mode, symbol)}/s
      </span>
    ) : null;

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col ${className}`}>
        {label && (
          <span className="text-[10px] uppercase tracking-wide text-[#8a94a8]">{label}</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none">{icon}</span>
          {valueNode}
        </div>
        {rateNode}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-lg leading-none">{icon}</span>
      <div className="flex flex-col leading-tight">
        {label && (
          <span className="text-[10px] uppercase tracking-wide text-[#8a94a8]">{label}</span>
        )}
        <div className="flex items-baseline gap-1.5">
          {valueNode}
          {rateNode}
        </div>
      </div>
    </div>
  );
}

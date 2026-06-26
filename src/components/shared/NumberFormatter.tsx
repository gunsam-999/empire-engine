// NumberFormatter — thin display wrapper over bigNumber formatters.
// Renders a formatted number/money/percent in a monospace tabular span.

import { formatMoney, formatNumber, formatPct } from '../../utils/bigNumber';

export interface NumberFormatterProps {
  value: number;
  /** Display mode. Defaults to 'number'. */
  mode?: 'number' | 'money' | 'percent';
  /** Currency/resource symbol when mode='money'. */
  symbol?: string;
  /** Decimal places when mode='percent'. */
  decimals?: number;
  /** Text appended after the number, e.g. "/s". */
  suffix?: string;
  /** Text rendered before the number (not part of the mono value). */
  prefix?: string;
  className?: string;
}

export function formatValue(
  value: number,
  mode: NumberFormatterProps['mode'] = 'number',
  symbol = '$',
  decimals = 0
): string {
  switch (mode) {
    case 'money':
      return formatMoney(value, symbol);
    case 'percent':
      return formatPct(value, decimals);
    default:
      return formatNumber(value);
  }
}

export default function NumberFormatter({
  value,
  mode = 'number',
  symbol = '$',
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}: NumberFormatterProps) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {formatValue(value, mode, symbol, decimals)}
      {suffix}
    </span>
  );
}

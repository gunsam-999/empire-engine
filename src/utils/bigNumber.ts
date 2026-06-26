// Big-number formatting for an idle game. Safe against NaN/Infinity/negatives.

const SHORT_SUFFIX = ['', 'K', 'M', 'B', 't'];

/** Letter suffix for very large numbers: index 0 -> "aa", 1 -> "ab", ... */
function letters(i: number): string {
  const idx = Math.max(0, Math.floor(i));
  const first = String.fromCharCode(97 + Math.floor(idx / 26));
  const second = String.fromCharCode(97 + (idx % 26));
  return first + second;
}

export function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1000) {
    if (Number.isInteger(abs)) return sign + abs.toString();
    return sign + abs.toFixed(1);
  }

  // 1e3 .. <1e15 -> K/M/B/t with 2 decimals
  if (abs < 1e15) {
    const tier = Math.floor(Math.log10(abs) / 3);
    const clamped = Math.min(tier, SHORT_SUFFIX.length - 1);
    const scaled = abs / Math.pow(10, clamped * 3);
    return sign + scaled.toFixed(2) + SHORT_SUFFIX[clamped];
  }

  // >=1e15 -> letter suffix
  const index = Math.floor((Math.log10(abs) - 15) / 3);
  const mantissa = abs / Math.pow(10, 15 + 3 * index);
  return sign + mantissa.toFixed(2) + letters(index);
}

export function formatMoney(n: number, symbol = '$'): string {
  if (Number.isNaN(n) || n === null || n === undefined) return symbol + '0';
  const sign = n < 0 ? '-' : '';
  return sign + symbol + formatNumber(Math.abs(n));
}

export function formatPct(n: number, decimals = 0): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return '0%';
  return (n * 100).toFixed(decimals) + '%';
}

/** Compact form used for rates like "/s". */
export function formatRate(n: number, symbol = '$', unit = '/s'): string {
  return formatMoney(n, symbol) + unit;
}

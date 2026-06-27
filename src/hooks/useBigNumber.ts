// useBigNumber  -  memoized number/money/pct formatters.

import { useCallback } from 'react';
import { formatMoney, formatNumber, formatPct, formatRate } from '../utils/bigNumber';

export function useBigNumber() {
  const num = useCallback((n: number) => formatNumber(n), []);
  const money = useCallback((n: number, symbol = '$') => formatMoney(n, symbol), []);
  const pct = useCallback((n: number, decimals = 0) => formatPct(n, decimals), []);
  const rate = useCallback(
    (n: number, symbol = '$', unit = '/s') => formatRate(n, symbol, unit),
    []
  );
  return { num, money, pct, rate };
}

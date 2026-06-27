// ============================================================================
// MarketScreen  -  live commodity price, sparkline, stockpile toggle, and the
// buy-low / sell-high loop. Resource piles up while stockpiling; SELL dumps it
// at the current price. Boom / crash states surface so the player can time it.
// ============================================================================

import { useEffect, useState } from 'react';

import {
  useGame,
  getIndustry,
  marketPrice,
  resourceProdPerSec,
  incomePerSec,
} from '../../game/GameContext';
import { formatMoney, formatNumber, formatPct } from '../../utils/bigNumber';
import Card from '../shared/Card';

// ---- Sparkline --------------------------------------------------------------

function Sparkline({
  history,
  accent,
  trend,
}: {
  history: number[];
  accent: string;
  trend: number;
}) {
  const W = 320;
  const H = 96;
  const PAD = 6;

  // Always render a stable domain band (price clamps 0.4..2.0) so the line
  // doesn't jump scale every tick; small live window keeps it lively.
  const pts = history.length > 1 ? history : [1, 1];
  const min = 0.4;
  const max = 2.0;
  const span = max - min;

  const stepX = (W - PAD * 2) / Math.max(1, pts.length - 1);
  const y = (v: number) => {
    const clamped = Math.min(max, Math.max(min, v));
    return H - PAD - ((clamped - min) / span) * (H - PAD * 2);
  };

  const coords = pts.map((v, i) => [PAD + i * stepX, y(v)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ');
  const area =
    `M${coords[0][0].toFixed(1)},${(H - PAD).toFixed(1)} ` +
    coords.map(([x, yy]) => `L${x.toFixed(1)},${yy.toFixed(1)}`).join(' ') +
    ` L${coords[coords.length - 1][0].toFixed(1)},${(H - PAD).toFixed(1)} Z`;

  const lineColor = trend >= 0 ? accent : '#f87171';
  const baseY = y(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline at price = 1.0 (par) */}
      <line
        x1={PAD}
        x2={W - PAD}
        y1={baseY}
        y2={baseY}
        stroke="#232c3e"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* live dot */}
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r={3.5}
        fill={lineColor}
      />
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r={6}
        fill={lineColor}
        opacity={0.25}
        className="animate-ping"
      />
    </svg>
  );
}

// ---- Screen -----------------------------------------------------------------

export default function MarketScreen() {
  const { state, dispatch } = useGame();

  // Re-render on a light interval so the live numbers feel alive between ticks.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  const industry = getIndustry(state);
  const price = marketPrice(state);
  const trend = state.market.trend ?? 0;
  const accent = state.setup?.accent ?? '#6366f1';

  const resource = state.resource ?? 0;
  const stockpiling = state.market.stockpiling;
  const resPerSec = resourceProdPerSec(state);
  const income = incomePerSec(state);

  const resName = industry?.resource ?? 'Resource';
  const resShort = industry?.resourceShort ?? 'units';
  const currency = industry?.currency ?? '$';

  // Price relative to par (1.0) -> percent above/below.
  const offPar = price - 1;
  const sellValue = resource * price;

  // Boom / crash banding off the live price.
  let band: { label: string; tone: string; icon: string; hint: string };
  if (price >= 1.6) {
    band = {
      label: 'BOOM',
      tone: '#34d399',
      icon: '🚀',
      hint: 'Prices are spiking  -  dump your stockpile NOW.',
    };
  } else if (price >= 1.2) {
    band = { label: 'High', tone: '#34d399', icon: '📈', hint: 'Above par  -  a good time to sell.' };
  } else if (price <= 0.55) {
    band = {
      label: 'CRASH',
      tone: '#f87171',
      icon: '🪂',
      hint: 'Market crashed  -  hold the line, stockpile instead.',
    };
  } else if (price <= 0.85) {
    band = { label: 'Low', tone: '#f87171', icon: '📉', hint: 'Below par  -  stockpile and wait it out.' };
  } else {
    band = { label: 'Stable', tone: '#8a94a8', icon: '⚖️', hint: 'Trading near par. Watch for a swing.' };
  }

  const canSell = resource > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#e7ecf5]">Commodities Market</h1>
          <p className="text-xs text-[#8a94a8]">
            {resName} · trade {resShort} for {currency}
          </p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
          style={{ color: band.tone, background: `color-mix(in srgb, ${band.tone} 16%, transparent)` }}
        >
          {band.icon} {band.label}
        </span>
      </div>

      {/* Live price + sparkline */}
      <Card pad="md">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8a94a8]">Live Price</p>
            <p className="text-3xl font-mono font-bold tabular-nums text-[#e7ecf5] leading-none mt-1">
              {price.toFixed(3)}
              <span className="text-base text-[#8a94a8]">×</span>
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-sm font-mono font-semibold tabular-nums"
              style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}
            >
              {trend >= 0 ? '▲' : '▼'} {formatPct(Math.abs(trend), 1)}
            </p>
            <p
              className="text-[11px] font-mono tabular-nums mt-0.5"
              style={{ color: offPar >= 0 ? '#34d399' : '#f87171' }}
            >
              {offPar >= 0 ? '+' : ''}
              {formatPct(offPar, 0)} vs par
            </p>
          </div>
        </div>
        <Sparkline history={state.market.history ?? [1]} accent={accent} trend={trend} />
        <p className="text-[11px] text-[#8a94a8] mt-1 leading-snug">{band.hint}</p>
      </Card>

      {/* Stockpile / flow control */}
      <Card pad="md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#e7ecf5]">Production Routing</p>
            <p className="text-[11px] text-[#8a94a8]">
              {stockpiling
                ? 'Banking output as raw stock  -  no cash flowing in.'
                : 'Auto-selling output at the live price.'}
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_STOCKPILE' })}
            className={`relative h-8 w-14 rounded-full transition-colors active:scale-95 ${
              stockpiling ? '' : 'bg-[#232c3e]'
            }`}
            style={stockpiling ? { background: accent } : undefined}
            aria-pressed={stockpiling}
            aria-label="Toggle stockpiling"
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                stockpiling ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Output</p>
            <p className="text-sm font-mono font-semibold tabular-nums text-[#e7ecf5]">
              {formatNumber(resPerSec)}
              <span className="text-[#8a94a8] text-xs"> {resShort}/s</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a94a8]">
              {stockpiling ? 'Income (paused)' : 'Income'}
            </p>
            <p
              className="text-sm font-mono font-semibold tabular-nums"
              style={{ color: stockpiling ? '#8a94a8' : '#34d399' }}
            >
              {formatMoney(stockpiling ? 0 : income, currency)}
              <span className="text-[#8a94a8] text-xs">/s</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Stockpile + sell */}
      <Card pad="md" active={canSell}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[#e7ecf5]">Stockpile</p>
          {stockpiling && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)` }}
            >
              filling +{formatNumber(resPerSec)}/s
            </span>
          )}
        </div>
        <p className="text-2xl font-mono font-bold tabular-nums text-[#e7ecf5]">
          {formatNumber(resource)}
          <span className="text-sm text-[#8a94a8]"> {resShort}</span>
        </p>
        <div className="flex items-center justify-between mt-1 mb-3">
          <span className="text-[11px] text-[#8a94a8]">Sells for</span>
          <span
            className="text-sm font-mono font-semibold tabular-nums"
            style={{ color: canSell ? '#34d399' : '#8a94a8' }}
          >
            {formatMoney(sellValue, currency)}
            <span className="text-[11px] text-[#8a94a8]"> @ {price.toFixed(2)}×</span>
          </span>
        </div>

        <button
          disabled={!canSell}
          onClick={() => dispatch({ type: 'SELL_RESOURCE' })}
          className="w-full rounded-xl font-semibold py-2.5 text-[#070b12] active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
          style={{ background: canSell ? accent : '#232c3e', color: canSell ? '#070b12' : '#8a94a8' }}
        >
          {canSell ? `Sell all → ${formatMoney(sellValue, currency)}` : 'Nothing to sell'}
        </button>

        <p className="text-[11px] text-[#8a94a8] mt-2 leading-snug">
          💡 Buy low, sell high: flip on <span className="text-[#e7ecf5]">Stockpiling</span> while
          the price is below par, then sell the pile during a boom for far more {currency} than
          auto-selling each tick.
        </p>
      </Card>
    </div>
  );
}

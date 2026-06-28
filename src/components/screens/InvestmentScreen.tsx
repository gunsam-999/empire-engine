import { useEffect, useState, useCallback } from 'react';
import { useFirstVisit } from '../../hooks/useFirstVisit';

import {
  useGame,
  getIndustry,
  marketPrice,
  resourceProdPerSec,
  incomePerSec,
} from '../../game/GameContext';
import { formatMoney, formatNumber, formatPct } from '../../utils/bigNumber';
import CharacterPortrait from '../shared/CharacterPortrait';
import { WizModal } from '../shared/WizModal';
import Card from '../shared/Card';
import { sfx } from '../../systems/AudioEngine';

import { PORTFOLIOS, WIZ_CHARACTER, getPortfolio } from '../../data/investments';
import {
  getCurrentPrice,
  getHolding,
  getPortfolioValue,
  getPortfolioReturn,
} from '../../systems/InvestmentEngine';
import type { InvestmentState } from '../../game/types';

// ---- Mini sparkline ---------------------------------------------------------

function MiniSparkline({
  history,
  color,
}: {
  history: number[];
  color: string;
}) {
  const pts = history.length >= 2 ? history : [1, 1, 1];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(max - min, 0.001);
  const W = 64;
  const H = 24;
  const coords = pts.map((v, i) => [
    (i / (pts.length - 1)) * W,
    H - ((v - min) / span) * H,
  ] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const isUp = pts[pts.length - 1] >= pts[0];
  const strokeColor = isUp ? '#4ade80' : '#f87171';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <path d={line} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Risk chip --------------------------------------------------------------

function RiskChip({ risk, label }: { risk: string; label: string }) {
  const cls: Record<string, string> = {
    safe: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    risky: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    degen: 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full border uppercase ${cls[risk] ?? cls.moderate}`}>
      {label}
    </span>
  );
}

// ---- Category badge ---------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    stocks: { label: 'Stocks', cls: 'bg-green-500/15 text-green-400' },
    crypto: { label: 'Crypto', cls: 'bg-amber-500/15 text-amber-400' },
    realestate: { label: 'Real Estate', cls: 'bg-violet-500/15 text-violet-400' },
    startups: { label: 'Startups', cls: 'bg-pink-500/15 text-pink-400' },
    bonds: { label: 'Bonds', cls: 'bg-slate-500/15 text-slate-400' },
    vc: { label: 'VC', cls: 'bg-rose-500/15 text-rose-400' },
    hedge: { label: 'Hedge', cls: 'bg-indigo-500/15 text-indigo-400' },
    empire: { label: 'Empire', cls: 'bg-yellow-500/15 text-yellow-400' },
  };
  const { label, cls } = map[category] ?? { label: category, cls: 'bg-white/10 text-white' };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ---- Buy modal --------------------------------------------------------------

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000];

function BuyModal({
  portfolioId,
  cash,
  inv,
  onClose,
}: {
  portfolioId: string;
  cash: number;
  inv: InvestmentState;
  onClose: () => void;
}) {
  const { dispatch } = useGame();
  const def = getPortfolio(portfolioId)!;
  const currentPrice = getCurrentPrice(inv, portfolioId);

  const affordable = QUICK_AMOUNTS.filter((a) => a <= cash && a >= def.minBuy);
  const [amount, setAmount] = useState(affordable.length > 0 ? affordable[affordable.length - 1] : def.minBuy);

  const canBuy = amount >= def.minBuy && amount <= cash;
  const unitsPreview = canBuy ? amount / currentPrice : 0;

  const handleBuy = useCallback(() => {
    if (!canBuy) return;
    sfx.play('buy');
    dispatch({ type: 'INV_BUY', portfolioId, amount, priceBonus: 1.0 });
    onClose();
  }, [dispatch, portfolioId, amount, canBuy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-auto rounded-t-3xl border-t-2 border-x-2 bg-gray-950 overflow-hidden"
        style={{ borderColor: def.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{def.emoji}</span>
            <div>
              <p className="font-bold text-white">{def.name}</p>
              <p className="text-xs text-gray-400">{def.tagline}</p>
            </div>
          </div>

          {/* Price + immediate action */}
          <div className="rounded-2xl overflow-hidden mb-3" style={{ border: `1px solid ${def.color}30` }}>
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/5">
              <span className="text-xs text-gray-400">Current price</span>
              <span className="font-mono font-bold text-white text-sm">{currentPrice.toFixed(4)}</span>
            </div>
            <button
              disabled={!canBuy}
              onClick={handleBuy}
              className="w-full py-4 font-black text-base tracking-wide text-black disabled:opacity-40 transition-all active:scale-[0.98]"
              style={{ background: canBuy ? def.color : '#1a1f2e' }}
            >
              {canBuy ? `INVEST ${formatMoney(amount)}` : 'Select an amount below'}
            </button>
          </div>

          {/* Preview line */}
          {canBuy && (
            <p className="text-xs text-gray-500 mb-2 text-center">
              You'll get ~{formatNumber(unitsPreview)} units at {currentPrice.toFixed(4)}/unit
            </p>
          )}
          {!canBuy && amount > 0 && (
            <p className="text-xs text-red-400 mb-2 text-center">
              {amount < def.minBuy ? `Min ${formatMoney(def.minBuy)}` : 'Not enough cash'}
            </p>
          )}

          {/* Quick amounts */}
          <p className="text-xs text-gray-500 mb-2">Quick amounts</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {QUICK_AMOUNTS.map((q) => {
              const disabled = q < def.minBuy || q > cash;
              return (
                <button
                  key={q}
                  disabled={disabled}
                  onClick={() => setAmount(q)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    amount === q
                      ? 'border-current text-white'
                      : disabled
                      ? 'border-white/5 text-gray-600 bg-white/5 cursor-not-allowed'
                      : 'border-white/10 text-gray-400 bg-white/5 active:border-white/30'
                  }`}
                  style={amount === q ? { borderColor: def.color, color: def.color, background: `${def.color}15` } : {}}
                >
                  {formatMoney(q)}
                </button>
              );
            })}
          </div>

          <input
            type="number"
            value={amount}
            min={def.minBuy}
            max={cash}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
          />
        </div>
      </div>
    </div>
  );
}

// ---- Sell modal -------------------------------------------------------------

function SellModal({
  portfolioId,
  inv,
  onClose,
}: {
  portfolioId: string;
  inv: InvestmentState;
  onClose: () => void;
}) {
  const { dispatch } = useGame();
  const def = getPortfolio(portfolioId)!;
  const holding = getHolding(inv, portfolioId);
  const { pct, abs } = getPortfolioReturn(inv, portfolioId);
  const value = getPortfolioValue(inv, portfolioId);

  if (!holding) return null;

  const sell = (fraction: number) => {
    sfx.play('sell');
    dispatch({ type: 'INV_SELL', portfolioId, fraction });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-auto rounded-t-3xl border-t-2 border-x-2 bg-gray-950 overflow-hidden"
        style={{ borderColor: def.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{def.emoji}</span>
            <div>
              <p className="font-bold text-white">{def.name}</p>
              <p className="text-xs text-gray-400">Position summary</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Current value</p>
              <p className="font-mono font-bold text-white">{formatMoney(value)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Return</p>
              <p className={`font-mono font-bold ${abs >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {abs >= 0 ? '+' : ''}{formatPct(pct, 1)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => sell(0.5)}
              className="flex-1 py-3 rounded-2xl font-black text-sm border border-white/10 text-gray-300 hover:border-white/30 hover:text-white bg-white/5 transition-all"
            >
              Sell 50%
            </button>
            <button
              onClick={() => sell(1.0)}
              className="flex-1 py-3 rounded-2xl font-black text-sm bg-red-500/80 text-white hover:bg-red-500 transition-all"
            >
              Sell All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Commodity market (collapsed panel) -------------------------------------

function CommodityPanel() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);

  const industry = getIndustry(state);
  const price = marketPrice(state);
  const trend = state.market.trend ?? 0;
  const accent = state.setup?.accent ?? '#6366f1';
  const resource = state.resource ?? 0;
  const stockpiling = state.market.stockpiling;
  const resPerSec = resourceProdPerSec(state);
  const income = incomePerSec(state);
  const resShort = industry?.resourceShort ?? 'units';
  const currency = industry?.currency ?? '$';
  const canSell = resource > 0;
  const sellValue = resource * price;

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#111827] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🏭</span>
          <span className="text-sm font-semibold text-[#e7ecf5]">Commodities Market</span>
          <span className="text-xs text-gray-500">{industry?.resource ?? 'Resource'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: trend >= 0 ? '#4ade80' : '#f87171', background: trend >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}
          >
            {price.toFixed(3)}x
          </span>
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#232c3e] px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">
                {stockpiling ? 'Stockpiling mode' : 'Auto-sell mode'}
              </p>
              <p className="text-[10px] text-gray-600">
                {stockpiling ? `+${formatNumber(resPerSec)}/s building up` : `${formatMoney(income, currency)}/s flowing in`}
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_STOCKPILE' })}
              className="relative h-7 w-12 rounded-full transition-colors"
              style={{ background: stockpiling ? accent : '#232c3e' }}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${stockpiling ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-300 font-semibold">{formatNumber(resource)} {resShort}</p>
              <p className="text-[10px] text-gray-500">= {formatMoney(sellValue, currency)} at {price.toFixed(2)}x</p>
            </div>
            <button
              disabled={!canSell}
              onClick={() => { sfx.play('sell'); dispatch({ type: 'SELL_RESOURCE' }); }}
              className="px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-40 transition-all"
              style={{ background: canSell ? accent : '#232c3e', color: '#000' }}
            >
              Sell All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main screen ------------------------------------------------------------

export default function InvestmentScreen() {
  useFirstVisit('hint-invest-first');
  const { state, dispatch } = useGame();
  const [, force] = useState(0);
  const [showWizModal, setShowWizModal] = useState(false);
  const [buyPortfolioId, setBuyPortfolioId] = useState<string | null>(null);
  const [sellPortfolioId, setSellPortfolioId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  const inv = state.investments ?? {
    prices: [],
    holdings: [],
    wealthPortfolio: 0,
    realizedGains: 0,
    pendingOffer: null,
    lastOfferAt: 0,
    seenOffers: [],
  };

  const accent = state.setup?.accent ?? '#6366f1';
  const le = state.lifetimeEarnings ?? 0;
  const pendingOffer = inv.pendingOffer;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* ---- Wealth Portfolio Hero ----------------------------------------- */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0e1420 0%, #111827 100%)',
          borderTop: `2px solid ${accent}`,
          boxShadow: `0 0 32px ${accent}20`,
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Wealth Portfolio</p>
            <p className="text-3xl font-mono font-black text-white tabular-nums leading-none">
              {formatMoney(inv.wealthPortfolio)}
            </p>
            <p className={`text-xs mt-1 font-semibold ${inv.realizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {inv.realizedGains >= 0 ? '+' : ''}{formatMoney(inv.realizedGains)} all-time realized
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <CharacterPortrait avatar={WIZ_CHARACTER.avatar} size={40} />
            <p className="text-[9px] text-gray-500">managed by</p>
            <p className="text-[10px] font-bold text-emerald-400">{WIZ_CHARACTER.shortName}</p>
          </div>
        </div>

        {inv.holdings.length === 0 && (
          <p className="text-[11px] text-gray-500 italic">No positions yet. Start investing below.</p>
        )}
      </div>

      {/* ---- Wiz Spotlight ------------------------------------------------- */}
      {pendingOffer && !showWizModal && (
        <div
          className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #0e1420 0%, #0f2417 100%)',
            borderLeft: '3px solid #00f5a0',
            boxShadow: '0 0 20px rgba(0,245,160,0.1)',
          }}
          onClick={() => { sfx.play('tap'); setShowWizModal(true); }}
        >
          <CharacterPortrait avatar={WIZ_CHARACTER.avatar} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
                {pendingOffer.kind === 'legendary' ? '🌟 ONCE IN A LIFETIME' : pendingOffer.kind === 'warning' ? '🚨 HEADS UP' : '⚡ WIZ ALERT'}
              </span>
            </div>
            <p className="text-xs text-gray-200 font-semibold leading-tight truncate">{pendingOffer.headline}</p>
          </div>
          <span className="text-xs text-emerald-400 font-bold shrink-0">TAP</span>
        </div>
      )}

      {/* ---- Your Positions ------------------------------------------------ */}
      {inv.holdings.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Positions</p>
          <div className="space-y-2">
            {inv.holdings.map((h) => {
              const def = getPortfolio(h.portfolioId);
              if (!def) return null;
              const val = getPortfolioValue(inv, h.portfolioId);
              const { pct, abs } = getPortfolioReturn(inv, h.portfolioId);
              const pp = inv.prices.find((p) => p.id === h.portfolioId);
              return (
                <div
                  key={h.portfolioId}
                  className="rounded-2xl p-3 flex items-center gap-3 active:opacity-80 cursor-pointer"
                  style={{
                    background: '#111827',
                    borderLeft: `3px solid ${def.color}`,
                  }}
                  onClick={() => { sfx.play('tap'); setSellPortfolioId(h.portfolioId); }}
                >
                  <div className="shrink-0">
                    <p className="text-lg leading-none">{def.emoji}</p>
                    {pp && <MiniSparkline history={pp.history} color={def.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{def.name}</p>
                    <p className="text-[10px] text-gray-500">{formatNumber(h.units)} units</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-bold text-white">{formatMoney(val)}</p>
                    <p className={`text-[10px] font-bold ${abs >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {abs >= 0 ? '+' : ''}{formatPct(pct, 1)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Markets ------------------------------------------------------- */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Markets</p>
        <div className="space-y-2">
          {PORTFOLIOS.map((def) => {
            const locked = def.unlockLE > le;
            const price = getCurrentPrice(inv, def.id);
            const pp = inv.prices.find((p) => p.id === def.id);
            const isUp = pp ? pp.history[pp.history.length - 1] >= (pp.history[0] ?? 1) : true;
            const hasHolding = !!getHolding(inv, def.id);

            return (
              <div
                key={def.id}
                className={`rounded-2xl p-3 relative overflow-hidden transition-all ${locked ? 'opacity-60' : 'cursor-pointer active:opacity-80'}`}
                style={{ background: '#111827' }}
                onClick={locked ? undefined : () => { sfx.play('tap'); setBuyPortfolioId(def.id); }}
              >
                {locked && (
                  <div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                  >
                    <p className="text-xs text-gray-400 font-bold">
                      🔒 Unlock at {formatMoney(def.unlockLE)} lifetime
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <p className="text-xl leading-none mb-1">{def.emoji}</p>
                    {pp && <MiniSparkline history={pp.history} color={def.color} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="text-xs font-bold text-white">{def.name}</p>
                      {hasHolding && (
                        <span className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${def.color}30`, color: def.color }}>
                          HOLDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryBadge category={def.category} />
                      <RiskChip risk={def.risk} label={def.riskLabel} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-1">{def.tagline}</p>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-mono font-black text-white">{price.toFixed(4)}</p>
                    <p className={`text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '▲' : '▼'} {formatPct(def.annualReturn, 0)} /yr
                    </p>
                    <button
                      className="mt-1 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide text-black transition-all"
                      style={{ background: def.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!locked) { sfx.play('tap'); setBuyPortfolioId(def.id); }
                      }}
                      disabled={locked}
                    >
                      INVEST
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Commodity Market (collapsible) -------------------------------- */}
      <CommodityPanel />

      {/* ---- Modals -------------------------------------------------------- */}
      {showWizModal && pendingOffer && (
        <WizModal
          offer={pendingOffer}
          cash={state.cash}
          onClose={() => setShowWizModal(false)}
        />
      )}
      {buyPortfolioId && (
        <BuyModal
          portfolioId={buyPortfolioId}
          cash={state.cash}
          inv={inv}
          onClose={() => setBuyPortfolioId(null)}
        />
      )}
      {sellPortfolioId && (
        <SellModal
          portfolioId={sellPortfolioId}
          inv={inv}
          onClose={() => setSellPortfolioId(null)}
        />
      )}
    </div>
  );
}

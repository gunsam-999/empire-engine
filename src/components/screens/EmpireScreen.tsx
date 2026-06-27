// ============================================================================
// EmpireScreen — the core gameplay loop. Tap to build, watch numbers climb.
//
// Layout:
//   • Sticky header: company name, big animated cash, income/sec context,
//     insight/influence trickle, and the live market price.
//   • Industry mechanic flavor banner (themed by accent).
//   • Bulk-buy toggle  x1 / x10 / x100 / MAX  (reflects state.settings.buyQty).
//   • 5 tier sections. Locked tiers are dimmed and show their unlock threshold.
//     Each unlocked facility is a Card: icon, name, owned count, its live
//     prodPerSec contribution, a chain-bonus hint (tier > 1), and a BUY button
//     showing the cost for the current buyQty — green & tappable when
//     affordable, dim & disabled otherwise, with a juicy flash on purchase.
// ============================================================================

import { useMemo, useRef, useState } from 'react';

import { useGame } from '../../game/GameContext';
import { fx } from '../shared/FxLayer';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';
import {
  facilityCost,
  getIndustry,
  incomePerSec,
  insightPerSec,
  marketPrice,
  prodPerSec,
  chainBonus,
  tierUnlocked,
} from '../../game/GameContext';
import type { FacilityConfig, GameState } from '../../game/types';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import AnimatedCounter from '../shared/AnimatedCounter';
import LiveEmpireView from './LiveEmpireView';

type BuyQty = GameState['settings']['buyQty'];
const BUY_OPTIONS: BuyQty[] = [1, 10, 100, 'max'];

export default function EmpireScreen() {
  const { state, dispatch } = useGame();
  const industry = getIndustry(state);

  // Live economy snapshots (recomputed each render; the game loop re-renders
  // this component ~10x/sec so these values feel continuous).
  const income = incomePerSec(state);
  const insightRate = insightPerSec(state);
  const price = marketPrice(state);
  const buyQty = state.settings.buyQty;
  const sym = industry?.currency ?? '$';
  const liveView = state.settings.liveView;

  // Group facilities by tier once per facility-list identity.
  // (Hook runs unconditionally; `industry` is effectively always defined on
  // this screen, but we guard the access to stay strict-safe.)
  const tiers = useMemo(() => {
    const byTier: Record<number, FacilityConfig[]> = {};
    for (const f of industry?.facilities ?? []) {
      (byTier[f.tier] ??= []).push(f);
    }
    return [1, 2, 3, 4, 5].map((t) => ({ tier: t, facilities: byTier[t] ?? [] }));
  }, [industry?.facilities]);

  if (!industry) return null;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen relative">
      {/* ===================== Sticky header ===================== */}
      <header className="sticky top-0 z-20 px-4 pt-3 pb-3 bg-[#070b12]/85 backdrop-blur-md border-b border-[#232c3e]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted truncate">
              <span>{industry.emoji}</span>
              <span className="truncate">{state.setup?.name}</span>
            </div>
            <div className="text-3xl font-bold leading-tight">
              <AnimatedCounter
                value={state.cash}
                mode="money"
                symbol={sym}
                flash
                className="text-[#e7ecf5]"
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted">Income</div>
            <div className="text-[15px] font-mono font-semibold text-good tabular-nums">
              +{formatMoney(income, sym)}
              <span className="text-muted font-normal">/s</span>
            </div>
          </div>
        </div>

        {/* Secondary stat strip */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Insight" value={`${formatNumber(state.insight)}`} sub={`+${formatNumber(insightRate)}/s`} icon="🔬" />
          <Stat label="Influence" value={`${formatNumber(state.influence)}`} icon="🤝" />
          <Stat
            label="Market"
            value={`×${price.toFixed(2)}`}
            sub={priceLabel(price)}
            icon="📈"
            tone={price >= 1.05 ? 'good' : price <= 0.95 ? 'bad' : 'muted'}
          />
        </div>

        {/* List / Live view toggle */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted">View</span>
          <div
            role="tablist"
            aria-label="Empire view mode"
            className="inline-flex rounded-xl bg-[#0e1420] border border-[#232c3e] p-0.5"
          >
            {([
              { id: false, label: 'List', icon: '📋' },
              { id: true, label: 'Live', icon: '🌆' },
            ] as const).map((opt) => {
              const active = liveView === opt.id;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (liveView !== opt.id) dispatch({ type: 'TOGGLE_LIVE_VIEW' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
                    active ? 'text-[#070b12]' : 'text-muted hover:text-[#e7ecf5]'
                  }`}
                  style={active ? { background: 'var(--accent)' } : undefined}
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Scroll content (pb so the bulk bar / future nav never covers it) */}
      <div className="px-4 pt-3 pb-28">
        {/* ===================== Live empire view (when enabled) ===================== */}
        {liveView && (
          <div className="mb-3">
            <LiveEmpireView />
            <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted">
              <span>↓</span>
              <span>Your facilities are below</span>
            </div>
          </div>
        )}

        {/* ===================== Mechanic flavor ===================== */}
        <div
          className="rounded-2xl border border-[var(--accent)] p-3 mb-3 relative overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--accent) 8%, #151c2b)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(80% 120% at 100% 0%, color-mix(in srgb, var(--accent) 60%, transparent), transparent 70%)',
            }}
          />
          <div className="relative flex items-start gap-2">
            <span className="text-lg">✨</span>
            <div>
              <div className="text-[13px] font-bold text-[var(--accent)]">
                {industry.mechanicName}
              </div>
              <div className="text-[11px] text-muted leading-snug mt-0.5">
                {industry.mechanicDesc}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== Bulk-buy toggle ===================== */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-wider text-muted">Buy amount</span>
          <div className="inline-flex rounded-xl bg-[#0e1420] border border-[#232c3e] p-0.5">
            {BUY_OPTIONS.map((opt) => {
              const active = buyQty === opt;
              return (
                <button
                  key={String(opt)}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_BUYQTY', qty: opt })}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold font-mono transition-all active:scale-95 ${
                    active ? 'text-[#070b12]' : 'text-muted hover:text-[#e7ecf5]'
                  }`}
                  style={
                    active
                      ? { background: 'var(--accent)' }
                      : undefined
                  }
                >
                  {opt === 'max' ? 'MAX' : `×${opt}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================== Tier sections ===================== */}
        <div className="space-y-5">
          {tiers.map(({ tier, facilities }) => (
            <TierSection
              key={tier}
              tier={tier}
              chainName={industry.chain[tier - 1] ?? `Tier ${tier}`}
              facilities={facilities}
              state={state}
              dispatch={dispatch}
              buyQty={buyQty}
              sym={sym}
            />
          ))}
        </div>

        <div className="text-center text-[10px] text-muted mt-8">
          {industry.resource} • base price ×{price.toFixed(2)} per unit
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier section
// ---------------------------------------------------------------------------

function TierSection({
  tier,
  chainName,
  facilities,
  state,
  dispatch,
  buyQty,
  sym,
}: {
  tier: number;
  chainName: string;
  facilities: FacilityConfig[];
  state: GameState;
  dispatch: ReturnType<typeof useGame>['dispatch'];
  buyQty: BuyQty;
  sym: string;
}) {
  const unlocked = tierUnlocked(state, tier);
  const industry = getIndustry(state);
  const threshold = industry?.tierUnlock[tier - 1] ?? 0;
  const chain = tier > 1 ? chainBonus(state, tier) : 1;
  const ownedInTier = facilities.reduce((s, f) => s + (state.facilities[f.id] || 0), 0);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
          Tier {tier}
        </span>
        <span className="text-[12px] font-semibold text-[#e7ecf5]">{chainName}</span>
        {ownedInTier > 0 && (
          <span className="text-[10px] font-mono text-muted">· {formatNumber(ownedInTier)} owned</span>
        )}
        {unlocked && tier > 1 && chain > 1 && (
          <span className="ml-auto text-[10px] font-mono font-semibold text-good">
            ⚡ +{((chain - 1) * 100).toFixed(0)}% chain
          </span>
        )}
        {!unlocked && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-warn">
            🔒 {formatMoney(threshold, sym)} lifetime
          </span>
        )}
      </div>

      {!unlocked ? (
        <LockedTier threshold={threshold} sym={sym} state={state} />
      ) : (
        <div className="space-y-2">
          {facilities.map((f) => (
            <FacilityRow
              key={f.id}
              cfg={f}
              state={state}
              dispatch={dispatch}
              buyQty={buyQty}
              sym={sym}
              chain={chain}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LockedTier({
  threshold,
  sym,
  state,
}: {
  threshold: number;
  sym: string;
  state: GameState;
}) {
  const progress = threshold > 0 ? Math.min(1, (state.lifetimeEarnings || 0) / threshold) : 1;
  return (
    <div className="rounded-2xl border border-dashed border-[#232c3e] bg-[#0e1420]/60 p-4 text-center opacity-80">
      <div className="text-2xl mb-1">🔒</div>
      <div className="text-[12px] text-muted">
        Unlocks at <span className="font-mono font-semibold text-warn">{formatMoney(threshold, sym)}</span> lifetime earnings
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-[#0b101a] overflow-hidden border border-[#232c3e]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 60%, transparent), var(--accent))',
          }}
        />
      </div>
      <div className="text-[10px] font-mono text-muted mt-1">
        {(progress * 100).toFixed(progress < 0.1 ? 2 : 0)}%
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Facility row — the core tappable unit
// ---------------------------------------------------------------------------

function FacilityRow({
  cfg,
  state,
  dispatch,
  buyQty,
  sym,
  chain,
}: {
  cfg: FacilityConfig;
  state: GameState;
  dispatch: ReturnType<typeof useGame>['dispatch'];
  buyQty: BuyQty;
  sym: string;
  chain: number;
}) {
  const owned = state.facilities[cfg.id] || 0;
  const { cost, count } = facilityCost(state, cfg.id, buyQty);
  const contribution = prodPerSec(state, cfg.id);
  const affordable = count > 0 && Number.isFinite(cost) && state.cash >= cost;

  const [flashing, setFlashing] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function buy() {
    if (!affordable) return;
    dispatch({ type: 'BUY_FACILITY', id: cfg.id, qty: buyQty });
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 180);

    // Juice: spark burst + floating count from the button, a confirm blip, a tap.
    // A bulk/max buy earns the bigger flourish.
    const big = count >= 10;
    fx.fromElement(btnRef.current, `+${formatNumber(count)} ${cfg.icon}`, {
      color: 'var(--accent)',
    });
    sfx.play(big ? 'buyBig' : 'buy');
    haptic(big ? 'success' : 'buy');
  }

  const isOwned = owned > 0;

  return (
    <div
      className={`rounded-2xl border bg-[#151c2b] p-3 transition-colors duration-150 ${
        isOwned ? 'border-[#232c3e]' : 'border-[#1a2130]'
      }`}
      style={
        flashing
          ? {
              boxShadow:
                '0 0 0 1px var(--accent), 0 0 22px -4px color-mix(in srgb, var(--accent) 70%, transparent)',
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        {/* Icon badge */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl border ${
            isOwned ? 'border-[var(--accent)]' : 'border-[#232c3e]'
          }`}
          style={{
            background: isOwned
              ? 'color-mix(in srgb, var(--accent) 14%, #0e1420)'
              : '#0e1420',
          }}
        >
          {cfg.icon}
        </div>

        {/* Name + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[14px] leading-tight truncate">{cfg.name}</span>
            <span className="ml-auto shrink-0 font-mono text-[13px] font-bold tabular-nums text-[var(--accent)]">
              {formatNumber(owned)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            {isOwned ? (
              <span className="font-mono text-good">
                +{formatNumber(contribution)} {state.market.stockpiling ? 'u' : sym}/s
              </span>
            ) : (
              <span className="font-mono">
                {formatNumber(cfg.baseRate)} base/s
              </span>
            )}
            {cfg.tier > 1 && chain > 1 && (
              <span className="font-mono text-[10px] text-[var(--accent)]">
                ⚡×{chain.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Buy button */}
        <button
          ref={btnRef}
          type="button"
          onClick={buy}
          disabled={!affordable}
          className={`shrink-0 rounded-xl px-3 py-2 font-semibold text-[12px] transition-transform active:scale-95 disabled:cursor-not-allowed ${
            affordable ? 'text-[#070b12]' : 'text-muted'
          }`}
          style={{
            minWidth: '92px',
            background: affordable
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, white 8%), var(--accent))'
              : '#0e1420',
            border: affordable ? 'none' : '1px solid #232c3e',
            opacity: count > 0 ? 1 : 0.4,
            boxShadow: affordable
              ? '0 4px 14px -6px color-mix(in srgb, var(--accent) 70%, transparent)'
              : 'none',
          }}
        >
          <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">
            Buy {buyQty === 'max' ? `×${formatNumber(count)}` : `×${buyQty}`}
          </span>
          <span className="block font-mono tabular-nums">
            {Number.isFinite(cost) && count > 0 ? formatMoney(cost, sym) : '—'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small header stat tile
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  sub,
  icon,
  tone = 'muted',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tone?: 'good' | 'bad' | 'muted';
}) {
  const toneCls = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-[#e7ecf5]';
  return (
    <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] py-1.5 px-1">
      <div className="text-[9px] uppercase tracking-wider text-muted flex items-center justify-center gap-1">
        <span>{icon}</span>
        {label}
      </div>
      <div className={`text-[13px] font-mono font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {sub && <div className="text-[9px] font-mono text-muted">{sub}</div>}
    </div>
  );
}

function priceLabel(price: number): string {
  if (price >= 1.25) return 'boom';
  if (price >= 1.05) return 'high';
  if (price <= 0.75) return 'crash';
  if (price <= 0.95) return 'low';
  return 'stable';
}

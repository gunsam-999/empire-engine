// ============================================================================
// PrestigeScreen — the rebirth / meta-progression screen.
// Renders the three PRESTIGE_TIERS as cards:
//   • Restructure (T1)  — live potentialLP, current LP, the +1%/LP multiplier,
//                         eligibility, and a double-confirm Restructure button
//                         dispatching PRESTIGE.
//   • IPO (T2) / Conglomerate (T3) — shown locked with their unlock requirements
//                         and a live progress bar toward eligibility.
// ============================================================================

import { useEffect, useState } from 'react';

import { useGame, getIndustry, potentialLP } from '../../game/GameContext';
import { PRESTIGE_TIERS } from '../../data/prestige';
import type { GameState } from '../../game/types';
import { formatNumber } from '../../utils/bigNumber';

// ---- Live clock (keeps potentialLP / prestige preview fresh) -----------------

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ---- Eligibility helpers ----------------------------------------------------

function ownsTier3Plus(state: GameState): boolean {
  const ind = getIndustry(state);
  if (!ind) return false;
  return ind.facilities.some((f) => f.tier >= 3 && (state.facilities[f.id] || 0) > 0);
}

function prestigeMultFromLP(lp: number): number {
  return Math.pow(1.01, lp);
}

// ---- Resets / Keeps list ----------------------------------------------------

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'bad' | 'good';
}) {
  const color = tone === 'bad' ? '#f87171' : '#34d399';
  const mark = tone === 'bad' ? '✕' : '✓';
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
        {title}
      </div>
      <ul className="mt-1 space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] leading-snug text-[#8a94a8]">
            <span style={{ color }}>{mark}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Restructure (Tier 1) card ----------------------------------------------

function RestructureCard() {
  const { state, dispatch } = useGame();
  const now = useNow(250);
  const tier = PRESTIGE_TIERS[0];

  const [expanded, setExpanded] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0); // 0 idle, 1 armed

  // Re-evaluate against the ticking clock (lifetimeEarnings grows live).
  void now;
  const lp = potentialLP(state);
  const eligible = lp > 0 || ownsTier3Plus(state);

  const currentMult = prestigeMultFromLP(state.legacyPoints);
  const afterMult = prestigeMultFromLP(state.legacyPoints + lp);

  // Reset confirm arming if eligibility lapses.
  useEffect(() => {
    if (!eligible && confirmStep !== 0) setConfirmStep(0);
  }, [eligible, confirmStep]);

  function handleClick() {
    if (!eligible) return;
    if (confirmStep === 0) {
      setConfirmStep(1);
      return;
    }
    dispatch({ type: 'PRESTIGE' });
    setConfirmStep(0);
  }

  // Progress toward the $1e6 lifetime threshold when not yet eligible.
  const towardThreshold = Math.min(1, (state.lifetimeEarnings || 0) / 1e6);

  return (
    <div
      className={[
        'rounded-2xl border bg-[#151c2b] p-4 shadow',
        eligible ? 'border-[var(--accent)]' : 'border-[#232c3e]',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">♻️</span>
            <div>
              <h3 className="text-base font-bold text-[#e7ecf5]">{tier.name}</h3>
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
                Rebirth · Tier 1
              </div>
            </div>
          </div>
        </div>
        <span
          className={[
            'rounded-md px-2 py-0.5 text-[11px] font-semibold',
            eligible ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[#0e1420] text-[#8a94a8]',
          ].join(' ')}
        >
          {eligible ? 'Ready' : 'Locked'}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-snug text-[#8a94a8]">{tier.desc}</p>

      {/* Live LP / multiplier panel */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#0e1420] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">LP on rebirth</div>
          <div className="font-mono tabular-nums text-xl text-[var(--accent)]">
            +{formatNumber(lp)}
          </div>
          <div className="text-[10px] text-[#8a94a8]">⭐ Banked: {formatNumber(state.legacyPoints)}</div>
        </div>
        <div className="rounded-xl bg-[#0e1420] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Prestige mult</div>
          <div className="flex items-baseline gap-1 font-mono tabular-nums">
            <span className="text-[#8a94a8]">×{currentMult.toFixed(2)}</span>
            {lp > 0 && (
              <>
                <span className="text-[#8a94a8]">→</span>
                <span className="text-[#34d399]">×{afterMult.toFixed(2)}</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-[#8a94a8]">+1% production / LP (compounds)</div>
        </div>
      </div>

      {/* Eligibility hint when not ready */}
      {!eligible && (
        <div className="mt-3 rounded-xl bg-[#0e1420] p-2.5">
          <div className="flex items-center justify-between text-[11px] text-[#8a94a8]">
            <span>Toward first Restructure</span>
            <span className="font-mono tabular-nums">
              {formatNumber(state.lifetimeEarnings || 0)} / 1.00M
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#151c2b]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${(towardThreshold * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-[#8a94a8]">{tier.unlockReq}</div>
        </div>
      )}

      {/* Resets / keeps (collapsible) */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#0e1420] px-3 py-2 text-[12px] font-semibold text-[#8a94a8] transition-transform active:scale-[0.98]"
      >
        <span>What survives a Restructure?</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 grid grid-cols-1 gap-3 rounded-xl bg-[#0e1420] p-3 sm:grid-cols-2">
          <ListBlock title="Reset to zero" items={tier.resets} tone="bad" />
          <ListBlock title="Carried forward" items={tier.keeps} tone="good" />
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Grants
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#8a94a8]">{tier.grants}</p>
          </div>
        </div>
      )}

      {/* Action — double confirm */}
      <div className="mt-3">
        {confirmStep === 1 && eligible && (
          <p className="mb-2 text-center text-[12px] font-semibold text-[#fbbf24] animate-fade-in">
            ⚠️ This wipes your cash, facilities & Insight. Confirm Restructure for +{formatNumber(lp)} LP?
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!eligible}
            onClick={handleClick}
            className={[
              'flex-1 rounded-xl py-3 text-[14px] font-semibold transition-transform active:scale-95',
              !eligible
                ? 'cursor-not-allowed bg-[#1b2334] text-[#8a94a8] opacity-50'
                : confirmStep === 1
                ? 'bg-[#f87171] text-[#070b12] animate-pulse-accent'
                : 'bg-[var(--accent)] text-[#070b12]',
            ].join(' ')}
          >
            {!eligible
              ? 'Not eligible yet'
              : confirmStep === 1
              ? 'Yes — Restructure now'
              : `Restructure for +${formatNumber(lp)} LP`}
          </button>
          {confirmStep === 1 && eligible && (
            <button
              type="button"
              onClick={() => setConfirmStep(0)}
              className="rounded-xl border border-[#232c3e] bg-[#151c2b] px-4 text-[13px] font-semibold text-[#8a94a8] transition-transform active:scale-95"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Locked higher-tier card (IPO / Conglomerate) ---------------------------

function LockedTierCard({ index }: { index: 1 | 2 }) {
  const { state } = useGame();
  const tier = PRESTIGE_TIERS[index];
  const [expanded, setExpanded] = useState(false);

  // Progress + current/target toward the unlock requirement.
  let current = 0;
  let target = 1;
  let unitIcon = '';
  if (tier.key === 'ipo') {
    current = state.legacyPoints;
    target = 500;
    unitIcon = '⭐';
  } else {
    current = state.masteryStars;
    target = 50;
    unitIcon = '🌟';
  }
  const progress = Math.min(1, target > 0 ? current / target : 0);

  const icon = tier.key === 'ipo' ? '📈' : '🏙️';

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-4 opacity-90">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl grayscale-[0.3]">{icon}</span>
          <div>
            <h3 className="text-base font-bold text-[#e7ecf5]">{tier.name}</h3>
            <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">
              Rebirth · Tier {tier.tier}
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-md bg-[#0e1420] px-2 py-0.5 text-[11px] font-semibold text-[#8a94a8]">
          🔒 Locked
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-snug text-[#8a94a8]">{tier.desc}</p>

      {/* Progress toward unlock */}
      <div className="mt-3 rounded-xl bg-[#0e1420] p-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#8a94a8]">
          <span>{tier.unlockReq}</span>
          <span className="font-mono tabular-nums text-[#e7ecf5]">
            {unitIcon} {formatNumber(current)} / {formatNumber(target)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#151c2b]">
          <div
            className="h-full rounded-full bg-[#fbbf24] transition-[width] duration-300"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#0e1420] px-3 py-2 text-[12px] font-semibold text-[#8a94a8] transition-transform active:scale-[0.98]"
      >
        <span>Preview the rebirth</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 grid grid-cols-1 gap-3 rounded-xl bg-[#0e1420] p-3 sm:grid-cols-2">
          <ListBlock title="Reset to zero" items={tier.resets} tone="bad" />
          <ListBlock title="Carried forward" items={tier.keeps} tone="good" />
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fbbf24]">
              Grants
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#8a94a8]">{tier.grants}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-xl bg-[#1b2334] py-3 text-[14px] font-semibold text-[#8a94a8] opacity-50"
      >
        Locked — {tier.name}
      </button>
    </div>
  );
}

// ---- Screen -----------------------------------------------------------------

export default function PrestigeScreen() {
  const { state } = useGame();

  return (
    <div className="px-3 pb-24 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#e7ecf5]">Legacy ♾️</h2>
          <p className="text-[12px] text-[#8a94a8]">Dissolve to grow. Power compounds across lives.</p>
        </div>
        <div className="rounded-xl border border-[#232c3e] bg-[#0e1420] px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Rebirths</div>
          <div className="font-mono tabular-nums text-[#e7ecf5]">{state.prestigeCount}</div>
        </div>
      </div>

      {/* Meta-currency strip */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#232c3e] bg-[#151c2b] p-2.5 text-center">
          <div className="text-lg">⭐</div>
          <div className="font-mono tabular-nums text-[var(--accent)]">
            {formatNumber(state.legacyPoints)}
          </div>
          <div className="text-[10px] text-[#8a94a8]">Legacy Pts</div>
        </div>
        <div className="rounded-xl border border-[#232c3e] bg-[#151c2b] p-2.5 text-center">
          <div className="text-lg">🌟</div>
          <div className="font-mono tabular-nums text-[#fbbf24]">
            {formatNumber(state.masteryStars)}
          </div>
          <div className="text-[10px] text-[#8a94a8]">Mastery</div>
        </div>
        <div className="rounded-xl border border-[#232c3e] bg-[#151c2b] p-2.5 text-center">
          <div className="text-lg">💎</div>
          <div className="font-mono tabular-nums text-[#a78bfa]">
            {formatNumber(state.transcendShards)}
          </div>
          <div className="text-[10px] text-[#8a94a8]">Shards</div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="mt-4 flex flex-col gap-3">
        <RestructureCard />
        <LockedTierCard index={1} />
        <LockedTierCard index={2} />
      </div>
    </div>
  );
}

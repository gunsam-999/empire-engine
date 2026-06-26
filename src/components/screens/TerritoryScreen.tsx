// ============================================================================
// TerritoryScreen — expand the empire region by region. Each region grants a
// passive bonus and is contested by a named rival. Unlocking takes cash +
// real time (a live countdown ProgressBar shows the in-progress expansion).
// ============================================================================

import { useEffect, useState } from 'react';

import { useGame, getIndustry } from '../../game/GameContext';
import { REGIONS } from '../../data/regions';
import { expandDurationMs } from '../../systems/TerritorySystem';
import type { RegionConfig } from '../../game/types';
import { formatMoney } from '../../utils/bigNumber';
import { formatCountdown, formatDuration, progressOf } from '../../utils/time';
import Card from '../shared/Card';
import ProgressBar from '../shared/ProgressBar';

const BONUS_META: Record<
  RegionConfig['bonusKind'],
  { icon: string; label: string; color: string }
> = {
  production: { icon: '🏭', label: 'Production', color: '#34d399' },
  market: { icon: '📈', label: 'Market', color: '#fbbf24' },
  insight: { icon: '🧠', label: 'Insight', color: '#60a5fa' },
  influence: { icon: '🤝', label: 'Influence', color: '#c084fc' },
};

export default function TerritoryScreen() {
  const { state, dispatch } = useGame();

  // Live countdown re-render.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const accent = state.setup?.accent ?? '#6366f1';
  const currency = getIndustry(state)?.currency ?? '$';
  const unlocked = state.territory.unlocked ?? [];
  const expanding = state.territory.expanding;
  const cash = state.cash ?? 0;
  const aggressive = state.setup?.philosophy === 'aggressive';

  const ownedCount = REGIONS.filter((r) => unlocked.includes(r.id)).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#e7ecf5]">Territory</h1>
          <p className="text-xs text-[#8a94a8]">
            Claim regions for empire-wide bonuses
            {aggressive && <span className="text-[var(--accent)]"> · Aggressive: 15% faster</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold tabular-nums" style={{ color: accent }}>
            {ownedCount}
            <span className="text-[#8a94a8] text-sm">/{REGIONS.length}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Claimed</p>
        </div>
      </div>

      {REGIONS.map((region) => {
        const isOwned = unlocked.includes(region.id);
        const isExpanding = expanding?.id === region.id;
        const meta = BONUS_META[region.bonusKind];
        const affordable = cash >= region.unlockCost;
        const blockedByOther = !!expanding && !isExpanding;
        const durSec = expandDurationMs(state, region) / 1000;

        // Countdown values for an in-progress expansion.
        let frac = 0;
        let remainMs = 0;
        if (isExpanding && expanding) {
          remainMs = Math.max(0, expanding.endsAt - now);
          const total = expandDurationMs(state, region);
          frac = progressOf(expanding.endsAt - total, expanding.endsAt, now);
        }

        const canExpand = !isOwned && !isExpanding && !blockedByOther && affordable;

        return (
          <Card key={region.id} active={isOwned || isExpanding} muted={blockedByOther && !isOwned}>
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 h-12 w-12 grid place-items-center rounded-xl text-2xl"
                style={{
                  background: isOwned
                    ? `color-mix(in srgb, ${accent} 18%, #0e1420)`
                    : '#0e1420',
                  border: `1px solid ${isOwned ? accent : '#232c3e'}`,
                }}
              >
                {region.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#e7ecf5] truncate">{region.name}</p>
                  {isOwned && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-[#34d399] bg-[#34d39922]">
                      CLAIMED
                    </span>
                  )}
                  {isExpanding && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)` }}
                    >
                      EXPANDING
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs" style={{ color: meta.color }}>
                    {meta.icon} {region.bonusDesc}
                  </span>
                </div>

                {region.rival !== 'None' && (
                  <p className="text-[11px] text-[#8a94a8] mt-0.5">
                    Contested by <span className="text-[#f87171]">{region.rival}</span>
                  </p>
                )}
              </div>
            </div>

            {/* In-progress countdown */}
            {isExpanding && (
              <div className="mt-3">
                <ProgressBar value={frac} heightClass="h-4" label={formatCountdown(remainMs)} color={accent} pulse />
                <p className="text-[11px] text-[#8a94a8] mt-1 text-center">
                  Securing the region from {region.rival}…
                </p>
              </div>
            )}

            {/* Expand control */}
            {!isOwned && !isExpanding && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[11px] text-[#8a94a8]">
                    Cost{' '}
                    <span
                      className="font-mono font-semibold tabular-nums"
                      style={{ color: affordable ? '#e7ecf5' : '#f87171' }}
                    >
                      {formatMoney(region.unlockCost, currency)}
                    </span>{' '}
                    · ~{formatDuration(durSec)}
                  </p>
                </div>
                <button
                  disabled={!canExpand}
                  onClick={() => dispatch({ type: 'EXPAND_TERRITORY', id: region.id })}
                  className="rounded-xl font-semibold px-4 py-2 text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
                  style={{
                    background: canExpand ? accent : '#232c3e',
                    color: canExpand ? '#070b12' : '#8a94a8',
                  }}
                >
                  {blockedByOther ? 'Busy' : affordable ? 'Expand' : 'Locked'}
                </button>
              </div>
            )}

            {/* Owned bonus readout */}
            {isOwned && (
              <div className="mt-3 rounded-xl bg-[#0e1420] border border-[#232c3e] px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] text-[#8a94a8]">{meta.label} bonus active</span>
                <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: meta.color }}>
                  +{Math.round(region.bonusValue * 100)}%
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

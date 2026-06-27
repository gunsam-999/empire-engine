// PremisePanel  -  Old Master's Will (Session 4.3).
// Displays the 5 inheritance clauses: locked / progressing / fulfilled / breached.
// Fulfilling each clause unlocks a permanent production or cost bonus.

import { useGame } from '../../game/GameContext';
import { ALL_CLAUSE_CONFIGS as CLAUSE_CONFIGS } from '../../data/premises';
import type { ClauseStatus } from '../../game/types';

const STATUS_ICON: Record<ClauseStatus, string> = {
  locked:      '🔒',
  progressing: '⏳',
  fulfilled:   '✓',
  breached:    '✗',
};

const STATUS_COLOR: Record<ClauseStatus, string> = {
  locked:      '#8a94a8',
  progressing: '#fbbf24',
  fulfilled:   '#34d399',
  breached:    '#f87171',
};

function rewardLabel(id: string): string {
  const cfg = CLAUSE_CONFIGS.find((c) => c.id === id);
  if (!cfg) return '';
  if (cfg.prod) return `+${Math.round(cfg.prod * 100)}% prod`;
  if (cfg.costDiscount) return `${Math.round(cfg.costDiscount * 100)}% cost`;
  return '';
}

export function PremisePanel() {
  const { state } = useGame();
  const premise = state.premise;
  if (!premise) return null;

  const fulfilledCount = premise.clauses.filter((c) => c.status === 'fulfilled').length;

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#8a94a8]">📜 Old Master's Will</span>
        <span className="text-[10px] uppercase tracking-wide text-[#8a94a8]">
          {fulfilledCount}/{premise.clauses.length} clauses
        </span>
      </div>

      {/* Clause list */}
      <div className="mt-3 flex flex-col gap-3">
        {CLAUSE_CONFIGS.map((cfg) => {
          const clause = premise.clauses.find((c) => c.id === cfg.id);
          if (!clause) return null;

          const color = STATUS_COLOR[clause.status];
          const icon = STATUS_ICON[clause.status];
          const pct =
            cfg.fulfillRequireSec > 0
              ? Math.min(100, (clause.holdSec / cfg.fulfillRequireSec) * 100)
              : 100;
          const isProgressing = clause.status === 'progressing';
          const isFulfilled = clause.status === 'fulfilled';
          const isBreached = clause.status === 'breached';
          const reward = rewardLabel(cfg.id);

          // Show breach grace progress: how long until breach is final
          const breachPct =
            isBreached || (clause.status === 'fulfilled' && clause.breachSec > 0 && cfg.breachGraceSec > 0)
              ? Math.min(100, (clause.breachSec / cfg.breachGraceSec) * 100)
              : 0;
          const inGrace = clause.status === 'fulfilled' && clause.breachSec > 0 && cfg.breachGraceSec > 0;

          return (
            <div key={cfg.id}>
              <div className="flex items-start gap-2">
                {/* Status icon */}
                <span
                  className={[
                    'mt-0.5 shrink-0 text-[13px] font-bold',
                    isProgressing ? 'animate-pulse' : '',
                  ].join(' ')}
                  style={{ color }}
                >
                  {icon}
                </span>

                <div className="min-w-0 flex-1">
                  {/* Label + reward chip */}
                  <div className="flex items-baseline justify-between gap-1">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: isFulfilled ? '#e7ecf5' : color }}
                    >
                      {cfg.label}
                    </span>
                    {isFulfilled && reward && (
                      <span className="shrink-0 rounded-md bg-[#34d399]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#34d399]">
                        {reward}
                      </span>
                    )}
                    {isBreached && (
                      <span className="shrink-0 rounded-md bg-[#f87171]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#f87171]">
                        Suspended
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8a94a8]">
                    {cfg.description}
                  </p>

                  {/* Progress bar  -  shown while progressing */}
                  {isProgressing && cfg.fulfillRequireSec > 0 && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#232c3e]">
                      <div
                        className="h-full rounded-full bg-[#fbbf24] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* Grace-window warning bar  -  fulfilled but condition briefly broken */}
                  {inGrace && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#232c3e]">
                      <div
                        className="h-full rounded-full bg-[#f87171] transition-all duration-700"
                        style={{ width: `${breachPct}%` }}
                      />
                    </div>
                  )}

                  {/* Re-earn hint when breached */}
                  {isBreached && (
                    <p className="mt-1 text-[10px] text-[#8a94a8]">
                      Re-earn: meet the condition again to restore the bonus.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer  -  total bonus summary */}
      {fulfilledCount > 0 && (
        <div className="mt-3 border-t border-[#232c3e] pt-2.5 text-[10px] text-[#8a94a8]">
          {(() => {
            let totalProd = 0;
            let totalCostOff = 0;
            for (const clause of premise.clauses) {
              if (clause.status !== 'fulfilled') continue;
              const cfg = CLAUSE_CONFIGS.find((c) => c.id === clause.id);
              if (cfg?.prod) totalProd += cfg.prod;
              if (cfg?.costDiscount) totalCostOff += cfg.costDiscount;
            }
            const parts: string[] = [];
            if (totalProd > 0) parts.push(`+${Math.round(totalProd * 100)}% production`);
            if (totalCostOff > 0) parts.push(`${Math.round(totalCostOff * 100)}% cheaper facilities`);
            return `Active bonus: ${parts.join(', ')}`;
          })()}
        </div>
      )}
    </div>
  );
}

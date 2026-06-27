// AidePanel — compact aide-cabinet display (Session 4.2).
// Shows each active aide's loyalty bar, Brief/Deploy buttons.

import { useGame } from '../../game/GameContext';
import { AIDE_CONFIGS } from '../../data/aides';
import { canBrief, canDeploy, BRIEF_COOLDOWN_MS, DEPLOY_COOLDOWN_MS } from '../../systems/AideEngine';
import type { AideDomain } from '../../game/types';

const DOMAIN_ICON: Record<AideDomain, string> = {
  legal:     '⚖️',
  pr:        '📣',
  finance:   '💹',
  tech:      '💻',
  logistics: '🚚',
  creative:  '🎨',
};

const LOYALTY_COLOR = (loyalty: number): string => {
  if (loyalty >= 75) return '#34d399'; // green — passive active
  if (loyalty >= 50) return '#fbbf24'; // amber — deploy ready
  return '#f87171';                     // red — needs attention
};

export function AidePanel() {
  const { state, dispatch } = useGame();
  const now = Date.now();

  const activeAides = state.aides ?? [];
  if (activeAides.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#8a94a8]">Cabinet</span>
        <span className="text-[10px] uppercase tracking-wide text-[#8a94a8]">
          {activeAides.filter((a) => a.loyalty >= 75).length}/{activeAides.length} loyal
        </span>
      </div>

      {/* Aide list */}
      <div className="mt-3 flex flex-col gap-2.5">
        {AIDE_CONFIGS.filter((cfg) => activeAides.find((a) => a.id === cfg.id)).map((cfg) => {
          const aide = activeAides.find((a) => a.id === cfg.id)!;
          const color = LOYALTY_COLOR(aide.loyalty);
          const briefReady = canBrief(aide, now);
          const deployReady = canDeploy(aide, now);
          const deployActive = aide.deployCooldownUntil > now;

          const briefRemainSec = briefReady
            ? 0
            : Math.ceil((aide.lastBriefAt + BRIEF_COOLDOWN_MS - now) / 1000);
          const deployRemainSec = deployActive
            ? Math.ceil((aide.deployCooldownUntil - now) / 1000)
            : 0;

          return (
            <div key={cfg.id}>
              <div className="flex items-center gap-2">
                {/* Domain icon */}
                <span className="text-base shrink-0">{DOMAIN_ICON[cfg.domain]}</span>

                {/* Name + role */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[12px] font-medium text-[#e7ecf5]">
                      {cfg.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#8a94a8]">{cfg.role}</span>
                  </div>
                  {/* Loyalty bar */}
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#232c3e]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${aide.loyalty}%`, background: color }}
                    />
                  </div>
                </div>

                {/* Loyalty value */}
                <span className="w-7 shrink-0 text-right font-mono text-[10px] text-[#8a94a8] tabular-nums">
                  {Math.round(aide.loyalty)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-1.5 flex gap-1.5 pl-6">
                {/* Brief */}
                <button
                  type="button"
                  disabled={!briefReady}
                  onClick={() => dispatch({ type: 'AIDE_BRIEF', aideId: aide.id })}
                  className="rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-transform active:scale-95 disabled:opacity-40"
                  style={{
                    background: briefReady
                      ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                      : 'transparent',
                    color: briefReady ? 'var(--accent)' : '#8a94a8',
                    border: '1px solid currentColor',
                  }}
                >
                  {briefReady ? 'Brief' : `Brief ${briefRemainSec}s`}
                </button>

                {/* Deploy */}
                <button
                  type="button"
                  disabled={!deployReady}
                  onClick={() => dispatch({ type: 'AIDE_DEPLOY', aideId: aide.id })}
                  className="rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-transform active:scale-95 disabled:opacity-40"
                  style={{
                    background: deployReady
                      ? 'color-mix(in srgb, #fbbf24 14%, transparent)'
                      : 'transparent',
                    color: deployReady ? '#fbbf24' : '#8a94a8',
                    border: '1px solid currentColor',
                  }}
                >
                  {deployActive
                    ? `${cfg.deployLabel} ${deployRemainSec}s`
                    : deployReady
                    ? cfg.deployLabel
                    : aide.loyalty < 50
                    ? `Need 50 loyalty`
                    : `${cfg.deployLabel} ${deployRemainSec}s`}
                </button>

                {/* Passive active indicator */}
                {aide.loyalty >= 75 && (
                  <span className="ml-auto shrink-0 rounded-md bg-[#34d399]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#34d399]">
                    +{Math.round(cfg.passiveMult * 100)}% passive
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

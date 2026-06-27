// Companion panel — compact trust-ladder display.
// Shows the player's inner circle at a glance.

import { useGame } from '../../game/GameContext';
import { COMPANION_CONFIGS } from '../../data/companions';
import type { TrustRung } from '../../game/types';

const RUNG_COLOR: Record<TrustRung, string> = {
  ACQUAINTANCE: 'bg-gray-400',
  COLLEAGUE: 'bg-blue-400',
  CONFIDANT: 'bg-purple-400',
  INNER_CIRCLE: 'bg-amber-400',
  LEGACY: 'bg-emerald-400',
  ESTRANGED: 'bg-red-400',
};

const RUNG_LABEL: Record<TrustRung, string> = {
  ACQUAINTANCE: 'Acquaintance',
  COLLEAGUE: 'Colleague',
  CONFIDANT: 'Confidant',
  INNER_CIRCLE: 'Inner Circle',
  LEGACY: 'Legacy',
  ESTRANGED: 'Estranged',
};

export function CompanionPanel() {
  const { state } = useGame();
  const now = Date.now();

  const activeCompanions = state.companions ?? [];
  if (activeCompanions.length === 0) return null;

  // Check for active companion boosts.
  const activeBoosts = (state.companionBoosts ?? []).filter((b) => b.endsAt > now);

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 bg-black/30 rounded-xl border border-white/10 text-xs">
      <div className="text-white/40 uppercase tracking-wider font-semibold text-[10px]">
        Inner Circle
      </div>

      {COMPANION_CONFIGS.filter((cfg) =>
        activeCompanions.find((c) => c.id === cfg.id)
      ).map((cfg) => {
        const companion = activeCompanions.find((c) => c.id === cfg.id)!;
        const boost = activeBoosts.find((b) => b.companionId === cfg.id);
        const trustPct = Math.round(companion.trust);
        const rungDot = RUNG_COLOR[companion.rung];

        return (
          <div key={cfg.id} className="flex items-center gap-2">
            {/* Rung dot */}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rungDot}`} />

            {/* Name + rung */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-white/80 font-medium truncate">{cfg.name}</span>
                {boost && (
                  <span className="text-[9px] px-1 py-0.5 bg-amber-400/20 text-amber-300 rounded font-semibold shrink-0">
                    {Math.round((boost.mult - 1) * 100)}% boost
                  </span>
                )}
              </div>
              <div className="text-white/30 text-[10px]">
                {RUNG_LABEL[companion.rung]}
              </div>
            </div>

            {/* Trust bar */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
              <div
                className={`h-full rounded-full transition-all duration-700 ${rungDot}`}
                style={{ width: `${trustPct}%` }}
              />
            </div>
            <span className="text-white/30 w-6 text-right">{trustPct}</span>
          </div>
        );
      })}
    </div>
  );
}

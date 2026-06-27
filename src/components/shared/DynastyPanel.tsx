// ============================================================================
// DynastyPanel  -  shows the prestige dynasty chain: current generation, earned
// traits, heirlooms, and a compact timeline of past runs.
// Only rendered when dynasty.runs.length > 0 (player has prestiged at least once).
// ============================================================================

import { useGame } from '../../game/GameContext';
import { formatNumber } from '../../utils/bigNumber';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function DynastyPanel() {
  const { state } = useGame();
  const dynasty = state.dynasty ?? { runs: [], traits: [], heirlooms: [] };

  if (dynasty.runs.length === 0) return null;

  const generation = dynasty.runs.length + 1; // current generation (1-based)
  const recentRuns = dynasty.runs.slice(-3).reverse(); // last 3, newest first

  return (
    <div className="rounded-2xl border border-[#2a1f4a] bg-[#110d1f] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="text-base">👑</span>
          <span className="font-semibold text-[#c4b5fd]">Dynasty</span>
        </div>
        <span className="rounded-md bg-[#1e1635] px-2 py-0.5 font-mono text-[11px] tabular-nums text-[#a78bfa]">
          {ordinal(generation)} generation
        </span>
      </div>

      {/* Active Traits */}
      {dynasty.traits.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[#8a94a8]">
            Earned Traits
          </div>
          <div className="flex flex-col gap-1.5">
            {dynasty.traits.map((trait) => (
              <div key={trait.id} className="rounded-xl bg-[#1a1230] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#c4b5fd]">
                    {trait.label}
                  </span>
                  <div className="flex gap-1">
                    {trait.prodMult > 1 && (
                      <span className="rounded-md bg-[#34d39920] px-1.5 py-0.5 font-mono text-[10px] text-[#34d399]">
                        +{Math.round((trait.prodMult - 1) * 100)}% prod
                      </span>
                    )}
                    {trait.costDiscount > 0 && (
                      <span className="rounded-md bg-[#fbbf2420] px-1.5 py-0.5 font-mono text-[10px] text-[#fbbf24]">
                        −{Math.round(trait.costDiscount * 100)}% cost
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-0.5 text-[10px] text-[#8a94a8]">{trait.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heirlooms */}
      {dynasty.heirlooms.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[#8a94a8]">Heirlooms</div>
          <div className="flex flex-wrap gap-1.5">
            {dynasty.heirlooms.map((h) => (
              <span
                key={h}
                className="rounded-lg border border-[#2a1f4a] bg-[#1a1230] px-2 py-1 text-[11px] text-[#c4b5fd]"
              >
                🏺 {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Past Runs Timeline */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[#8a94a8]">
          Past Runs {dynasty.runs.length > 3 && `(last 3 of ${dynasty.runs.length})`}
        </div>
        <div className="flex flex-col gap-1.5">
          {recentRuns.map((run) => {
            const ethicsColor =
              run.finalEthics > 20
                ? '#34d399'
                : run.finalEthics < -20
                ? '#f87171'
                : '#fbbf24';
            return (
              <div
                key={run.runIdx}
                className="flex items-center justify-between rounded-xl bg-[#1a1230] px-3 py-2 text-[11px]"
              >
                <span className="font-mono text-[#8a94a8]">
                  Gen {run.runIdx + 1}
                </span>
                <span className="text-[#e7ecf5]">
                  ${formatNumber(run.endEarnings)} LE
                </span>
                <span style={{ color: ethicsColor }}>
                  {run.finalEthics >= 0 ? '+' : ''}{run.finalEthics} rep
                </span>
                {run.rivalsBested.length > 0 && (
                  <span className="text-[#f87171]">⚔️ ×{run.rivalsBested.length}</span>
                )}
                {run.companionsLegacy.length > 0 && (
                  <span className="text-[#34d399]">🤝 ×{run.companionsLegacy.length}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

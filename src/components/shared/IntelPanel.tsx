// IntelPanel  -  Intel Desk UI (Session 5.2).
// Shows intel network level, active reports, and verified verdicts for rival
// telegraphs. Commission button costs 50 influence with a 5-min cooldown.

import { useGame } from '../../game/GameContext';
import {
  canGatherIntel,
  getIntelVerdict,
  intelCooldownRemainingSec,
  INTEL_COMMISSION_COST,
} from '../../systems/IntelEngine';
import { getRivalConfig } from '../../data/rivals';

function formatCooldown(secs: number): string {
  if (secs <= 0) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function IntelPanel() {
  const { state, dispatch } = useGame();
  const intel = state.intel;
  const rivals = state.rivals ?? [];
  const now = Date.now();

  // Only render if there are active rivals
  if (rivals.length === 0 && intel.level === 0 && intel.reports.length === 0) return null;

  const canCommit = canGatherIntel(intel, now) && state.influence >= INTEL_COMMISSION_COST;
  const cooldownSecs = intelCooldownRemainingSec(intel, now);
  const hasEnoughInfluence = state.influence >= INTEL_COMMISSION_COST;

  // Determine button label
  let btnLabel = `Commission Report  🤝 ${INTEL_COMMISSION_COST}`;
  if (!hasEnoughInfluence) btnLabel = 'Need more influence';
  else if (cooldownSecs > 0) btnLabel = `Cooldown: ${formatCooldown(cooldownSecs)}`;

  // Verdicts for rivals with active telegraphs
  const verdicts = rivals
    .filter((r) => r.telegraph)
    .map((r) => {
      const verdict = getIntelVerdict(intel, r.id);
      const cfg = getRivalConfig(r.id);
      return { id: r.id, name: cfg?.name ?? r.id, verdict };
    });

  // Pending (unresolved) reports
  const pending = intel.reports.filter((r) => !r.resolved);

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#e7ecf5]">🔍 Intel Desk</span>
        <span className="text-[#8a94a8]">
          Network: <span className="font-mono tabular-nums text-[#60a5fa]">{Math.round(intel.level)}</span>/100
        </span>
      </div>

      {/* Network level bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0e1420]">
        <div
          className="h-full rounded-full bg-[#60a5fa] transition-[width] duration-700"
          style={{ width: `${intel.level}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-[#8a94a8]">
        Higher network strength → faster report analysis. Decays 2 pts/min.
      </div>

      {/* Verdicts for active telegraphs */}
      {verdicts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {verdicts.map(({ id, name, verdict }) => (
            <div key={id} className="flex items-center justify-between text-[12px]">
              <span className="text-[#c8d0dc]">{name}</span>
              {verdict === null ? (
                <span className="rounded px-1.5 py-0.5 bg-[#8a94a8]/20 text-[10px] text-[#8a94a8]">
                  unverified
                </span>
              ) : verdict === 'feint' ? (
                <span className="rounded px-1.5 py-0.5 bg-[#34d399]/15 text-[10px] font-semibold text-[#34d399]">
                  ✓ FEINT CONFIRMED
                </span>
              ) : (
                <span className="rounded px-1.5 py-0.5 bg-[#f87171]/15 text-[10px] font-semibold text-[#f87171]">
                  ⚠ VERIFIED THREAT
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending reports */}
      {pending.length > 0 && (
        <div className="mt-2 text-[11px] text-[#8a94a8]">
          {pending.length} report{pending.length > 1 ? 's' : ''} in progress…{' '}
          <span className="text-[#60a5fa]">
            ~{Math.round(Math.max(0, (pending[0].revealsAt - now) / 1000))}s remaining
          </span>
        </div>
      )}

      {/* Commission button */}
      <button
        type="button"
        disabled={!canCommit}
        onClick={() => dispatch({ type: 'INTEL_COMMISSION' })}
        className="mt-3 w-full rounded-xl py-2 text-[12px] font-semibold transition-opacity disabled:opacity-50 active:scale-[0.98]"
        style={{
          background: canCommit ? '#60a5fa22' : '#232c3e',
          border: `1px solid ${canCommit ? '#60a5fa66' : '#232c3e'}`,
          color: canCommit ? '#60a5fa' : '#8a94a8',
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

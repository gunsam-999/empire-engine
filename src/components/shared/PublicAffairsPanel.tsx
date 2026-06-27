// ============================================================================
// PublicAffairsPanel (Session 5.5) — public confidence display + statement.
// Shows aggregate confidence, its key drivers, and the "Issue Statement"
// action that players use to boost confidence at influence cost.
// ============================================================================

import { useGame } from '../../game/GameContext';
import {
  defaultPublicAffairsState,
  canIssueStatement,
  statementCooldownRemainingSec,
  getPublicSignals,
  confidenceLabel,
  confidenceColor,
  STATEMENT_COST,
  getPublicAffairsMult,
} from '../../systems/PublicAffairsEngine';

export default function PublicAffairsPanel() {
  const { state, dispatch } = useGame();
  const pa = state.publicAffairs ?? defaultPublicAffairsState();
  const now = Date.now();

  const label = confidenceLabel(pa.confidence);
  const color = confidenceColor(pa.confidence);
  const mult = getPublicAffairsMult(state);
  const multPct = Math.round((mult - 1) * 100);
  const multSign = multPct >= 0 ? '+' : '';

  const signals = getPublicSignals(state);
  const canStatement = canIssueStatement(pa, now);
  const cooldownSec = statementCooldownRemainingSec(pa, now);
  const cooldownMin = Math.ceil(cooldownSec / 60);
  const canAfford = state.influence >= STATEMENT_COST;

  function handleStatement() {
    if (!canStatement || !canAfford) return;
    dispatch({ type: 'PUBLIC_STATEMENT' });
  }

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#8a94a8]">📢 Public Affairs</span>
        <span className="font-mono tabular-nums text-[10px]" style={{ color }}>
          {label} — {Math.round(pa.confidence)}/100
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#0e1420]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pa.confidence}%`,
            background: color,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>

      {/* Multiplier effect */}
      <div className="mt-1.5 text-[11px] font-semibold" style={{ color }}>
        {multSign}{multPct}% production
      </div>

      {/* Drift signals */}
      {signals.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-[#8a94a8]">{s.label}</span>
              <span
                className="font-mono tabular-nums"
                style={{ color: s.positive ? '#34d399' : '#f87171' }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Issue Statement button */}
      <button
        type="button"
        onClick={handleStatement}
        disabled={!canStatement || !canAfford}
        className="mt-3 w-full rounded-xl py-2 text-[12px] font-semibold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `color-mix(in srgb, ${color} 15%, #0e1420)`,
          border: `1px solid color-mix(in srgb, ${color} 25%, #232c3e)`,
          color: canStatement && canAfford ? color : '#8a94a8',
        }}
      >
        {!canStatement
          ? `On cooldown (${cooldownMin}m remaining)`
          : !canAfford
          ? `Issue Statement — 🎖️ ${STATEMENT_COST} influence needed`
          : `Issue Statement — 🎖️ ${STATEMENT_COST} → +25 confidence`}
      </button>
    </div>
  );
}

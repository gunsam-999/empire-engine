// ============================================================================
// RivalAlert — surfaces active rival telegraphs as urgent banners.
// Each telegraph shows who is attacking, what they're about to do, how much
// time remains, and a counter button if one is available.
// ============================================================================

import { useGame } from '../../game/GameContext';
import { getRivalConfig } from '../../data/rivals';
import type { RivalTelegraph } from '../../game/types';

interface AlertProps {
  telegraph: RivalTelegraph;
  now: number;
  /** True if this is a feint — shown as a subtle "unverified" label to hint the
   *  player should invest in the Intel Desk for confirmation. */
  isFeint: boolean;
}

function Alert({ telegraph, now, isFeint }: AlertProps) {
  const { dispatch } = useGame();
  const cfg = getRivalConfig(telegraph.rivalId);
  const secsLeft = Math.max(0, Math.round((telegraph.executesAt - now) / 1000));

  const isUrgent = secsLeft <= 30;
  const borderColor = isUrgent ? '#FF5C5C' : '#F5C518';
  const labelColor = isUrgent ? '#FF5C5C' : '#F5C518';

  function handleCounter() {
    if (!telegraph.counteredBy) return;
    // Countering always dispatches RIVAL_COUNTER to clear the telegraph.
    dispatch({ type: 'RIVAL_COUNTER', rivalId: telegraph.rivalId });
    // For moves that require TOGGLE_STOCKPILE as the counter, also toggle it.
    if (telegraph.counteredBy === 'TOGGLE_STOCKPILE') {
      dispatch({ type: 'TOGGLE_STOCKPILE' });
    }
  }

  return (
    <div
      className="mb-1.5 rounded-xl border px-3 py-2.5"
      style={{ borderColor, background: `${borderColor}12` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: labelColor }}>
            <span>⚔</span>
            <span>{cfg?.name ?? telegraph.rivalId}</span>
            {isFeint && (
              <span className="ml-1 rounded px-1 py-px text-[9px] font-normal normal-case bg-[#8a94a8]/20 text-[#8a94a8]">
                unverified
              </span>
            )}
            <span className="ml-auto font-mono tabular-nums text-[#8a94a8]">
              {secsLeft}s
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-[#c8d0dc]">
            {telegraph.message}
          </p>
        </div>
      </div>
      {telegraph.counterLabel && (
        <button
          onClick={handleCounter}
          className="mt-2 w-full rounded-lg py-1.5 text-[12px] font-semibold transition-opacity active:opacity-70"
          style={{ background: labelColor, color: '#0B0F17' }}
        >
          {telegraph.counterLabel}
        </button>
      )}
    </div>
  );
}

export default function RivalAlert() {
  const { state } = useGame();
  const now = Date.now();

  const activeTelegraphs = (state.rivals ?? [])
    .filter((r) => r.telegraph !== null && (r.telegraph?.executesAt ?? 0) > now)
    .map((r) => ({ telegraph: r.telegraph!, isFeint: r.telegraphIsFeint }));

  const showCoalition = state.coalitionActive;

  if (activeTelegraphs.length === 0 && !showCoalition) return null;

  return (
    <div className="px-3 pt-2">
      {showCoalition && (
        <div className="mb-1.5 rounded-xl border border-[#FF5C5C] bg-[#FF5C5C]/10 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5C5C]">
            ⚠ Coalition Active
          </p>
          <p className="mt-0.5 text-[11px] text-[#c8d0dc]">
            Your rivals have united against you. All are in a heightened threat posture.
          </p>
        </div>
      )}
      {activeTelegraphs.map(({ telegraph: t, isFeint }) => (
        <Alert key={`${t.rivalId}-${t.moveId}`} telegraph={t} now={now} isFeint={isFeint} />
      ))}
    </div>
  );
}

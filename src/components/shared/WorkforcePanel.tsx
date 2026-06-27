// WorkforcePanel  -  compact morale display for the named workforce (Session 4.1).

import { useGame } from '../../game/GameContext';
import { moodFromMorale, getWorkforceMult } from '../../systems/WorkforceEngine';
import type { WorkerMood } from '../../game/types';

const MOOD_COLOR: Record<WorkerMood, string> = {
  BURNT_OUT:  '#f87171',
  DISENGAGED: '#fb923c',
  NEUTRAL:    '#fbbf24',
  ENGAGED:    '#34d399',
  INSPIRED:   '#22d3ee',
};

const MOOD_LABEL: Record<WorkerMood, string> = {
  BURNT_OUT:  'Burnt out',
  DISENGAGED: 'Disengaged',
  NEUTRAL:    'Neutral',
  ENGAGED:    'Engaged',
  INSPIRED:   'Inspired',
};

// 60s cooldown before a worker can be rallied again.
const RALLY_COOLDOWN_MS = 60_000;

export function WorkforcePanel() {
  const { state, dispatch } = useGame();
  const workforce = state.workforce ?? [];
  if (workforce.length === 0) return null;

  const now = Date.now();
  const avg = workforce.reduce((s, w) => s + w.morale, 0) / workforce.length;
  const avgMood = moodFromMorale(avg);
  const avgColor = MOOD_COLOR[avgMood];
  const multPct = Math.round((getWorkforceMult(workforce) - 1) * 100);
  const multSign = multPct >= 0 ? '+' : '';

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#8a94a8]">Workforce</span>
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums text-[10px] text-[#8a94a8]">
            {multSign}{multPct}% output
          </span>
          <span className="font-semibold" style={{ color: avgColor }}>
            {Math.round(avg)}% morale
          </span>
        </div>
      </div>

      {/* Worker list */}
      <div className="mt-3 flex flex-col gap-2">
        {workforce.map((w) => {
          const mood = moodFromMorale(w.morale);
          const color = MOOD_COLOR[mood];
          const canRally = now - w.lastEventAt > RALLY_COOLDOWN_MS && w.morale < 85;

          return (
            <div key={w.id} className="flex items-center gap-2">
              {/* Mood dot */}
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: color, boxShadow: `0 0 4px ${color}60` }}
              />

              {/* Name + role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-[12px] font-medium text-[#e7ecf5]">
                    {w.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#8a94a8]">{w.role}</span>
                </div>
                {/* Morale bar */}
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#232c3e]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${w.morale}%`, background: color }}
                  />
                </div>
              </div>

              {/* Morale value */}
              <span className="w-7 shrink-0 text-right font-mono text-[10px] text-[#8a94a8] tabular-nums">
                {Math.round(w.morale)}
              </span>

              {/* Rally button */}
              {canRally ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'WORKER_MORALE', workerId: w.id, delta: 15 })}
                  className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-transform active:scale-95"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  Rally
                </button>
              ) : (
                <span className="w-[38px] shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#8a94a8]">
        <span>{MOOD_LABEL[avgMood]}</span>
        <span>{workforce.length} team members</span>
      </div>
    </div>
  );
}

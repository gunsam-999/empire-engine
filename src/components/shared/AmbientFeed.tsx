// ============================================================================
// AmbientFeed — Channel 1 of Session 4.4 two-channel story delivery.
// Auto-generated dispatch entries from engine transitions (rival telegraphs,
// companion rung changes, workforce mood shifts, aide loyalty, premise clauses,
// director phase). No player interaction needed — events scroll in naturally.
// ============================================================================

import { useGame } from '../../game/GameContext';

function timeAgo(now: number, at: number): string {
  const sec = Math.floor((now - at) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export function AmbientFeed() {
  const { state } = useGame();
  const feed = state.ambientFeed ?? [];

  if (feed.length === 0) return null;

  const now = Date.now();
  const entries = [...feed].reverse(); // most recent first

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a94a8]">
          Dispatch Feed
        </span>
        <span className="rounded-md bg-[#151c2b] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#8a94a8]">
          {feed.length}
        </span>
      </div>
      <div className="flex max-h-[200px] flex-col gap-2.5 overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={['flex items-start gap-2.5', i === 0 ? 'animate-fade-in' : ''].join(' ')}
          >
            <span className="mt-0.5 shrink-0 text-[15px] leading-none">{entry.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)] opacity-75">
                  {entry.source}
                </span>
                <span className="text-[10px] text-[#8a94a8]">{timeAgo(now, entry.at)}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-[#c8d4e8]">{entry.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

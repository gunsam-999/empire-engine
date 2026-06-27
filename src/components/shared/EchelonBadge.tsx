// EchelonBadge — compact tier chip + progress bar shown in StoryScreen.

import { useGame } from '../../game/GameContext';
import { ECHELON_LABELS } from '../../systems/EchelonEngine';
import type { EchelonTier } from '../../game/types';

const TIER_COLOR: Record<EchelonTier, string> = {
  STARTUP:   '#8a94a8',
  CONTENDER: '#60a5fa',
  PLAYER:    '#34d399',
  LEADER:    '#fbbf24',
  MOGUL:     '#f87171',
  TITAN:     'var(--accent)',
};

const TIER_ICON: Record<EchelonTier, string> = {
  STARTUP:   '🌱',
  CONTENDER: '⚡',
  PLAYER:    '🎯',
  LEADER:    '🦅',
  MOGUL:     '👑',
  TITAN:     '🌐',
};

export default function EchelonBadge() {
  const { state } = useGame();
  const echelon = state.echelon;
  if (!echelon) return null;

  const { tier, points } = echelon;
  const color = TIER_COLOR[tier];
  const label = ECHELON_LABELS[tier] ?? tier;
  const icon = TIER_ICON[tier] ?? '🏆';
  const isTitan = tier === 'TITAN';

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#8a94a8]">Echelon</span>
        <span className="font-semibold" style={{ color }}>
          {icon} {label}
        </span>
      </div>

      {/* Progress bar toward next tier */}
      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-[#0e1420]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${isTitan ? 100 : points}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-[#8a94a8]">
        {isTitan ? (
          <span>Peak echelon — maximum tier bonus active</span>
        ) : (
          <>
            <span>{points}% to next tier</span>
            <span style={{ color }}>+{Math.round((
              tier === 'STARTUP'   ? 0  :
              tier === 'CONTENDER' ? 3  :
              tier === 'PLAYER'    ? 7  :
              tier === 'LEADER'    ? 12 :
              tier === 'MOGUL'     ? 20 : 30
            ))}% prod</span>
          </>
        )}
      </div>
    </div>
  );
}

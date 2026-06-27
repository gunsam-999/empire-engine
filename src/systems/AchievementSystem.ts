// AchievementSystem  -  evaluate milestone triggers. Pure.

import { MILESTONES } from '../data/milestones';
import type { GameReward, GameState } from '../game/types';

interface MilestoneDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  trigger: { type: string; value?: number };
  reward: GameReward;
}

export function milestoneTriggered(state: GameState, m: MilestoneDef): boolean {
  const v = m.trigger.value ?? 0;
  switch (m.trigger.type) {
    case 'earnings':
      return (state.lifetimeEarnings || 0) >= v;
    case 'cash':
      return (state.cash || 0) >= v;
    case 'facilities': {
      const total = Object.values(state.facilities).reduce((a, b) => a + b, 0);
      return total >= v;
    }
    case 'prestige':
      return (state.prestigeCount || 0) >= v;
    case 'research':
      return (state.research?.completed?.length ?? 0) >= v;
    case 'advisor':
      return Object.keys(state.advisors?.owned ?? {}).length >= v;
    case 'territory':
      return (state.territory?.unlocked?.length ?? 0) >= v;
    case 'clicks':
      return (state.stats?.clicks ?? 0) >= v;
    case 'insight':
      return (state.insight || 0) >= v;
    case 'influence':
      return (state.influence || 0) >= v;
    default:
      return false;
  }
}

/** Newly-unlocked milestone ids (not yet in milestones.unlocked). */
export function newlyUnlockedMilestones(state: GameState): MilestoneDef[] {
  const unlocked = state.milestones?.unlocked ?? [];
  const out: MilestoneDef[] = [];
  for (const m of MILESTONES as MilestoneDef[]) {
    if (unlocked.includes(m.id)) continue;
    if (milestoneTriggered(state, m)) out.push(m);
  }
  return out;
}

// ProductionChain  -  Factorio-style tier feeding helpers. Pure.

import { chainBonus, getFacilities, prodPerSec, tierUnlocked } from './EconomyEngine';
import type { GameState } from '../game/types';

export interface ChainTierInfo {
  tier: number;
  unlocked: boolean;
  bonus: number;
  totalCount: number;
  prodPerSec: number;
}

/** Aggregate production info per tier for UI / debugging. */
export function chainOverview(state: GameState): ChainTierInfo[] {
  const facilities = getFacilities(state);
  const tiers = Array.from(new Set(facilities.map((f) => f.tier))).sort((a, b) => a - b);
  return tiers.map((tier) => {
    let totalCount = 0;
    let prod = 0;
    for (const f of facilities) {
      if (f.tier === tier) {
        totalCount += state.facilities[f.id] || 0;
        prod += prodPerSec(state, f.id);
      }
    }
    return {
      tier,
      unlocked: tierUnlocked(state, tier),
      bonus: chainBonus(state, tier),
      totalCount,
      prodPerSec: prod,
    };
  });
}

/** Highest tier the player currently has access to. */
export function highestUnlockedTier(state: GameState): number {
  let highest = 1;
  for (let t = 1; t <= 5; t++) {
    if (tierUnlocked(state, t)) highest = t;
  }
  return highest;
}

// PrestigeSystem — eligibility + LP calc helpers. Pure.

import { getFacilities, potentialLP } from './EconomyEngine';
import type { GameState } from '../game/types';

export { potentialLP } from './EconomyEngine';

/** Does the player own any facility of tier >= threshold? */
export function ownsTierAtLeast(state: GameState, threshold: number): boolean {
  for (const f of getFacilities(state)) {
    if (f.tier >= threshold && (state.facilities[f.id] || 0) > 0) return true;
  }
  return false;
}

/** Prestige is allowed if there is LP to gain OR a tier-3+ facility owned. */
export function canPrestige(state: GameState): boolean {
  return potentialLP(state) > 0 || ownsTierAtLeast(state, 3);
}

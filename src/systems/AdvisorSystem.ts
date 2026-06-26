// AdvisorSystem — advisor leveling cost + activation helpers. Pure.

import { getAdvisor } from '../data/advisors';
import type { GameState } from '../game/types';

export { getAdvisor } from '../data/advisors';

export function advisorLevel(state: GameState, id: string): number {
  return state.advisors?.owned?.[id] ?? 0;
}

export function isOwned(state: GameState, id: string): boolean {
  return (state.advisors?.owned?.[id] ?? 0) > 0;
}

/** Influence cost to raise an advisor from its current level: 50 * 1.6^level. */
export function levelCost(level: number): number {
  return 50 * Math.pow(1.6, level);
}

export function canLevel(state: GameState, id: string): boolean {
  const advisor = getAdvisor(id);
  if (!advisor) return false;
  const level = advisorLevel(state, id);
  if (level <= 0 || level >= advisor.maxLevel) return false;
  return (state.influence || 0) >= levelCost(level);
}

export function cooldownRemaining(state: GameState, id: string, now: number = Date.now()): number {
  return Math.max(0, (state.advisors?.cooldowns?.[id] ?? 0) - now);
}

export function canActivate(state: GameState, id: string, now: number = Date.now()): boolean {
  const advisor = getAdvisor(id);
  if (!advisor || !advisor.activeAbility) return false;
  if (!isOwned(state, id)) return false;
  return cooldownRemaining(state, id, now) <= 0;
}

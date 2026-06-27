// TerritorySystem  -  region unlock + expansion timing helpers. Pure.

import { REGIONS } from '../data/regions';
import type { GameState, RegionConfig } from '../game/types';

export function getRegion(id: string): RegionConfig | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function allRegions(): RegionConfig[] {
  return REGIONS;
}

export function isUnlocked(state: GameState, id: string): boolean {
  return (state.territory?.unlocked ?? []).includes(id);
}

/** Expansion duration in ms, factoring the aggressive philosophy (0.85x). */
export function expandDurationMs(state: GameState, region: RegionConfig): number {
  const mult = state.setup?.philosophy === 'aggressive' ? 0.85 : 1;
  return region.expandSeconds * 1000 * mult;
}

export function canExpand(state: GameState, id: string): boolean {
  if (state.territory?.expanding) return false;
  if (isUnlocked(state, id)) return false;
  const region = getRegion(id);
  if (!region) return false;
  return (state.cash || 0) >= region.unlockCost;
}

export function expansionFinished(state: GameState, now: number = Date.now()): boolean {
  const ex = state.territory?.expanding;
  return !!ex && now >= ex.endsAt;
}

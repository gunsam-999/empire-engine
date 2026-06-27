// ============================================================================
// DynastyEngine  -  prestige-chain logic.
// Snapshots a run before prestige fires, earns a trait, and accumulates the
// dynasty record. Also exposes the multiplier getter for EconomyEngine.
// ============================================================================

import type { DynastyRun, DynastyState, GameState } from '../game/types';
import { TRAIT_CONFIGS, evaluateDynastyTrait, getDynastyHeirloom } from '../data/dynasty';

/** Snapshot the current run's key outcomes before the prestige reset. */
export function recordRun(state: GameState): DynastyRun {
  const companionsLegacy = (state.companions ?? [])
    .filter((c) => c.rung === 'LEGACY')
    .map((c) => c.id);
  const rivalsBested = (state.rivals ?? [])
    .filter((r) => r.posture === 'DEFEATED')
    .map((r) => r.id);
  const clausesFulfilled = (state.premise?.clauses ?? [])
    .filter((c) => c.status === 'fulfilled')
    .length;

  const run: DynastyRun = {
    runIdx: state.prestigeCount, // 0-based, before the increment
    endEarnings: state.lifetimeEarnings,
    finalEthics: state.story.ethics,
    companionsLegacy,
    rivalsBested,
    clausesFulfilled,
    traitEarned: null,
  };
  run.traitEarned = evaluateDynastyTrait(run);
  return run;
}

/**
 * Merge the completed run into the dynasty record.
 * @param newPrestigeCount The prestigeCount AFTER incrementing.
 */
export function applyPrestigeDynasty(
  current: DynastyState,
  run: DynastyRun,
  newPrestigeCount: number
): DynastyState {
  const runs = [...current.runs, run];

  // Add the earned trait only if the dynasty doesn't already hold it.
  const traits = [...current.traits];
  if (run.traitEarned && !traits.some((t) => t.id === run.traitEarned)) {
    const cfg = TRAIT_CONFIGS[run.traitEarned];
    if (cfg) traits.push(cfg);
  }

  const heirloom = getDynastyHeirloom(newPrestigeCount);
  const heirlooms =
    heirloom && !current.heirlooms.includes(heirloom)
      ? [...current.heirlooms, heirloom]
      : current.heirlooms;

  return { runs, traits, heirlooms };
}

/** Combined production and cost multipliers from all held dynasty traits. */
export function getDynastyMults(dynasty: DynastyState): { prod: number; cost: number } {
  let prod = 1;
  let costDiscount = 0;
  for (const trait of dynasty.traits) {
    prod *= trait.prodMult;
    costDiscount += trait.costDiscount;
  }
  return { prod, cost: Math.max(0.5, 1 - costDiscount) };
}

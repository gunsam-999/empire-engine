// ============================================================================
// Dynasty configs — trait definitions, heirloom map, default state factory.
// ============================================================================

import type { DynastyRun, DynastyState, DynastyTrait } from '../game/types';

export const TRAIT_CONFIGS: Record<string, DynastyTrait> = {
  iron_ethicist: {
    id: 'iron_ethicist',
    label: 'Iron Ethicist',
    desc: '+5% production. Earned by holding ethics above +50 at prestige.',
    prodMult: 1.05,
    costDiscount: 0,
  },
  war_hardened: {
    id: 'war_hardened',
    label: 'War-Hardened',
    desc: '+3% production, −3% facility costs. Earned by defeating 2+ rivals.',
    prodMult: 1.03,
    costDiscount: 0.03,
  },
  loyal_house: {
    id: 'loyal_house',
    label: 'Loyal House',
    desc: '+4% production. Earned when 2+ companions reach Legacy status.',
    prodMult: 1.04,
    costDiscount: 0,
  },
  covenant_keeper: {
    id: 'covenant_keeper',
    label: 'Covenant Keeper',
    desc: '+2% production, −5% costs. Earned by fulfilling 4+ premise clauses.',
    prodMult: 1.02,
    costDiscount: 0.05,
  },
  titan_touch: {
    id: 'titan_touch',
    label: "Titan's Touch",
    desc: '+8% production. Earned by reaching $1T lifetime earnings.',
    prodMult: 1.08,
    costDiscount: 0,
  },
  iron_will: {
    id: 'iron_will',
    label: 'Iron Will',
    desc: '+2% production, −2% costs. The perseverance trait earned for every run.',
    prodMult: 1.02,
    costDiscount: 0.02,
  },
};

const DYNASTY_HEIRLOOMS: Record<number, string> = {
  1: "The Mentor's Pocket Watch",
  2: 'The Iron Desk',
  3: 'The Quorum Seal',
  4: 'The Founding Charter',
  5: 'The Apex Medallion',
};

/** Choose which trait best reflects how this run was played. */
export function evaluateDynastyTrait(run: DynastyRun): string {
  if (run.finalEthics > 50) return 'iron_ethicist';
  if (run.rivalsBested.length >= 2) return 'war_hardened';
  if (run.companionsLegacy.length >= 2) return 'loyal_house';
  if (run.clausesFulfilled >= 4) return 'covenant_keeper';
  if (run.endEarnings >= 1e12) return 'titan_touch';
  return 'iron_will';
}

/** Cosmetic heirloom unlocked at the given prestige count (1-based), or null. */
export function getDynastyHeirloom(prestigeCount: number): string | null {
  return DYNASTY_HEIRLOOMS[prestigeCount] ?? null;
}

export function defaultDynastyState(): DynastyState {
  return { runs: [], traits: [], heirlooms: [] };
}

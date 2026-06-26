// ============================================================================
// EconomyEngine — all economy selectors/formulas. Pure, side-effect free.
// Robust to empty/partial data (data modules may not be populated yet).
// ============================================================================

import { INDUSTRIES } from '../data/industries';
import { RESEARCH_NODES } from '../data/research';
import { getAdvisor } from '../data/advisors';
import { getMarketingMult } from './MarketingSystem';
import type {
  FacilityConfig,
  GameState,
  IndustryConfig,
  IndustryType,
  ResearchNode,
} from '../game/types';

export const TIER_UNLOCK_DEFAULT: [number, number, number, number, number] = [
  0, 1e4, 1e7, 1e10, 1e13,
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---- Industry / facility lookups -------------------------------------------

/** The industry config for the current setup, or undefined when no setup. */
export function getIndustry(state: GameState): IndustryConfig | undefined {
  const id = state.setup?.industry;
  if (!id) return undefined;
  return INDUSTRIES[id as IndustryType];
}

export function getFacilities(state: GameState): FacilityConfig[] {
  return getIndustry(state)?.facilities ?? [];
}

export function getFacilityConfig(state: GameState, id: string): FacilityConfig | undefined {
  return getFacilities(state).find((f) => f.id === id);
}

export function getResearchNode(id: string): ResearchNode | undefined {
  return RESEARCH_NODES.find((n: ResearchNode) => n.id === id);
}

// ---- Market -----------------------------------------------------------------

export function marketPrice(state: GameState): number {
  return clamp(state.market?.priceMul ?? 1, 0.4, 2.0);
}

// ---- Multipliers ------------------------------------------------------------

export interface Multipliers {
  production: number;
  cost: number;
  insight: number;
  prestige: number;
  event: number;
  advisor: number;
  market: number;
  marketing: number;
}

function researchProduct(
  state: GameState,
  kind: 'production' | 'insight',
  delta: 1 | -1
): number {
  let mul = 1;
  const completed = state.research?.completed ?? [];
  for (const nid of completed) {
    const node = getResearchNode(nid);
    if (node && node.effect.kind === kind) {
      mul *= 1 + delta * node.effect.value;
    }
  }
  return mul;
}

function researchCostMul(state: GameState): number {
  let mul = 1;
  const completed = state.research?.completed ?? [];
  for (const nid of completed) {
    const node = getResearchNode(nid);
    if (node && node.effect.kind === 'cost') {
      mul *= 1 - node.effect.value;
    }
  }
  return clamp(mul, 0.1, 1);
}

export function peopleFirstMult(state: GameState): number {
  return state.setup?.philosophy === 'people_first' ? 1.15 : 1;
}

/** Combined production bonus from all assigned advisors with a production passive. */
function advisorProduction(state: GameState): number {
  let mul = 1;
  const assigned = state.advisors?.assigned ?? {};
  const owned = state.advisors?.owned ?? {};
  const pf = peopleFirstMult(state);
  const industry = state.setup?.industry;
  const seen = new Set<string>();
  for (const facilityId of Object.keys(assigned)) {
    const advisorId = assigned[facilityId];
    if (!advisorId || seen.has(advisorId)) continue;
    seen.add(advisorId);
    const advisor = getAdvisor(advisorId);
    if (!advisor || advisor.passiveBonus.kind !== 'production') continue;
    const level = owned[advisorId] ?? 1;
    const sameIndustry = advisor.industry === industry ? 1.5 : 1;
    mul *= 1 + advisor.passiveBonus.value * sameIndustry * (1 + 0.1 * level) * pf;
  }
  return mul;
}

function advisorScalar(
  state: GameState,
  kind: 'insight' | 'market'
): number {
  let mul = 1;
  const assigned = state.advisors?.assigned ?? {};
  const owned = state.advisors?.owned ?? {};
  const pf = peopleFirstMult(state);
  const seen = new Set<string>();
  for (const facilityId of Object.keys(assigned)) {
    const advisorId = assigned[facilityId];
    if (!advisorId || seen.has(advisorId)) continue;
    seen.add(advisorId);
    const advisor = getAdvisor(advisorId);
    if (!advisor || advisor.passiveBonus.kind !== kind) continue;
    const level = owned[advisorId] ?? 1;
    mul *= 1 + advisor.passiveBonus.value * (1 + 0.1 * level) * pf;
  }
  return mul;
}

export function prestigeMult(state: GameState): number {
  return (
    Math.pow(1.01, state.legacyPoints || 0) *
    (1 + 0.25 * (state.masteryStars || 0)) *
    (1 + 0.5 * (state.transcendShards || 0))
  );
}

export function getMultipliers(state: GameState): Multipliers {
  const prestige = prestigeMult(state);
  const event =
    state.events?.boost && state.events.boost.endsAt > Date.now()
      ? state.events.boost.mult
      : 1;
  const researchProd = researchProduct(state, 'production', 1);
  const cost = researchCostMul(state);
  const researchInsight = researchProduct(state, 'insight', 1);
  const philosophyProd = state.setup?.philosophy === 'efficiency' ? 1.15 : 1;
  const advisorProd = advisorProduction(state);
  const advisorInsight = advisorScalar(state, 'insight');
  const advisorMarket = advisorScalar(state, 'market');
  const marketing = getMarketingMult(state);

  const production =
    philosophyProd * prestige * researchProd * event * advisorProd * marketing;
  const insight = researchInsight * advisorInsight;

  return {
    production,
    cost,
    insight,
    prestige,
    event,
    advisor: advisorProd,
    market: advisorMarket,
    marketing,
  };
}

export { getMarketingMult };

// ---- Tier / chain -----------------------------------------------------------

export function tierUnlocked(state: GameState, tier: number): boolean {
  if (tier <= 1) return true;
  const ind = getIndustry(state);
  const arr = ind?.tierUnlock ?? TIER_UNLOCK_DEFAULT;
  const threshold = arr[tier - 1] ?? TIER_UNLOCK_DEFAULT[tier - 1] ?? Infinity;
  return (state.lifetimeEarnings || 0) >= threshold;
}

/** Factorio-style: count of facilities in the tier below feeds this tier. */
export function chainBonus(state: GameState, tier: number): number {
  if (tier <= 1) return 1;
  const facilities = getFacilities(state);
  let lowerCount = 0;
  for (const f of facilities) {
    if (f.tier === tier - 1) lowerCount += state.facilities[f.id] || 0;
  }
  return 1 + 0.02 * lowerCount;
}

/** Production bonus contributed by the advisor assigned to this specific facility. */
function facilityAdvisorMult(state: GameState, facilityId: string): number {
  const advisorId = state.advisors?.assigned?.[facilityId];
  if (!advisorId) return 1;
  const advisor = getAdvisor(advisorId);
  if (!advisor || advisor.passiveBonus.kind !== 'production') return 1;
  const level = state.advisors?.owned?.[advisorId] ?? 1;
  const sameIndustry = advisor.industry === state.setup?.industry ? 1.5 : 1;
  return 1 + advisor.passiveBonus.value * sameIndustry * (1 + 0.1 * level) * peopleFirstMult(state);
}

// ---- Production / income ----------------------------------------------------

export function prodPerSec(state: GameState, id: string): number {
  const cfg = getFacilityConfig(state, id);
  if (!cfg) return 0;
  const count = state.facilities[id] || 0;
  if (count <= 0) return 0;
  const M = getMultipliers(state);
  return (
    count *
    cfg.baseRate *
    M.production *
    chainBonus(state, cfg.tier) *
    facilityAdvisorMult(state, id)
  );
}

export function resourceProdPerSec(state: GameState): number {
  let sum = 0;
  for (const f of getFacilities(state)) {
    const count = state.facilities[f.id] || 0;
    if (count > 0 && tierUnlocked(state, f.tier)) {
      sum += prodPerSec(state, f.id);
    }
  }
  return sum;
}

export function incomePerSec(state: GameState): number {
  return resourceProdPerSec(state) * marketPrice(state);
}

export function insightPerSec(state: GameState): number {
  const M = getMultipliers(state);
  let sum = 0;
  for (const f of getFacilities(state)) {
    if (f.tier >= 3) {
      const count = state.facilities[f.id] || 0;
      if (count > 0 && tierUnlocked(state, f.tier)) {
        sum += count * f.baseRate * 0.05;
      }
    }
  }
  return sum * M.insight;
}

// ---- Buying -----------------------------------------------------------------

export interface FacilityCostResult {
  cost: number;
  count: number;
}

/** Closed-form geometric series sum for buying q units starting at owned n. */
function geometricCost(unit: number, costMul: number, n: number, q: number): number {
  if (q <= 0) return 0;
  if (costMul === 1) return unit * q;
  return (unit * Math.pow(costMul, n) * (Math.pow(costMul, q) - 1)) / (costMul - 1);
}

export function facilityCost(
  state: GameState,
  id: string,
  qty: 1 | 10 | 100 | 'max'
): FacilityCostResult {
  const cfg = getFacilityConfig(state, id);
  if (!cfg) return { cost: Infinity, count: 0 };
  const M = getMultipliers(state);
  const n = state.facilities[id] || 0;
  const unit = cfg.baseCost * M.cost;

  if (qty === 'max') {
    const q = maxAffordable(state, id);
    return { cost: geometricCost(unit, cfg.costMul, n, q), count: q };
  }

  const q = qty;
  return { cost: geometricCost(unit, cfg.costMul, n, q), count: q };
}

export function maxAffordable(state: GameState, id: string): number {
  const cfg = getFacilityConfig(state, id);
  if (!cfg) return 0;
  const M = getMultipliers(state);
  const n = state.facilities[id] || 0;
  const unit = cfg.baseCost * M.cost;
  const cash = state.cash || 0;
  if (unit <= 0) return 0;

  const r = cfg.costMul;
  if (r === 1) {
    return Math.max(0, Math.floor(cash / unit));
  }

  // Solve geometric: unit * r^n * (r^q - 1)/(r-1) <= cash
  const ratio = (cash * (r - 1)) / (unit * Math.pow(r, n)) + 1;
  if (ratio <= 1) return 0;
  let q = Math.floor(Math.log(ratio) / Math.log(r));
  if (q < 0) q = 0;

  // Verify / correct for floating point.
  while (q > 0 && geometricCost(unit, r, n, q) > cash) q--;
  while (geometricCost(unit, r, n, q + 1) <= cash) q++;
  return q;
}

// ---- Prestige ---------------------------------------------------------------

export function potentialLP(state: GameState): number {
  const le = state.lifetimeEarnings || 0;
  if (le < 1e6) return 0;
  const base = Math.floor(Math.log10(le / 1e6));
  const lp = Math.floor(base * (1 + 0.1 * (state.prestigeCount || 0)));
  return Math.max(0, lp);
}

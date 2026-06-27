// ============================================================================
// PremiseEngine  -  tick clause evaluation, reveal logic, and economy getters.
// Pure, no side effects. Called from the TICK reducer each frame.
// ============================================================================

import type { GameState, PremiseClause, PremiseState } from '../game/types';
import { CLAUSE_CONFIGS, PREMISE_REVEAL_THRESHOLD } from '../data/premises';

export function defaultPremiseState(now: number): PremiseState {
  return {
    revealedAt: now,
    clauses: CLAUSE_CONFIGS.map((cfg) => ({
      id: cfg.id,
      status: 'locked' as const,
      holdSec: 0,
      fulfilledAt: 0,
      breachSec: 0,
    })),
  };
}

export function shouldRevealPremise(state: GameState): boolean {
  return !state.premise && (state.lifetimeEarnings ?? 0) >= PREMISE_REVEAL_THRESHOLD;
}

export function tickPremise(
  premise: PremiseState,
  state: GameState,
  dt: number,
  now: number
): PremiseState {
  const clauses = premise.clauses.map((clause): PremiseClause => {
    const cfg = CLAUSE_CONFIGS.find((c) => c.id === clause.id);
    if (!cfg) return clause;

    const conditionMet = cfg.check(state);
    const requireSec = cfg.fulfillRequireSec;
    const graceSec = cfg.breachGraceSec;

    // ---- Fulfilled: watch for breach ------------------------------------
    if (clause.status === 'fulfilled') {
      if (conditionMet) {
        return { ...clause, breachSec: 0 };
      }
      if (graceSec <= 0) {
        // breachGraceSec = 0 means this clause can never be breached.
        return clause;
      }
      const newBreachSec = clause.breachSec + dt;
      if (newBreachSec >= graceSec) {
        return { ...clause, status: 'breached', breachSec: newBreachSec, holdSec: 0 };
      }
      return { ...clause, breachSec: newBreachSec };
    }

    // ---- Breached: re-progress from scratch ----------------------------
    if (clause.status === 'breached') {
      if (!conditionMet) {
        return { ...clause, holdSec: 0 };
      }
      const newHold = clause.holdSec + dt;
      if (requireSec <= 0 || newHold >= requireSec) {
        return { ...clause, status: 'fulfilled', holdSec: newHold, fulfilledAt: now, breachSec: 0 };
      }
      return { ...clause, status: 'progressing', holdSec: newHold };
    }

    // ---- Locked or progressing -----------------------------------------
    if (!conditionMet) {
      return { ...clause, status: 'locked', holdSec: 0, breachSec: 0 };
    }

    const newHold = clause.holdSec + dt;
    if (requireSec <= 0 || newHold >= requireSec) {
      return { ...clause, status: 'fulfilled', holdSec: newHold, fulfilledAt: now, breachSec: 0 };
    }
    return { ...clause, status: 'progressing', holdSec: newHold };
  });

  return { ...premise, clauses };
}

/** Stacked production multiplier from all fulfilled clauses. */
export function getPremiseProdMult(premise: PremiseState | null): number {
  if (!premise) return 1;
  let mult = 1;
  for (const clause of premise.clauses) {
    if (clause.status !== 'fulfilled') continue;
    const cfg = CLAUSE_CONFIGS.find((c) => c.id === clause.id);
    if (cfg?.prod) mult *= 1 + cfg.prod;
  }
  return mult;
}

/** Stacked cost multiplier from all fulfilled clauses (< 1 = cheaper). */
export function getPremiseCostMult(premise: PremiseState | null): number {
  if (!premise) return 1;
  let mult = 1;
  for (const clause of premise.clauses) {
    if (clause.status !== 'fulfilled') continue;
    const cfg = CLAUSE_CONFIGS.find((c) => c.id === clause.id);
    if (cfg?.costDiscount) mult *= 1 - cfg.costDiscount;
  }
  return mult;
}

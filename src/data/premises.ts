// ============================================================================
// Premise data — the Old Master's will: 5 clauses with conditions and rewards.
// Conditions are checked against live GameState each tick; never stored here.
// ============================================================================

import type { GameState } from '../game/types';

export interface ClauseConfig {
  id: string;
  label: string;
  description: string;
  /** Seconds the condition must hold continuously to reach 'fulfilled'. 0 = instant. */
  fulfillRequireSec: number;
  /** Seconds of sustained failure before a fulfilled clause becomes 'breached'. 0 = never. */
  breachGraceSec: number;
  /** Production multiplier bonus applied when fulfilled (e.g. 0.04 = +4%). */
  prod?: number;
  /** Cost discount applied when fulfilled (e.g. 0.05 = 5% cheaper). */
  costDiscount?: number;
  /** Returns true when the game state currently meets the clause condition. */
  check: (state: GameState) => boolean;
}

export const CLAUSE_CONFIGS: ClauseConfig[] = [
  {
    id: 'earned_growth',
    label: 'Earned Growth',
    description: 'Reach $25,000 in lifetime earnings.',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.05,
    check: (state) => (state.lifetimeEarnings ?? 0) >= 25_000,
  },
  {
    id: 'ethical_conduct',
    label: 'Ethical Conduct',
    description: 'Hold a positive reputation for 60 seconds.',
    fulfillRequireSec: 60,
    breachGraceSec: 20,
    costDiscount: 0.05,
    check: (state) => (state.story?.ethics ?? 0) > 0,
  },
  {
    id: 'dignified_labour',
    label: 'Dignified Labour',
    description: 'Keep team average morale above 60 for 2 minutes.',
    fulfillRequireSec: 120,
    breachGraceSec: 30,
    prod: 0.04,
    check: (state) => {
      const wf = state.workforce ?? [];
      if (wf.length === 0) return false;
      return wf.reduce((s, w) => s + w.morale, 0) / wf.length >= 60;
    },
  },
  {
    id: 'diplomatic_restraint',
    label: 'Diplomatic Restraint',
    description: 'Avoid a rival coalition for 3 minutes.',
    fulfillRequireSec: 180,
    breachGraceSec: 15,
    prod: 0.03,
    check: (state) => !(state.coalitionActive ?? false),
  },
  {
    id: 'inner_circle',
    label: 'Inner Circle',
    description: 'Maintain a Confidant-level companion for 90 seconds.',
    fulfillRequireSec: 90,
    breachGraceSec: 30,
    prod: 0.04,
    check: (state) =>
      (state.companions ?? []).some(
        (c) => c.rung === 'CONFIDANT' || c.rung === 'INNER_CIRCLE' || c.rung === 'LEGACY'
      ),
  },
];

export function getClauseConfig(id: string): ClauseConfig | undefined {
  return CLAUSE_CONFIGS.find((c) => c.id === id);
}

/** Lifetime earnings threshold at which the will is revealed to the player. */
export const PREMISE_REVEAL_THRESHOLD = 500;

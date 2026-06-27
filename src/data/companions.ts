// ============================================================================
// Companion configs  -  the player's inner circle.
// The co-founder is the anchor companion; named lieutenants join later.
// Each companion has trust thresholds, a move set, and a signature ability.
// ============================================================================

import type { TrustRung } from '../game/types';

export interface CompanionMoveConfig {
  kind: 'counsel' | 'cover' | 'boost' | 'rally' | 'loyalty_save' | 'signature';
  minRung: TrustRung;
  /** Message shown when the move fires. */
  message: string;
  mult?: number;       // production/income multiplier
  durationSec?: number;
  cooldownSec: number;
}

export interface CompanionConfig {
  id: string;
  name: string;
  role: string;
  tagline: string;
  /** Trust value above which this companion provides their rung's passive benefit. */
  passiveBoostMult: number; // added to production at Colleague+
  evalIntervalSec: number;
  moves: CompanionMoveConfig[];
}

const TRUST_RUNGS: TrustRung[] = [
  'ACQUAINTANCE',
  'COLLEAGUE',
  'CONFIDANT',
  'INNER_CIRCLE',
  'LEGACY',
  'ESTRANGED',
];

export function rungGte(a: TrustRung, b: TrustRung): boolean {
  return TRUST_RUNGS.indexOf(a) >= TRUST_RUNGS.indexOf(b);
}

export const COMPANION_CONFIGS: CompanionConfig[] = [
  // ---- Co-founder (always present) ----------------------------------------
  {
    id: 'cofounder',
    name: 'Your Co-Founder',
    role: 'Co-Founder & COO',
    tagline: 'In from day one. The one who stays.',
    passiveBoostMult: 0.05,
    evalIntervalSec: 60,
    moves: [
      {
        kind: 'counsel',
        minRung: 'CONFIDANT',
        message: 'They flag something you were about to miss.',
        cooldownSec: 300,
      },
      {
        kind: 'cover',
        minRung: 'INNER_CIRCLE',
        message: 'They absorb the hit. "I have it. Keep moving."',
        cooldownSec: 600,
      },
      {
        kind: 'rally',
        minRung: 'INNER_CIRCLE',
        message: 'They rally the team. Output spikes.',
        mult: 2.5,
        durationSec: 60,
        cooldownSec: 900,
      },
      {
        kind: 'loyalty_save',
        minRung: 'CONFIDANT',
        message: 'A rival tried to poach them. They said no without calling you.',
        cooldownSec: 1800,
      },
      {
        kind: 'signature',
        minRung: 'INNER_CIRCLE',
        message: 'They close the deal you were about to lose.',
        mult: 4,
        durationSec: 45,
        cooldownSec: 1200,
      },
    ],
  },

  // ---- First lieutenant (named hire, unlocked at RISING) -------------------
  {
    id: 'lieutenant-1',
    name: 'Ravi',
    role: 'Head of Operations',
    tagline: 'Dropped out to bet on you. Hasn\'t looked back.',
    passiveBoostMult: 0.04,
    evalIntervalSec: 90,
    moves: [
      {
        kind: 'boost',
        minRung: 'COLLEAGUE',
        message: 'Ravi optimises the workflow. Efficiency up.',
        mult: 1.15,
        durationSec: 120,
        cooldownSec: 360,
      },
      {
        kind: 'counsel',
        minRung: 'CONFIDANT',
        message: 'Ravi pulls you aside: "You\'re about to overpay for that."',
        cooldownSec: 480,
      },
      {
        kind: 'loyalty_save',
        minRung: 'COLLEAGUE',
        message: 'Halcyon tried to poach Ravi. He told them to pound sand.',
        cooldownSec: 2400,
      },
      {
        kind: 'signature',
        minRung: 'INNER_CIRCLE',
        message: 'Ravi runs a process audit. Finds cash hiding in plain sight.',
        mult: 3,
        durationSec: 90,
        cooldownSec: 1800,
      },
    ],
  },

  // ---- Strategist (unlocked at ESTABLISHED) --------------------------------
  {
    id: 'strategist',
    name: 'Priya',
    role: 'Chief Strategy Officer',
    tagline: 'Sees three moves ahead. Shares two.',
    passiveBoostMult: 0.06,
    evalIntervalSec: 120,
    moves: [
      {
        kind: 'counsel',
        minRung: 'ACQUAINTANCE',
        message: 'Priya spots a market window opening.',
        cooldownSec: 240,
      },
      {
        kind: 'rally',
        minRung: 'COLLEAGUE',
        message: 'Priya reframes the crisis as opportunity. The team shifts.',
        mult: 2,
        durationSec: 90,
        cooldownSec: 720,
      },
      {
        kind: 'cover',
        minRung: 'INNER_CIRCLE',
        message: 'Priya coordinates the defence before you even know the attack is coming.',
        cooldownSec: 1200,
      },
      {
        kind: 'signature',
        minRung: 'INNER_CIRCLE',
        message: 'Priya\'s competitive brief changes the whole quarter.',
        mult: 5,
        durationSec: 30,
        cooldownSec: 2400,
      },
    ],
  },
];

export function getCompanionConfig(id: string): CompanionConfig | undefined {
  return COMPANION_CONFIGS.find((c) => c.id === id);
}

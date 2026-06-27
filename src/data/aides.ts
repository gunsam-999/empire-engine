// ============================================================================
// Aide configs  -  the player's domain specialists (Session 4.2).
// Six aides unlock progressively by lifetime-earnings tier. Each provides a
// passive production bonus at loyalty ≥ 75 and a deployable boost on demand.
// ============================================================================

import type { AideDomain } from '../game/types';

export interface AideConfig {
  id: string;
  name: string;
  role: string;
  domain: AideDomain;
  tagline: string;
  /** Lifetime earnings needed before this aide joins the roster. */
  unlockLE: number;
  /** Added to production multiplier stack when loyalty ≥ 75 (e.g. 0.03 = +3%). */
  passiveMult: number;
  /** Multiplier applied to the global boost on Deploy. */
  deployMult: number;
  deployDurationSec: number;
  deployLabel: string;
}

export const AIDE_CONFIGS: AideConfig[] = [
  {
    id: 'marcus',
    name: 'Marcus Chen',
    role: 'Legal Counsel',
    domain: 'legal',
    tagline: 'Turns every clause into an asset.',
    unlockLE: 0,
    passiveMult: 0.02,
    deployMult: 2.0,
    deployDurationSec: 60,
    deployLabel: 'Regulatory Shield',
  },
  {
    id: 'layla',
    name: 'Layla Hassan',
    role: 'Head of PR',
    domain: 'pr',
    tagline: 'The story you tell is the company you build.',
    unlockLE: 0,
    passiveMult: 0.03,
    deployMult: 1.8,
    deployDurationSec: 90,
    deployLabel: 'PR Blitz',
  },
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    role: 'Chief Financial Officer',
    domain: 'finance',
    tagline: 'She finds value where others see noise.',
    unlockLE: 1_000,
    passiveMult: 0.025,
    deployMult: 2.2,
    deployDurationSec: 75,
    deployLabel: 'Capital Reallocation',
  },
  {
    id: 'dev',
    name: 'Dev Patel',
    role: 'Chief Technology Officer',
    domain: 'tech',
    tagline: 'Builds the thing you needed before you knew you needed it.',
    unlockLE: 10_000,
    passiveMult: 0.03,
    deployMult: 2.5,
    deployDurationSec: 45,
    deployLabel: 'Code Sprint',
  },
  {
    id: 'sofia',
    name: 'Sofia Reyes',
    role: 'Head of Logistics',
    domain: 'logistics',
    tagline: 'The invisible hand that keeps things moving.',
    unlockLE: 100_000,
    passiveMult: 0.025,
    deployMult: 1.6,
    deployDurationSec: 120,
    deployLabel: 'Supply Chain Audit',
  },
  {
    id: 'ade',
    name: 'Ade Okafor',
    role: 'Creative Director',
    domain: 'creative',
    tagline: 'Makes people feel something about a spreadsheet.',
    unlockLE: 1_000_000,
    passiveMult: 0.03,
    deployMult: 2.0,
    deployDurationSec: 90,
    deployLabel: 'Creative Surge',
  },
];

export function getAideConfig(id: string): AideConfig | undefined {
  return AIDE_CONFIGS.find((a) => a.id === id);
}

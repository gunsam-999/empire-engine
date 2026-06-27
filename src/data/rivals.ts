// ============================================================================
// Rival configs  -  anchor roster for Session 3.2.
// Each rival has a spawn threshold, a personality, and a move set that
// escalates through posture rungs.
// ============================================================================

import type { RivalPosture } from '../game/types';

// ---- Move definitions -------------------------------------------------------

export type RivalEffectKind = 'price' | 'production' | 'brand';

export interface RivalMoveConfig {
  id: string;
  name: string;
  minPosture: RivalPosture;
  telegraphMessage: string;
  /** Window in seconds before the move executes (player can counter). */
  telegraphDelaySec: number;
  cooldownSec: number;
  effect: { kind: RivalEffectKind; multiplier: number; durationSec: number };
  /** Reducer action type that counters this move, or null. */
  counteredBy: string | null;
  counterLabel: string | null;
}

// ---- Rival config -----------------------------------------------------------

export interface RivalConfig {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  /** Minimum lifetime earnings for this rival to spawn. */
  spawnAt: number;
  /** How often this rival evaluates (seconds). Staggered across rivals. */
  evalIntervalSec: number;
  /** Base aggression increase per evaluation when player is in their domain. */
  passiveAggPerEval: number;
  moves: RivalMoveConfig[];
}

// ---- Anchor roster ----------------------------------------------------------

export const RIVAL_CONFIGS: RivalConfig[] = [
  // ---- Cassara Voss  -  personal nemesis, story-driven ----------------------
  {
    id: 'cassara',
    name: 'Cassara Voss',
    domain: 'Personal',
    tagline: '"I eat startups like yours between meetings."',
    spawnAt: 5_000,
    evalIntervalSec: 90,
    passiveAggPerEval: 3,
    moves: [
      {
        id: 'cassara-smear',
        name: 'Smear Campaign',
        minPosture: 'PROVOKED',
        telegraphMessage: 'Cassara Voss is planting negative press about your company.',
        telegraphDelaySec: 45,
        cooldownSec: 180,
        effect: { kind: 'brand', multiplier: 0.7, durationSec: 90 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Counter with PR',
      },
      {
        id: 'cassara-undercut',
        name: 'Hard Undercut',
        minPosture: 'HOSTILE',
        telegraphMessage: 'Cassara is pricing below cost to flood your market.',
        telegraphDelaySec: 60,
        cooldownSec: 300,
        effect: { kind: 'price', multiplier: 0.65, durationSec: 120 },
        counteredBy: 'TOGGLE_STOCKPILE',
        counterLabel: 'Stockpile now',
      },
    ],
  },

  // ---- Halcyon Trade Co.  -  commodity manipulator --------------------------
  {
    id: 'halcyon',
    name: 'Halcyon Trade Co.',
    domain: 'Commodity Market',
    tagline: 'They own the price before you name it.',
    spawnAt: 50_000,
    evalIntervalSec: 120,
    passiveAggPerEval: 2,
    moves: [
      {
        id: 'halcyon-nudge',
        name: 'Price Nudge',
        minPosture: 'PROVOKED',
        telegraphMessage: 'Halcyon is quietly undercutting your market price.',
        telegraphDelaySec: 30,
        cooldownSec: 240,
        effect: { kind: 'price', multiplier: 0.82, durationSec: 90 },
        counteredBy: 'TOGGLE_STOCKPILE',
        counterLabel: 'Stockpile resource',
      },
      {
        id: 'halcyon-flood',
        name: 'Market Flood',
        minPosture: 'WAR',
        telegraphMessage: 'HALCYON TRADE CO. IS FLOODING THE MARKET. Your income is at risk.',
        telegraphDelaySec: 90,
        cooldownSec: 600,
        effect: { kind: 'price', multiplier: 0.4, durationSec: 180 },
        counteredBy: 'TOGGLE_STOCKPILE',
        counterLabel: 'Stockpile everything',
      },
    ],
  },

  // ---- Meridian Holdings  -  power broker -----------------------------------
  {
    id: 'meridian',
    name: 'Meridian Holdings',
    domain: 'Influence',
    tagline: 'The room was decided before you walked in.',
    spawnAt: 5_000_000,
    evalIntervalSec: 150,
    passiveAggPerEval: 2,
    moves: [
      {
        id: 'meridian-smear',
        name: 'Influence Smear',
        minPosture: 'PROVOKED',
        telegraphMessage: 'Meridian is circulating negative coverage of your brand.',
        telegraphDelaySec: 45,
        cooldownSec: 300,
        effect: { kind: 'brand', multiplier: 0.6, durationSec: 120 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Run counter-PR',
      },
      {
        id: 'meridian-squeeze',
        name: 'Supply Squeeze',
        minPosture: 'HOSTILE',
        telegraphMessage: 'Meridian is pressuring your supply chain.',
        telegraphDelaySec: 60,
        cooldownSec: 480,
        effect: { kind: 'production', multiplier: 0.65, durationSec: 150 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Source alternatives',
      },
    ],
  },

  // ---- Vanguard Syndicate  -  brute scaler ----------------------------------
  {
    id: 'vanguard',
    name: 'Vanguard Syndicate',
    domain: 'Production',
    tagline: 'Bigger. Faster. They just out-grind you.',
    spawnAt: 10_000_000,
    evalIntervalSec: 105,
    passiveAggPerEval: 4,
    moves: [
      {
        id: 'vanguard-undercut',
        name: 'Hard Undercut',
        minPosture: 'PROVOKED',
        telegraphMessage: 'Vanguard Syndicate is pricing below cost to steal your customers.',
        telegraphDelaySec: 40,
        cooldownSec: 270,
        effect: { kind: 'price', multiplier: 0.72, durationSec: 120 },
        counteredBy: 'TOGGLE_STOCKPILE',
        counterLabel: 'Stockpile through it',
      },
      {
        id: 'vanguard-squeeze',
        name: 'Production Lockout',
        minPosture: 'HOSTILE',
        telegraphMessage: "Vanguard is buying up inputs and locking you out of the production chain.",
        telegraphDelaySec: 60,
        cooldownSec: 420,
        effect: { kind: 'production', multiplier: 0.55, durationSec: 180 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Defend supply chain',
      },
    ],
  },

  // ---- Orient Combine  -  idea thief ----------------------------------------
  {
    id: 'orient',
    name: 'Orient Combine',
    domain: 'Research',
    tagline: "They don't innovate. They perfect what you discovered.",
    spawnAt: 50_000_000,
    evalIntervalSec: 135,
    passiveAggPerEval: 2,
    moves: [
      {
        id: 'orient-smear',
        name: 'Credibility Attack',
        minPosture: 'PROVOKED',
        telegraphMessage: 'Orient Combine is casting doubt on your research claims.',
        telegraphDelaySec: 50,
        cooldownSec: 360,
        effect: { kind: 'brand', multiplier: 0.75, durationSec: 100 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Publish findings',
      },
      {
        id: 'orient-production',
        name: 'Copied Blueprint',
        minPosture: 'HOSTILE',
        telegraphMessage: 'Orient has reverse-engineered your process and is undercutting output.',
        telegraphDelaySec: 75,
        cooldownSec: 540,
        effect: { kind: 'production', multiplier: 0.7, durationSec: 200 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Lock IP',
      },
    ],
  },

  // ---- Apex Consortium  -  endgame coalition --------------------------------
  {
    id: 'apex',
    name: 'Apex Consortium',
    domain: 'Everything',
    tagline: 'The coalition you were never invited to join.',
    spawnAt: 1_000_000_000_000, // 1T  -  titan phase only
    evalIntervalSec: 180,
    passiveAggPerEval: 5,
    moves: [
      {
        id: 'apex-flood',
        name: 'Coordinated Market Flood',
        minPosture: 'WAR',
        telegraphMessage: 'THE APEX CONSORTIUM IS COORDINATING AN ASSAULT ON YOUR MARKETS.',
        telegraphDelaySec: 120,
        cooldownSec: 1200,
        effect: { kind: 'price', multiplier: 0.3, durationSec: 300 },
        counteredBy: 'TOGGLE_STOCKPILE',
        counterLabel: 'Emergency stockpile',
      },
      {
        id: 'apex-squeeze',
        name: 'Supply Blockade',
        minPosture: 'HOSTILE',
        telegraphMessage: 'The Apex Consortium is coordinating a supply blockade against you.',
        telegraphDelaySec: 90,
        cooldownSec: 900,
        effect: { kind: 'production', multiplier: 0.4, durationSec: 300 },
        counteredBy: 'RIVAL_COUNTER',
        counterLabel: 'Break the blockade',
      },
    ],
  },
];

export function getRivalConfig(id: string): RivalConfig | undefined {
  return RIVAL_CONFIGS.find((r) => r.id === id);
}

export function getRivalMove(rivalId: string, moveId: string): RivalMoveConfig | undefined {
  return getRivalConfig(rivalId)?.moves.find((m) => m.id === moveId);
}

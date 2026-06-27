// ============================================================================
// EchelonEngine (Session 5.1) — competitive ranking tier system.
// Tier advances automatically as lifetime earnings grow; each tier grants a
// stacking production multiplier. Tier changes are detected in TICK for
// ambient dispatch and notification push.
// ============================================================================

import type { EchelonState, EchelonTier } from '../game/types';

export const ECHELON_THRESHOLDS: Record<EchelonTier, number> = {
  STARTUP:   0,
  CONTENDER: 10_000,
  PLAYER:    1_000_000,
  LEADER:    100_000_000,
  MOGUL:     10_000_000_000,
  TITAN:     1_000_000_000_000,
};

const TIER_ORDER: EchelonTier[] = [
  'STARTUP', 'CONTENDER', 'PLAYER', 'LEADER', 'MOGUL', 'TITAN',
];

const TIER_PROD: Record<EchelonTier, number> = {
  STARTUP:   1.00,
  CONTENDER: 1.03,
  PLAYER:    1.07,
  LEADER:    1.12,
  MOGUL:     1.20,
  TITAN:     1.30,
};

export const ECHELON_LABELS: Record<EchelonTier, string> = {
  STARTUP:   'Startup',
  CONTENDER: 'Contender',
  PLAYER:    'Market Player',
  LEADER:    'Industry Leader',
  MOGUL:     'Mogul',
  TITAN:     'Titan',
};

export function tierFromEarnings(le: number): EchelonTier {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (le >= ECHELON_THRESHOLDS[TIER_ORDER[i]]) return TIER_ORDER[i];
  }
  return 'STARTUP';
}

export function pointsInTier(le: number, tier: EchelonTier): number {
  const idx = TIER_ORDER.indexOf(tier);
  const lo = ECHELON_THRESHOLDS[tier];
  const next = TIER_ORDER[idx + 1];
  if (!next) return 100;
  const hi = ECHELON_THRESHOLDS[next];
  if (hi <= lo) return 100;
  return Math.min(100, Math.round(((le - lo) / (hi - lo)) * 100));
}

export function getEchelonProdMult(echelon: EchelonState): number {
  return TIER_PROD[echelon.tier] ?? 1;
}

export function defaultEchelonState(): EchelonState {
  return { tier: 'STARTUP', points: 0, lastAdvancedAt: 0 };
}

export function tickEchelon(echelon: EchelonState, le: number, now: number): EchelonState {
  const newTier = tierFromEarnings(le);
  const didAdvance =
    newTier !== echelon.tier &&
    TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(echelon.tier);
  return {
    tier: newTier,
    points: pointsInTier(le, newTier),
    lastAdvancedAt: didAdvance ? now : echelon.lastAdvancedAt,
  };
}

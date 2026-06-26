// ============================================================================
// GuidanceSystem — evaluate co-founder coaching triggers during TICK.
// Returns ids of beats newly eligible to be queued (respects min interval).
// Pure, side-effect free.
// ============================================================================

import { GUIDANCE_BEATS, type GuidanceBeat } from '../data/guidance';
import { incomePerSec, tierUnlocked } from './EconomyEngine';
import { campaignActive } from './MarketingSystem';
import type { GameState } from '../game/types';

/** Minimum gap between guidance pop-ups so it never spams the player. */
export const GUIDANCE_MIN_INTERVAL_MS = 25_000;

function alreadyHandled(state: GameState, id: string): boolean {
  const g = state.guidance;
  if (!g) return false;
  return g.seen.includes(id) || g.queue.includes(id) || g.dismissed.includes(id);
}

function beatEligible(state: GameState, beat: GuidanceBeat, now: number): boolean {
  const t = beat.trigger;
  const m = state.marketing;
  switch (t.type) {
    case 'start':
      // Seeded directly by newGameForSetup; never re-fires from a tick.
      return false;
    case 'reach':
      return (m?.reach ?? 0) >= (t.value ?? 0);
    case 'audience':
      return (m?.audience ?? 0) >= (t.value ?? 0);
    case 'income':
      return incomePerSec(state) >= (t.value ?? 0);
    case 'channel':
      return !!t.channel && (m?.channels?.[t.channel]?.level ?? 0) > 0;
    case 'tier':
      return tierUnlocked(state, t.value ?? 99);
    case 'campaign':
      return campaignActive(state, now);
    case 'firstBuy': {
      // Any facility owned beyond the seeded starter.
      const total = Object.values(state.facilities ?? {}).reduce((a, b) => a + b, 0);
      return total >= 2;
    }
    case 'idle':
      // Driven by offline-return logic, not ticks.
      return false;
    default:
      return false;
  }
}

/**
 * Returns ids of guidance beats that should be queued this tick.
 * Respects the min interval via guidance.lastShownAt and the queue being empty
 * (so beats surface one at a time, not in a flood).
 */
export function newlyEligibleGuidance(state: GameState, now: number = Date.now()): string[] {
  const g = state.guidance;
  if (!g) return [];
  // Do not stack: only consider new beats when nothing is queued and the
  // cooldown since the last shown beat has elapsed.
  if (g.queue.length > 0) return [];
  if (now - (g.lastShownAt || 0) < GUIDANCE_MIN_INTERVAL_MS) return [];

  for (const beat of GUIDANCE_BEATS) {
    if (alreadyHandled(state, beat.id)) continue;
    if (beatEligible(state, beat, now)) return [beat.id];
  }
  return [];
}

/** Force-queue the idle/return beat (called from offline-return path). */
export const IDLE_BEAT_ID = 'g-idle-return';

// ============================================================================
// WorkforceEngine  -  named employees with collective morale (Session 4.1).
//
// Morale is a shared heartbeat:
//   High ethics + strong companions → morale rises → output bonus
//   Rival pressure + ruthless path  → morale drains → output penalty
//
// All functions are pure; state mutation lives in the reducer.
// ============================================================================

import { generateWorker } from '../data/workers';
import type { GameState, WorkerMood, WorkerState } from '../game/types';

// ---- Mood classification ----------------------------------------------------

export function moodFromMorale(morale: number): WorkerMood {
  if (morale < 20) return 'BURNT_OUT';
  if (morale < 40) return 'DISENGAGED';
  if (morale < 65) return 'NEUTRAL';
  if (morale < 85) return 'ENGAGED';
  return 'INSPIRED';
}

// ---- Workforce size ---------------------------------------------------------

function targetWorkerCount(lifetimeEarnings: number): number {
  if (lifetimeEarnings >= 1_000_000_000) return 10;
  if (lifetimeEarnings >= 100_000_000) return 9;
  if (lifetimeEarnings >= 10_000_000) return 8;
  if (lifetimeEarnings >= 1_000_000) return 7;
  if (lifetimeEarnings >= 100_000) return 6;
  if (lifetimeEarnings >= 10_000) return 5;
  if (lifetimeEarnings >= 1_000) return 4;
  return 3;
}

/**
 * Ensure the workforce has the right number of workers for the current era.
 * Workers are never fired here  -  departures come through story events.
 */
export function syncWorkforceSize(
  workforce: WorkerState[],
  state: GameState,
  now: number
): WorkerState[] {
  const target = targetWorkerCount(state.lifetimeEarnings ?? 0);
  const gameSeed = Math.floor((state.setup?.foundedAt ?? 0) / 1000);
  const next = [...workforce];
  while (next.length < target) {
    next.push(generateWorker(next.length, gameSeed, now));
  }
  return next;
}

// ---- Collective production multiplier ---------------------------------------

/**
 * Average morale → production multiplier.
 *   0   → 0.65× (burnt-out team, −35%)
 *   50  → 1.025× (neutral, essentially no effect)
 *   100 → 1.40× (inspired team, +40%)
 */
export function getWorkforceMult(workforce: WorkerState[]): number {
  if (workforce.length === 0) return 1;
  const avg = workforce.reduce((s, w) => s + w.morale, 0) / workforce.length;
  return 0.65 + (avg / 100) * 0.75;
}

// ---- Morale drift -----------------------------------------------------------

const PER_MIN = 1 / 60;

/**
 * Update morale for every worker based on the current game context.
 * Call once per TICK; dt is seconds elapsed.
 */
export function tickWorkforce(
  state: GameState,
  dt: number,
  now: number
): WorkerState[] {
  const workforce = syncWorkforceSize(state.workforce ?? [], state, now);

  const ethics = state.story?.ethics ?? 0;
  const activePressures = (state.rivalPressures ?? []).filter((p) => p.endsAt > now);
  const coalitionActive = state.coalitionActive ?? false;

  const cs = state.companions ?? [];
  const avgTrust =
    cs.length > 0 ? cs.reduce((s, c) => s + c.trust, 0) / cs.length : 50;

  const driftPerSec =
    -0.5 * PER_MIN +                                             // natural entropy
    (ethics > 20 ? 0.3 * PER_MIN : ethics < -20 ? -0.5 * PER_MIN : 0) + // ethics axis
    (activePressures.length > 0 ? -0.8 * PER_MIN : 0) +         // rival attacks
    (coalitionActive ? -1.5 * PER_MIN : 0) +                    // coalition dogpile
    (avgTrust > 60 ? 0.2 * PER_MIN : 0);                        // companion leadership

  const delta = driftPerSec * dt;

  return workforce.map((w) => ({
    ...w,
    morale: Math.max(0, Math.min(100, w.morale + delta)),
  }));
}

// ---- Player morale boost ----------------------------------------------------

export function shiftWorkerMorale(
  workforce: WorkerState[],
  workerId: string,
  delta: number,
  now: number
): WorkerState[] {
  return workforce.map((w) => {
    if (w.id !== workerId) return w;
    return {
      ...w,
      morale: Math.max(0, Math.min(100, w.morale + delta)),
      lastEventAt: now,
    };
  });
}

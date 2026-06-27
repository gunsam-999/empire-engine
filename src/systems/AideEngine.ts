// ============================================================================
// AideEngine  -  domain specialist cabinet (Session 4.2).
//
// Aides provide passive production bonuses when loyal (≥ 75) and can be
// deployed for a global boost. Loyalty drifts based on ethics, rival
// pressure, and companion health  -  the same levers as workforce morale.
// ============================================================================

import { AIDE_CONFIGS } from '../data/aides';
import type { AideState, GameState } from '../game/types';

export const BRIEF_COOLDOWN_MS  = 120_000; // 120 s
export const DEPLOY_COOLDOWN_MS = 600_000; // 600 s
const PASSIVE_THRESHOLD = 75;

// ---- Roster sync ------------------------------------------------------------

/** Ensure every aide whose unlockLE ≤ lifetimeEarnings is in the roster. */
export function syncAideRoster(state: GameState, now: number): AideState[] {
  const le  = state.lifetimeEarnings ?? 0;
  const existing = state.aides ?? [];
  const existingIds = new Set(existing.map((a) => a.id));

  const next = [...existing];
  for (const cfg of AIDE_CONFIGS) {
    if (cfg.unlockLE <= le && !existingIds.has(cfg.id)) {
      next.push({ id: cfg.id, loyalty: 50, lastBriefAt: 0, deployCooldownUntil: 0 });
    }
  }
  return next;
}

// ---- Passive multiplier -----------------------------------------------------

/**
 * Multiplicative bonus from all aides at loyalty ≥ 75.
 * Returns a value ≥ 1 (e.g. 1.08 for +8% combined).
 */
export function getAidePassiveMult(aides: AideState[]): number {
  let mult = 1;
  for (const aide of aides) {
    if (aide.loyalty < PASSIVE_THRESHOLD) continue;
    const cfg = AIDE_CONFIGS.find((c) => c.id === aide.id);
    if (cfg) mult *= 1 + cfg.passiveMult;
  }
  return mult;
}

// ---- Loyalty drift ----------------------------------------------------------

const PER_MIN = 1 / 60;

export function tickAides(state: GameState, dt: number, now: number): AideState[] {
  const aides = syncAideRoster(state, now);

  const ethics = state.story?.ethics ?? 0;
  const activePressures = (state.rivalPressures ?? []).filter((p) => p.endsAt > now);
  const cs = state.companions ?? [];
  const avgTrust = cs.length > 0 ? cs.reduce((s, c) => s + c.trust, 0) / cs.length : 50;

  const driftPerSec =
    -0.4 * PER_MIN +
    (ethics > 20  ?  0.5 * PER_MIN : ethics < -20 ? -0.3 * PER_MIN : 0) +
    (activePressures.length > 0 ? -0.6 * PER_MIN : 0) +
    (avgTrust > 60 ?  0.2 * PER_MIN : 0);

  const delta = driftPerSec * dt;

  return aides.map((a) => ({
    ...a,
    loyalty: Math.max(0, Math.min(100, a.loyalty + delta)),
  }));
}

// ---- Player interactions ----------------------------------------------------

export function canBrief(aide: AideState, now: number): boolean {
  return now - aide.lastBriefAt >= BRIEF_COOLDOWN_MS;
}

export function canDeploy(aide: AideState, now: number): boolean {
  return aide.loyalty >= 50 && aide.deployCooldownUntil <= now;
}

export function briefAide(aides: AideState[], aideId: string, now: number): AideState[] {
  return aides.map((a) => {
    if (a.id !== aideId || !canBrief(a, now)) return a;
    return { ...a, loyalty: Math.min(100, a.loyalty + 15), lastBriefAt: now };
  });
}

/** Mark an aide as deployed (cooldown + small loyalty cost). */
export function markDeployed(aides: AideState[], aideId: string, now: number): AideState[] {
  return aides.map((a) => {
    if (a.id !== aideId) return a;
    return {
      ...a,
      loyalty: Math.max(0, a.loyalty - 10),
      deployCooldownUntil: now + DEPLOY_COOLDOWN_MS,
    };
  });
}

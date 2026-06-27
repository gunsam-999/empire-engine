// ============================================================================
// CompanionEngine  -  mirror system to the RivalEngine (Session 3.4).
// Where rivals have aggression that rises and strikes, companions have trust
// that rises and gives. All functions are pure and deterministic.
// ============================================================================

import { COMPANION_CONFIGS, getCompanionConfig, rungGte } from '../data/companions';
import type {
  CompanionState,
  GameState,
  TrustRung,
} from '../game/types';

// ---- Trust ladder -----------------------------------------------------------

const TRUST_THRESHOLDS: Record<TrustRung, number> = {
  ACQUAINTANCE: 0,
  COLLEAGUE: 25,
  CONFIDANT: 50,
  INNER_CIRCLE: 75,
  LEGACY: 95,
  ESTRANGED: -Infinity, // terminal; only set by explicit betrayal
};

export function rungFromTrust(trust: number): TrustRung {
  if (trust >= 95) return 'LEGACY';
  if (trust >= 75) return 'INNER_CIRCLE';
  if (trust >= 50) return 'CONFIDANT';
  if (trust >= 25) return 'COLLEAGUE';
  return 'ACQUAINTANCE';
}

export function clampTrust(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Natural trust decay per second  -  slow neglect penalty. */
const TRUST_DECAY_PER_SEC = 0.5 / 60; // −0.5 per minute

// ---- Spawn / roster sync ---------------------------------------------------

/** IDs of companions that should be active given current progression. */
function activeCompanionIds(state: GameState): string[] {
  const le = state.lifetimeEarnings || 0;
  const ids = ['cofounder']; // always present after setup
  if (le >= 10_000) ids.push('lieutenant-1');
  if (le >= 5_000_000) ids.push('strategist');
  return ids;
}

export function syncCompanionRoster(
  companions: CompanionState[],
  state: GameState,
  now: number
): CompanionState[] {
  const ids = activeCompanionIds(state);
  const existing = new Set(companions.map((c) => c.id));
  const next = companions.filter((c) => ids.includes(c.id));
  for (const id of ids) {
    if (!existing.has(id)) {
      next.push({
        id,
        trust: 20, // start at ACQUAINTANCE, early relationship
        rung: 'ACQUAINTANCE',
        lastActionAt: now,
        cooldownUntil: now,
        pendingTrustDelta: 0,
        loyaltyHeldSec: 0,
      });
    }
  }
  return next;
}

// ---- Move selection (mirror of rival engine) --------------------------------

/**
 * Choose a supportive action based on the player's current situation.
 * The companion director shores up weaknesses the rival director exploits.
 */
function selectSupportiveMove(
  companionId: string,
  rung: TrustRung,
  state: GameState
): string | null {
  const cfg = getCompanionConfig(companionId);
  if (!cfg) return null;

  const eligible = cfg.moves.filter((m) => rungGte(rung, m.minRung));
  if (eligible.length === 0) return null;

  // Priority: if rival is attacking, prefer cover/rally; otherwise boost/counsel.
  const activePressures = (state.rivalPressures ?? []).filter(
    (p) => p.endsAt > Date.now()
  );
  const underAttack = activePressures.length > 0;

  if (underAttack) {
    const defensive = eligible.filter(
      (m) => m.kind === 'cover' || m.kind === 'rally'
    );
    if (defensive.length > 0) return defensive[0].kind;
  }

  // Default: pick the highest-rung eligible move.
  const sorted = [...eligible].sort(
    (a, b) =>
      ['acquaintance', 'colleague', 'confidant', 'inner_circle', 'legacy'].indexOf(
        b.minRung.toLowerCase()
      ) -
      ['acquaintance', 'colleague', 'confidant', 'inner_circle', 'legacy'].indexOf(
        a.minRung.toLowerCase()
      )
  );
  return sorted[0].kind;
}

// ---- Evaluate a companion ---------------------------------------------------

export function evaluateCompanion(
  companion: CompanionState,
  state: GameState,
  now: number
): { companion: CompanionState; firedMove: string | null } {
  const cfg = getCompanionConfig(companion.id);
  if (!cfg) return { companion, firedMove: null };

  // Terminal rungs are not re-evaluated.
  if (companion.rung === 'LEGACY' || companion.rung === 'ESTRANGED') {
    return { companion, firedMove: null };
  }

  // Not yet time to evaluate.
  if (now < companion.lastActionAt + cfg.evalIntervalSec * 1000) {
    return { companion, firedMove: null };
  }

  // On cooldown.
  if (now < companion.cooldownUntil) {
    return { companion, firedMove: null };
  }

  const elapsedSec = (now - companion.lastActionAt) / 1000;
  const decay = elapsedSec * TRUST_DECAY_PER_SEC;

  // Apply pending deltas (from player actions) and natural decay.
  const newTrust = clampTrust(companion.trust - decay + companion.pendingTrustDelta);
  const newRung = rungFromTrust(newTrust);

  // Update loyalty timer.
  const newLoyaltyHeld =
    newRung === 'INNER_CIRCLE' || newRung === 'LEGACY'
      ? Math.min(companion.loyaltyHeldSec + elapsedSec, 600)
      : Math.max(0, companion.loyaltyHeldSec - elapsedSec / 3);

  // Select a supportive action.
  const moveKind = selectSupportiveMove(companion.id, newRung, state);

  const moveCfg = moveKind
    ? cfg.moves.find((m) => m.kind === moveKind) ?? null
    : null;

  const cooldown = moveCfg ? moveCfg.cooldownSec * 1000 : 30_000;

  return {
    companion: {
      ...companion,
      trust: newTrust,
      rung: newRung,
      loyaltyHeldSec: newLoyaltyHeld,
      pendingTrustDelta: 0,
      lastActionAt: now,
      cooldownUntil: now + cooldown,
    },
    firedMove: moveKind,
  };
}

// ---- Companion boost multiplier (applied in EconomyEngine) -----------------

/**
 * Combined passive multiplier from all companions at Colleague+ rung.
 * A companion's passive boost scales with their trust.
 */
export function getCompanionBoostMult(
  companions: CompanionState[],
  now: number,
  activeBoosts: Array<{ companionId: string; mult: number; endsAt: number }>
): number {
  let mult = 1;

  // Passive boost from rung.
  for (const c of companions) {
    if (c.rung === 'ESTRANGED') continue;
    const cfg = getCompanionConfig(c.id);
    if (!cfg) continue;
    if (
      c.rung === 'COLLEAGUE' ||
      c.rung === 'CONFIDANT' ||
      c.rung === 'INNER_CIRCLE' ||
      c.rung === 'LEGACY'
    ) {
      const rungBonus = 1 + cfg.passiveBoostMult * (c.trust / 100);
      mult *= rungBonus;
    }
  }

  // Active boosts (rally, signature, etc.).
  for (const b of activeBoosts) {
    if (b.endsAt > now) mult *= b.mult;
  }

  return mult;
}

// ---- Full companion tick ----------------------------------------------------

export function tickCompanions(
  state: GameState,
  now: number
): {
  companions: CompanionState[];
  companionBoosts: Array<{ companionId: string; mult: number; endsAt: number }>;
  firedMoves: Array<{ companionId: string; kind: string; message: string }>;
} {
  const companions = syncCompanionRoster(state.companions ?? [], state, now);
  // Expire old active boosts.
  const activeBoosts = (state.companionBoosts ?? []).filter((b) => b.endsAt > now);

  const nextCompanions: CompanionState[] = [];
  const firedMoves: Array<{ companionId: string; kind: string; message: string }> = [];

  for (const companion of companions) {
    const { companion: updated, firedMove } = evaluateCompanion(companion, state, now);
    nextCompanions.push(updated);

    if (firedMove) {
      const cfg = getCompanionConfig(companion.id);
      const moveCfg = cfg?.moves.find((m) => m.kind === firedMove);
      if (moveCfg) {
        firedMoves.push({
          companionId: companion.id,
          kind: firedMove,
          message: moveCfg.message,
        });
        // If the move has a production boost, record it.
        if (
          (firedMove === 'rally' || firedMove === 'signature' || firedMove === 'boost') &&
          moveCfg.mult &&
          moveCfg.durationSec
        ) {
          activeBoosts.push({
            companionId: companion.id,
            mult: moveCfg.mult,
            endsAt: now + moveCfg.durationSec * 1000,
          });
        }
      }
    }
  }

  return { companions: nextCompanions, companionBoosts: activeBoosts, firedMoves };
}

// ---- Trust table helpers ---------------------------------------------------

export function shiftCompanionTrust(
  companions: CompanionState[],
  companionId: string,
  delta: number
): CompanionState[] {
  return companions.map((c) => {
    if (c.id !== companionId) return c;
    const newTrust = clampTrust(c.trust + delta);
    const newRung = rungFromTrust(newTrust);
    return { ...c, trust: newTrust, rung: newRung, pendingTrustDelta: 0 };
  });
}

// ---- Crossover: leaving companion becomes rival ----------------------------

/**
 * When a companion reaches ESTRANGED, check if they should cross over to the
 * rival engine. A crossed-over companion spawns with high aggression.
 * Returns the rival IDs that were crossed over (caller adds them to rivals[]).
 */
export function checkCompanionCrossover(companions: CompanionState[]): string[] {
  return companions
    .filter((c) => c.rung === 'ESTRANGED' && c.trust <= 5)
    .map((c) => `ex-companion-${c.id}`);
}

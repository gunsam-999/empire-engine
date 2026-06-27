// ============================================================================
// AideEngine  -  inner circle mechanics (Session B).
//
// Each aide has a unique mechanic kind that alters the game loop differently:
//   legal_fortress    Marcus  - defense charges absorb rival strikes (no prod mult)
//   truth_cycle       Layla   - ethics score scales directly into production mult
//   compound_engine   Yuki    - accumulates a saved buffer; cost scaling reduction
//   acceleration_loop Dev     - velocity (delta earnings/s) multiplies into prod
//   resilience_buffer Sofia   - converts income dips to temporary soft-floor buffer
//   culture_mult      Ade     - workforce morale chains into production bonus
//
// Loyalty drifts based on ethics, rival pressure, and companion trust (same
// levers as workforce morale). Arc stage advances at loyalty thresholds and
// fires ambient feed messages.
// ============================================================================

import { AIDE_CONFIGS, getAideConfig } from '../data/aides';
import { AIDE_ARCS, getAideArc, getNextArcStage } from '../data/aideArcs';
import type { AideState, GameState } from '../game/types';

export const BRIEF_COOLDOWN_MS  = 120_000; // 2 min
export const DEPLOY_COOLDOWN_MS = 600_000; // 10 min

const PASSIVE_LOYALTY_THRESHOLD = 75;

// Compound buffer: 3% of each tick's earnings goes to Yuki's buffer
const COMPOUND_RATE = 0.03;
// Resilience buffer: decays to zero over 5 min (300 s)
const RESILIENCE_DECAY_SEC = 300;
// Defense charge: 1 charge every 5 min when ethics > 15
const DEFENSE_CHARGE_INTERVAL_SEC = 300;
const DEFENSE_CHARGE_MAX = 3;

// ---- Roster sync ------------------------------------------------------------

/**
 * Ensures every aide in the inner circle is in the roster.
 * The chosen aide starts at loyalty 80 (bonded); others start at 50.
 */
export function syncAideRoster(state: GameState, now: number): AideState[] {
  const existing = state.aides ?? [];
  const existingIds = new Set(existing.map((a) => a.id));
  const chosenId = state.setup?.chosenAideId;

  const next = [...existing];
  for (const cfg of AIDE_CONFIGS) {
    if (existingIds.has(cfg.id)) continue;
    next.push({
      id: cfg.id,
      loyalty: cfg.id === chosenId ? 80 : 50,
      lastBriefAt: 0,
      deployCooldownUntil: 0,
      arcStage: 0,
      defenseCharges: cfg.mechanicKind === 'legal_fortress' ? 0 : undefined,
      compoundBuffer: cfg.mechanicKind === 'compound_engine' ? 0 : undefined,
      resilienceBuffer: cfg.mechanicKind === 'resilience_buffer' ? 0 : undefined,
      resilienceBufferDecayUntil: undefined,
      lastLESnapshot: undefined,
    });
  }
  return next;
}

// ---- Tick -------------------------------------------------------------------

export function tickAides(state: GameState, dt: number, now: number): AideState[] {
  const aides = syncAideRoster(state, now);
  const ethics = state.story?.ethics ?? 0;
  const activePressures = (state.rivalPressures ?? []).filter((p) => p.endsAt > now);
  const cs = state.companions ?? [];
  const avgTrust = cs.length > 0 ? cs.reduce((s, c) => s + c.trust, 0) / cs.length : 50;

  // Loyalty drift (same for all aides)
  const PER_MIN = 1 / 60;
  const driftPerSec =
    -0.4 * PER_MIN +
    (ethics > 20  ?  0.5 * PER_MIN : ethics < -20 ? -0.3 * PER_MIN : 0) +
    (activePressures.length > 0 ? -0.6 * PER_MIN : 0) +
    (avgTrust > 60 ?  0.2 * PER_MIN : 0);

  const loyaltyDelta = driftPerSec * dt;

  // Not used at tick level — velocity derived from LE delta in getMechanicBonus

  return aides.map((aide): AideState => {
    const cfg = getAideConfig(aide.id);
    if (!cfg) return aide;

    const newLoyalty = Math.max(0, Math.min(100, aide.loyalty + loyaltyDelta));
    let next: AideState = { ...aide, loyalty: newLoyalty };

    // Arc stage progression
    const arc = getAideArc(aide.id);
    if (arc && newLoyalty > aide.loyalty) {
      const nextStage = getNextArcStage(aide.arcStage, newLoyalty, arc);
      if (nextStage > aide.arcStage) {
        next = { ...next, arcStage: nextStage };
      }
    }

    // Mechanic-specific tick updates
    switch (cfg.mechanicKind) {
      case 'legal_fortress':
        next = tickLegalFortress(next, state, dt, ethics);
        break;
      case 'compound_engine':
        next = tickCompoundEngine(next, state, dt);
        break;
      case 'resilience_buffer':
        next = tickResilienceBuffer(next, state, dt, now);
        break;
      case 'acceleration_loop':
        // Snapshot LE for next tick's velocity calculation
        next = { ...next, lastLESnapshot: state.lifetimeEarnings ?? 0 };
        break;
      default:
        break;
    }

    return next;
  });
}

function tickLegalFortress(aide: AideState, state: GameState, dt: number, ethics: number): AideState {
  if (!aide.loyalty || aide.loyalty < PASSIVE_LOYALTY_THRESHOLD) return aide;
  const currentCharges = aide.defenseCharges ?? 0;
  if (currentCharges >= DEFENSE_CHARGE_MAX) return aide;
  // Ethics must be > 15 to regenerate charges
  if (ethics <= 15) return aide;
  // One charge per interval; check if dt tips us over
  // We track accumulated time via a simple rate: charge every DEFENSE_CHARGE_INTERVAL_SEC
  // We use a probabilistic tick: if random < dt/interval, grant a charge
  const prob = dt / DEFENSE_CHARGE_INTERVAL_SEC;
  if (Math.random() < prob) {
    return { ...aide, defenseCharges: Math.min(DEFENSE_CHARGE_MAX, currentCharges + 1) };
  }
  return aide;
}

function tickCompoundEngine(aide: AideState, state: GameState, dt: number): AideState {
  if (aide.loyalty < PASSIVE_LOYALTY_THRESHOLD) return aide;
  // Estimate earned this tick from LE delta (or snapshot-based earnings/s heuristic)
  const le = state.lifetimeEarnings ?? 0;
  const prevLE = aide.lastLESnapshot ?? le;
  const earnedThisTick = Math.max(0, le - prevLE);
  const accrual = earnedThisTick * COMPOUND_RATE;
  return {
    ...aide,
    compoundBuffer: (aide.compoundBuffer ?? 0) + accrual,
    lastLESnapshot: le,
  };
}

function tickResilienceBuffer(aide: AideState, state: GameState, dt: number, now: number): AideState {
  const le = state.lifetimeEarnings ?? 0;
  const prevLE = aide.lastLESnapshot ?? le;
  // Estimate income rate: delta LE / dt
  const currentRate = dt > 0 ? (le - prevLE) / dt : 0;
  const prevRate = dt > 0 ? (prevLE - (aide.lastLESnapshot ?? prevLE)) / dt : 0;

  let buffer = aide.resilienceBuffer ?? 0;
  const decayUntil = aide.resilienceBufferDecayUntil ?? 0;

  // Decay buffer over RESILIENCE_DECAY_SEC
  if (buffer > 0 && now < decayUntil) {
    const remaining = Math.max(1, (decayUntil - now) / 1000);
    const decayPerSec = buffer / remaining;
    buffer = Math.max(0, buffer - decayPerSec * dt);
  } else if (now >= decayUntil) {
    buffer = 0;
  }

  // When LE growth rate dips, convert 50% of the lost income to buffer
  if (aide.loyalty >= PASSIVE_LOYALTY_THRESHOLD && currentRate < prevRate && dt > 0) {
    const deficit = (prevRate - currentRate) * dt;
    buffer += deficit * 0.5;
    return {
      ...aide,
      resilienceBuffer: buffer,
      resilienceBufferDecayUntil: now + RESILIENCE_DECAY_SEC * 1000,
      lastLESnapshot: le,
    };
  }

  return { ...aide, resilienceBuffer: buffer, lastLESnapshot: le };
}

// ---- Production multiplier --------------------------------------------------

/**
 * Compute the stacked production multiplier from ALL aides at loyalty ≥ 75.
 * Each aide contributes its unique mechanic bonus on top of the baseline passiveMult.
 */
export function getAidePassiveMult(aides: AideState[], state: GameState): number {
  let mult = 1;
  for (const aide of aides) {
    if (aide.loyalty < PASSIVE_LOYALTY_THRESHOLD) continue;
    const cfg = getAideConfig(aide.id);
    if (!cfg) continue;

    // Baseline passive mult for ALL active aides
    mult *= 1 + cfg.passiveMult;

    // Unique mechanic bonus
    const mechanicBonus = getMechanicBonus(aide, cfg.mechanicKind, state);
    mult *= 1 + mechanicBonus;
  }
  return mult;
}

function getMechanicBonus(aide: AideState, kind: string, state: GameState): number {
  switch (kind) {
    case 'legal_fortress':
      // Defense charges don't add production — they protect it. No bonus here.
      return 0;

    case 'truth_cycle': {
      // +0.8% per 5 ethics above 0, negative penalty below 0
      const ethics = state.story?.ethics ?? 0;
      return Math.max(-0.2, (ethics / 5) * 0.008);
    }

    case 'compound_engine':
      // Permanent 6% cost reduction handled in getCostMult; no extra prod bonus
      return 0;

    case 'acceleration_loop': {
      // Velocity: rate of LE growth since last snapshot
      const le = state.lifetimeEarnings ?? 0;
      const prevLE = aide.lastLESnapshot ?? le;
      const leGain = Math.max(0, le - prevLE);
      // Normalize: +1% bonus per $1000 of LE gained since last snapshot, capped at +15%
      return Math.min(0.15, leGain * 0.00001);
    }

    case 'resilience_buffer':
      // Buffer provides a soft production floor but no direct mult; handled in income
      return 0;

    case 'culture_mult': {
      // Every 10 morale above 50 = +2.5%
      const workforce = state.workforce ?? [];
      const avgMorale = workforce.length > 0
        ? workforce.reduce((s, w) => s + (w.morale ?? 50), 0) / workforce.length
        : 50;
      const excess = Math.max(0, avgMorale - 50);
      return Math.min(0.125, (Math.floor(excess / 10)) * 0.025);
    }

    default:
      return 0;
  }
}

/** Compound Engine: permanent cost scaling reduction when loyalty ≥ 75. */
export function getAideCostMult(aides: AideState[]): number {
  const yuki = aides.find((a) => a.id === 'yuki');
  if (!yuki || yuki.loyalty < PASSIVE_LOYALTY_THRESHOLD) return 1;
  // 6% cost scaling reduction (stage 3: 10%)
  const reduction = yuki.arcStage >= 3 ? 0.10 : 0.06;
  return 1 - reduction;
}

/** Resilience Buffer: extra income from buffer decaying into earnings each tick. */
export function getResilienceBufferIncome(aides: AideState[], dt: number): number {
  const sofia = aides.find((a) => a.id === 'sofia');
  if (!sofia || sofia.loyalty < PASSIVE_LOYALTY_THRESHOLD) return 0;
  const buffer = sofia.resilienceBuffer ?? 0;
  if (buffer <= 0) return 0;
  // Decay contributes 10% of remaining buffer per minute to income
  const decayRate = 0.10 / 60;
  return buffer * decayRate * dt;
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

export function markDeployed(aides: AideState[], aideId: string, now: number): AideState[] {
  return aides.map((a) => {
    if (a.id !== aideId) return a;
    const cfg = getAideConfig(aideId);
    let next: AideState = {
      ...a,
      loyalty: Math.max(0, a.loyalty - 8),
      deployCooldownUntil: now + DEPLOY_COOLDOWN_MS,
    };
    // Mechanic-specific deploy effects
    if (cfg?.mechanicKind === 'compound_engine') {
      // Yuki: buffer will be released as cash in GameContext dispatch; zero it here
      next = { ...next, compoundBuffer: 0 };
    }
    if (cfg?.mechanicKind === 'resilience_buffer') {
      // Sofia: refill resilience buffer to a reasonable starting value
      next = {
        ...next,
        resilienceBuffer: 500,
        resilienceBufferDecayUntil: now + RESILIENCE_DECAY_SEC * 1000,
      };
    }
    return next;
  });
}

/**
 * Consume one Marcus defense charge when a rival strike lands.
 * Returns [updatedAides, didAbsorb].
 */
export function consumeDefenseCharge(
  aides: AideState[],
  now: number
): [AideState[], boolean] {
  const marcus = aides.find((a) => a.id === 'marcus');
  if (!marcus || (marcus.defenseCharges ?? 0) <= 0 || marcus.loyalty < PASSIVE_LOYALTY_THRESHOLD) {
    return [aides, false];
  }
  const updated = aides.map((a) =>
    a.id === 'marcus' ? { ...a, defenseCharges: (a.defenseCharges ?? 1) - 1 } : a
  );
  return [updated, true];
}


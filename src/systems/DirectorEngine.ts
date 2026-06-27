// ============================================================================
// DirectorEngine  -  hardcoded pacing / orchestration layer (Session 3.5).
//
// Reads signals from GameState, classifies the current phase, then returns
// a DirectorDecision that the TICK handler applies BEFORE writing outputs.
//
// Nothing here is random. Given the same state, the director always makes
// the same call. All logic is threshold tables  -  no AI, no probabilities.
// ============================================================================

import { incomePerSec } from './EconomyEngine';
import type { CompanionState, DirectorPhase, DirectorState, GameState } from '../game/types';

// ---- Signals ----------------------------------------------------------------

export interface DirectorSignals {
  earningsRate: number;
  lifetimeEarnings: number;
  rivalThreatLevel: number;     // max aggression across active rivals
  activeAttackCount: number;    // rival pressures currently active
  coalitionActive: boolean;
  companionCount: number;
  companionTrustAvg: number;    // 0–100; 0 if no companions
  mostTrustedCompanion: CompanionState | null;
  reputation: number;           // ethics axis, −100 to +100
  storyQueueLength: number;
  beatsSeen: number;
  timeSinceLastBeatMs: number;
  timeSinceLastEscalationMs: number;
  timeSinceLastNudgeMs: number;
  timeSinceLastMicroMs: number; // micro-event / golden bubble
  phase: DirectorPhase;
}

export function readSignals(state: GameState, now: number): DirectorSignals {
  const le = state.lifetimeEarnings || 0;
  const rivals = state.rivals ?? [];
  const pressures = (state.rivalPressures ?? []).filter((p) => p.endsAt > now);
  const companions = state.companions ?? [];

  const threatLevel = rivals.reduce(
    (mx, r) =>
      r.posture === 'DEFEATED' || r.posture === 'ALLIED' ? mx : Math.max(mx, r.aggression),
    0
  );

  const companionTrustSum = companions.reduce((s, c) => s + c.trust, 0);
  const companionTrustAvg = companions.length > 0 ? companionTrustSum / companions.length : 0;
  const mostTrustedCompanion = companions.length > 0
    ? companions.reduce((best, c) => (c.trust > best.trust ? c : best), companions[0])
    : null;

  const director = state.director;

  return {
    earningsRate: incomePerSec(state),
    lifetimeEarnings: le,
    rivalThreatLevel: threatLevel,
    activeAttackCount: pressures.length,
    coalitionActive: state.coalitionActive ?? false,
    companionCount: companions.length,
    companionTrustAvg,
    mostTrustedCompanion,
    reputation: state.story?.ethics ?? 0,
    storyQueueLength: state.story?.queue.length ?? 0,
    beatsSeen: state.story?.seen.length ?? 0,
    timeSinceLastBeatMs: now - (director?.lastBeatAt ?? 0),
    timeSinceLastEscalationMs: now - (director?.lastEscalationAt ?? 0),
    timeSinceLastNudgeMs: now - (director?.lastNudgeAt ?? 0),
    timeSinceLastMicroMs: now - (state.events?.lastMicroAt ?? 0),
    phase: director?.currentPhase ?? classifyPhase(le),
  };
}

// ---- Phase classifier -------------------------------------------------------

export function classifyPhase(lifetimeEarnings: number): DirectorPhase {
  if (lifetimeEarnings >= 1_000_000_000) return 'TITAN';
  if (lifetimeEarnings >= 10_000_000) return 'ESTABLISHED';
  if (lifetimeEarnings >= 100_000) return 'SCALING';
  if (lifetimeEarnings >= 1_000) return 'GROWING';
  return 'BOOTSTRAPPING';
}

// ---- Decision ---------------------------------------------------------------

export interface DirectorDecision {
  /**
   * Multiplier on each rival's passive aggression gain this tick.
   * < 1 gives the player breathing room; > 1 escalates.
   */
  rivalAggModifier: number;

  /**
   * Companion to nudge trust on when the player is under pressure.
   * null = no nudge this tick.
   */
  companionTrustNudge: { companionId: string; delta: number } | null;

  /**
   * How many newly-eligible story beats to enqueue this tick.
   * 0 = suppress; 1 = allow one; ≥2 = allow burst.
   */
  maxNewBeats: number;

  /**
   * True if conditions are right to trigger a golden-bubble micro-event.
   */
  nudgeGoldenBubble: boolean;

  /** Updated director state to persist into GameState. */
  nextDirectorState: DirectorState;
}

// ---- Decision table ---------------------------------------------------------

// How many ms between beats before the director stops suppressing the queue.
const BEAT_MIN_INTERVAL_MS = 30_000; // 30 s

// Minimum ms between director-triggered escalations (rival agg boosts).
const ESCALATION_COOLDOWN_MS = 180_000; // 3 min

// Quiet period before the director escalates a dormant rival.
const QUIET_ESCALATION_THRESHOLD_MS = 120_000; // 2 min

// How often the director can nudge companion trust.
const TRUST_NUDGE_COOLDOWN_MS = 60_000; // 1 min

// Minimum ms between golden bubble nudges.
const BUBBLE_NUDGE_COOLDOWN_MS = 90_000; // 90 s

export function runDirector(state: GameState, now: number): DirectorDecision {
  const signals = readSignals(state, now);
  const phase = classifyPhase(signals.lifetimeEarnings);

  // ---- 1. Rival aggression modifier ----------------------------------------

  let rivalAggModifier = 1;

  if (signals.activeAttackCount >= 2 && signals.companionTrustAvg < 30) {
    // Player is being overwhelmed and their inner circle is weak.
    rivalAggModifier = 0.4;
  } else if (signals.coalitionActive) {
    // Coalition is running; maintain pressure but don't pile on.
    rivalAggModifier = 0.7;
  } else if (
    signals.activeAttackCount === 0 &&
    signals.rivalThreatLevel < 30 &&
    signals.timeSinceLastEscalationMs > QUIET_ESCALATION_THRESHOLD_MS &&
    signals.timeSinceLastEscalationMs > ESCALATION_COOLDOWN_MS &&
    phase !== 'BOOTSTRAPPING'
  ) {
    // Long quiet period  -  apply gentle escalation pressure.
    rivalAggModifier = 1.6;
  } else if (phase === 'TITAN') {
    // Always-on escalation in the endgame.
    rivalAggModifier = 1.2;
  }

  // Track escalation events (when we boosted).
  const didEscalate = rivalAggModifier > 1.3;

  // ---- 2. Companion trust nudge -------------------------------------------

  let companionTrustNudge: DirectorDecision['companionTrustNudge'] = null;

  const canNudge =
    signals.timeSinceLastNudgeMs >= TRUST_NUDGE_COOLDOWN_MS &&
    signals.mostTrustedCompanion !== null &&
    signals.mostTrustedCompanion.rung !== 'ESTRANGED';

  if (canNudge) {
    if (signals.activeAttackCount > 0 && signals.companionTrustAvg < 40) {
      // Player is under attack and companions are lukewarm  -  give a small boost.
      companionTrustNudge = { companionId: signals.mostTrustedCompanion!.id, delta: 2 };
    } else if (signals.rivalThreatLevel > 65 && signals.companionTrustAvg < 60) {
      // High threat; companions are present but not deep enough.
      companionTrustNudge = { companionId: signals.mostTrustedCompanion!.id, delta: 1 };
    }
  }

  // ---- 3. Story pacing -------------------------------------------------------

  let maxNewBeats: number;
  if (signals.storyQueueLength >= 2) {
    // Queue is backlogged; freeze new beats until player clears it.
    maxNewBeats = 0;
  } else if (signals.storyQueueLength === 1) {
    // One beat pending; allow another only if enough time has passed.
    maxNewBeats = signals.timeSinceLastBeatMs >= BEAT_MIN_INTERVAL_MS * 2 ? 1 : 0;
  } else {
    // Queue is empty  -  always allow one new beat.
    maxNewBeats = 1;
  }

  // ---- 4. Golden bubble nudge ------------------------------------------------

  const nudgeGoldenBubble =
    signals.timeSinceLastMicroMs >= BUBBLE_NUDGE_COOLDOWN_MS &&
    signals.earningsRate > 0 &&
    signals.activeAttackCount === 0 &&
    !(state.events?.boost && state.events.boost.endsAt > now);

  // ---- 5. Build next director state ------------------------------------------

  const nextDirectorState: DirectorState = {
    currentPhase: phase,
    lastBeatAt: state.director?.lastBeatAt ?? 0,
    lastEscalationAt: didEscalate ? now : (state.director?.lastEscalationAt ?? 0),
    lastNudgeAt: companionTrustNudge ? now : (state.director?.lastNudgeAt ?? 0),
  };

  return {
    rivalAggModifier,
    companionTrustNudge,
    maxNewBeats,
    nudgeGoldenBubble,
    nextDirectorState,
  };
}

// ---- Director lastBeatAt updater (called when a beat is acknowledged) -------

export function directorBeatSeen(director: DirectorState, now: number): DirectorState {
  return { ...director, lastBeatAt: now };
}

// ---- Default director state ------------------------------------------------

export function defaultDirectorState(now: number): DirectorState {
  return {
    currentPhase: 'BOOTSTRAPPING',
    lastBeatAt: now,
    lastEscalationAt: 0,
    lastNudgeAt: 0,
  };
}

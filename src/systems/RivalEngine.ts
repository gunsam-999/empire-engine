// ============================================================================
// RivalEngine  -  deterministic rival orchestration (Sessions 3.2 + 3.3).
// All functions are pure: given state, return new state fragments.
// No AI, no probability  -  every decision is a table lookup or threshold check.
// ============================================================================

import { RIVAL_CONFIGS, getRivalConfig, getRivalMove } from '../data/rivals';
import type {
  GameState,
  RivalPosture,
  RivalPressure,
  RivalState,
  RivalTelegraph,
} from '../game/types';

// ---- Posture ladder ---------------------------------------------------------

/** Aggression thresholds that gate each posture. */
const POSTURE_THRESHOLDS: Record<RivalPosture, number> = {
  DORMANT: 0,
  WATCHING: 16,
  PROVOKED: 31,
  HOSTILE: 56,
  WAR: 76,
  DEFEATED: Infinity,
  ALLIED: Infinity,
};

export function postureFromAggression(agg: number): RivalPosture {
  if (agg >= 76) return 'WAR';
  if (agg >= 56) return 'HOSTILE';
  if (agg >= 31) return 'PROVOKED';
  if (agg >= 16) return 'WATCHING';
  return 'DORMANT';
}

const POSTURE_ORDER: RivalPosture[] = [
  'DORMANT',
  'WATCHING',
  'PROVOKED',
  'HOSTILE',
  'WAR',
  'DEFEATED',
  'ALLIED',
];

function postureGte(a: RivalPosture, b: RivalPosture): boolean {
  return POSTURE_ORDER.indexOf(a) >= POSTURE_ORDER.indexOf(b);
}

// ---- Aggression helpers -----------------------------------------------------

export function clampAgg(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Natural aggression decay per second: -1 per minute. */
const AGG_DECAY_PER_SEC = 1 / 60;

/**
 * Effect of the reputation axis on rival aggression growth rate.
 * Ruthless builds rival aggression faster; visionary slows it.
 */
function reputationAggMod(ethics: number): number {
  if (ethics < -20) return 1 + 0.003 * (-ethics); // up to 1.3×
  if (ethics > 20) return Math.max(0.5, 1 - 0.005 * ethics); // down to 0.5×
  return 1;
}

// ---- Spawn logic ------------------------------------------------------------

/** Returns IDs of rivals that should be active given the current state. */
function activeRivalIds(state: GameState): string[] {
  const le = state.lifetimeEarnings || 0;
  return RIVAL_CONFIGS.filter((cfg) => le >= cfg.spawnAt).map((c) => c.id);
}

/** Ensure rival state entries exist for every rival that should be spawned. */
export function syncRivalRoster(rivals: RivalState[], state: GameState, now: number): RivalState[] {
  const ids = activeRivalIds(state);
  const existing = new Set(rivals.map((r) => r.id));
  const next = rivals.filter((r) => ids.includes(r.id));
  for (const id of ids) {
    if (!existing.has(id)) {
      const cfg = getRivalConfig(id)!;
      const idx = RIVAL_CONFIGS.indexOf(cfg);
      next.push({
        id,
        aggression: 10,
        relationship: 0,
        posture: 'WATCHING',
        telegraph: null,
        lastMoveAt: now - cfg.evalIntervalSec * 1000 * (0.5 + idx * 0.15),
        cooldownUntil: now + (idx + 1) * 20_000,
        pendingAggDelta: 0,
        defenseHistory: [],
        telegraphIsFeint: false,
        timesAttacked: 0,
      });
    }
  }
  return next;
}

// ---- Counter-adaptation ----------------------------------------------------

/**
 * Choose a move adapted to the player's defense history.
 * If the player always counters with the same action, the rival switches away
 * from moves that action counters effectively.
 *
 * Returns a [moveId, isFeint] pair. A feint fires a real-looking telegraph but
 * has no economic effect  -  it is designed to waste the player's counter.
 */
function selectAdaptiveMove(
  rivalId: string,
  posture: RivalPosture,
  defenseHistory: string[]
): [string | null, boolean] {
  const cfg = getRivalConfig(rivalId);
  if (!cfg) return [null, false];

  const eligible = cfg.moves.filter((m) => postureGte(posture, m.minPosture));
  if (eligible.length === 0) return [null, false];

  // Count how many times the player used each counter action in history.
  const counterCounts: Record<string, number> = {};
  for (const h of defenseHistory) counterCounts[h] = (counterCounts[h] ?? 0) + 1;

  // Score each move: lower score if the player reliably counters it.
  const scored = eligible.map((m) => {
    const counterKey = m.counteredBy ?? '__none__';
    const timesCountered = counterCounts[counterKey] ?? 0;
    // Penalty grows with how reliably this move was countered.
    const counterRate = defenseHistory.length > 0
      ? timesCountered / defenseHistory.length
      : 0;
    // Prefer higher-posture moves; penalise overly-countered ones.
    const postureScore = POSTURE_ORDER.indexOf(m.minPosture);
    return { m, score: postureScore - counterRate * 3 };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0].m;

  // Feint logic: when the player has countered this move ≥2 times, fire a
  // decoy telegraph 30% of the time  -  the actual move won't execute.
  const counterKey = chosen.counteredBy ?? '__none__';
  const timesCountered = counterCounts[counterKey] ?? 0;
  // Use a deterministic "pseudo-random" based on defenseHistory length so the
  // engine stays testable and reproducible.
  const deterministicRoll = (defenseHistory.length * 7 + timesCountered * 3) % 10;
  const isFeint = timesCountered >= 2 && deterministicRoll < 3;

  return [chosen.id, isFeint];
}

// ---- Telegraph creation -----------------------------------------------------

function makeTelegraph(
  rivalId: string,
  moveId: string,
  now: number
): RivalTelegraph | null {
  const move = getRivalMove(rivalId, moveId);
  if (!move) return null;
  return {
    rivalId,
    moveId,
    message: move.telegraphMessage,
    executesAt: now + move.telegraphDelaySec * 1000,
    counteredBy: move.counteredBy,
    counterLabel: move.counterLabel,
  };
}

// ---- Evaluate a single rival (called from TICK) ----------------------------

/**
 * Run one evaluation cycle for a rival.
 * Returns the updated RivalState; caller is responsible for replacing it
 * in GameState.rivals.
 */
export function evaluateRival(
  rival: RivalState,
  state: GameState,
  now: number
): RivalState {
  const cfg = getRivalConfig(rival.id);
  if (!cfg) return rival;

  // Terminal postures are never re-evaluated.
  if (rival.posture === 'DEFEATED' || rival.posture === 'ALLIED') return rival;

  // Not yet time to evaluate.
  if (now < rival.lastMoveAt + cfg.evalIntervalSec * 1000) return rival;

  // Still on cooldown (move executing or just fired).
  if (now < rival.cooldownUntil) return rival;

  // 1. Apply aggression decay and any pending player-action deltas.
  const elapsedSec = (now - rival.lastMoveAt) / 1000;
  const decay = elapsedSec * AGG_DECAY_PER_SEC;
  const ethics = state.story?.ethics ?? 0;
  const passiveGain = cfg.passiveAggPerEval * reputationAggMod(ethics);
  let newAgg = clampAgg(
    rival.aggression - decay + passiveGain + rival.pendingAggDelta
  );

  // 2. Determine new posture.
  const newPosture = postureFromAggression(newAgg);

  // 3. If DORMANT or WATCHING, no move fires.
  if (newPosture === 'DORMANT' || newPosture === 'WATCHING') {
    return {
      ...rival,
      aggression: newAgg,
      posture: newPosture,
      pendingAggDelta: 0,
      lastMoveAt: now,
    };
  }

  // 4. Select an adaptive move (may be a feint).
  const [moveId, isFeint] = selectAdaptiveMove(
    rival.id,
    newPosture,
    rival.defenseHistory
  );
  if (!moveId) {
    return {
      ...rival,
      aggression: newAgg,
      posture: newPosture,
      pendingAggDelta: 0,
      lastMoveAt: now,
    };
  }

  // 5. Telegraph it.
  const move = getRivalMove(rival.id, moveId)!;
  const telegraph = makeTelegraph(rival.id, moveId, now);

  return {
    ...rival,
    aggression: newAgg,
    posture: newPosture,
    telegraph,
    telegraphIsFeint: isFeint,
    pendingAggDelta: 0,
    lastMoveAt: now,
    cooldownUntil: now + move.cooldownSec * 1000,
  };
}

// ---- Execute a rival move (when telegraph window expires) ------------------

/**
 * Apply the economic effect of a rival move.
 * Returns the new rivalPressures array with the effect appended.
 */
export function executeRivalMove(
  rivalId: string,
  moveId: string,
  pressures: RivalPressure[],
  now: number
): RivalPressure[] {
  const move = getRivalMove(rivalId, moveId);
  if (!move) return pressures;

  const newPressure: RivalPressure = {
    rivalId,
    kind: move.effect.kind,
    multiplier: move.effect.multiplier,
    endsAt: now + move.effect.durationSec * 1000,
  };

  // Replace any existing pressure from the same rival (they stack via new moves,
  // but the same rival can't have two of the same kind active at once).
  const filtered = pressures.filter(
    (p) => !(p.rivalId === rivalId && p.kind === move.effect.kind)
  );
  return [...filtered, newPressure];
}

// ---- Apply rival pressures to multipliers ----------------------------------

/**
 * Combined multipliers from all active rival pressures.
 * Returns { price, production, brand } modifier factors (all start at 1.0).
 */
export function getRivalPressureMults(
  pressures: RivalPressure[],
  now: number
): { price: number; production: number; brand: number } {
  const result = { price: 1, production: 1, brand: 1 };
  for (const p of pressures) {
    if (p.endsAt <= now) continue;
    if (p.kind === 'price') result.price *= p.multiplier;
    else if (p.kind === 'production') result.production *= p.multiplier;
    else if (p.kind === 'brand') result.brand *= p.multiplier;
  }
  return result;
}

// ---- Tick all rivals (called from GameContext TICK) ------------------------

// ---- Coalition formation ---------------------------------------------------

/**
 * Dominance threshold: if the player's lifetime earnings are > 50× the
 * combined spawn threshold of active rivals, they form a coalition.
 * Coalition grants every active rival +20 aggression and activates Apex.
 */
function checkCoalition(rivals: RivalState[], state: GameState): RivalState[] {
  const activeConfigs = RIVAL_CONFIGS.filter(
    (cfg) => (state.lifetimeEarnings || 0) >= cfg.spawnAt && cfg.id !== 'apex'
  );
  if (activeConfigs.length < 2) return rivals; // not enough rivals to form one

  const combinedSpawnThreshold = activeConfigs.reduce((s, c) => s + c.spawnAt, 0);
  const dominanceReached = (state.lifetimeEarnings || 0) > combinedSpawnThreshold * 50;

  if (!dominanceReached) return rivals;

  // Apply coalition bonus to all active rivals.
  return rivals.map((r) => {
    if (r.posture === 'DEFEATED' || r.posture === 'ALLIED') return r;
    const newAgg = clampAgg(r.aggression + 20);
    return { ...r, aggression: newAgg, posture: postureFromAggression(newAgg) };
  });
}

// ---- Full rival tick -------------------------------------------------------

/**
 * Full rival tick: sync roster, evaluate each rival, execute any expired
 * telegraphs, expire old pressures, check coalition.
 *
 * Returns updated [rivals, rivalPressures, coalitionActive] to merge into state.
 */
export function tickRivals(
  state: GameState,
  now: number
): { rivals: RivalState[]; rivalPressures: RivalPressure[]; coalitionActive: boolean } {
  let rivals = syncRivalRoster(state.rivals ?? [], state, now);
  let pressures = (state.rivalPressures ?? []).filter((p) => p.endsAt > now);

  const nextRivals: RivalState[] = [];
  for (let rival of rivals) {
    // Execute an expired telegraph  -  but skip if it was a feint.
    if (rival.telegraph && now >= rival.telegraph.executesAt) {
      if (!rival.telegraphIsFeint) {
        pressures = executeRivalMove(rival.id, rival.telegraph.moveId, pressures, now);
      }
      rival = { ...rival, telegraph: null, telegraphIsFeint: false };
    }
    rival = evaluateRival(rival, state, now);
    nextRivals.push(rival);
  }

  // Coalition check  -  fires once when dominance is reached.
  const afterCoalition = checkCoalition(nextRivals, state);

  // Coalition is "active" if any rival is in WAR and there are 2+ HOSTILE/WAR.
  const atWar = afterCoalition.filter(
    (r) => r.posture === 'WAR' || r.posture === 'HOSTILE'
  ).length;
  const coalitionActive = atWar >= 2;

  return { rivals: afterCoalition, rivalPressures: pressures, coalitionActive };
}

// ---- Aggression shifts from player actions ---------------------------------

/** Apply a direct aggression delta to one rival (used from reducer actions). */
export function shiftRivalAggression(
  rivals: RivalState[],
  rivalId: string,
  delta: number
): RivalState[] {
  return rivals.map((r) => {
    if (r.id !== rivalId) return r;
    const newAgg = clampAgg(r.aggression + delta);
    return { ...r, aggression: newAgg, posture: postureFromAggression(newAgg) };
  });
}

/** Counter a rival's telegraphed move (removes telegraph, records defense history). */
export function counterRivalMove(rivals: RivalState[], rivalId: string): RivalState[] {
  return rivals.map((r) => {
    if (r.id !== rivalId || !r.telegraph) return r;
    // Record what counter action cleared this telegraph for adaptation.
    const counterKey = r.telegraph.counteredBy ?? '__none__';
    const history = [...r.defenseHistory, counterKey].slice(-5);
    return { ...r, telegraph: null, telegraphIsFeint: false, defenseHistory: history };
  });
}

/**
 * Apply a player offensive action against a rival.
 * Lowers the rival's relationship and aggression (they're rattled, not enraged);
 * also weakens their next pressure effect by raising pendingAggDelta negatively.
 */
export function applyPlayerOffense(
  rivals: RivalState[],
  rivalId: string,
  offenseKind: 'leak_story' | 'fund_competitor' | 'undercut'
): RivalState[] {
  const AGG_PENALTY: Record<string, number> = {
    leak_story: -8,
    fund_competitor: -15,
    undercut: -10,
  };
  const REL_PENALTY: Record<string, number> = {
    leak_story: -12,
    fund_competitor: -20,
    undercut: -8,
  };

  return rivals.map((r) => {
    if (r.id !== rivalId) return r;
    const newAgg = clampAgg(r.aggression + (AGG_PENALTY[offenseKind] ?? -10));
    const newRel = Math.max(-100, r.relationship + (REL_PENALTY[offenseKind] ?? -10));
    return {
      ...r,
      aggression: newAgg,
      relationship: newRel,
      posture: postureFromAggression(newAgg),
      timesAttacked: r.timesAttacked + 1,
    };
  });
}

// ---- Aggression table convenience constants --------------------------------

export const AGG_DELTAS = {
  CLAIM_REGION: 25,
  ENTER_INDUSTRY: 20,
  DEFEAT_ALLY: 20,
  RECRUIT_WANTED_ADVISOR: 15,
  UNDERCUT_STOCKPILE: 15,
  MILESTONE_IN_DOMAIN: 10,
  RUTHLESS_CHOICE: 30,
  VISIONARY_CHOICE: -10,
  WITHDRAW_REGION: -20,
  TRUCE: -50,
  TRIBUTE: -40,
} as const;

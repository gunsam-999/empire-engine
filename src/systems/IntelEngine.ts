// ============================================================================
// IntelEngine (Sessions 5.2 + Part 10)  -  War Room upgrade of the Intel Desk.
//
// War Room levels unlock progressively deeper intelligence capabilities:
//   Lv 0 - unbuilt: no intel capabilities at all
//   Lv 1 - Surveillance (50 inf): telegraph verification (original Session 5.2)
//   Lv 2 - Dossier Desk (200 inf): rival profiles, move history, attack count
//   Lv 3 - Predictive Analysis (500 inf): infer weakness from move patterns,
//           predict next move before telegraph fires
//   Lv 4 - Counter-Intel (1000 inf): detect when a rival has a spy op running,
//           block it to prevent their next move getting an aggression bonus
//   Lv 5 - Pantheon Access (2500 inf): glimpse upcoming titan Ledger articles
//           before they publish; see titan valuations with confidence bars
//
// Dossier files are compiled per rival as reports are commissioned.
// Vendettas are declared when a rival attacks the player 3+ times.
// ============================================================================

import type {
  DossierFile,
  IntelReport,
  IntelState,
  RivalState,
  VendettaState,
  WarRoomLevel,
} from '../game/types';
import { getRivalConfig, getRivalMove } from '../data/rivals';

// ---- Costs & timings --------------------------------------------------------

export const INTEL_COMMISSION_COST = 50;           // influence
export const INTEL_COMMISSION_COOLDOWN_MS = 300_000; // 5 min
export const INTEL_RESOLVE_DELAY_MS = 30_000;        // 30 s
const INTEL_DECAY_PER_MIN = 2;

export const WAR_ROOM_UPGRADE_COSTS: Record<WarRoomLevel, number> = {
  0: 0,
  1: 50,
  2: 200,
  3: 500,
  4: 1_000,
  5: 2_500,
};

export const WAR_ROOM_LEVEL_LABELS: Record<WarRoomLevel, string> = {
  0: 'Unbuilt',
  1: 'Surveillance',
  2: 'Dossier Desk',
  3: 'Predictive Analysis',
  4: 'Counter-Intel',
  5: 'Pantheon Access',
};

export const WAR_ROOM_LEVEL_DESC: Record<WarRoomLevel, string> = {
  0: 'Commission the War Room to begin gathering competitive intelligence.',
  1: 'Verify whether active rival telegraphs are genuine threats or feints.',
  2: 'Compile dossier files on each rival: profile, move history, attack count.',
  3: 'Infer rival weaknesses from move patterns. Predict the next move before it telegraphs.',
  4: 'Detect rival counter-intelligence operations and neutralise them before they land.',
  5: 'Glimpse upcoming Pantheon titan activities before The Ledger publishes them.',
};

// Vendetta triggers when rival attacks >= this many times.
const VENDETTA_THRESHOLD = 3;

// Counter-intel: rival spies detected for 90s; player has that long to block.
const COUNTER_INTEL_DURATION_MS = 90_000;

// ---- Default state ----------------------------------------------------------

export function defaultIntelState(): IntelState {
  return {
    level: 0,
    reports: [],
    lastBriefAt: 0,
    warRoomLevel: 0,
    dossiers: [],
    vendettas: [],
    pendingCounterIntel: null,
    lastUpgradeAt: 0,
  };
}

// ---- War Room upgrade -------------------------------------------------------

export function canUpgradeWarRoom(intel: IntelState, influence: number): boolean {
  if (intel.warRoomLevel >= 5) return false;
  const nextLevel = (intel.warRoomLevel + 1) as WarRoomLevel;
  return influence >= WAR_ROOM_UPGRADE_COSTS[nextLevel];
}

export function upgradeWarRoom(intel: IntelState, now: number): IntelState {
  if (intel.warRoomLevel >= 5) return intel;
  const nextLevel = (intel.warRoomLevel + 1) as WarRoomLevel;
  return { ...intel, warRoomLevel: nextLevel, lastUpgradeAt: now };
}

export function warRoomUpgradeCost(intel: IntelState): number {
  if (intel.warRoomLevel >= 5) return Infinity;
  return WAR_ROOM_UPGRADE_COSTS[(intel.warRoomLevel + 1) as WarRoomLevel];
}

// ---- Commissioning ----------------------------------------------------------

export function canGatherIntel(intel: IntelState, now: number): boolean {
  if (intel.warRoomLevel < 1) return false;
  return now >= intel.lastBriefAt + INTEL_COMMISSION_COOLDOWN_MS;
}

export function intelCooldownRemainingSec(intel: IntelState, now: number): number {
  return Math.max(0, Math.ceil((intel.lastBriefAt + INTEL_COMMISSION_COOLDOWN_MS - now) / 1000));
}

export function commissionReport(
  intel: IntelState,
  rivalId: string,
  now: number
): IntelState {
  const report: IntelReport = {
    rivalId,
    commissionedAt: now,
    revealsAt: now + INTEL_RESOLVE_DELAY_MS,
    resolved: false,
    wasFeint: null,
  };
  const reports = [report, ...intel.reports].slice(0, 5);

  // Ensure a dossier file exists for this rival if War Room is level 2+.
  let dossiers = intel.dossiers;
  if (intel.warRoomLevel >= 2) {
    const hasDossier = dossiers.some((d) => d.rivalId === rivalId);
    if (!hasDossier) {
      const newDossier: DossierFile = {
        rivalId,
        profileUnlocked: true,
        movesObserved: [],
        attacksOnPlayer: 0,
        lastObservedAt: now,
        weaknessKind: null,
        predictedNextMoveId: null,
      };
      dossiers = [...dossiers, newDossier];
    }
  }

  return {
    ...intel,
    level: Math.min(100, intel.level + 15),
    reports,
    dossiers,
    lastBriefAt: now,
  };
}

// ---- Dossier updates --------------------------------------------------------

/** Record a move being observed (from a rival execute or telegraph). */
function observeMove(dossiers: DossierFile[], rivalId: string, moveId: string, now: number): DossierFile[] {
  return dossiers.map((d) => {
    if (d.rivalId !== rivalId) return d;
    const movesObserved = d.movesObserved.includes(moveId)
      ? d.movesObserved
      : [...d.movesObserved, moveId];
    return { ...d, movesObserved, lastObservedAt: now };
  });
}

/** Infer weakness from observed moves (for level 3+). */
function inferWeakness(rivalId: string, movesObserved: string[]): 'price' | 'production' | 'brand' | null {
  if (movesObserved.length < 2) return null;
  const cfg = getRivalConfig(rivalId);
  if (!cfg) return null;

  const kindCounts: Record<string, number> = {};
  for (const moveId of movesObserved) {
    const move = getRivalMove(rivalId, moveId);
    if (move) {
      kindCounts[move.effect.kind] = (kindCounts[move.effect.kind] ?? 0) + 1;
    }
  }

  // The rival's weakness is the OPPOSITE of their preferred attack vector:
  // they rely on one thing; countering that type is where they're exposed.
  const topKind = Object.entries(kindCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (topKind as 'price' | 'production' | 'brand') ?? null;
}

/** Predict the next move (for level 3+). Simple: the un-observed eligible move at highest posture. */
function predictNextMove(rivalId: string, movesObserved: string[], posture: string): string | null {
  const cfg = getRivalConfig(rivalId);
  if (!cfg || movesObserved.length === 0) return null;
  const POSTURE_ORDER = ['DORMANT', 'WATCHING', 'PROVOKED', 'HOSTILE', 'WAR', 'DEFEATED', 'ALLIED'];
  const eligible = cfg.moves.filter(
    (m) => POSTURE_ORDER.indexOf(posture) >= POSTURE_ORDER.indexOf(m.minPosture)
  );
  // Predict the move not yet observed at this posture level.
  const unobserved = eligible.filter((m) => !movesObserved.includes(m.id));
  return unobserved[0]?.id ?? eligible[eligible.length - 1]?.id ?? null;
}

/** Record a rival attacking the player (increment attack count, check vendetta). */
export function recordRivalAttack(
  intel: IntelState,
  rivalId: string,
  moveId: string,
  now: number
): IntelState {
  // Update dossier.
  let dossiers = observeMove(intel.dossiers, rivalId, moveId, now);
  dossiers = dossiers.map((d) => {
    if (d.rivalId !== rivalId) return d;
    const attacks = d.attacksOnPlayer + 1;
    const rival = { posture: 'HOSTILE' }; // safe default for prediction
    const weak = intel.warRoomLevel >= 3 ? inferWeakness(rivalId, d.movesObserved) : d.weaknessKind;
    const predicted = intel.warRoomLevel >= 3
      ? predictNextMove(rivalId, d.movesObserved, rival.posture)
      : d.predictedNextMoveId;
    return { ...d, attacksOnPlayer: attacks, weaknessKind: weak, predictedNextMoveId: predicted };
  });

  // Check vendetta.
  const dossier = dossiers.find((d) => d.rivalId === rivalId);
  const attacks = dossier?.attacksOnPlayer ?? 0;
  let vendettas = intel.vendettas;
  const alreadyVendetta = vendettas.some((v) => v.rivalId === rivalId);
  if (!alreadyVendetta && attacks >= VENDETTA_THRESHOLD) {
    const newVendetta: VendettaState = {
      rivalId,
      escalationLevel: 1,
      triggeredAt: now,
      totalAttacks: attacks,
    };
    vendettas = [...vendettas, newVendetta];
  } else if (alreadyVendetta) {
    vendettas = vendettas.map((v) => {
      if (v.rivalId !== rivalId) return v;
      const newLevel = Math.min(3, Math.floor(attacks / VENDETTA_THRESHOLD)) as 1 | 2 | 3;
      return { ...v, escalationLevel: newLevel, totalAttacks: attacks };
    });
  }

  return { ...intel, dossiers, vendettas };
}

// ---- Tick -------------------------------------------------------------------

export function tickIntel(
  intel: IntelState,
  rivals: RivalState[],
  dt: number,
  now: number
): IntelState {
  // Resolve pending reports.
  const reports = intel.reports.map((r): IntelReport => {
    if (r.resolved || now < r.revealsAt) return r;
    const rival = rivals.find((rv) => rv.id === r.rivalId);
    return { ...r, resolved: true, wasFeint: rival?.telegraphIsFeint ?? false };
  });

  // Decay intel level: -2/min.
  const newLevel = Math.max(0, intel.level - (INTEL_DECAY_PER_MIN / 60) * dt);

  // Expire counter-intel if overdue.
  const pendingCounterIntel =
    intel.pendingCounterIntel && now > intel.pendingCounterIntel.expiresAt
      ? null
      : intel.pendingCounterIntel;

  // At level 3+: update predictions for rivals with telegraphs.
  let dossiers = intel.dossiers;
  if (intel.warRoomLevel >= 3) {
    dossiers = dossiers.map((d) => {
      const rival = rivals.find((r) => r.id === d.rivalId);
      if (!rival) return d;
      const predicted = predictNextMove(d.rivalId, d.movesObserved, rival.posture);
      const weakness = inferWeakness(d.rivalId, d.movesObserved);
      return { ...d, predictedNextMoveId: predicted, weaknessKind: weakness };
    });
  }

  // At level 4+: detect counter-intel op (deterministic: fires every 10 min
  // based on total attack count across all rivals, if no op is already pending).
  let counterIntel = pendingCounterIntel;
  if (intel.warRoomLevel >= 4 && !counterIntel) {
    const totalAttacks = intel.dossiers.reduce((s, d) => s + d.attacksOnPlayer, 0);
    // Fires when totalAttacks mod 5 = 0 and at least one hostile rival.
    const hostileRival = rivals.find((r) => r.posture === 'HOSTILE' || r.posture === 'WAR');
    if (totalAttacks > 0 && totalAttacks % 5 === 0 && hostileRival) {
      counterIntel = {
        rivalId: hostileRival.id,
        detectedAt: now,
        expiresAt: now + COUNTER_INTEL_DURATION_MS,
      };
    }
  }

  return { ...intel, level: newLevel, reports, dossiers, pendingCounterIntel: counterIntel };
}

// ---- Verdict ----------------------------------------------------------------

export function getIntelVerdict(
  intel: IntelState,
  rivalId: string
): 'real' | 'feint' | null {
  const report = intel.reports.find((r) => r.rivalId === rivalId && r.resolved);
  if (!report) return null;
  return report.wasFeint ? 'feint' : 'real';
}

export function intelConfidence(intel: IntelState): number {
  return Math.round(intel.level);
}

export function getDossier(intel: IntelState, rivalId: string): DossierFile | null {
  return intel.dossiers.find((d) => d.rivalId === rivalId) ?? null;
}

export function getVendetta(intel: IntelState, rivalId: string): VendettaState | null {
  return intel.vendettas.find((v) => v.rivalId === rivalId) ?? null;
}

export function hasVendetta(intel: IntelState, rivalId: string): boolean {
  return intel.vendettas.some((v) => v.rivalId === rivalId);
}

/** Threat level 0-100 for a given rival. Used for the threat board display. */
export function threatLevel(
  aggression: number,
  attacksOnPlayer: number
): number {
  return Math.min(100, aggression * 0.7 + attacksOnPlayer * 3);
}

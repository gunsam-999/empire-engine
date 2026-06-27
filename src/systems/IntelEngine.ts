// ============================================================================
// IntelEngine (Session 5.2)  -  spy network for rival intelligence.
// Player commissions reports (50 influence, 300 s cooldown); each report
// resolves after 30 s and reveals whether the rival's active telegraph is a
// genuine threat or a feint. Intel level decays gradually; higher levels
// mean faster analysis and sharper confidence displays.
// ============================================================================

import type { IntelReport, IntelState, RivalState } from '../game/types';

export const INTEL_COMMISSION_COST = 50;          // influence
export const INTEL_COMMISSION_COOLDOWN_MS = 300_000; // 5 min
export const INTEL_RESOLVE_DELAY_MS = 30_000;       // 30 s
const INTEL_DECAY_PER_MIN = 2;

export function defaultIntelState(): IntelState {
  return { level: 0, reports: [], lastBriefAt: 0 };
}

export function canGatherIntel(intel: IntelState, now: number): boolean {
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
  return {
    level: Math.min(100, intel.level + 15),
    reports,
    lastBriefAt: now,
  };
}

export function tickIntel(
  intel: IntelState,
  rivals: RivalState[],
  dt: number,
  now: number
): IntelState {
  // Resolve pending reports
  const reports = intel.reports.map((r): IntelReport => {
    if (r.resolved || now < r.revealsAt) return r;
    const rival = rivals.find((rv) => rv.id === r.rivalId);
    return { ...r, resolved: true, wasFeint: rival?.telegraphIsFeint ?? false };
  });

  // Decay intel level: −2/min
  const newLevel = Math.max(0, intel.level - (INTEL_DECAY_PER_MIN / 60) * dt);

  return { ...intel, level: newLevel, reports };
}

/** Returns the verified status of the CURRENT telegraph for a given rival. */
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

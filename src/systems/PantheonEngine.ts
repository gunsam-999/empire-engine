// ============================================================================
// PantheonEngine (Part 10)  -  the six legendary titans who define the ceiling.
// Each titan has a growing simulated valuation; the player's arc is to close
// that gap, get noticed, and eventually surpass them and have them spawn as
// apex rivals once the player reaches the TITAN echelon tier.
//
// Tick responsibilities:
//   1. Grow titan valuations (slow compounding, deterministic).
//   2. Generate periodic activity articles for The Ledger.
//   3. Trigger "noticed" state when player crosses the notice threshold.
//   4. Track player global wealth rank among titans.
// ============================================================================

import { PANTHEON_CONFIGS } from '../data/pantheon';
import type { GameState, NewsItem, PantheonState, PantheonTitanState } from '../game/types';

// Titan valuation growth: ~12% per real-time hour (fast game speed).
// = 0.12 / 3600 per second.
const VALUATION_GROWTH_PER_SEC = 0.12 / 3600;

// Activity generation interval per titan: one article every ~8 min game time.
const ACTIVITY_INTERVAL_MS = 8 * 60 * 1000;

// Minimum interval between ANY titan generating a Ledger article.
const LEDGER_PANTHEON_GAP_MS = 3 * 60 * 1000;

export function defaultPantheonState(): PantheonState {
  return {
    titans: PANTHEON_CONFIGS.map((cfg): PantheonTitanState => ({
      id: cfg.id,
      estimatedValuation: cfg.startingValuation,
      hasNoticedPlayer: false,
      enteredAsRival: false,
      lastActivityAt: 0,
      recentActivity: [],
    })),
    playerRank: 7,
    lastActivityAt: 0,
  };
}

function computePlayerRank(titans: PantheonTitanState[], playerLE: number): number {
  const wealthier = titans.filter((t) => t.estimatedValuation > playerLE).length;
  return wealthier + 1; // rank 1 = richest
}

// Pick an activity template deterministically using the titan's lastActivityAt
// so we cycle through the list without Math.random().
function pickActivityTemplate(titanId: string, lastActivityAt: number, templateCount: number): number {
  const hash = (titanId.length * 31 + (Math.floor(lastActivityAt / 1000) % 1000)) % templateCount;
  return hash;
}

export interface PantheonTick {
  pantheon: PantheonState;
  /** New Ledger article generated this tick, if any. */
  newLedgerItem: NewsItem | null;
  /** Titan ID whose surpass was just crossed by the player, if any. */
  surpassedTitanId: string | null;
  /** Titan ID that just noticed the player, if any. */
  noticedTitanId: string | null;
}

export function tickPantheon(
  pantheon: PantheonState,
  state: GameState,
  dt: number,
  now: number,
  prevState: GameState
): PantheonTick {
  const playerLE = state.lifetimeEarnings ?? 0;
  const prevPlayerLE = prevState.lifetimeEarnings ?? 0;

  let newLedgerItem: NewsItem | null = null;
  let surpassedTitanId: string | null = null;
  let noticedTitanId: string | null = null;

  // 1. Grow valuations and check state transitions.
  const titans: PantheonTitanState[] = pantheon.titans.map((t) => {
    const cfg = PANTHEON_CONFIGS.find((c) => c.id === t.id);
    if (!cfg) return t;

    const newVal = t.estimatedValuation * (1 + VALUATION_GROWTH_PER_SEC * dt);

    // Surpass check: player's LE just crossed a titan's valuation.
    const justSurpassed = playerLE >= t.estimatedValuation && prevPlayerLE < t.estimatedValuation;
    if (justSurpassed) surpassedTitanId = t.id;

    // Notice check: player's LE just crossed this titan's notice threshold.
    const justNoticed = !t.hasNoticedPlayer && playerLE >= cfg.noticeThreshold;
    if (justNoticed) noticedTitanId = t.id;

    return {
      ...t,
      estimatedValuation: newVal,
      hasNoticedPlayer: t.hasNoticedPlayer || justNoticed,
    };
  });

  // 2. Generate activity articles (one per tick, staggered across titans).
  if (now - pantheon.lastActivityAt >= LEDGER_PANTHEON_GAP_MS) {
    // Find the titan most overdue for an activity article.
    let mostOverdue: PantheonTitanState | null = null;
    let maxOverdue = 0;
    for (const t of titans) {
      const overdue = now - t.lastActivityAt;
      if (overdue > ACTIVITY_INTERVAL_MS && overdue > maxOverdue) {
        maxOverdue = overdue;
        mostOverdue = t;
      }
    }

    if (mostOverdue) {
      const cfg = PANTHEON_CONFIGS.find((c) => c.id === mostOverdue!.id);
      if (cfg && cfg.activityTemplates.length > 0) {
        const idx = pickActivityTemplate(cfg.id, mostOverdue.lastActivityAt, cfg.activityTemplates.length);
        const template = cfg.activityTemplates[idx];

        newLedgerItem = {
          id: `pantheon-${cfg.id}-${now}`,
          at: now,
          category: 'business',
          headline: template.headline,
          body: template.body,
          sentimentScore: 1,
          read: false,
          responded: false,
          section: 'pantheon',
          titanId: cfg.id,
          isFrontPage: false,
          isBreaking: false,
        };

        // Update titan state to record this activity.
        const activitySnippet = template.headline.slice(0, 60) + (template.headline.length > 60 ? '...' : '');
        const updatedTitans = titans.map((t) =>
          t.id === mostOverdue!.id
            ? {
                ...t,
                lastActivityAt: now,
                recentActivity: [activitySnippet, ...t.recentActivity].slice(0, 3),
              }
            : t
        );

        return {
          pantheon: {
            titans: updatedTitans,
            playerRank: computePlayerRank(updatedTitans, playerLE),
            lastActivityAt: now,
          },
          newLedgerItem,
          surpassedTitanId,
          noticedTitanId,
        };
      }
    }
  }

  return {
    pantheon: {
      titans,
      playerRank: computePlayerRank(titans, playerLE),
      lastActivityAt: pantheon.lastActivityAt,
    },
    newLedgerItem,
    surpassedTitanId,
    noticedTitanId,
  };
}

/** Sorted titan list by estimated valuation, descending. */
export function getRankedTitans(pantheon: PantheonState): PantheonTitanState[] {
  return [...pantheon.titans].sort((a, b) => b.estimatedValuation - a.estimatedValuation);
}

export function getTitanState(pantheon: PantheonState, id: string): PantheonTitanState | undefined {
  return pantheon.titans.find((t) => t.id === id);
}

/** Format estimated valuation as a short string. */
export function formatTitanVal(val: number): string {
  if (val >= 1e15) return `$${(val / 1e15).toFixed(1)}Q`;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

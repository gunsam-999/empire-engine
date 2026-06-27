// ============================================================================
// NewspaperEngine (Session 5.3) — press coverage system.
// Notable game transitions trigger headlines (echelon tier-up, coalition,
// rival defeated, LE milestones, ethics extremes, premise breach). Negative
// coverage accumulates a heat score that applies a light production debuff.
// Player can spend influence to "respond" to negative items, reducing heat.
// ============================================================================

import type { GameState, NewsCategory, NewsItem, NewspaperState } from '../game/types';
import { getRivalConfig } from '../data/rivals';
import { CLAUSE_CONFIGS } from '../data/premises';
import { ECHELON_LABELS } from './EchelonEngine';

const MIN_PUBLISH_INTERVAL_MS = 60_000; // 1 min between items
const HEAT_DECAY_PER_MIN = 0.5;
const RESPOND_HEAT_REDUCTION = 30;

export const NEWS_RESPOND_COST = 200; // influence

export function defaultNewspaperState(): NewspaperState {
  return { items: [], lastPublishedAt: 0, heatScore: 0 };
}

export function getNewspaperProdMult(newspaper: NewspaperState): number {
  if (newspaper.heatScore >= 80) return 0.82;
  if (newspaper.heatScore >= 60) return 0.88;
  if (newspaper.heatScore >= 30) return 0.94;
  return 1.00;
}

export function canRespondToNews(item: NewsItem): boolean {
  return !item.responded && item.sentimentScore < 0;
}

export function respondToNews(newspaper: NewspaperState, itemId: string): NewspaperState {
  const item = newspaper.items.find((n) => n.id === itemId);
  const heatReduction = item && item.sentimentScore < 0 ? RESPOND_HEAT_REDUCTION : 0;
  return {
    ...newspaper,
    items: newspaper.items.map((n) =>
      n.id === itemId ? { ...n, responded: true } : n
    ),
    heatScore: Math.max(0, newspaper.heatScore - heatReduction),
  };
}

// ---- Headline generation ---------------------------------------------------

type NewsTrigger =
  | { kind: 'echelon_up'; tier: string }
  | { kind: 'coalition' }
  | { kind: 'rival_defeated'; rivalName: string }
  | { kind: 'le_milestone'; amount: number }
  | { kind: 'ethics_positive'; ethics: number }
  | { kind: 'ethics_negative'; ethics: number }
  | { kind: 'premise_breach'; clauseLabel: string };

function formatMilestone(amount: number): string {
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(0)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(0)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  return `$${(amount / 1e3).toFixed(0)}K`;
}

function makeItem(
  triggerKind: string,
  now: number,
  category: NewsCategory,
  headline: string,
  body: string,
  sentimentScore: number
): NewsItem {
  return {
    id: `news-${triggerKind}-${now}`,
    at: now,
    category,
    headline,
    body,
    sentimentScore,
    read: false,
    responded: false,
  };
}

function generateNewsItem(
  trigger: NewsTrigger,
  companyName: string,
  now: number
): NewsItem {
  switch (trigger.kind) {
    case 'echelon_up':
      return makeItem('echelon', now, 'victory',
        `${companyName} Ascends to the ${trigger.tier} Tier`,
        `Analysts are taking notice as ${companyName} climbs the competitive ladder. The company's rise signals a new phase of ambition and reach.`,
        4);

    case 'coalition':
      return makeItem('coalition', now, 'politics',
        `Rivals Form Coalition Against ${companyName}`,
        `Industry insiders report a coordinated effort to curb ${companyName}'s expansion. The coalition represents an unprecedented show of collective opposition.`,
        -6);

    case 'rival_defeated':
      return makeItem('rival', now, 'victory',
        `${companyName} Outmanoeuvres ${trigger.rivalName}`,
        `In a display of strategic depth, ${companyName} has forced ${trigger.rivalName} into retreat. The market watches what move comes next.`,
        5);

    case 'le_milestone': {
      const label = formatMilestone(trigger.amount);
      return makeItem('milestone', now, 'business',
        `${companyName} Surpasses ${label} in Lifetime Revenue`,
        `A new earnings milestone has been reached, cementing ${companyName}'s place among the industry's fastest-growing operations.`,
        3);
    }

    case 'ethics_positive':
      return makeItem('ethics_pos', now, 'business',
        `${companyName} Hailed as a Model of Ethical Leadership`,
        `With a rising ethics standing, ${companyName} has drawn praise from advocacy groups and investors alike. Trust in the brand is at an all-time high.`,
        3);

    case 'ethics_negative':
      return makeItem('ethics_neg', now, 'scandal',
        `Questions Mount Over ${companyName}'s Business Practices`,
        `Critics point to a pattern of ruthless decisions as ${companyName}'s ethics index falls sharply. Calls for accountability are growing louder.`,
        -5);

    case 'premise_breach':
      return makeItem('breach', now, 'scandal',
        `${companyName} Breaks Pledge on "${trigger.clauseLabel}"`,
        `An inherited commitment has reportedly been violated, raising questions about ${companyName}'s promises to stakeholders and long-term integrity.`,
        -4);
  }
}

// ---- Tick ------------------------------------------------------------------

const LE_MILESTONES = [1_000_000, 100_000_000, 10_000_000_000];

export interface NewsTick {
  newspaper: NewspaperState;
  /** The single new item published this tick, if any. */
  newItem: NewsItem | null;
}

export function tickNewspaper(
  newspaper: NewspaperState,
  state: GameState,
  dt: number,
  now: number,
  prevState: GameState
): NewsTick {
  // Heat decay
  let next: NewspaperState = {
    ...newspaper,
    heatScore: Math.max(0, newspaper.heatScore - (HEAT_DECAY_PER_MIN / 60) * dt),
  };

  if (now - next.lastPublishedAt < MIN_PUBLISH_INTERVAL_MS) {
    return { newspaper: next, newItem: null };
  }

  const companyName = state.setup?.name ?? 'The Company';

  // Detect transitions and collect candidate items (publish at most one per tick)
  const candidates: NewsItem[] = [];

  // 1. Echelon tier up
  if (state.echelon?.tier && prevState.echelon?.tier &&
      state.echelon.tier !== prevState.echelon.tier) {
    const label = ECHELON_LABELS[state.echelon.tier] ?? state.echelon.tier;
    candidates.push(generateNewsItem({ kind: 'echelon_up', tier: label }, companyName, now));
  }

  // 2. Coalition formed
  if (state.coalitionActive && !prevState.coalitionActive) {
    candidates.push(generateNewsItem({ kind: 'coalition' }, companyName, now));
  }

  // 3. Rival defeated
  for (const rival of state.rivals ?? []) {
    const prevR = (prevState.rivals ?? []).find((r) => r.id === rival.id);
    if (rival.posture === 'DEFEATED' && prevR?.posture !== 'DEFEATED') {
      const cfg = getRivalConfig(rival.id);
      candidates.push(generateNewsItem(
        { kind: 'rival_defeated', rivalName: cfg?.name ?? rival.id },
        companyName,
        now
      ));
    }
  }

  // 4. LE milestones
  for (const milestone of LE_MILESTONES) {
    if (state.lifetimeEarnings >= milestone && prevState.lifetimeEarnings < milestone) {
      candidates.push(generateNewsItem({ kind: 'le_milestone', amount: milestone }, companyName, now));
    }
  }

  // 5. Ethics crosses ±60
  const prevEthics = prevState.story?.ethics ?? 0;
  const currEthics = state.story?.ethics ?? 0;
  if (currEthics >= 60 && prevEthics < 60) {
    candidates.push(generateNewsItem({ kind: 'ethics_positive', ethics: currEthics }, companyName, now));
  }
  if (currEthics <= -60 && prevEthics > -60) {
    candidates.push(generateNewsItem({ kind: 'ethics_negative', ethics: currEthics }, companyName, now));
  }

  // 6. Premise clause breached
  if (state.premise && prevState.premise) {
    for (const cl of state.premise.clauses) {
      const prevCl = prevState.premise.clauses.find((p) => p.id === cl.id);
      if (cl.status === 'breached' && prevCl?.status === 'fulfilled') {
        const clauseCfg = CLAUSE_CONFIGS.find((c) => c.id === cl.id);
        candidates.push(generateNewsItem(
          { kind: 'premise_breach', clauseLabel: clauseCfg?.label ?? cl.id },
          companyName,
          now
        ));
      }
    }
  }

  if (candidates.length === 0) {
    return { newspaper: next, newItem: null };
  }

  const toPublish = candidates[0];
  const heatAdd = toPublish.sentimentScore < 0 ? Math.abs(toPublish.sentimentScore) * 3 : 0;

  next = {
    items: [toPublish, ...next.items].slice(0, 20),
    lastPublishedAt: now,
    heatScore: Math.min(100, next.heatScore + heatAdd),
  };

  return { newspaper: next, newItem: toPublish };
}

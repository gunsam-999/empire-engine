// ============================================================================
// NewspaperEngine / The Financial Ledger (Sessions 5.3 + Part 10).
//
// The Financial Ledger is the world's single voice. It publishes about:
//   - Player milestones and ethics transitions (original 5.3)
//   - Rival smear campaigns (rivals at HOSTILE+ can plant negative stories)
//   - Pantheon titan activities (fed from PantheonEngine each tick)
//   - Story arcs: related headlines bind into threads with phases
//   - Front page: the most impactful recent story gets featured treatment
//   - Breaking news: coalition, titan surpass, titan entering as rival
//
// Heat score still applies; player can respond to any negative item.
// Archive expanded from 20 to 50 items. Issue number tracked.
// ============================================================================

import type {
  GameState,
  LedgerStoryArc,
  NewsCategory,
  NewsItem,
  NewspaperState,
  StoryArcPhase,
} from '../game/types';
import { getRivalConfig } from '../data/rivals';
import { ALL_CLAUSE_CONFIGS as CLAUSE_CONFIGS } from '../data/premises';
import { ECHELON_LABELS } from './EchelonEngine';

const MIN_PUBLISH_INTERVAL_MS = 60_000;  // 1 min between player-event items
const HEAT_DECAY_PER_MIN = 0.5;
const RESPOND_HEAT_REDUCTION = 30;
const MAX_ARCHIVE = 50;
const SMEAR_CAMPAIGN_INTERVAL_MS = 5 * 60_000; // rivals can smear every 5 min

export const NEWS_RESPOND_COST = 200; // influence

export function defaultNewspaperState(): NewspaperState {
  return {
    items: [],
    lastPublishedAt: 0,
    heatScore: 0,
    arcs: [],
    frontPageItemId: null,
    issueNumber: 1,
  };
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
  | { kind: 'rival_defeated'; rivalName: string; rivalId: string }
  | { kind: 'le_milestone'; amount: number }
  | { kind: 'ethics_positive'; ethics: number }
  | { kind: 'ethics_negative'; ethics: number }
  | { kind: 'premise_breach'; clauseLabel: string }
  | { kind: 'rival_smear'; rivalName: string; rivalId: string; rivalDomain: string }
  | { kind: 'titan_noticed'; titanName: string; titanTitle: string }
  | { kind: 'titan_surpassed'; titanName: string; titanTitle: string; valuation: string }
  | { kind: 'titan_rival_entry'; titanName: string; titanTitle: string }
  | { kind: 'vendetta'; rivalName: string; rivalId: string };

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
  sentimentScore: number,
  extras: Partial<NewsItem> = {}
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
    ...extras,
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
        4, { section: 'empire', isFrontPage: false });

    case 'coalition':
      return makeItem('coalition', now, 'politics',
        `Rivals Form Coalition Against ${companyName}`,
        `Industry insiders report a coordinated effort to curb ${companyName}'s expansion. The coalition represents an unprecedented show of collective opposition.`,
        -6, { section: 'rivals', isBreaking: true });

    case 'rival_defeated':
      return makeItem('rival', now, 'victory',
        `${companyName} Outmanoeuvres ${trigger.rivalName}`,
        `In a display of strategic depth, ${companyName} has forced ${trigger.rivalName} into retreat. The market watches what move comes next.`,
        5, { section: 'rivals', rivalSourceId: trigger.rivalId });

    case 'le_milestone': {
      const label = formatMilestone(trigger.amount);
      return makeItem('milestone', now, 'business',
        `${companyName} Surpasses ${label} in Lifetime Revenue`,
        `A new earnings milestone has been reached, cementing ${companyName}'s place among the industry's fastest-growing operations.`,
        3, { section: 'empire' });
    }

    case 'ethics_positive':
      return makeItem('ethics_pos', now, 'business',
        `${companyName} Hailed as a Model of Ethical Leadership`,
        `With a rising ethics standing, ${companyName} has drawn praise from advocacy groups and investors alike. Trust in the brand is at an all-time high.`,
        3, { section: 'empire' });

    case 'ethics_negative':
      return makeItem('ethics_neg', now, 'scandal',
        `Questions Mount Over ${companyName}'s Business Practices`,
        `Critics point to a pattern of ruthless decisions as ${companyName}'s ethics index falls sharply. Calls for accountability are growing louder.`,
        -5, { section: 'scandal' });

    case 'premise_breach':
      return makeItem('breach', now, 'scandal',
        `${companyName} Breaks Pledge on "${trigger.clauseLabel}"`,
        `An inherited commitment has reportedly been violated, raising questions about ${companyName}'s promises to stakeholders and long-term integrity.`,
        -4, { section: 'scandal' });

    case 'rival_smear':
      return makeItem(`smear-${trigger.rivalId}`, now, 'scandal',
        `Sources Close to ${trigger.rivalName} Allege ${companyName} Misconduct`,
        `Unnamed insiders tied to ${trigger.rivalName}'s ${trigger.rivalDomain} operations are circulating claims of questionable practices at ${companyName}. The company has not yet responded. Critics call it a coordinated smear.`,
        -5, { section: 'scandal', rivalSourceId: trigger.rivalId });

    case 'titan_noticed':
      return makeItem(`titan-noticed-${now}`, now, 'business',
        `${trigger.titanName} Comments on ${companyName}: "Worth Watching"`,
        `${trigger.titanTitle} ${trigger.titanName} mentioned ${companyName} in an industry address, calling it "a company that has earned its place at the conversation table." The market interpreted this as the highest-tier validation.`,
        4, { section: 'pantheon' });

    case 'titan_surpassed':
      return makeItem(`titan-surpass-${now}`, now, 'victory',
        `LANDMARK: ${companyName} Surpasses ${trigger.titanName}'s Estimated Valuation`,
        `${companyName} has crossed a threshold that seemed unthinkable at founding: its estimated valuation now exceeds ${trigger.titanName} (${trigger.titanTitle}), who is reported to have said: "Interesting. I have a spreadsheet for this scenario." The world is watching.`,
        8, { section: 'empire', isFrontPage: true, isBreaking: true });

    case 'titan_rival_entry':
      return makeItem(`titan-rival-${now}`, now, 'politics',
        `${trigger.titanName} Targets ${companyName}: "Competition Is How I Pay Respect"`,
        `In an extraordinary development, ${trigger.titanName} (${trigger.titanTitle}) has announced direct competitive action against ${companyName}, calling it "the most interesting opponent I have encountered in two decades." The gloves are off.`,
        -7, { section: 'rivals', isBreaking: true });

    case 'vendetta':
      return makeItem(`vendetta-${trigger.rivalId}`, now, 'scandal',
        `${trigger.rivalName} Declares Personal Vendetta Against ${companyName}`,
        `Sources indicate ${trigger.rivalName} has entered personal vendetta mode, directing resources specifically at undermining ${companyName}'s operations. "This is no longer business. This is a lesson," one insider reports.`,
        -6, { section: 'rivals', rivalSourceId: trigger.rivalId });
  }
}

// ---- Story Arc management --------------------------------------------------

function arcPhaseFromCount(count: number): StoryArcPhase {
  if (count === 1) return 'emerging';
  if (count === 2) return 'escalating';
  if (count >= 3 && count < 5) return 'peak';
  return 'resolved';
}

function arcKeyFromItem(item: NewsItem): string | null {
  if (item.rivalSourceId) return `rival_${item.rivalSourceId}`;
  if (item.titanId) return `titan_${item.titanId}`;
  if (item.section === 'scandal' && !item.rivalSourceId) return 'scandal_general';
  return null;
}

function updateArcs(arcs: LedgerStoryArc[], newItem: NewsItem, now: number): LedgerStoryArc[] {
  const arcKey = arcKeyFromItem(newItem);
  if (!arcKey) return arcs;

  const existing = arcs.find((a) => a.id === arcKey && a.resolvedAt === null);
  if (existing) {
    const relatedItemIds = [...existing.relatedItemIds, newItem.id];
    const phase = arcPhaseFromCount(relatedItemIds.length);
    const resolved = phase === 'resolved' ? now : null;
    return arcs.map((a) =>
      a.id === arcKey
        ? { ...a, relatedItemIds, phase, resolvedAt: resolved }
        : a
    );
  }

  const arcTitle = newItem.rivalSourceId
    ? `The ${newItem.rivalSourceId.charAt(0).toUpperCase() + newItem.rivalSourceId.slice(1)} Affair`
    : newItem.titanId
      ? `The ${newItem.titanId.charAt(0).toUpperCase() + newItem.titanId.slice(1)} Effect`
      : 'Breaking Development';

  const newArc: LedgerStoryArc = {
    id: arcKey,
    title: arcTitle,
    phase: 'emerging',
    relatedItemIds: [newItem.id],
    startedAt: now,
    resolvedAt: null,
  };
  return [...arcs, newArc];
}

function chooseFrontPage(items: NewsItem[]): string | null {
  const breaking = items.find((i) => i.isBreaking);
  if (breaking) return breaking.id;
  const highSentiment = [...items].sort((a, b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore))[0];
  return highSentiment?.id ?? null;
}

// ---- Rival smear detection -------------------------------------------------

function checkRivalSmear(state: GameState, now: number, newspaper: NewspaperState): NewsItem | null {
  const companyName = state.setup?.name ?? 'The Company';
  const elapsed = now - newspaper.lastPublishedAt;

  // Only fire a smear if there's been a gap.
  if (elapsed < SMEAR_CAMPAIGN_INTERVAL_MS) return null;

  // Find a hostile rival willing to run a smear.
  const hostileRivals = (state.rivals ?? []).filter(
    (r) => (r.posture === 'HOSTILE' || r.posture === 'WAR') && r.telegraph === null
  );
  if (hostileRivals.length === 0) return null;

  // Deterministic selection: pick based on attack count.
  const smearRival = hostileRivals.reduce((prev, curr) =>
    curr.timesAttacked > prev.timesAttacked ? curr : prev
  );

  const cfg = getRivalConfig(smearRival.id);
  if (!cfg) return null;

  return generateNewsItem(
    {
      kind: 'rival_smear',
      rivalName: cfg.name,
      rivalId: smearRival.id,
      rivalDomain: cfg.domain,
    },
    companyName,
    now
  );
}

// ---- Tick ------------------------------------------------------------------

const LE_MILESTONES = [1_000_000, 100_000_000, 10_000_000_000];

export interface NewsTick {
  newspaper: NewspaperState;
  newItem: NewsItem | null;
}

export function tickNewspaper(
  newspaper: NewspaperState,
  state: GameState,
  dt: number,
  now: number,
  prevState: GameState
): NewsTick {
  // Heat decay.
  let next: NewspaperState = {
    ...newspaper,
    heatScore: Math.max(0, newspaper.heatScore - (HEAT_DECAY_PER_MIN / 60) * dt),
  };

  if (now - next.lastPublishedAt < MIN_PUBLISH_INTERVAL_MS) {
    return { newspaper: next, newItem: null };
  }

  const companyName = state.setup?.name ?? 'The Company';
  const candidates: NewsItem[] = [];

  // 1. Echelon tier up.
  if (state.echelon?.tier && prevState.echelon?.tier &&
      state.echelon.tier !== prevState.echelon.tier) {
    const label = ECHELON_LABELS[state.echelon.tier] ?? state.echelon.tier;
    candidates.push(generateNewsItem({ kind: 'echelon_up', tier: label }, companyName, now));
  }

  // 2. Coalition formed.
  if (state.coalitionActive && !prevState.coalitionActive) {
    candidates.push(generateNewsItem({ kind: 'coalition' }, companyName, now));
  }

  // 3. Rival defeated.
  for (const rival of state.rivals ?? []) {
    const prevR = (prevState.rivals ?? []).find((r) => r.id === rival.id);
    if (rival.posture === 'DEFEATED' && prevR?.posture !== 'DEFEATED') {
      const cfg = getRivalConfig(rival.id);
      candidates.push(generateNewsItem(
        { kind: 'rival_defeated', rivalName: cfg?.name ?? rival.id, rivalId: rival.id },
        companyName,
        now
      ));
    }
  }

  // 4. LE milestones.
  for (const milestone of LE_MILESTONES) {
    if (state.lifetimeEarnings >= milestone && prevState.lifetimeEarnings < milestone) {
      candidates.push(generateNewsItem({ kind: 'le_milestone', amount: milestone }, companyName, now));
    }
  }

  // 5. Ethics.
  const prevEthics = prevState.story?.ethics ?? 0;
  const currEthics = state.story?.ethics ?? 0;
  if (currEthics >= 60 && prevEthics < 60) {
    candidates.push(generateNewsItem({ kind: 'ethics_positive', ethics: currEthics }, companyName, now));
  }
  if (currEthics <= -60 && prevEthics > -60) {
    candidates.push(generateNewsItem({ kind: 'ethics_negative', ethics: currEthics }, companyName, now));
  }

  // 6. Premise breach.
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

  // 7. Rival smear campaigns.
  const smear = checkRivalSmear(state, now, next);
  if (smear) candidates.push(smear);

  // 8. Vendetta declared.
  for (const v of (state.intel?.vendettas ?? [])) {
    const prevV = (prevState.intel?.vendettas ?? []).find((pv) => pv.rivalId === v.rivalId);
    if (!prevV && v.escalationLevel >= 1) {
      const cfg = getRivalConfig(v.rivalId);
      candidates.push(generateNewsItem(
        { kind: 'vendetta', rivalName: cfg?.name ?? v.rivalId, rivalId: v.rivalId },
        companyName,
        now
      ));
    }
  }

  if (candidates.length === 0) {
    return { newspaper: next, newItem: null };
  }

  // Prioritise: breaking > high magnitude sentiment.
  const toPublish =
    candidates.find((c) => c.isBreaking) ??
    candidates.sort((a, b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore))[0];

  const heatAdd = toPublish.sentimentScore < 0 ? Math.abs(toPublish.sentimentScore) * 3 : 0;
  const newItems = [toPublish, ...next.items].slice(0, MAX_ARCHIVE);
  const newArcs = updateArcs(next.arcs, toPublish, now);
  const frontPageItemId = chooseFrontPage(newItems);

  next = {
    items: newItems,
    lastPublishedAt: now,
    heatScore: Math.min(100, next.heatScore + heatAdd),
    arcs: newArcs,
    frontPageItemId,
    issueNumber: next.issueNumber,
  };

  return { newspaper: next, newItem: toPublish };
}

/** Called from PantheonEngine when a titan generates an activity. */
export function publishPantheonItem(
  newspaper: NewspaperState,
  item: NewsItem,
  now: number
): NewspaperState {
  const newItems = [item, ...newspaper.items].slice(0, MAX_ARCHIVE);
  const newArcs = updateArcs(newspaper.arcs, item, now);
  const frontPageItemId = item.isFrontPage ? item.id : newspaper.frontPageItemId;
  const issueNumber = item.isFrontPage ? newspaper.issueNumber + 1 : newspaper.issueNumber;
  return {
    ...newspaper,
    items: newItems,
    arcs: newArcs,
    frontPageItemId,
    issueNumber,
  };
}

/** Publish a titan-surpassed front-page breaking story. */
export function publishTitanSurpassed(
  newspaper: NewspaperState,
  titanName: string,
  titanTitle: string,
  valuation: string,
  companyName: string,
  now: number
): NewspaperState {
  const item = generateNewsItem(
    { kind: 'titan_surpassed', titanName, titanTitle, valuation },
    companyName,
    now
  );
  const newItems = [item, ...newspaper.items].slice(0, MAX_ARCHIVE);
  return {
    ...newspaper,
    items: newItems,
    arcs: updateArcs(newspaper.arcs, item, now),
    frontPageItemId: item.id,
    issueNumber: newspaper.issueNumber + 1,
    heatScore: newspaper.heatScore, // triumph — no heat
  };
}

/** Publish that a titan has entered as a rival (breaking, negative). */
export function publishTitanRivalEntry(
  newspaper: NewspaperState,
  titanName: string,
  titanTitle: string,
  companyName: string,
  now: number
): NewspaperState {
  const item = generateNewsItem(
    { kind: 'titan_rival_entry', titanName, titanTitle },
    companyName,
    now
  );
  const newItems = [item, ...newspaper.items].slice(0, MAX_ARCHIVE);
  const heatAdd = Math.abs(item.sentimentScore) * 3;
  return {
    ...newspaper,
    items: newItems,
    arcs: updateArcs(newspaper.arcs, item, now),
    frontPageItemId: item.id,
    issueNumber: newspaper.issueNumber + 1,
    heatScore: Math.min(100, newspaper.heatScore + heatAdd),
    lastPublishedAt: now,
  };
}

/** Publish a "titan noticed the player" prestige article. */
export function publishTitanNoticed(
  newspaper: NewspaperState,
  titanName: string,
  titanTitle: string,
  companyName: string,
  now: number
): NewspaperState {
  const item = generateNewsItem({ kind: 'titan_noticed', titanName, titanTitle }, companyName, now);
  const newItems = [item, ...newspaper.items].slice(0, MAX_ARCHIVE);
  return {
    ...newspaper,
    items: newItems,
    arcs: updateArcs(newspaper.arcs, item, now),
    frontPageItemId: newspaper.frontPageItemId,
    issueNumber: newspaper.issueNumber,
    lastPublishedAt: now,
  };
}

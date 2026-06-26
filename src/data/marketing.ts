// ============================================================================
// Empire Engine — MARKETING DATA
// Real-world marketing channels with hard-wired, authentic step names.
// Each channel = a ladder of real marketing actions the player unlocks.
// Pure data + cost-curve helpers. No React, no game state mutation.
// ============================================================================

export interface MarketingStep {
  name: string;
  desc: string;
  cost: number;
  reachRate: number;
  followerRate?: number;
  audienceRate?: number;
}

export interface MarketingChannel {
  id: string;
  name: string;
  emoji: string;
  kind: 'social' | 'content' | 'paid' | 'email' | 'influencer' | 'community';
  tagline: string;
  mustHave?: boolean;
  costCurrency: 'cash' | 'influence';
  /** 0..1 — how strongly this channel snowballs over time (SEO/social effect). */
  compounding: number;
  /** Optional per-second cash upkeep (paid channels stop reaching if unpaid). */
  upkeepPerSec?: number;
  steps: MarketingStep[];
}

export interface MarketingCampaign {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  costCurrency: 'cash' | 'influence';
  reachMult: number;
  durationSec: number;
  desc: string;
}

// ----------------------------------------------------------------------------
// Cost curve — each step in a channel escalates. Step cost = base * mul^index.
// ----------------------------------------------------------------------------

export const STEP_COST_BASE = 60;
export const STEP_COST_MUL = 4.2;

/** Default escalating cost for the i-th (0-based) step of a channel. */
export function defaultStepCost(index: number, base = STEP_COST_BASE): number {
  return Math.round(base * Math.pow(STEP_COST_MUL, index));
}

// ----------------------------------------------------------------------------
// Channels — names are REAL real-life marketing actions, hard-wired per step.
// ----------------------------------------------------------------------------

export const MARKETING_CHANNELS: MarketingChannel[] = [
  // 1. SOCIAL — followers snowball, virality.
  {
    id: 'social',
    name: 'Social Media Marketing',
    emoji: '📱',
    kind: 'social',
    tagline: 'Show up daily, build a following, go viral.',
    mustHave: true,
    costCurrency: 'cash',
    compounding: 0.6,
    steps: [
      { name: 'Create Profiles', desc: 'Claim your handles across platforms.', cost: defaultStepCost(0), reachRate: 3, followerRate: 0.4 },
      { name: 'Post Consistently', desc: 'A steady content calendar keeps you visible.', cost: defaultStepCost(1), reachRate: 9, followerRate: 1.4 },
      { name: 'Engage & Reply', desc: 'Talk to your audience — the algorithm loves it.', cost: defaultStepCost(2), reachRate: 22, followerRate: 3.2, audienceRate: 0.6 },
      { name: 'Run a Hashtag Campaign', desc: 'A branded hashtag spreads reach organically.', cost: defaultStepCost(3), reachRate: 55, followerRate: 7, audienceRate: 1.4 },
      { name: 'Go Viral', desc: 'One breakout post explodes your numbers.', cost: defaultStepCost(4), reachRate: 140, followerRate: 18, audienceRate: 3.5 },
      { name: 'Influencer Collabs', desc: 'Co-create with creators to borrow their audience.', cost: defaultStepCost(5), reachRate: 320, followerRate: 42, audienceRate: 8 },
    ],
  },

  // 2. CONTENT — steady reach that compounds strongest over time (SEO).
  {
    id: 'content',
    name: 'Content Marketing',
    emoji: '✍️',
    kind: 'content',
    tagline: 'Slow to start, then a compounding flywheel.',
    mustHave: true,
    costCurrency: 'cash',
    compounding: 0.9,
    steps: [
      { name: 'Launch a Blog', desc: 'Your owned home for valuable content.', cost: defaultStepCost(0), reachRate: 2, audienceRate: 0.3 },
      { name: 'Keyword & SEO Research', desc: 'Target what people actually search for.', cost: defaultStepCost(1), reachRate: 7, audienceRate: 0.9 },
      { name: 'Publish Weekly', desc: 'Volume + consistency compounds search traffic.', cost: defaultStepCost(2), reachRate: 18, audienceRate: 2.2 },
      { name: 'Build Backlinks / Authority', desc: 'Earned links lift every page you own.', cost: defaultStepCost(3), reachRate: 46, audienceRate: 5.5 },
      { name: 'Lead Magnets', desc: 'Trade value for emails and convert readers.', cost: defaultStepCost(4), reachRate: 100, audienceRate: 13 },
      { name: 'Content Flywheel', desc: 'Repurpose everywhere — the engine self-sustains.', cost: defaultStepCost(5), reachRate: 240, audienceRate: 32 },
    ],
  },

  // 3. PAID — big instant reach, no compounding, ongoing cash upkeep.
  {
    id: 'paid',
    name: 'Paid Advertising',
    emoji: '💸',
    kind: 'paid',
    tagline: 'Buy reach instantly — but you pay every second.',
    costCurrency: 'cash',
    compounding: 0,
    upkeepPerSec: 6,
    steps: [
      { name: 'Boost Posts', desc: 'Put money behind your best organic content.', cost: defaultStepCost(0), reachRate: 60 },
      { name: 'Search Ads', desc: 'Capture high-intent demand at the moment of search.', cost: defaultStepCost(1), reachRate: 180, audienceRate: 2 },
      { name: 'Retargeting', desc: 'Win back visitors who did not convert.', cost: defaultStepCost(2), reachRate: 420, audienceRate: 6 },
      { name: 'Programmatic', desc: 'Automated bidding scales reach across the web.', cost: defaultStepCost(3), reachRate: 1100, audienceRate: 14 },
    ],
  },

  // 4. EMAIL — converts audience to loyal, boosts retention/conversion.
  {
    id: 'email',
    name: 'Email Marketing',
    emoji: '✉️',
    kind: 'email',
    tagline: 'Own the relationship. Loyal audience, repeat sales.',
    costCurrency: 'cash',
    compounding: 0.4,
    steps: [
      { name: 'Collect Emails', desc: 'Build a list you actually own.', cost: defaultStepCost(0), reachRate: 4, audienceRate: 1 },
      { name: 'Newsletter', desc: 'Stay top-of-mind with regular value.', cost: defaultStepCost(1), reachRate: 12, audienceRate: 3 },
      { name: 'Automations', desc: 'Welcome + nurture flows convert on autopilot.', cost: defaultStepCost(2), reachRate: 28, audienceRate: 7 },
      { name: 'Segmentation', desc: 'Right message, right person — retention soars.', cost: defaultStepCost(3), reachRate: 60, audienceRate: 16 },
    ],
  },

  // 5. INFLUENCER & PR — large reach bursts; later steps cost influence.
  {
    id: 'influencer',
    name: 'Influencer & PR',
    emoji: '🌟',
    kind: 'influencer',
    tagline: 'Borrow trust at scale with creators and press.',
    costCurrency: 'influence',
    compounding: 0.2,
    steps: [
      { name: 'Micro-influencers', desc: 'Niche creators with engaged, trusting audiences.', cost: 40, reachRate: 70, followerRate: 6 },
      { name: 'Mid-tier Creators', desc: 'Bigger reach, still authentic.', cost: 180, reachRate: 200, followerRate: 18, audienceRate: 4 },
      { name: 'Celebrity Endorsement', desc: 'A household name puts you on the map.', cost: 700, reachRate: 650, followerRate: 60, audienceRate: 14 },
      { name: 'Press Features', desc: 'Earned media in major outlets builds credibility.', cost: 2600, reachRate: 1600, followerRate: 120, audienceRate: 30 },
    ],
  },

  // 6. REFERRAL & COMMUNITY — viral coefficient, scales with existing audience.
  {
    id: 'community',
    name: 'Referral & Community',
    emoji: '🤝',
    kind: 'community',
    tagline: 'Your audience brings your next audience.',
    costCurrency: 'cash',
    compounding: 0.7,
    steps: [
      { name: 'Referral Program', desc: 'Reward members for bringing friends.', cost: defaultStepCost(1), reachRate: 14, audienceRate: 2.5 },
      { name: 'Brand Community', desc: 'A home where fans gather and advocate.', cost: defaultStepCost(2), reachRate: 40, audienceRate: 7 },
      { name: 'Ambassadors', desc: 'Power users evangelize on your behalf.', cost: defaultStepCost(3), reachRate: 110, audienceRate: 20 },
    ],
  },
];

// ----------------------------------------------------------------------------
// Launchable campaigns — temporary reach multipliers.
// ----------------------------------------------------------------------------

export const MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'launch',
    name: 'Product Launch',
    emoji: '🚀',
    cost: 1500,
    costCurrency: 'cash',
    reachMult: 2.5,
    durationSec: 60,
    desc: 'A coordinated launch blitz across every channel.',
  },
  {
    id: 'sale',
    name: 'Seasonal Sale',
    emoji: '🏷️',
    cost: 4000,
    costCurrency: 'cash',
    reachMult: 2,
    durationSec: 120,
    desc: 'A limited-time sale drives a wave of new customers.',
  },
  {
    id: 'stunt',
    name: 'Viral Stunt',
    emoji: '🎯',
    cost: 120,
    costCurrency: 'influence',
    reachMult: 4,
    durationSec: 30,
    desc: 'A bold publicity stunt — huge reach, short burst.',
  },
  {
    id: 'pr',
    name: 'PR Blitz',
    emoji: '📰',
    cost: 80,
    costCurrency: 'influence',
    reachMult: 3,
    durationSec: 90,
    desc: 'Saturate the press cycle and own the conversation.',
  },
];

// ---- Lookups ----------------------------------------------------------------

export function getMarketingChannel(id: string): MarketingChannel | undefined {
  return MARKETING_CHANNELS.find((c) => c.id === id);
}

export function getMarketingCampaign(id: string): MarketingCampaign | undefined {
  return MARKETING_CAMPAIGNS.find((c) => c.id === id);
}

/** Cost of unlocking the step at the given current level (0-based next step). */
export function stepCostForLevel(ch: MarketingChannel, level: number): number {
  const step = ch.steps[level];
  return step ? step.cost : Infinity;
}

// ============================================================================
// Empire Engine — random events. Three tiers of escalating stakes:
//   MICRO   — frequent, fast dopamine. Tap to collect, or a one-tap snap choice.
//   MAJOR   — rarer, meaningful forks with real trade-offs.
//   CRISIS  — dangerous. Pay to defend, or accept the damage and gamble.
//
// Shape (consumed by EVENT_RESOLVE):
//   { id, title, text, icon, options: [{ label, reward?, cost? }] }
//   reward: GameReward  — { cash, insight, influence, lp, boost{mult,seconds} }
//   cost:   { cash?, influence?, lp? } — subtracted only if affordable.
// ============================================================================

import type { GameReward } from '../game/types';

export interface EventOption {
  label: string;
  reward?: GameReward;
  cost?: { cash?: number; influence?: number; lp?: number };
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  icon: string;
  options: EventOption[];
}

// ---------------------------------------------------------------------------
// MICRO EVENTS — quick collect / snap choice. Rewards lean on % boosts so they
// scale with the player's stage instead of going stale.
// ---------------------------------------------------------------------------
export const MICRO_EVENTS: GameEvent[] = [
  {
    id: 'micro_review',
    title: 'Glowing Review',
    text: 'A tastemaker just called you “the one to watch.” Demand spikes.',
    icon: '⭐',
    options: [
      { label: 'Ride the wave (+production for 60s)', reward: { boost: { mult: 1.5, seconds: 60 } } },
    ],
  },
  {
    id: 'micro_grant',
    title: 'Small Grant',
    text: 'An innovation fund wired you a no-strings cheque. Tidy.',
    icon: '💵',
    options: [{ label: 'Cash it', reward: { cash: 2500 } }],
  },
  {
    id: 'micro_intern',
    title: 'Brilliant Intern',
    text: 'The new hire fixed three bugs nobody assigned. Insight gained.',
    icon: '🧠',
    options: [{ label: 'Promote on the spot', reward: { insight: 40 } }],
  },
  {
    id: 'micro_viral',
    title: 'It Went Viral',
    text: 'A clip of your product hit ten million views overnight.',
    icon: '📈',
    options: [
      { label: 'Pour fuel on it (x2 for 45s)', reward: { boost: { mult: 2, seconds: 45 } } },
    ],
  },
  {
    id: 'micro_networking',
    title: 'The Right Room',
    text: 'You shook the right hand at the wrong party. Doors open.',
    icon: '🤝',
    options: [{ label: 'Work the room', reward: { influence: 60 } }],
  },
  {
    id: 'micro_supplier',
    title: 'Supplier Sweetener',
    text: 'A vendor wants your logo on their site and pays for the privilege.',
    icon: '📦',
    options: [
      { label: 'Take the cheque', reward: { cash: 4000 } },
      { label: 'Trade it for goodwill instead', reward: { influence: 80 } },
    ],
  },
  {
    id: 'micro_caffeine',
    title: 'Caffeine Sprint',
    text: 'The whole floor is locked in. Nobody’s going home tonight.',
    icon: '☕',
    options: [
      { label: 'Let them cook (x1.75 for 90s)', reward: { boost: { mult: 1.75, seconds: 90 } } },
    ],
  },
  {
    id: 'micro_patent',
    title: 'Patent Cleared',
    text: 'A filing you forgot about just got approved. Free insight.',
    icon: '📜',
    options: [{ label: 'File it away', reward: { insight: 75 } }],
  },
];

// ---------------------------------------------------------------------------
// MAJOR EVENTS — genuine forks. Each option trades one currency for another or
// a sustained boost; no purely free lunch.
// ---------------------------------------------------------------------------
export const MAJOR_EVENTS: GameEvent[] = [
  {
    id: 'major_acquisition',
    title: 'Acquisition Offer',
    text: 'A struggling competitor will sell you their whole operation — for a price.',
    icon: '🏢',
    options: [
      {
        label: 'Buy them out (spend influence, gain a long boost)',
        cost: { influence: 200 },
        reward: { boost: { mult: 2.5, seconds: 240 } },
      },
      { label: 'Let them fold and scoop the scraps', reward: { cash: 50000 } },
    ],
  },
  {
    id: 'major_ipo_buzz',
    title: 'IPO Whispers',
    text: 'Bankers are circling. Go public now and the windfall is enormous — but loud.',
    icon: '🔔',
    options: [
      {
        label: 'Ring the bell (big cash, costs influence)',
        cost: { influence: 150 },
        reward: { cash: 500000 },
      },
      {
        label: 'Stay private and keep your leverage',
        reward: { influence: 250, boost: { mult: 1.5, seconds: 180 } },
      },
    ],
  },
  {
    id: 'major_talent_raid',
    title: 'Talent Raid',
    text: 'A rival’s entire research wing wants out. You can poach all of them today.',
    icon: '🧑‍🔬',
    options: [
      {
        label: 'Sign them all (costs cash, floods you with insight)',
        cost: { cash: 100000 },
        reward: { insight: 600 },
      },
      { label: 'Take just the lead and stay lean', reward: { insight: 150 } },
    ],
  },
  {
    id: 'major_landmark',
    title: 'Landmark Headquarters',
    text: 'A famous skyline tower is for sale. A trophy address rewrites how the world sees you.',
    icon: '🏙️',
    options: [
      {
        label: 'Buy the tower (heavy cash, lasting prestige boost)',
        cost: { cash: 750000 },
        reward: { boost: { mult: 3, seconds: 300 }, influence: 300 },
      },
      { label: 'Stay humble, bank the difference', reward: { cash: 100000 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// CRISIS EVENTS — defend-or-accept. The defend option costs real resources to
// neutralize the threat (and usually grants a small upside). The accept option
// is free but risky / lossy, with a sliver of compensation.
// ---------------------------------------------------------------------------
export const CRISIS_EVENTS: GameEvent[] = [
  {
    id: 'crisis_recall',
    title: 'Product Recall',
    text: 'A defect slipped through. Pull the line now, or ship and pray nobody notices.',
    icon: '⚠️',
    options: [
      {
        label: 'Recall everything and own it (costs cash, earns trust)',
        cost: { cash: 200000 },
        reward: { influence: 200 },
      },
      {
        label: 'Ship it and hope (free, but a boost to outrun the news)',
        reward: { boost: { mult: 1.4, seconds: 60 } },
      },
    ],
  },
  {
    id: 'crisis_hack',
    title: 'Security Breach',
    text: 'Someone is inside your systems. Pay the ransom, or burn it down and rebuild.',
    icon: '🛡️',
    options: [
      {
        label: 'Pay and patch quietly (costs cash)',
        cost: { cash: 300000 },
        reward: { insight: 100 },
      },
      {
        label: 'Refuse, go public, eat the chaos (free, costs influence later)',
        reward: { influence: 120 },
        cost: { influence: 0 },
      },
    ],
  },
  {
    id: 'crisis_scandal',
    title: 'Whistleblower',
    text: 'An insider is about to publish. Settle for silence, or let the truth land where it will.',
    icon: '📰',
    options: [
      {
        label: 'Settle and seal it (costs influence)',
        cost: { influence: 250 },
        reward: { cash: 250000 },
      },
      {
        label: 'Let it run and rebuild your name (free, slow rebuild boost)',
        reward: { boost: { mult: 1.3, seconds: 120 } },
      },
    ],
  },
  {
    id: 'crisis_market_crash',
    title: 'Market Crash',
    text: 'The whole sector is in freefall. Hedge hard now, or hold and bet on the rebound.',
    icon: '📉',
    options: [
      {
        label: 'Hedge the position (costs cash, steadies the ship)',
        cost: { cash: 400000 },
        reward: { boost: { mult: 1.6, seconds: 120 } },
      },
      {
        label: 'Buy the dip with everything (free gamble, huge if it lands)',
        reward: { cash: 800000 },
      },
    ],
  },
];

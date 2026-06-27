// ============================================================================
// Empire Engine  -  Milestones.
// Permanent, one-time achievements. The TICK reducer evaluates each trigger
// generically and, when newly met, pushes the id into state.milestones.unlocked
// and applies the reward exactly once.
//
// Trigger types (all numerically comparable so the reducer stays generic):
//   earnings   → state.lifetimeEarnings >= value
//   tier       → highest unlocked facility tier >= value
//   prestige   → state.prestigeCount >= value
//   advisor    → number of recruited advisors >= value
//   facilities → total facilities owned (sum of counts) >= value
// ============================================================================

import type { GameReward } from '../game/types';

export const MILESTONES: {
  id: string;
  name: string;
  desc: string;
  icon: string;
  trigger: { type: 'earnings' | 'tier' | 'prestige' | 'advisor' | 'facilities'; value?: number };
  reward: GameReward;
}[] = [
  // ── Earnings ladder ───────────────────────────────────────────────────────
  {
    id: 'ms-first-grand',
    name: 'First Grand',
    desc: 'Earn your first $1,000. Everyone starts somewhere.',
    icon: '💵',
    trigger: { type: 'earnings', value: 1e3 },
    reward: { insight: 25 },
  },
  {
    id: 'ms-six-figures',
    name: 'Six Figures',
    desc: 'Cross $100,000 in lifetime earnings.',
    icon: '💰',
    trigger: { type: 'earnings', value: 1e5 },
    reward: { insight: 100, influence: 5 },
  },
  {
    id: 'ms-first-million',
    name: 'The First Million',
    desc: 'Lifetime earnings reach $1,000,000. Prestige beckons.',
    icon: '🏦',
    trigger: { type: 'earnings', value: 1e6 },
    reward: { influence: 25, boost: { mult: 2, seconds: 300 } },
  },
  {
    id: 'ms-billionaire',
    name: 'Billionaire',
    desc: 'Lifetime earnings reach $1,000,000,000.',
    icon: '🤑',
    trigger: { type: 'earnings', value: 1e9 },
    reward: { influence: 100, insight: 1000 },
  },
  {
    id: 'ms-trillion-club',
    name: 'Trillion-Dollar Club',
    desc: 'Lifetime earnings reach $1,000,000,000,000.',
    icon: '👑',
    trigger: { type: 'earnings', value: 1e12 },
    reward: { influence: 500, boost: { mult: 3, seconds: 600 } },
  },

  // ── Facilities owned ──────────────────────────────────────────────────────
  {
    id: 'ms-ten-facilities',
    name: 'Getting Busy',
    desc: 'Own 10 facilities in total.',
    icon: '🏭',
    trigger: { type: 'facilities', value: 10 },
    reward: { insight: 50 },
  },
  {
    id: 'ms-hundred-facilities',
    name: 'Industrial Park',
    desc: 'Own 100 facilities in total.',
    icon: '🏗️',
    trigger: { type: 'facilities', value: 100 },
    reward: { insight: 250, influence: 10 },
  },
  {
    id: 'ms-five-hundred-facilities',
    name: 'Sprawling Empire',
    desc: 'Own 500 facilities in total.',
    icon: '🌆',
    trigger: { type: 'facilities', value: 500 },
    reward: { influence: 75, boost: { mult: 2, seconds: 600 } },
  },

  // ── Tier unlocks ──────────────────────────────────────────────────────────
  {
    id: 'ms-tier-2',
    name: 'Scaling Up',
    desc: 'Unlock a Tier 2 facility.',
    icon: '⚙️',
    trigger: { type: 'tier', value: 2 },
    reward: { insight: 75 },
  },
  {
    id: 'ms-tier-3',
    name: 'Advanced Operations',
    desc: 'Unlock a Tier 3 facility  -  Insight now flows passively.',
    icon: '🔬',
    trigger: { type: 'tier', value: 3 },
    reward: { insight: 200, influence: 15 },
  },
  {
    id: 'ms-tier-4',
    name: 'Cutting Edge',
    desc: 'Unlock a Tier 4 facility.',
    icon: '🛰️',
    trigger: { type: 'tier', value: 4 },
    reward: { influence: 50, boost: { mult: 2, seconds: 450 } },
  },
  {
    id: 'ms-tier-5',
    name: 'The Pinnacle',
    desc: 'Unlock a Tier 5 facility  -  the apex of your industry.',
    icon: '✨',
    trigger: { type: 'tier', value: 5 },
    reward: { influence: 150, insight: 2500 },
  },

  // ── Prestige ──────────────────────────────────────────────────────────────
  {
    id: 'ms-first-prestige',
    name: 'Phoenix Rising',
    desc: 'Complete your first Restructure.',
    icon: '🔁',
    trigger: { type: 'prestige', value: 1 },
    reward: { influence: 30, boost: { mult: 2, seconds: 600 } },
  },
  {
    id: 'ms-fifth-prestige',
    name: 'Serial Founder',
    desc: 'Restructure five times.',
    icon: '🪙',
    trigger: { type: 'prestige', value: 5 },
    reward: { influence: 120, insight: 1500 },
  },

  // ── Advisors ──────────────────────────────────────────────────────────────
  {
    id: 'ms-first-advisor',
    name: 'Brain Trust',
    desc: 'Recruit your first advisor.',
    icon: '🧠',
    trigger: { type: 'advisor', value: 1 },
    reward: { insight: 60 },
  },
  {
    id: 'ms-five-advisors',
    name: 'Boardroom Full',
    desc: 'Recruit five advisors.',
    icon: '🤝',
    trigger: { type: 'advisor', value: 5 },
    reward: { influence: 80, boost: { mult: 2, seconds: 500 } },
  },
];

// ============================================================================
// Empire Engine  -  Research tree.
// 5 branches (production, efficiency, innovation, market, legacy) across tiers 1..4.
// Costs in Insight roughly double per tier (T1 ~100). timeSec doubles per tier
// (T1 60). Prerequisite chains create real build diversity  -  you cannot rush a
// tier-4 node without first investing down its branch (and sometimes across).
// ============================================================================

import type { ResearchNode } from '../game/types';

export const RESEARCH_NODES: ResearchNode[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTION  -  raw output. The bread-and-butter line; numbers go up.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'prod-1',
    branch: 'production',
    name: 'Assembly Optimization',
    desc: 'Reorganize the line. Every facility produces 25% more.',
    tier: 1,
    cost: 100,
    timeSec: 60,
    effect: { kind: 'production', value: 0.25 },
    requires: [],
  },
  {
    id: 'prod-2',
    branch: 'production',
    name: 'Parallel Throughput',
    desc: 'Run shifts back-to-back. +40% production across the board.',
    tier: 2,
    cost: 200,
    timeSec: 120,
    effect: { kind: 'production', value: 0.4 },
    requires: ['prod-1'],
  },
  {
    id: 'prod-3',
    branch: 'production',
    name: 'Automated Tooling',
    desc: 'Robots tend the robots. +60% production.',
    tier: 3,
    cost: 400,
    timeSec: 240,
    effect: { kind: 'production', value: 0.6 },
    requires: ['prod-2'],
  },
  {
    id: 'prod-4',
    branch: 'production',
    name: 'Hyperscale Lines',
    desc: 'A continent of output. +100% production.',
    tier: 4,
    cost: 800,
    timeSec: 480,
    effect: { kind: 'production', value: 1.0 },
    requires: ['prod-3', 'eff-2'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // EFFICIENCY  -  cost reduction. Makes scaling affordable; pairs with production.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'eff-1',
    branch: 'efficiency',
    name: 'Lean Sourcing',
    desc: 'Trim the supply chain. Facility costs reduced by 10%.',
    tier: 1,
    cost: 120,
    timeSec: 60,
    effect: { kind: 'cost', value: 0.1 },
    requires: [],
  },
  {
    id: 'eff-2',
    branch: 'efficiency',
    name: 'Bulk Procurement',
    desc: 'Buy the whole quarry. Facility costs reduced a further 12%.',
    tier: 2,
    cost: 240,
    timeSec: 120,
    effect: { kind: 'cost', value: 0.12 },
    requires: ['eff-1'],
  },
  {
    id: 'eff-3',
    branch: 'efficiency',
    name: 'Vertical Integration',
    desc: 'Own every link. Facility costs reduced a further 15%.',
    tier: 3,
    cost: 480,
    timeSec: 240,
    effect: { kind: 'cost', value: 0.15 },
    requires: ['eff-2'],
  },
  {
    id: 'eff-4',
    branch: 'efficiency',
    name: 'Zero-Waste Doctrine',
    desc: 'Nothing leaves the loop. Facility costs reduced a further 18%.',
    tier: 4,
    cost: 960,
    timeSec: 480,
    effect: { kind: 'cost', value: 0.18 },
    requires: ['eff-3', 'innov-2'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // INNOVATION  -  Insight generation + research speed. The "tech rush" line.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'innov-1',
    branch: 'innovation',
    name: 'R&D Wing',
    desc: 'Hire the curious. +20% Insight generation.',
    tier: 1,
    cost: 100,
    timeSec: 60,
    effect: { kind: 'insight', value: 0.2 },
    requires: [],
  },
  {
    id: 'innov-2',
    branch: 'innovation',
    name: 'Cross-Pollination',
    desc: 'Ideas trade floors. +30% Insight generation.',
    tier: 2,
    cost: 200,
    timeSec: 120,
    effect: { kind: 'insight', value: 0.3 },
    requires: ['innov-1'],
  },
  {
    id: 'innov-3',
    branch: 'innovation',
    name: 'Skunkworks',
    desc: 'A lab off the books. +45% Insight generation.',
    tier: 3,
    cost: 400,
    timeSec: 240,
    effect: { kind: 'insight', value: 0.45 },
    requires: ['innov-2'],
  },
  {
    id: 'innov-4',
    branch: 'innovation',
    name: 'Singularity Lab',
    desc: 'Research that researches itself. +70% Insight generation.',
    tier: 4,
    cost: 800,
    timeSec: 480,
    effect: { kind: 'insight', value: 0.7 },
    requires: ['innov-3', 'prod-2'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // MARKET  -  sale price & demand. Multiplies every dollar your goods fetch.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'mkt-1',
    branch: 'market',
    name: 'Brand Identity',
    desc: 'A logo people trust. +20% market price ceiling.',
    tier: 1,
    cost: 110,
    timeSec: 60,
    effect: { kind: 'market', value: 0.2 },
    requires: [],
  },
  {
    id: 'mkt-2',
    branch: 'market',
    name: 'Demand Forecasting',
    desc: 'Sell before they ask. +30% market price ceiling.',
    tier: 2,
    cost: 220,
    timeSec: 120,
    effect: { kind: 'market', value: 0.3 },
    requires: ['mkt-1'],
  },
  {
    id: 'mkt-3',
    branch: 'market',
    name: 'Global Distribution',
    desc: 'Every shelf, every port. +45% market price ceiling.',
    tier: 3,
    cost: 440,
    timeSec: 240,
    effect: { kind: 'market', value: 0.45 },
    requires: ['mkt-2'],
  },
  {
    id: 'mkt-4',
    branch: 'market',
    name: 'Market Maker',
    desc: 'You set the price now. +65% market price ceiling.',
    tier: 4,
    cost: 880,
    timeSec: 480,
    effect: { kind: 'market', value: 0.65 },
    requires: ['mkt-3', 'innov-2'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LEGACY  -  prestige scaling & offline gains. The long-game investment.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'leg-1',
    branch: 'legacy',
    name: 'Institutional Memory',
    desc: 'The company never forgets. +15% prestige multiplier.',
    tier: 1,
    cost: 150,
    timeSec: 60,
    effect: { kind: 'prestige', value: 0.15 },
    requires: [],
  },
  {
    id: 'leg-2',
    branch: 'legacy',
    name: 'Autonomous Operations',
    desc: 'It runs without you. +25% offline earnings.',
    tier: 2,
    cost: 300,
    timeSec: 120,
    effect: { kind: 'offline', value: 0.25 },
    requires: ['leg-1'],
  },
  {
    id: 'leg-3',
    branch: 'legacy',
    name: 'Dynasty Charter',
    desc: 'Generations of compounding. +30% prestige multiplier.',
    tier: 3,
    cost: 600,
    timeSec: 240,
    effect: { kind: 'prestige', value: 0.3 },
    requires: ['leg-2'],
  },
  {
    id: 'leg-4',
    branch: 'legacy',
    name: 'Perpetual Engine',
    desc: 'Idle becomes income. +50% offline earnings.',
    tier: 4,
    cost: 1200,
    timeSec: 480,
    effect: { kind: 'offline', value: 0.5 },
    requires: ['leg-3', 'innov-3'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CROSS-BRANCH CAPSTONES  -  tier-4 picks that demand investment in two lines.
  // These are the "build identity" choices: you rarely afford all of them.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'cap-overdrive',
    branch: 'production',
    name: 'Production Overdrive',
    desc: 'Push the machines past spec. +120% production.',
    tier: 4,
    cost: 1600,
    timeSec: 960,
    effect: { kind: 'production', value: 1.2 },
    requires: ['prod-4', 'eff-3'],
  },
  {
    id: 'cap-monopoly',
    branch: 'market',
    name: 'Monopoly Position',
    desc: 'Competitors simply stop. +80% market price ceiling.',
    tier: 4,
    cost: 1600,
    timeSec: 960,
    effect: { kind: 'market', value: 0.8 },
    requires: ['mkt-4', 'leg-1'],
  },
  {
    id: 'cap-think-tank',
    branch: 'innovation',
    name: 'Apex Think Tank',
    desc: 'The smartest building on Earth. +90% Insight generation.',
    tier: 4,
    cost: 1600,
    timeSec: 960,
    effect: { kind: 'insight', value: 0.9 },
    requires: ['innov-4', 'mkt-2'],
  },
  {
    id: 'cap-eternal',
    branch: 'legacy',
    name: 'Eternal Conglomerate',
    desc: 'Outlive every rival empire. +45% prestige multiplier.',
    tier: 4,
    cost: 2000,
    timeSec: 960,
    effect: { kind: 'prestige', value: 0.45 },
    requires: ['leg-4', 'prod-3'],
  },
];

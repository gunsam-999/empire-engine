// ============================================================================
// Empire Engine  -  Prestige / rebirth tiers.
// Three escalating rebirths. Each trades a deeper reset for a permanent,
// compounding payout. The reducer's PRESTIGE action grants Legacy Points;
// these tiers are the design-doc framing the UI presents to the player.
//
// `resets` / `keeps` are human-readable lists of GameState concerns so the
// progression screen can explain exactly what survives a rebirth.
// ============================================================================

export const PRESTIGE_TIERS: {
  tier: 1 | 2 | 3;
  key: string;
  name: string;
  desc: string;
  unlockReq: string;
  resets: string[];
  keeps: string[];
  grants: string;
}[] = [
  {
    tier: 1,
    key: 'restructure',
    name: 'Restructure',
    desc: 'Wind down operations and re-incorporate leaner. Your cash, stock, and facilities go to zero  -  but the knowledge and people you gathered carry forward, and your name is now worth Legacy Points that boost everything you build next.',
    unlockReq: 'Reach $1,000,000 lifetime earnings (or own any Tier 3 facility).',
    resets: [
      'Cash & stockpiled resource',
      'All facilities',
      'Banked Insight',
      'Active research project',
      'Market price & trend',
    ],
    keeps: [
      'Completed research tree',
      'Recruited & assigned advisors',
      'Story progress & ethics',
      'Unlocked territories',
      'Legacy Points & Influence',
      'Mastery Stars',
    ],
    grants:
      'Legacy Points (LP) scaling with lifetime earnings. Each LP is a permanent +1% production multiplier (compounding), and earned LP grows with every prestige you have done.',
  },
  {
    tier: 2,
    key: 'ipo',
    name: 'IPO',
    desc: 'Take the empire public. A far harder reset that wipes most progress  -  but going to market mints a Mastery Star, a meta-currency that supercharges every future Legacy Point and unlocks the upper research and advisor tiers.',
    unlockReq: 'Accumulate 500 Legacy Points across your Restructures.',
    resets: [
      'Everything a Restructure resets',
      'Banked Legacy Points (converted to Mastery)',
      'Most completed research (legacy nodes survive)',
      'Influence balance',
    ],
    keeps: [
      'Mastery Stars',
      'Legendary advisors',
      'Story progress & ethics',
      'Permanent legacy-branch research',
      'Unlocked territories',
    ],
    grants:
      'A Mastery Star: +25% to your prestige multiplier and a permanent boost to LP earned per Restructure. Mastery Stars never reset.',
  },
  {
    tier: 3,
    key: 'conglomerate',
    name: 'Conglomerate',
    desc: 'Dissolve the public company and fold it into a multi-industry holding entity. The deepest rebirth in the game  -  almost nothing survives  -  but it forges a Transcend Shard, the apex meta-currency that reshapes the entire economy in your favor and opens new-industry expansion.',
    unlockReq: 'Collect 50 Mastery Stars through repeated IPOs.',
    resets: [
      'Everything an IPO resets',
      'Mastery Stars (converted to Shards)',
      'All advisors except your founding mentor',
      'All research progress',
    ],
    keeps: [
      'Transcend Shards',
      'Founding mentor advisor',
      'Story epilogue flags',
      'Cross-industry unlock ledger',
    ],
    grants:
      'A Transcend Shard: +50% to your prestige multiplier (the strongest multiplier in the game) and the ability to seed a brand-new industry that inherits your empire-wide bonuses.',
  },
];

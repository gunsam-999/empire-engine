// ============================================================================
// Empire Engine  -  GUIDANCE / COACHING BEATS
// Short, punchy pop-up coaching spoken by your co-founder. Fired at the right
// moments with real marketing tips. DISTINCT from the 5-act STORY arc.
// Pure data. Trigger evaluation lives in systems/GuidanceSystem.ts.
// ============================================================================

export interface GuidanceBeat {
  id: string;
  trigger: {
    type:
      | 'start'
      | 'reach'
      | 'audience'
      | 'income'
      | 'channel'
      | 'tier'
      | 'idle'
      | 'firstBuy'
      | 'campaign'
      | 'ui';         // fired explicitly by UI screens on first visit
    value?: number;
    channel?: string;
    uiKey?: string;
  };
  emotion: 'hype' | 'proud' | 'calm' | 'urgent' | 'tip';
  lines: string[];
  tip?: string;
}

export const GUIDANCE_BEATS: GuidanceBeat[] = [
  {
    id: 'g-welcome',
    trigger: { type: 'start' },
    emotion: 'hype',
    lines: [
      "We're really doing this  -  partners, for real.",
      "I've got operations. You build the empire.",
    ],
    tip: 'Buy your first facility to get production flowing.',
  },
  {
    id: 'g-first-buy',
    trigger: { type: 'firstBuy' },
    emotion: 'proud',
    lines: ["That's our first asset. It feels different when it's yours, right?"],
    tip: 'Every facility you stack multiplies the next.',
  },
  {
    id: 'g-open-marketing',
    trigger: { type: 'income', value: 25 },
    emotion: 'tip',
    lines: [
      "We make a great product  -  but nobody buys what they can't find.",
      'Open the Marketing tab. Let me show you reach.',
    ],
    tip: 'Reach turns into customers. Customers turn into revenue.',
  },
  {
    id: 'g-social-unlock',
    trigger: { type: 'channel', channel: 'social' },
    emotion: 'hype',
    lines: ['Social is live! This is where a brand gets a personality.'],
    tip: 'Post consistently before chasing virality  -  momentum compounds.',
  },
  {
    id: 'g-content-unlock',
    trigger: { type: 'channel', channel: 'content' },
    emotion: 'calm',
    lines: [
      'Content is slow at first  -  then it snowballs and never stops.',
      "It's the most patient bet we'll make. I love it.",
    ],
    tip: 'SEO compounds: the work you publish today pays off for years.',
  },
  {
    id: 'g-synergy',
    trigger: { type: 'channel', channel: 'paid' },
    emotion: 'tip',
    lines: ["Paid is a faucet  -  reach now, but it stops the second you stop paying."],
    tip: 'Use paid to test fast, then pour winners into organic.',
  },
  {
    id: 'g-first-reach',
    trigger: { type: 'reach', value: 1000 },
    emotion: 'proud',
    lines: ["A thousand people reached. A thousand! Remember when it was zero?"],
    tip: 'Reach is the headline metric  -  keep the channels running.',
  },
  {
    id: 'g-reach-10k',
    trigger: { type: 'reach', value: 10000 },
    emotion: 'hype',
    lines: ['Ten thousand reached. The flywheel is spinning on its own now.'],
    tip: 'Combine Social + Content for a compounding synergy bonus.',
  },
  {
    id: 'g-reach-100k',
    trigger: { type: 'reach', value: 100000 },
    emotion: 'hype',
    lines: ["Six figures of reach. People are talking about us in rooms we've never been in."],
    tip: 'Now is the time to launch a campaign and ride the wave.',
  },
  {
    id: 'g-reach-1m',
    trigger: { type: 'reach', value: 1000000 },
    emotion: 'proud',
    lines: ['A MILLION reached. We are a name now. I am so proud of us.'],
  },
  {
    id: 'g-first-audience',
    trigger: { type: 'audience', value: 100 },
    emotion: 'tip',
    lines: ["Our first real audience  -  people who actually pay attention."],
    tip: 'Audience boosts income. Reach is the top of the funnel; audience is the bottom.',
  },
  {
    id: 'g-audience-1k',
    trigger: { type: 'audience', value: 1000 },
    emotion: 'proud',
    lines: ['A thousand-strong audience. That is a community, not a number.'],
    tip: 'Email marketing keeps an audience loyal  -  retention beats acquisition.',
  },
  {
    id: 'g-audience-10k',
    trigger: { type: 'audience', value: 10000 },
    emotion: 'hype',
    lines: ['Ten thousand true fans. This is the audience empires are built on.'],
    tip: 'Referral & Community turns your audience into a growth engine.',
  },
  {
    id: 'g-campaign-cta',
    trigger: { type: 'audience', value: 500 },
    emotion: 'urgent',
    lines: ["We've got an audience warmed up. Let's hit them with a campaign."],
    tip: 'Campaigns multiply reach for a short burst  -  time them well.',
  },
  {
    id: 'g-campaign-live',
    trigger: { type: 'campaign' },
    emotion: 'hype',
    lines: ['Campaign is LIVE  -  reach is spiking! All hands, ride it!'],
    tip: 'Keep every channel active during a campaign to maximize the multiplier.',
  },
  {
    id: 'g-income-1k',
    trigger: { type: 'income', value: 1000 },
    emotion: 'proud',
    lines: ['A thousand a second. The marketing is paying for itself many times over.'],
    tip: 'Reinvest revenue into reach  -  growth funds more growth.',
  },
  {
    id: 'g-income-100k',
    trigger: { type: 'income', value: 100000 },
    emotion: 'hype',
    lines: ["This income would've been a fantasy on day one. Look at us go."],
  },
  {
    id: 'g-tier3',
    trigger: { type: 'tier', value: 3 },
    emotion: 'tip',
    lines: ['New tier unlocked  -  bigger operations, bigger story to tell.'],
    tip: 'Scale your marketing alongside production so demand keeps up with supply.',
  },
  {
    id: 'g-idle-return',
    trigger: { type: 'idle' },
    emotion: 'calm',
    lines: ['Welcome back! I kept the lights on and the reach flowing while you were out.'],
    tip: 'Organic channels keep working even when you are away.',
  },
  {
    id: 'g-brand',
    trigger: { type: 'reach', value: 500000 },
    emotion: 'proud',
    lines: ['Our brand has real weight now  -  people trust the name before they try the product.'],
    tip: 'A strong brand multiplies every channel. Protect it.',
  },

  // ---- UI first-visit mentor beats (queued by useFirstVisit hook) ----
  {
    id: 'hint-research-first',
    trigger: { type: 'ui', uiKey: 'research_tab' },
    emotion: 'calm',
    lines: ["Research is how we build advantages the market can't copy."],
    tip: "Pick your branch early — some nodes compound for the entire run.",
  },
  {
    id: 'hint-market-first',
    trigger: { type: 'ui', uiKey: 'market_tab' },
    emotion: 'tip',
    lines: ["The market moves in waves. Stockpile when it dips. Sell when it peaks."],
    tip: 'Trends compound. Riding a wave can double your returns.',
  },
  {
    id: 'hint-intel-first',
    trigger: { type: 'ui', uiKey: 'intel_tab' },
    emotion: 'calm',
    lines: ["Intelligence is leverage. The more we know, the fewer surprises land."],
    tip: 'The War Room shows rival telegraphs before they strike — act first.',
  },
  {
    id: 'hint-prestige-first',
    trigger: { type: 'ui', uiKey: 'prestige_tab' },
    emotion: 'urgent',
    lines: ["Rebirth means losing progress but keeping wisdom. It's the long game."],
    tip: 'Legacy Points carry over. Each prestige compounds the next run.',
  },
  {
    id: 'hint-rival-appeared',
    trigger: { type: 'ui', uiKey: 'rival_appeared' },
    emotion: 'urgent',
    lines: ["Our first real rival. Means we're big enough to threaten someone."],
    tip: 'Watch their posture — HOSTILE escalates quickly if you ignore it.',
  },
  {
    id: 'hint-invest-first',
    trigger: { type: 'ui', uiKey: 'invest_tab' },
    emotion: 'tip',
    lines: ["The portfolio is where idle cash becomes compounding wealth."],
    tip: 'Diversify early — The Wiz signals when to rotate positions.',
  },
];

export function getGuidanceBeat(id: string): GuidanceBeat | undefined {
  return GUIDANCE_BEATS.find((b) => b.id === id);
}

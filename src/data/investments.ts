// investments.ts - Portfolio definitions, The Wiz character, and offer templates.

export interface PortfolioDef {
  id: string;
  name: string;
  category: 'stocks' | 'crypto' | 'realestate' | 'startups' | 'bonds' | 'vc' | 'hedge' | 'empire';
  emoji: string;
  tagline: string;
  description: string;
  risk: 'safe' | 'moderate' | 'risky' | 'degen';
  riskLabel: string;
  annualReturn: number;
  dailyVol: number;
  minBuy: number;
  unlockLE: number;
  color: string;
}

export interface WizOfferTemplate {
  id: string;
  kind: 'opportunity' | 'warning' | 'tip' | 'legendary';
  emoji: string;
  headline: string;
  body: string;
  portfolioId?: string;
  priceBonus?: number;
  durationMs?: number;
  unlockLE?: number;
}

export const WIZ_CHARACTER = {
  name: 'Ezra "The Wiz" Kai',
  shortName: 'The Wiz',
  age: 24,
  role: 'Portfolio Oracle',
  avatar: {
    skin: 4,
    hair: 2,
    hairColor: 8,
    outfit: 4,
    accessory: 1,
    expression: 1,
    accent: '#00f5a0',
  },
  backstory:
    "Ran a mock portfolio at age 9 and turned a pretend $10K into $340K by 12. Coded his first Python trading bot at 14, got suspended for running it on school Wi-Fi. YOLO'd his college fund into DeFi at 18, 10x'd it in four months, then watched 95% evaporate overnight in the crash of '22. Built a quant signal model from the wreckage, called three consecutive macro pivots, got poached by Goldman - then ghosted the offer, bought a one-way ticket, and showed up at your office saying 'I'm here to make you rich, no commissions, vibes only.' Has a cult fintech following as @thewiz.exe. Occasionally prophetic. Always chaotic.",
  tagline: 'Your markets are my playground. No fees. Just vibes.',
  vibeCheck: [
    "This chart is literally sending me rn",
    "Not financial advice but... yeah it kinda is",
    "We move. No cap.",
    "Sir this is a wealth emergency",
    "The money printer vibes are immaculate",
  ],
} as const;

export const PORTFOLIOS: PortfolioDef[] = [
  {
    id: 's_index',
    name: 'S&P 500 Index',
    category: 'stocks',
    emoji: '📊',
    tagline: 'Boring but built different',
    description: 'The classic. Low drama, consistent gains. Your "I invest" flex at brunch without the anxiety.',
    risk: 'moderate',
    riskLabel: 'Moderate',
    annualReturn: 0.10,
    dailyVol: 0.015,
    minBuy: 500,
    unlockLE: 0,
    color: '#4ade80',
  },
  {
    id: 's_tech',
    name: 'Disruptor Tech ETF',
    category: 'stocks',
    emoji: '💻',
    tagline: 'Eat or be eaten',
    description: 'The companies eating every other industry for breakfast. Volatile. Worth it. Wiz is obsessed.',
    risk: 'risky',
    riskLabel: 'High Risk',
    annualReturn: 0.18,
    dailyVol: 0.03,
    minBuy: 250,
    unlockLE: 1000,
    color: '#60a5fa',
  },
  {
    id: 'bonds',
    name: 'Sovereign Bonds',
    category: 'bonds',
    emoji: '🏛️',
    tagline: 'Grandma approved, actually valid',
    description: "Governments literally owe you money. Boring? Yes. Safe? Extremely. Sometimes boring is the move.",
    risk: 'safe',
    riskLabel: 'Low Risk',
    annualReturn: 0.04,
    dailyVol: 0.003,
    minBuy: 100,
    unlockLE: 0,
    color: '#94a3b8',
  },
  {
    id: 'btc',
    name: 'BitCore Holdings',
    category: 'crypto',
    emoji: '₿',
    tagline: 'Digital gold or digital chaos',
    description: 'Crypto backed by math, memes, and vibes. Extreme swings. Extreme upside. Not for the faint-hearted.',
    risk: 'risky',
    riskLabel: 'High Risk',
    annualReturn: 0.35,
    dailyVol: 0.08,
    minBuy: 1000,
    unlockLE: 5000,
    color: '#f59e0b',
  },
  {
    id: 'realestate',
    name: 'Urban REIT',
    category: 'realestate',
    emoji: '🏙️',
    tagline: 'Land goes brrr (slowly)',
    description: "Own prime real estate without being a landlord. Steady cash flow, solid appreciation.",
    risk: 'moderate',
    riskLabel: 'Moderate',
    annualReturn: 0.08,
    dailyVol: 0.008,
    minBuy: 5000,
    unlockLE: 50000,
    color: '#a78bfa',
  },
  {
    id: 'meme',
    name: 'MoonShot Basket',
    category: 'crypto',
    emoji: '🚀',
    tagline: 'To the moon or to zero',
    description: 'A curated basket of meme coins and altcoins. Could 10x. Could implode. Wiz loves it.',
    risk: 'degen',
    riskLabel: 'DEGEN',
    annualReturn: 0.50,
    dailyVol: 0.18,
    minBuy: 500,
    unlockLE: 25000,
    color: '#fb923c',
  },
  {
    id: 'startup',
    name: 'Startup Syndicate',
    category: 'startups',
    emoji: '⚡',
    tagline: 'Fund the next you',
    description: 'Pooled access to pre-seed and seed rounds. Most fail. The ones that hit go 100x.',
    risk: 'risky',
    riskLabel: 'Very High Risk',
    annualReturn: 0.40,
    dailyVol: 0.06,
    minBuy: 10000,
    unlockLE: 100000,
    color: '#e879f9',
  },
  {
    id: 'vc',
    name: 'Quantum VC Fund',
    category: 'vc',
    emoji: '🌌',
    tagline: 'Unicorn hunting at scale',
    description: 'Institutional-grade venture capital, democratized. Deep tech, biotech, AI moonshots. 3yr+ horizon.',
    risk: 'degen',
    riskLabel: 'DEGEN',
    annualReturn: 0.80,
    dailyVol: 0.12,
    minBuy: 50000,
    unlockLE: 500000,
    color: '#f43f5e',
  },
  {
    id: 'hedge',
    name: 'Global Macro Hedge',
    category: 'hedge',
    emoji: '🌐',
    tagline: 'Plays the whole board',
    description: "Long/short across currencies, commodities, and rates. Hedged against everything. Chess, not checkers.",
    risk: 'moderate',
    riskLabel: 'Moderate',
    annualReturn: 0.14,
    dailyVol: 0.02,
    minBuy: 25000,
    unlockLE: 1000000,
    color: '#6366f1',
  },
  {
    id: 'empire_idx',
    name: 'Empire Founders Index',
    category: 'empire',
    emoji: '👑',
    tagline: 'Bet on yourself (literally)',
    description: 'A fund backing founders just like you. Meta? Yes. Iconic? Absolutely. Wiz built this one personally.',
    risk: 'moderate',
    riskLabel: 'Moderate',
    annualReturn: 0.22,
    dailyVol: 0.025,
    minBuy: 10000,
    unlockLE: 1000000,
    color: '#f5a623',
  },
];

export const WIZ_OFFERS: WizOfferTemplate[] = [
  // LEGENDARY
  {
    id: 'leg_tech_crash',
    kind: 'legendary',
    emoji: '🌪️',
    headline: 'Tech sector just had a meltdown. I got us 50% off.',
    body: "Panic selling everywhere. Smart money is loading up. This window will NOT stay open. fr fr.",
    portfolioId: 's_tech',
    priceBonus: 0.50,
    durationMs: 90 * 1000,
    unlockLE: 1000,
  },
  {
    id: 'leg_btc_dip',
    kind: 'legendary',
    emoji: '⚡',
    headline: 'The dip of the decade just hit BitCore.',
    body: "Down 60% in 48 hours. Historically this exact pattern preceded a 4x recovery. I'm not playing.",
    portfolioId: 'btc',
    priceBonus: 0.45,
    durationMs: 120 * 1000,
    unlockLE: 5000,
  },
  {
    id: 'leg_vc_exit',
    kind: 'legendary',
    emoji: '🌌',
    headline: 'Quantum VC just had a $4B exit. Re-entry at NAV.',
    body: "Profits are being reinvested before the next fund close. You get in at today's price. This is it.",
    portfolioId: 'vc',
    priceBonus: 0.55,
    durationMs: 60 * 1000,
    unlockLE: 500000,
  },
  // OPPORTUNITY
  {
    id: 'opp_index_correction',
    kind: 'opportunity',
    emoji: '📉',
    headline: 'S&P pulled back 20%. Classic buy-the-dip moment.',
    body: "Market correction is just a sale on assets. Wiz is loading. You should too.",
    portfolioId: 's_index',
    priceBonus: 0.78,
    durationMs: 3 * 60 * 1000,
  },
  {
    id: 'opp_startup_flush',
    kind: 'opportunity',
    emoji: '⚡',
    headline: 'Fund flush happening - Startup Syndicate 30% off.',
    body: "Rebalancing sellers giving you a discount. Non-strategic. Take it.",
    portfolioId: 'startup',
    priceBonus: 0.70,
    durationMs: 2 * 60 * 1000,
    unlockLE: 100000,
  },
  {
    id: 'opp_reit_distress',
    kind: 'opportunity',
    emoji: '🏙️',
    headline: 'Urban REIT at 25% below NAV. Distressed seller.',
    body: "Forced selling from a fund liquidation. The buildings haven't changed. Just the price.",
    portfolioId: 'realestate',
    priceBonus: 0.75,
    durationMs: 4 * 60 * 1000,
    unlockLE: 50000,
  },
  // WARNING
  {
    id: 'warn_meme_dump',
    kind: 'warning',
    emoji: '💀',
    headline: 'MoonShot Basket is about to implode. GET OUT.',
    body: "Coordinated sell-off incoming. Three whale wallets just moved. This is not a drill.",
    portfolioId: 'meme',
    durationMs: 2 * 60 * 1000,
    unlockLE: 25000,
  },
  {
    id: 'warn_btc_flash',
    kind: 'warning',
    emoji: '🚨',
    headline: 'Flash crash incoming on BitCore. I feel it.',
    body: "Liquidation cascade building in futures. Reduce exposure now or hold tight. Your call.",
    portfolioId: 'btc',
    durationMs: 3 * 60 * 1000,
    unlockLE: 5000,
  },
  {
    id: 'warn_rates',
    kind: 'warning',
    emoji: '🏛️',
    headline: 'Rate hike just got leaked. Bonds looking shaky.',
    body: "Sovereign bonds gonna dip 8-12% short term before recovering. Just a heads up.",
    portfolioId: 'bonds',
    durationMs: 5 * 60 * 1000,
  },
  {
    id: 'warn_tech_earnings',
    kind: 'warning',
    emoji: '📱',
    headline: 'Tech ETF earnings miss dropping soon. Brace.',
    body: "Three of the top 10 holdings are about to miss expectations. The algo selloff will be fast.",
    portfolioId: 's_tech',
    durationMs: 4 * 60 * 1000,
    unlockLE: 1000,
  },
  // TIPS
  {
    id: 'tip_diversify',
    kind: 'tip',
    emoji: '🧠',
    headline: "You're too concentrated. Diversify, king.",
    body: "When one position is over 60% of your portfolio, even Wiz gets nervous. Spread the bag.",
  },
  {
    id: 'tip_cash_ratio',
    kind: 'tip',
    emoji: '💸',
    headline: 'Your cash-to-portfolio ratio is sending me.',
    body: "Holding too much cash is inflationary suicide. Put it to work. Even Sovereign Bonds beat zero.",
  },
  {
    id: 'tip_compound',
    kind: 'tip',
    emoji: '📈',
    headline: 'Compound interest is the eighth wonder. Stay invested.',
    body: "The best time to invest was yesterday. The second best time is right now. Not joking.",
  },
  {
    id: 'tip_dca',
    kind: 'tip',
    emoji: '🎯',
    headline: 'Dollar cost averaging is lowkey underrated.',
    body: "Consistent small buys beat timing the market 90% of the time. Boring strategy wins.",
  },
  {
    id: 'tip_long_game',
    kind: 'tip',
    emoji: '♟️',
    headline: 'This is chess, not checkers. Play the long game.',
    body: "Short term volatility is noise. Zoom out. The trend is your friend. Stay in position.",
  },
];

export function getPortfolio(id: string): PortfolioDef | undefined {
  return PORTFOLIOS.find((p) => p.id === id);
}

export function getWizVoice(kind: 'opportunity' | 'warning' | 'tip' | 'legendary'): string {
  const idx: Record<string, number> = { opportunity: 0, warning: 3, tip: 4, legendary: 2 };
  return WIZ_CHARACTER.vibeCheck[idx[kind] ?? 0];
}

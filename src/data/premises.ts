// ============================================================================
// Premise data  -  the Old Master's will.
// 2 universal clauses + 3 per industry = 5 clauses per run.
// Conditions checked against live GameState each tick; never stored here.
// ============================================================================

import type { GameState, IndustryType } from '../game/types';

export interface ClauseConfig {
  id: string;
  label: string;
  description: string;
  /** If set, only shown for this industry. Undefined = universal. */
  industrySpecific?: IndustryType;
  fulfillRequireSec: number;
  breachGraceSec: number;
  prod?: number;
  costDiscount?: number;
  check: (state: GameState) => boolean;
}

// ----------------------------------------------------------------------------
// Universal clauses  -  apply to every industry
// ----------------------------------------------------------------------------

const UNIVERSAL_CLAUSES: ClauseConfig[] = [
  {
    id: 'u_name_means_something',
    label: 'The Name Must Mean Something',
    description: 'Hold a reputation above +15 for 5 continuous minutes. The name they built doesn\'t belong to ambition alone.',
    fulfillRequireSec: 300,
    breachGraceSec: 30,
    prod: 0.07,
    check: (s) => (s.story?.ethics ?? 0) > 15,
  },
  {
    id: 'u_blood_before_gold',
    label: 'Blood Before Gold',
    description: 'Reach Confidant trust with at least one companion before your first prestige. They earned loyalty before they earned returns.',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.05,
    check: (s) =>
      (s.companions ?? []).some(
        (c) =>
          c.rung === 'CONFIDANT' ||
          c.rung === 'INNER_CIRCLE' ||
          c.rung === 'LEGACY'
      ),
  },
];

// ----------------------------------------------------------------------------
// Industry-specific clauses  -  3 per industry
// ----------------------------------------------------------------------------

const INDUSTRY_CLAUSES: ClauseConfig[] = [
  // ---- TECH ------------------------------------------------------------------
  {
    id: 'tech_stay_human',
    label: 'Stay Human',
    description: 'Keep an active research project running. Ezra never let the lab go quiet — not even once.',
    industrySpecific: 'tech',
    fulfillRequireSec: 30,
    breachGraceSec: 180,
    prod: 0.12,
    check: (s) => s.research?.active !== null,
  },
  {
    id: 'tech_open_door',
    label: 'The Open Door',
    description: 'Complete at least one research breakthrough. Knowledge shared is compound interest.',
    industrySpecific: 'tech',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.08,
    check: (s) => (s.research?.completed?.length ?? 0) >= 1,
  },
  {
    id: 'tech_build_to_last',
    label: 'Build to Last',
    description: 'Own at least one Tier 1, Tier 2, and Tier 3 facility before advancing further. Pyramids don\'t start at the top.',
    industrySpecific: 'tech',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    costDiscount: 0.10,
    check: (s) => {
      const ids = Object.keys(s.facilities ?? {}).filter((k) => (s.facilities[k] ?? 0) > 0);
      return (
        ids.some((k) => k.includes('-t1-')) &&
        ids.some((k) => k.includes('-t2-')) &&
        ids.some((k) => k.includes('-t3-'))
      );
    },
  },

  // ---- SPACE -----------------------------------------------------------------
  {
    id: 'space_escape_velocity',
    label: 'Escape Velocity',
    description: 'Reach Tier 3 without a single prestige. The first orbit must be earned cleanly.',
    industrySpecific: 'space',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.10,
    check: (s) =>
      Object.keys(s.facilities ?? {}).some((k) => k.includes('-t3-') && (s.facilities[k] ?? 0) > 0) &&
      (s.prestigeCount ?? 0) === 0,
  },
  {
    id: 'space_long_bet',
    label: 'The Long Bet',
    description: 'Complete 3 research nodes in a single run. The mission plan matters as much as the rocket.',
    industrySpecific: 'space',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.06,
    check: (s) => (s.research?.completed?.length ?? 0) >= 3,
  },
  {
    id: 'space_lift_others',
    label: 'Lift Others',
    description: 'Sustain 2 minutes with no active rival economic pressure. The mission proceeds without enemy fire.',
    industrySpecific: 'space',
    fulfillRequireSec: 120,
    breachGraceSec: 15,
    prod: 0.05,
    check: (s) => (s.rivalPressures ?? []).filter((p) => p.endsAt > Date.now()).length === 0,
  },

  // ---- CULINARY --------------------------------------------------------------
  {
    id: 'culinary_mise_en_place',
    label: 'Mise en Place',
    description: 'Keep team average morale above 75 for 2 minutes. Every great kitchen runs on people, not recipes.',
    industrySpecific: 'culinary',
    fulfillRequireSec: 120,
    breachGraceSec: 30,
    prod: 0.07,
    check: (s) => {
      const wf = s.workforce ?? [];
      if (wf.length === 0) return false;
      return wf.reduce((sum, w) => sum + w.morale, 0) / wf.length >= 75;
    },
  },
  {
    id: 'culinary_season_to_taste',
    label: 'Season to Taste',
    description: 'Hold a reputation above +25 for 3 continuous minutes. Quality is an ethics problem before it\'s a culinary one.',
    industrySpecific: 'culinary',
    fulfillRequireSec: 180,
    breachGraceSec: 20,
    costDiscount: 0.06,
    check: (s) => (s.story?.ethics ?? 0) > 25,
  },
  {
    id: 'culinary_family_recipe',
    label: 'Family Recipe',
    description: 'Bring any companion to Inner Circle trust. Lorenzo always said the best dishes are made by someone who cares.',
    industrySpecific: 'culinary',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.05,
    check: (s) =>
      (s.companions ?? []).some(
        (c) => c.rung === 'INNER_CIRCLE' || c.rung === 'LEGACY'
      ),
  },

  // ---- ENERGY ----------------------------------------------------------------
  {
    id: 'energy_grid_balance',
    label: 'Grid Balance',
    description: 'Sell into the market continuously for 3 minutes — no hoarding. The grid serves the people first.',
    industrySpecific: 'energy',
    fulfillRequireSec: 180,
    breachGraceSec: 20,
    prod: 0.06,
    check: (s) => !(s.market?.stockpiling ?? false),
  },
  {
    id: 'energy_invest_in_tomorrow',
    label: 'Invest in Tomorrow',
    description: 'Complete 2 research nodes. Miriam predicted the solar revolution 20 years out — she always read the science.',
    industrySpecific: 'energy',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.05,
    check: (s) => (s.research?.completed?.length ?? 0) >= 2,
  },
  {
    id: 'energy_green_line',
    label: 'The Green Line',
    description: 'Maintain a positive reputation for 5 consecutive minutes. Power without principle is just fuel.',
    industrySpecific: 'energy',
    fulfillRequireSec: 300,
    breachGraceSec: 25,
    costDiscount: 0.08,
    check: (s) => (s.story?.ethics ?? 0) >= 0,
  },

  // ---- FASHION ---------------------------------------------------------------
  {
    id: 'fashion_the_statement',
    label: 'The Statement',
    description: 'Build an audience of 10,000. A garment unseen is a statement unheard.',
    industrySpecific: 'fashion',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.08,
    check: (s) => (s.marketing?.audience ?? 0) >= 10_000,
  },
  {
    id: 'fashion_authenticity',
    label: 'Authenticity',
    description: 'Hold reputation above +20 for 3 minutes. Maison Lumière was built on the principle that fashion must honor, not exploit.',
    industrySpecific: 'fashion',
    fulfillRequireSec: 180,
    breachGraceSec: 20,
    prod: 0.05,
    check: (s) => (s.story?.ethics ?? 0) > 20,
  },
  {
    id: 'fashion_the_fit',
    label: 'The Fit',
    description: 'Earn the loyalty of 2 aides. The house runs on talent, and talent needs to be earned.',
    industrySpecific: 'fashion',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.06,
    check: (s) => (s.aides ?? []).filter((a) => a.loyalty >= 50).length >= 2,
  },

  // ---- BIOTECH ---------------------------------------------------------------
  {
    id: 'biotech_first_do_no_harm',
    label: 'First, Do No Harm',
    description: 'Maintain a positive reputation for 4 consecutive minutes. The lab coat is not a business suit.',
    industrySpecific: 'biotech',
    fulfillRequireSec: 240,
    breachGraceSec: 20,
    costDiscount: 0.08,
    check: (s) => (s.story?.ethics ?? 0) > 0,
  },
  {
    id: 'biotech_the_pipeline',
    label: 'The Pipeline',
    description: 'Complete 3 research nodes. Discovery is the business model; everything else is distribution.',
    industrySpecific: 'biotech',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.07,
    check: (s) => (s.research?.completed?.length ?? 0) >= 3,
  },
  {
    id: 'biotech_informed_consent',
    label: 'Informed Consent',
    description: 'Bring 2 companions to Colleague trust or higher. Every breakthrough starts with a partnership.',
    industrySpecific: 'biotech',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.06,
    check: (s) =>
      (s.companions ?? []).filter((c) =>
        ['COLLEAGUE', 'CONFIDANT', 'INNER_CIRCLE', 'LEGACY'].includes(c.rung)
      ).length >= 2,
  },

  // ---- MEDIA -----------------------------------------------------------------
  {
    id: 'media_signal_over_noise',
    label: 'Signal Over Noise',
    description: 'Build a brand value of 2 or higher. In a world of noise, signal is the only thing that compounds.',
    industrySpecific: 'media',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.07,
    check: (s) => (s.marketing?.brand ?? 1) >= 2,
  },
  {
    id: 'media_the_truth_price',
    label: 'The Truth Price',
    description: 'Hold a positive reputation for 2 continuous minutes. Solomon never ran a story he couldn\'t defend.',
    industrySpecific: 'media',
    fulfillRequireSec: 120,
    breachGraceSec: 20,
    prod: 0.05,
    check: (s) => (s.story?.ethics ?? 0) > 0,
  },
  {
    id: 'media_going_wide',
    label: 'Going Wide',
    description: 'Reach 50,000 people through your marketing channels. Distribution is the moat.',
    industrySpecific: 'media',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.08,
    check: (s) => (s.marketing?.reach ?? 0) >= 50_000,
  },

  // ---- AGRICULTURE -----------------------------------------------------------
  {
    id: 'agri_till_and_toil',
    label: 'Till and Toil',
    description: 'Maintain team morale above 60 for 3 minutes. Nnamdi says the land listens to how you treat the people who work it.',
    industrySpecific: 'agri',
    fulfillRequireSec: 180,
    breachGraceSec: 30,
    prod: 0.05,
    check: (s) => {
      const wf = s.workforce ?? [];
      if (wf.length === 0) return false;
      return wf.reduce((sum, w) => sum + w.morale, 0) / wf.length >= 60;
    },
  },
  {
    id: 'agri_long_harvest',
    label: 'The Long Harvest',
    description: 'Reach $100,000 in lifetime earnings. The harvest is never rushed; it is grown.',
    industrySpecific: 'agri',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.06,
    check: (s) => (s.lifetimeEarnings ?? 0) >= 100_000,
  },
  {
    id: 'agri_root_systems',
    label: 'Root Systems',
    description: 'Unlock 2 territories beyond your home region. The soil feeds more when the reach is wider.',
    industrySpecific: 'agri',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    costDiscount: 0.07,
    check: (s) => (s.territory?.unlocked?.length ?? 0) >= 3,
  },

  // ---- FINANCE ---------------------------------------------------------------
  {
    id: 'finance_compound_interest',
    label: 'Compound Interest',
    description: 'Hold more than $1,000 in cash for 2 continuous minutes. Helena said: capital preserved is capital compounding.',
    industrySpecific: 'finance',
    fulfillRequireSec: 120,
    breachGraceSec: 20,
    prod: 0.06,
    check: (s) => (s.cash ?? 0) >= 1_000,
  },
  {
    id: 'finance_long_position',
    label: 'The Long Position',
    description: 'Reach $10M lifetime earnings before your first prestige. The real money is made by those who don\'t reset.',
    industrySpecific: 'finance',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.10,
    check: (s) =>
      (s.lifetimeEarnings ?? 0) >= 10_000_000 && (s.prestigeCount ?? 0) === 0,
  },
  {
    id: 'finance_diversified',
    label: 'Diversified',
    description: 'Own facilities across at least 2 different tiers. Concentration is risk; diversification is strategy.',
    industrySpecific: 'finance',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    costDiscount: 0.06,
    check: (s) => {
      const ids = Object.keys(s.facilities ?? {}).filter((k) => (s.facilities[k] ?? 0) > 0);
      const tiers = new Set(ids.map((k) => k.match(/-t(\d)-/)?.[1]).filter(Boolean));
      return tiers.size >= 2;
    },
  },

  // ---- REAL ESTATE -----------------------------------------------------------
  {
    id: 'realestate_location',
    label: 'Location, Location',
    description: 'Unlock 3 territories. In real estate, the only thing that matters is where you build.',
    industrySpecific: 'realestate',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.07,
    check: (s) => (s.territory?.unlocked?.length ?? 0) >= 3,
  },
  {
    id: 'realestate_patient_builder',
    label: 'The Patient Builder',
    description: 'Own Tier 3 facilities without having prestiged. Bertrand says: the building takes as long as it takes.',
    industrySpecific: 'realestate',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.08,
    check: (s) =>
      Object.keys(s.facilities ?? {}).some((k) => k.includes('-t3-') && (s.facilities[k] ?? 0) > 0) &&
      (s.prestigeCount ?? 0) === 0,
  },
  {
    id: 'realestate_community',
    label: 'Community',
    description: 'Keep team morale above 65 for 2 minutes. Developments that ignore people rot from the inside.',
    industrySpecific: 'realestate',
    fulfillRequireSec: 120,
    breachGraceSec: 25,
    prod: 0.05,
    check: (s) => {
      const wf = s.workforce ?? [];
      if (wf.length === 0) return false;
      return wf.reduce((sum, w) => sum + w.morale, 0) / wf.length >= 65;
    },
  },

  // ---- ENTERTAINMENT ---------------------------------------------------------
  {
    id: 'entertainment_cultural_hit',
    label: 'The Cultural Hit',
    description: 'Build an audience of 100,000. Marisol said: if nobody sees it, it didn\'t happen.',
    industrySpecific: 'entertainment',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.09,
    check: (s) => (s.marketing?.audience ?? 0) >= 100_000,
  },
  {
    id: 'entertainment_artistic_integrity',
    label: 'Artistic Integrity',
    description: 'Hold reputation above +10 for 4 minutes. The stories that last are the ones told honestly.',
    industrySpecific: 'entertainment',
    fulfillRequireSec: 240,
    breachGraceSec: 20,
    prod: 0.06,
    check: (s) => (s.story?.ethics ?? 0) > 10,
  },
  {
    id: 'entertainment_the_ensemble',
    label: 'The Ensemble',
    description: 'Bring 2 companions to Colleague trust. No great film is a solo act.',
    industrySpecific: 'entertainment',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.05,
    check: (s) =>
      (s.companions ?? []).filter((c) =>
        ['COLLEAGUE', 'CONFIDANT', 'INNER_CIRCLE', 'LEGACY'].includes(c.rung)
      ).length >= 2,
  },

  // ---- HOSPITALITY -----------------------------------------------------------
  {
    id: 'hospitality_the_welcome',
    label: 'The Welcome',
    description: 'Maintain team morale above 80 for 2 minutes. Ryo says: the guest experience begins with the staff\'s morning.',
    industrySpecific: 'hospitality',
    fulfillRequireSec: 120,
    breachGraceSec: 20,
    prod: 0.08,
    check: (s) => {
      const wf = s.workforce ?? [];
      if (wf.length === 0) return false;
      return wf.reduce((sum, w) => sum + w.morale, 0) / wf.length >= 80;
    },
  },
  {
    id: 'hospitality_return_guest',
    label: 'The Return Guest',
    description: 'Build an audience of 5,000. Loyalty is more valuable than reach. Build it first.',
    industrySpecific: 'hospitality',
    fulfillRequireSec: 0,
    breachGraceSec: 0,
    prod: 0.06,
    check: (s) => (s.marketing?.audience ?? 0) >= 5_000,
  },
  {
    id: 'hospitality_perfect_stay',
    label: 'The Perfect Stay',
    description: 'Hold reputation above +30 for 3 minutes. Exceptional hospitality is an ethics discipline before it\'s a service one.',
    industrySpecific: 'hospitality',
    fulfillRequireSec: 180,
    breachGraceSec: 20,
    costDiscount: 0.07,
    check: (s) => (s.story?.ethics ?? 0) > 30,
  },
];

// Master list used by PremiseEngine for ID lookups
export const ALL_CLAUSE_CONFIGS: ClauseConfig[] = [
  ...UNIVERSAL_CLAUSES,
  ...INDUSTRY_CLAUSES,
];

// Returns the 5 clauses active for a given industry (2 universal + 3 industry-specific)
export function getClausesForIndustry(industry: IndustryType): ClauseConfig[] {
  return [
    ...UNIVERSAL_CLAUSES,
    ...INDUSTRY_CLAUSES.filter((c) => c.industrySpecific === industry),
  ];
}

export function getClauseConfig(id: string): ClauseConfig | undefined {
  return ALL_CLAUSE_CONFIGS.find((c) => c.id === id);
}

/** Lifetime earnings threshold at which the will is revealed to the player. */
export const PREMISE_REVEAL_THRESHOLD = 500;

// ============================================================================
// Empire Engine — core type contract. ADD fields freely; never rename/remove.
// ============================================================================

export type IndustryType =
  | 'tech'
  | 'space'
  | 'culinary'
  | 'energy'
  | 'fashion'
  | 'biotech'
  | 'media'
  | 'agri';

export type Philosophy = 'innovator' | 'efficiency' | 'people_first' | 'aggressive';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ResearchBranch = 'production' | 'efficiency' | 'innovation' | 'market' | 'legacy';
export type Speaker = 'mentor' | 'rival' | 'partner' | 'consortium' | 'narrator' | 'player';

export interface FacilityConfig {
  id: string;
  tier: number;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  costMul: number;
  baseRate: number;
}

export interface IndustryConfig {
  id: IndustryType;
  name: string;
  tagline: string;
  emoji: string;
  accent: string;
  resource: string;
  resourceShort: string;
  currency: string;
  mechanicName: string;
  mechanicDesc: string;
  chain: [string, string, string, string, string];
  advisorTitles: string[];
  facilities: FacilityConfig[];
  tierUnlock: [number, number, number, number, number];
}

export interface ResearchNode {
  id: string;
  branch: ResearchBranch;
  name: string;
  desc: string;
  tier: number;
  cost: number;
  timeSec: number;
  effect: {
    kind: 'production' | 'cost' | 'insight' | 'prestige' | 'market' | 'offline' | 'advisor';
    value: number;
  };
  requires: string[];
}

export interface StoryChoiceOption {
  text: string;
  ethicsShift: number;
  reward?: GameReward;
}

export interface StoryBeat {
  id: string;
  act: number;
  chapter: number;
  title: string;
  trigger: {
    type: 'start' | 'earnings' | 'tier' | 'prestige' | 'territory' | 'research' | 'advisor';
    value?: number;
  };
  speaker: Speaker;
  lines: string[];
  choice?: { prompt: string; options: StoryChoiceOption[] };
  reward?: GameReward;
}

export interface Advisor {
  id: string;
  name: string;
  title: string;
  rarity: Rarity;
  maxLevel: number;
  industry: IndustryType;
  passiveBonus: {
    kind: 'production' | 'cost' | 'insight' | 'influence' | 'market';
    value: number;
  };
  activeAbility?: {
    name: string;
    description: string;
    cooldownSeconds: number;
    mult: number;
    durationSec: number;
  };
  flavorText: string;
  icon: string;
}

export interface RegionConfig {
  id: string;
  name: string;
  emoji: string;
  bonusDesc: string;
  bonusKind: 'production' | 'market' | 'insight' | 'influence';
  bonusValue: number;
  unlockCost: number;
  expandSeconds: number;
  rival: string;
}

// ============================================================================
// Marketing + Character + Guidance (additive systems)
// ============================================================================

export interface AvatarConfig {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: number;
  accessory: number;
  expression: number;
  accent: string;
}

export interface CofounderState {
  name: string;
  role: string;
  avatar: AvatarConfig;
}

export interface MarketingChannelState {
  level: number;
  active: boolean;
  invested: number;
  progressMs: number;
}

export interface ActiveCampaign {
  id: string;
  name: string;
  endsAt: number;
  reachMult: number;
}

export interface MarketingState {
  reach: number;
  audience: number;
  followers: number;
  brand: number;
  channels: Record<string, MarketingChannelState>;
  campaign: ActiveCampaign | null;
}

export interface GuidanceState {
  seen: string[];
  queue: string[];
  dismissed: string[];
  lastShownAt: number;
}

export interface GameReward {
  cash?: number;
  insight?: number;
  influence?: number;
  lp?: number;
  advisorId?: string;
  boost?: { mult: number; seconds: number };
}

export interface CompanySetup {
  name: string;
  industry: IndustryType;
  accent: string;
  philosophy: Philosophy;
  foundedAt: number;
}

export interface ActiveResearch {
  id: string;
  startedAt: number;
  endsAt: number;
}

export interface ActiveBoost {
  mult: number;
  endsAt: number;
  source: string;
}

export interface ExpandingRegion {
  id: string;
  endsAt: number;
}

export interface GameState {
  version: number;
  setup: CompanySetup | null;
  cash: number;
  resource: number;
  lifetimeEarnings: number;
  insight: number;
  influence: number;
  legacyPoints: number;
  prestigeCount: number;
  masteryStars: number;
  transcendShards: number;
  facilities: Record<string, number>;
  research: { completed: string[]; active: ActiveResearch | null };
  advisors: {
    owned: Record<string, number>;
    assigned: Record<string, string>;
    cooldowns: Record<string, number>;
  };
  story: { seen: string[]; queue: string[]; ethics: number; act: number };
  territory: { unlocked: string[]; expanding: ExpandingRegion | null };
  market: {
    priceMul: number;
    trend: number;
    history: number[];
    demandShiftAt: number;
    stockpiling: boolean;
  };
  events: { boost: ActiveBoost | null; lastMicroAt: number; bubbleAt: number };
  milestones: { unlocked: string[] };
  marketing: MarketingState;
  cofounder: CofounderState;
  guidance: GuidanceState;
  settings: { sound: boolean; buyQty: 1 | 10 | 100 | 'max'; liveView: boolean };
  stats: { clicks: number; playSeconds: number; prestiges: number; created: number };
  lastTick: number;
  lastSaved: number;
}

export interface OfflineSummary {
  seconds: number;
  cash: number;
  insight: number;
  events: string[];
}

// ============================================================================
// Action discriminated union — one variant per reducer action.
// ============================================================================

export type Action =
  | { type: 'SETUP'; payload: CompanySetup }
  | { type: 'TICK'; dt: number }
  | { type: 'BUY_FACILITY'; id: string; qty: 1 | 10 | 100 | 'max' }
  | { type: 'PRESTIGE' }
  | { type: 'START_RESEARCH'; id: string }
  | { type: 'ADVISOR_RECRUIT'; id: string }
  | { type: 'ADVISOR_LEVEL'; id: string }
  | { type: 'ADVISOR_ASSIGN'; advisorId: string; facilityId: string }
  | { type: 'ADVISOR_ACTIVATE'; id: string }
  | { type: 'STORY_SEEN'; id: string }
  | { type: 'STORY_CHOICE'; beatId: string; optionIndex: number }
  | { type: 'SET_BOOST'; mult: number; seconds: number; source: string }
  | { type: 'EVENT_RESOLVE'; reward?: GameReward; cost?: { cash?: number; influence?: number; lp?: number } }
  | { type: 'SELL_RESOURCE' }
  | { type: 'TOGGLE_STOCKPILE' }
  | { type: 'SET_BUYQTY'; qty: 1 | 10 | 100 | 'max' }
  | { type: 'SET_SETTINGS'; payload: Partial<GameState['settings']> }
  | { type: 'EXPAND_TERRITORY'; id: string }
  | { type: 'MARKETING_UPGRADE'; channelId: string }
  | { type: 'MARKETING_TOGGLE'; channelId: string }
  | { type: 'MARKETING_CAMPAIGN'; id: string }
  | { type: 'CHARACTER_CUSTOMIZE'; payload: Partial<CofounderState> }
  | { type: 'GUIDANCE_SEEN'; id: string }
  | { type: 'GUIDANCE_DISMISS'; id: string }
  | { type: 'TOGGLE_LIVE_VIEW' }
  | { type: 'LOAD'; state: GameState }
  | { type: 'IMPORT'; state: GameState }
  | { type: 'HARD_RESET' };

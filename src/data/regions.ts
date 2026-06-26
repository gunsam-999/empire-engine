// Region / territory configs. Engine-owned config (consumed by TerritorySystem
// and the EXPAND_TERRITORY action). UI may extend, never rename fields.

import type { RegionConfig } from '../game/types';

export const REGIONS: RegionConfig[] = [
  {
    id: 'home',
    name: 'Home Market',
    emoji: '🏠',
    bonusDesc: '+10% production at home',
    bonusKind: 'production',
    bonusValue: 0.1,
    unlockCost: 0,
    expandSeconds: 0,
    rival: 'None',
  },
  {
    id: 'coast',
    name: 'Coastal Hub',
    emoji: '🌊',
    bonusDesc: '+15% market price stability',
    bonusKind: 'market',
    bonusValue: 0.15,
    unlockCost: 5e4,
    expandSeconds: 120,
    rival: 'Halcyon Trade Co.',
  },
  {
    id: 'capital',
    name: 'Capital District',
    emoji: '🏙️',
    bonusDesc: '+20% influence generation',
    bonusKind: 'influence',
    bonusValue: 0.2,
    unlockCost: 1e6,
    expandSeconds: 300,
    rival: 'Meridian Holdings',
  },
  {
    id: 'frontier',
    name: 'Frontier Belt',
    emoji: '⛰️',
    bonusDesc: '+25% production frontier-wide',
    bonusKind: 'production',
    bonusValue: 0.25,
    unlockCost: 5e7,
    expandSeconds: 600,
    rival: 'Vanguard Syndicate',
  },
  {
    id: 'overseas',
    name: 'Overseas Network',
    emoji: '🌍',
    bonusDesc: '+30% insight from global research',
    bonusKind: 'insight',
    bonusValue: 0.3,
    unlockCost: 1e9,
    expandSeconds: 1200,
    rival: 'Orient Combine',
  },
  {
    id: 'orbit',
    name: 'Orbital Reach',
    emoji: '🛰️',
    bonusDesc: '+50% production across all markets',
    bonusKind: 'production',
    bonusValue: 0.5,
    unlockCost: 1e11,
    expandSeconds: 2400,
    rival: 'Apex Consortium',
  },
];

export function getRegion(id: string): RegionConfig | undefined {
  return REGIONS.find((r) => r.id === id);
}

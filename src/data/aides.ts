// ============================================================================
// Aide configs  -  the Old Master's inner circle (Session B).
//
// Each aide is a fully-realized character with:
//   - A UNIQUE mechanic kind (not a flat % boost)
//   - A backstory and how they came to be in the Old Master's circle
//   - A deployment ability with a distinct game-feel
//   - Rich flavor and personality
//
// All 6 are available from the start of an Inheritance Arc run.
// The CHOSEN aide begins at loyalty 80 (already bonded); others start at 50.
// ============================================================================

import type { AideDomain, AideMechanicKind } from '../game/types';

export interface AideConfig {
  id: string;
  name: string;
  role: string;
  domain: AideDomain;
  emoji: string;
  mechanicKind: AideMechanicKind;
  tagline: string;
  backstory: string;
  mechanicDesc: string;
  deployLabel: string;
  deployDesc: string;
  deployDurationSec: number;
  deployMult: number;
  /** Flat % added to production when loyalty ≥ 75 (baseline before mechanic). */
  passiveMult: number;
  /** Loyalty at which this aide joins (chosen aide overrides to 80). */
  unlockLE: number;
}

export const INNER_CIRCLE_IDS = ['marcus', 'layla', 'yuki', 'dev', 'sofia', 'ade'] as const;
export type InnerCircleId = (typeof INNER_CIRCLE_IDS)[number];

export const AIDE_CONFIGS: AideConfig[] = [
  // ------------------------------------------------------------------------ //
  //  MARCUS CHEN  -  "The Fortress"                                          //
  //  Legal Counsel  -  mechanic: Legal Fortress (defense charges)            //
  // ------------------------------------------------------------------------ //
  {
    id: 'marcus',
    name: 'Marcus Chen',
    role: 'Legal Counsel',
    domain: 'legal',
    emoji: '⚖️',
    mechanicKind: 'legal_fortress',
    tagline: 'Every clause is a wall. Every wall is leverage.',
    backstory:
      'Marcus was a public defender in Guangzhou before the Old Master found him — not headhunted, just watched him dismantle a multinational\'s case in a regional court with a two-page brief. He was offered three times his salary on the spot. He asked for equity instead. The Old Master laughed for the first time in years. Marcus never lost a case in the inner circle. Not one.',
    mechanicDesc:
      'Generates a defense charge every 5 min when ethics > 15 (max 3). Each charge absorbs a rival strike — the strike resolves without penalty. High ethics = faster recharge.',
    deployLabel: 'Regulatory Shield',
    deployDesc:
      'Clears all active rival pressures instantly. All rival aggression resets to zero. The room goes quiet.',
    deployDurationSec: 1,
    deployMult: 1,
    passiveMult: 0.02,
    unlockLE: 0,
  },

  // ------------------------------------------------------------------------ //
  //  LAYLA HASSAN  -  "The Signal"                                           //
  //  Narrative Director  -  mechanic: Truth Cycle (ethics→production scale)  //
  // ------------------------------------------------------------------------ //
  {
    id: 'layla',
    name: 'Layla Hassan',
    role: 'Narrative Director',
    domain: 'pr',
    emoji: '🎙️',
    mechanicKind: 'truth_cycle',
    tagline: 'The story you tell is the company you build.',
    backstory:
      'Layla ran a one-person agency in Beirut that got a government minister cleared of corruption charges — not by lying, but by publishing every document and letting the truth look more compelling than the allegation. The Old Master sent her a single note: "Come and do this for something that matters." She replied: "It already matters. What do you pay?" She was in the inner circle within six months and never left.',
    mechanicDesc:
      'Ethics score directly scales production. Every 5 ethics above 0 adds +0.8% to the production stack. Negative ethics applies a matching penalty. The cycle rewards principled play exponentially.',
    deployLabel: 'Story Audit',
    deployDesc:
      'Forces all rivals into a 90-second ceasefire. Generates a positive Ledger headline. Ethics +8.',
    deployDurationSec: 90,
    deployMult: 1.5,
    passiveMult: 0.01,
    unlockLE: 0,
  },

  // ------------------------------------------------------------------------ //
  //  YUKI TANAKA  -  "The Architect"                                         //
  //  Chief Financial Officer  -  mechanic: Compound Engine (buffer savings)  //
  // ------------------------------------------------------------------------ //
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    role: 'Chief Financial Officer',
    domain: 'finance',
    emoji: '📐',
    mechanicKind: 'compound_engine',
    tagline: 'She finds value where others see noise.',
    backstory:
      'Yuki spent six years restructuring failing hedge funds from the inside — brought in to diagnose and left before the rescue credit went to anyone else. She never needed the recognition. The Old Master caught her work through a footnote in a third-party audit report and called her directly. She said she was busy. He said: "I know. I need that." She showed up Monday.',
    mechanicDesc:
      'Silently accumulates 3% of each tick\'s earnings into a saved buffer. On Deploy, the full buffer is released as an instant cash injection — not a multiplier, a lump sum. Also permanently reduces facility cost scaling by 6%.',
    deployLabel: 'Capital Release',
    deployDesc:
      'Releases the full accumulated compound buffer as an instant cash injection. The larger the buffer, the bigger the hit.',
    deployDurationSec: 1,
    deployMult: 1,
    passiveMult: 0.025,
    unlockLE: 0,
  },

  // ------------------------------------------------------------------------ //
  //  DEV PATEL  -  "The Sprint"                                              //
  //  Chief Technology Officer  -  mechanic: Acceleration Loop (velocity)     //
  // ------------------------------------------------------------------------ //
  {
    id: 'dev',
    name: 'Dev Patel',
    role: 'Chief Technology Officer',
    domain: 'tech',
    emoji: '⚡',
    mechanicKind: 'acceleration_loop',
    tagline: 'Builds the thing you needed before you knew you needed it.',
    backstory:
      'Dev was 19 when he shipped the infrastructure that prevented a 400 million-user platform from collapsing during a global surge — solo, over a weekend, unpaid, because it was technically interesting. The Old Master read the post-mortem. He tracked Dev down through four anonymous handles and two VPNs and offered him the only thing that would land: unlimited compute budget and zero product meetings. Dev has never attended a product meeting.',
    mechanicDesc:
      'Your production bonus scales with how fast you\'re growing. Velocity (rate of earnings increase) compounds into the bonus stack. Rapid scaling = exponential bonus. Plateaus = no bonus. The engine rewards momentum.',
    deployLabel: 'Code Sprint',
    deployDesc:
      'Triples the game tick rate for 30 seconds. Every facility fires three times per interval. The clock accelerates.',
    deployDurationSec: 30,
    deployMult: 3.0,
    passiveMult: 0.02,
    unlockLE: 0,
  },

  // ------------------------------------------------------------------------ //
  //  SOFIA REYES  -  "The Current"                                           //
  //  Head of Logistics  -  mechanic: Resilience Buffer (loss→softlanding)    //
  // ------------------------------------------------------------------------ //
  {
    id: 'sofia',
    name: 'Sofia Reyes',
    role: 'Head of Logistics',
    domain: 'logistics',
    emoji: '🌊',
    mechanicKind: 'resilience_buffer',
    tagline: 'She keeps things moving when everything tries to stop.',
    backstory:
      'Sofia rerouted an entire cold-chain supply network around a port blockade in 72 hours using rail, road, and three boats she chartered on a handshake. No delays, no shortfall. She was 31. The Old Master\'s people had been watching the logistics numbers wondering how the margins held. When they found her, she was already negotiating the next contract. She said she\'d consider the offer — after the shipment cleared.',
    mechanicDesc:
      'When earnings dip below the 30-second rolling average, Sofia converts up to 50% of the deficit into a temporary buffer that decays over 5 minutes. Crises become soft landings. The buffer also reduces rival pressure duration by 20%.',
    deployLabel: 'Supply Chain Audit',
    deployDesc:
      'Resets all facility cost penalties to baseline. Clears all active rival pressures. Refills the resilience buffer to full.',
    deployDurationSec: 1,
    deployMult: 1,
    passiveMult: 0.025,
    unlockLE: 0,
  },

  // ------------------------------------------------------------------------ //
  //  ADE OKAFOR  -  "The Heartbeat"                                          //
  //  Creative Director  -  mechanic: Culture Multiplier (morale→production)  //
  // ------------------------------------------------------------------------ //
  {
    id: 'ade',
    name: 'Ade Okafor',
    role: 'Creative Director',
    domain: 'creative',
    emoji: '🎨',
    mechanicKind: 'culture_mult',
    tagline: 'Makes people feel something about a spreadsheet.',
    backstory:
      'Ade made one thing before the Old Master found him: a short documentary about workers at a textile factory that accidentally became a movement. No budget, no distributor, no plan — just a camera and the conviction that these people deserved to be seen. The film changed labor law in two countries. The Old Master watched it four times. He said: "I don\'t know what you do, but I need it in the room." Ade said: "I make things feel true." The Master said: "Yes. Exactly that."',
    mechanicDesc:
      'Workforce morale directly chains into production. Every 10 morale above 50 adds +2.5% production. At morale 100: +12.5%. Invest in your people, and Ade multiplies the return. Neglect them, and his bonus disappears.',
    deployLabel: 'Culture Surge',
    deployDesc:
      'Raises all workforce morale to 85 for 60 seconds. Production bonus surges with it.',
    deployDurationSec: 60,
    deployMult: 2.0,
    passiveMult: 0.01,
    unlockLE: 0,
  },
];

export function getAideConfig(id: string): AideConfig | undefined {
  return AIDE_CONFIGS.find((a) => a.id === id);
}

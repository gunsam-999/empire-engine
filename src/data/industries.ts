// ============================================================================
// Empire Engine  -  INDUSTRIES DATA
// 8 industries, each with 50 facilities (10 per tier x 5 tiers).
// Facilities are generated from themed name/icon tables via a helper so we
// never hand-write 400 objects, but every name is genuinely on-brand.
// ============================================================================

import type {
  FacilityConfig,
  IndustryConfig,
  IndustryType,
  Philosophy,
} from '../game/types';

// Re-export for convenience
export type { IndustryType };

// ----------------------------------------------------------------------------
// Shared tuning curve (matches the build contract economy formulas)
// ----------------------------------------------------------------------------
// baseCost: tier base ~ 10 * 1e(3*(t-1)), *~6 per slot within a tier.
// baseRate: tier base climbs ~x8 per tier, ~x1.6 per slot within a tier.
// costMul:  smoothly spread across 1.07 .. 1.15 (cheaper facilities scale
//           faster, premium late-tier facilities scale slower for pacing).
// ----------------------------------------------------------------------------

const TIER_BASE_COST = [10, 1e4, 1e7, 1e10, 1e13] as const;
const TIER_BASE_RATE = [0.2, 1.6, 12.8, 102.4, 819.2] as const; // ~x8 per tier
const COST_SLOT_MUL = 6; // each slot ~6x pricier than the previous
const RATE_SLOT_MUL = 1.6; // each slot ~1.6x more productive

function tierCostMul(tier: number, slot: number): number {
  // Tier 1 facilities scale fast (1.15) so the player feels the wall early;
  // later tiers scale slower (down toward 1.07) so deep buys stay reachable.
  const tierFloor = 1.15 - (tier - 1) * 0.018; // t1 .15 .. t5 .078
  const slotEase = (slot / 9) * 0.012; // late slots in a tier ease slightly
  const mul = tierFloor - slotEase;
  return Math.round(Math.min(1.15, Math.max(1.07, mul)) * 1000) / 1000;
}

interface TierTheme {
  names: [string, string, string, string, string, string, string, string, string, string];
  icons: [string, string, string, string, string, string, string, string, string, string];
}

interface IndustrySeed {
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
  flavor: string;
  challenge: string;
  archetype: string;
  // 5 tiers of themed facility names + icons
  tiers: [TierTheme, TierTheme, TierTheme, TierTheme, TierTheme];
}

function buildFacilities(id: IndustryType, tiers: IndustrySeed['tiers']): FacilityConfig[] {
  const out: FacilityConfig[] = [];
  for (let t = 1; t <= 5; t++) {
    const theme = tiers[t - 1];
    for (let slot = 0; slot < 10; slot++) {
      const baseCost =
        TIER_BASE_COST[t - 1] * Math.pow(COST_SLOT_MUL, slot);
      const baseRate =
        TIER_BASE_RATE[t - 1] * Math.pow(RATE_SLOT_MUL, slot);
      out.push({
        id: `${id}-t${t}-${slot}`,
        tier: t,
        name: theme.names[slot],
        desc: `Tier ${t} ${theme.names[slot]}  -  produces a steady stream of ${tiersResourceWord(id)}.`,
        icon: theme.icons[slot],
        baseCost: Math.round(baseCost),
        costMul: tierCostMul(t, slot),
        baseRate: Math.round(baseRate * 1000) / 1000,
      });
    }
  }
  return out;
}

// little resource-word lookup just for facility descriptions
function tiersResourceWord(id: IndustryType): string {
  const w: Record<IndustryType, string> = {
    tech: 'compute',
    space: 'thrust',
    culinary: 'flavor',
    energy: 'power',
    fashion: 'style',
    biotech: 'cures',
    media: 'attention',
    agri: 'harvest',
    finance: 'capital',
    realestate: 'property value',
    entertainment: 'engagement',
    hospitality: 'experience',
  };
  return w[id];
}

// ----------------------------------------------------------------------------
// 8 INDUSTRY SEEDS  -  themed names per tier (10 each), evocative & on-brand
// ----------------------------------------------------------------------------

const SEEDS: IndustrySeed[] = [
  // ---------------------------------------------------------------- TECH ----
  {
    id: 'tech',
    name: 'NeuroByte Systems',
    tagline: 'Compute the future, one core at a time.',
    emoji: '💻',
    accent: '#6366f1',
    resource: 'Compute Cycles',
    resourceShort: 'TFLOP',
    currency: '$',
    mechanicName: 'Overclock Surge',
    mechanicDesc:
      'Chain your fabs to boost the next tier. Overclock active rigs for burst throughput before they throttle.',
    chain: ['Garage', 'Startup', 'Datacenter', 'Cloud Region', 'Quantum Grid'],
    advisorTitles: ['Hacker', 'CTO', 'AI Architect', 'Chief Scientist', 'Singularity Sage'],
    flavor: 'Where thought becomes silicon and silicon becomes power. Build the infrastructure that runs the world — before the world knows it needs you.',
    challenge: 'Research never sleeps — and neither do your competitors.',
    archetype: 'Systems builders and relentless optimizers',
    tiers: [
      {
        names: [
          'Breadboard Bench', 'Soldered Mainboard', 'DIY Mining Rig', 'Home Server Closet',
          'LAN Party Cluster', 'Refurb Workstation', 'Hackathon Pod', 'Garage Render Farm',
          'Custom Liquid Loop', 'Overclocked Tower',
        ],
        icons: ['🔌', '🧩', '⛏️', '🗄️', '🖧', '🖥️', '🛠️', '🌀', '💧', '🗼'],
      },
      {
        names: [
          'Seed-Round Office', 'Open-Plan Dev Floor', 'CI/CD Pipeline', 'API Gateway',
          'Microservice Mesh', 'Edge Node', 'Container Orchestrator', 'Staging Cluster',
          'Load Balancer Bank', 'Series-A Datahall',
        ],
        icons: ['🚀', '👩‍💻', '🔁', '🚪', '🕸️', '📡', '🧱', '🎚️', '⚖️', '🏢'],
      },
      {
        names: [
          'Hyperscale Datacenter', 'Cold Aisle Hall', 'GPU Supercluster', 'Tensor Farm',
          'Fiber Backbone', 'Redundant Power Wing', 'Immersion Cooling Bay', 'AI Training Vault',
          'Petabyte Storage Array', 'Neural Inference Hub',
        ],
        icons: ['🏭', '❄️', '🎮', '🔢', '🔗', '⚡', '🛢️', '🧠', '💾', '🤖'],
      },
      {
        names: [
          'Cloud Availability Zone', 'Multi-Region Backbone', 'Global Edge Network', 'Satellite Uplink Array',
          'Photonic Switch Fabric', 'Zettascale Campus', 'Sovereign Cloud Vault', 'Autonomous Ops Center',
          'AGI Sandbox', 'Planetary CDN',
        ],
        icons: ['☁️', '🌐', '🛰️', '📶', '💡', '🏙️', '🔐', '🎛️', '🧬', '🌍'],
      },
      {
        names: [
          'Quantum Annealer', 'Qubit Lattice Core', 'Cryogenic Compute Vault', 'Topological Processor',
          'Entanglement Relay', 'Dyson Compute Sphere', 'Mind-Upload Mainframe', 'Hypercube Reactor',
          'Reality Simulation Engine', 'Singularity Nexus',
        ],
        icons: ['⚛️', '🔷', '🧊', '🌀', '🔮', '🔆', '🧠', '🟪', '🪐', '✨'],
      },
    ],
  },

  // --------------------------------------------------------------- SPACE ----
  {
    id: 'space',
    name: 'Orbital Dynamics',
    tagline: 'Per aspera ad astra  -  and to profit.',
    emoji: '🚀',
    accent: '#38bdf8',
    resource: 'Delta-V',
    resourceShort: 'ΔV',
    currency: '₡',
    mechanicName: 'Launch Window',
    mechanicDesc:
      'Stack thrust through your launch chain. Hit the launch window for a stacked multiplier, then refuel.',
    chain: ['Hangar', 'Spaceport', 'Orbital Yard', 'Lunar Base', 'Interstellar Dock'],
    advisorTitles: ['Test Pilot', 'Flight Director', 'Chief Engineer', 'Mission Commander', 'Astrarch'],
    flavor: 'The vacuum between stars is a problem without a solution yet. Provide the solution — at launch windows the world will revolve around.',
    challenge: 'Timing is everything; the window closes without apology.',
    archetype: 'Long-bet strategists and mission-driven builders',
    tiers: [
      {
        names: [
          'Backyard Rocketry', 'Model Engine Pad', 'Amateur Telescope', 'Sounding Rocket',
          'Weather Balloon Rig', 'High-Altitude Drone', 'Static Fire Stand', 'Welded Fuselage Jig',
          'Avionics Bench', 'Suborbital Hopper',
        ],
        icons: ['🧨', '🛩️', '🔭', '🚀', '🎈', '🛸', '🔥', '🧰', '📟', '🦗'],
      },
      {
        names: [
          'Launch Pad Alpha', 'Mission Control Trailer', 'Cryo Fuel Depot', 'Booster Assembly Bay',
          'Payload Fairing Shop', 'Tracking Antenna', 'Recovery Drone Ship', 'Vertical Integration Tower',
          'Range Safety Bunker', 'Reusable Stage Hangar',
        ],
        icons: ['🛰️', '🎚️', '⛽', '🧱', '🛡️', '📡', '🚢', '🗼', '🚨', '🏗️'],
      },
      {
        names: [
          'Orbital Shipyard', 'Space Station Module', 'Solar Sail Loft', 'Ion Drive Forge',
          'Microgravity Foundry', 'Debris Sweeper Fleet', 'Refueling Tug Depot', 'Habitat Ring',
          'Deep-Space Antenna', 'Asteroid Catcher',
        ],
        icons: ['🛠️', '🛰️', '⛵', '🔋', '🏭', '🧹', '🛻', '💍', '📶', '☄️'],
      },
      {
        names: [
          'Lunar Mining Outpost', 'Regolith Refinery', 'Helium-3 Harvester', 'Mass Driver Rail',
          'Lunar Elevator Anchor', 'Far-Side Observatory', 'Crater Solar Field', 'Moon Dome Colony',
          'Lagrange Relay Station', 'Martian Transfer Gate',
        ],
        icons: ['⛏️', '🏭', '🌗', '🛤️', '🛗', '🔭', '🔆', '🏙️', '🛰️', '🔴'],
      },
      {
        names: [
          'Interstellar Drydock', 'Fusion Torchship Berth', 'Warp Coil Assembly', 'Generation Ship Cradle',
          'Antimatter Containment', 'Dyson Swarm Node', 'Wormhole Stabilizer', 'Galactic Trade Hub',
          'Stellar Forge', 'Ascension Gate',
        ],
        icons: ['🚧', '🔥', '🌀', '🛸', '⚛️', '🔆', '🕳️', '🪐', '⭐', '🌌'],
      },
    ],
  },

  // ------------------------------------------------------------ CULINARY ----
  {
    id: 'culinary',
    name: 'Gilded Fork Group',
    tagline: 'From street cart to Michelin empire.',
    emoji: '🍳',
    accent: '#fb923c',
    resource: 'Flavor Units',
    resourceShort: 'FLV',
    currency: '$',
    mechanicName: 'Mise en Place',
    mechanicDesc:
      'Prep stations feed the kitchens above them. Time a flawless service rush for a tip multiplier.',
    chain: ['Street Cart', 'Bistro', 'Fine Dining', 'Restaurant Group', 'Culinary Dynasty'],
    advisorTitles: ['Line Cook', 'Sous Chef', 'Head Chef', 'Restaurateur', 'Culinary Maestro'],
    flavor: 'A meal is a memory in the making. Build the kitchens that create them, the supply chains that sustain them, the empires that carry them across borders.',
    challenge: 'Quality cannot survive scale — unless you make it your obsession.',
    archetype: 'Detail-obsessed operators who never forget the dish',
    tiers: [
      {
        names: [
          'Hot Dog Cart', 'Taco Stand', 'Ramen Pushcart', 'Crepe Griddle',
          'Coffee Trike', 'Pretzel Kiosk', 'Falafel Window', 'Ice Cream Bike',
          'Bao Steamer Stall', 'Food Truck',
        ],
        icons: ['🌭', '🌮', '🍜', '🥞', '☕', '🥨', '🧆', '🍦', '🥟', '🚚'],
      },
      {
        names: [
          'Corner Bistro', 'Wood-Fired Pizzeria', 'Sushi Counter', 'Tapas Bar',
          'Brunch Cafe', 'Steakhouse Grill', 'Pasta Trattoria', 'Patisserie',
          'Gastropub', 'Farm-to-Table Bistro',
        ],
        icons: ['🍽️', '🍕', '🍣', '🫒', '🥐', '🥩', '🍝', '🧁', '🍺', '🥗'],
      },
      {
        names: [
          'Tasting Menu Atelier', 'Omakase Sanctum', 'Sommelier Cellar', 'Molecular Lab Kitchen',
          'Chef’s Table', 'Charcuterie Vault', 'Patissier Workshop', 'Garde Manger Station',
          'Rotisserie Hall', 'Michelin Dining Room',
        ],
        icons: ['🍷', '🍱', '🍾', '⚗️', '🪑', '🥓', '🎂', '🥬', '🍗', '⭐'],
      },
      {
        names: [
          'Flagship Restaurant', 'Central Commissary', 'Cloud Kitchen Network', 'Franchise Training Center',
          'Cold-Chain Warehouse', 'Banquet Hall', 'Hotel Dining Wing', 'Catering Megakitchen',
          'Brand Test Kitchen', 'National Chain HQ',
        ],
        icons: ['🏛️', '🏭', '☁️', '🎓', '🧊', '🎉', '🏨', '🍲', '🧪', '🏢'],
      },
      {
        names: [
          'Global Culinary Institute', 'Three-Star Constellation', 'Heirloom Vineyard Estate', 'Gastronomy Research Wing',
          'Celebrity Chef Empire', 'Floating Sky Restaurant', 'Royal Banquet Palace', 'World Cuisine Pavilion',
          'Legacy Flavor Vault', 'Eternal Feast Hall',
        ],
        icons: ['🎓', '✨', '🍇', '🔬', '👨‍🍳', '🛫', '🏰', '🌍', '🗝️', '👑'],
      },
    ],
  },

  // --------------------------------------------------------------- ENERGY ----
  {
    id: 'energy',
    name: 'Helios Power Co.',
    tagline: 'Light the world. Bank the watts.',
    emoji: '⚡',
    accent: '#fbbf24',
    resource: 'Megawatts',
    resourceShort: 'MW',
    currency: '$',
    mechanicName: 'Grid Load',
    mechanicDesc:
      'Generators feed substations feed the grid. Balance peak load to ride a surge-pricing multiplier.',
    chain: ['Generator', 'Power Plant', 'Grid Station', 'Mega Utility', 'Fusion Authority'],
    advisorTitles: ['Lineworker', 'Plant Manager', 'Grid Operator', 'Utility Director', 'Energy Sovereign'],
    flavor: 'Power the present, bet on the future. The grid doesn\'t care about ideology — but the people it feeds do. Navigate both.',
    challenge: 'Political exposure arrives with scale and doesn\'t leave.',
    archetype: 'Infrastructure visionaries who think in decades',
    tiers: [
      {
        names: [
          'Hand-Crank Dynamo', 'Rooftop Solar Panel', 'Backyard Windmill', 'Micro-Hydro Wheel',
          'Diesel Genset', 'Biogas Digester', 'Pedal Generator', 'Battery Wall',
          'Thermal Vent Tap', 'Community Solar Array',
        ],
        icons: ['🔧', '🔆', '🌬️', '💧', '⛽', '♻️', '🚲', '🔋', '♨️', '🏘️'],
      },
      {
        names: [
          'Coal Boiler Plant', 'Gas Turbine Hall', 'Onshore Wind Farm', 'Solar Thermal Tower',
          'Run-of-River Dam', 'Geothermal Well', 'Peaker Plant', 'Pumped Storage Reservoir',
          'Combined-Cycle Block', 'Substation Yard',
        ],
        icons: ['🏭', '🌀', '🌬️', '🗼', '🌊', '♨️', '🔥', '🏞️', '🔁', '🔌'],
      },
      {
        names: [
          'Regional Grid Station', 'HVDC Converter', 'Smart Grid Control', 'Offshore Wind Array',
          'Utility-Scale Battery Farm', 'Hydroelectric Megadam', 'Solar Gigafarm', 'Nuclear Reactor Unit',
          'Transmission Backbone', 'Demand-Response Hub',
        ],
        icons: ['⚡', '🔄', '📊', '🌊', '🔋', '🏞️', '🔆', '☢️', '🗼', '📉'],
      },
      {
        names: [
          'National Grid Authority', 'Continental Interconnect', 'Pumped-Hydro Megacomplex', 'Floating Solar Sea',
          'Hydrogen Electrolysis Plant', 'Thorium Reactor Park', 'Orbital Solar Collector', 'Superconducting Highway',
          'Carbon Capture Array', 'Megawatt Trading Floor',
        ],
        icons: ['🏛️', '🌐', '🏞️', '🌊', '💨', '☢️', '🛰️', '🛤️', '🌫️', '📈'],
      },
      {
        names: [
          'Tokamak Fusion Reactor', 'Stellarator Array', 'Antimatter Powerhouse', 'Dyson Energy Swarm',
          'Zero-Point Tap', 'Planetary Battery Core', 'Wireless Power Beam', 'Quantum Vacuum Engine',
          'Star-Lifting Station', 'Infinite Watt Nexus',
        ],
        icons: ['⚛️', '🌀', '💥', '🔆', '🕳️', '🔋', '📡', '🌌', '⭐', '♾️'],
      },
    ],
  },

  // -------------------------------------------------------------- FASHION ----
  {
    id: 'fashion',
    name: 'Maison Lumière',
    tagline: 'Cut, drape, conquer the runway.',
    emoji: '👗',
    accent: '#f472b6',
    resource: 'Style Points',
    resourceShort: 'STY',
    currency: '€',
    mechanicName: 'Seasonal Hype',
    mechanicDesc:
      'Ateliers feed boutiques feed houses. Drop a collection at peak hype for a trend multiplier.',
    chain: ['Atelier', 'Boutique', 'Label', 'Fashion House', 'Couture Empire'],
    advisorTitles: ['Seamstress', 'Stylist', 'Designer', 'Creative Director', 'Couturier'],
    flavor: 'A garment is a statement before it\'s a product. The question isn\'t what you\'re selling — it\'s what you\'re saying with it. Answer carefully.',
    challenge: 'Identity vs. commercialization — every collection makes the argument again.',
    archetype: 'Cultural curators and precision aestheticians',
    tiers: [
      {
        names: [
          'Sewing Corner', 'Thrift Flip Stall', 'Screen-Print Bench', 'Patchwork Table',
          'Market Stall', 'Knitting Nook', 'Embroidery Hoop', 'Tie-Dye Tub',
          'Pop-Up Rack', 'Etsy Studio',
        ],
        icons: ['🧵', '👕', '🖼️', '🧶', '🛍️', '🧣', '🪡', '🌈', '👚', '✂️'],
      },
      {
        names: [
          'Downtown Boutique', 'Denim Workshop', 'Leather Atelier', 'Knitwear Studio',
          'Footwear Cobblery', 'Accessory Bar', 'Tailor Shop', 'Lookbook Studio',
          'Showroom', 'Concept Store',
        ],
        icons: ['🏬', '👖', '👜', '🧥', '👞', '👒', '🧷', '📸', '🪞', '🛒'],
      },
      {
        names: [
          'Signature Label', 'Runway Atelier', 'Pattern-Cutting Hall', 'Textile Print House',
          'Fitting Salon', 'Lookbook Photo Studio', 'Showroom Loft', 'Boutique Flagship',
          'Trend Forecasting Lab', 'Capsule Drop Studio',
        ],
        icons: ['🏷️', '💃', '✂️', '🎨', '🪞', '📷', '🏙️', '🛍️', '🔮', '💧'],
      },
      {
        names: [
          'Fashion House HQ', 'Global Flagship Store', 'Perfume Laboratory', 'Luxury Leather Goods Wing',
          'Ready-to-Wear Factory', 'Brand Campaign Studio', 'Celebrity Styling Suite', 'E-Commerce Megahub',
          'Runway Production House', 'Licensing Bureau',
        ],
        icons: ['🏛️', '🌐', '🧴', '👜', '🏭', '🎬', '🌟', '🛒', '🎪', '📜'],
      },
      {
        names: [
          'Haute Couture Salon', 'Paris Fashion Week Pavilion', 'Met Gala Atelier', 'Jewelled Archive Vault',
          'Royal Commission Workshop', 'Avant-Garde Art Wing', 'Heritage Maison', 'Global Icon Studio',
          'Legacy Couture Vault', 'Eternal Muse Gallery',
        ],
        icons: ['👑', '🗼', '✨', '💎', '👸', '🎨', '🏰', '🌟', '🗝️', '🖼️'],
      },
    ],
  },

  // -------------------------------------------------------------- BIOTECH ----
  {
    id: 'biotech',
    name: 'Helix Therapeutics',
    tagline: 'Engineer life. Cure the world.',
    emoji: '🧬',
    accent: '#34d399',
    resource: 'Bio-Samples',
    resourceShort: 'BIO',
    currency: '$',
    mechanicName: 'Clinical Trials',
    mechanicDesc:
      'Labs feed sequencers feed pharma. Push a breakthrough through trials for an approval multiplier.',
    chain: ['Wet Lab', 'Sequencer', 'Pharma Wing', 'Genomics Campus', 'Life Foundry'],
    advisorTitles: ['Lab Tech', 'Geneticist', 'Principal Investigator', 'Chief Medical Officer', 'Bio-Visionary'],
    flavor: 'Life is the only market that doesn\'t care about margins. Until it has to. Navigate the space between discovery and delivery.',
    challenge: 'Ethics holds the scalpel over profit — and it should.',
    archetype: 'Patient, precise builders who think in breakthroughs',
    tiers: [
      {
        names: [
          'Petri Dish Bench', 'Microscope Station', 'Pipette Rack', 'PCR Thermocycler',
          'Centrifuge Pod', 'Agar Plate Incubator', 'Microbe Culture Jar', 'Microfluidic Chip',
          'Sample Freezer', 'Wet Lab Bay',
        ],
        icons: ['🧫', '🔬', '💉', '♨️', '🌀', '🦠', '🫙', '🔲', '🧊', '⚗️'],
      },
      {
        names: [
          'DNA Sequencer', 'CRISPR Editing Suite', 'Protein Synthesizer', 'Cell Culture Lab',
          'Bioreactor Tank', 'Antibody Foundry', 'Cryo-Storage Vault', 'Assay Robotics Line',
          'Spectrometry Bay', 'Bioinformatics Cluster',
        ],
        icons: ['🧬', '✂️', '🧪', '🦠', '🛢️', '🛡️', '🧊', '🤖', '📊', '💻'],
      },
      {
        names: [
          'Pharma Production Wing', 'Vaccine Fill-Finish Line', 'mRNA Synthesis Plant', 'Monoclonal Antibody Facility',
          'GMP Cleanroom', 'Clinical Trial Center', 'Gene Therapy Vault', 'Organoid Farm',
          'Tissue Engineering Bay', 'Biologics Reactor Hall',
        ],
        icons: ['💊', '💉', '🧬', '🛡️', '🧼', '🏥', '🔐', '🫀', '🩹', '🏭'],
      },
      {
        names: [
          'Genomics Megacampus', 'Personalized Medicine Hub', 'Stem Cell Factory', 'Synthetic Biology Foundry',
          'Pandemic Response Center', 'Longevity Research Wing', 'Neural Implant Lab', 'Xenotransplant Facility',
          'Global Biobank', 'Precision Oncology Institute',
        ],
        icons: ['🏛️', '🩺', '🧫', '🧬', '🦠', '⏳', '🧠', '🫁', '🏦', '🎗️'],
      },
      {
        names: [
          'Immortality Clinic', 'Whole-Organ Printer', 'De-Extinction Lab', 'Designer Genome Forge',
          'Consciousness Mapping Wing', 'Nanomedicine Swarm Lab', 'Planetary Cure Vault', 'Bio-Singularity Reactor',
          'Eternal Cell Foundry', 'Genesis Life Engine',
        ],
        icons: ['⏳', '🖨️', '🦣', '🧬', '🧠', '🔬', '🔐', '⚛️', '♾️', '🌱'],
      },
    ],
  },

  // ---------------------------------------------------------------- MEDIA ----
  {
    id: 'media',
    name: 'Viral Media House',
    tagline: 'Capture attention. Mint influence.',
    emoji: '📱',
    accent: '#a78bfa',
    resource: 'Attention',
    resourceShort: 'ATN',
    currency: '$',
    mechanicName: 'Going Viral',
    mechanicDesc:
      'Creators feed studios feed networks. Catch the algorithm at peak for a virality multiplier.',
    chain: ['Creator', 'Studio', 'Network', 'Media Empire', 'Cultural Monopoly'],
    advisorTitles: ['Editor', 'Producer', 'Showrunner', 'Studio Head', 'Media Mogul'],
    flavor: 'Attention is the currency; truth is the reserve. When the reserve runs low, the currency devalues. Protect both — or choose.',
    challenge: 'Trust is fragile and rivals know exactly how to break it.',
    archetype: 'Narrative strategists and platform architects',
    tiers: [
      {
        names: [
          'Phone Vlog Setup', 'Ring Light Corner', 'Podcast Mic', 'Meme Page',
          'Streaming Bedroom', 'Selfie Studio', 'Newsletter Desk', 'GIF Lab',
          'Comment Farm', 'Bedroom Editing Rig',
        ],
        icons: ['📱', '💡', '🎙️', '😂', '🎮', '🤳', '📧', '🖼️', '💬', '✂️'],
      },
      {
        names: [
          'Content Studio', 'Green-Screen Set', 'Audio Booth', 'Animation Suite',
          'Live Stream Stage', 'Thumbnail Lab', 'Influencer Loft', 'Newsroom Floor',
          'Music Video Set', 'Sponsorship Desk',
        ],
        icons: ['🎥', '🟩', '🎧', '🎞️', '📺', '🖼️', '🛋️', '🗞️', '🎵', '🤝'],
      },
      {
        names: [
          'Broadcast Network', 'Soundstage Complex', 'Streaming Platform', 'Talk-Show Theater',
          'VFX Render Wing', 'Recording Label', 'Esports Arena', 'Ad Sales Tower',
          'Original Series Studio', 'Viral Trends Lab',
        ],
        icons: ['📡', '🎬', '📺', '🎤', '✨', '💿', '🎮', '🏢', '🎞️', '🔥'],
      },
      {
        names: [
          'Media Empire HQ', 'Global Streaming Backbone', 'Blockbuster Studio Lot', 'Cinematic Universe Wing',
          'Sports Broadcast Empire', 'Music Streaming Giant', 'News Conglomerate', 'Talent Agency Tower',
          'Algorithm Optimization Center', 'Pan-Continental Network',
        ],
        icons: ['🏛️', '🌐', '🎬', '🦸', '🏟️', '🎶', '📰', '⭐', '🧮', '🌍'],
      },
      {
        names: [
          'Cultural Monopoly Tower', 'Metaverse Broadcast Realm', 'Neural Feed Studio', 'Reality-Bending VR Wing',
          'Holographic Theater', 'Global Mindshare Engine', 'Memetic Warfare Lab', 'Eternal IP Vault',
          'Sentient Algorithm Core', 'Zeitgeist Nexus',
        ],
        icons: ['🗼', '🕶️', '🧠', '🌀', '🎇', '🌐', '🧬', '🔐', '🤖', '✨'],
      },
    ],
  },

  // ----------------------------------------------------------------- AGRI ----
  {
    id: 'agri',
    name: 'Verdant Acres',
    tagline: 'Sow once. Reap an empire.',
    emoji: '🌾',
    accent: '#84cc16',
    resource: 'Harvest',
    resourceShort: 'HRV',
    currency: '$',
    mechanicName: 'Harvest Season',
    mechanicDesc:
      'Plots feed farms feed agribusiness. Time the harvest season for a bumper-crop multiplier.',
    chain: ['Plot', 'Farm', 'Agribusiness', 'Agri-Conglomerate', 'Biosphere Authority'],
    advisorTitles: ['Farmhand', 'Agronomist', 'Farm Manager', 'Agribusiness Baron', 'Gaia Steward'],
    flavor: 'The oldest industry is the one nobody romanticizes until it fails. You know it won\'t fail on your watch. Prove it to the world that forgot.',
    challenge: 'Climate and timing answer to no one — not even you.',
    archetype: 'Patient pragmatists who build for the long season',
    tiers: [
      {
        names: [
          'Window Herb Box', 'Backyard Veg Patch', 'Chicken Coop', 'Compost Bin',
          'Raised Garden Bed', 'Beehive', 'Goat Pen', 'Rainwater Barrel',
          'Tool Shed', 'Roadside Produce Stand',
        ],
        icons: ['🪴', '🥕', '🐔', '♻️', '🌱', '🐝', '🐐', '🛢️', '🛖', '🍎'],
      },
      {
        names: [
          'Wheat Field', 'Orchard Grove', 'Dairy Barn', 'Vineyard Row',
          'Greenhouse', 'Tractor Shed', 'Irrigation Canal', 'Grain Silo',
          'Pig Farm', 'Cornfield',
        ],
        icons: ['🌾', '🍏', '🐄', '🍇', '🏡', '🚜', '💧', '🌽', '🐖', '🌽'],
      },
      {
        names: [
          'Mega Feedlot', 'Vertical Farm Tower', 'Hydroponic Greenhouse', 'Combine Harvester Fleet',
          'Cold Storage Depot', 'Grain Elevator', 'Aquaculture Ponds', 'Poultry Megabarn',
          'Drip-Irrigation Network', 'Seed Processing Plant',
        ],
        icons: ['🐂', '🏢', '🥬', '🚜', '🧊', '🏗️', '🐟', '🐓', '💧', '🌰'],
      },
      {
        names: [
          'Agribusiness HQ', 'Continental Grain Belt', 'GMO Seed Laboratory', 'Robotic Farming Fleet',
          'Food Processing Megaplant', 'Cold-Chain Logistics Hub', 'Fertilizer Refinery', 'Precision Ag Satellite Net',
          'Commodity Trading Floor', 'Global Distribution Center',
        ],
        icons: ['🏛️', '🌾', '🧬', '🤖', '🏭', '🚛', '🧪', '🛰️', '📈', '🌍'],
      },
      {
        names: [
          'Biosphere Dome', 'Lab-Grown Meat Foundry', 'Terraforming Greenhouse', 'Ocean Farming Platform',
          'Atmospheric Water Harvester', 'Self-Sustaining Arcology', 'Climate Control Authority', 'Seed Vault of Eternity',
          'Planetary Harvest Engine', 'Gaia Cultivation Nexus',
        ],
        icons: ['🌐', '🥩', '🌡️', '🌊', '💧', '🏙️', '🛰️', '🔐', '🌾', '🌍'],
      },
    ],
  },

  // ------------------------------------------------------------- FINANCE ----
  {
    id: 'finance',
    name: 'Voss Capital Group',
    tagline: 'Where money becomes power becomes legacy.',
    emoji: '📊',
    accent: '#06b6d4',
    resource: 'Capital',
    resourceShort: 'CAP',
    currency: '$',
    mechanicName: 'Market Cycle',
    mechanicDesc:
      'Time capital deployments to market phases. Bull market - deploy; bear market - accumulate. Hit the cycle peak for a compound multiplier.',
    chain: ['Analyst Desk', 'Trading Floor', 'Investment Fund', 'Capital Firm', 'Financial Authority'],
    advisorTitles: ['Analyst', 'Portfolio Manager', 'Fund Director', 'Chief Investment Officer', 'Market Oracle'],
    flavor: 'Money moves before news does. The question is whether yours moves toward something worth moving toward. That is the only question that matters.',
    challenge: 'Systemic risk creates cascades you cannot see until they arrive.',
    archetype: 'Macro thinkers and risk architects who play the long game',
    tiers: [
      {
        names: [
          'Market Research Desk', 'Financial Modeling Suite', 'Bloomberg Terminal', 'Options Calculator',
          'Risk Assessment Bench', 'Earnings Monitor', 'Portfolio Tracker', 'Economic Data Feed',
          'Technical Analysis Station', 'Quant Script Farm',
        ],
        icons: ['📊', '📈', '🖥️', '📉', '⚖️', '📞', '💼', '📡', '📐', '🤖'],
      },
      {
        names: [
          'Equities Trading Desk', 'Derivatives Pit', 'Fixed Income Desk', 'FX Trading Floor',
          'Commodity Futures Bench', 'Arbitrage Station', 'Algo Trading Cluster', 'Market Making Desk',
          'Prime Brokerage Suite', 'Securities Clearing House',
        ],
        icons: ['🏦', '📊', '🔒', '💱', '🛢️', '⚖️', '🤖', '🏛️', '🏢', '🔄'],
      },
      {
        names: [
          'Venture Capital Fund', 'Growth Equity Desk', 'Distressed Assets Unit', 'Leveraged Buyout Wing',
          'Mezzanine Finance Unit', 'Real Assets Portfolio', 'Credit Opportunities Fund', 'Macro Strategy Desk',
          'Long/Short Equity Fund', 'Quant Strategies Lab',
        ],
        icons: ['💡', '📈', '🔥', '🏗️', '🔀', '🏠', '💳', '🌐', '📊', '🧬'],
      },
      {
        names: [
          'Sovereign Wealth Mandate', 'Global Macro Fund', 'Multi-Strategy Platform', 'Endowment Management Unit',
          'Insurance Capital Block', 'Pension Partnership', 'Family Office Division', 'Infrastructure Debt Fund',
          'Special Situations Desk', 'Alternative Assets Tower',
        ],
        icons: ['🏛️', '🌍', '🎯', '🎓', '📋', '👥', '🏠', '🏗️', '⚡', '💎'],
      },
      {
        names: [
          'Central Bank Partnership', 'Sovereign Bond Issuance', 'Global Exchange Ownership', 'Systemic Institution Wing',
          'Financial Infrastructure Core', 'Currency Reserve Management', 'Cross-Border Settlement Engine', 'Algorithmic Market Authority',
          'Global Financial Network', 'Infinite Liquidity Nexus',
        ],
        icons: ['🏦', '📜', '🌐', '🏛️', '⚙️', '💵', '🔄', '🤖', '🌍', '♾️'],
      },
    ],
  },

  // --------------------------------------------------------- REAL ESTATE ----
  {
    id: 'realestate',
    name: 'Okafor Developments',
    tagline: 'Place isn\'t just land  -  it\'s potential waiting.',
    emoji: '🏗️',
    accent: '#f59e0b',
    resource: 'Property Value',
    resourceShort: 'PROP',
    currency: '$',
    mechanicName: 'Development Wave',
    mechanicDesc:
      'Acquire land, develop it, let it mature. Catch the market wave at project completion for a valuation surge multiplier.',
    chain: ['Agent', 'Developer', 'Property Group', 'Real Estate Empire', 'City Architect'],
    advisorTitles: ['Leasing Agent', 'Property Analyst', 'Development Director', 'Portfolio Chief', 'Master Builder'],
    flavor: 'Every building is a bet on the future of a place. The places that survive are the ones someone believed in when nobody else did. Be that someone.',
    challenge: 'Capital cycles are long; patience is the only skill that compounds.',
    archetype: 'Place-makers and long-view investors with nerves of concrete',
    tiers: [
      {
        names: [
          'Single-Room Rental', 'Parking Lot Plot', 'Corner Shop Lease', 'Suburban Lot',
          'Fixer-Upper House', 'Storage Unit Block', 'Foreclosed Property', 'Vacant Lot Option',
          'Run-Down Duplex', 'Land Banking Parcel',
        ],
        icons: ['🏠', '🚗', '🛍️', '🏘️', '🔧', '📦', '📉', '📋', '🏚️', '🌿'],
      },
      {
        names: [
          'Residential Subdivision', 'Strip Mall Development', 'Mixed-Use Block', 'Apartment Complex',
          'Industrial Warehouse', 'Medical Office Park', 'Retail Shopping Center', 'Urban Infill Project',
          'Townhouse Row', 'Boutique Hotel Conversion',
        ],
        icons: ['🏘️', '🏬', '🏗️', '🏢', '🏭', '🏥', '🛒', '🌆', '🏠', '🏨'],
      },
      {
        names: [
          'Office Tower', 'Luxury Condo High-Rise', 'Tech Campus Development', 'Logistics Megawarehouse',
          'Regional Shopping Mall', 'Hospitality Portfolio', 'Data Center Park', 'Urban Mixed-Use District',
          'Waterfront Development', 'Cultural Arts District',
        ],
        icons: ['🏢', '🌟', '💻', '📦', '🛍️', '🏨', '🖥️', '🌆', '🌊', '🎭'],
      },
      {
        names: [
          'Skyscraper Complex', 'Smart City District', 'Airport Adjacent Zone', 'Harbor Redevelopment',
          'University Quarter', 'Innovation Corridor', 'Sports Stadium Quarter', 'Transit-Oriented Hub',
          'Metropolitan Crown Tower', 'Mega Mixed-Use Hub',
        ],
        icons: ['🗼', '🏙️', '✈️', '⚓', '🎓', '💡', '🏟️', '🚇', '👑', '🔀'],
      },
      {
        names: [
          'New City Foundation', 'Sovereign Territory Development', 'Artificial Island Construction', 'Underground City Complex',
          'Floating Platform District', 'Space Station Habitat', 'Arcology Tower', 'Global Real Estate Exchange',
          'Planetary Habitat Network', 'Legacy City Monument',
        ],
        icons: ['🌆', '🏛️', '🏝️', '🕳️', '🌊', '🛰️', '🌐', '🌍', '🪐', '🗿'],
      },
    ],
  },

  // --------------------------------------------------------- ENTERTAINMENT ----
  {
    id: 'entertainment',
    name: 'Ventura Studios',
    tagline: 'Tell the story. Hold the world.',
    emoji: '🎭',
    accent: '#ec4899',
    resource: 'Engagement',
    resourceShort: 'ENG',
    currency: '$',
    mechanicName: 'Cultural Moment',
    mechanicDesc:
      'Release a title at cultural peak for a compound engagement surge. The right story at the right moment rewrites the market.',
    chain: ['Indie Creator', 'Production Studio', 'Distribution Network', 'Entertainment Empire', 'Cultural Monopoly'],
    advisorTitles: ['Script Reader', 'Line Producer', 'Executive Producer', 'Studio President', 'Cultural Visionary'],
    flavor: 'Stories change laws. Stories move markets. Stories are the only thing that outlasts the empire. Build the machine that tells them — carefully.',
    challenge: 'Influence without propaganda is the tightest wire in the industry.',
    archetype: 'Narrative builders and cultural power brokers',
    tiers: [
      {
        names: [
          'Self-Published Zine', 'YouTube Channel', 'Podcast Booth', 'Short Film Workshop',
          'Comic Strip Studio', 'Bedroom Music Studio', 'Fan Fiction Archive', 'Twitch Stream Corner',
          'Photography Darkroom', 'Sketch Comedy Troupe',
        ],
        icons: ['📰', '📱', '🎙️', '🎞️', '🖼️', '🎹', '📚', '🎮', '📷', '😂'],
      },
      {
        names: [
          'Indie Film Production House', 'Record Label', 'Animation Studio', 'Gaming Studio',
          'Comedy Writing Room', 'Talent Management Agency', 'Music Video Production', 'Documentary Unit',
          'Theater Production Company', 'Book Publishing Imprint',
        ],
        icons: ['🎬', '🎵', '🎨', '🕹️', '😄', '⭐', '🎶', '📹', '🎭', '📖'],
      },
      {
        names: [
          'Streaming Platform', 'Film Festival Circuit', 'Nationwide Theater Chain', 'Music Distribution Network',
          'Sports League Broadcasting', 'Reality TV Production Wing', 'Licensed IP Portfolio', 'Esports League',
          'Theme Park Concept', 'Literary Agency Network',
        ],
        icons: ['📺', '🏆', '🎪', '🎶', '🏅', '👁️', '🔐', '🎮', '🎡', '📚'],
      },
      {
        names: [
          'Blockbuster Studio Complex', 'Global Streaming Giant', 'Music Festival Empire', 'Sports Franchise Portfolio',
          'Theme Park Resort', 'Cinematic Universe Factory', 'Award Show Ownership', 'Celebrity Talent Farm',
          'Cross-Media IP Engine', 'Entertainment Megaplex',
        ],
        icons: ['🏛️', '🌐', '🎸', '🏟️', '🎢', '🦸', '🏆', '⭐', '🎯', '🏗️'],
      },
      {
        names: [
          'Cultural Zeitgeist Engine', 'Metaverse Entertainment Realm', 'AI Storytelling Platform', 'Consciousness Entertainment Lab',
          'Neural Narrative Interface', 'Reality-Shaping Media Mesh', 'Global Memory Archive', 'Eternal IP Vault',
          'Sentient Story Engine', 'Legacy of the Century Tower',
        ],
        icons: ['✨', '🕶️', '🤖', '🧠', '🔮', '🌀', '🗝️', '🔐', '💫', '🌌'],
      },
    ],
  },

  // --------------------------------------------------------- HOSPITALITY ----
  {
    id: 'hospitality',
    name: 'Tanaka Collection',
    tagline: 'The space between arrival and memory.',
    emoji: '🏨',
    accent: '#d946ef',
    resource: 'Experience',
    resourceShort: 'EXP',
    currency: '$',
    mechanicName: 'Experience Peak',
    mechanicDesc:
      'Staff morale directly multiplies guest output. Peak season compounds everything — the secret is the people, not the property.',
    chain: ['Inn', 'Hotel', 'Resort', 'Hospitality Group', 'Empire of Experience'],
    advisorTitles: ['Front Desk Agent', 'Guest Relations Manager', 'General Manager', 'VP of Operations', 'Legendary Host'],
    flavor: 'Every guest arrives carrying a story and leaves making one. The hotel is the space between. Make that space worth remembering — always.',
    challenge: 'People business at scale is the hardest art form that exists.',
    archetype: 'Experience curators and detail perfectionists who build for memory',
    tiers: [
      {
        names: [
          'Bed & Breakfast', 'Hostel Bunk Room', 'Roadside Motel', 'Airbnb Property',
          'Village Guesthouse', 'Mountain Cabin', 'Beachside Cottage', 'City Room Rental',
          'Converted Barn Stay', 'Budget Inn',
        ],
        icons: ['🛏️', '🛖', '🏨', '🏠', '🏡', '⛺', '🏖️', '🌆', '🌾', '💤'],
      },
      {
        names: [
          'Business Class Hotel', 'Airport Transit Hotel', 'Seaside Boutique Hotel', 'City Center Hotel',
          'Conference Hotel', 'Historic Building Hotel', 'All-Inclusive Resort Hotel', 'Extended Stay Suite',
          'Wellness Retreat Hotel', 'Rooftop Pool Hotel',
        ],
        icons: ['🏢', '✈️', '🌊', '🌆', '🎤', '🏛️', '☀️', '🛋️', '🧘', '🏊'],
      },
      {
        names: [
          'Luxury Beachfront Resort', 'Mountain Ski Lodge', 'Vineyard Estate Resort', 'Safari Lodge',
          'Private Island Resort', 'Wellness & Spa Retreat', 'Golf Course Estate', 'Desert Glamping Resort',
          'Overwater Bungalow Complex', 'Heritage Castle Hotel',
        ],
        icons: ['🏖️', '⛷️', '🍷', '🦁', '🏝️', '🧖', '⛳', '🏕️', '🌊', '🏰'],
      },
      {
        names: [
          'International Hotel Chain', 'Lifestyle Brand Collection', 'Luxury Brand Portfolio', 'Themed Resort Empire',
          'Convention Center Complex', 'Cruise Ship Line', 'Private Members Club', 'Branded Residences Tower',
          'Casino Resort Complex', 'Hospitality Megafund',
        ],
        icons: ['🌐', '🎨', '💎', '🎭', '🏛️', '🚢', '🔑', '🏠', '🎰', '📈'],
      },
      {
        names: [
          'Floating Luxury Island', 'Space Tourism Terminal', 'Underground Palace Hotel', 'Holographic Experience Venue',
          'Sentient Hotel AI Network', 'Zero-Gravity Suite', 'Cultural Preservation Estate', 'Eternal Guest Archive',
          'Timeless Grand Hotel', 'The Last Great Host',
        ],
        icons: ['🏝️', '🛰️', '🕳️', '🎇', '🤖', '🌌', '🗿', '🔐', '♾️', '👑'],
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// Build the IndustryConfig records from the seeds
// ----------------------------------------------------------------------------

function seedToConfig(seed: IndustrySeed): IndustryConfig {
  return {
    id: seed.id,
    name: seed.name,
    tagline: seed.tagline,
    emoji: seed.emoji,
    accent: seed.accent,
    resource: seed.resource,
    resourceShort: seed.resourceShort,
    currency: seed.currency,
    mechanicName: seed.mechanicName,
    mechanicDesc: seed.mechanicDesc,
    chain: seed.chain,
    advisorTitles: seed.advisorTitles,
    facilities: buildFacilities(seed.id, seed.tiers),
    tierUnlock: [0, 1e4, 1e7, 1e10, 1e13],
    flavor: seed.flavor,
    challenge: seed.challenge,
    archetype: seed.archetype,
  };
}

export const INDUSTRY_LIST: IndustryConfig[] = SEEDS.map(seedToConfig);

export const INDUSTRIES: Record<IndustryType, IndustryConfig> =
  INDUSTRY_LIST.reduce((acc, cfg) => {
    acc[cfg.id] = cfg;
    return acc;
  }, {} as Record<IndustryType, IndustryConfig>);

// ----------------------------------------------------------------------------
// PHILOSOPHIES  -  matches the Philosophy union, with bonus copy mirroring the
// economy formulas in the build contract.
// ----------------------------------------------------------------------------

export const PHILOSOPHIES: {
  id: Philosophy;
  name: string;
  desc: string;
  icon: string;
  bonus: string;
}[] = [
  {
    id: 'innovator',
    name: 'The Innovator',
    desc: 'Move fast and invent things. Research is the engine of your empire.',
    icon: '💡',
    bonus: '+15% research speed',
  },
  {
    id: 'efficiency',
    name: 'The Optimizer',
    desc: 'Trim every gram of waste. Lean operations print money.',
    icon: '⚙️',
    bonus: '+15% global production',
  },
  {
    id: 'people_first',
    name: 'People First',
    desc: 'Empower your people and they’ll move mountains for you.',
    icon: '🤝',
    bonus: '+15% advisor effectiveness',
  },
  {
    id: 'aggressive',
    name: 'The Conqueror',
    desc: 'Expand relentlessly. Plant your flag before rivals can blink.',
    icon: '🗡️',
    bonus: '-15% territory expansion time',
  },
];

// ----------------------------------------------------------------------------
// ACCENT_SWATCHES  -  10 premium hex colors usable as --accent.
// ----------------------------------------------------------------------------

export const ACCENT_SWATCHES: string[] = [
  '#6366f1', // indigo
  '#38bdf8', // sky
  '#34d399', // emerald
  '#fbbf24', // amber
  '#fb923c', // orange
  '#f472b6', // pink
  '#a78bfa', // violet
  '#84cc16', // lime
  '#f87171', // rose-red
  '#22d3ee', // cyan
];

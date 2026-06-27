// ============================================================================
// Old Masters  -  the legendary predecessors who transferred their empires.
// One per industry. Their origin dialogue plays during onboarding (Inheritance
// Arc mode). Contacts are delivered via the Ledger as the player progresses.
// ============================================================================

import type { IndustryType } from '../game/types';

export interface OldMasterContact {
  id: string;
  trigger: 'earnings' | 'prestige' | 'milestone';
  triggerValue?: number;
  /** Short message delivered via the Ledger. */
  message: string;
  source: string;
  icon: string;
}

export interface OldMasterConfig {
  id: IndustryType;
  name: string;
  title: string;
  emoji: string;
  accent: string;
  status: string;
  /** One-line punchy hook shown on industry card. */
  hook: string;
  /** 4 lines of origin monologue for the cinematic modal. */
  originLines: [string, string, string, string];
  /** The final line before the player begins — the handoff. */
  handoff: string;
  contacts: OldMasterContact[];
}

export const OLD_MASTERS: OldMasterConfig[] = [
  // ---- TECH ------------------------------------------------------------------
  {
    id: 'tech',
    name: 'Ezra Nakamura',
    title: 'Architect of the Machine Mind',
    emoji: '🖥️',
    accent: '#6366f1',
    status: 'Deceased — three months ago',
    hook: 'Started with a $200 loan. Built 6 companies. Gave 3 away. The other 3 run the world\'s data infrastructure.',
    originLines: [
      'They told me compute was a utility. I told them it was a language — and I was going to write the next chapter.',
      'I was laughed out of four boardrooms in one week. I kept notes. The ones who laughed loudest moved slowest.',
      'What I built isn\'t the technology. Technology ages. What I built is the habit of asking: what does the machine not know yet?',
      'I left you this not because you\'re the smartest person I found. I left you this because you asked the right questions.',
    ],
    handoff: 'The lab is yours. Don\'t let it go quiet.',
    contacts: [
      {
        id: 'tech_c1',
        trigger: 'earnings',
        triggerValue: 10_000,
        message: 'Nakamura Archive — Page 1: "The ones who build the infrastructure own the future. The ones who rent it are just customers." — E.N.',
        source: 'Nakamura Estate',
        icon: '📜',
      },
      {
        id: 'tech_c2',
        trigger: 'earnings',
        triggerValue: 1_000_000,
        message: 'Nakamura Archive — Page 7: "When I hit my first million I thought I\'d feel different. I didn\'t. I called my sister. She reminded me of the $200."',
        source: 'Nakamura Estate',
        icon: '📜',
      },
      {
        id: 'tech_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Nakamura Archive — Page 14: "I reset three times. Every reset I kept one thing: the question I hadn\'t answered yet. That question became the next empire."',
        source: 'Nakamura Estate',
        icon: '📜',
      },
    ],
  },

  // ---- SPACE -----------------------------------------------------------------
  {
    id: 'space',
    name: 'Celeste Varga',
    title: 'The Woman Who Privatized the Sky',
    emoji: '🚀',
    accent: '#38bdf8',
    status: 'Living, age 89 — retired to an observatory in New Mexico',
    hook: 'NASA rejected her 6 times. She sent them a postcard from her first orbital launch. They kept it.',
    originLines: [
      'The vacuum of space is not empty. It is a problem without a solution yet. My life\'s work was providing the solution.',
      'I was told private spaceflight was a fantasy. I was told that six times, by six different committees. I took notes on all of them.',
      'The stars are not the destination. The stars are the direction. The destination is the question you dare to ask looking up at them.',
      'I am 89 years old and I still send telegrams. I am sending you one now, and it says: do not waste the altitude I built.',
    ],
    handoff: 'The launch window opens when you\'re ready. Be ready.',
    contacts: [
      {
        id: 'space_c1',
        trigger: 'earnings',
        triggerValue: 50_000,
        message: 'Telegram from Varga: "First orbit is the hardest. After that, the sky is not the limit — it never was." — C.V.',
        source: 'New Mexico Observatory',
        icon: '📡',
      },
      {
        id: 'space_c2',
        trigger: 'earnings',
        triggerValue: 10_000_000,
        message: 'Telegram from Varga: "I watched you from the scope last night. Not you, the empire. It\'s growing like I hoped. Don\'t stop at orbit." — C.V.',
        source: 'New Mexico Observatory',
        icon: '📡',
      },
      {
        id: 'space_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Telegram from Varga: "Restructured? Good. Every rocket has a staging separation. The dead weight falls away. The mission continues." — C.V.',
        source: 'New Mexico Observatory',
        icon: '📡',
      },
    ],
  },

  // ---- CULINARY --------------------------------------------------------------
  {
    id: 'culinary',
    name: 'Lorenzo Benedetti',
    title: 'The Chef Who Fed Nations',
    emoji: '🍳',
    accent: '#fb923c',
    status: 'Deceased — ten years ago, but his ghost is in every kitchen',
    hook: 'Three Michelin chefs trained him. All three said he was wasting his talent on the poor. He named his most famous dish after that insult.',
    originLines: [
      'Food is never just food. A meal is a transfer of time, of care, of memory. That is why they told me I was wasting my talent — they had forgotten this.',
      'I built 1,200 restaurants across 40 countries. Not one of them serves the same dish twice the same way. That is not a bug. That is the point.',
      'My teachers gave me technique. My customers gave me purpose. My rivals gave me anger. I cooked with all three.',
      'I left my recipe notebooks in the vault. Open one per year — but only after reading the financial statements first. So you remember why food matters.',
    ],
    handoff: 'The kitchen is yours. Feed the world without forgetting why.',
    contacts: [
      {
        id: 'culinary_c1',
        trigger: 'earnings',
        triggerValue: 25_000,
        message: 'Benedetti Notebook, Year 1: "The greatest dish I ever made cost $0.30 in ingredients and 40 years of practice. Never confuse cost with value."',
        source: 'The Gilded Fork Vault',
        icon: '📔',
      },
      {
        id: 'culinary_c2',
        trigger: 'earnings',
        triggerValue: 5_000_000,
        message: 'Benedetti Notebook, Year 12: "Scale is the enemy of soul — unless the person scaling never forgets what the dish is for. This is the only problem worth solving."',
        source: 'The Gilded Fork Vault',
        icon: '📔',
      },
      {
        id: 'culinary_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Benedetti Notebook, Year 23: "I closed my first restaurant. It was the best thing I ever did. Sometimes the menu must be cleared before the next great thing can be written."',
        source: 'The Gilded Fork Vault',
        icon: '📔',
      },
    ],
  },

  // ---- ENERGY ----------------------------------------------------------------
  {
    id: 'energy',
    name: 'Miriam Ashworth',
    title: 'The Prophet of the Sun',
    emoji: '⚡',
    accent: '#fbbf24',
    status: 'Missing — last seen at a remote research station; coordinates known only to you',
    hook: 'Divested all fossil assets in 2004. Was called delusional. Called it again in 2019 before the Senate. Then disappeared.',
    originLines: [
      'I predicted the solar revolution twenty years before it happened. They didn\'t call me a visionary. They called me naive.',
      'The market is always right about prices and always wrong about timing. I was right about timing. That is worth more than being right about prices.',
      'I testified before the Senate in 2019 about energy market manipulation. The transcript is sealed. I have a copy. It is in your desk.',
      'I left because I had to. The coordinates I gave you are not a retreat. They are a field station. I am still working. I will contact you when it matters.',
    ],
    handoff: 'The grid is yours. Protect it. And watch for my first message.',
    contacts: [
      {
        id: 'energy_c1',
        trigger: 'earnings',
        triggerValue: 100_000,
        message: 'Encrypted message from Ashworth: "The transition is real. The timeline is accelerating. You\'re positioned correctly. Don\'t let the incumbents convince you otherwise." — M.A.',
        source: 'Encrypted Channel, Location Unknown',
        icon: '🔐',
      },
      {
        id: 'energy_c2',
        trigger: 'earnings',
        triggerValue: 50_000_000,
        message: 'Encrypted message from Ashworth: "The Senate sealed that transcript to protect three people. Two of them are now your rivals. The third is watching you. Carefully." — M.A.',
        source: 'Encrypted Channel, Location Unknown',
        icon: '🔐',
      },
      {
        id: 'energy_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Encrypted message from Ashworth: "You restructured. Good. The grid doesn\'t care about your ego. Neither do I. Keep building." — M.A.',
        source: 'Encrypted Channel, Location Unknown',
        icon: '🔐',
      },
    ],
  },

  // ---- FASHION ---------------------------------------------------------------
  {
    id: 'fashion',
    name: 'Alexandre Dumont',
    title: 'The Last Couturier',
    emoji: '✂️',
    accent: '#f472b6',
    status: 'Living, age 94 — writes weekly from Paris',
    hook: 'Built a fashion empire on one principle: every garment must honor the culture it borrows from. His rivals called it impossible. His clients called it irreplaceable.',
    originLines: [
      'Fashion is not decoration. It is language. Every seam is a sentence. Every collection is a manifesto. When I stopped caring what the manifesto said, I stopped.',
      'I was called sentimental for refusing to exploit. I was called naive for insisting on authenticity. I was called a fool for turning down three acquisitions. Then I was called a legend.',
      'I am 94 years old and I still have opinions. I will share them. You will receive a letter from me on the first of every month. Read it.',
      'I chose you because you haven\'t forgotten what clothes are for. Don\'t let the money remind you.',
    ],
    handoff: 'The atelier is yours. The first letter arrives next month. Don\'t be late.',
    contacts: [
      {
        id: 'fashion_c1',
        trigger: 'earnings',
        triggerValue: 50_000,
        message: 'Letter from Dumont: "The first collection always tells the truth. The second collection tells the story of who you wish you were. The third tells the truth again. Trust the third." — A.D.',
        source: 'Paris, 1er Arrondissement',
        icon: '✉️',
      },
      {
        id: 'fashion_c2',
        trigger: 'earnings',
        triggerValue: 10_000_000,
        message: 'Letter from Dumont: "I see what you are building. It has a shape I recognize. Do not lose the thread that makes it yours. The thread is not visible in the balance sheets." — A.D.',
        source: 'Paris, 1er Arrondissement',
        icon: '✉️',
      },
      {
        id: 'fashion_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Letter from Dumont: "You shed the season\'s work. This is correct. Even the greatest houses close collections. What matters is what you carry forward into the next one." — A.D.',
        source: 'Paris, 1er Arrondissement',
        icon: '✉️',
      },
    ],
  },

  // ---- BIOTECH ---------------------------------------------------------------
  {
    id: 'biotech',
    name: 'Dr. Priya Vasanth',
    title: 'The Doctor Who Bet Against Herself',
    emoji: '🧬',
    accent: '#34d399',
    status: 'In exile — location known only to you and her attorneys',
    hook: 'Gave away her first fortune to fund a treatment nobody would pay for. Rebuilt it from nothing. Did it twice.',
    originLines: [
      'I gave away $400 million to fund a cure for a disease that affected 3,000 people globally. My board said it was irrational. I said: rationality is a hypothesis. The cure was proof.',
      'They pressured me out. A consortium I cannot name yet. The full IP does not transfer to you until I trust you — and I do not trust easily.',
      'I am watching how you build. Not what you build. Priya Vasanth doesn\'t care about the income statement. She cares about the methodology.',
      'Earn my trust. Then earn the rest of the inheritance. I have left you enough to start. The question is whether you deserve the rest.',
    ],
    handoff: 'The lab has a second door. I hold that key. Earn it.',
    contacts: [
      {
        id: 'biotech_c1',
        trigger: 'earnings',
        triggerValue: 100_000,
        message: 'Message from Dr. Vasanth: "I\'ve reviewed your early decisions. You show discipline. The IP transfer begins in phases. Phase One is now unlocked." — P.V.',
        source: 'Encrypted, Location Withheld',
        icon: '🧬',
      },
      {
        id: 'biotech_c2',
        trigger: 'earnings',
        triggerValue: 100_000_000,
        message: 'Message from Dr. Vasanth: "Phase Three unlocked. The consortium that pressured me out is watching you too. They will move eventually. Be ready with the science." — P.V.',
        source: 'Encrypted, Location Withheld',
        icon: '🧬',
      },
      {
        id: 'biotech_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Message from Dr. Vasanth: "You rebuilt after the reset. That\'s the only qualification I actually required. Full IP transfer is now authorized." — P.V.',
        source: 'Encrypted, Location Withheld',
        icon: '🧬',
      },
    ],
  },

  // ---- MEDIA -----------------------------------------------------------------
  {
    id: 'media',
    name: 'Solomon Park',
    title: 'The Editor Who Could Not Be Bought',
    emoji: '📡',
    accent: '#a78bfa',
    status: 'In a care facility — coherent on Tuesdays; you may visit',
    hook: 'Built the only independent network that refused every acquisition. Then something happened. The stories about it vary.',
    originLines: [
      'I built something that couldn\'t be bought. I was wrong. Everything can be bought. What I actually built was something that wouldn\'t stay bought.',
      'The incident is in the redacted transcript. Three people know the full story: my attorney, my former deputy editor, and me. She is now your Chief of Staff.',
      'I am coherent on Tuesdays. You should visit. What I tell you depends on what you ask, and what you ask depends on how much you\'ve built.',
      'The network is the truth machine. That is not a metaphor. Do not let it become one.',
    ],
    handoff: 'The broadcast tower is live. Keep it honest.',
    contacts: [
      {
        id: 'media_c1',
        trigger: 'earnings',
        triggerValue: 100_000,
        message: 'From Solomon (Tuesday visit): "The first thing they try to buy is your editorial judgment. The second thing they try to buy is your silence about the first." — S.P.',
        source: 'Care Facility, Tuesday Visit',
        icon: '🎙️',
      },
      {
        id: 'media_c2',
        trigger: 'earnings',
        triggerValue: 50_000_000,
        message: 'From Solomon (Tuesday visit): "I\'m going to tell you what happened. Not all of it. Enough. Come in person. Bring nothing digital." — S.P.',
        source: 'Care Facility, Tuesday Visit',
        icon: '🎙️',
      },
      {
        id: 'media_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'From Solomon (Tuesday visit): "You reset. Good. The story continues. The network that can survive a reset is the one worth inheriting." — S.P.',
        source: 'Care Facility, Tuesday Visit',
        icon: '🎙️',
      },
    ],
  },

  // ---- AGRICULTURE -----------------------------------------------------------
  {
    id: 'agri',
    name: 'Nnamdi Osei',
    title: 'The Farmer of Nations',
    emoji: '🌾',
    accent: '#84cc16',
    status: 'Nomadic — communicates through a proxy named Amara',
    hook: 'Transformed subsistence farming across 12 countries without taking equity. Then took equity and transformed it again. He says there\'s no contradiction.',
    originLines: [
      'The first time I transformed a farm, I took nothing. The farmer kept everything. Three years later she built two more farms. That is the model.',
      'The second time I transformed a country\'s agricultural sector, I took equity. The critics called it a betrayal. I called it the second chapter.',
      'I don\'t give advice. I ask questions until you give yourself advice. You\'ll meet Amara first. She speaks for me until I speak for myself.',
      'I\'ll appear once, in person, when the time is right. You\'ll know it\'s me because I\'ll ask the question you\'ve been avoiding.',
    ],
    handoff: 'The fields are yours. Amara will be in touch. Listen carefully.',
    contacts: [
      {
        id: 'agri_c1',
        trigger: 'earnings',
        triggerValue: 25_000,
        message: 'Message via Amara: "Nnamdi asks: if the harvest failed tomorrow, what would you have built that lasts?" — Amara, for N.O.',
        source: 'Amara Mensah, Proxy for N. Osei',
        icon: '🌿',
      },
      {
        id: 'agri_c2',
        trigger: 'earnings',
        triggerValue: 10_000_000,
        message: 'Message via Amara: "Nnamdi asks: you\'ve grown large enough to forget where things come from. Have you?" — Amara, for N.O.',
        source: 'Amara Mensah, Proxy for N. Osei',
        icon: '🌿',
      },
      {
        id: 'agri_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Message via Amara: "Nnamdi says: you fallow the field between harvests. The next crop is always stronger for it. He\'s proud." — Amara, for N.O.',
        source: 'Amara Mensah, Proxy for N. Osei',
        icon: '🌿',
      },
    ],
  },

  // ---- FINANCE ---------------------------------------------------------------
  {
    id: 'finance',
    name: 'Helena Voss',
    title: 'Architect of the Invisible Hand',
    emoji: '📊',
    accent: '#06b6d4',
    status: 'Retired — visible only in market movements',
    hook: 'Built 3 financial instruments now standard practice globally. None bear her name. She insisted on anonymity until the transfer day.',
    originLines: [
      'Money is language, not power. The ones who treat it as power eventually say something incoherent with it.',
      'I built three instruments that are now used by every major institution in the world. They don\'t carry my name. I designed it that way. The idea matters; the attribution is noise.',
      'I left a ledger — not of transactions, but of decisions I regret. It is in the top drawer. It is uncomfortable reading. It is the most valuable thing I own.',
      'You inherited the portfolio. But the real inheritance is the ledger. Start there.',
    ],
    handoff: 'The positions are open. Read the regret ledger before you make your first move.',
    contacts: [
      {
        id: 'finance_c1',
        trigger: 'earnings',
        triggerValue: 500_000,
        message: 'From Voss Regret Ledger, Page 3: "The trade I\'m most proud of is the one I didn\'t make in 2011. Restraint is a position." — H.V.',
        source: 'Voss Regret Ledger',
        icon: '📒',
      },
      {
        id: 'finance_c2',
        trigger: 'earnings',
        triggerValue: 100_000_000,
        message: 'From Voss Regret Ledger, Page 12: "I spent fifteen years trying to make the market behave. Eventually I understood: the market doesn\'t behave. You position for that." — H.V.',
        source: 'Voss Regret Ledger',
        icon: '📒',
      },
      {
        id: 'finance_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'From Voss Regret Ledger, Page 18: "I liquidated everything once and started over. Best decision of my career. The second portfolio understood things the first one never could." — H.V.',
        source: 'Voss Regret Ledger',
        icon: '📒',
      },
    ],
  },

  // ---- REAL ESTATE -----------------------------------------------------------
  {
    id: 'realestate',
    name: 'Bertrand Okafor',
    title: 'The Man Who Built Cities',
    emoji: '🏙️',
    accent: '#f59e0b',
    status: 'Living, retired — walks construction sites unannounced',
    hook: 'Developed in 40 cities across 6 continents. Refused to develop in 12 others. The list of refusals is his proudest work.',
    originLines: [
      'Every building is a permanent mark on a place. You are deciding what that place becomes. That is not a business decision. It is an ethical one.',
      'I developed in 40 cities. The 12 cities I refused are in a file in the top cabinet. Read that file first. It explains the 40.',
      'I walk construction sites. I don\'t announce myself. I have already walked one of yours. I saw something I liked. That\'s why you\'re here.',
      'The portfolio includes properties that produce returns. It also includes properties that produce something else. Figure out which ones do what.',
    ],
    handoff: 'Build something worth the permanent mark it leaves.',
    contacts: [
      {
        id: 'realestate_c1',
        trigger: 'earnings',
        triggerValue: 250_000,
        message: 'From Okafor (site visit): "I walked your third property this morning. The foundation is correct. The surrounding community doesn\'t know what\'s coming. Tell them." — B.O.',
        source: 'Okafor Construction Notes',
        icon: '🏗️',
      },
      {
        id: 'realestate_c2',
        trigger: 'earnings',
        triggerValue: 25_000_000,
        message: 'From Okafor (site visit): "I\'ve seen three empires built in this city. Two of them forgot the city. They\'re both gone. The third is still here. Be the third." — B.O.',
        source: 'Okafor Construction Notes',
        icon: '🏗️',
      },
      {
        id: 'realestate_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'From Okafor (site visit): "You broke ground again. Good. The best developments always start with demolition. What did you clear? What did you keep?" — B.O.',
        source: 'Okafor Construction Notes',
        icon: '🏗️',
      },
    ],
  },

  // ---- ENTERTAINMENT ---------------------------------------------------------
  {
    id: 'entertainment',
    name: 'Marisol Ventura',
    title: 'The Studio That Never Sold',
    emoji: '🎬',
    accent: '#ec4899',
    status: 'Travelling — writing a memoir she says won\'t be published until she dies',
    hook: 'Turned down four studio acquisitions worth a combined $14B. Made more than that independently. Her final act was transferring to you.',
    originLines: [
      'Three of my films changed laws. Not because I intended to change laws. Because I told the truth, and the truth was intolerable in the existing legal framework.',
      'Four studios tried to buy me. I turned them all down. Not for the money. For the editorial independence. There is no version of your best work that someone else controls.',
      'I am writing a memoir. It will not be published while I am alive. I am sending you the chapters as I finish them. They are not about the business.',
      'The stories beneath the stories — that is what the chapters are about. Read them carefully. They will tell you what your rivals are actually after.',
    ],
    handoff: 'The cameras are yours. The first chapter arrives when you\'ve earned a story worth telling.',
    contacts: [
      {
        id: 'entertainment_c1',
        trigger: 'earnings',
        triggerValue: 500_000,
        message: 'Memoir Chapter 1 from Ventura: "The first film I made that mattered, I made for $40,000. The last studio film I made that mattered, I made for $40M. The budget doesn\'t determine the truth." — M.V.',
        source: 'Ventura Memoir, Chapter 1',
        icon: '🎞️',
      },
      {
        id: 'entertainment_c2',
        trigger: 'earnings',
        triggerValue: 100_000_000,
        message: 'Memoir Chapter 7 from Ventura: "The fourth acquisition offer — I nearly said yes. Then they asked for final cut approval. The moment they asked, I knew: they weren\'t buying my studio. They were buying my silence." — M.V.',
        source: 'Ventura Memoir, Chapter 7',
        icon: '🎞️',
      },
      {
        id: 'entertainment_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Memoir Chapter 11 from Ventura: "Every great director has a film they consider a failure. The director who has no failure is a liar or a coward. The reset was your necessary failure. Make the next one differently." — M.V.',
        source: 'Ventura Memoir, Chapter 11',
        icon: '🎞️',
      },
    ],
  },

  // ---- HOSPITALITY -----------------------------------------------------------
  {
    id: 'hospitality',
    name: 'Ryo Tanaka',
    title: 'The Host of Hosts',
    emoji: '🏨',
    accent: '#d946ef',
    status: 'Running a 12-room inn in Kyoto — by choice',
    hook: 'Built a hotel group on one principle: every guest should leave having been seen. 47 years, 200 properties, zero chain-standard rooms.',
    originLines: [
      'I stepped down when the company became too large for me to know every staff member\'s name. That was the condition I set for myself on the day I started.',
      'The will has one clause you cannot fulfill with money. I will not tell you what it is yet. You will find it. When you do, you will understand why I stepped down.',
      'Every guest arrives carrying a story. Every guest leaves making one. The space between is what I built. I hope you understand that before you change anything.',
      'I am at the inn in Kyoto if you need to understand something. Come in person. Leave your phone at the entrance.',
    ],
    handoff: 'The lobby is yours. The hardest clause in the will isn\'t financial. Find it.',
    contacts: [
      {
        id: 'hospitality_c1',
        trigger: 'earnings',
        triggerValue: 100_000,
        message: 'Letter from Tanaka (Kyoto): "I read that you have 12 properties now. Do you know the name of the person who makes the beds at the third one? You should." — R.T.',
        source: 'Tanaka Inn, Kyoto',
        icon: '🏯',
      },
      {
        id: 'hospitality_c2',
        trigger: 'earnings',
        triggerValue: 10_000_000,
        message: 'Letter from Tanaka (Kyoto): "Fifty properties now. A guest wrote to me — they stayed with you last month. They said they felt seen. You\'ve understood something important." — R.T.',
        source: 'Tanaka Inn, Kyoto',
        icon: '🏯',
      },
      {
        id: 'hospitality_c3',
        trigger: 'prestige',
        triggerValue: 1,
        message: 'Letter from Tanaka (Kyoto): "You closed and reopened. In hospitality we call this renovation. The question is always: what did you keep from the old property?" — R.T.',
        source: 'Tanaka Inn, Kyoto',
        icon: '🏯',
      },
    ],
  },
];

const MASTER_MAP = new Map<IndustryType, OldMasterConfig>(
  OLD_MASTERS.map((m) => [m.id, m])
);

export function getOldMaster(industry: IndustryType): OldMasterConfig | undefined {
  return MASTER_MAP.get(industry);
}

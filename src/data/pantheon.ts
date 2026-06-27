// ============================================================================
// Pantheon  -  the six legendary founders who own the global economy.
// These are original parody archetypes: fictional characters who rhyme with
// real-world icons in vibe and arc, but with invented names, invented quotes,
// and comic exaggeration.  Satire of billionaire culture.
// ============================================================================

export interface PantheonTitanConfig {
  id: string;
  name: string;
  title: string;
  archetype: string;
  domain: string;
  philosophy: string;
  emoji: string;
  /** Player lifetime earnings that make this titan "notice" them. */
  noticeThreshold: number;
  /** Starting estimated valuation (grows each tick). */
  startingValuation: number;
  /** Rival config ID if this titan enters the rival roster at TITAN echelon. */
  rivalId: string;
  /** What this titan says publicly when the player surpasses their valuation. */
  surpassedQuote: string;
  /** What they say when they "notice" the player for the first time. */
  noticesQuote: string;
  /** Activity headlines this titan periodically generates in the Ledger. */
  activityTemplates: Array<{ headline: string; body: string; section: 'pantheon' }>;
}

export const PANTHEON_CONFIGS: PantheonTitanConfig[] = [
  // ---- Rexx Solaris  -  The Accelerationist ---------------------------------
  // Archetype: rockets + EVs + social media provocateur.
  // Philosophy: accelerate everything to escape velocity.
  {
    id: 'rexx',
    name: 'Rexx Solaris',
    title: 'The Accelerationist',
    archetype: 'Tech / Space / Energy provocateur',
    domain: 'Orbital Industries, Solaris Motors, The Agora (social platform)',
    philosophy: '"Every industry runs too slow. I am the correction."',
    emoji: '🚀',
    noticeThreshold: 1_000_000_000,       // $1B
    startingValuation: 3_200_000_000_000, // $3.2T
    rivalId: 'rexx_titan',
    surpassedQuote: '"Finally, someone worth racing. Welcome to orbit."',
    noticesQuote: '"Interesting. You are growing at 47% CAGR. I have a spreadsheet for you."',
    activityTemplates: [
      {
        headline: 'Rexx Solaris Announces Orbital Mining Venture: "Mars is Phase One"',
        body: 'In a late-night post on The Agora, Rexx Solaris unveiled plans for asteroid mineral extraction, calling Earth\'s resources "a rounding error." Orbital Industries stock rose 18%.',
        section: 'pantheon',
      },
      {
        headline: 'Solaris Motors Unveils "Infinite Range" EV: Competitors Scramble',
        body: 'Solaris Motors announced its next-generation electric platform with a claimed 1,200-mile range and a $19,999 price point. Analysts are split between awe and skepticism. Rexx posted: "I told you in 2019. You didn\'t listen."',
        section: 'pantheon',
      },
      {
        headline: 'Rexx Solaris Buys Rival Social Network, Immediately Fires Its Management',
        body: '"The product was fine. The leadership was not," Solaris posted moments after the acquisition closed. The Agora\'s user base grew by 40M in 24 hours.',
        section: 'pantheon',
      },
      {
        headline: 'Solaris Foundation Pledges $50B to Mars Colonisation — "Earth is a Backup"',
        body: 'The Solaris Foundation has committed $50 billion to permanent off-world habitat. "Civilisation needs a second save file," Solaris explained at a conference held inside a rocket.',
        section: 'pantheon',
      },
      {
        headline: 'Rexx Solaris Tweets 47 Times in 6 Hours; Markets Respond Accordingly',
        body: 'A Saturday posting spree from Orbital Industries\' CEO moved three commodity markets, triggered two SEC inquiries, and temporarily crashed a meme-coin Solaris had mentioned "as a joke."',
        section: 'pantheon',
      },
    ],
  },

  // ---- Marcheline Cole  -  The Architect ------------------------------------
  // Archetype: everything-store logistics emperor, customer-obsessed.
  // Philosophy: obsession compounds; efficiency is the only moat.
  {
    id: 'marcheline',
    name: 'Marcheline Cole',
    title: 'The Architect',
    archetype: 'Logistics / Cloud / Everything-store operator',
    domain: 'OmniMarch (e-commerce), CloudArch (infrastructure), MarchPrime (delivery)',
    philosophy: '"Every inefficiency is a business I haven\'t built yet."',
    emoji: '📦',
    noticeThreshold: 5_000_000_000,       // $5B
    startingValuation: 2_800_000_000_000, // $2.8T
    rivalId: 'marcheline_titan',
    surpassedQuote: '"I see you have reached my 2019 valuation. Interesting start."',
    noticesQuote: '"Your logistics cost-per-unit is 23% above optimal. I have thoughts."',
    activityTemplates: [
      {
        headline: 'OmniMarch Acquires Regional Grocery Chain: "Day One Strategy Continues"',
        body: 'In a move analysts called "inevitable in retrospect," OmniMarch has absorbed FreshCo Supermarkets. "Customer obsession doesn\'t stop at the digital-physical border," Cole said in a memo.',
        section: 'pantheon',
      },
      {
        headline: 'Marcheline Cole\'s Annual Founder Letter: "We Have Not Yet Begun to Build"',
        body: 'The 47-page annual letter from Cole outlines a 30-year roadmap for OmniMarch, describing the current business as "a prototype." It has been downloaded 8 million times in 6 hours.',
        section: 'pantheon',
      },
      {
        headline: 'CloudArch Launches "Infinite Compute": Competitors Have 90 Days to Respond',
        body: 'CloudArch\'s new serverless platform dramatically undercuts every rival on price. CTO statement: "We will take the margin hit. We always take the margin hit. And then we win."',
        section: 'pantheon',
      },
      {
        headline: 'MarchPrime Now Offers 15-Minute Delivery in 200 Cities',
        body: 'The drone-and-ground hybrid network OmniMarch has built over a decade is now operational across North America and Europe. Retail analysts estimate it will make physical storefronts uneconomical within a decade.',
        section: 'pantheon',
      },
      {
        headline: 'Marcheline Cole Steps Back from OmniMarch CEO Role to Focus on "Blue Origin 2.0"',
        body: 'Cole has announced she is transitioning to Executive Chair while launching Ark, a multi-generational space habitat project. "The Earth business is in good hands. I am optimising for something longer-term."',
        section: 'pantheon',
      },
    ],
  },

  // ---- Zander Pryce  -  The Social Architect --------------------------------
  // Archetype: social network founder, connection-as-control.
  // Philosophy: every human you connect through me is a node I own.
  {
    id: 'zander',
    name: 'Zander Pryce',
    title: 'The Social Architect',
    archetype: 'Social media / AR / Metaverse strategist',
    domain: 'Nexus (social network), PrymeSense (AR platform), ZPrice (payments)',
    philosophy: '"Connection is the product. You are the content. I am the infrastructure."',
    emoji: '🌐',
    noticeThreshold: 2_000_000_000,       // $2B
    startingValuation: 1_600_000_000_000, // $1.6T
    rivalId: 'zander_titan',
    surpassedQuote: '"Fascinating. You have reached my engagement threshold. Let\'s connect."',
    noticesQuote: '"I have run the model. You will plateau at $400B unless you acquire distribution. I can help."',
    activityTemplates: [
      {
        headline: 'Nexus Surpasses 5 Billion Users: "We Connect Half the World"',
        body: '"Every person on Nexus is part of a graph I can query at any time," Pryce told developers at the annual Nexus Connect conference. Privacy advocates called it "a confession." Pryce called it "transparency."',
        section: 'pantheon',
      },
      {
        headline: 'Zander Pryce Unveils PrymeSense AR Glasses: "Reality is the Last Product We\'ll Launch"',
        body: 'The PrymeSense headset, priced at $499, overlays Nexus social data onto physical environments. Pryce says adoption will reach 1 billion users by 2030. The glasses\' terms of service are 212 pages.',
        section: 'pantheon',
      },
      {
        headline: 'ZPrice Payments Now Accepted in 180 Countries: "I Wanted to Own Transactions"',
        body: 'Zander Pryce\'s payment platform has displaced traditional banking for tens of millions of users. "Money is just another form of social data," Pryce explained in an Agora post that Rexx Solaris liked.',
        section: 'pantheon',
      },
      {
        headline: 'Nexus Acquires VR Startup for $12B: Pryce Says "Physical Reality is a Bandwidth Problem"',
        body: 'The acquisition of VirtuSphere accelerates Nexus\'s metaverse push. Pryce demonstrated the integration at a press conference conducted entirely in virtual reality, which 80,000 people attended while physically alone.',
        section: 'pantheon',
      },
      {
        headline: 'Zander Pryce Testifies Before Congress Again: 47th Appearance in 12 Years',
        body: '"With respect, Senator, Nexus is a platform, not a publisher." Pryce has now delivered a variation of this sentence 47 times before 14 different legislative bodies. He has survived all of them.',
        section: 'pantheon',
      },
    ],
  },

  // ---- Benton Crowe  -  The Oracle ------------------------------------------
  // Archetype: value-investing sage, folksy midwestern wisdom, legendary patience.
  // Philosophy: price is what you pay, value is what you get.
  {
    id: 'benton',
    name: 'Benton Crowe',
    title: 'The Oracle',
    archetype: 'Value investor / Holding company patriarch',
    domain: 'Crowe Consolidated Holdings, Midland Insurance, CroweBank',
    philosophy: '"I have been called boring. Boring compounds at 22% annually."',
    emoji: '🪙',
    noticeThreshold: 500_000_000,         // $500M
    startingValuation: 900_000_000_000,   // $900B
    rivalId: 'benton_titan',
    surpassedQuote: '"Son, I have been surpassed before. Give me twenty years."',
    noticesQuote: '"I read your balance sheet. You have more discipline than I expected at your stage."',
    activityTemplates: [
      {
        headline: 'Benton Crowe\'s Annual Letter: "We Made a Mistake in Q3. Here is What I Learned."',
        body: 'The 18-page letter from Crowe Consolidated Holdings is the most-anticipated financial document of the year. This year, Crowe disclosed a $4B error, explained it calmly, and described how the board responded. CCH stock rose 9%.',
        section: 'pantheon',
      },
      {
        headline: 'Crowe Acquires Regional Rail Operator: "I Like Businesses Nobody Else Wants"',
        body: 'Crowe Consolidated has purchased MidWest Rail in a cash deal. "Trains move slowly," Crowe said at a press event. "So does compounding. I am comfortable with both."',
        section: 'pantheon',
      },
      {
        headline: 'Benton Crowe Declines to Comment on AI: "I Invest in Things I Understand"',
        body: 'Asked at the Crowe Annual Meeting about artificial intelligence, Benton Crowe paused for 11 seconds, then said: "I understand insurance, rail, and consumer staples. I do not yet understand the rest." He has since bought a 6% stake in a AI chip maker.',
        section: 'pantheon',
      },
      {
        headline: 'Crowe Foundation Donates $20B: "I Signed the Pledge. I Intend to Keep It."',
        body: 'The Crowe Foundation has transferred $20 billion to its charitable endowment, funding global health, education, and climate research. "Money is a tool," Crowe said. "I have used mine. Now I will let others use it."',
        section: 'pantheon',
      },
      {
        headline: '"Still Drinking Cherry Fiz": Benton Crowe\'s Breakfast Unchanged for 62 Years',
        body: 'A rare profile in The Weekly revealed Crowe\'s unchanged routine: oatmeal, Cherry Fiz, and an hour of newspaper reading. "I do not optimise my breakfast. I optimise my portfolio. It is a choice." CCH closed up 3% on the news.',
        section: 'pantheon',
      },
    ],
  },

  // ---- Elara Montclair  -  La Impératrice -----------------------------------
  // Archetype: luxury empire magnate, fashion/art/champagne/cognac curator.
  // Philosophy: desire is manufactured; scarcity is curated; prestige is the product.
  {
    id: 'elara',
    name: 'Elara Montclair',
    title: 'La Impératrice',
    archetype: 'Luxury conglomerate empress',
    domain: 'Maison Montclair (fashion/leather), Cuvée Elara (champagne), Lumière Group (art/auction)',
    philosophy: '"I do not sell products. I manufacture desire."',
    emoji: '👑',
    noticeThreshold: 3_000_000_000,       // $3B
    startingValuation: 1_200_000_000_000, // $1.2T
    rivalId: 'elara_titan',
    surpassedQuote: '"Charmant. You have bought your way into a room I built. Welcome."',
    noticesQuote: '"Your brand has potential. It needs patience. Prestige is decades, not quarters."',
    activityTemplates: [
      {
        headline: 'Elara Montclair Acquires 200-Year-Old British Tailor: "Heritage Is Not Dead"',
        body: 'Maison Montclair has absorbed Harcastle & Sons of London, the tailor to five generations of the English aristocracy. Montclair: "We are not buying a shop. We are buying a century of trust."',
        section: 'pantheon',
      },
      {
        headline: 'Lumière Group Auction Breaks Record: Single Canvas Sells for $340M',
        body: 'A previously unknown Vermeer authenticated last year sold at Lumière Group\'s Paris auction for $340 million, the highest price ever paid for a painting. Montclair attended in a hat that took two years to make.',
        section: 'pantheon',
      },
      {
        headline: 'Cuvée Elara Announces "Ten Year Harvest": Only 300 Bottles, No Resale',
        body: 'The rarest champagne house in the Maison portfolio will release 300 bottles of its decade-vintage, each priced at $22,000, with clauses preventing resale at profit. "Luxury is only luxury when it is not a commodity," Montclair said.',
        section: 'pantheon',
      },
      {
        headline: 'Elara Montclair Rejects Merger Offer: "My Family Built This in 1843. It Will Not Be a Line Item."',
        body: 'An $80B acquisition approach from a private equity consortium was declined in a one-sentence letter from Montclair\'s office. The letter has since been framed and sold as an NFT for $2M, proceeds to arts education.',
        section: 'pantheon',
      },
      {
        headline: 'Maison Montclair Opens First Store in Tier-3 City: "Desire Has No Geography"',
        body: 'In a strategic expansion, Maison Montclair has opened boutiques in 12 emerging-market cities previously considered outside its demographic. "Aspiration travels further than a private jet," Montclair said at the ribbon-cutting.',
        section: 'pantheon',
      },
    ],
  },

  // ---- Cassius Thorn  -  The Disruptor --------------------------------------
  // Archetype: serial acquirer, private equity roll-up, empire by spreadsheet.
  // Philosophy: every industry has inefficiency — I harvest it.
  {
    id: 'cassius',
    name: 'Cassius Thorn',
    title: 'The Disruptor',
    archetype: 'Private equity / Media / Healthcare acquirer',
    domain: 'Thorn Capital (PE), TridentMedia (streaming/news), Apex Health (hospitals/pharma)',
    philosophy: '"Sentiment is for founders. I deal in multiples."',
    emoji: '⚔️',
    noticeThreshold: 4_000_000_000,       // $4B
    startingValuation: 780_000_000_000,   // $780B
    rivalId: 'cassius_titan',
    surpassedQuote: '"I have already modelled your exit scenarios. All of them."',
    noticesQuote: '"Your margin profile is not yet interesting. Come back at $10B EBITDA."',
    activityTemplates: [
      {
        headline: 'Thorn Capital Acquires Hospital Chain: "Healthcare is the Last Inefficient Market"',
        body: 'Apex Health has added 47 regional hospitals to its portfolio in a leveraged buyout. Cassius Thorn: "These facilities had 12% EBITDA margins. We are targeting 34% within 36 months." Medical staff unions have filed three lawsuits.',
        section: 'pantheon',
      },
      {
        headline: 'TridentMedia Buys Struggling Newspaper: Staff Halved, Paywall Tripled',
        body: 'The 130-year-old Herald-Tribune is now TridentMedia property. Thorn\'s memo to editors was three sentences: "We are a business. Run it like one. The mission is profitable survival."',
        section: 'pantheon',
      },
      {
        headline: 'Cassius Thorn Acquires Rival PE Firm: "Consolidation Is the Only Strategy at Scale"',
        body: 'In a move described as "eating the competition," Thorn Capital has absorbed Pinnacle Partners, adding $240B in assets under management. The combined entity now controls positions in 6,000 companies across 80 industries.',
        section: 'pantheon',
      },
      {
        headline: 'Thorn Capital Launches "Project Harvest": 200 Target Acquisitions in 24 Months',
        body: 'An internal strategy document leaked to TridentMedia (which Thorn owns) reveals a plan to acquire 200 mid-market businesses across healthcare, logistics, and media. Regulators are meeting. Thorn\'s lawyers are meeting more.',
        section: 'pantheon',
      },
      {
        headline: 'Cassius Thorn Declines Interview: "I Communicate Through Returns"',
        body: 'After a decade of no press appearances, Thorn turned down a 60 Minutes profile with one line: "I communicate through returns." Thorn Capital returned 31% to LPs last year. Journalists have noted this is, in fact, communication.',
        section: 'pantheon',
      },
    ],
  },
];

export function getPantheonConfig(id: string): PantheonTitanConfig | undefined {
  return PANTHEON_CONFIGS.find((t) => t.id === id);
}

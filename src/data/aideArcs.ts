// ============================================================================
// Aide development arc data  -  Session B.
//
// Each aide has 4 stages: 0 (new), 1 (warming), 2 (bonded), 3 (legacy).
// Stage advances when loyalty crosses a threshold for the first time.
// Each advance fires an ambient feed message revealing character depth.
//
// Stage 3 (legacy) fires when loyalty = 100 AND arcStage was 2.
// ============================================================================

export interface AideArcStage {
  stage: 0 | 1 | 2 | 3;
  loyaltyThreshold: number;
  title: string;
  ambientLine: string;
  personality: string;
}

export interface AideArcConfig {
  id: string;
  name: string;
  stages: AideArcStage[];
  /** The signature moment that fires mid-arc (at stage 2). A unique in-game event. */
  signatureEvent: {
    title: string;
    body: string;
    effect: string;
  };
}

export const AIDE_ARCS: AideArcConfig[] = [
  // -------------------------------------------------- MARCUS
  {
    id: 'marcus',
    name: 'Marcus Chen',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The Formal Arrangement',
        ambientLine: 'Marcus reviews your contracts in silence. He marks three clauses you didn\'t know were problems. He says nothing. The margins he saves speak for him.',
        personality: 'Observant. Economical. Does not perform competence.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The First Argument',
        ambientLine: 'Marcus pushes back on a decision for the first time. Hard. You realize he\'s been watching and cataloging since day one. You realize he was right about all of it.',
        personality: 'Principled. Willing to be unpopular. Loyalty was never personal - it was earned.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Quiet Partnership',
        ambientLine: '"The Old Master asked me once what I thought about you," Marcus says between briefs. "I told him you were either the most dangerous kind of person or the most useful kind. He said those were the same person." He goes back to work.',
        personality: 'Trusts you enough to say the uncomfortable thing.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Legacy Brief',
        ambientLine: 'Marcus leaves a folder on your desk. It contains every legal move the Old Master ever made - annotated in his hand, with a note: "He wanted you to have this when you were ready. I decided you were ready." It is the most valuable document in the empire.',
        personality: 'Full commitment. The defense fortresses are personal now.',
      },
    ],
    signatureEvent: {
      title: 'The Fortress Holds',
      body: 'A rival files a regulatory complaint designed to freeze your operations for 30 days. Marcus is in the hearing before you\'re awake. He finds a procedural flaw in the filing - one the rival\'s legal team missed - and has the complaint dismissed in 4 hours. The rival\'s counsel calls it unprecedented. Marcus calls it Tuesday.',
      effect: 'All active rival pressures cleared. +1 defense charge. Ethics +5.',
    },
  },

  // -------------------------------------------------- LAYLA
  {
    id: 'layla',
    name: 'Layla Hassan',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The Audit',
        ambientLine: 'Layla spends three days reading everything you\'ve ever said publicly. She presents a document: "Your Narrative Gap." It is twelve pages. Three of them are uncomfortable.',
        personality: 'Sees through the story to the structure beneath.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The Craft',
        ambientLine: 'Layla rewrites a press release you\'d spent a week on. She does it in twenty minutes. It says the same thing and somehow says more. You stop writing your own press releases.',
        personality: 'Generous with her skill. Impatient with pretense.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Witness',
        ambientLine: '"I\'ve worked with people who built things and people who told stories about things," Layla says. "You\'re the first person I\'ve met who understands those aren\'t separate jobs." She says it like a warning and a compliment at the same time.',
        personality: 'Begins to invest personally. The story is no longer just professional.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Definitive Record',
        ambientLine: 'Layla tells you she\'s been working on a second project alongside yours - a full record of this run, every milestone, every decision. Not for press. "For the archive. For whoever comes after." She\'s been documenting since day one.',
        personality: 'Stakes her own legacy on yours.',
      },
    ],
    signatureEvent: {
      title: 'The Narrative Inversion',
      body: 'A coordinated smear campaign drops three negative Ledger stories in one cycle - a rival play designed to suppress your market confidence. Layla is on the phone within minutes. By morning she\'s placed two investigative pieces about the sources of those stories. The smear becomes the story. The Ledger\'s front page now reads: "Who Is Behind the Campaign Against [Your Company]?"',
      effect: 'All negative Ledger items suppressed. Ethics +10. Rival aggression reset to zero.',
    },
  },

  // -------------------------------------------------- YUKI
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The Restructure',
        ambientLine: 'Yuki maps your entire cash flow in 48 hours and finds two structural inefficiencies you\'d never noticed. She fixes both silently. The compound buffer begins accumulating. You don\'t know it yet.',
        personality: 'Does the work before the conversation. Always.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The Leverage',
        ambientLine: '"Everyone thinks finance is about money," Yuki says, looking at a model she\'s built. "It\'s about time. Money is just a way of moving time from places that don\'t use it to places that do." She shows you the buffer. You hadn\'t seen how large it had grown.',
        personality: 'Teaches by showing the mechanism, not the principle.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Confidence',
        ambientLine: 'Yuki presents a 10-year capital allocation model. She\'s done it on her own time. "This isn\'t a pitch," she says. "This is what I think you\'re building." The model is more ambitious than your own plans. It\'s also probably correct.',
        personality: 'Begins to plan beyond her mandate. Fully committed.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Full Architecture',
        ambientLine: 'Yuki restructures the entire cost model - one-time, overnight, without being asked. In the morning she leaves a note: "Your margins are now 11% healthier. The compound buffer accelerates at 1.5× from here. Don\'t thank me. Just deploy it well." (Permanent: cost reduction deepens to 10%.)',
        personality: 'The full architecture is yours. She is its keeper.',
      },
    ],
    signatureEvent: {
      title: 'The Capital Event',
      body: 'A liquidity crunch threatens to stall three major facility upgrades. Yuki doesn\'t ask for approval. She structures a bridge using the accumulated compound buffer, unlocks all three upgrades in a single transaction, and has the buffer replenished within two hours through a sequence of marginal reinvestments you couldn\'t have planned. When you look at the ledger afterward, it\'s as if nothing happened - except the upgrades are complete.',
      effect: 'Full compound buffer released. All pending facility upgrades discounted 30%. Buffer begins refilling immediately.',
    },
  },

  // -------------------------------------------------- DEV
  {
    id: 'dev',
    name: 'Dev Patel',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The Experiment',
        ambientLine: 'Dev installs something in your systems without explaining what it is. Three days later production tick rate increases by a marginal but measurable amount. He sends a message: "Baseline established. Now we see what happens when you grow faster."',
        personality: 'Communicates in results, not words.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The Velocity Lecture',
        ambientLine: '"Most people optimize for the number," Dev says, standing at a whiteboard at 2am covering it in velocity curves. "The number is the output. The velocity is the variable. Push the velocity and the number follows. Optimize the number and you plateau." He turns around, looks at you, looks back at the board. "You\'re scaling. Don\'t stop."',
        personality: 'Passionate about the mechanic, not the outcome.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Confidence Transfer',
        ambientLine: 'Dev sits across from you for the first time without a laptop. "I\'ve worked for people who were afraid of growth," he says. "They\'d plateau on purpose because they didn\'t know what came next. You don\'t do that." He\'s not complimenting you. He\'s telling you something he observed and found surprising. That makes it more meaningful.',
        personality: 'Respect arrived slowly. Once it arrived, it stayed.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Infinite Loop',
        ambientLine: 'Dev patches the acceleration loop itself - the mechanic that governs his own bonus. "I found an inefficiency in my own system," he says. "Fixed it." The velocity ceiling is higher now. He goes back to his screen without waiting for a reaction.',
        personality: 'The loop is self-improving now. So is he.',
      },
    ],
    signatureEvent: {
      title: 'The 72-Hour Sprint',
      body: 'Dev disappears for 72 hours. No messages, no status updates. Then the Code Sprint cooldown resets to zero. He sends two words: "Ship it." The sprint ability is available immediately and its multiplier is 4× for the next deployment. He never explains what he built. You never ask.',
      effect: 'Code Sprint immediately available. Next Deploy multiplier: 4×. Velocity ceiling raised permanently by 20%.',
    },
  },

  // -------------------------------------------------- SOFIA
  {
    id: 'sofia',
    name: 'Sofia Reyes',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The Inventory',
        ambientLine: 'Sofia spends day one mapping every point of failure in your logistics chain. By day three she has a ranked list of 23 vulnerabilities. She solves the top 7 before presenting the list. "The rest are acceptable risk," she says. "For now."',
        personality: 'Pragmatic. Solves before reporting. Never dramatic about problems she can fix.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The Steady Hand',
        ambientLine: 'A supply shock hits. Costs spike 40% across three tiers. Sofia had pre-positioned inventory two weeks ago - you\'d approved the spend without understanding why. The resilience buffer absorbed the spike before you knew it was coming. "You approved it," she says when you thank her. "That\'s the whole job."',
        personality: 'Lets you get credit. Doesn\'t need it herself.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Deeper Current',
        ambientLine: '"The Old Master once said logistics is the most honest department," Sofia says. "You can\'t fake a shipment. Either it arrives or it doesn\'t. I like that." She looks at the buffer metrics. "You\'ve never had to worry about the foundation because I\'ve been holding it. I want you to know that."',
        personality: 'Names the thing she\'s been doing quietly. Not to demand recognition - to establish trust.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Unbreakable Current',
        ambientLine: 'Sofia hands you a report: the resilience buffer is now self-replenishing at 1.5× rate. She redesigned the accumulation model. "No system should have a single point of failure," she says. "Including the buffer itself." The operations beneath your empire are now genuinely unbreakable.',
        personality: 'Committed to permanence, not just stability.',
      },
    ],
    signatureEvent: {
      title: 'The Crisis That Wasn\'t',
      body: 'A cascade of rival attacks lands simultaneously - three pressures in one cycle, designed to overwhelm. Sofia is already moving. The resilience buffer absorbs the first wave. She\'s rerouted two supply lines before the second. By the third, she\'s got a counter-supply agreement with a neutral faction that neutralizes the pressure entirely. In your production log, the incident shows as a 2% dip followed by a recovery. It should have been a 40% crater.',
      effect: 'All rival pressures cleared. Resilience buffer refilled to maximum. Rival aggression decay rate doubled for 5 minutes.',
    },
  },

  // -------------------------------------------------- ADE
  {
    id: 'ade',
    name: 'Ade Okafor',
    stages: [
      {
        stage: 0,
        loyaltyThreshold: 0,
        title: 'The First Look',
        ambientLine: 'Ade walks your facilities on his first day and says nothing. That evening he submits a brief: "Your people work hard. They don\'t feel seen. That gap between effort and recognition is costing you 15% production. I can close it." He can.',
        personality: 'Sees people first. Numbers second. Never wrong about either.',
      },
      {
        stage: 1,
        loyaltyThreshold: 40,
        title: 'The Shift',
        ambientLine: 'Workforce morale charts begin moving differently. Not because processes changed - because Ade changed the language around the work. The same tasks, the same pay, the same hours. Entirely different morale. You ask him what he did. "I told the true story of what they\'re building," he says. "People work harder when they know the story."',
        personality: 'The work is invisible on purpose. The results aren\'t.',
      },
      {
        stage: 2,
        loyaltyThreshold: 70,
        title: 'The Bond',
        ambientLine: '"I make things for other people," Ade says, between two projects that have nothing to do with production. "I always have. But making something for a company that might actually last - that\'s different. That\'s a longer story." He pauses. "I\'m in it now. The whole arc."',
        personality: 'Invested in the narrative as a personal stake, not a professional one.',
      },
      {
        stage: 3,
        loyaltyThreshold: 90,
        title: 'The Living Story',
        ambientLine: 'Ade creates something unprompted: a short film about your company, its workers, and what it\'s becoming. He screens it at an all-hands. The room is silent for thirty seconds after it ends. Workforce morale hits 100 for the first time. The culture multiplier peaks. This was not a strategy. This was Ade being Ade - and the numbers follow.',
        personality: 'The multiplier is maximum. The culture is alive.',
      },
    ],
    signatureEvent: {
      title: 'The Moment That Travels',
      body: 'A story Ade tells about one of your workers goes viral externally - not as a PR campaign, just as a piece of human truth that resonates. New talent starts applying. Existing workers who\'d been lukewarm become vocal advocates. The morale chart doesn\'t spike - it climbs steadily for three days and doesn\'t come back down. Ade reads the numbers and nods once.',
      effect: 'All workforce morale raised to 90. Culture multiplier bonus increased permanently by 15%. New worker event pool unlocked.',
    },
  },
];

export function getAideArc(id: string): AideArcConfig | undefined {
  return AIDE_ARCS.find((a) => a.id === id);
}

export function getAideArcStage(id: string, stage: number): AideArcStage | undefined {
  return getAideArc(id)?.stages.find((s) => s.stage === stage);
}

/** Returns the next arc stage for an aide given current loyalty. */
export function getNextArcStage(
  currentStage: number,
  loyalty: number,
  arc: AideArcConfig
): number {
  const next = arc.stages.find(
    (s) => s.stage > currentStage && loyalty >= s.loyaltyThreshold
  );
  return next ? next.stage : currentStage;
}

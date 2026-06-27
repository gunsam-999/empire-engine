// ============================================================================
// Empire Engine  -  narrative arc. STORY_BEATS drives the campaign that plays out
// over the whole prestige loop. Five acts, 4+ beats each, threaded with choices
// that move the `ethics` axis and unlock the three Act-5 endings.
//
// Cast:
//   mentor      -  Dossier, the retiring legend who founded the original Engine.
//   rival       -  Cassara Voss, hungrier than you, plays to win at any cost.
//   partner     -  Theo, your co-founder; loyal, conscience of the company.
//   consortium  -  The Quorum, a faceless shadow cartel that owns the markets.
//   narrator    -  the world commenting on your rise.
//   player      -  your own voice at the hinges of the story.
//
// Triggers fire once when their condition is met (see TICK in the reducer):
//   start | earnings(value) | tier(value 2..5) | prestige(value 1..3)
//   research | advisor
// ============================================================================

import type { StoryBeat } from '../game/types';

export const STORY_BEATS: StoryBeat[] = [
  // ==========================================================================
  // ACT I  -  THE FOUNDING. A garage, a debt, and one believer.
  // ==========================================================================
  {
    id: 'a1c1_open',
    act: 1,
    chapter: 1,
    title: 'The First Light',
    trigger: { type: 'start' },
    speaker: 'mentor',
    lines: [
      'So. You actually signed the lease.',
      'Everyone told you the market was closed. They were right  -  for them.',
      'I built my empire on a desk smaller than this one. Then I burned it down.',
      'Build yours so it can survive me being wrong about you.',
    ],
    reward: { cash: 100 },
    dramatic: true,
  },
  {
    id: 'a1c2_partner',
    act: 1,
    chapter: 2,
    title: 'Someone Who Stays',
    trigger: { type: 'earnings', value: 1e3 },
    speaker: 'partner',
    lines: [
      'I quit the safe job this morning. Didn’t tell my mother yet.',
      'I’m Theo. I do the parts you hate so you can do the part you love.',
      'We split it down the middle and we keep our hands clean. Deal?',
    ],
    choice: {
      prompt: 'Theo wants the founding handshake on the record. What do you promise?',
      options: [
        {
          text: 'Down the middle, clean hands. Always.',
          ethicsShift: 8,
          reward: { influence: 25 },
        },
        {
          text: 'We split it when there’s something worth splitting.',
          ethicsShift: -4,
          reward: { cash: 600 },
        },
      ],
    },
  },
  {
    id: 'a1c3_rival',
    act: 1,
    chapter: 3,
    title: 'The Knock at the Door',
    trigger: { type: 'earnings', value: 1e4 },
    speaker: 'rival',
    lines: [
      'Cute operation. I drove past twice to be sure it was real.',
      'I’m Cassara. I eat startups like yours between meetings.',
      'Sell to me now and you walk away rich. Wait, and you walk away.',
    ],
    choice: {
      prompt: 'Cassara slides a buyout offer across the table.',
      options: [
        {
          text: 'Tear it up. We’re not for sale.',
          ethicsShift: 3,
          reward: { boost: { mult: 2, seconds: 60 } },
        },
        {
          text: 'Take the cash. Outlast her later.',
          ethicsShift: -6,
          reward: { cash: 5000 },
        },
      ],
    },
  },
  {
    id: 'a1c4_firsttier',
    act: 1,
    chapter: 4,
    title: 'Scaling Past the Garage',
    trigger: { type: 'tier', value: 2 },
    speaker: 'mentor',
    lines: [
      'You’ve outgrown the bench. Good. Most never do.',
      'Tier two is where ego kills founders  -  they spend on mirrors, not engines.',
      'Feed the line. Always feed the line.',
    ],
    reward: { insight: 10 },
  },
  {
    id: 'a1c5_close',
    act: 1,
    chapter: 5,
    title: 'A Name in the Trade',
    trigger: { type: 'earnings', value: 1e5 },
    speaker: 'narrator',
    lines: [
      'Word travels. The suppliers stop asking for deposits up front.',
      'A magazine spells your company name right for the first time.',
      'Somewhere, a spreadsheet you’ll never see adds you to a list of threats.',
    ],
    reward: { influence: 40 },
  },

  // ==========================================================================
  // ACT II  -  THE CLIMB. Growth has a price, and someone is keeping the tab.
  // ==========================================================================
  {
    id: 'a2c1_research',
    act: 2,
    chapter: 1,
    title: 'The Lab Pays Off',
    trigger: { type: 'research' },
    speaker: 'partner',
    lines: [
      'It works. The thing on the whiteboard  -  it actually works.',
      'We could open-source it. Help everyone in the trade come up with us.',
      'Or we patent-wall it and the whole sector pays our rent.',
    ],
    choice: {
      prompt: 'Theo holds the breakthrough in his hands, waiting.',
      options: [
        {
          text: 'Give it away. A rising tide.',
          ethicsShift: 9,
          reward: { influence: 80 },
        },
        {
          text: 'Wall it off. Let them pay.',
          ethicsShift: -7,
          reward: { cash: 25000, insight: 30 },
        },
      ],
    },
  },
  {
    id: 'a2c2_quorum',
    act: 2,
    chapter: 2,
    title: 'An Invitation You Didn’t Request',
    trigger: { type: 'earnings', value: 1e6 },
    speaker: 'consortium',
    lines: [
      'We are the Quorum. You will not find us in any registry.',
      'We do not own companies. We own the weather they sail in.',
      'You have grown loud enough for us to notice. That is a privilege.',
      'And a warning.',
    ],
    reward: { insight: 25 },
    dramatic: true,
  },
  {
    id: 'a2c3_rivalwar',
    act: 2,
    chapter: 3,
    title: 'The Price War',
    trigger: { type: 'earnings', value: 1e7 },
    speaker: 'rival',
    lines: [
      'You said no. So now we do this the expensive way.',
      'I’m selling below cost in every market you touch.',
      'I have deeper pockets and shallower morals. Bleed with me.',
    ],
    choice: {
      prompt: 'Cassara starts a war of attrition. How do you fight?',
      options: [
        {
          text: 'Undercut her and protect our people.',
          ethicsShift: 5,
          reward: { boost: { mult: 3, seconds: 90 } },
        },
        {
          text: 'Poach her staff and leak her numbers.',
          ethicsShift: -9,
          reward: { cash: 150000 },
        },
      ],
    },
  },
  {
    id: 'a2c4_tier3',
    act: 2,
    chapter: 4,
    title: 'Industrial Scale',
    trigger: { type: 'tier', value: 3 },
    speaker: 'narrator',
    lines: [
      'The plant runs through the night now, a constellation of windows.',
      'You stopped knowing every employee’s name around the four hundredth.',
      'The machine you built has started to build itself.',
    ],
    reward: { insight: 50 },
  },
  {
    id: 'a2c5_mentorwarn',
    act: 2,
    chapter: 5,
    title: 'The Mentor’s Confession',
    trigger: { type: 'advisor' },
    speaker: 'mentor',
    lines: [
      'You’re surrounding yourself with sharp people. Smart.',
      'I did too. Then one of them sold my secrets to the Quorum.',
      'I never learned which one. That’s the part that ruins you.',
      'Trust them. Verify everything. Sleep less.',
    ],
    reward: { influence: 60 },
  },

  // ==========================================================================
  // ACT III  -  THE RECKONING. The first empire falls so a bigger one can rise.
  // ==========================================================================
  {
    id: 'a3c1_prestige',
    act: 3,
    chapter: 1,
    title: 'Burn It Down',
    trigger: { type: 'prestige', value: 1 },
    speaker: 'player',
    lines: [
      'Everything I built. Folded into a single number called Legacy.',
      'Dossier warned me this day would come  -  the day I outgrow my own foundations.',
      'So I dissolve the company to found a better one. Same name. Sharper teeth.',
    ],
    reward: { insight: 100 },
    dramatic: true,
  },
  {
    id: 'a3c2_partnerdoubt',
    act: 3,
    chapter: 2,
    title: 'The Co-Founder’s Line',
    trigger: { type: 'earnings', value: 1e9 },
    speaker: 'partner',
    lines: [
      'Every time we reset, we keep the money and shed the people.',
      'I counted. Three thousand jobs, gone, so a multiplier ticks up.',
      'Tell me there’s a version of this where we’re still the good guys.',
    ],
    choice: {
      prompt: 'Theo needs an answer he can live with.',
      options: [
        {
          text: 'Fund every laid-off worker for a year.',
          ethicsShift: 10,
          reward: { influence: 200 },
        },
        {
          text: 'Growth doesn’t apologize. Neither do we.',
          ethicsShift: -8,
          reward: { cash: 2e6 },
        },
        {
          text: 'Say nothing. Let him draw his own conclusion.',
          ethicsShift: -3,
          reward: { insight: 80 },
        },
      ],
    },
  },
  {
    id: 'a3c3_quorumdeal',
    act: 3,
    chapter: 3,
    title: 'A Seat at the Table',
    trigger: { type: 'earnings', value: 1e10 },
    speaker: 'consortium',
    lines: [
      'You have survived longer than we predicted. We dislike being wrong.',
      'So we offer the only thing we have never offered an outsider: a chair.',
      'Join the Quorum. Help us set the weather. Or remain a forecast we ignore.',
    ],
    choice: {
      prompt: 'The Quorum extends a hand made of every market on Earth.',
      options: [
        {
          text: 'Refuse. No one should own the weather.',
          ethicsShift: 10,
          reward: { boost: { mult: 4, seconds: 120 } },
        },
        {
          text: 'Accept. Better at the table than on the menu.',
          ethicsShift: -10,
          reward: { cash: 5e7, influence: 300 },
        },
      ],
    },
  },
  {
    id: 'a3c4_rivalfall',
    act: 3,
    chapter: 4,
    title: 'Cassara, at the End of It',
    trigger: { type: 'tier', value: 4 },
    speaker: 'rival',
    lines: [
      'You won. I’m liquidating Monday. Funny  -  I’m almost relieved.',
      'I spent thirty years certain that ruthless was the same as smart.',
      'You were ruthless and something else. I never figured out what.',
      'Don’t let them turn the something else off.',
    ],
    reward: { influence: 150 },
  },
  {
    id: 'a3c5_mentorgone',
    act: 3,
    chapter: 5,
    title: 'The Old Lion Sleeps',
    trigger: { type: 'prestige', value: 2 },
    speaker: 'narrator',
    lines: [
      'Dossier died on a Tuesday with the markets up half a point.',
      'The will left you nothing but a sealed note: “You’re the empire now.”',
      'No advice. No warning. Just the weight, handed over.',
    ],
    reward: { lp: 5 },
    dramatic: true,
  },

  // ==========================================================================
  // ACT IV  -  THE APEX. You are the weather. The question is what kind.
  // ==========================================================================
  {
    id: 'a4c1_titan',
    act: 4,
    chapter: 1,
    title: 'Larger Than Nations',
    trigger: { type: 'earnings', value: 1e11 },
    speaker: 'narrator',
    lines: [
      'Three governments now index their budgets to your output.',
      'A currency analyst calls your company “too systemic to question.”',
      'The garage you started in is a museum exhibit. Admission is free. You insisted.',
    ],
    reward: { insight: 500 },
  },
  {
    id: 'a4c2_partnerleaves',
    act: 4,
    chapter: 2,
    title: 'The Fork in the Road',
    trigger: { type: 'tier', value: 5 },
    speaker: 'partner',
    lines: [
      'I’m leaving. Not angry. Just… finished.',
      'You kept the promise from the garage more often than I deserved to expect.',
      'Whatever you become next, I want my name on the part that was kind.',
    ],
    choice: {
      prompt: 'Theo offers you his half of the original handshake back.',
      options: [
        {
          text: 'Keep his name on the door, forever.',
          ethicsShift: 8,
          reward: { influence: 400 },
        },
        {
          text: 'Buy out his share at fair value. Move on.',
          ethicsShift: -2,
          reward: { cash: 1e8 },
        },
      ],
    },
    dramatic: true,
  },
  {
    id: 'a4c3_quorumvote',
    act: 4,
    chapter: 3,
    title: 'The Weather Vote',
    trigger: { type: 'earnings', value: 1e12 },
    speaker: 'consortium',
    lines: [
      'A motion is on the floor: ration the next decade of growth to the highest bidders.',
      'You are large enough now that your abstention is itself a vote.',
      'Choose. History is only ever written by those who showed up to sign it.',
    ],
    choice: {
      prompt: 'The Quorum waits for your hand to rise  -  or to stay down.',
      options: [
        {
          text: 'Vote to keep the markets open to all.',
          ethicsShift: 10,
          reward: { boost: { mult: 5, seconds: 180 } },
        },
        {
          text: 'Vote to ration. Scarcity is profit.',
          ethicsShift: -10,
          reward: { cash: 5e10, influence: 1000 },
        },
      ],
    },
  },
  {
    id: 'a4c4_prestige3',
    act: 4,
    chapter: 4,
    title: 'The Last Reset',
    trigger: { type: 'prestige', value: 3 },
    speaker: 'player',
    lines: [
      'One more dissolution. The deepest one. I can feel the floor of it.',
      'After this there is no bigger company to build  -  only a different kind of one.',
      'Dossier’s note is in my pocket. I finally understand the empty page.',
    ],
    reward: { lp: 25 },
  },
  {
    id: 'a4c5_mirror',
    act: 4,
    chapter: 5,
    title: 'The Mirror',
    trigger: { type: 'earnings', value: 1e13 },
    speaker: 'narrator',
    lines: [
      'There is no rival left to measure against. No mentor to seek. No buyer to refuse.',
      'Only the ledger of every choice, totaled, waiting to be read aloud.',
      'The empire turns to face the one person it could never acquire: you.',
    ],
    reward: { insight: 2000 },
  },

  // ==========================================================================
  // ACT V  -  THE LEGACY. Three doors. Ethics decides which one is yours.
  // (UI compares story.ethics to choose the ending it reveals.)
  // ==========================================================================
  {
    id: 'a5c1_threshold',
    act: 5,
    chapter: 1,
    title: 'At the Threshold',
    trigger: { type: 'earnings', value: 1e14 },
    speaker: 'narrator',
    lines: [
      'They build a hall to honor you and ask what words to carve above the door.',
      'Three plaques wait, already cut, only one to be hung.',
      'The Philanthropist. The Titan. The Architect.',
      'The stonework will say what you actually were, not what you meant to be.',
    ],
    reward: { lp: 50 },
  },
  {
    id: 'a5c2_philanthropist',
    act: 5,
    chapter: 2,
    title: 'Ending: The Philanthropist',
    trigger: { type: 'earnings', value: 3e14 },
    speaker: 'partner',
    lines: [
      'You gave it away. Not all of it  -  but the part that mattered, you gave.',
      'The Quorum couldn’t buy you because you’d already spent yourself on people.',
      'They’ll teach kids your name as a verb that means “to lift.”',
      'Theo came back for this. He’s smiling in the front row.',
    ],
    choice: {
      prompt: 'For those who chose the high road, the final gift is yours to direct.',
      options: [
        {
          text: 'Endow the open markets in perpetuity.',
          ethicsShift: 10,
          reward: { lp: 200, influence: 5000 },
        },
        {
          text: 'Fund a thousand next founders, no strings.',
          ethicsShift: 6,
          reward: { lp: 150, boost: { mult: 10, seconds: 300 } },
        },
      ],
    },
  },
  {
    id: 'a5c3_titan',
    act: 5,
    chapter: 3,
    title: 'Ending: The Titan',
    trigger: { type: 'earnings', value: 3e14 },
    speaker: 'consortium',
    lines: [
      'You took the chair. You set the weather. You won the only way the Quorum counts.',
      'The world runs on rails you laid and pays a toll you named.',
      'No one alive can refuse you. That is the loneliest sentence ever spoken.',
      'Welcome. We were the same, once. We don’t remember it either.',
    ],
    choice: {
      prompt: 'The empire is total. There is only the question of how it is held.',
      options: [
        {
          text: 'Tighten the grip. Let nothing slip.',
          ethicsShift: -10,
          reward: { lp: 250, cash: 1e13 },
        },
        {
          text: 'Loosen one finger. Leave them a sliver of sky.',
          ethicsShift: 4,
          reward: { lp: 180, influence: 4000 },
        },
      ],
    },
  },
  {
    id: 'a5c4_architect',
    act: 5,
    chapter: 4,
    title: 'Ending: The Architect',
    trigger: { type: 'earnings', value: 3e14 },
    speaker: 'mentor',
    lines: [
      'You didn’t take it all and you didn’t give it all. You built the rules and walked away.',
      '(Dossier’s voice, from a recording you never knew he left.)',
      '“The rarest founder isn’t the kindest or the strongest. It’s the one who makes themselves unnecessary.”',
      'The Engine runs without an owner now. That was always the point.',
    ],
    choice: {
      prompt: 'The blueprint outlives you. What do you sign at the bottom?',
      options: [
        {
          text: 'My name, so they know it can be done.',
          ethicsShift: 5,
          reward: { lp: 220, insight: 1e5 },
        },
        {
          text: 'Leave it blank, like the note he left me.',
          ethicsShift: 8,
          reward: { lp: 300 },
        },
      ],
    },
  },
  {
    id: 'a5c5_epilogue',
    act: 5,
    chapter: 5,
    title: 'The Empire Engine',
    trigger: { type: 'earnings', value: 1e15 },
    speaker: 'narrator',
    lines: [
      'Long after, a new founder signs a lease on a desk smaller than yours.',
      'Everyone tells them the market is closed. They are right  -  for them.',
      'On the wall hangs one line, no name beneath it: “Build yours so it survives you.”',
      'The engine turns. It was always going to be someone. This time it was you.',
    ],
    reward: { lp: 100 },
    dramatic: true,
  },
];

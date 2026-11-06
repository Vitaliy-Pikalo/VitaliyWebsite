// Campaign script. Each shrine tells one part of Vitaliy's story and grants one unit.

export type UnitKind = "hero" | "engineer" | "strategist" | "quant" | "banner" | "builder";
export type AbilityId = "drone" | "checkmate" | "kelly";

// Vitaliy's abilities, each taken from a project. Each one unlocks at a shrine.
export const abilities: Record<AbilityId, { name: string; hotkey: string; source: string; blurb: string; unlock: string }> = {
  drone: {
    name: "Medical Drone",
    hotkey: "Q",
    source: "CMU Project Ignite",
    blurb: "Revives the last fallen recruit at half health and heals the whole warband.",
    unlock: "academy",
  },
  checkmate: {
    name: "Checkmate",
    hotkey: "W",
    source: "Chess960-NN",
    blurb: "A heavy strike on the nearest enemy. Stuns the giant and cancels a slam.",
    unlock: "forge",
  },
  kelly: {
    name: "Kelly Bet",
    hotkey: "E",
    source: "Kalshi trading bot",
    blurb: "Size the bet: the whole warband deals 50% more damage for 6 seconds.",
    unlock: "market",
  },
};

// Acknowledgements when a unit is selected or given an order. Shown above the unit and,
// if the player turns on unit voices, spoken with the browser's speech synthesis.
export const barks: Record<UnitKind, { select: string[]; order: string[] }> = {
  hero: {
    select: ["Ready.", "What's the plan?", "Let's ship it."],
    order: ["On it.", "Moving.", "Done by Friday."],
  },
  engineer: {
    select: ["Built to last.", "Hard hat's on."],
    order: ["Laying the groundwork.", "Let's build it."],
  },
  strategist: {
    select: ["Thinking a few moves ahead.", "Your move."],
    order: ["As calculated.", "Every move has a reason."],
  },
  quant: {
    select: ["What's the edge?", "Odds look good."],
    order: ["Sizing in.", "Positive expected value."],
  },
  banner: {
    select: ["I've got your back.", "Stay together."],
    order: ["Right behind you.", "Holding the line."],
  },
  builder: {
    select: ["Tools ready.", "What needs fixing?"],
    order: ["Patching it up.", "On it."],
  },
};

export type Shrine = {
  id: string;
  title: string;
  lines: string[];
  recruit: UnitKind;
  recruitName: string;
  recruitBlurb: string;
  // World position on the ground plane (x, z).
  at: [number, number];
  rune: string; // hex color of the shrine's glow
};

export const intro = {
  title: "Prologue",
  lines: [
    "I fell in love with Warcraft III: The Frozen Throne because of my parents.",
    "I loved how simple it looked and how much depth the fights had. Every unit had a job, and knowing when to use each one won the battle.",
    "This is that idea, told through my own story. Walk to each glowing shrine to hear a chapter, recruit someone to your warband, and unlock one of my abilities. When you're ready, face the Final Round in the north.",
  ],
};

export const shrines: Shrine[] = [
  {
    id: "academy",
    title: "The Academy",
    lines: [
      "I study computer engineering at Penn State. I started at Behrend in Erie and transferred to University Park, graduating in May 2028.",
      "Circuits, digital systems, data structures, quantum waves. The coursework is the foundation everything else stands on.",
      "Before college, at Carnegie Mellon's Project Ignite, I led 12 students building a search-and-rescue medical drone that spots people with computer vision and drops first-aid kits.",
    ],
    recruit: "engineer",
    recruitName: "Engineer",
    recruitBlurb: "Sturdy front-line fighter. Takes hits so the others don't.",
    at: [-9, 20],
    rune: "#7e9a63",
  },
  {
    id: "forge",
    title: "The Chess Forge",
    lines: [
      "My flagship project is Chess960-NN: an AlphaZero-style engine for Fischer random chess.",
      "A 6.7-million-parameter residual network guides Monte Carlo tree search, trained only by playing itself. It reached about 1600 Elo.",
    ],
    recruit: "strategist",
    recruitName: "Strategist",
    recruitBlurb: "Casts slow, heavy bolts from range. Thinks a few moves ahead.",
    at: [10, 10],
    rune: "#8fb3e0",
  },
  {
    id: "market",
    title: "The Market Watch",
    lines: [
      "My Kalshi bot paper-trades prediction markets against the live API. It has logged 270,000+ market snapshots and 13,000+ predictions.",
      "Its best lesson: an early profit turned out to be sampling variance. So I added calibration analysis, and now the bot measures how much its own odds can be trusted.",
      "That lesson became a research pipeline built to catch false discoveries. I ran 78 trials across FX carry, 13F copycat investing, and Fed Beige Book sentiment, and published that none of them held up.",
    ],
    recruit: "quant",
    recruitName: "Quant Archer",
    recruitBlurb: "Fast ranged attacks with a chance to land critical hits.",
    at: [-11, -1],
    rune: "#e3c06a",
  },
  {
    id: "fund",
    title: "The Treasury",
    lines: [
      "As an equity analyst at the Intrieri Family Student Managed Fund, I helped manage a live $1.6M portfolio under CFA standards.",
      "I also led a four-person freelance team that shipped 10+ booking apps for local businesses, and I lectured 100+ students on AI tools as a TA.",
      "Now I'm building Pikalo, which explains U.S. taxes and investing to immigrants and first-time filers, with every answer tied to an IRS source.",
    ],
    recruit: "banner",
    recruitName: "Banner Bearer",
    recruitBlurb: "Heals the most wounded ally. Keeps the warband standing.",
    at: [9, -9],
    rune: "#c97b7b",
  },
  {
    id: "outpost",
    title: "The Open Outpost",
    lines: [
      "I contribute to open source, with pull requests merged into statsmodels, marimo, and lancedb: a wrong statistical derivative, an audio player that now takes PyTorch and JAX arrays, and an opaque error made clear.",
      "Off the keyboard: varsity tennis, a 17-0 singles season, and an AMCC conference title. Competing taught me to keep my head in long matches.",
    ],
    recruit: "builder",
    recruitName: "Builder",
    recruitBlurb: "Reinforces nearby allies so they take less damage.",
    at: [-6, -16],
    rune: "#b08ad6",
  },
];

export const boss = {
  name: "The Final Round",
  arena: [0, -30] as [number, number],
  intro: [
    "A stone giant guards the scroll that holds my resume. When a red circle fills under it, it slams. Your recruits step out on their own, but you have to move Vitaliy.",
    "Once it's hurt, it marks a small red zone under one of your backline units. The zone fills over 3 seconds, then a boulder lands there. Select that unit and step it out.",
    "At half health it calls stone shards that hunt your healer and ranged units. While any shard lives, the giant takes half damage. Send your fighters to break them.",
    "Vitaliy fights on his own. Use his abilities: Medical Drone (Q) to revive and heal, Checkmate (W) to stun the giant out of a slam, Kelly Bet (E) when you want to burst it down.",
  ],
};

export const difficulties = {
  story: {
    label: "Story",
    blurb: "For seeing the story. Enemies hit softer, so selecting everyone and attacking works.",
  },
  veteran: {
    label: "Veteran",
    blurb: "Full-strength giant. You'll need to dodge, peel shards, and protect your healer.",
  },
};

export const victory = {
  title: "Victory",
  lines: [
    "The Final Round falls, and the scroll is yours.",
    "Thanks for playing through my story. If you want the short version, my resume has it all on one page.",
  ],
};

export const defeat = {
  title: "Defeat",
  lines: [
    "Your hero fell. The Final Round is tough alone: recruit more of the warband from the shrines and try again.",
  ],
};

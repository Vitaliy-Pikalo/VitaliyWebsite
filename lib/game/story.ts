// Campaign script. Each shrine tells one part of Vitaliy's story and grants one unit.

export type UnitKind = "hero" | "engineer" | "strategist" | "quant" | "banner" | "builder";

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
    "This is that idea, told through my own story. Walk to each glowing shrine to hear a chapter and recruit someone to your warband. When you're ready, face the Final Round in the north.",
  ],
};

export const shrines: Shrine[] = [
  {
    id: "academy",
    title: "The Academy",
    lines: [
      "I study computer engineering at Penn State. I started at Behrend in Erie and transferred to University Park, graduating in May 2028.",
      "Circuits, digital systems, data structures, quantum waves. The coursework is the foundation everything else stands on.",
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
      "As an equity analyst at the Intrieri Family Student Managed Fund, I help manage a live $1.6M portfolio under CFA standards.",
      "I also lead a four-person freelance team that has shipped 10+ production apps, and I teach AI tools to 100+ students as a TA.",
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
      "I contribute to open source. My pull request to marimo lets its audio player accept PyTorch and JAX arrays directly. It was merged and shipped in v0.23.12.",
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
  intro:
    "A stone giant guards the scroll that holds my resume. Watch for the red circle on the ground: when it fills, it slams. Move your hero out of it.",
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

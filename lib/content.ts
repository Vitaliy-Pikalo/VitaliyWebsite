// All site copy lives here. Edit this file to update the site.

export const profile = {
  name: "Vitaliy Pikalo",
  role: "Computer engineering student at Penn State",
  tagline:
    "I build ML systems, trading tools, and full-stack apps, and I test my own results before I trust them.",
  email: "vap5288@psu.edu",
  github: "https://github.com/Vitaliy-Pikalo",
  linkedin: "https://www.linkedin.com/in/vitaliypikalo/",
  resume: "/Vitaliy_Pikalo_resume.pdf",
  availability:
    "Looking for Summer 2027 software engineering and quant development internships.",
};

export const about: string[] = [
  "I'm a computer engineering student at Penn State University Park, graduating in May 2028. I like problems where the answer can be measured: an engine's Elo, a model's calibration, whether a payment flow survives real users.",
  "My best work so far is an AlphaZero-style Chess960 engine trained through self-play, and a prediction-market bot that logged hundreds of thousands of market snapshots. That bot also taught me to distrust a good-looking result until the sample size backs it up.",
  "Outside class I've led a four-person freelance team shipping production apps, co-managed a $1.6M student equity fund, and lectured 100+ students on AI tools. Right now I'm building Pikalo, a finance education platform for immigrants and young Americans.",
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  summary: string;
  tags: string[];
};

export const experience: Experience[] = [
  {
    role: "AI Teaching Assistant and Guest Lecturer",
    org: "Penn State Behrend",
    period: "Dec 2025 – May 2026",
    summary:
      "Gave faculty-invited guest lectures to 100+ students on prompt engineering, AI workflows, and automation with Microsoft Copilot. Built instructional materials and ran 1:1 sessions that raised the quality of submitted assignments.",
    tags: ["Prompt engineering", "Microsoft Copilot", "Teaching"],
  },
  {
    role: "Full-Stack Development Team Lead",
    org: "Freelance client work",
    period: "Apr – Aug 2025",
    summary:
      "Led a team of four engineers that shipped 10+ web and mobile booking apps for local businesses, handling 100+ customer reservations a month. Built encrypted Stripe payment flows with Supabase auth, PCI-compliant across every client, and ran branching and PR review on GitHub across concurrent projects.",
    tags: ["Stripe", "Supabase", "Full-stack", "Team lead"],
  },
  {
    role: "Equity Analyst",
    org: "Intrieri Family Student Managed Fund",
    period: "Jan – May 2025",
    summary:
      "Co-managed a live $1.6M equity portfolio with a team of analysts under CFA Institute standards. Wrote economic, industry, and valuation analyses that fed directly into the fund's buy and sell decisions and rebalancing.",
    tags: ["Equity valuation", "Economic research", "CFA standards"],
  },
  {
    role: "Project Ignite Intern",
    org: "Carnegie Mellon University",
    period: "Jan 2022 – Dec 2024",
    summary:
      "Proposed and led a team of 12 students building a search-and-rescue medical drone prototype on an $800 budget, motivated by the war in Ukraine. Integrated TensorFlow and OpenCV computer vision to detect people and deliver first-aid payloads from a PX4 drone.",
    tags: ["TensorFlow", "OpenCV", "PX4", "Drones"],
  },
  {
    role: "Founding Member",
    org: "Steel City Codes",
    period: "Jan 2021 – Mar 2023",
    summary:
      "Co-founded a chapter that taught Java to 200 elementary school students in partnership with three Pittsburgh elementary schools.",
    tags: ["Java", "Teaching"],
  },
];

export const education = {
  degree: "B.S. Computer Engineering",
  school: "Penn State University Park",
  period: "2024 – 2028",
  note: "Graduating May 2028. Dean's List, Spring 2026. Transferred from Penn State Behrend.",
};

export type Project = {
  name: string;
  summary: string;
  detail: string;
  tags: string[];
  links: { label: string; href: string }[];
};

export const projects: Project[] = [
  {
    name: "Chess960-NN",
    summary: "AlphaZero-style engine for Fischer random chess, trained by self-play.",
    detail:
      "A 10-block residual network (6.7M parameters) guides Monte Carlo tree search with PUCT. Trained from scratch through self-play and benchmarked at about 1600 Elo over 100 games against Stockfish. Served behind a FastAPI backend on Hugging Face Spaces.",
    tags: ["PyTorch", "MCTS", "Reinforcement learning", "FastAPI"],
    links: [
      { label: "Play it", href: "https://chess960-nn.netlify.app" },
      { label: "Source", href: "https://github.com/Vitaliy-Pikalo/chess960-nn" },
    ],
  },
  {
    name: "Kalshi trading bot",
    summary: "Paper-trading daemon for prediction markets, with calibration checks.",
    detail:
      "A fault-tolerant 24/7 daemon against Kalshi's live API that prices contracts with a log-normal volatility model and sizes positions with fractional Kelly (k = 0.25). It has logged 270K+ snapshots and 13K+ predictions to SQLite and survives restarts with the database as the source of truth. I fixed concurrent-write failures with WAL journaling and traced an 18x data-inflation bug to a bad SQL join. When an early profit turned out to be sampling variance, I added calibration analysis so the bot reports how reliable its probabilities are.",
    tags: ["Python", "SQLite", "SQLAlchemy", "Quant modeling"],
    links: [{ label: "Source", href: "https://github.com/Vitaliy-Pikalo/kalshi-trading-bot" }],
  },
  {
    name: "Levee",
    summary: "Hackathon project, 3rd place on the AWS track.",
    detail:
      "Built over a weekend with Alex Hasenbein. I owned the AWS integration, built on Amazon Bedrock.",
    tags: ["AWS", "Amazon Bedrock", "Hackathon"],
    links: [
      { label: "Live", href: "https://levee.rentals" },
      { label: "Source", href: "https://github.com/AHasenbein/Levee" },
    ],
  },
  {
    name: "Bonfire",
    summary: "Multiplayer party game with LLM-generated prompts, built by a team of three.",
    detail:
      "I owned the Firebase backend: Firestore data models, repositories, security rules, Riverpod providers, the test suite, and GitHub Actions CI.",
    tags: ["Flutter", "Firebase", "Riverpod", "Groq LLM"],
    links: [],
  },
];

export const openSource = [
  {
    repo: "lancedb",
    title: "Clear error for vector-column type inference",
    detail:
      "Merged pull request #3567 that turned an opaque runtime error into an explicit ValueError, with a regression test.",
    href: "https://github.com/lancedb/lancedb/pull/3567",
  },
  {
    repo: "marimo",
    title: "Let mo.audio accept array-protocol objects",
    detail:
      "Merged pull request #9943 so audio playback works directly with torch.Tensor and JAX arrays. Reviewed by a core maintainer and shipped in v0.23.12.",
    href: "https://github.com/marimo-team/marimo/pull/9943",
  },
];

export const beyond: { title: string; detail: string }[] = [
  {
    title: "Varsity tennis",
    detail:
      "NCAA Division III at Penn State Behrend. Went 17-0 in singles, won the AMCC conference title, and was named AMCC Player of the Week.",
  },
  {
    title: "Languages",
    detail: "English, Ukrainian, and Russian.",
  },
  {
    title: "Chess and poker",
    detail: "Founded a campus chess club. Built a Texas Hold'em bot before the trading bot.",
  },
  {
    title: "Warcraft III",
    detail:
      "My parents got me into The Frozen Throne. Its simple look and deep fights are why this site has a campaign mode.",
  },
];

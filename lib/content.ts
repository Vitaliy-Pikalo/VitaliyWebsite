// All site copy lives here. Edit this file to update the site.
// `period` is optional on purpose: add dates when you have them.

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
  "Outside class I've led a small freelance team shipping production apps, co-managed a $1.6M student equity fund, and taught AI tools to 100+ students. Right now I'm building Pikalo, a finance education platform for immigrants and young Americans.",
];

export type Experience = {
  role: string;
  org: string;
  period?: string;
  summary: string;
  tags: string[];
};

export const experience: Experience[] = [
  {
    role: "Equity Analyst",
    org: "Intrieri Family Student Managed Fund",
    summary:
      "Co-manage a live $1.6M equity portfolio under CFA standards. Build DCF and comparable-company models and pitch buy and sell recommendations, mostly in technology and growth sectors.",
    tags: ["DCF modeling", "Comparable analysis", "Equity research"],
  },
  {
    role: "Full-Stack Team Lead",
    org: "Independent contractor",
    summary:
      "Lead a team of four engineers shipping 10+ production web and mobile apps for clients. Own architecture, payments, auth, and real-time data, plus the client relationship from scoping to delivery.",
    tags: ["Next.js", "TypeScript", "Supabase", "Firebase", "Stripe"],
  },
  {
    role: "AI Teaching Assistant and Guest Lecturer",
    org: "Penn State",
    summary:
      "Support 100+ students in AI coursework and lecture on applied AI tools. Co-founded the campus AI Taskforce to shape AI curriculum across the college.",
    tags: ["Python", "PyTorch", "Teaching"],
  },
  {
    role: "Instructor",
    org: "Carnegie Mellon University, Project Ignite",
    summary:
      "Led 12 students building a medical drone with TensorFlow and OpenCV computer vision on an $800 budget.",
    tags: ["TensorFlow", "OpenCV", "Robotics"],
  },
];

export const education = {
  degree: "B.S. Computer Engineering",
  school: "Penn State University Park",
  period: "Expected May 2028",
  note: "Dean's List, Spring 2026. Transferred from Penn State Behrend.",
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
      "A 10-block residual network (6.7M parameters) guides Monte Carlo tree search with PUCT. Trained from scratch through reinforcement learning self-play to roughly 1600 Elo, and playable in the browser.",
    tags: ["PyTorch", "MCTS", "Reinforcement learning", "FastAPI"],
    links: [{ label: "Play it", href: "https://chess960-nn.hf.space" }],
  },
  {
    name: "Kalshi trading bot",
    summary: "Paper-trading daemon for prediction markets, with calibration checks.",
    detail:
      "Runs against Kalshi's live API, prices contracts with a log-normal volatility model, and sizes positions with fractional Kelly (k = 0.25). It has logged 270K+ snapshots and 13K+ predictions to SQLite. When an early profit turned out to be sampling variance, I added expected calibration error analysis so the bot reports how reliable its probabilities are.",
    tags: ["Python", "SQLite", "Quant modeling", "Calibration"],
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
    repo: "marimo",
    title: "Let mo.audio accept array-protocol objects",
    detail:
      "Merged pull request so audio playback works directly with torch.Tensor and JAX arrays. Reviewed by a core maintainer and shipped in v0.23.12.",
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
    title: "Chess and poker",
    detail: "Founded a campus chess club. Built a Texas Hold'em bot before the trading bot.",
  },
  {
    title: "Warcraft III",
    detail:
      "My parents got me into The Frozen Throne. Its simple look and deep fights are why this site has a campaign mode.",
  },
];

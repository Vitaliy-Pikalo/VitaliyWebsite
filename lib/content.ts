// All site copy lives here. Edit this file to update the site.

export const profile = {
  name: "Vitaliy Pikalo",
  role: "Computer engineering student at Penn State",
  tagline:
    "I build AI products, ML systems, and full-stack apps, and I test my own results before I trust them.",
  email: "vap5288@psu.edu",
  github: "https://github.com/Vitaliy-Pikalo",
  linkedin: "https://www.linkedin.com/in/vitaliypikalo/",
  resume: "/Vitaliy_Pikalo_resume.pdf",
  availability:
    "Looking for Summer 2027 software engineering and quant development internships.",
};

export const about: string[] = [
  "I'm a computer engineering student at Penn State University Park, graduating in May 2028. I like problems where the answer can be measured: an engine's Elo, a model's calibration, whether an AI answer can be traced back to its source.",
  "Right now I'm building Pikalo, a finance education platform for immigrants and first-time U.S. tax filers. Its AI tutor answers from 1,491 IRS passages, cites a source for every answer, and withholds answers it can't verify. 1,300+ people have joined the waitlist.",
  "Before that I built custom GPTs for 110+ Penn State students and red-teamed them with 350+ adversarial prompts, led a four-person freelance team shipping production booking apps, and co-managed a $1.6M student equity fund. On the side I trained an AlphaZero-style Chess960 engine and ran a prediction-market data service that taught me to distrust a good-looking result until the statistics back it up.",
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  summary: string;
  tags: string[];
  href?: string;
};

export const experience: Experience[] = [
  {
    role: "Founder & Software Engineer",
    org: "Pikalo",
    href: "https://pikalo.org",
    period: "May 2026 – Present",
    summary:
      "Finance education for immigrants and first-time U.S. tax filers. Shipped a live platform with finance lessons, an IRS-based tax-residency checker, and FICA-refund and Roth IRA calculators, and grew the waitlist to 1,300+ signups. Built Ask Pikalo, an AI tutor that uses RAG over 1,491 IRS passages, cites a source for every answer, and pulls every number from calculator tools over MCP; answers it can't verify are withheld. Every push is gated on 47 eval cases (100% pass), and it passed 11/11 live end-to-end tests, including prompt injection, at about $0.001 per answer.",
    tags: ["Next.js", "TypeScript", "Supabase", "RAG", "MCP", "Amazon Bedrock", "AWS CDK"],
  },
  {
    role: "Applied AI Engineer",
    org: "Penn State",
    period: "Dec 2025 – May 2026",
    summary:
      "Built and deployed 2 custom GPTs used by 110+ students, restricted to cited sources under strict guardrails. Red-teamed each one with 350+ adversarial prompts from LLM agents built to force uncited, wrong, or inappropriate answers, and iterated the system prompts until the attacks failed before release. Cut student research tasks from about two weeks to minutes while keeping a citation on every answer.",
    tags: ["OpenAI custom GPTs", "Prompt engineering", "LLM red-teaming"],
  },
  {
    role: "Full-Stack Software Engineer & Team Lead",
    org: "Independent contractor",
    period: "Apr – Aug 2025",
    summary:
      "Led a team of four engineers that shipped 10+ production booking apps for local businesses, handling 100+ reservations a month, and ran code review and releases. Built Stripe payments with Supabase Auth and role-based access control, keeping checkout PCI-compliant.",
    tags: ["React", "Node.js", "Supabase", "Stripe", "REST APIs"],
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
    role: "Project Ignite Engineering Lead",
    org: "Carnegie Mellon University",
    period: "Jan 2022 – Dec 2024",
    summary:
      "Led a 12-student team that shipped a search-and-rescue drone on an $800 budget, donated to a Ukrainian rescue foundation. Built a TensorFlow and OpenCV person-detection model on the drone's thermal camera to find people in rubble and stream their coordinates to the flight system for targeted medical-package drops. The system adjusted drops for wind and altitude, alerted authorities by injury severity, and texted live location updates.",
    tags: ["TensorFlow", "OpenCV", "Python", "PX4", "Thermal imaging"],
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
  note: "Graduating May 2028. Dean's List. Coursework includes data structures and algorithms, object-oriented programming, systems programming, and computer organization. Transferred from Penn State Behrend.",
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
    name: "Levee",
    summary: "Flood-risk rental analyzer. 3rd place, Best Use of AWS, at c0mpiled-15 (Oct 2026).",
    detail:
      "Built over a weekend with Alex Hasenbein. I built the usage-metered API backend with per-user entitlement checks and HMAC-signed API keys, and an Amazon Bedrock feature that writes a deal memo and checks every generated figure against the source data, falling back to a fixed template when a number doesn't match.",
    tags: ["AWS Lambda", "Amazon Bedrock", "Node.js", "Hono", "Stripe"],
    links: [
      { label: "Live", href: "https://levee.rentals" },
      { label: "Source", href: "https://github.com/AHasenbein/Levee" },
    ],
  },
  {
    name: "Chess960-NN: AlphaZero reproduction",
    summary: "AlphaZero-style engine for Fischer random chess, trained by self-play.",
    detail:
      "A 10-block residual network (6.7M parameters) guides Monte Carlo tree search with PUCT. Supervised pretraining on 6.4M positions, then self-play reinforcement learning on one GPU, benchmarked at about 1600 Elo over 100 games against Stockfish. Served behind a FastAPI backend on Hugging Face Spaces.",
    tags: ["PyTorch", "CUDA", "MCTS", "Reinforcement learning", "FastAPI"],
    links: [
      { label: "Play it", href: "https://chess960-nn.netlify.app" },
      { label: "Source", href: "https://github.com/Vitaliy-Pikalo/chess960-nn" },
    ],
  },  {
    name: "Kalshi prediction-market data service",
    summary: "A 24/7 Linux daemon that records prediction markets and checks its own odds.",
    detail:
      "A fault-tolerant 24/7 daemon against Kalshi's live API that prices contracts with a log-normal volatility model and sizes positions with fractional Kelly (k = 0.25). It has logged 270K+ snapshots and 13K+ predictions to SQLite and survives restarts with the database as the source of truth. I fixed concurrent-write failures with WAL journaling and traced an 18x data-inflation bug to a bad SQL join. When an early profit turned out to be sampling variance, I added calibration analysis so the bot reports how reliable its probabilities are.",
    tags: ["Python", "SQLite", "pandas", "scikit-learn", "REST APIs"],
    links: [{ label: "Source", href: "https://github.com/Vitaliy-Pikalo/kalshi-trading-bot" }],
  },  {
    name: "Quant research pipeline",
    summary: "A backtesting pipeline built to catch false discoveries, run against real public data.",
    detail:
      "Purged and combinatorial cross-validation, walk-forward splits, a point-in-time feature store, transaction costs, and overfitting statistics (deflated Sharpe ratio, probability of backtest overfitting, Benjamini-Hochberg FDR), with 49 tests. I tested FX carry, 13F copycat investing, and Fed Beige Book sentiment, counting all 78 trials across hypotheses. None survived, and the write-up reports the negative results.",
    tags: ["Python", "Statistics", "Backtesting", "pytest"],
    links: [{ label: "Source", href: "https://github.com/Vitaliy-Pikalo/quant-research-pipeline" }],
  },  {
    name: "Peaklo",
    summary: "Internship finder that pulls postings straight from company hiring systems. In beta.",
    detail:
      "Ingests postings from Greenhouse and Lever, normalizes them into one schema with a CI-checked classifier, and runs on a Postgres job scheduler with health checks, replayable raw payloads, and a dead-man's-switch heartbeat. 267 tests at 91% coverage, strict mypy, reversible migrations.",
    tags: ["Python", "FastAPI", "PostgreSQL", "Docker", "GitHub Actions"],
    links: [{ label: "Source", href: "https://github.com/Vitaliy-Pikalo/peaklo" }],
  },];

export const openSource = [
  {
    repo: "statsmodels",
    title: "Fix the Binomial family's derivative",
    detail:
      "Merged pull request #9862: Binomial.deriv() was missing a division by n, so it returned the wrong derivative for binomial counts.",
    href: "https://github.com/statsmodels/statsmodels/pull/9862",
  },
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
      "NCAA Division III at Penn State Behrend. Went 17-0 in singles, won the AMCC conference title, and made the AMCC All-Tournament Team and Player of the Week.",
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

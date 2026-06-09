"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const projects = [
  {
    title: "Chess960-NN",
    description:
      "AlphaZero-style chess engine built with PyTorch ResNet + PUCT MCTS. Trained from scratch via self-play on RTX 3060 Ti. Reaches ~1600 Elo vs Stockfish.",
    techUsed: "Python, PyTorch, MCTS",
  },
  {
    title: "Kalshi Trading Bot",
    description:
      "24/7 autonomous trading daemon on Kalshi prediction markets. 270K+ market snapshots stored in SQLite WAL. Runs live A/B experiments on trading strategies.",
    techUsed: "Python, SQLite, REST APIs",
  },
  {
    title: "Bonfire",
    description:
      "Multiplayer social app built with Flutter + Firebase + Groq LLM. Real-time rooms, AI-assisted conversation, deployed on iOS and Android.",
    techUsed: "Flutter, Firebase, Groq LLM",
  },
  {
    title: "SwipeHire",
    description:
      "Resume swiper for recruiters — swipe-based interface, star candidates, and email integration.",
    techUsed: "React, Tailwind",
  },
  {
    title: "FlashTrades",
    description:
      "Lightweight educational day-trading simulator under 15 KB. Custom canvas-based rendering and binary data encoding. Zero frameworks.",
    techUsed: "JavaScript, Canvas",
  },
];

export default function ProjectsPage() {
  return (
    <div className="projects-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/projects.png" alt="Projects" />
      <h1 className="skills-title" style={{ marginBottom: "30px" }}>Projects</h1>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <div
            key={project.title}
            className="project-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="project-details">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="tech-used">
                {project.techUsed.split(", ").map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

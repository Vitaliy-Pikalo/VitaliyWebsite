"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const projects = [
  {
    title: "Sports Social Platform",
    description: "A mobile-first platform combining competitive and recreational sports with messaging, achievements, and AI-driven highlight feeds.",
    techUsed: "React, Node.js, MongoDB",
  },
  {
    title: "Stock Trading Algorithm",
    description: "A data-driven trading system that scrapes sentiment and search trends to generate trading signals.",
    techUsed: "Python, APIs, Data pipelines",
  },
  {
    title: "Poker Strategy Bot",
    description: "A simulation of my personal Texas Hold'em strategy with probability-based decision logic.",
    techUsed: "Python, Algorithms",
  },
  {
    title: "Tennis Booking App",
    description: "A scheduling and booking platform focused on quick reservations.",
    techUsed: "JavaScript, Full-Stack",
  },
  {
    title: "SwipeHire",
    description: "Resume swiper for recruiters with swipe-based interface, star candidates, and email integration.",
    techUsed: "React, Tailwind",
  },
  {
    title: "FlashTrades",
    description: "Lightweight educational day-trading simulator under 15 KB. Link: flashtrades.netlify.app",
    techUsed: "Canvas, JavaScript",
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

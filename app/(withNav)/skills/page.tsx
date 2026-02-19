"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const skillsByCategory: Record<string, { name: string; description: string }[]> = {
  Languages: [
    { name: "C++", description: "" },
    { name: "Python", description: "" },
    { name: "JavaScript", description: "" },
    { name: "SQL", description: "" },
  ],
  "Technical Areas": [
    { name: "Full-Stack Development", description: "" },
    { name: "Machine Learning", description: "" },
    { name: "Algorithms & Data Structures", description: "" },
    { name: "Performance Optimization", description: "" },
  ],
  Tools: [
    { name: "Git & GitHub", description: "" },
    { name: "Data pipelines", description: "" },
    { name: "Canvas rendering", description: "" },
  ],
};

export default function SkillsPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/skills.png" alt="Skills" />
      <h1 className="skills-title">Skills</h1>
      {Object.entries(skillsByCategory).map(([category, skills]) => (
        <div key={category}>
          <h2 className="category-title">{category}</h2>
          <div className="skills-grid">
            {skills.map((skill) => (
              <div key={skill.name} className="skill-card">
                <div className="skill-name">
                  {skill.name.split("").map((letter, i) => (
                    <span key={i} className="letter" style={{ animationDelay: `${i * 0.05}s` }}>
                      {letter}
                    </span>
                  ))}
                </div>
                {skill.description && <p className="skill-description">{skill.description}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

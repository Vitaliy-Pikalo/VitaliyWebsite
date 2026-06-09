"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const tennisStats = [
  { value: "17–0",   label: "Singles Record" },
  { value: "AMCC",   label: "Conference Champion" },
  { value: "5th",    label: "Straight AMCC Title" },
  { value: "D-III",  label: "NCAA Tournament" },
  { value: "7–0",    label: "Team Season Record" },
  { value: "POTW",   label: "Player of the Week" },
];

const hobbies = [
  { emoji: "🎾", label: "Pickleball"   },
  { emoji: "🏋️", label: "Gym"          },
  { emoji: "🏃", label: "Running"      },
  { emoji: "🎨", label: "Painting"     },
  { emoji: "✏️", label: "Drawing"      },
  { emoji: "🧩", label: "Rubik's Cube" },
  { emoji: "⛏️", label: "Minecraft"    },
  { emoji: "🃏", label: "Brawl Stars"  },
  { emoji: "🧱", label: "LEGO"         },
  { emoji: "📦", label: "Reselling"    },
  { emoji: "♟️", label: "Chess"        },
];

const travels = [
  "🇺🇸 Los Angeles — Summer 2026",
  "🇫🇯 Fiji — Summer 2026",
  "🇦🇺 Australia — Summer 2026",
  "🇺🇦 Ukraine",
  "✈️ More coming...",
];

export default function SportsPage() {
  return (
    <div className="sports-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>
        ← Back
      </Link>
      <CategoryHeroImage src="/categories/experience.png" alt="Sports" />
      <h1 className="skills-title" style={{ marginBottom: "40px" }}>Sports & Life</h1>

      <p className="music-section-title">Tennis — Penn State Behrend (NCAA D-III)</p>
      <div className="stat-grid">
        {tennisStats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="music-section-title">Other Stuff I Do</p>
      <div className="hobby-grid">
        {hobbies.map((h) => (
          <div key={h.label} className="hobby-card">
            <div className="hobby-emoji">{h.emoji}</div>
            <div className="hobby-label">{h.label}</div>
          </div>
        ))}
      </div>

      <p className="music-section-title">Travel</p>
      <div className="travel-row">
        {travels.map((t) => (
          <span key={t} className="travel-badge">{t}</span>
        ))}
      </div>

      <p style={{ color: "#555", fontSize: "0.82rem", marginTop: "-24px" }}>
        Competing at tennis shaped how I approach everything — fast feedback loops, adaptation, execution under pressure.
      </p>
    </div>
  );
}

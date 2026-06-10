"use client";

import { useRouter } from "next/navigation";

const profiles = [
  {
    name: "recruiter",
    label: "Recruiter",
    icon: "💼",
    gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b3a5c 60%, #0a2540 100%)",
    accent: "#4fa3e0",
    tagline: "Experience · Skills · Resume",
    tags: ["Full-Stack Lead", "Equity Analyst", "AI TA"],
  },
  {
    name: "developer",
    label: "Developer",
    icon: "⚡",
    gradient: "linear-gradient(135deg, #0a0f1e 0%, #1a1a3e 60%, #0d0d2a 100%)",
    accent: "#e50914",
    tagline: "Projects · Tech Stack · Code",
    tags: ["Chess960-NN", "Kalshi Bot", "Bonfire"],
  },
  {
    name: "stalker",
    label: "Stalker",
    icon: "🎵",
    gradient: "linear-gradient(135deg, #1a0533 0%, #2d1b52 60%, #1e0a40 100%)",
    accent: "#a855f7",
    tagline: "Music · Life · Vibes",
    tags: ["Gunna", "Don Toliver", "Tech House"],
  },
  {
    name: "adventurer",
    label: "Adventurer",
    icon: "🌍",
    gradient: "linear-gradient(135deg, #1a0a00 0%, #3d1c00 60%, #2a1200 100%)",
    accent: "#f97316",
    tagline: "Travel · Hobbies · Reads",
    tags: ["Fiji 🇫🇯", "Australia 🇦🇺", "LA 🇺🇸"],
  },
];

export default function Browse() {
  const router = useRouter();

  return (
    <div className="browse-container">
      <h1 className="who-is-watching">Who&apos;s Watching?</h1>
      <div className="profile-picker-grid">
        {profiles.map((p) => (
          <button
            key={p.name}
            type="button"
            className="profile-picker-card"
            onClick={() => router.push(`/profile/${p.name}`)}
            style={{ background: p.gradient }}
          >
            <div className="ppc-glow" style={{ background: p.accent }} />
            <span className="pp-icon">{p.icon}</span>
            <span className="pp-label" style={{ color: p.accent }}>{p.label}</span>
            <span className="pp-tagline">{p.tagline}</span>
            <div className="pp-tags">
              {p.tags.map((t) => (
                <span key={t} className="pp-tag" style={{ borderColor: p.accent + "55", color: p.accent }}>
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

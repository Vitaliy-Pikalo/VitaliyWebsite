"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

export default function MusicPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/music.png" alt="Music" />
      <h1 className="skills-title">Music</h1>
      <p style={{ color: "#ccc" }}>Personal interests — music and more.</p>
    </div>
  );
}

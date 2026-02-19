"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

export default function SportsPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/experience.png" alt="Sports" />
      <h1 className="skills-title">Sports</h1>
      <p style={{ color: "#ccc" }}>Collegiate tennis player at Penn State. High school team captain and MVP, PIAA singles qualifier, multiple tournament podium finishes.</p>
    </div>
  );
}

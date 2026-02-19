"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

export default function ReadingPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/reading.png" alt="Reading" />
      <h1 className="skills-title">Reading</h1>
      <p style={{ color: "#ccc" }}>Books and articles on markets, poker, and performance psychology.</p>
    </div>
  );
}

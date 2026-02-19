"use client";

import Link from "next/link";

export default function RecommendationsPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <h1 className="skills-title">Recommendations</h1>
      <p style={{ color: "#ccc" }}>References and recommendations available upon request.</p>
    </div>
  );
}

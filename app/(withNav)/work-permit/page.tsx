"use client";

import Link from "next/link";

export default function WorkPermitPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <h1 className="skills-title">Work Permit</h1>
      <p style={{ color: "#ccc" }}>Based in Pennsylvania, USA. Open to opportunities.</p>
    </div>
  );
}

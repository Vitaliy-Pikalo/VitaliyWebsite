"use client";

import Link from "next/link";

export default function BlogsPage() {
  return (
    <div className="skills-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <h1 className="skills-title">Blogs</h1>
      <p style={{ color: "#ccc" }}>Coming soon.</p>
    </div>
  );
}

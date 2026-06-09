"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const books = [
  {
    title: "M Is for Magic",
    author: "Neil Gaiman",
    tag: "Short Stories / Fantasy",
    note: "Gaiman's short fiction — imaginative and dark. love the prose.",
  },
  {
    title: "The Amulet Series",
    author: "Kazu Kibuishi",
    tag: "Graphic Novel",
    note: "The world-building and panel art are on another level.",
  },
  {
    title: "The Electric State",
    author: "Simon Stålenhag",
    tag: "Illustrated Fiction / Sci-Fi",
    note: "Stålenhag's retrofuturistic illustrations hit differently.",
  },
  {
    title: "Tales from the Loop",
    author: "Simon Stålenhag",
    tag: "Illustrated Fiction / Sci-Fi",
    note: "Eerie Americana + machines. Pure visual storytelling.",
  },
];

export default function ReadingPage() {
  return (
    <div className="reading-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>
        ← Back
      </Link>
      <CategoryHeroImage src="/categories/reading.png" alt="Reading" />
      <h1 className="skills-title" style={{ marginBottom: "40px" }}>Reading</h1>

      <p className="music-section-title">Books</p>
      <div className="book-grid">
        {books.map((b) => (
          <div key={b.title} className="book-card">
            <div className="book-title">{b.title}</div>
            <div className="book-author">{b.author}</div>
            <span className="book-tag">{b.tag}</span>
            {b.note && (
              <p style={{ color: "#777", fontSize: "0.8rem", marginTop: "10px", lineHeight: "1.4" }}>
                {b.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="music-section-title" style={{ marginTop: "16px" }}>What I Look For</p>
      <p style={{ color: "#aaa", maxWidth: "640px", lineHeight: "1.7", fontSize: "0.95rem" }}>
        I gravitate toward books with strong visual imagination — Gaiman for the prose, Kibuishi for the
        panels, Stålenhag for the art direction. I like fiction that builds a world fast and doesn&apos;t
        over-explain it.
      </p>
    </div>
  );
}

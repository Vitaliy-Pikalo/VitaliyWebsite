"use client";

import Link from "next/link";

type SectionCardProps = {
  title: string;
  icon: string;
  gradient: string;
  href: string;
  previews?: string[];
  accentColor?: string;
  wide?: boolean;
};

export default function SectionCard({
  title,
  icon,
  gradient,
  href,
  previews = [],
  accentColor = "#e50914",
  wide = false,
}: SectionCardProps) {
  return (
    <Link
      href={href}
      className="section-card-link"
      style={{ textDecoration: "none", flexShrink: 0, width: wide ? "320px" : "220px" }}
    >
      <div
        className="section-card"
        style={{ background: gradient }}
      >
        <span className="section-card-icon">{icon}</span>
        <div className="section-card-body">
          <div className="section-card-title" style={{ color: accentColor }}>
            {title}
          </div>
          {previews.length > 0 && (
            <ul className="section-card-previews">
              {previews.slice(0, 3).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="section-card-arrow">→</div>
      </div>
    </Link>
  );
}

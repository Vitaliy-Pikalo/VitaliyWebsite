"use client";

import Link from "next/link";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const certifications = [
  { title: "Bloomberg Market Concepts", issuer: "Bloomberg", issuedDate: "" },
  { title: "Financial Statement Modeling", issuer: "Wall Street Prep", issuedDate: "" },
  { title: "Trading Comps Modeling", issuer: "Wall Street Prep", issuedDate: "" },
  { title: "Analyzing Financial Reports", issuer: "Wall Street Prep", issuedDate: "" },
  { title: "Accounting & Financial Statement Analysis", issuer: "Wall Street Prep", issuedDate: "" },
  { title: "Microsoft Excel", issuer: "Wall Street Prep", issuedDate: "" },
  { title: "PowerPoint Training", issuer: "Wall Street Prep", issuedDate: "" },
];

export default function CertificationsPage() {
  return (
    <div className="certifications-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/certifications.png" alt="Certifications" />
      <h1 className="certifications-title">Certifications</h1>
      <div className="certifications-grid">
        {certifications.map((cert, index) => (
          <div
            key={cert.title}
            className="certification-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="certification-content">
              <h3 style={{ color: "#e50914", marginBottom: "8px" }}>{cert.title}</h3>
              <p style={{ color: "#ccc" }}>{cert.issuer}</p>
              {cert.issuedDate && <p className="issued-date">Issued {cert.issuedDate}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

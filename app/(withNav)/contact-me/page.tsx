"use client";

import Link from "next/link";
import { FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa";
import CategoryHeroImage from "@/components/CategoryHeroImage";

export default function ContactMePage() {
  return (
    <div className="contact-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/contact-me.png" alt="Contact" />
      <div className="linkedin-badge-custom">
        <div className="badge-content">
          <p className="badge-name">Vitaliy Pikalo</p>
          <p className="badge-title">Computer Engineering Student • Penn State</p>
          <p className="badge-description">Builder, competitor, full-stack & ML.</p>
          <p className="badge-company">Pennsylvania, USA</p>
          <a
            href="https://linkedin.com/in/vitaliypikalo"
            target="_blank"
            rel="noopener noreferrer"
            className="badge-link"
          >
            <FaLinkedin className="linkedin-icon" /> View Profile
          </a>
        </div>
      </div>
      <div className="contact-header">
        <p>I&apos;m always up for a chat or a coffee! Feel free to reach out.</p>
      </div>
      <div className="contact-details">
        <a href="mailto:vap5288@psu.edu" className="contact-item">
          <FaEnvelope className="contact-icon" style={{ color: "#e50914" }} />
          <span className="contact-link">vap5288@psu.edu</span>
        </a>
        <a href="https://github.com/Vitaliy-Pikalo" target="_blank" rel="noopener noreferrer" className="contact-item">
          <FaGithub className="contact-icon" style={{ color: "#e50914" }} />
          <span className="contact-link">github.com/Vitaliy-Pikalo</span>
        </a>
        <a href="https://linkedin.com/in/vitaliypikalo" target="_blank" rel="noopener noreferrer" className="contact-item">
          <FaLinkedin className="contact-icon" style={{ color: "#e50914" }} />
          <span className="contact-link">linkedin.com/in/vitaliypikalo</span>
        </a>
      </div>
      <p className="contact-fun">
        <span className="coffee-icon">☕</span> Or catch up over a coffee
      </p>
    </div>
  );
}

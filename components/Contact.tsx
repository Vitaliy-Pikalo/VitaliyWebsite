"use client";

const contactLinks = [
  { label: "Email", href: "mailto:vap5288@psu.edu", text: "vap5288@psu.edu" },
  { label: "GitHub", href: "https://github.com/Vitaliy-Pikalo", text: "github.com/Vitaliy-Pikalo" },
  { label: "LinkedIn", href: "https://linkedin.com/in/vitaliypikalo", text: "linkedin.com/in/vitaliypikalo" },
];

export default function Contact() {
  return (
    <section id="contact" className="section-row px-5 md:px-10 pt-6 pb-24">
      <h2 className="row-title">Contact</h2>
      <div className="space-y-3">
        {contactLinks.map((link, idx) => (
          <a
            key={idx}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="block text-gray-300 hover:text-white transition-colors"
          >
            <span className="font-semibold text-white">{link.label}:</span> {link.text}
          </a>
        ))}
      </div>
    </section>
  );
}

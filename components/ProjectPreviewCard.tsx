"use client";

type ProjectPreviewCardProps = {
  title: string;
  url: string;
  tech: string[];
  githubUrl?: string;
  liveUrl?: string;
  children: React.ReactNode; // the mock UI inside the browser frame
};

export default function ProjectPreviewCard({
  title,
  url,
  tech,
  githubUrl,
  liveUrl,
  children,
}: ProjectPreviewCardProps) {
  return (
    <div className="ppc-wrap">
      {/* browser chrome */}
      <div className="ppc-chrome">
        <div className="ppc-dots">
          <span className="ppc-dot ppc-dot-red" />
          <span className="ppc-dot ppc-dot-yellow" />
          <span className="ppc-dot ppc-dot-green" />
        </div>
        <div className="ppc-url">{url}</div>
      </div>

      {/* mock screen */}
      <div className="ppc-screen">{children}</div>

      {/* footer */}
      <div className="ppc-footer">
        <span className="ppc-title">{title}</span>
        <div className="ppc-tech-row">
          {tech.map((t) => (
            <span key={t} className="ppc-badge">{t}</span>
          ))}
        </div>
        <div className="ppc-links">
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="ppc-link">
              GitHub ↗
            </a>
          )}
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="ppc-link ppc-link-live">
              Live ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

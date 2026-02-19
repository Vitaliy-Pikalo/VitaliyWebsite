"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import CardImage from "@/components/CardImage";

const topPicksConfig: Record<string, { title: string; imgSrc: string; route: string }[]> = {
  recruiter: [
    { title: "Skills", imgSrc: "/categories/skills.png", route: "/skills" },
    { title: "Experience", imgSrc: "/categories/experience.png", route: "/work-experience" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", route: "/certifications" },
    { title: "Projects", imgSrc: "/categories/projects.png", route: "/projects" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", route: "/contact-me" },
  ],
  developer: [
    { title: "Skills", imgSrc: "/categories/skills.png", route: "/skills" },
    { title: "Projects", imgSrc: "/categories/projects.png", route: "/projects" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", route: "/certifications" },
    { title: "Experience", imgSrc: "/categories/experience.png", route: "/work-experience" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", route: "/contact-me" },
  ],
  stalker: [
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", route: "/contact-me" },
    { title: "Projects", imgSrc: "/categories/projects.png", route: "/projects" },
    { title: "Experience", imgSrc: "/categories/experience.png", route: "/work-experience" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", route: "/certifications" },
  ],
  adventurer: [
    { title: "Music", imgSrc: "/categories/music.png", route: "/music" },
    { title: "Projects", imgSrc: "/categories/projects.png", route: "/projects" },
    { title: "Reading", imgSrc: "/categories/reading.png", route: "/reading" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", route: "/contact-me" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", route: "/certifications" },
  ],
};

const continueWatchingConfig: Record<string, { title: string; imgSrc: string; link: string }[]> = {
  recruiter: [
    { title: "Music", imgSrc: "/categories/music.png", link: "/music" },
    { title: "Reading", imgSrc: "/categories/reading.png", link: "/reading" },
    { title: "Sports", imgSrc: "/categories/experience.png", link: "/sports" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", link: "/contact-me" },
  ],
  developer: [
    { title: "Music", imgSrc: "/categories/music.png", link: "/music" },
    { title: "Reading", imgSrc: "/categories/reading.png", link: "/reading" },
    { title: "Sports", imgSrc: "/categories/experience.png", link: "/sports" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", link: "/certifications" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", link: "/contact-me" },
  ],
  stalker: [
    { title: "Reading", imgSrc: "/categories/reading.png", link: "/reading" },
    { title: "Sports", imgSrc: "/categories/experience.png", link: "/sports" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", link: "/contact-me" },
  ],
  adventurer: [
    { title: "Music", imgSrc: "/categories/music.png", link: "/music" },
    { title: "Reading", imgSrc: "/categories/reading.png", link: "/reading" },
    { title: "Certifications", imgSrc: "/categories/certifications.png", link: "/certifications" },
    { title: "Contact Me", imgSrc: "/categories/contact-me.png", link: "/contact-me" },
  ],
};

const BANNER_HEADLINE = "Vitaliy Pikalo — Software Engineer & Computer Engineering Student";
const BANNER_SUMMARY = "Driven and competitive software engineer with a strong foundation in full-stack development, performance optimization, and data-driven systems. As a Penn State Computer Engineering student and collegiate athlete, I bring a disciplined, execution-focused mindset to building products that are both technically robust and user-centric.\n\nMy experience spans developing interactive web applications, algorithmic trading tools, and simulation platforms using technologies such as C++, Python, JavaScript, and modern web stacks. I've built projects ranging from social platforms with real-time communication features to lightweight, performance-constrained simulations like FlashTrades, a sub-15KB trading environment with custom data encoding and canvas-based rendering.\n\nI'm particularly interested in systems that combine real-time data, decision-making, and scalability — including financial technology, machine learning applications, and high-performance backend architectures. Beyond engineering, my background as a competitive tennis player shapes how I approach problem-solving: iterate quickly, measure results, and continuously improve.";
const RESUME_LINK = "#";
const LINKEDIN_LINK = "https://linkedin.com/in/vitaliypikalo";

function ProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const name = (params?.name as string) || "developer";
  const profile = ["recruiter", "developer", "stalker", "adventurer"].includes(name) ? name : "developer";
  const backgroundGif = searchParams?.get("gif") || "https://i.giphy.com/media/TFPdmm3rdzeZ0kP3zG/giphy.gif";

  const topPicks = topPicksConfig[profile] || topPicksConfig.developer;
  const continueWatching = continueWatchingConfig[profile] || continueWatchingConfig.developer;

  return (
    <>
      <div
        className="profile-banner"
        style={{ backgroundImage: `linear-gradient(to top, #141414 0%, transparent 50%), url(${backgroundGif})` }}
      >
        <div className="banner-content">
          <h1 className="banner-headline">{BANNER_HEADLINE}</h1>
          <p className="banner-description">{BANNER_SUMMARY}</p>
          <div className="banner-buttons">
            <a href={RESUME_LINK} target="_blank" rel="noopener noreferrer" className="play-button">
              Resume
            </a>
            <a href={LINKEDIN_LINK} target="_blank" rel="noopener noreferrer" className="info-button">
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      <div className="continue-watching-row">
        <h2 className="row-title">Continue Watching for {profile}</h2>
        <div className="card-row">
          {continueWatching.map((pick) => (
            <Link key={pick.title} href={pick.link} className="pick-card" style={{ textDecoration: "none" }}>
              <CardImage src={pick.imgSrc} alt={pick.title} className="pick-image" width={250} height={200} />
              <div className="overlay">
                <span className="pick-label">{pick.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="top-picks-row">
        <h2 className="row-title">Today&apos;s Top Picks for {profile}</h2>
        <div className="card-row">
          {topPicks.map((pick) => (
            <Link key={pick.title} href={pick.route} className="pick-card" style={{ textDecoration: "none" }}>
              <CardImage src={pick.imgSrc} alt={pick.title} className="pick-image" width={250} height={200} />
              <div className="overlay">
                <span className="pick-label">{pick.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="profile-banner" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
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

const BANNER_HEADLINE = "Vitaliy Pikalo — Penn State CompE · Dec 2027 · Builder · AMCC Tennis Champion";
const BANNER_SUMMARY = "I build high-performance software — ML systems, autonomous trading bots, and full-stack products that ship. Currently studying Computer Engineering at Penn State University Park (graduating Dec 2027).\n\nRecent work: Chess960-NN (AlphaZero-style engine, ~1600 Elo vs Stockfish), Kalshi Trading Bot (24/7 daemon, 270K+ market snapshots, live A/B experiments), and Bonfire (Flutter + Firebase + Groq LLM, multiplayer).\n\nExperience: Full-Stack Team Lead (10+ shipped apps, Stripe/Supabase/Firebase), Equity Analyst ($1.6M student fund), AI Teaching Assistant + AI Taskforce co-founder.\n\nStack: Python · C++ · Java · TypeScript · PyTorch · Flutter · Next.js · Supabase · Firebase · Stripe.\n\nUS citizen — eligible for cleared roles. AMCC tennis champion (17-0 singles). Dean's List Spring 2026.";
const RESUME_LINK = "/Vitaliy_Pikalo_resume.pdf";
const LINKEDIN_LINK = "https://linkedin.com/in/vitaliypikalo";

const profileBannerClass: Record<string, string> = {
  recruiter:  "banner-bg-recruiter",
  developer:  "banner-bg-developer",
  stalker:    "banner-bg-stalker",
  adventurer: "banner-bg-adventurer",
};

function ProfileContent() {
  const params = useParams();
  const name = (params?.name as string) || "developer";
  const profile = ["recruiter", "developer", "stalker", "adventurer"].includes(name) ? name : "developer";

  const topPicks = topPicksConfig[profile] || topPicksConfig.developer;
  const continueWatching = continueWatchingConfig[profile] || continueWatchingConfig.developer;
  const bannerBgClass = profileBannerClass[profile] || "banner-bg-developer";

  return (
    <>
      <div className={`profile-banner ${bannerBgClass}`}>
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
    <Suspense fallback={<div className="banner-bg-developer profile-banner" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

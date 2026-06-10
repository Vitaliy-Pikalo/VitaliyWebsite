"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import ProjectPreviewCard from "@/components/ProjectPreviewCard";

/* ─────────────────────────────────────── */
/*  Project mini-mocks (inline for perf)  */
/* ─────────────────────────────────────── */
function ChessMock() {
  const rows = [
    ["♜","♞","♝","♛","♚","♝","♞","♜"],
    ["♟","♟","♟","♟","♟","♟","♟","♟"],
    Array(8).fill(""),Array(8).fill(""),Array(8).fill(""),Array(8).fill(""),
    ["♙","♙","♙","♙","♙","♙","♙","♙"],
    ["♖","♘","♗","♕","♔","♗","♘","♖"],
  ];
  return (
    <div>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.map((piece, c) => (
            <div key={c} style={{ width:24,height:24,background:(r+c)%2===0?"#f0d9b5":"#b58863",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:r<2?"#1a1a1a":"#fff",flexShrink:0 }}>
              {piece}
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginTop:6,fontSize:"0.65rem",color:"#888" }}>~1600 Elo · RTX 3060 Ti</div>
    </div>
  );
}

function KalshiMock() {
  const bars = [42,61,38,75,55,80,67,90,72,85];
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
        <span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block" }}/>
        <span style={{ fontSize:"0.65rem",color:"#22c55e",fontFamily:"monospace" }}>LIVE · 270K+</span>
      </div>
      <div style={{ display:"flex",alignItems:"flex-end",gap:2,height:52 }}>
        {bars.map((h,i) => <div key={i} style={{ flex:1,height:`${h}%`,background:i===bars.length-1?"#e50914":"#333",borderRadius:2 }}/>)}
      </div>
      <div style={{ marginTop:6,fontSize:"0.65rem",color:"#888",fontFamily:"monospace" }}>A/B · SQLite WAL</div>
    </div>
  );
}

function BonfireMock() {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
      <div style={{ fontSize:"0.65rem",color:"#888",marginBottom:2 }}>Room: #wildcard · 3 players</div>
      {[{name:"Vitaliy",msg:"your turn 🎯",self:true},{name:"Alex",msg:"no way",self:false},{name:"AI",msg:"✨ Generating...",ai:true,self:false}].map(m=>(
        <div key={m.name} style={{ alignSelf:m.self?"flex-end":"flex-start",background:m.ai?"rgba(139,92,246,0.2)":m.self?"#e50914":"#2a2a2a",border:m.ai?"1px solid rgba(139,92,246,0.4)":"none",borderRadius:8,padding:"4px 8px",maxWidth:"85%" }}>
          <div style={{ fontSize:"0.55rem",color:m.self?"#ffaaaa":"#888",marginBottom:1 }}>{m.name}</div>
          <div style={{ fontSize:"0.68rem",color:"#fff" }}>{m.msg}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────── */
/*  Profile configs                        */
/* ─────────────────────────────────────── */
const RESUME_LINK    = "/Vitaliy_Pikalo_resume.pdf";
const LINKEDIN_LINK  = "https://linkedin.com/in/vitaliypikalo";
const GITHUB_LINK    = "https://github.com/Vitaliy-Pikalo";

const profileBannerClass: Record<string, string> = {
  recruiter:  "banner-bg-recruiter",
  developer:  "banner-bg-developer",
  stalker:    "banner-bg-stalker",
  adventurer: "banner-bg-adventurer",
};

const bannerCopy: Record<string, { headline: string; summary: string }> = {
  recruiter: {
    headline: "Vitaliy Pikalo — Penn State CompE · Dec 2027",
    summary:  "Full-Stack Team Lead (10+ shipped apps), Equity Analyst ($1.6M fund), AI Teaching Assistant. GPA 3.25 · Dean's List · US Citizen. Open to SWE, quant, and trading internships for Summer 2027.",
  },
  developer: {
    headline: "Builder · ML Engineer · System Designer",
    summary:  "I ship real things. Chess960-NN (~1600 Elo vs Stockfish), Kalshi Trading Bot (24/7, 270K+ snapshots), Bonfire (Flutter + Groq LLM). Stack: Python · C++ · PyTorch · Next.js · Flutter · Supabase.",
  },
  stalker: {
    headline: "Vitaliy Pikalo — Human Being",
    summary:  "AMCC tennis champion (17-0). Travelling to Fiji, Australia, and LA this summer. Into house music, Gunna, painting, and Stålenhag illustrations. Student Gov Senator. AI Taskforce co-founder.",
  },
  adventurer: {
    headline: "Competitor · Explorer · Creator",
    summary:  "NCAA D-III tennis (AMCC champion). Painting, Rubik's cubes, LEGO, Minecraft. Reading Neil Gaiman and Simon Stålenhag. Heading to Fiji, Australia, and LA this summer.",
  },
};

/* ─────────────────────────────────────── */
/*  Per-profile rendered content           */
/* ─────────────────────────────────────── */
function RecruiterContent() {
  return (
    <>
      <div className="profile-section">
        <h2 className="profile-row-title">Experience</h2>
        <div className="section-card-row">
          <SectionCard title="Work Experience" icon="💼" gradient="linear-gradient(135deg,#0a2a0a,#1a4a2a)" href="/work-experience" previews={["Full-Stack Team Lead","Equity Analyst · $1.6M fund","AI Teaching Assistant"]} accentColor="#22c55e" wide />
          <SectionCard title="Resume" icon="📄" gradient="linear-gradient(135deg,#1a0a0a,#3a1010)" href={RESUME_LINK} previews={["Download PDF","vap5288@psu.edu","Dec 2027 grad"]} accentColor="#e50914" />
          <SectionCard title="LinkedIn" icon="🔗" gradient="linear-gradient(135deg,#0a1628,#1b3a5c)" href={LINKEDIN_LINK} previews={["vitaliypikalo","Penn State CompE","Open to work"]} accentColor="#4fa3e0" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Credentials</h2>
        <div className="section-card-row">
          <SectionCard title="Skills" icon="⌨️" gradient="linear-gradient(135deg,#0a1a2a,#0f2a40)" href="/skills" previews={["Python · C++ · Java","PyTorch · Flutter · Next.js","Firebase · Supabase · Stripe"]} accentColor="#38bdf8" wide />
          <SectionCard title="Certifications" icon="🏆" gradient="linear-gradient(135deg,#1a1200,#3a2800)" href="/certifications" previews={["Bloomberg Market Concepts","Wall Street Prep (×6)","Financial Modeling"]} accentColor="#f59e0b" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Projects</h2>
        <div className="ppc-row">
          <ProjectPreviewCard title="Chess960-NN" url="chess960-nn.hf.space" tech={["PyTorch","MCTS","FastAPI"]} githubUrl={GITHUB_LINK} liveUrl="https://chess960-nn.hf.space"><ChessMock /></ProjectPreviewCard>
          <ProjectPreviewCard title="Kalshi Bot" url="kalshi-bot/dashboard" tech={["Python","SQLite","REST APIs"]} githubUrl="https://github.com/Vitaliy-Pikalo/kalshi-trading-bot"><KalshiMock /></ProjectPreviewCard>
          <ProjectPreviewCard title="Bonfire" url="bonfire-app.flutter" tech={["Flutter","Firebase","Groq"]} githubUrl={GITHUB_LINK}><BonfireMock /></ProjectPreviewCard>
        </div>
      </div>
    </>
  );
}

function DeveloperContent() {
  return (
    <>
      <div className="profile-section">
        <h2 className="profile-row-title">Projects</h2>
        <div className="ppc-row">
          <ProjectPreviewCard title="Chess960-NN" url="chess960-nn.hf.space" tech={["PyTorch","MCTS","FastAPI","ResNet"]} githubUrl={GITHUB_LINK} liveUrl="https://chess960-nn.hf.space"><ChessMock /></ProjectPreviewCard>
          <ProjectPreviewCard title="Kalshi Trading Bot" url="kalshi-bot/dashboard" tech={["Python","SQLite","REST APIs","scikit-learn"]} githubUrl="https://github.com/Vitaliy-Pikalo/kalshi-trading-bot"><KalshiMock /></ProjectPreviewCard>
          <ProjectPreviewCard title="Bonfire" url="bonfire-app.flutter" tech={["Flutter","Firebase","Groq LLM","Riverpod"]} githubUrl={GITHUB_LINK}><BonfireMock /></ProjectPreviewCard>
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Stack</h2>
        <div className="section-card-row">
          <SectionCard title="Skills" icon="⌨️" gradient="linear-gradient(135deg,#0a1a2a,#0f3460)" href="/skills" previews={["Python · C++ · Java · TypeScript","PyTorch · Flutter · Next.js","Firebase · Supabase · SQLite"]} accentColor="#38bdf8" wide />
          <SectionCard title="GitHub" icon="🐙" gradient="linear-gradient(135deg,#0f0f0f,#1a1a1a)" href={GITHUB_LINK} previews={["Vitaliy-Pikalo","Chess960-NN","kalshi-trading-bot"]} accentColor="#888" />
          <SectionCard title="Experience" icon="💼" gradient="linear-gradient(135deg,#0a2a0a,#1a4a2a)" href="/work-experience" previews={["Full-Stack Team Lead","Equity Analyst","AI TA"]} accentColor="#22c55e" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">More</h2>
        <div className="section-card-row">
          <SectionCard title="All Projects" icon="⚡" gradient="linear-gradient(135deg,#1a0000,#3a1010)" href="/projects" previews={["Chess960-NN","Kalshi Bot","Bonfire · FlashTrades"]} accentColor="#e50914" />
          <SectionCard title="Hire Me" icon="📬" gradient="linear-gradient(135deg,#0a0a1a,#1a1a3a)" href="/contact-me" previews={["vap5288@psu.edu","Open Summer 2027","US Citizen"]} accentColor="#a855f7" />
        </div>
      </div>
    </>
  );
}

function StalkerContent() {
  return (
    <>
      <div className="profile-section">
        <h2 className="profile-row-title">Music</h2>
        <div className="section-card-row">
          <SectionCard title="Music" icon="🎵" gradient="linear-gradient(135deg,#1a0533,#4a0e6e)" href="/music" previews={["Gunna · Don Toliver","Fisher · Chris Lake","Tech House · Rage Rap"]} accentColor="#a855f7" wide />
          <SectionCard title="Playlist" icon="▶️" gradient="linear-gradient(135deg,#0d0d0d,#1a0a0a)" href="https://music.youtube.com/playlist?list=PL1JnANQpaEfhmORSFuLjZW_epMNL0P6qc" previews={["YouTube Music","Mixed genres","Always updating"]} accentColor="#e50914" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Life</h2>
        <div className="section-card-row">
          <SectionCard title="Sports & Hobbies" icon="🎾" gradient="linear-gradient(135deg,#001a0a,#003a1a)" href="/sports" previews={["Tennis · Pickleball · Gym","Painting · Drawing · LEGO","Rubik's cube · Minecraft"]} accentColor="#22c55e" wide />
          <SectionCard title="Reading" icon="📖" gradient="linear-gradient(135deg,#1a1200,#3a2800)" href="/reading" previews={["Neil Gaiman","Kazu Kibuishi","Simon Stålenhag"]} accentColor="#f59e0b" />
          <SectionCard title="Travel" icon="🌍" gradient="linear-gradient(135deg,#001a1a,#003a3a)" href="/sports" previews={["Fiji 🇫🇯","Australia 🇦🇺","Los Angeles 🇺🇸"]} accentColor="#22d3ee" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Reach Me</h2>
        <div className="section-card-row">
          <SectionCard title="Contact" icon="📬" gradient="linear-gradient(135deg,#1a0a0a,#3a1010)" href="/contact-me" previews={["vap5288@psu.edu","LinkedIn · GitHub","Pittsburgh, PA"]} accentColor="#e50914" wide />
        </div>
      </div>
    </>
  );
}

function AdventurerContent() {
  return (
    <>
      <div className="profile-section">
        <h2 className="profile-row-title">Travel</h2>
        <div className="section-card-row">
          <SectionCard title="This Summer" icon="✈️" gradient="linear-gradient(135deg,#001a1a,#003a40)" href="/sports" previews={["Fiji 🇫🇯 — island life","Australia 🇦🇺 — Sydney","Los Angeles 🇺🇸 — the scene"]} accentColor="#22d3ee" wide />
          <SectionCard title="Sports & Life" icon="🎾" gradient="linear-gradient(135deg,#001a0a,#003a1a)" href="/sports" previews={["AMCC Champion 17-0","Pickleball · Gym · Run","Rubik's cube · LEGO"]} accentColor="#22c55e" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Reads & Listens</h2>
        <div className="section-card-row">
          <SectionCard title="Reading" icon="📖" gradient="linear-gradient(135deg,#1a1200,#3a2a10)" href="/reading" previews={["Neil Gaiman","Simon Stålenhag","Kazu Kibuishi · Amulet"]} accentColor="#f59e0b" />
          <SectionCard title="Music" icon="🎵" gradient="linear-gradient(135deg,#1a0533,#4a0e6e)" href="/music" previews={["Gunna · Don Toliver","Fisher · Fred Again..","Tech House"]} accentColor="#a855f7" />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-row-title">Also Me</h2>
        <div className="section-card-row">
          <SectionCard title="Projects" icon="⚡" gradient="linear-gradient(135deg,#1a0000,#3a1010)" href="/projects" previews={["Chess960-NN engine","Kalshi Trading Bot","Bonfire multiplayer"]} accentColor="#e50914" />
          <SectionCard title="Contact" icon="📬" gradient="linear-gradient(135deg,#0a0a1a,#1a1a3a)" href="/contact-me" previews={["vap5288@psu.edu","Pittsburgh, PA","Open Summer 2027"]} accentColor="#a855f7" />
        </div>
      </div>
    </>
  );
}

const profileContent: Record<string, React.FC> = {
  recruiter:  RecruiterContent,
  developer:  DeveloperContent,
  stalker:    StalkerContent,
  adventurer: AdventurerContent,
};

/* ─────────────────────────────────────── */
/*  Main page                              */
/* ─────────────────────────────────────── */
function ProfileContent() {
  const params = useParams();
  const name    = (params?.name as string) || "developer";
  const profile = ["recruiter","developer","stalker","adventurer"].includes(name) ? name : "developer";
  const copy    = bannerCopy[profile];
  const Content = profileContent[profile] || profileContent.developer;

  return (
    <>
      {/* Banner */}
      <div className={`profile-banner ${profileBannerClass[profile]}`}>
        <div className="banner-content">
          <h1 className="banner-headline">{copy.headline}</h1>
          <p className="banner-description">{copy.summary}</p>
          <div className="banner-buttons">
            <a href={RESUME_LINK} target="_blank" rel="noopener noreferrer" className="play-button">
              Resume ↓
            </a>
            <a href={LINKEDIN_LINK} target="_blank" rel="noopener noreferrer" className="info-button">
              LinkedIn ↗
            </a>
            <a href={GITHUB_LINK} target="_blank" rel="noopener noreferrer" className="info-button">
              GitHub ↗
            </a>
          </div>
        </div>
      </div>

      {/* Profile-specific content */}
      <div style={{ paddingBottom: 80 }}>
        <Content />
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="banner-bg-developer profile-banner" style={{ minHeight:"50vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
        Loading...
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MdWork } from "react-icons/md";
import CategoryHeroImage from "@/components/CategoryHeroImage";

const VerticalTimeline = dynamic(
  () => import("react-vertical-timeline-component").then((mod) => mod.VerticalTimeline),
  { ssr: false }
);
const VerticalTimelineElement = dynamic(
  () => import("react-vertical-timeline-component").then((mod) => mod.VerticalTimelineElement),
  { ssr: false }
);

import "react-vertical-timeline-component/style.min.css";

const timeline = [
  {
    timelineType: "work",
    title: "Full-Stack Team Lead",
    name: "Freelance",
    techStack: "Next.js, Supabase, Firebase, Stripe, TypeScript",
    summaryPoints:
      "Led development of 10+ client apps. Architected payment flows, auth systems, and real-time data pipelines. Managed client relationships and end-to-end delivery.",
  },
  {
    timelineType: "work",
    title: "Equity Analyst",
    name: "Penn State Investment Association — $1.6M Fund",
    techStack: "DCF modeling, comparable analysis, equity research",
    summaryPoints:
      "Covered equities in a student-managed $1.6M AUM fund. Built financial models and presented buy/sell recommendations. Focused on tech and growth sectors.",
  },
  {
    timelineType: "work",
    title: "AI Teaching Assistant",
    name: "Penn State Behrend",
    techStack: "Python, PyTorch, ML fundamentals",
    summaryPoints:
      "Supported AI/ML coursework and student debugging. Co-founded the university AI Taskforce to drive AI curriculum development across the college.",
  },
  {
    timelineType: "education",
    title: "B.S. Computer Engineering",
    name: "Penn State University Park — Dec 2027",
    techStack: "Systems, AI, algorithms, embedded systems",
    summaryPoints:
      "Transferring to University Park. Dean's List Spring 2026. Varsity tennis (AMCC Champion, 17-0 singles). Student Government Senator.",
  },
];

export default function WorkExperiencePage() {
  return (
    <div className="timeline-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <CategoryHeroImage src="/categories/experience.png" alt="Experience" />
      <h1 className="timeline-title">Work Experience & Education Timeline</h1>
      <VerticalTimeline lineColor="#e50914">
        {timeline.map((item, index) => (
          <VerticalTimelineElement
            key={index}
            className="vertical-timeline-element--work"
            contentStyle={{ background: "#1e1e1e", color: "#fff" }}
            contentArrowStyle={{ borderRight: "7px solid #1e1e1e" }}
            iconStyle={{ background: "#e50914", color: "#fff" }}
            icon={<MdWork />}
          >
            <h3 className="vertical-timeline-element-title">{item.title}</h3>
            <h4>{item.name}</h4>
            <p>🔧 {item.techStack}</p>
            <p>{item.summaryPoints}</p>
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </div>
  );
}

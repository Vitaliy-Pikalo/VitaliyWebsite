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
    title: "Computer Engineering Student & Student-Athlete",
    name: "Penn State University",
    techStack: "Software engineering, systems, AI",
    summaryPoints: "Compete on tennis team, active in robotics and chess clubs.",
  },
  {
    timelineType: "work",
    title: "Tennis Coach",
    name: "Independent",
    techStack: "Coaching, training programs",
    summaryPoints: "Coach juniors, design drills, manage scheduling and client relationships.",
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

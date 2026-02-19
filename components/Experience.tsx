"use client";

const experiences = [
  {
    title: "Computer Engineering Student & Student-Athlete",
    organization: "Penn State University",
    bullets: [
      "Compete on the tennis team while completing rigorous engineering coursework",
      "Active in robotics and chess clubs",
      "Focus on software engineering, systems, and AI",
    ],
  },
  {
    title: "Tennis Coach",
    organization: "Independent",
    bullets: [
      "Coach junior players and beginners",
      "Design structured drills and training programs",
      "Manage scheduling and client relationships",
    ],
  },
];

export default function Experience() {
  return (
    <section id="experience" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Experience</h2>
      <div className="space-y-8">
        {experiences.map((exp, idx) => (
          <div key={idx} className="border-l-2 border-gray-700 pl-6">
            <h3 className="text-xl font-semibold text-white mb-1">{exp.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{exp.organization}</p>
            <ul className="text-gray-300 text-sm space-y-1">
              {exp.bullets.map((b, i) => (
                <li key={i} className="flex">
                  <span className="text-white mr-2">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

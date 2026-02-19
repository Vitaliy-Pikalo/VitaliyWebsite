"use client";

const skills = {
  languages: ["C++", "Python", "JavaScript", "SQL"],
  technicalAreas: [
    "Full-Stack Development",
    "Machine Learning",
    "Algorithms & Data Structures",
    "Performance Optimization",
  ],
  tools: ["Git & GitHub", "Data pipelines", "Canvas rendering"],
};

export default function Skills() {
  return (
    <section id="skills" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Skills</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {skills.languages.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-white/5 border border-gray-700 rounded text-white text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3">Technical Areas</h3>
          <div className="flex flex-wrap gap-2">
            {skills.technicalAreas.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-white/5 border border-gray-700 rounded text-white text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3">Tools</h3>
          <div className="flex flex-wrap gap-2">
            {skills.tools.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-white/5 border border-gray-700 rounded text-white text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

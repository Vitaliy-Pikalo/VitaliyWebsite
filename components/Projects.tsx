"use client";

const projects = [
  {
    title: "Sports Social Platform",
    description:
      "A mobile-first platform combining competitive and recreational sports with messaging, achievements, and AI-driven highlight feeds.",
  },
  {
    title: "Stock Trading Algorithm",
    description:
      "A data-driven trading system that scrapes sentiment and search trends to generate trading signals.",
  },
  {
    title: "Poker Strategy Bot",
    description:
      "A simulation of my personal Texas Hold'em strategy with probability-based decision logic.",
  },
  {
    title: "Tennis Booking App",
    description:
      "A scheduling and booking platform focused on quick reservations.",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Projects</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 md:-mx-10 md:px-10">
        {projects.map((p, idx) => (
          <div
            key={idx}
            className="pick-card flex-shrink-0 w-[250px] h-[200px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 bg-[#333] group"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#222] to-[#444] flex flex-col justify-end p-4 group-hover:scale-105 transition-transform duration-300">
              <h3 className="text-white font-bold text-lg">{p.title}</h3>
              <p className="text-gray-400 text-sm line-clamp-2">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

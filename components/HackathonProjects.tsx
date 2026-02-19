"use client";

const hackathonProjects = [
  {
    title: "SwipeHire",
    subtitle: "Resume Swiper for Recruiters",
    description:
      "A recruiting platform with a swipe-based interface where recruiters can swipe left or right, star candidates, view hiring history, and send emails directly.",
    link: null,
  },
  {
    title: "FlashTrades",
    subtitle: "Lightweight Educational Day-Trading Simulator",
    description:
      "Browser-based trading simulator under 15 KB with no runtime API calls. Includes multiplayer sessions and leaderboards.",
    link: "https://flashtrades.netlify.app",
  },
];

export default function HackathonProjects() {
  return (
    <section id="hackathon" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Hackathon Projects</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 md:-mx-10 md:px-10">
        {hackathonProjects.map((p, idx) => (
          <div
            key={idx}
            className="pick-card flex-shrink-0 w-[250px] h-[200px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 bg-[#333] group"
          >
            <a
              href={p.link || "#"}
              target={p.link ? "_blank" : undefined}
              rel={p.link ? "noopener noreferrer" : undefined}
              className="block w-full h-full"
            >
              <div className="w-full h-full bg-gradient-to-br from-[#222] to-[#444] flex flex-col justify-end p-4 group-hover:scale-105 transition-transform duration-300">
                <h3 className="text-white font-bold text-lg">{p.title}</h3>
                <p className="text-gray-400 text-xs mb-1">{p.subtitle}</p>
                <p className="text-gray-500 text-sm line-clamp-2">{p.description}</p>
                {p.link && (
                  <span className="text-[#e50914] text-sm mt-1">View project →</span>
                )}
              </div>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

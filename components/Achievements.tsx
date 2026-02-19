"use client";

const achievements = [
  "Penn State tennis team player",
  "High school team captain and MVP",
  "PIAA singles qualifier",
  "Multiple tournament podium finishes",
];

export default function Achievements() {
  return (
    <section id="achievements" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Achievements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {achievements.map((a, idx) => (
          <div
            key={idx}
            className="p-4 border border-gray-800 bg-black/30 rounded text-gray-300 text-sm"
          >
            {a}
          </div>
        ))}
      </div>
    </section>
  );
}

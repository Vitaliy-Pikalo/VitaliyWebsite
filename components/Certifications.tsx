"use client";

const certifications = [
  {
    provider: "Bloomberg",
    items: ["Bloomberg Market Concepts"],
  },
  {
    provider: "Wall Street Prep",
    items: [
      "Financial Statement Modeling",
      "Trading Comps Modeling",
      "Analyzing Financial Reports",
      "Accounting & Financial Statement Analysis",
      "Microsoft Excel",
      "PowerPoint Training",
    ],
  },
];

export default function Certifications() {
  return (
    <section id="certifications" className="section-row px-5 md:px-10 pt-6">
      <h2 className="row-title">Certifications</h2>
      <div className="space-y-6">
        {certifications.map((c, idx) => (
          <div key={idx} className="border-l-2 border-gray-700 pl-6">
            <h3 className="text-lg font-semibold text-white mb-3">{c.provider}</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              {c.items.map((item, i) => (
                <li key={i} className="flex">
                  <span className="text-white mr-2">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

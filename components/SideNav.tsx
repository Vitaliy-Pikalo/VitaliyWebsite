"use client";

import { useEffect, useState } from "react";

export const sections = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "open-source", label: "Open source" },
  { id: "beyond", label: "Beyond code" },
] as const;

// Highlights the section currently in view.
export default function SideNav() {
  const [active, setActive] = useState<string>("about");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Sections" className="hidden lg:block">
      <ul className="mt-14 space-y-1">
        {sections.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex items-center gap-4 py-2 text-sm"
              >
                <span
                  aria-hidden
                  className={`h-px transition-all duration-200 ${
                    isActive
                      ? "w-16 bg-gold"
                      : "w-8 bg-stone-edge group-hover:w-16 group-hover:bg-bone"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    isActive ? "text-bone" : "text-muted group-hover:text-bone"
                  }`}
                >
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

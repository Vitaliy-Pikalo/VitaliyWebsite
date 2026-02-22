"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NetflixTitle() {
  const [isClicked, setIsClicked] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    if (isClicked) return;
    const audio = new Audio("/audio/netflix-intro.mp3");
    audio.play().catch((err) => console.warn("Intro audio:", err));
    setIsClicked(true);
  };

  useEffect(() => {
    if (isClicked) {
      const timer = setTimeout(() => {
        router.push("/browse");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isClicked, router]);

  return (
    <div className="netflix-container">
      <div
        className={`netflix-logo ${isClicked ? "animate" : ""}`}
        onClick={!isClicked ? handleClick : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isClicked && (e.key === "Enter" || e.key === " ")) handleClick();
        }}
      >
        Vitaliy Pikalo
      </div>
    </div>
  );
}

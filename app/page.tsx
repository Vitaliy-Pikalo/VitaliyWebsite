"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NetflixTitle() {
  const [isClicked, setIsClicked] = useState(false);
  const [hint, setHint] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setHint(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleClick = () => {
    if (isClicked) return;
    const audio = new Audio("/audio/netflix-intro.mp3");
    audio.play().catch(() => {});
    setIsClicked(true);
  };

  useEffect(() => {
    if (isClicked) {
      const timer = setTimeout(() => router.push("/browse"), 3200);
      return () => clearTimeout(timer);
    }
  }, [isClicked, router]);

  return (
    <div className="netflix-container" onClick={!isClicked ? handleClick : undefined}>
      {/* subtle scanline texture */}
      <div className="scanlines" aria-hidden />

      <div
        className={`netflix-logo ${isClicked ? "animate" : ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isClicked && (e.key === "Enter" || e.key === " ")) handleClick();
        }}
      >
        VP
      </div>

      <p className={`intro-name ${isClicked ? "fade-out" : hint ? "fade-in" : ""}`}>
        Vitaliy Pikalo
      </p>

      <p className={`intro-hint ${isClicked ? "fade-out" : hint ? "fade-in" : ""}`}>
        click anywhere to enter
      </p>
    </div>
  );
}

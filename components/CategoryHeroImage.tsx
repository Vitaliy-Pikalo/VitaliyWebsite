"use client";

import { useState } from "react";

type Props = { src: string; alt: string };

export default function CategoryHeroImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="category-hero-image category-hero-placeholder" aria-hidden>
        <span>{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="category-hero-image"
      onError={() => setFailed(true)}
    />
  );
}

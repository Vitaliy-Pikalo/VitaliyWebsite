"use client";

import { useState } from "react";

type Props = { src: string; alt: string; className?: string; width?: number; height?: number };

export default function CardImage({ src, alt, className = "", width = 250, height = 200 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} card-image-placeholder`.trim()}
        style={{ width, height }}
        aria-hidden
      >
        <span>{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
}

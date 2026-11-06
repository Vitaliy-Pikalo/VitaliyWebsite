"use client";

import { useEffect, useRef } from "react";
import type { MapInfo, MinimapState } from "@/lib/game/engine";

// The minimap is rotated 45° so its "up" matches the isometric camera.
// World (x, z) -> minimap (u, v): u = (x - z) / sqrt2, v = (x + z) / sqrt2.
const S = Math.SQRT2;
const toMini = (x: number, z: number) => ({ u: (x - z) / S, v: (x + z) / S });
const toWorld = (u: number, v: number) => ({ x: (u + v) / S, z: (v - u) / S });

type Props = {
  map: MapInfo;
  state: MinimapState;
  onFocus: (x: number, z: number) => void;
  onOrder: (x: number, z: number) => void;
  size?: number;
};

export default function Minimap({ map, state, onFocus, onOrder, size = 148 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const extent = map.half * S; // half-diagonal of the rotated square
  const scale = size / (2 * extent);
  const px = (x: number, z: number) => {
    const { u, v } = toMini(x, z);
    return { x: (u + extent) * scale, y: (v + extent) * scale };
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== size * dpr) {
      c.width = size * dpr;
      c.height = size * dpr;
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);

    // Ground diamond.
    const corners = [
      px(-map.half, -map.half),
      px(map.half, -map.half),
      px(map.half, map.half),
      px(-map.half, map.half),
    ];
    g.beginPath();
    corners.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = "#3f5f2e";
    g.fill();

    // Road and arena.
    g.fillStyle = "#8a6a42";
    for (const r of map.road) {
      const p = px(r.x, r.z);
      g.beginPath();
      g.arc(p.x, p.y, 2.1 * scale * 1.1, 0, Math.PI * 2);
      g.fill();
    }
    const a = px(map.arena.x, map.arena.z);
    g.beginPath();
    g.arc(a.x, a.y, map.arena.r * scale, 0, Math.PI * 2);
    g.fillStyle = "#8c8a80";
    g.fill();

    // Shrines.
    for (const s of state.shrines) {
      const p = px(s.x, s.z);
      g.fillStyle = s.visited ? "#5b5f69" : s.color;
      g.fillRect(p.x - 3, p.y - 3, 6, 6);
    }

    // Boss.
    if (state.boss.alive) {
      const p = px(state.boss.x, state.boss.z);
      g.beginPath();
      g.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      g.fillStyle = "#e0503c";
      g.fill();
    }

    // Stone shards.
    g.fillStyle = "#e0705c";
    for (const sh of state.shards) {
      const p = px(sh.x, sh.z);
      g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    // Units.
    for (const u of state.units) {
      const p = px(u.x, u.z);
      g.beginPath();
      g.arc(p.x, p.y, u.kind === "hero" ? 3.2 : 2.4, 0, Math.PI * 2);
      g.fillStyle = u.kind === "hero" ? "#e3c06a" : "#9cd67e";
      g.fill();
      if (u.selected) {
        g.lineWidth = 1;
        g.strokeStyle = "#ffffff";
        g.stroke();
      }
    }

    // Camera footprint.
    g.beginPath();
    state.view.forEach((v, i) => {
      const p = px(v.x, v.z);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.closePath();
    g.lineWidth = 1;
    g.strokeStyle = "rgba(230, 223, 203, 0.9)";
    g.stroke();
  });

  const worldFromEvent = (e: React.PointerEvent | React.MouseEvent) => {
    const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const u = (e.clientX - r.left) / scale - extent;
    const v = (e.clientY - r.top) / scale - extent;
    return toWorld(u, v);
  };

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="minimap"
      aria-label="Minimap. Click to move the camera, right-click to send selected units."
      onPointerDown={(e) => {
        if (e.button === 0) {
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          const w = worldFromEvent(e);
          onFocus(w.x, w.z);
        }
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) {
          const w = worldFromEvent(e);
          onFocus(w.x, w.z);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const w = worldFromEvent(e);
        onOrder(w.x, w.z);
      }}
    />
  );
}

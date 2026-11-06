import type { UnitKind } from "./story";

// Unit balance. Kept out of the engine so the HUD can read it without loading three.js.

export type Stats = {
  hp: number;
  dmg: number;
  cd: number; // seconds between attacks
  range: number;
  speed: number;
  body: string;
  trim: string;
  scale: number;
  ranged?: boolean;
  heal?: number;
  crit?: number;
};
export const STATS: Record<UnitKind, Stats> = {
  hero: { hp: 560, dmg: 20, cd: 1.0, range: 1.6, speed: 6.2, body: "#2f4f8f", trim: "#c9a24a", scale: 1.15 },
  engineer: { hp: 540, dmg: 14, cd: 1.0, range: 1.5, speed: 5.4, body: "#5d6b4a", trim: "#7e9a63", scale: 1.1 },
  strategist: { hp: 230, dmg: 34, cd: 1.9, range: 7, speed: 5.0, body: "#3b5a86", trim: "#8fb3e0", scale: 0.95, ranged: true },
  quant: { hp: 210, dmg: 11, cd: 0.55, range: 7.5, speed: 5.8, body: "#6b5a2e", trim: "#e3c06a", scale: 0.95, ranged: true, crit: 0.25 },
  banner: { hp: 260, dmg: 0, cd: 1.8, range: 7, speed: 5.2, body: "#7a3d3d", trim: "#c97b7b", scale: 1.0, heal: 30 },
  builder: { hp: 320, dmg: 10, cd: 1.1, range: 1.5, speed: 5.0, body: "#4d3d66", trim: "#b08ad6", scale: 1.0 },
};

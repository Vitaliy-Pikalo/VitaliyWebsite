import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { UnitKind } from "./story";
import { STATS } from "./units";

// Low-poly, jointed character models with procedural animation.
// Everything is built from primitives so the game ships with no model files.

const mat = (color: string, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}

/** Only parts big enough to matter cast shadows; tiny details would just add draw calls. */
function trimShadows(root: THREE.Object3D, minSize: number) {
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox!).getSize(size);
    o.castShadow = Math.max(size.x, size.y, size.z) >= minSize;
  });
}

/** Shared vertex-colored materials, keyed by the non-color properties of the parts they replace. */
const bakedMats = new Map<string, THREE.MeshLambertMaterial>();

/**
 * Merge the static parts under each joint into as few meshes as possible, so a unit draws in
 * a handful of calls instead of ~27. Joints (groups) stay separate, so animation is unchanged.
 * With `bakeColors`, plain parts of any color merge into one vertex-colored mesh per joint;
 * otherwise parts merge only when they share a material object (the giant recolors its
 * `stone` material at runtime, so its materials must survive).
 */
function mergeParts(root: THREE.Object3D, bakeColors: boolean) {
  const nodes: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) nodes.push(o);
  });
  const color = new THREE.Color();
  for (const node of nodes) {
    const buckets = new Map<string, { mat: THREE.Material; parts: THREE.Mesh[]; bake: boolean }>();
    for (const c of node.children) {
      if (!(c instanceof THREE.Mesh) || c.children.length || Array.isArray(c.material)) continue;
      const m = c.material as THREE.MeshLambertMaterial;
      const plain = bakeColors && m.type === "MeshLambertMaterial" && !m.transparent && !m.map && m.emissive.getHex() === 0;
      const key = plain ? "bake" : m.uuid;
      const b = buckets.get(key) ?? { mat: m, parts: [], bake: plain };
      b.parts.push(c);
      buckets.set(key, b);
    }
    for (const { mat: m, parts, bake } of buckets.values()) {
      if (parts.length < 2) continue;
      const geos = parts.map((c) => {
        c.updateMatrix();
        const g = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
        if (bake) {
          color.copy((c.material as THREE.MeshLambertMaterial).color);
          const n = g.attributes.position.count;
          const arr = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) color.toArray(arr, i * 3);
          g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        }
        return g;
      });
      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      let material: THREE.Material = m;
      if (bake) {
        const flat = (m as THREE.MeshLambertMaterial).flatShading;
        const k = `lambert|${flat}`;
        if (!bakedMats.has(k)) bakedMats.set(k, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat }));
        material = bakedMats.get(k)!;
      }
      const out = new THREE.Mesh(merged, material);
      out.castShadow = parts.some((c) => c.castShadow);
      out.receiveShadow = parts.some((c) => c.receiveShadow);
      for (const c of parts) {
        node.remove(c);
        c.geometry.dispose();
      }
      node.add(out);
    }
  }
}

/* ------------------------------------------------------------------ units */

export type UnitRig = {
  root: THREE.Group;
  body: THREE.Group; // everything that bobs
  legL: THREE.Group;
  legR: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  cape: THREE.Group | null;
};

export type UnitAnim = {
  phase: number; // walk cycle
  move: number; // 0 idle -> 1 walking, smoothed
  moved: boolean; // set by the engine when the unit stepped this frame
  attack: number; // seconds left in the current swing or cast
  attackDur: number;
  t: number;
};

export const newAnim = (): UnitAnim => ({ phase: Math.random() * 6, move: 0, moved: false, attack: 0, attackDur: 0.35, t: Math.random() * 10 });

const SKIN = "#d2a57e";
const LEATHER = "#5a3d24";
const STEEL = "#cfd3d8";
const WOOD = "#7a5432";

export function buildUnit(kind: UnitKind): UnitRig {
  const st = STATS[kind];
  const body = mat(st.body);
  const bodyDark = mat(new THREE.Color(st.body).multiplyScalar(0.7).getStyle());
  const trim = mat(st.trim);
  const skin = mat(SKIN);
  const boots = mat("#3b2a1c");

  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  root.add(bodyG);

  // Legs pivot at the hips.
  const hipY = 0.78;
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(0.15 * side, hipY, 0);
    g.add(mesh(new THREE.BoxGeometry(0.21, 0.56, 0.24), bodyDark, 0, -0.28, 0));
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.22, 0.32), boots, 0, -0.67, 0.04));
    bodyG.add(g);
    return g;
  };
  const legL = leg(-1);
  const legR = leg(1);

  // Torso.
  const torso = new THREE.Group();
  torso.position.y = hipY;
  bodyG.add(torso);
  const chest = mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.66, 6), body, 0, 0.36, 0);
  torso.add(chest);
  torso.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 6), mat(LEATHER), 0, 0.06, 0)); // belt
  torso.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), trim, 0, 0.06, 0.28)); // buckle
  for (const side of [-1, 1]) torso.add(mesh(new THREE.BoxGeometry(0.26, 0.12, 0.34), trim, 0.33 * side, 0.68, 0)); // pauldrons

  // Head.
  const head = new THREE.Group();
  head.position.y = 0.78;
  torso.add(head);
  head.add(mesh(new THREE.IcosahedronGeometry(0.2, 1), skin, 0, 0.18, 0));
  head.add(mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), mat("#2a2a2a"), -0.07, 0.2, 0.18));
  head.add(mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), mat("#2a2a2a"), 0.07, 0.2, 0.18));

  // Arms pivot at the shoulders; a hand marks where tools attach.
  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(0.4 * side, 0.62, 0);
    g.add(mesh(new THREE.BoxGeometry(0.15, 0.5, 0.17), body, 0, -0.25, 0));
    g.add(mesh(new THREE.BoxGeometry(0.15, 0.13, 0.15), skin, 0, -0.56, 0));
    torso.add(g);
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);

  // Cape hangs from the shoulders.
  let cape: THREE.Group | null = null;
  if (kind !== "quant" && kind !== "builder") {
    cape = new THREE.Group();
    cape.position.set(0, 0.66, -0.2);
    const cloth = mesh(new THREE.BoxGeometry(0.56, 0.9, 0.04), trim, 0, -0.45, 0);
    cape.add(cloth);
    torso.add(cape);
  }

  // Class gear.
  const hand = (g: THREE.Group, o: THREE.Object3D) => {
    o.position.y -= 0.58;
    g.add(o);
  };
  if (kind === "hero") {
    head.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.16, 7), trim, 0, 0.3, 0)); // helm band
    head.add(mesh(new THREE.ConeGeometry(0.22, 0.24, 7), mat(STEEL), 0, 0.48, 0)); // helm top
    head.add(mesh(new THREE.BoxGeometry(0.05, 0.16, 0.34), mat("#b0413e"), 0, 0.62, -0.04)); // plume
    const sword = new THREE.Group();
    sword.add(mesh(new THREE.BoxGeometry(0.07, 0.95, 0.03), mat(STEEL, { emissive: "#6b7b8c", emissiveIntensity: 0.2 }), 0, -0.45, 0.12));
    sword.add(mesh(new THREE.BoxGeometry(0.3, 0.05, 0.07), trim, 0, 0.02, 0.12));
    sword.add(mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), mat(LEATHER), 0, 0.1, 0.12));
    sword.rotation.x = Math.PI; // blade points forward-up when the arm swings
    sword.position.z = 0.05;
    hand(armR, sword);
    const shield = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), trim);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.1, 0.1, 0.05);
    hand(armL, shield);
  } else if (kind === "engineer") {
    head.add(mesh(new THREE.SphereGeometry(0.24, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat("#d9b23a"), 0, 0.24, 0)); // hard hat
    head.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10), mat("#d9b23a"), 0, 0.24, 0.02));
    const tower = mesh(new THREE.BoxGeometry(0.08, 0.72, 0.5), trim);
    tower.position.set(-0.08, 0.15, 0.1);
    hand(armL, tower);
    const hammer = new THREE.Group();
    hammer.add(mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), mat(WOOD), 0, -0.2, 0.1));
    hammer.add(mesh(new THREE.BoxGeometry(0.2, 0.18, 0.32), mat("#8c8f94"), 0, -0.5, 0.1));
    hand(armR, hammer);
  } else if (kind === "strategist") {
    head.add(mesh(new THREE.ConeGeometry(0.26, 0.55, 7), body, 0, 0.55, -0.03)); // pointed hat
    head.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 10), body, 0, 0.3, 0));
    bodyG.add(mesh(new THREE.ConeGeometry(0.42, 0.85, 7, 1, true), body, 0, 0.42, 0)); // robe skirt
    const staff = new THREE.Group();
    staff.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.6, 5), mat(WOOD), 0, 0.2, 0.08));
    staff.add(mesh(new THREE.OctahedronGeometry(0.13), mat(st.trim, { emissive: st.trim, emissiveIntensity: 1.4 }), 0, 1.05, 0.08));
    hand(armR, staff);
  } else if (kind === "quant") {
    head.add(mesh(new THREE.ConeGeometry(0.27, 0.42, 7), mat("#4a3a20"), 0, 0.33, -0.06)); // hood
    torso.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), mat(LEATHER), 0.12, 0.45, -0.25)); // quiver
    const bow = new THREE.Group();
    const arc = mesh(new THREE.TorusGeometry(0.45, 0.03, 4, 12, Math.PI), mat(WOOD));
    arc.rotation.set(0, Math.PI / 2, Math.PI / 2);
    bow.add(arc);
    bow.add(mesh(new THREE.BoxGeometry(0.01, 0.9, 0.01), mat("#e6dfcb"), 0, 0, -0.0));
    bow.position.z = 0.15;
    hand(armL, bow);
  } else if (kind === "banner") {
    head.add(mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.12, 7), trim, 0, 0.3, 0)); // circlet
    const pole = new THREE.Group();
    pole.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 5), mat(WOOD), 0, 0.55, 0.06));
    pole.add(mesh(new THREE.BoxGeometry(0.02, 0.6, 0.46), trim, 0, 1.3, 0.3));
    pole.add(mesh(new THREE.OctahedronGeometry(0.08), mat("#e3c06a", { emissive: "#e3c06a", emissiveIntensity: 0.8 }), 0, 1.75, 0.06));
    hand(armR, pole);
  } else if (kind === "builder") {
    head.add(mesh(new THREE.BoxGeometry(0.36, 0.07, 0.06), mat("#2a2a2a"), 0, 0.24, 0.16)); // goggle band
    for (const side of [-1, 1]) head.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), mat("#8fb3e0", { emissive: "#8fb3e0", emissiveIntensity: 0.4 }), 0.08 * side, 0.24, 0.19).rotateX(Math.PI / 2));
    torso.add(mesh(new THREE.BoxGeometry(0.46, 0.52, 0.28), mat("#7a5c3a"), 0, 0.42, -0.3)); // backpack
    torso.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat("#8c8f94"), 0.18, 0.75, -0.32)); // rolled plans
    const wrench = new THREE.Group();
    wrench.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat("#8c8f94"), 0, -0.2, 0.1));
    wrench.add(mesh(new THREE.TorusGeometry(0.09, 0.03, 4, 8, Math.PI * 1.5), mat("#8c8f94"), 0, -0.48, 0.1));
    hand(armR, wrench);
  }

  root.scale.setScalar(st.scale);
  trimShadows(root, 0.45);
  mergeParts(root, true);
  return { root, body: bodyG, legL, legR, torso, head, armL, armR, cape };
}

const ease = (x: number) => x * x * (3 - 2 * x);

/** Procedural animation: walk cycle, idle breathing, and a swing or cast when attacking. */
export function animateUnit(r: UnitRig, a: UnitAnim, kind: UnitKind, dt: number) {
  a.t += dt;
  a.move += ((a.moved ? 1 : 0) - a.move) * Math.min(1, dt * 10);
  if (a.moved) a.phase += dt * 11;
  a.moved = false;
  a.attack = Math.max(0, a.attack - dt);

  const m = a.move;
  const s = Math.sin(a.phase);
  r.legL.rotation.x = s * 0.7 * m;
  r.legR.rotation.x = -s * 0.7 * m;
  r.body.position.y = Math.abs(Math.cos(a.phase)) * 0.05 * m;
  r.torso.rotation.x = 0.08 * m;
  r.torso.scale.y = 1 + Math.sin(a.t * 2.2) * 0.012 * (1 - m);
  r.head.rotation.y = Math.sin(a.t * 0.7) * 0.15 * (1 - m);

  let armL = -s * 0.45 * m;
  let armR = s * 0.45 * m;
  let armLz = 0;
  if (a.attack > 0) {
    const p = 1 - a.attack / a.attackDur; // 0 -> 1 over the action
    if (kind === "quant") {
      armL = -1.5; // bow forward
      armR = p < 0.6 ? -1.3 + p * 0.6 : -0.8; // draw and release
      armLz = 0.2;
    } else if (kind === "strategist" || kind === "banner") {
      const lift = p < 0.45 ? ease(p / 0.45) : 1 - ease((p - 0.45) / 0.55);
      armR = -0.4 - 2.2 * lift; // raise staff or banner overhead
      armL = -0.9 * lift;
    } else {
      // Melee: wind up overhead, then strike down and forward.
      armR = p < 0.4 ? -2.5 * ease(p / 0.4) : -2.5 + 3.0 * ease((p - 0.4) / 0.6);
      r.torso.rotation.y = (p < 0.4 ? -0.3 : 0.3) * Math.sin(p * Math.PI);
    }
  } else {
    r.torso.rotation.y *= 0.85;
    if (kind === "quant") armL = Math.min(armL, -0.25); // keeps the bow off the ground
  }
  r.armL.rotation.x = armL;
  r.armL.rotation.z = armLz;
  r.armR.rotation.x = armR;
  if (r.cape) r.cape.rotation.x = 0.08 + m * 0.45 + Math.sin(a.phase * 0.5 + a.t) * 0.06;
}

/* ------------------------------------------------------------------ giant */

export type GiantRig = {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  glow: THREE.MeshLambertMaterial[]; // cracks and eyes
  stone: THREE.MeshLambertMaterial;
};

export type GiantAnim = {
  phase: number;
  move: number;
  moved: boolean;
  punch: number; // seconds left in a punch
  slam: number; // 0..1 wind-up progress while a slam is telegraphed
  impact: number; // seconds left in the slam follow-through
  stun: number;
  dead: number; // 0..1 fall progress
  t: number;
  skin: boolean; // stone skin active
};

export const newGiantAnim = (): GiantAnim => ({ phase: 0, move: 0, moved: false, punch: 0, slam: 0, impact: 0, stun: 0, dead: 0, t: 0, skin: false });

export function buildGiant(): GiantRig {
  const stone = mat("#7a786e");
  const dark = mat("#5c5a52");
  const moss = mat("#4f6b38");
  const glowA = mat("#e0503c", { emissive: "#ff7a3c", emissiveIntensity: 1.2 });
  const glowEye = mat("#ffd36b", { emissive: "#ffd36b", emissiveIntensity: 1.8 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hipY = 1.8;
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(0.68 * side, hipY, 0);
    g.add(mesh(new THREE.BoxGeometry(0.85, 1.0, 0.9), dark, 0, -0.45, 0));
    g.add(mesh(new THREE.BoxGeometry(0.75, 0.75, 0.8), stone, 0, -1.2, 0.05));
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.3, 1.15), dark, 0, -1.65, 0.15));
    body.add(g);
    return g;
  };
  const legL = leg(-1);
  const legR = leg(1);

  const torso = new THREE.Group();
  torso.position.y = hipY;
  body.add(torso);
  torso.add(mesh(new THREE.BoxGeometry(1.7, 0.7, 1.2), dark, 0, 0.3, 0)); // waist
  const chest = mesh(new THREE.BoxGeometry(2.5, 1.5, 1.5), stone, 0, 1.25, 0.05);
  chest.rotation.x = 0.08;
  torso.add(chest);
  torso.add(mesh(new THREE.BoxGeometry(2.6, 0.25, 1.1), moss, 0, 2.05, -0.2)); // moss on the shoulders
  for (const side of [-1, 1]) {
    const boulder = mesh(new THREE.DodecahedronGeometry(0.62, 0), stone, 1.42 * side, 1.95, 0);
    boulder.rotation.set(0.4, 0.7 * side, 0.2);
    torso.add(boulder);
  }
  // Glowing cracks across the chest.
  const crack = (x: number, y: number, w: number, rz: number) => {
    const c = mesh(new THREE.BoxGeometry(w, 0.07, 0.04), glowA, x, y, 0.82);
    c.rotation.z = rz;
    c.castShadow = false;
    torso.add(c);
  };
  crack(-0.35, 1.35, 0.7, 0.5);
  crack(0.1, 1.05, 0.55, -0.4);
  crack(0.45, 1.45, 0.45, 0.9);
  crack(-0.05, 0.75, 0.4, 0.2);

  const head = new THREE.Group();
  head.position.set(0, 2.05, 0.25);
  torso.add(head);
  head.add(mesh(new THREE.BoxGeometry(0.95, 0.8, 0.9), stone, 0, 0.35, 0));
  head.add(mesh(new THREE.BoxGeometry(1.05, 0.18, 0.4), dark, 0, 0.6, 0.3)); // brow
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), glowEye, 0.22 * side, 0.43, 0.46);
    eye.castShadow = false;
    head.add(eye);
  }

  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(1.55 * side, 1.65, 0);
    g.add(mesh(new THREE.BoxGeometry(0.72, 1.1, 0.75), dark, 0, -0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.0, 0.82), stone, 0, -1.45, 0.05));
    const fist = mesh(new THREE.DodecahedronGeometry(0.62, 0), stone, 0, -2.1, 0.1);
    fist.rotation.set(0.3, 0.5, 0);
    g.add(fist);
    torso.add(g);
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);

  root.scale.setScalar(1.25);
  trimShadows(root, 0.5);
  mergeParts(root, false);
  return { root, body, legL, legR, torso, head, armL, armR, glow: [glowA, glowEye], stone };
}

export function animateGiant(r: GiantRig, a: GiantAnim, dt: number) {
  a.t += dt;
  a.move += ((a.moved ? 1 : 0) - a.move) * Math.min(1, dt * 6);
  if (a.moved) a.phase += dt * 5;
  a.moved = false;
  a.punch = Math.max(0, a.punch - dt);
  a.impact = Math.max(0, a.impact - dt);

  if (a.dead > 0) {
    // Topple backwards and settle.
    a.dead = Math.min(1, a.dead + dt * 0.9);
    const k = ease(a.dead);
    r.body.rotation.x = -1.35 * k;
    r.body.position.y = -0.6 * k;
    r.armL.rotation.x = -2.4 * k;
    r.armR.rotation.x = -2.2 * k;
    r.glow.forEach((g) => (g.emissiveIntensity = Math.max(0, g.emissiveIntensity - dt * 1.5)));
    return;
  }

  const m = a.move;
  const s = Math.sin(a.phase);
  r.legL.rotation.x = s * 0.45 * m;
  r.legR.rotation.x = -s * 0.45 * m;
  r.body.position.y = Math.abs(Math.cos(a.phase)) * 0.12 * m;
  r.torso.rotation.z = Math.sin(a.phase) * 0.04 * m;
  r.torso.rotation.x = 0.06 + Math.sin(a.t * 1.3) * 0.02;
  r.head.rotation.y = Math.sin(a.t * 0.5) * 0.2;

  let armL = -s * 0.3 * m;
  let armR = s * 0.3 * m;

  if (a.slam > 0) {
    // Raise both fists overhead while the red circle fills.
    const k = ease(Math.min(1, a.slam));
    armL = armR = -2.9 * k;
    r.torso.rotation.x = 0.06 - 0.35 * k;
    r.body.position.y = 0.15 * k;
  } else if (a.impact > 0) {
    // Slam down hard, then recover.
    const k = a.impact / 0.45;
    armL = armR = -0.7 * k;
    r.torso.rotation.x = 0.06 + 0.45 * k;
    r.body.position.y = -0.2 * k;
  } else if (a.punch > 0) {
    const p = 1 - a.punch / 0.55;
    armR = p < 0.45 ? -2.3 * ease(p / 0.45) : -2.3 + 2.0 * ease((p - 0.45) / 0.55);
    r.torso.rotation.y = 0.25 * Math.sin(p * Math.PI);
  } else {
    r.torso.rotation.y *= 0.9;
  }

  if (a.stun > 0) {
    a.stun = Math.max(0, a.stun - dt);
    r.head.rotation.z = Math.sin(a.t * 18) * 0.15;
    r.body.rotation.z = Math.sin(a.t * 14) * 0.05;
    armL = armR = 0.25;
  } else {
    r.head.rotation.z *= 0.8;
    r.body.rotation.z *= 0.8;
  }

  r.armL.rotation.x = armL;
  r.armR.rotation.x = armR;

  // Cracks pulse; they go dark under stone skin, which greys the giant.
  const pulse = 1 + Math.sin(a.t * 4) * 0.25;
  r.glow[0].emissiveIntensity = a.skin ? 0.1 : 1.2 * pulse;
  r.glow[1].emissiveIntensity = a.skin ? 0.6 : 1.8;
  r.stone.color.lerp(new THREE.Color(a.skin ? "#a7a59d" : "#7a786e"), Math.min(1, dt * 4));
}

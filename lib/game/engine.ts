import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { animateGiant, animateUnit, buildGiant, buildUnit, newAnim, newGiantAnim, type GiantAnim, type GiantRig, type UnitAnim, type UnitRig } from "./models";
import type { GameAudio, SfxName } from "./audio";
import { animateBraziers, buildBrazier, glowSprite, Particles, type Brazier } from "./fx";
import { NavGrid, type Point } from "./nav";
import { abilities, barks, boss as bossDef, shrines, type AbilityId, type Shrine, type UnitKind } from "./story";
import { STATS } from "./units";

/* ------------------------------------------------------------------ types */

export type Status = "explore" | "fight" | "won" | "lost";
export type Difficulty = "story" | "veteran";
export type OrderType = "idle" | "follow" | "move" | "attackMove" | "attack" | "hold";

export type UnitInfo = { id: number; kind: UnitKind; hp: number; max: number; order: OrderType; selected: boolean };

export type MinimapState = {
  units: { x: number; z: number; kind: UnitKind; selected: boolean }[];
  boss: { x: number; z: number; alive: boolean };
  shards: { x: number; z: number }[];
  shrines: { x: number; z: number; visited: boolean; color: string }[];
  view: Point[]; // camera footprint on the ground, 4 corners
};

export type HudState = {
  heroHp: number;
  heroMax: number;
  warband: UnitInfo[]; // recruits, in recruit order
  selection: UnitInfo[];
  bossHp: number;
  bossMax: number;
  bossAggro: boolean;
  stoneSkin: boolean; // the giant takes reduced damage while shards live
  shards: number;
  marked: { id: number; kind: UnitKind } | null; // unit targeted by an incoming boulder
  difficulty: Difficulty;
  abilities: Record<AbilityId, { cd: number; max: number; unlocked: boolean }>;
  kellyLeft: number; // seconds left on the damage buff
  fallen: number; // recruits the Medical Drone can bring back
  status: Status;
  pendingAttackMove: boolean;
  followCamera: boolean;
  groups: number[];
  minimap: MinimapState;
};

export type MapInfo = { half: number; road: Point[]; arena: { x: number; z: number; r: number } };

export type EngineCallbacks = {
  onHud: (s: HudState) => void;
  onShrine: (s: Shrine) => void;
  onBossAggro: () => void;
  onEnd: (result: "won" | "lost") => void;
};

const BOSS = { dmg: 44, cd: 1.6, radius: 1.7, speed: 3.4, slamEvery: 6.5, slamWindup: 1.7, slamRadius: 5.5, slamDmg: 130 };
const ABILITY = {
  drone: { cd: 28, heal: 0.15, revive: 0.3 },
  checkmate: { cd: 10, dmg: 170, stun: 1.6, range: 14 },
  kelly: { cd: 20, duration: 6, mult: 1.5 },
};
const SHARD = { cd: 1.2, speed: 3.8, radius: 0.7 };
// Starts below 85% boss health. The zone fills red for `fill` seconds, then the boulder flies for `flight`.
const BOULDER = { radius: 1.8, from: 0.85, fill: 3, flight: 0.45 };
const WAVES = [0.55, 0.25]; // boss health fractions that summon shards
const STONE_SKIN = 0.5; // damage multiplier on the giant while shards live
// Per-difficulty tuning. Story is meant to be won by selecting everyone and attacking.
const DIFF = {
  story: { bossHp: 2600, incoming: 0.6, boulderEvery: 12, boulderDmg: 170, shardHp: 130, shardDmg: 16, waves: [3, 2] },
  veteran: { bossHp: 3200, incoming: 1.2, boulderEvery: 9, boulderDmg: 230, shardHp: 170, shardDmg: 24, waves: [5, 4] },
};
const MAP = 40;
// Camera faces north (the boss is at the top of the screen), tilted 55° down like Warcraft III.
// `view` is how many world units fit in the visible area between the HUD bars; wheel/keys zoom it.
const CAM = { pitch: THREE.MathUtils.degToRad(55), dist: 36, view: 22, min: 14, max: 36 };
const ACQUIRE = 9; // idle units engage the boss inside this distance
const UNIT_RADIUS = 0.45;

type Unit = {
  id: number;
  kind: UnitKind;
  group: THREE.Group;
  hp: number;
  max: number;
  atk: number;
  order: OrderType;
  path: THREE.Vector3[];
  repath: number;
  target: Target | null;
  slot: THREE.Vector3;
  hpBar: THREE.Group;
  hpFill: THREE.Mesh;
  ring: THREE.Mesh;
  rig: UnitRig;
  anim: UnitAnim;
};

type Shard = { id: number; group: THREE.Group; hp: number; max: number; atk: number; hpBar: THREE.Group; hpFill: THREE.Mesh };
type Target = "boss" | Shard;
type Boulder = { target: Unit; at: THREE.Vector3; from: THREE.Vector3; t: number; ring: THREE.Mesh; fill: THREE.Mesh; rock: THREE.Mesh; launched: boolean };
type Fade = { obj: THREE.Object3D; age: number; life: number; from?: THREE.Vector3; to?: THREE.Vector3 };
type Projectile = { mesh: THREE.Mesh; target: Target; dmg: number; crit: boolean; speed: number };
type Fx = { mesh: THREE.Mesh; age: number; life: number; grow: number };
type Floater = { el: HTMLDivElement; pos: THREE.Vector3; age: number; life: number; rise: number };
type Drag =
  | { kind: "box"; x0: number; y0: number; x1: number; y1: number; active: boolean; shift: boolean }
  | { kind: "pan"; x: number; y: number; moved: number; pointerType: string }
  | null;

/* ---------------------------------------------------------------- helpers */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flat = (color: string, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function v2(x: number, z: number) {
  return new THREE.Vector3(x, 0, z);
}

function distXZ(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/* ----------------------------------------------------------------- engine */

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private timer = new THREE.Timer();
  private raf = 0;
  private view = CAM.view;
  private insets = { top: 0, bottom: 0 }; // px covered by the HUD bars
  private camTarget = new THREE.Vector3();
  private followCam = true;
  private keysHeld = new Set<string>();
  private mouse: { x: number; y: number; inside: boolean } = { x: 0, y: 0, inside: false };

  private nav = new NavGrid(MAP + 4, 1);
  private heightGrid = { segs: 2, size: 1, data: new Float32Array(4) };
  private roadPts: THREE.Vector3[] = [];
  private nextId = 1;

  private hero!: Unit;
  private allies: Unit[] = [];
  private selected = new Set<Unit>();
  private groups = new Map<number, Unit[]>();
  private lastGroupTap = { n: -1, t: 0 };
  private pendingAttackMove = false;
  private drag: Drag = null;
  private boxEl: HTMLDivElement;

  private bossGroup!: THREE.Group;
  private bossRig!: GiantRig;
  private bossAnim: GiantAnim = newGiantAnim();
  private bossHp = DIFF.story.bossHp;
  private bossAtk = 0;
  private diff: Difficulty = "story";
  private shards: Shard[] = [];
  private wavesDone = 0;
  private boulder: Boulder | null = null;
  private boulderTimer = 4;
  private bossSlam = BOSS.slamEvery;
  private bossAggro = false;
  private bossDead = false;
  private bossHpBar!: THREE.Group;
  private bossHpFill!: THREE.Mesh;
  private telegraph: { ring: THREE.Mesh; fill: THREE.Mesh; t: number; at: THREE.Vector3 } | null = null;
  private scroll: THREE.Group | null = null;

  private shrineMeshes = new Map<string, { rune: THREE.Mesh; glow: THREE.Mesh; halo: THREE.Sprite }>();
  private particles = new Particles(600);
  private braziers: Brazier[] = [];
  private visited = new Set<string>();
  private projectiles: Projectile[] = [];
  private fx: Fx[] = [];
  private floaters: Floater[] = [];
  private marker: THREE.Mesh;

  private cds: Record<AbilityId, number> = { drone: 0, checkmate: 0, kelly: 0 };
  private kellyLeft = 0;
  private bossStun = 0;
  private fallen: Unit[] = [];
  private fades: Fade[] = [];
  private paused = false;
  private status: Status = "explore";
  private hudTimer = 0;
  private resizeObs: ResizeObserver;
  private disposed = false;
  private lowPower = false;
  private sun!: THREE.DirectionalLight;
  private shadowExtent = 0;
  // Adaptive resolution: if frames run slow, step the pixel ratio down (never back up).
  // `acc` is the start time (ms) of the current measuring window.
  private perf = { acc: 0, frames: 0, ratio: 1 };
  private audio: GameAudio | null = null;
  private lastBark = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private overlay: HTMLDivElement,
    private cb: EngineCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    // Phones and tablets get a lighter render: lower pixel ratio and shadow resolution.
    this.lowPower = window.matchMedia("(pointer: coarse)").matches;
    this.perf.ratio = Math.min(window.devicePixelRatio, this.lowPower ? 1.5 : 2);
    this.renderer.setPixelRatio(this.perf.ratio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color("#161b26");
    this.scene.fog = new THREE.Fog("#161b26", 60, 110);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    this.addLights();
    this.buildWorld();
    this.scene.add(this.particles.mesh);
    this.hero = this.spawn("hero", v2(0, 32), new THREE.Vector3());
    this.hero.order = "idle";
    this.setSelection([this.hero], false);
    this.camTarget.copy(this.hero.group.position);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 32),
      new THREE.MeshBasicMaterial({ color: "#7cd16b", transparent: true, opacity: 0, depthWrite: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.17;
    this.scene.add(this.marker);

    this.boxEl = document.createElement("div");
    this.boxEl.className = "select-box";
    this.boxEl.style.display = "none";
    overlay.appendChild(this.boxEl);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    document.documentElement.addEventListener("mouseleave", this.onPointerLeave);
    canvas.addEventListener("contextmenu", this.onContext);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);

    this.loop();
  }

  /* ------------------------------------------------------------ public api */

  get mapInfo(): MapInfo {
    return {
      half: MAP + 4,
      road: this.roadPts.map((p) => ({ x: p.x, z: p.z })),
      arena: { x: bossDef.arena[0], z: bossDef.arena[1], r: 12 },
    };
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.drag = null;
      this.boxEl.style.display = "none";
      this.keysHeld.clear();
    }
  }

  setDifficulty(d: Difficulty) {
    this.diff = d;
    if (!this.bossAggro) this.bossHp = this.maxBossHp;
    this.emitHud();
  }

  private get maxBossHp() {
    return DIFF[this.diff].bossHp;
  }

  recruitFrom(shrineId: string) {
    const s = shrines.find((x) => x.id === shrineId);
    if (!s || this.visited.has(shrineId)) return;
    this.visited.add(shrineId);
    const m = this.shrineMeshes.get(shrineId);
    if (m) {
      (m.rune.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.15;
      m.glow.visible = false;
      m.halo.visible = false;
    }
    const slots = [v2(-1.8, 1.8), v2(1.8, 1.8), v2(-1.8, 3.6), v2(1.8, 3.6), v2(0, 3.2)];
    const at = this.nav.nearestOpen({ x: s.at[0] + 2.2, z: s.at[1] + 2.2 });
    const unit = this.spawn(s.recruit, v2(at.x, at.z), slots[this.allies.length % slots.length]);
    this.allies.push(unit);
    this.ring(unit.group.position, s.rune, 3, 0.8);
    this.snd("recruit");
    this.particles.burst(unit.group.position.clone().setY(0.5), { count: 26, color: [s.rune, "#ffffff"], speed: 2.5, up: 5, gravity: 6, life: 1.1 });
    this.emitHud();
  }

  setAudio(a: GameAudio) {
    this.audio = a;
  }

  /** Plays an effect panned to where it happens on screen; quieter when off-screen. */
  private snd(name: SfxName, at?: THREE.Vector3, gain = 1, dur?: number) {
    if (!this.audio) return;
    let pan = 0;
    if (at) {
      const p = at.clone().project(this.camera);
      pan = THREE.MathUtils.clamp(p.x, -1, 1) * 0.7;
      if (Math.abs(p.x) > 1.15 || Math.abs(p.y) > 1.15) gain *= 0.35;
    }
    this.audio.sfx(name, { pan, gain, dur });
  }

  /** A unit acknowledges a selection or an order (rate-limited). */
  private bark(u: Unit, kind: "select" | "order") {
    const now = performance.now();
    if (now - this.lastBark < 1600) return;
    this.lastBark = now;
    const lines = barks[u.kind][kind];
    const line = lines[Math.floor(Math.random() * lines.length)];
    this.float(u.group.position.clone().setY(2.9), line, "bark");
    this.audio?.speak(u.kind, line);
  }

  isUnlocked(a: AbilityId) {
    return this.visited.has(abilities[a].unlock);
  }

  /** Casts one of Vitaliy's abilities. Returns false if it couldn't be cast. */
  cast(a: AbilityId) {
    if (this.over() || this.paused || this.hero.hp <= 0) return false;
    if (!this.isUnlocked(a) || this.cds[a] > 0) {
      this.snd("locked");
      return false;
    }
    const hp = this.hero.group.position;
    if (a === "drone") {
      const revived = this.fallen.pop();
      if (revived) {
        const at = this.nav.nearestOpen({ x: hp.x + 1.6, z: hp.z + 1.6 });
        revived.hp = Math.round(revived.max * ABILITY.drone.revive);
        revived.group.position.set(at.x, this.groundY(at.x, at.z), at.z);
        revived.order = "follow";
        revived.path = [];
        revived.target = null;
        revived.ring.visible = false;
        this.scene.add(revived.group);
        this.ring(revived.group.position, "#9cd67e", 2.2, 0.8);
        this.particles.burst(revived.group.position.clone().setY(0.4), { count: 28, color: ["#9cd67e", "#f2e8c9"], speed: 1.6, up: 5.5, gravity: 3, life: 1.3 });
        this.float(revived.group.position, "Revived", "heal");
      }
      for (const u of this.party()) {
        const amt = Math.min(u.max - u.hp, Math.round(u.max * ABILITY.drone.heal));
        u.hp += amt;
        if (amt > 0) this.float(u.group.position, `+${amt}`, "heal");
        this.ring(u.group.position, "#9cd67e", 1.4, 0.5);
        this.particles.burst(u.group.position.clone().setY(0.6), { count: 7, color: "#9cd67e", speed: 0.6, up: 3, gravity: 1, life: 1 });
      }
      this.flyDrone(hp, revived ? revived.group.position : hp);
    } else if (a === "checkmate") {
      const t = this.nearestEnemy(hp, ABILITY.checkmate.range);
      if (!t) {
        this.snd("locked");
        return false;
      }
      const tp = this.targetPos(t).clone();
      this.beam(tp);
      this.hitTarget(t, ABILITY.checkmate.dmg * this.dmgMult(), true);
      if (t === "boss" && !this.bossDead) {
        this.bossStun = ABILITY.checkmate.stun;
        if (this.telegraph) this.clearTelegraph();
        this.bossSlam = Math.max(this.bossSlam, 3);
        this.float(tp.clone().setY(5.5), "Checkmate", "crit");
      }
    } else {
      this.kellyLeft = ABILITY.kelly.duration;
      for (const u of this.party()) {
        this.ring(u.group.position, "#e3c06a", 1.6, 0.6);
        this.particles.burst(u.group.position.clone().setY(0.8), { count: 8, color: ["#e3c06a", "#fff3c4"], speed: 1, up: 3.5, gravity: 2, life: 0.9, size: 0.1 });
      }
      this.float(hp.clone().setY(3), "Kelly bet: 1.5x", "crit");
    }
    this.cds[a] = ABILITY[a].cd;
    this.snd(a, hp);
    this.hero.anim.attack = this.hero.anim.attackDur = 0.45;
    this.emitHud();
    return true;
  }

  private dmgMult() {
    return this.kellyLeft > 0 ? ABILITY.kelly.mult : 1;
  }

  /** Commands for the HUD's command card. */
  command(type: "stop" | "hold" | "attackMove" | "cancel") {
    if (this.paused || this.over()) return;
    const units = this.selectedAlive();
    if (type === "attackMove") {
      this.pendingAttackMove = units.length > 0;
      this.canvas.style.cursor = this.pendingAttackMove ? "crosshair" : "";
    } else if (type === "cancel") {
      this.pendingAttackMove = false;
      this.canvas.style.cursor = "";
    } else {
      for (const u of units) {
        u.order = type === "stop" ? "idle" : "hold";
        u.path = [];
        u.target = null;
      }
    }
    this.emitHud();
  }

  selectAll() {
    this.setSelection(this.party());
  }

  selectHero(center = false) {
    if (this.hero.hp <= 0) return;
    this.setSelection([this.hero]);
    if (center) this.followCam = true;
  }

  /** Select one unit by id; with `add`, toggle it in the current selection. */
  selectUnit(id: number, add = false) {
    const u = this.party().find((x) => x.id === id);
    if (!u) return;
    if (add) {
      const next = new Set(this.selected);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      this.setSelection([...next]);
    } else {
      this.setSelection([u]);
    }
  }

  centerOnSelection() {
    this.followCam = true;
    this.emitHud();
  }

  /** Move the camera to a world point (minimap click). */
  focus(x: number, z: number) {
    this.followCam = false;
    this.camTarget.set(THREE.MathUtils.clamp(x, -MAP, MAP), 0, THREE.MathUtils.clamp(z, -MAP, MAP));
    this.emitHud();
  }

  /** Order the selection to a world point (minimap right-click). */
  orderTo(x: number, z: number) {
    if (this.paused || this.over()) return;
    this.issueMove(v2(x, z), this.pendingAttackMove);
    this.command("cancel");
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    document.documentElement.removeEventListener("mouseleave", this.onPointerLeave);
    this.canvas.removeEventListener("contextmenu", this.onContext);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.floaters.forEach((f) => f.el.remove());
    this.boxEl.remove();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.scene.traverse((o) => {
      if (o instanceof THREE.Sprite) o.material.dispose(); // the shared glow texture is cached and reused
    });
    this.renderer.dispose();
  }

  /* ----------------------------------------------------------- test hooks */

  /** Order the hero alone to walk to a world position. */
  debugMoveTo(x: number, z: number) {
    this.order([this.hero], v2(x, z), "move");
  }

  debugState() {
    return {
      hero: this.hero.group.position.toArray(),
      status: this.status,
      bossHp: this.bossHp,
      allies: this.allies.length,
      paused: this.paused,
      selected: [...this.selected].map((u) => u.kind),
      units: this.party().map((u) => ({ kind: u.kind, x: u.group.position.x, z: u.group.position.z, order: u.order })),
      followCam: this.followCam,
      cam: [this.camTarget.x, this.camTarget.z],
      shards: this.shards.map((sh) => ({ x: sh.group.position.x, z: sh.group.position.z, hp: sh.hp })),
      marked: this.boulder ? { kind: this.boulder.target.kind, at: [this.boulder.at.x, this.boulder.at.z] } : null,
      difficulty: this.diff,
      slam: this.telegraph ? [this.telegraph.at.x, this.telegraph.at.z] : null,
    };
  }

  /** Screen position (CSS pixels, relative to the canvas) of a world point. */
  debugProject(x: number, y: number, z: number) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((p.x + 1) / 2) * this.canvas.clientWidth, y: ((1 - p.y) / 2) * this.canvas.clientHeight };
  }

  /** Test hook: recruit every shrine's unit and place the party just outside the arena. */
  debugSkipToBoss() {
    for (const sh of shrines) this.recruitFrom(sh.id);
    const party = this.party();
    party.forEach((u, i) => {
      const at = this.nav.nearestOpen({ x: (i % 3) * 1.4 - 1.4, z: -12 + Math.floor(i / 3) * 1.4 });
      u.group.position.set(at.x, this.groundY(at.x, at.z), at.z);
      u.path = [];
      u.order = u === this.hero ? "idle" : "follow";
    });
    this.camTarget.copy(this.hero.group.position);
  }

  /** Test hook: attack a target with the given unit kinds ("boss" or a shard index). */
  debugAttack(kinds: UnitKind[], target: "boss" | number) {
    const t: Target | undefined = target === "boss" ? "boss" : this.shards[target];
    if (!t) return;
    for (const u of this.party().filter((x) => kinds.includes(x.kind))) {
      u.order = "attack";
      u.target = t;
      u.path = [];
    }
  }

  /** Test hook: order the given unit kinds to a point. */
  debugMoveKinds(kinds: UnitKind[], x: number, z: number) {
    this.order(this.party().filter((u) => kinds.includes(u.kind)), v2(x, z), "move");
  }

  /** Number of units currently standing inside a blocked nav cell. */
  debugUnitsInObstacles() {
    return this.party().filter((u) => this.nav.isBlocked(u.group.position.x, u.group.position.z)).length;
  }

  /* ---------------------------------------------------------------- input */

  private over() {
    return this.status === "won" || this.status === "lost";
  }

  private onContext = (e: Event) => e.preventDefault();

  private onBlur = () => this.keysHeld.clear();

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.paused) return;
    // Trackpads: two-finger scroll pans, pinch (sent as ctrl+wheel) zooms. Mouse wheels zoom in steps.
    const trackpad = !e.ctrlKey && e.deltaMode === 0 && (e.deltaX !== 0 || Math.abs(e.deltaY) < 40 || !Number.isInteger(e.deltaY));
    if (trackpad) {
      this.panPixels(-e.deltaX, -e.deltaY);
    } else if (e.ctrlKey) {
      this.zoomBy(Math.exp(e.deltaY * 0.01));
    } else {
      this.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12);
    }
  };

  private zoomBy(f: number) {
    this.view = THREE.MathUtils.clamp(this.view * f, CAM.min, CAM.max);
    this.resize();
  }

  /** Pixels covered by the HUD at the top and bottom, so the camera centers on the open area. */
  setInsets(top: number, bottom: number) {
    this.insets = { top: Math.max(0, top), bottom: Math.max(0, bottom) };
    this.resize();
  }

  private local(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.paused || this.over()) return;
    const p = this.local(e);
    if (e.pointerType === "touch") {
      this.drag = { kind: "pan", x: p.x, y: p.y, moved: 0, pointerType: "touch" };
      return;
    }
    if (e.button === 1) {
      e.preventDefault();
      this.drag = { kind: "pan", x: p.x, y: p.y, moved: 0, pointerType: "mouse" };
    } else if (e.button === 0) {
      this.drag = { kind: "box", x0: p.x, y0: p.y, x1: p.x, y1: p.y, active: false, shift: e.shiftKey };
    } else if (e.button === 2) {
      this.rightClick(p);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.local(e);
    if (e.pointerType === "mouse") {
      this.mouse = { x: e.clientX, y: e.clientY, inside: true };
    }
    const d = this.drag;
    if (!d) return;
    if (d.kind === "pan") {
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      d.moved += Math.abs(dx) + Math.abs(dy);
      if (d.pointerType !== "touch" || d.moved > 10) this.panPixels(dx, dy);
      d.x = p.x;
      d.y = p.y;
    } else {
      d.x1 = p.x;
      d.y1 = p.y;
      if (!d.active && Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 6) d.active = true;
      if (d.active) {
        Object.assign(this.boxEl.style, {
          display: "block",
          left: `${Math.min(d.x0, d.x1)}px`,
          top: `${Math.min(d.y0, d.y1)}px`,
          width: `${Math.abs(d.x1 - d.x0)}px`,
          height: `${Math.abs(d.y1 - d.y0)}px`,
        });
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    this.boxEl.style.display = "none";
    if (!d || this.paused || this.over()) return;
    if (d.kind === "pan") {
      if (d.pointerType === "touch" && d.moved <= 10) this.leftClick(this.local(e), false);
      return;
    }
    if (d.active) this.boxSelect(d.x0, d.y0, d.x1, d.y1, d.shift);
    else this.leftClick({ x: d.x0, y: d.y0 }, d.shift);
  };

  private onPointerLeave = () => {
    this.mouse.inside = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (this.paused) return;
    const k = e.key.toLowerCase();

    if (k.startsWith("arrow")) {
      e.preventDefault();
      this.keysHeld.add(k);
      this.followCam = false;
      return;
    }
    if (/^[1-9]$/.test(k)) {
      const n = Number(k);
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const units = this.selectedAlive();
        if (units.length) this.groups.set(n, units);
      } else {
        const g = (this.groups.get(n) ?? []).filter((u) => u.hp > 0);
        if (g.length) {
          this.setSelection(g);
          const now = performance.now();
          if (this.lastGroupTap.n === n && now - this.lastGroupTap.t < 350) this.followCam = true;
          this.lastGroupTap = { n, t: now };
        }
      }
      this.emitHud();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === "a") {
      e.preventDefault();
      this.selectAll();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (k) {
      case "q":
        this.cast("drone");
        break;
      case "w":
        this.cast("checkmate");
        break;
      case "e":
        this.cast("kelly");
        break;
      case "a":
        this.command("attackMove");
        break;
      case "s":
        this.command("stop");
        break;
      case "h":
        this.command("hold");
        break;
      case "escape":
        this.command("cancel");
        break;
      case "=":
      case "+":
        this.zoomBy(1 / 1.15);
        break;
      case "-":
      case "_":
        this.zoomBy(1.15);
        break;
      case "`":
        this.selectAll();
        break;
      case "f1":
        e.preventDefault();
        this.selectHero(true);
        break;
      case " ":
        if (t && t.tagName === "BUTTON") return;
        e.preventDefault();
        this.centerOnSelection();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.key.toLowerCase());
  };

  private groundAt(p: { x: number; y: number }) {
    const ndc = new THREE.Vector2((p.x / this.canvas.clientWidth) * 2 - 1, -(p.y / this.canvas.clientHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    hit.x = THREE.MathUtils.clamp(hit.x, -MAP, MAP);
    hit.z = THREE.MathUtils.clamp(hit.z, -MAP, MAP);
    return hit;
  }

  private screenOf(v: THREE.Vector3, y: number) {
    const p = v.clone().setY(y).project(this.camera);
    return { x: ((p.x + 1) / 2) * this.canvas.clientWidth, y: ((1 - p.y) / 2) * this.canvas.clientHeight };
  }

  private pixelsPerUnit() {
    return this.canvas.clientWidth / (this.camera.right - this.camera.left);
  }

  private pickUnit(p: { x: number; y: number }) {
    const radius = Math.max(16, 0.9 * this.pixelsPerUnit());
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const u of this.party()) {
      const s = this.screenOf(u.group.position, 0.9);
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < radius && d < bestD) {
        best = u;
        bestD = d;
      }
    }
    return best;
  }

  /** Enemy under the cursor: shards first (they're small), then the giant. */
  private pickEnemy(p: { x: number; y: number }): Target | null {
    const ppu = this.pixelsPerUnit();
    for (const sh of this.shards) {
      const s = this.screenOf(sh.group.position, 0.6);
      if (Math.hypot(s.x - p.x, s.y - p.y) < Math.max(16, 1.1 * ppu)) return sh;
    }
    if (this.bossDead) return null;
    const s = this.screenOf(this.bossGroup.position, 2.8);
    return Math.hypot(s.x - p.x, s.y - p.y) < 2.6 * ppu ? "boss" : null;
  }

  private leftClick(p: { x: number; y: number }, shift: boolean) {
    if (this.pendingAttackMove) {
      const enemy = this.pickEnemy(p);
      if (enemy) this.issueAttack(enemy);
      else {
        const g = this.groundAt(p);
        if (g) this.issueMove(g, true);
      }
      this.command("cancel");
      return;
    }
    const u = this.pickUnit(p);
    if (u) {
      this.selectUnit(u.id, shift);
      return;
    }
    const enemy = this.pickEnemy(p);
    if (enemy) {
      this.issueAttack(enemy);
      return;
    }
    const g = this.groundAt(p);
    if (g) this.issueMove(g, false);
  }

  private rightClick(p: { x: number; y: number }) {
    if (this.pendingAttackMove) this.command("cancel");
    const enemy = this.pickEnemy(p);
    if (enemy) {
      this.issueAttack(enemy);
      return;
    }
    const g = this.groundAt(p);
    if (g) this.issueMove(g, false);
  }

  private boxSelect(x0: number, y0: number, x1: number, y1: number, add: boolean) {
    const [l, r] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [t, b] = [Math.min(y0, y1), Math.max(y0, y1)];
    const inside = this.party().filter((u) => {
      const s = this.screenOf(u.group.position, 0.9);
      return s.x >= l && s.x <= r && s.y >= t && s.y <= b;
    });
    if (!inside.length) return;
    this.setSelection(add ? [...new Set([...this.selected, ...inside])] : inside);
  }

  private setSelection(units: Unit[], feedback = true) {
    this.selected = new Set(units.filter((u) => u.hp > 0));
    for (const u of [this.hero, ...this.allies]) u.ring.visible = this.selected.has(u);
    if (feedback && this.selected.size) {
      this.snd("select");
      const first = this.selected.has(this.hero) ? this.hero : [...this.selected][0];
      this.bark(first, "select");
    }
    this.emitHud();
  }

  private selectedAlive() {
    return [...this.selected].filter((u) => u.hp > 0);
  }

  /* --------------------------------------------------------------- orders */

  private issueMove(point: THREE.Vector3, attackMove: boolean) {
    const units = this.selectedAlive();
    if (!units.length) return;
    this.order(units, point, attackMove ? "attackMove" : "move");
    this.flashMarker(point, attackMove ? "#e0705c" : "#7cd16b");
    this.snd("move");
    this.bark(units.includes(this.hero) ? this.hero : units[0], "order");
  }

  private issueAttack(target: Target) {
    const units = this.selectedAlive();
    if (!units.length) return;
    this.snd("move");
    this.bark(units.includes(this.hero) ? this.hero : units[0], "order");
    for (const u of units) {
      u.order = "attack";
      u.target = target;
      u.path = [];
      u.repath = 0;
    }
    this.flashMarker(this.targetPos(target).clone(), "#e0705c");
    this.emitHud();
  }

  /** Spread units over slots around the point, nearest unit to nearest slot. */
  private order(units: Unit[], point: THREE.Vector3, type: "move" | "attackMove") {
    const slots: THREE.Vector3[] = [point.clone()];
    for (let ring = 1; slots.length < units.length; ring++) {
      const n = ring * 6;
      for (let i = 0; i < n && slots.length < units.length; i++) {
        const a = (i / n) * Math.PI * 2;
        slots.push(new THREE.Vector3(point.x + Math.cos(a) * ring * 1.3, 0, point.z + Math.sin(a) * ring * 1.3));
      }
    }
    const free = [...slots];
    const sorted = [...units].sort((a, b) => distXZ(a.group.position, point) - distXZ(b.group.position, point));
    for (const u of sorted) {
      free.sort((a, b) => distXZ(u.group.position, a) - distXZ(u.group.position, b));
      const slot = free.shift()!;
      u.order = type;
      u.target = null;
      this.setPath(u, slot);
    }
    this.emitHud();
  }

  private setPath(u: Unit, goal: { x: number; z: number }) {
    const pts = this.nav.findPath({ x: u.group.position.x, z: u.group.position.z }, goal);
    u.path = pts.map((p) => v2(p.x, p.z));
  }

  private flashMarker(at: THREE.Vector3, color: string) {
    this.marker.position.set(at.x, 0.17, at.z);
    const m = this.marker.material as THREE.MeshBasicMaterial;
    m.color.set(color);
    m.opacity = 1;
    this.marker.scale.setScalar(1.4);
  }

  /* ---------------------------------------------------------------- world */

  private addLights() {
    this.scene.add(new THREE.HemisphereLight("#d9e4f0", "#4a3c26", 1.25));
    const sun = new THREE.DirectionalLight("#ffe7c2", 2.1);
    sun.position.set(28, 42, 12);
    sun.castShadow = true;
    this.sun = sun;
    this.scene.add(sun.target);
    sun.shadow.mapSize.setScalar(this.lowPower ? 1024 : 1536); // covers only the view, so this stays sharp
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    // The shadow box follows the camera (see fitShadows), so only nearby objects render into it.
    Object.assign(sun.shadow.camera, { near: 1, far: 120 });
    this.scene.add(sun);
    // Cool fill from the opposite side keeps shadowed faces readable.
    const fill = new THREE.DirectionalLight("#9fb6d6", 0.45);
    fill.position.set(-20, 18, -25);
    this.scene.add(fill);
  }

  private buildWorld() {
    const rand = rng(1997);
    const [ax, az] = bossDef.arena;

    // Road spline through every shrine to the arena.
    const route = [v2(0, 34), ...shrines.map((s) => v2(s.at[0], s.at[1])), v2(ax, az + 10)];
    const roadPts = new THREE.CatmullRomCurve3(route).getSpacedPoints(220);
    this.roadPts = roadPts;
    const roadDist = (x: number, z: number) => {
      let best = Infinity;
      for (const p of roadPts) {
        const d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    };

    // Cheap value noise for color and height variation.
    const hash = (x: number, z: number) => {
      const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const noise = (x: number, z: number) => {
      const xi = Math.floor(x), zi = Math.floor(z);
      const xf = x - xi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), w = zf * zf * (3 - 2 * zf);
      const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };

    // Ground: one mesh, painted with vertex colors (grass, road, arena tiles).
    const size = MAP * 2 + 64;
    const groundGeo = new THREE.PlaneGeometry(size, size, 200, 200);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color("#4d7a35");
    const grassB = new THREE.Color("#3c6229");
    const grassC = new THREE.Color("#6b8a3c");
    const dirt = new THREE.Color("#8a6a42");
    const dirtDark = new THREE.Color("#6e5233");
    const grout = new THREE.Color("#4f4c45");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n1 = noise(x * 0.12, z * 0.12);
      const n2 = noise(x * 0.45 + 40, z * 0.45 + 40);
      c.copy(grassA).lerp(grassB, n1).lerp(grassC, Math.max(0, n2 - 0.55) * 1.4);

      const rd = roadDist(x, z);
      const roadMix = THREE.MathUtils.smoothstep(2.7 + n2 * 0.6, 1.5, rd);
      if (roadMix > 0) c.lerp(dirt.clone().lerp(dirtDark, n2 * 0.7), roadMix);

      const ad = Math.hypot(x - ax, z - az);
      // Under the arena tiles: dark grout that shows through the gaps.
      const arenaMix = THREE.MathUtils.smoothstep(12.9, 12.1, ad);
      if (arenaMix > 0) c.lerp(grout, arenaMix);

      // Gentle rolling ground, flat where units fight and walk.
      const flatten = Math.max(roadMix, arenaMix, THREE.MathUtils.smoothstep(4, 2, Math.hypot(x, z - 32)));
      pos.setY(i, (noise(x * 0.07 + 9, z * 0.07 + 3) - 0.5) * 0.9 * (1 - flatten));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const segs = 201;
    const heights = new Float32Array(segs * segs);
    for (let i = 0; i < pos.count; i++) heights[i] = pos.getY(i);
    this.heightGrid = { segs, size, data: heights };
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Arena floor: concentric bands of stone slabs with small gaps, merged into one mesh.
    {
      const bands = [
        [0, 1.6, 1],
        [1.7, 4.2, 8],
        [4.3, 6.8, 14],
        [6.9, 9.4, 20],
        [9.5, 12.0, 26],
      ];
      const parts: THREE.BufferGeometry[] = [];
      const gap = 0.07;
      for (const [r0, r1, n] of bands) {
        for (let k = 0; k < n; k++) {
          const len = (Math.PI * 2) / n;
          const geo = r0 === 0
            ? new THREE.CircleGeometry(r1, 16)
            : new THREE.RingGeometry(r0, r1, 1, 1, k * len + gap / r1, len - (2 * gap) / r1);
          geo.rotateX(-Math.PI / 2);
          const shade = new THREE.Color("#8e8b80").multiplyScalar(0.86 + rand() * 0.24);
          const cols = new Float32Array(geo.attributes.position.count * 3);
          for (let v = 0; v < geo.attributes.position.count; v++) cols.set([shade.r, shade.g, shade.b], v * 3);
          geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
          parts.push(geo.toNonIndexed());
        }
      }
      const floorGeo = mergeGeometries(parts);
      parts.forEach((g) => g.dispose());
      const floor = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
      floor.position.set(ax, 0.04, az);
      floor.receiveShadow = true;
      this.scene.add(floor);
    }

    // Arena pillars with capstones.
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.4) continue; // gap facing the road
      const h = 2.4 + rand() * 1.6;
      const px = ax + Math.cos(a) * 12.5;
      const pz = az + Math.sin(a) * 12.5;
      const pillar = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 1.0), flat("#6d6b63"));
      shaft.position.y = h / 2;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.3, 1.35), flat("#7d7b72"));
      cap.position.y = h + 0.15;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), flat("#5f5d56"));
      foot.position.y = 0.17;
      [shaft, cap, foot].forEach((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
        pillar.add(m);
      });
      pillar.position.set(px, 0, pz);
      pillar.rotation.y = a;
      this.scene.add(pillar);
      this.nav.blockCircle(px, pz, 0.8 + UNIT_RADIUS);
    }

    // Fire bowls around the arena floor, clear of the entrance.
    for (const a of [Math.PI / 2 - 0.85, Math.PI / 2 + 0.85, (3 * Math.PI) / 2 - 0.95, (3 * Math.PI) / 2 + 0.95]) {
      const bx = ax + Math.cos(a) * 11.1;
      const bz = az + Math.sin(a) * 11.1;
      this.braziers.push(buildBrazier(this.scene, bx, bz));
      this.nav.blockCircle(bx, bz, 0.5 + UNIT_RADIUS);
    }

    // Forest: pines and broadleaf trees, kept off the road and away from the arena.
    const nearRoad = (x: number, z: number) => roadDist(x, z) < 4.2;
    const nearArena = (x: number, z: number) => Math.hypot(x - ax, z - az) < 15.5;
    const spots: [number, number, number, number][] = [];
    for (let tries = 0; spots.length < 520 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (MAP + 24);
      const z = (rand() * 2 - 1) * (MAP + 24);
      if (nearRoad(x, z) || nearArena(x, z) || Math.hypot(x, z - 32) < 5) continue;
      if (Math.abs(x) < MAP - 6 && Math.abs(z) < MAP - 6 && rand() < 0.45) continue; // thinner in the middle
      spots.push([x, z, 0.8 + rand() * 0.7, rand()]);
    }
    const pines = spots.filter((t) => t[3] < 0.62);
    const broad = spots.filter((t) => t[3] >= 0.62);
    const tint = (base: string, v: number) => new THREE.Color(base).multiplyScalar(0.82 + v * 0.36);

    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1.3, 6);
    const trunks = new THREE.InstancedMesh(trunkGeo, flat("#5a3d24"), spots.length);
    const pineLow = new THREE.InstancedMesh(new THREE.ConeGeometry(1.35, 2.2, 7), flat("#ffffff"), pines.length);
    const pineMid = new THREE.InstancedMesh(new THREE.ConeGeometry(1.05, 1.8, 7), flat("#ffffff"), pines.length);
    const pineTop = new THREE.InstancedMesh(new THREE.ConeGeometry(0.7, 1.4, 7), flat("#ffffff"), pines.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.25, 0), flat("#ffffff"), broad.length);
    const crown2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.85, 0), flat("#ffffff"), broad.length);
    spots.forEach(([x, z, s], i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6, 0));
      trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.6 * s, z), q, new THREE.Vector3(s, s, s)));
      this.nav.blockCircle(x, z, 0.55 * s + UNIT_RADIUS);
    });
    pines.forEach(([x, z, s, v], i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v * 9, 0));
      const sc = new THREE.Vector3(s, s, s);
      pineLow.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 2.0 * s, z), q, sc));
      pineMid.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 3.0 * s, z), q, sc));
      pineTop.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 3.9 * s, z), q, sc));
      const col = tint("#2f5a2c", v);
      pineLow.setColorAt(i, col);
      pineMid.setColorAt(i, col.clone().multiplyScalar(1.12));
      pineTop.setColorAt(i, col.clone().multiplyScalar(1.25));
    });
    broad.forEach(([x, z, s, v], i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(v * 3, v * 7, v * 2));
      crown.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 2.4 * s, z), q, new THREE.Vector3(s, s * 0.9, s)));
      crown2.setMatrixAt(i, m4.compose(new THREE.Vector3(x + 0.5 * s, 3.1 * s, z - 0.3 * s), q, new THREE.Vector3(s, s, s)));
      const col = tint(v > 0.93 ? "#7a7a2e" : "#4f7a34", (v - 0.62) * 2.6);
      crown.setColorAt(i, col);
      crown2.setColorAt(i, col.clone().multiplyScalar(1.15));
    });
    [trunks, pineLow, pineMid, pineTop, crown, crown2].forEach((t) => {
      t.castShadow = true;
      if (t.instanceColor) t.instanceColor.needsUpdate = true;
      this.scene.add(t);
    });

    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), flat("#ffffff"), 70);
    for (let i = 0; i < 70; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 30; t++) {
        x = (rand() * 2 - 1) * MAP;
        z = (rand() * 2 - 1) * MAP;
        if (!nearArena(x, z) && Math.hypot(x, z - 32) > 4 && roadDist(x, z) > 1.8) break;
      }
      const s = 0.5 + rand() * 1.1;
      rocks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.12 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s, s * 0.7, s)));
      rocks.setColorAt(i, new THREE.Color("#7d7d78").multiplyScalar(0.8 + rand() * 0.35));
      this.nav.blockCircle(x, z, 0.42 * s + UNIT_RADIUS * 0.6);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    this.scene.add(rocks);

    // Grass tufts and flowers: decoration only, no collision.
    const tuftGeo = new THREE.ConeGeometry(0.09, 0.45, 3);
    tuftGeo.translate(0, 0.22, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshLambertMaterial({ color: "#ffffff" }), 2200);
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshLambertMaterial({ color: "#ffffff" }), 260);
    const flowerColors = ["#f2e8c9", "#e3c06a", "#c97b7b", "#b08ad6"];
    let ti = 0, fi = 0;
    for (let tries = 0; tries < 9000 && (ti < 2200 || fi < 260); tries++) {
      const x = (rand() * 2 - 1) * (MAP + 6);
      const z = (rand() * 2 - 1) * (MAP + 6);
      if (roadDist(x, z) < 2.4 || Math.hypot(x - ax, z - az) < 13) continue;
      const n = noise(x * 0.3, z * 0.3);
      if (ti < 2200 && n > 0.35) {
        for (let k = 0; k < 3 && ti < 2200; k++) {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5));
          const sc = 0.7 + rand() * 0.8;
          tufts.setMatrixAt(ti, m4.compose(new THREE.Vector3(x + (rand() - 0.5) * 0.4, 0, z + (rand() - 0.5) * 0.4), q, new THREE.Vector3(sc, sc, sc)));
          tufts.setColorAt(ti, new THREE.Color("#5f8f3c").lerp(new THREE.Color("#93a84a"), rand()));
          ti++;
        }
      } else if (fi < 260 && n > 0.6) {
        flowers.setMatrixAt(fi, m4.compose(new THREE.Vector3(x, 0.18, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
        flowers.setColorAt(fi, new THREE.Color(flowerColors[Math.floor(rand() * flowerColors.length)]));
        fi++;
      }
    }
    tufts.count = ti;
    flowers.count = fi;
    [tufts, flowers].forEach((t) => {
      if (t.instanceColor) t.instanceColor.needsUpdate = true;
      this.scene.add(t);
    });

    // Shrines: stepped stone plinth, pillar, floating rune.
    for (const s of shrines) {
      const g = new THREE.Group();
      const step1 = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.3, 8), flat("#5f5d56"));
      step1.position.y = 0.15;
      const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.3, 8), flat("#6d6b63"));
      step2.position.y = 0.45;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.2, 6), flat("#8c8a80"));
      pillar.position.y = 1.7;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 0.25, 6), flat("#7d7b72"));
      cap.position.y = 2.9;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), flat(s.rune, { emissive: s.rune, emissiveIntensity: 1.3 }));
      rune.position.y = 3.6;
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(2.0, 2.45, 40),
        new THREE.MeshBasicMaterial({ color: s.rune, transparent: true, opacity: 0.6, depthWrite: false }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.08;
      [step1, step2, pillar, cap, rune].forEach((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      });
      g.add(glow);
      const halo = glowSprite(s.rune, 2.4, 0.7);
      halo.position.y = 3.6;
      g.add(halo);
      g.position.set(s.at[0], 0, s.at[1]);
      this.scene.add(g);
      this.shrineMeshes.set(s.id, { rune, glow, halo });
      this.nav.blockCircle(s.at[0], s.at[1], 1.6 + UNIT_RADIUS * 0.5);
    }

    this.buildBoss();
  }

  private buildBoss() {
    this.bossRig = buildGiant();
    const g = this.bossRig.root;
    g.position.set(bossDef.arena[0], 0.04, bossDef.arena[1]);
    this.scene.add(g);
    this.bossGroup = g;

    const bar = this.makeBar(3.2, "#c25b4a");
    bar.group.position.y = 5.4;
    g.add(bar.group);
    this.bossHpBar = bar.group;
    this.bossHpFill = bar.fill;
  }

  private makeBar(width: number, color: string) {
    const group = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.08, 0.26), new THREE.MeshBasicMaterial({ color: "#111", depthTest: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.18), new THREE.MeshBasicMaterial({ color, depthTest: false }));
    fill.geometry.translate(width / 2, 0, 0);
    fill.position.set(-width / 2, 0, 0.001);
    back.renderOrder = 10;
    fill.renderOrder = 11;
    group.add(back, fill);
    return { group, fill };
  }

  private spawn(kind: UnitKind, at: THREE.Vector3, slot: THREE.Vector3): Unit {
    const st = STATS[kind];
    const rig = buildUnit(kind);
    const g = rig.root;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 28),
      new THREE.MeshBasicMaterial({ color: "#7cd16b", transparent: true, opacity: 0.95, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.2;
    ring.visible = false;
    g.add(ring);

    g.position.set(at.x, this.groundY(at.x, at.z), at.z);
    this.scene.add(g);

    const bar = this.makeBar(1.1, kind === "hero" ? "#e3c06a" : "#7e9a63");
    bar.group.position.y = kind === "strategist" ? 2.75 : 2.5;
    g.add(bar.group);

    return {
      id: this.nextId++,
      kind,
      group: g,
      hp: st.hp,
      max: st.hp,
      atk: 0,
      order: "follow",
      path: [],
      repath: 0,
      target: null,
      slot,
      hpBar: bar.group,
      hpFill: bar.fill,
      ring,
      rig,
      anim: newAnim(),
    };
  }

  /* ----------------------------------------------------------------- loop */

  private loop = (now?: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update(now);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    if (!this.paused) this.update(dt);
    this.updateCamera(this.paused ? 0 : dt);
    const adt = this.paused ? 0 : dt;
    for (const u of this.party()) animateUnit(u.rig, u.anim, u.kind, adt);
    this.bossAnim.skin = this.shards.length > 0;
    this.bossAnim.stun = this.bossStun;
    animateGiant(this.bossRig, this.bossAnim, adt);
    this.particles.update(adt);
    animateBraziers(this.braziers, this.timer.getElapsed());
    this.billboardBars();
    this.renderer.render(this.scene, this.camera);
    this.updateFloaters(this.paused ? 0 : dt);
    this.adaptQuality();
  };

  /** Lower the pixel ratio in steps while the average frame takes longer than ~25 ms (40 fps). */
  private adaptQuality() {
    const p = this.perf;
    const now = performance.now();
    if (this.paused || document.hidden || !p.acc) {
      p.acc = now; // restart the window (acc holds the window start time)
      p.frames = 0;
      return;
    }
    p.frames++;
    if (now - p.acc < 1500) return;
    const avg = (now - p.acc) / 1000 / p.frames;
    p.acc = now;
    p.frames = 0;
    if (avg > 0.025 && p.ratio > 1) {
      p.ratio = Math.max(1, p.ratio - 0.25);
      this.renderer.setPixelRatio(p.ratio);
      this.resize();
    }
  }

  /** Fit the sun's shadow box around what the camera can see, snapped to whole shadow texels. */
  private fitShadows() {
    const w = this.camera.right - this.camera.left;
    const h = (this.camera.top - this.camera.bottom) / Math.sin(CAM.pitch);
    const ext = Math.ceil(Math.hypot(w, h) / 2 + 3);
    const cam = this.sun.shadow.camera;
    if (ext !== this.shadowExtent) {
      this.shadowExtent = ext;
      Object.assign(cam, { left: -ext, right: ext, top: ext, bottom: -ext });
      cam.updateProjectionMatrix();
    }
    const texel = (2 * ext) / this.sun.shadow.mapSize.x;
    const cx = Math.round(this.camTarget.x / texel) * texel;
    const cz = Math.round(this.camTarget.z / texel) * texel;
    this.sun.target.position.set(cx, 0, cz);
    this.sun.position.set(cx + 28, 42, cz + 12);
  }

  private party() {
    return [this.hero, ...this.allies].filter((u) => u.hp > 0);
  }

  private update(dt: number) {
    const t = this.timer.getElapsed();

    for (const [id, m] of this.shrineMeshes) {
      m.halo.position.y = m.rune.position.y;
      m.halo.material.opacity = 0.55 + Math.sin(t * 2.5 + m.rune.id) * 0.15;
      m.rune.rotation.y += dt * (this.visited.has(id) ? 0.3 : 1.5);
      m.rune.position.y = 3.6 + Math.sin(t * 2 + m.rune.id) * 0.12;
    }

    const mm = this.marker.material as THREE.MeshBasicMaterial;
    mm.opacity = Math.max(0, mm.opacity - dt * 2);
    this.marker.scale.multiplyScalar(1 - dt * 0.8);

    if (this.over()) {
      if (this.scroll) {
        this.scroll.rotation.y += dt * 1.2;
        this.scroll.position.y = 1.2 + Math.sin(t * 2) * 0.2;
      }
      this.updateFx(dt);
      return;
    }

    for (const a of Object.keys(this.cds) as AbilityId[]) this.cds[a] = Math.max(0, this.cds[a] - dt);
    this.kellyLeft = Math.max(0, this.kellyLeft - dt);
    this.updateFades(dt);

    if (this.checkShrines()) return;
    for (const u of this.party()) this.updateUnit(u, dt);
    this.separate();
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateFx(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) this.emitHud();
  }

  private checkShrines() {
    const h = this.hero;
    if (h.hp <= 0) return false;
    for (const s of shrines) {
      if (this.visited.has(s.id)) continue;
      if (distXZ(h.group.position, { x: s.at[0], z: s.at[1] }) < 2.7) {
        h.path = [];
        if (h.order === "move" || h.order === "attackMove") h.order = "idle";
        this.settle(h);
        this.setPaused(true);
        this.snd("shrine");
        this.cb.onShrine(s);
        return true;
      }
    }
    return false;
  }

  /** Walks the unit along its path. Returns true once the path is finished. */
  private followPath(u: Unit, speed: number, dt: number) {
    while (u.path.length && distXZ(u.group.position, u.path[0]) < 0.12) u.path.shift();
    if (!u.path.length) {
      this.settle(u);
      return true;
    }
    this.stepToward(u, u.path[0], speed, dt);
    return false;
  }

  /** Terrain height at (x, z), bilinear over the ground mesh's vertices. */
  groundY(x: number, z: number) {
    const { segs, size, data } = this.heightGrid;
    const fx = ((x + size / 2) / size) * (segs - 1);
    const fz = ((z + size / 2) / size) * (segs - 1);
    const x0 = THREE.MathUtils.clamp(Math.floor(fx), 0, segs - 2);
    const z0 = THREE.MathUtils.clamp(Math.floor(fz), 0, segs - 2);
    const tx = THREE.MathUtils.clamp(fx - x0, 0, 1);
    const tz = THREE.MathUtils.clamp(fz - z0, 0, 1);
    const h = (cx: number, cz: number) => data[cz * segs + cx];
    const a = h(x0, z0) + (h(x0 + 1, z0) - h(x0, z0)) * tx;
    const b = h(x0, z0 + 1) + (h(x0 + 1, z0 + 1) - h(x0, z0 + 1)) * tx;
    return a + (b - a) * tz;
  }

  private settle(u: Unit) {
    u.group.position.y = this.groundY(u.group.position.x, u.group.position.z);
  }

  private stepToward(u: Unit, goal: THREE.Vector3, speed: number, dt: number) {
    const p = u.group.position;
    const dx = goal.x - p.x;
    const dz = goal.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return;
    const step = Math.min(d, speed * dt);
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    u.group.rotation.y = Math.atan2(dx, dz);
    u.anim.moved = true;
    p.y = this.groundY(p.x, p.z);
  }

  private face(u: Unit, target: THREE.Vector3) {
    u.group.rotation.y = Math.atan2(target.x - u.group.position.x, target.z - u.group.position.z);
  }

  private reach(u: Unit, t: Target) {
    return STATS[u.kind].range + this.targetRadius(t);
  }

  private targetPos(t: Target) {
    return t === "boss" ? this.bossGroup.position : t.group.position;
  }

  private targetRadius(t: Target) {
    return t === "boss" ? BOSS.radius : SHARD.radius;
  }

  private targetAlive(t: Target) {
    return t === "boss" ? !this.bossDead : t.hp > 0;
  }

  private hitTarget(t: Target, dmg: number, big: boolean) {
    if (t === "boss") this.hitBoss(dmg, big);
    else this.hitShard(t, dmg, big);
  }

  /** Closest live enemy within `maxD` (the giant counts only once it's awake). */
  private nearestEnemy(from: THREE.Vector3, maxD: number): Target | null {
    let best: Target | null = null;
    let bestD = maxD;
    for (const sh of this.shards) {
      const d = distXZ(from, sh.group.position) - SHARD.radius;
      if (d < bestD) {
        bestD = d;
        best = sh;
      }
    }
    if (this.bossAggro && !this.bossDead) {
      const d = distXZ(from, this.bossGroup.position) - BOSS.radius;
      if (d < bestD) best = "boss";
    }
    return best;
  }

  private updateUnit(u: Unit, dt: number) {
    const st = STATS[u.kind];
    u.repath -= dt;

    // Recruits step out of an incoming slam unless you've given them a move or hold order.
    if (u !== this.hero && this.telegraph && u.order !== "move" && u.order !== "hold") {
      const c = this.telegraph.at;
      if (distXZ(u.group.position, c) < BOSS.slamRadius + 0.8) {
        const away = u.group.position.clone().sub(c).setY(0);
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        const flee = this.nav.nearestOpen({ x: c.x + away.normalize().x * (BOSS.slamRadius + 2), z: c.z + away.z * (BOSS.slamRadius + 2) });
        this.stepToward(u, v2(flee.x, flee.z), st.speed * 1.1, dt);
        return;
      }
    }

    // Healer: tends the most wounded ally unless walking somewhere on your order.
    if (st.heal && u.order !== "move") {
      const hurt = this.party()
        .filter((a) => a.hp < a.max && distXZ(a.group.position, u.group.position) < 14)
        .sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (hurt) {
        const d = distXZ(u.group.position, hurt.group.position);
        if (d > st.range) {
          if (u.order === "hold") return;
          if (u.repath <= 0 || !u.path.length) {
            this.setPath(u, hurt.group.position);
            u.repath = 0.5;
          }
          this.followPath(u, st.speed, dt);
          return;
        }
        u.atk -= dt;
        if (u.atk <= 0) {
          u.atk = st.cd;
          u.anim.attack = u.anim.attackDur = 0.5;
          const amt = Math.min(st.heal, hurt.max - hurt.hp);
          if (amt > 0) this.snd("heal", hurt.group.position, 0.6);
          hurt.hp += amt;
          this.ring(hurt.group.position, "#7e9a63", 1.2, 0.4);
          this.particles.burst(hurt.group.position.clone().setY(0.7), { count: 6, color: "#9cd67e", speed: 0.5, up: 2.8, gravity: 1, life: 0.9, size: 0.1 });
          if (amt > 0) this.float(hurt.group.position, `+${Math.round(amt)}`, "heal");
        }
        return;
      }
    }

    let tgt: Target | null = null;
    if (!st.heal) {
      if (u.order === "attack") {
        if (u.target && this.targetAlive(u.target)) tgt = u.target;
        else {
          u.order = "idle";
          u.target = null;
        }
      }
      if (!tgt && (u.order === "idle" || u.order === "follow" || u.order === "attackMove")) {
        tgt = this.nearestEnemy(u.group.position, ACQUIRE + st.range);
      }
      if (!tgt && u.order === "hold") tgt = this.nearestEnemy(u.group.position, st.range + 0.2);
    }

    if (tgt) {
      const tp = this.targetPos(tgt);
      const d = distXZ(u.group.position, tp);
      const reach = this.reach(u, tgt);
      if (d > reach) {
        if (u.order === "hold") return;
        if (u.repath <= 0 || !u.path.length) {
          const toward = tp.clone().sub(u.group.position).setY(0).setLength(Math.max(0, d - reach + 0.4)).add(u.group.position);
          this.setPath(u, toward);
          u.repath = tgt === "boss" ? 0.4 : 0.25;
        }
        this.followPath(u, st.speed, dt);
        return;
      }
      u.path = [];
      this.settle(u);
      this.face(u, tp);
      u.atk -= dt;
      if (u.atk <= 0) {
        u.atk = st.cd;
        u.anim.attack = u.anim.attackDur = st.ranged ? 0.45 : 0.38;
        if (st.ranged) {
          const crit = !!st.crit && Math.random() < st.crit;
          this.shoot(u.group.position, tgt, st.dmg * this.dmgMult() * (crit ? 2 : 1), crit, st.trim);
          this.snd(u.kind === "strategist" ? "bolt" : "shoot", u.group.position, 0.7);
        } else {
          this.hitTarget(tgt, st.dmg * this.dmgMult(), false);
          this.snd("hit", tp, 0.7);
        }
      }
      return;
    }

    switch (u.order) {
      case "move":
      case "attackMove":
        if (this.followPath(u, st.speed, dt)) u.order = "idle";
        break;
      case "follow": {
        if (this.hero.hp <= 0) {
          u.order = "idle";
          break;
        }
        const goal = this.hero.group.position.clone().setY(0).add(u.slot);
        const d = distXZ(u.group.position, goal);
        if (d > 1.0) {
          if (u.repath <= 0 || !u.path.length) {
            this.setPath(u, goal);
            u.repath = 0.6;
          }
          this.followPath(u, st.speed * (d > 6 ? 1.35 : 1), dt);
        } else {
          u.path = [];
          this.settle(u);
        }
        break;
      }
      default:
        this.settle(u);
    }
  }

  /** Pushes overlapping units apart without shoving them into obstacles. */
  private separate() {
    const units = this.party();
    const minD = UNIT_RADIUS * 2;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i].group.position;
        const b = units[j].group.position;
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        if (d >= minD) continue;
        if (d < 1e-3) {
          dx = Math.random() - 0.5;
          dz = Math.random() - 0.5;
          d = Math.hypot(dx, dz);
        }
        const push = (minD - d) / 2;
        const nx = (dx / d) * push;
        const nz = (dz / d) * push;
        if (!this.nav.isBlocked(a.x - nx, a.z - nz)) {
          a.x -= nx;
          a.z -= nz;
        }
        if (!this.nav.isBlocked(b.x + nx, b.z + nz)) {
          b.x += nx;
          b.z += nz;
        }
      }
    }
  }

  private updateBoss(dt: number) {
    if (this.bossDead) return;
    const home = v2(bossDef.arena[0], bossDef.arena[1]);
    const party = this.party();

    if (!this.bossAggro) {
      if (party.some((u) => distXZ(u.group.position, home) < 13.5)) {
        this.bossAggro = true;
        this.status = "fight";
        this.bossSlam = BOSS.slamEvery;
        this.snd("bossAggro", this.bossGroup.position);
        this.audio?.music("battle");
        this.cb.onBossAggro();
      }
      return;
    }

    // Everyone left: the boss resets.
    if (!party.some((u) => distXZ(u.group.position, home) < 20)) {
      this.bossAggro = false;
      this.audio?.music("explore");
      this.status = "explore";
      this.bossHp = this.maxBossHp;
      this.clearTelegraph();
      this.clearBoulder();
      [...this.shards].forEach((sh) => this.removeShard(sh));
      this.wavesDone = 0;
      this.boulderTimer = 4;
      this.bossStun = 0;
      this.bossGroup.position.copy(home);
      this.emitHud();
      return;
    }

    const bp = this.bossGroup.position;
    this.updateShards(dt);
    this.updateBoulder(dt);

    if (this.bossStun > 0) {
      this.bossStun -= dt;
      return;
    }

    if (this.telegraph) {
      this.telegraph.t += dt;
      const k = Math.min(1, this.telegraph.t / BOSS.slamWindup);
      this.telegraph.fill.scale.setScalar(Math.max(0.01, k));
      this.bossAnim.slam = k;
      if (k >= 1) {
        const c = this.telegraph.at;
        for (const u of party) {
          if (distXZ(u.group.position, c) <= BOSS.slamRadius) this.damage(u, BOSS.slamDmg);
        }
        this.ring(c, "#c25b4a", BOSS.slamRadius + 1, 0.5);
        this.bossAnim.slam = 0;
        this.bossAnim.impact = 0.45;
        this.snd("slamImpact", c);
        this.particles.burst(c.clone().setY(0.15), { count: 60, color: ["#8a6a42", "#a7a59d", "#6e5233"], speed: 7, up: 2.5, gravity: 7, life: 0.8, spread: 2.5, size: 0.2 });
        this.clearTelegraph();
      }
      return;
    }

    if (this.bossHp <= this.maxBossHp * BOULDER.from && !this.boulder) {
      this.boulderTimer -= dt;
      if (this.boulderTimer <= 0) {
        this.boulderTimer = DIFF[this.diff].boulderEvery;
        this.throwBoulder();
      }
    }

    this.bossSlam -= dt;
    if (this.bossSlam <= 0) {
      this.bossSlam = this.bossHp < this.maxBossHp / 2 ? BOSS.slamEvery * 0.7 : BOSS.slamEvery;
      this.startTelegraph(bp.clone().setY(0));
      return;
    }

    const tank = party.find((u) => u.kind === "engineer" && distXZ(u.group.position, bp) < 8);
    const target = tank ?? [...party].sort((a, b) => distXZ(a.group.position, bp) - distXZ(b.group.position, bp))[0];
    if (!target) return;
    const d = distXZ(target.group.position, bp);
    const reach = BOSS.radius + 1.4;
    this.bossGroup.rotation.y = Math.atan2(target.group.position.x - bp.x, target.group.position.z - bp.z);
    if (d > reach) {
      const step = Math.min(d - reach, BOSS.speed * dt);
      const dir = target.group.position.clone().sub(bp).setY(0).normalize();
      bp.addScaledVector(dir, step);
      this.bossAnim.moved = true;
      const off = bp.clone().sub(home).setY(0);
      if (off.length() > 11) bp.copy(home.clone().add(off.setLength(11)));
      return;
    }
    this.bossAtk -= dt;
    if (this.bossAtk <= 0) {
      this.bossAtk = BOSS.cd;
      this.bossAnim.punch = 0.55;
      this.damage(target, BOSS.dmg);
    }
  }

  /* ---------------------------------------------------------- mechanics */

  private spawnShards(n: number) {
    this.snd("shardSpawn", this.bossGroup.position);
    const [ax, az] = bossDef.arena;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.62, 0),
        flat("#6d6b63", { emissive: "#e0503c", emissiveIntensity: 0.35 }),
      );
      body.position.y = 0.7;
      body.castShadow = true;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), flat("#e0503c", { emissive: "#e0503c", emissiveIntensity: 1 }));
      shard.position.y = 1.45;
      g.add(body, shard);
      g.position.set(ax + Math.cos(a) * 9.5, 0, az + Math.sin(a) * 9.5);
      this.scene.add(g);
      const bar = this.makeBar(0.9, "#e0705c");
      bar.group.position.y = 2.0;
      g.add(bar.group);
      const hp = DIFF[this.diff].shardHp;
      this.shards.push({ id: this.nextId++, group: g, hp, max: hp, atk: 0, hpBar: bar.group, hpFill: bar.fill });
      this.ring(g.position, "#e0503c", 1.8, 0.6);
      this.particles.burst(g.position.clone().setY(0.4), { count: 14, color: ["#e0503c", "#6d6b63"], speed: 3, up: 5, life: 0.8 });
    }
    this.float(this.bossGroup.position.clone().setY(5), "Stone shards!", "crit");
    this.emitHud();
  }

  private removeShard(sh: Shard) {
    this.scene.remove(sh.group);
    sh.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.shards = this.shards.filter((x) => x !== sh);
  }

  private hitShard(sh: Shard, raw: number, big: boolean) {
    if (sh.hp <= 0) return;
    sh.hp -= raw;
    this.snd("bossHit", sh.group.position, 0.45);
    this.float(sh.group.position.clone().setY(1.8), `${Math.round(raw)}`, big ? "crit" : "dmg");
    this.particles.burst(sh.group.position.clone().setY(0.9), { count: 4, color: ["#e0503c", "#a7a59d"], speed: 2.5, up: 2.5, life: 0.4, size: 0.1 });
    if (sh.hp <= 0) {
      this.ring(sh.group.position, "#e0503c", 1.6, 0.4);
      this.snd("shardBreak", sh.group.position);
      this.particles.burst(sh.group.position.clone().setY(0.7), { count: 18, color: ["#6d6b63", "#e0503c", "#8c8a80"], speed: 4, up: 4, life: 0.8, size: 0.18 });
      this.removeShard(sh);
      this.emitHud();
    }
  }

  /** Shards hunt the backline: healer first, then ranged, then whoever is closest. */
  private updateShards(dt: number) {
    const party = this.party();
    if (!party.length) return;
    const backline = party.filter((u) => u.kind === "banner" || u.kind === "strategist" || u.kind === "quant");
    for (const sh of this.shards) {
      sh.group.rotation.y += dt * 1.5;
      const pool = backline.length ? backline : party;
      const target = pool.reduce((a, b) => (distXZ(a.group.position, sh.group.position) <= distXZ(b.group.position, sh.group.position) ? a : b));
      const d = distXZ(target.group.position, sh.group.position);
      const reach = SHARD.radius + UNIT_RADIUS + 0.5;
      if (d > reach) {
        const dir = target.group.position.clone().sub(sh.group.position).setY(0).normalize();
        sh.group.position.addScaledVector(dir, Math.min(d - reach, SHARD.speed * dt));
        continue;
      }
      sh.atk -= dt;
      if (sh.atk <= 0) {
        sh.atk = SHARD.cd;
        this.damage(target, DIFF[this.diff].shardDmg);
      }
    }
  }

  private throwBoulder() {
    this.snd("boulderMark");
    const party = this.party();
    const priority: UnitKind[] = ["banner", "strategist", "quant", "builder", "engineer"];
    let target: Unit | undefined;
    for (const k of priority) {
      target = party.find((u) => u.kind === k);
      if (target) break;
    }
    target ??= this.hero;
    if (target.hp <= 0) return;
    const at = target.group.position.clone().setY(0);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(BOULDER.radius - 0.18, BOULDER.radius, 40),
      new THREE.MeshBasicMaterial({ color: "#e0503c", transparent: true, opacity: 0.95, depthWrite: false }),
    );
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(BOULDER.radius, 40),
      new THREE.MeshBasicMaterial({ color: "#e0503c", transparent: true, opacity: 0.25, depthWrite: false }),
    );
    [ring, fill].forEach((m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(at.x, 0.17, at.z);
      this.scene.add(m);
    });
    fill.scale.setScalar(0.01);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), flat("#77756b"));
    rock.castShadow = true;
    const from = this.bossGroup.position.clone().setY(5.5);
    rock.position.copy(from);
    rock.visible = false; // thrown only once the zone is full
    this.scene.add(rock);
    this.boulder = { target, at, from, t: 0, ring, fill, rock, launched: false };
    this.emitHud();
  }

  private updateBoulder(dt: number) {
    const b = this.boulder;
    if (!b) return;
    b.t += dt;
    // Phase 1: the zone fills solid red over 3 seconds.
    const fill = Math.min(1, b.t / BOULDER.fill);
    b.fill.scale.setScalar(Math.max(0.01, fill));
    (b.fill.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.45 * fill;
    if (fill < 1) return;
    // Phase 2: the boulder flies from the giant's hand to the zone.
    b.from.copy(this.bossGroup.position).setY(5.5);
    b.rock.visible = true;
    if (!b.launched) {
      b.launched = true;
      this.snd("boulderLaunch", this.bossGroup.position);
    }
    const k = Math.min(1, (b.t - BOULDER.fill) / BOULDER.flight);
    b.rock.position.lerpVectors(b.from, b.at.clone().setY(0.6), k);
    b.rock.position.y += Math.sin(k * Math.PI) * 4;
    b.rock.rotation.x += dt * 6;
    if (k < 1) return;
    for (const u of this.party()) {
      if (distXZ(u.group.position, b.at) <= BOULDER.radius) this.damage(u, DIFF[this.diff].boulderDmg);
    }
    this.ring(b.at, "#e0503c", BOULDER.radius + 1, 0.5);
    this.snd("boulderImpact", b.at);
    this.particles.burst(b.at.clone().setY(0.2), { count: 34, color: ["#77756b", "#8a6a42", "#a7a59d"], speed: 5, up: 4.5, life: 0.9, spread: 1, size: 0.22 });
    this.clearBoulder();
  }

  private clearBoulder() {
    const b = this.boulder;
    if (!b) return;
    for (const m of [b.ring, b.fill, b.rock]) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.boulder = null;
    this.emitHud();
  }

  /** A small quadcopter that flies from Vitaliy to the drop point and fades out. */
  private flyDrone(from: THREE.Vector3, to: THREE.Vector3) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), flat("#d8d8d8"));
    g.add(body);
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 10), flat("#9cd67e", { emissive: "#9cd67e", emissiveIntensity: 0.6 }));
      rotor.position.set(x, 0.1, z);
      g.add(rotor);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.06), flat("#e0503c"));
    cross.position.y = 0.09;
    const cross2 = cross.clone();
    cross2.rotation.y = Math.PI / 2;
    g.add(cross, cross2);
    g.position.copy(from).setY(3.5);
    this.scene.add(g);
    this.fades.push({ obj: g, age: 0, life: 1.4, from: from.clone().setY(3.5), to: to.clone().setY(2.4) });
  }

  /** A gold strike from the sky onto a target. */
  private beam(at: THREE.Vector3) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.4, 14, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: "#e3c06a", transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.position.set(at.x, 7, at.z);
    this.scene.add(mesh);
    this.fades.push({ obj: mesh, age: 0, life: 0.45 });
    this.ring(at, "#e3c06a", 2.4, 0.5);
    this.particles.burst(at.clone().setY(0.6), { count: 30, color: ["#e3c06a", "#fff3c4", "#ffffff"], speed: 5, up: 6, life: 0.7, size: 0.12 });
  }

  private updateFades(dt: number) {
    this.fades = this.fades.filter((f) => {
      f.age += dt;
      const k = Math.min(1, f.age / f.life);
      if (f.from && f.to) {
        f.obj.position.lerpVectors(f.from, f.to, Math.min(1, k * 1.8));
        f.obj.position.y += Math.sin(f.age * 9) * 0.06;
        f.obj.rotation.y += dt * 2;
      }
      f.obj.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material as THREE.MeshBasicMaterial;
          m.transparent = true;
          m.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : m.opacity;
        }
      });
      if (k >= 1) {
        this.scene.remove(f.obj);
        f.obj.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        return false;
      }
      return true;
    });
  }

  private startTelegraph(at: THREE.Vector3) {
    this.snd("slamWind", at, 1, BOSS.slamWindup);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(BOSS.slamRadius - 0.25, BOSS.slamRadius, 48),
      new THREE.MeshBasicMaterial({ color: "#e0503c", transparent: true, opacity: 0.9, depthWrite: false }),
    );
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(BOSS.slamRadius, 48),
      new THREE.MeshBasicMaterial({ color: "#e0503c", transparent: true, opacity: 0.32, depthWrite: false }),
    );
    [ring, fill].forEach((m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(at.x, 0.16, at.z);
      this.scene.add(m);
    });
    fill.scale.setScalar(0.01);
    this.telegraph = { ring, fill, t: 0, at };
  }

  private clearTelegraph() {
    this.bossAnim.slam = 0;
    if (!this.telegraph) return;
    for (const m of [this.telegraph.ring, this.telegraph.fill]) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.telegraph = null;
  }

  private builderNear(u: Unit) {
    return this.allies.some((a) => a.kind === "builder" && a.hp > 0 && distXZ(a.group.position, u.group.position) < 7);
  }

  private damage(u: Unit, raw: number) {
    if (u.hp <= 0) return;
    const amt = Math.round(raw * DIFF[this.diff].incoming * (this.builderNear(u) ? 0.75 : 1));
    u.hp -= amt;
    this.snd("hurt", u.group.position, 0.6);
    this.float(u.group.position, `-${amt}`, "hurt");
    this.particles.burst(u.group.position.clone().setY(1.1), { count: 4, color: ["#c25b4a", "#e0705c"], speed: 1.8, up: 2, life: 0.4, size: 0.09 });
    if (u.hp <= 0) {
      u.hp = 0;
      this.particles.burst(u.group.position.clone().setY(0.8), { count: 20, color: [STATS[u.kind].body, STATS[u.kind].trim, "#6d6b63"], speed: 2.5, up: 4, life: 1, size: 0.16 });
      this.scene.remove(u.group);
      this.selected.delete(u);
      u.ring.visible = false;
      this.snd("death", u.group.position);
      if (u === this.hero) this.finish("lost");
      else this.fallen.push(u);
      this.emitHud();
    }
  }

  private hitBoss(raw: number, big: boolean) {
    if (this.bossDead) return;
    const amt = this.shards.length ? raw * STONE_SKIN : raw;
    this.bossHp -= amt;
    this.snd("bossHit", this.bossGroup.position, 0.8);
    this.float(this.bossGroup.position.clone().setY(4), `${Math.round(amt)}`, this.shards.length ? "dmg" : big ? "crit" : "dmg");
    this.particles.burst(this.bossGroup.position.clone().setY(2.6), {
      count: big ? 10 : 4,
      color: this.shards.length ? ["#a7a59d", "#d8d8d8"] : ["#ff9a3c", "#ffd36b", "#a7a59d"],
      speed: 3,
      up: 2.5,
      life: 0.45,
      spread: 1.2,
      size: 0.11,
    });
    const wave = WAVES[this.wavesDone];
    if (wave !== undefined && this.bossHp > 0 && this.bossHp <= this.maxBossHp * wave) {
      this.spawnShards(DIFF[this.diff].waves[this.wavesDone]);
      this.wavesDone++;
    }
    if (this.bossHp <= 0) {
      this.bossHp = 0;
      this.bossDead = true;
      this.clearTelegraph();
      this.clearBoulder();
      [...this.shards].forEach((sh) => this.removeShard(sh));
      this.bossAnim.dead = 0.01;
      this.dropScroll(this.bossGroup.position.clone());
      this.finish("won");
    }
  }

  private dropScroll(at: THREE.Vector3) {
    const g = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 10), flat("#e6dfcb"));
    paper.rotation.z = Math.PI / 2;
    const caps = flat("#c9a24a", { emissive: "#c9a24a", emissiveIntensity: 0.6 });
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 10), caps);
    c1.rotation.z = Math.PI / 2;
    c1.position.x = -0.85;
    const c2 = c1.clone();
    c2.position.x = 0.85;
    g.add(paper, c1, c2);
    g.position.set(at.x + 2.5, 1.2, at.z + 1.5);
    this.scene.add(g);
    this.scroll = g;
    this.ring(g.position.clone().setY(0), "#e3c06a", 4, 1.2);
  }

  private finish(result: "won" | "lost") {
    if (this.over()) return;
    this.status = result;
    this.pendingAttackMove = false;
    this.canvas.style.cursor = "";
    this.emitHud();
    this.audio?.music(result === "won" ? "victory" : "defeat");
    this.cb.onEnd(result);
  }

  private shoot(from: THREE.Vector3, target: Target, dmg: number, crit: boolean, color: string) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(crit ? 0.22 : 0.15, 6, 4), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(from).setY(1.3);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, target, dmg, crit, speed: 18 });
  }

  private updateProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter((p) => {
      const alive = this.targetAlive(p.target);
      const goal = this.targetPos(p.target).clone().setY(p.target === "boss" ? 3 : 0.8);
      const d = p.mesh.position.distanceTo(goal);
      if (d < 0.4 || !alive) {
        if (alive) this.hitTarget(p.target, p.dmg, p.crit);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }
      p.mesh.position.lerp(goal, Math.min(1, (p.speed * dt) / d));
      return true;
    });
  }

  private ring(at: THREE.Vector3, color: string, radius: number, life: number) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at.x, 0.18, at.z);
    mesh.scale.setScalar(0.2);
    this.scene.add(mesh);
    this.fx.push({ mesh, age: 0, life, grow: radius });
  }

  private updateFx(dt: number) {
    this.fx = this.fx.filter((f) => {
      f.age += dt;
      const k = f.age / f.life;
      f.mesh.scale.setScalar(0.2 + (f.grow - 0.2) * Math.min(1, k * 1.4));
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });
  }

  private float(at: THREE.Vector3, text: string, kind: "dmg" | "crit" | "hurt" | "heal" | "bark") {
    if (this.floaters.length > 40) return;
    const el = document.createElement("div");
    el.textContent = text;
    el.className = `floater floater-${kind}`;
    this.overlay.appendChild(el);
    const pos = at.clone();
    if (kind !== "bark") pos.x += (Math.random() - 0.5) * 0.8;
    pos.y = Math.max(pos.y, 2.2);
    this.floaters.push({ el, pos, age: 0, life: kind === "bark" ? 1.8 : 0.9, rise: kind === "bark" ? 0.25 : 1.6 });
  }

  private updateFloaters(dt: number) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.floaters = this.floaters.filter((f) => {
      f.age += dt;
      f.pos.y += dt * f.rise;
      if (f.age > f.life) {
        f.el.remove();
        return false;
      }
      const p = f.pos.clone().project(this.camera);
      f.el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -50%)`;
      const k = f.age / f.life;
      f.el.style.opacity = String(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      return true;
    });
  }

  private billboardBars() {
    for (const u of this.party()) {
      u.hpFill.scale.x = Math.max(0.001, u.hp / u.max);
      u.hpBar.quaternion.copy(this.camera.quaternion).premultiply(u.group.quaternion.clone().invert());
    }
    for (const sh of this.shards) {
      sh.hpFill.scale.x = Math.max(0.001, sh.hp / sh.max);
      sh.hpBar.quaternion.copy(this.camera.quaternion).premultiply(sh.group.quaternion.clone().invert());
    }
    this.bossHpFill.scale.x = Math.max(0.001, this.bossHp / this.maxBossHp);
    this.bossHpBar.visible = this.bossAggro && !this.bossDead;
    this.bossHpBar.quaternion.copy(this.camera.quaternion).premultiply(this.bossGroup.quaternion.clone().invert());
  }

  /* --------------------------------------------------------------- camera */

  private camAxes() {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).setY(0);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const upGround = up.clone().setY(0);
    const k = upGround.length() || 1;
    return { right: right.normalize(), upGround: upGround.normalize(), k };
  }

  /** Drag the ground by a pixel delta (pan, touch drag). */
  private panPixels(dx: number, dy: number) {
    const wpp = 1 / this.pixelsPerUnit();
    const { right, upGround, k } = this.camAxes();
    this.followCam = false;
    this.camTarget.addScaledVector(right, -dx * wpp).addScaledVector(upGround, (dy * wpp) / k);
    this.clampCam();
  }

  private clampCam() {
    this.camTarget.x = THREE.MathUtils.clamp(this.camTarget.x, -MAP, MAP);
    this.camTarget.z = THREE.MathUtils.clamp(this.camTarget.z, -MAP, MAP);
  }

  private updateCamera(dt: number) {
    // Keyboard and screen-edge scrolling.
    let sx = 0;
    let sy = 0;
    if (this.keysHeld.has("arrowleft")) sx -= 1;
    if (this.keysHeld.has("arrowright")) sx += 1;
    if (this.keysHeld.has("arrowup")) sy -= 1;
    if (this.keysHeld.has("arrowdown")) sy += 1;
    if (this.mouse.inside && !this.drag && !this.paused) {
      // Screen-edge scrolling uses the window edges, so it also works over the HUD bars.
      const edge = 6;
      if (this.mouse.x < edge) sx -= 1;
      if (this.mouse.x > window.innerWidth - edge) sx += 1;
      if (this.mouse.y < edge) sy -= 1;
      if (this.mouse.y > window.innerHeight - edge) sy += 1;
    }
    if ((sx || sy) && dt > 0) {
      const speed = this.view * 0.9 * this.pixelsPerUnit() * dt;
      this.panPixels(-sx * speed, -sy * speed);
    }

    if (this.followCam) {
      const sel = this.selectedAlive();
      const focus = sel.includes(this.hero) || !sel.length ? [this.hero] : sel;
      const alive = focus.filter((u) => u.hp > 0);
      if (alive.length) {
        const c = new THREE.Vector3();
        alive.forEach((u) => c.add(u.group.position));
        c.divideScalar(alive.length).setY(0);
        this.camTarget.lerp(c, Math.min(1, (dt || 0.016) * 4));
      }
    }
    this.camera.position.set(
      this.camTarget.x,
      Math.sin(CAM.pitch) * CAM.dist,
      this.camTarget.z + Math.cos(CAM.pitch) * CAM.dist,
    );
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
    this.fitShadows();
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    // `view` covers the open area between the HUD bars; put the camera target at its center.
    const top = Math.min(this.insets.top, h * 0.4);
    const bottom = Math.min(this.insets.bottom, h * 0.5);
    const free = Math.max(1, h - top - bottom);
    // Landscape: `view` is the open height. Portrait phones: `view` sets the width instead,
    // otherwise only a narrow strip of the map fits across.
    const v = aspect < 1 ? (this.view * 0.85) / aspect : (this.view * h) / free;
    const centerFromTop = (top + free / 2) / h;
    Object.assign(this.camera, {
      left: (-v * aspect) / 2,
      right: (v * aspect) / 2,
      top: v * centerFromTop,
      bottom: v * (centerFromTop - 1),
    });
    this.camera.updateProjectionMatrix();
  }

  private viewFootprint(): Point[] {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ].map((p) => {
      const g = this.groundAt(p);
      return g ? { x: g.x, z: g.z } : { x: 0, z: 0 };
    });
  }

  /* ------------------------------------------------------------------ hud */

  private info(u: Unit): UnitInfo {
    return { id: u.id, kind: u.kind, hp: Math.max(0, Math.round(u.hp)), max: u.max, order: u.order, selected: this.selected.has(u) };
  }

  private emitHud() {
    this.hudTimer = 0.1;
    const party = this.party();
    this.cb.onHud({
      heroHp: Math.max(0, Math.round(this.hero.hp)),
      heroMax: this.hero.max,
      warband: this.allies.map((u) => this.info(u)),
      selection: party.filter((u) => this.selected.has(u)).map((u) => this.info(u)),
      bossHp: Math.round(this.bossHp),
      bossMax: this.maxBossHp,
      bossAggro: this.bossAggro && !this.bossDead,
      stoneSkin: this.shards.length > 0,
      shards: this.shards.length,
      marked: this.boulder && this.boulder.target.hp > 0 ? { id: this.boulder.target.id, kind: this.boulder.target.kind } : null,
      difficulty: this.diff,
      abilities: {
        drone: { cd: this.cds.drone, max: ABILITY.drone.cd, unlocked: this.isUnlocked("drone") },
        checkmate: { cd: this.cds.checkmate, max: ABILITY.checkmate.cd, unlocked: this.isUnlocked("checkmate") },
        kelly: { cd: this.cds.kelly, max: ABILITY.kelly.cd, unlocked: this.isUnlocked("kelly") },
      },
      kellyLeft: this.kellyLeft,
      fallen: this.fallen.length,
      status: this.status,
      pendingAttackMove: this.pendingAttackMove,
      followCamera: this.followCam,
      groups: [...this.groups.entries()].filter(([, g]) => g.some((u) => u.hp > 0)).map(([n]) => n),
      minimap: {
        units: party.map((u) => ({ x: u.group.position.x, z: u.group.position.z, kind: u.kind, selected: this.selected.has(u) })),
        boss: { x: this.bossGroup.position.x, z: this.bossGroup.position.z, alive: !this.bossDead },
        shards: this.shards.map((sh) => ({ x: sh.group.position.x, z: sh.group.position.z })),
        shrines: shrines.map((s) => ({ x: s.at[0], z: s.at[1], visited: this.visited.has(s.id), color: s.rune })),
        view: this.viewFootprint(),
      },
    });
  }
}

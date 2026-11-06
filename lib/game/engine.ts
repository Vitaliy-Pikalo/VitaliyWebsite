import * as THREE from "three";
import { NavGrid, type Point } from "./nav";
import { abilities, boss as bossDef, shrines, type AbilityId, type Shrine, type UnitKind } from "./story";
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
  drone: { cd: 20, heal: 0.3, revive: 0.5 },
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
  bob: number;
};

type Shard = { id: number; group: THREE.Group; hp: number; max: number; atk: number; hpBar: THREE.Group; hpFill: THREE.Mesh };
type Target = "boss" | Shard;
type Boulder = { target: Unit; at: THREE.Vector3; from: THREE.Vector3; t: number; ring: THREE.Mesh; fill: THREE.Mesh; rock: THREE.Mesh };
type Fade = { obj: THREE.Object3D; age: number; life: number; from?: THREE.Vector3; to?: THREE.Vector3 };
type Projectile = { mesh: THREE.Mesh; target: Target; dmg: number; crit: boolean; speed: number };
type Fx = { mesh: THREE.Mesh; age: number; life: number; grow: number };
type Floater = { el: HTMLDivElement; pos: THREE.Vector3; age: number };
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
  private view = 26;
  private camTarget = new THREE.Vector3();
  private followCam = true;
  private keysHeld = new Set<string>();
  private mouse: { x: number; y: number; inside: boolean } = { x: 0, y: 0, inside: false };

  private nav = new NavGrid(MAP + 4, 1);
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

  private shrineMeshes = new Map<string, { rune: THREE.Mesh; glow: THREE.Mesh }>();
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

  constructor(
    private canvas: HTMLCanvasElement,
    private overlay: HTMLDivElement,
    private cb: EngineCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color("#161b26");
    this.scene.fog = new THREE.Fog("#161b26", 55, 95);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    this.addLights();
    this.buildWorld();
    this.hero = this.spawn("hero", v2(0, 32), new THREE.Vector3());
    this.hero.order = "idle";
    this.setSelection([this.hero]);
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
    canvas.addEventListener("pointerleave", this.onPointerLeave);
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
    }
    const slots = [v2(-1.8, 1.8), v2(1.8, 1.8), v2(-1.8, 3.6), v2(1.8, 3.6), v2(0, 3.2)];
    const at = this.nav.nearestOpen({ x: s.at[0] + 2.2, z: s.at[1] + 2.2 });
    const unit = this.spawn(s.recruit, v2(at.x, at.z), slots[this.allies.length % slots.length]);
    this.allies.push(unit);
    this.ring(unit.group.position, s.rune, 3, 0.8);
    this.emitHud();
  }

  isUnlocked(a: AbilityId) {
    return this.visited.has(abilities[a].unlock);
  }

  /** Casts one of Vitaliy's abilities. Returns false if it couldn't be cast. */
  cast(a: AbilityId) {
    if (this.over() || this.paused || this.hero.hp <= 0 || !this.isUnlocked(a) || this.cds[a] > 0) return false;
    const hp = this.hero.group.position;
    if (a === "drone") {
      const revived = this.fallen.pop();
      if (revived) {
        const at = this.nav.nearestOpen({ x: hp.x + 1.6, z: hp.z + 1.6 });
        revived.hp = Math.round(revived.max * ABILITY.drone.revive);
        revived.group.position.set(at.x, 0, at.z);
        revived.order = "follow";
        revived.path = [];
        revived.target = null;
        revived.ring.visible = false;
        this.scene.add(revived.group);
        this.ring(revived.group.position, "#9cd67e", 2.2, 0.8);
        this.float(revived.group.position, "Revived", "heal");
      }
      for (const u of this.party()) {
        const amt = Math.min(u.max - u.hp, Math.round(u.max * ABILITY.drone.heal));
        u.hp += amt;
        if (amt > 0) this.float(u.group.position, `+${amt}`, "heal");
        this.ring(u.group.position, "#9cd67e", 1.4, 0.5);
      }
      this.flyDrone(hp, revived ? revived.group.position : hp);
    } else if (a === "checkmate") {
      const t = this.nearestEnemy(hp, ABILITY.checkmate.range);
      if (!t) return false;
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
      for (const u of this.party()) this.ring(u.group.position, "#e3c06a", 1.6, 0.6);
      this.float(hp.clone().setY(3), "Kelly bet: 1.5x", "crit");
    }
    this.cds[a] = ABILITY[a].cd;
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
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
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
      u.group.position.set(at.x, 0, at.z);
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
    this.view = THREE.MathUtils.clamp(this.view + Math.sign(e.deltaY) * 2, 16, 40);
    this.resize();
  };

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
      this.mouse = { x: p.x, y: p.y, inside: p.x >= 0 && p.y >= 0 && p.x <= this.canvas.clientWidth && p.y <= this.canvas.clientHeight };
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

  private setSelection(units: Unit[]) {
    this.selected = new Set(units.filter((u) => u.hp > 0));
    for (const u of [this.hero, ...this.allies]) u.ring.visible = this.selected.has(u);
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
  }

  private issueAttack(target: Target) {
    const units = this.selectedAlive();
    if (!units.length) return;
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
    this.scene.add(new THREE.HemisphereLight("#cfd9e6", "#3a4a2a", 1.1));
    const sun = new THREE.DirectionalLight("#fff1d6", 1.6);
    sun.position.set(25, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 50;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 120 });
    this.scene.add(sun);
  }

  private buildWorld() {
    const rand = rng(1997);

    const groundGeo = new THREE.PlaneGeometry(MAP * 2 + 20, MAP * 2 + 20, 60, 60);
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, (rand() - 0.5) * 0.14);
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, flat("#4f7239"));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Dirt road through every shrine to the arena.
    const route = [v2(0, 34), ...shrines.map((s) => v2(s.at[0], s.at[1])), v2(bossDef.arena[0], bossDef.arena[1] + 10)];
    const curve = new THREE.CatmullRomCurve3(route);
    const roadPts = curve.getSpacedPoints(160);
    this.roadPts = roadPts;
    const dirt = new THREE.InstancedMesh(new THREE.CircleGeometry(2.1, 12), flat("#8a6a42"), roadPts.length);
    const m4 = new THREE.Matrix4();
    roadPts.forEach((p, i) => {
      const r = 0.85 + rand() * 0.35;
      m4.compose(new THREE.Vector3(p.x, 0.1 + i * 0.0001, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rand() * 6)), new THREE.Vector3(r, r, r));
      dirt.setMatrixAt(i, m4);
    });
    dirt.receiveShadow = true;
    this.scene.add(dirt);

    // Arena: pale stone floor ringed by pillars.
    const [ax, az] = bossDef.arena;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 12), flat("#8c8a80"));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ax, 0.12, az);
    floor.receiveShadow = true;
    this.scene.add(floor);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.4) continue; // gap facing the road
      const h = 2.2 + rand() * 1.6;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), flat("#6d6b63"));
      const px = ax + Math.cos(a) * 12.5;
      const pz = az + Math.sin(a) * 12.5;
      pillar.position.set(px, h / 2, pz);
      pillar.rotation.y = rand();
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.nav.blockCircle(px, pz, 0.8 + UNIT_RADIUS);
    }

    // Forest: instanced trees and rocks, kept off the road and away from the arena.
    const nearRoad = (x: number, z: number) => roadPts.some((p) => Math.hypot(p.x - x, p.z - z) < 4.2);
    const nearArena = (x: number, z: number) => Math.hypot(x - ax, z - az) < 15.5;
    const spots: [number, number, number][] = [];
    for (let tries = 0; spots.length < 260 && tries < 4000; tries++) {
      const x = (rand() * 2 - 1) * (MAP + 8);
      const z = (rand() * 2 - 1) * (MAP + 8);
      if (nearRoad(x, z) || nearArena(x, z)) continue;
      if (Math.abs(x) < MAP - 6 && Math.abs(z) < MAP - 6 && rand() < 0.45) continue; // thinner in the middle
      spots.push([x, z, 0.8 + rand() * 0.7]);
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 1.2, 6), flat("#5a3d24"), spots.length);
    const lower = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 2.2, 7), flat("#2f5a2c"), spots.length);
    const upper = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 1.8, 7), flat("#3b6e34"), spots.length);
    spots.forEach(([x, z, s], i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6, 0));
      const sc = new THREE.Vector3(s, s, s);
      trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.6 * s, z), q, sc));
      lower.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 2.0 * s, z), q, sc));
      upper.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 3.1 * s, z), q, sc));
      // Units can brush the canopy but not walk through the trunk.
      this.nav.blockCircle(x, z, 0.55 * s + UNIT_RADIUS);
    });
    [trunks, lower, upper].forEach((t) => {
      t.castShadow = true;
      this.scene.add(t);
    });

    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), flat("#7d7d78"), 60);
    for (let i = 0; i < 60; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 20; t++) {
        x = (rand() * 2 - 1) * MAP;
        z = (rand() * 2 - 1) * MAP;
        if (!nearArena(x, z) && Math.hypot(x, z - 34) > 4) break;
      }
      const s = 0.5 + rand() * 1.1;
      rocks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.15 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s, s * 0.7, s)));
      this.nav.blockCircle(x, z, 0.42 * s + UNIT_RADIUS * 0.6);
    }
    rocks.castShadow = true;
    this.scene.add(rocks);

    // Shrines.
    for (const s of shrines) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.5, 8), flat("#6d6b63"));
      base.position.y = 0.25;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), flat("#8c8a80"));
      pillar.position.y = 1.6;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), flat(s.rune, { emissive: s.rune, emissiveIntensity: 1.2 }));
      rune.position.y = 3.3;
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(1.9, 2.4, 32),
        new THREE.MeshBasicMaterial({ color: s.rune, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.15;
      [base, pillar, rune].forEach((m) => {
        m.castShadow = true;
        g.add(m);
      });
      g.add(glow);
      g.position.set(s.at[0], 0, s.at[1]);
      this.scene.add(g);
      this.shrineMeshes.set(s.id, { rune, glow });
      this.nav.blockCircle(s.at[0], s.at[1], 1.6 + UNIT_RADIUS * 0.5);
    }

    this.buildBoss();
  }

  private buildBoss() {
    const g = new THREE.Group();
    const stone = flat("#77756b");
    const dark = flat("#5b5a52");
    const eye = flat("#e3c06a", { emissive: "#e3c06a", emissiveIntensity: 1.5 });
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    part(new THREE.BoxGeometry(0.8, 1.6, 0.8), dark, -0.6, 0.8, 0);
    part(new THREE.BoxGeometry(0.8, 1.6, 0.8), dark, 0.6, 0.8, 0);
    part(new THREE.BoxGeometry(2.4, 2.0, 1.4), stone, 0, 2.6, 0);
    part(new THREE.BoxGeometry(1.0, 0.9, 1.0), stone, 0, 4.1, 0);
    part(new THREE.BoxGeometry(0.18, 0.12, 0.05), eye, -0.22, 4.15, 0.52);
    part(new THREE.BoxGeometry(0.18, 0.12, 0.05), eye, 0.22, 4.15, 0.52);
    part(new THREE.BoxGeometry(0.7, 2.2, 0.7), dark, -1.6, 2.4, 0);
    part(new THREE.BoxGeometry(0.7, 2.2, 0.7), dark, 1.6, 2.4, 0);
    part(new THREE.DodecahedronGeometry(0.6, 0), stone, -1.6, 1.2, 0);
    part(new THREE.DodecahedronGeometry(0.6, 0), stone, 1.6, 1.2, 0);
    g.scale.setScalar(1.25);
    g.position.set(bossDef.arena[0], 0, bossDef.arena[1]);
    this.scene.add(g);
    this.bossGroup = g;

    const bar = this.makeBar(3.2, "#c25b4a");
    bar.group.position.y = 6.6;
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
    const g = new THREE.Group();
    const body = flat(st.body);
    const trim = flat(st.trim);
    const skin = flat("#c99a74");
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      m.castShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.CylinderGeometry(0.32, 0.45, 1.0, 7), body, 0, 0.75, 0);
    add(new THREE.SphereGeometry(0.27, 8, 6), skin, 0, 1.5, 0);
    add(new THREE.BoxGeometry(0.95, 0.18, 0.4), trim, 0, 1.2, 0);
    add(new THREE.BoxGeometry(0.62, 0.9, 0.06), trim, 0, 0.85, -0.3, 0.15); // cape

    if (kind === "hero") {
      add(new THREE.ConeGeometry(0.3, 0.35, 6), trim, 0, 1.82, 0);
      add(new THREE.BoxGeometry(0.1, 1.1, 0.1), flat("#d8d8d8"), 0.55, 0.9, 0.2);
    } else if (kind === "engineer") {
      add(new THREE.BoxGeometry(0.12, 0.7, 0.55), trim, -0.5, 0.85, 0.15);
      add(new THREE.BoxGeometry(0.4, 0.25, 0.12), flat("#9a9a9a"), 0.5, 0.95, 0.25);
    } else if (kind === "strategist") {
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), flat("#6b4a2a"), 0.45, 0.9, 0.1);
      add(new THREE.OctahedronGeometry(0.15), flat(st.trim, { emissive: st.trim, emissiveIntensity: 1 }), 0.45, 1.75, 0.1);
    } else if (kind === "quant") {
      add(new THREE.TorusGeometry(0.38, 0.04, 4, 10, Math.PI), flat("#6b4a2a"), 0.45, 0.9, 0.1);
    } else if (kind === "banner") {
      add(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 5), flat("#6b4a2a"), 0.4, 1.1, -0.1);
      add(new THREE.BoxGeometry(0.02, 0.55, 0.4), trim, 0.42, 1.8, 0.1);
    } else if (kind === "builder") {
      add(new THREE.BoxGeometry(0.5, 0.5, 0.35), flat("#7a5c3a"), 0, 1.0, -0.4);
      add(new THREE.BoxGeometry(0.3, 0.18, 0.1), flat("#9a9a9a"), 0.5, 0.9, 0.25);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 28),
      new THREE.MeshBasicMaterial({ color: "#7cd16b", transparent: true, opacity: 0.95, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.2;
    ring.visible = false;
    g.add(ring);

    g.scale.setScalar(st.scale);
    g.position.copy(at);
    this.scene.add(g);

    const bar = this.makeBar(1.1, kind === "hero" ? "#e3c06a" : "#7e9a63");
    bar.group.position.y = 2.35;
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
      bob: Math.random() * 6,
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
    this.billboardBars();
    this.renderer.render(this.scene, this.camera);
    this.updateFloaters(this.paused ? 0 : dt);
  };

  private party() {
    return [this.hero, ...this.allies].filter((u) => u.hp > 0);
  }

  private update(dt: number) {
    const t = this.timer.getElapsed();

    for (const [id, m] of this.shrineMeshes) {
      m.rune.rotation.y += dt * (this.visited.has(id) ? 0.3 : 1.5);
      m.rune.position.y = 3.3 + Math.sin(t * 2 + m.rune.id) * 0.12;
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
        h.group.position.y = 0;
        this.setPaused(true);
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
      u.group.position.y = 0;
      return true;
    }
    this.stepToward(u, u.path[0], speed, dt);
    return false;
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
    u.bob += dt * 12;
    p.y = Math.abs(Math.sin(u.bob)) * 0.12;
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
          const amt = Math.min(st.heal, hurt.max - hurt.hp);
          hurt.hp += amt;
          this.ring(hurt.group.position, "#7e9a63", 1.2, 0.4);
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
      u.group.position.y = 0;
      this.face(u, tp);
      u.atk -= dt;
      if (u.atk <= 0) {
        u.atk = st.cd;
        if (st.ranged) {
          const crit = !!st.crit && Math.random() < st.crit;
          this.shoot(u.group.position, tgt, st.dmg * this.dmgMult() * (crit ? 2 : 1), crit, st.trim);
        } else {
          this.hitTarget(tgt, st.dmg * this.dmgMult(), false);
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
          u.group.position.y = 0;
        }
        break;
      }
      default:
        u.group.position.y = 0;
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
        this.cb.onBossAggro();
      }
      return;
    }

    // Everyone left: the boss resets.
    if (!party.some((u) => distXZ(u.group.position, home) < 20)) {
      this.bossAggro = false;
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
      this.bossGroup.rotation.z = this.bossStun > 0 ? Math.sin(this.bossStun * 40) * 0.04 : 0;
      return;
    }

    if (this.telegraph) {
      this.telegraph.t += dt;
      const k = Math.min(1, this.telegraph.t / BOSS.slamWindup);
      this.telegraph.fill.scale.setScalar(Math.max(0.01, k));
      this.bossGroup.position.y = k * 0.6;
      if (k >= 1) {
        const c = this.telegraph.at;
        for (const u of party) {
          if (distXZ(u.group.position, c) <= BOSS.slamRadius) this.damage(u, BOSS.slamDmg);
        }
        this.ring(c, "#c25b4a", BOSS.slamRadius + 1, 0.5);
        this.bossGroup.position.y = 0;
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
      const off = bp.clone().sub(home).setY(0);
      if (off.length() > 11) bp.copy(home.clone().add(off.setLength(11)));
      return;
    }
    this.bossAtk -= dt;
    if (this.bossAtk <= 0) {
      this.bossAtk = BOSS.cd;
      this.damage(target, BOSS.dmg);
    }
  }

  /* ---------------------------------------------------------- mechanics */

  private spawnShards(n: number) {
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
    this.float(sh.group.position.clone().setY(1.8), `${Math.round(raw)}`, big ? "crit" : "dmg");
    if (sh.hp <= 0) {
      this.ring(sh.group.position, "#e0503c", 1.6, 0.4);
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
    this.boulder = { target, at, from, t: 0, ring, fill, rock };
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
    const k = Math.min(1, (b.t - BOULDER.fill) / BOULDER.flight);
    b.rock.position.lerpVectors(b.from, b.at.clone().setY(0.6), k);
    b.rock.position.y += Math.sin(k * Math.PI) * 4;
    b.rock.rotation.x += dt * 6;
    if (k < 1) return;
    for (const u of this.party()) {
      if (distXZ(u.group.position, b.at) <= BOULDER.radius) this.damage(u, DIFF[this.diff].boulderDmg);
    }
    this.ring(b.at, "#e0503c", BOULDER.radius + 1, 0.5);
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
    this.float(u.group.position, `-${amt}`, "hurt");
    if (u.hp <= 0) {
      u.hp = 0;
      this.scene.remove(u.group);
      this.selected.delete(u);
      u.ring.visible = false;
      if (u === this.hero) this.finish("lost");
      else this.fallen.push(u);
      this.emitHud();
    }
  }

  private hitBoss(raw: number, big: boolean) {
    if (this.bossDead) return;
    const amt = this.shards.length ? raw * STONE_SKIN : raw;
    this.bossHp -= amt;
    this.float(this.bossGroup.position.clone().setY(4), `${Math.round(amt)}`, this.shards.length ? "dmg" : big ? "crit" : "dmg");
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
      this.bossGroup.rotation.x = -Math.PI / 2.2;
      this.bossGroup.position.y = 0.6;
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

  private float(at: THREE.Vector3, text: string, kind: "dmg" | "crit" | "hurt" | "heal") {
    if (this.floaters.length > 40) return;
    const el = document.createElement("div");
    el.textContent = text;
    el.className = `floater floater-${kind}`;
    this.overlay.appendChild(el);
    const pos = at.clone();
    pos.x += (Math.random() - 0.5) * 0.8;
    pos.y = Math.max(pos.y, 2.2);
    this.floaters.push({ el, pos, age: 0 });
  }

  private updateFloaters(dt: number) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.floaters = this.floaters.filter((f) => {
      f.age += dt;
      f.pos.y += dt * 1.6;
      if (f.age > 0.9) {
        f.el.remove();
        return false;
      }
      const p = f.pos.clone().project(this.camera);
      f.el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(1 - f.age / 0.9);
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
      const edge = 12;
      if (this.mouse.x < edge) sx -= 1;
      if (this.mouse.x > this.canvas.clientWidth - edge) sx += 1;
      if (this.mouse.y < edge) sy -= 1;
      if (this.mouse.y > this.canvas.clientHeight - edge) sy += 1;
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
    this.camera.position.copy(this.camTarget).add(new THREE.Vector3(18, 24, 18));
    this.camera.lookAt(this.camTarget);
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const v = aspect < 1 ? this.view * 0.75 : this.view;
    Object.assign(this.camera, { left: (-v * aspect) / 2, right: (v * aspect) / 2, top: v / 2, bottom: -v / 2 });
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

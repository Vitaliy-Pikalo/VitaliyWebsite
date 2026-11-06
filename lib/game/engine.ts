import * as THREE from "three";
import { boss as bossDef, shrines, type Shrine, type UnitKind } from "./story";

/* ------------------------------------------------------------------ types */

export type Status = "explore" | "fight" | "won" | "lost";

export type HudState = {
  heroHp: number;
  heroMax: number;
  warband: { kind: UnitKind; hp: number; max: number }[];
  bossHp: number;
  bossMax: number;
  bossAggro: boolean;
  deployCd: number;
  rallyCd: number;
  status: Status;
};

export type EngineCallbacks = {
  onHud: (s: HudState) => void;
  onShrine: (s: Shrine) => void;
  onBossAggro: () => void;
  onEnd: (result: "won" | "lost") => void;
};

type Stats = {
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

const STATS: Record<UnitKind, Stats> = {
  hero: { hp: 420, dmg: 20, cd: 1.0, range: 1.6, speed: 6.2, body: "#2f4f8f", trim: "#c9a24a", scale: 1.15 },
  engineer: { hp: 540, dmg: 14, cd: 1.0, range: 1.5, speed: 5.4, body: "#5d6b4a", trim: "#7e9a63", scale: 1.1 },
  strategist: { hp: 230, dmg: 34, cd: 1.9, range: 7, speed: 5.0, body: "#3b5a86", trim: "#8fb3e0", scale: 0.95, ranged: true },
  quant: { hp: 210, dmg: 11, cd: 0.55, range: 7.5, speed: 5.8, body: "#6b5a2e", trim: "#e3c06a", scale: 0.95, ranged: true, crit: 0.25 },
  banner: { hp: 260, dmg: 0, cd: 1.8, range: 7, speed: 5.2, body: "#7a3d3d", trim: "#c97b7b", scale: 1.0, heal: 30 },
  builder: { hp: 320, dmg: 10, cd: 1.1, range: 1.5, speed: 5.0, body: "#4d3d66", trim: "#b08ad6", scale: 1.0 },
};

const BOSS = { hp: 2600, dmg: 44, cd: 1.6, radius: 1.7, speed: 3.4, slamEvery: 6.5, slamWindup: 1.7, slamRadius: 5.5, slamDmg: 130 };
const DEPLOY = { cd: 8, radius: 5, dmg: 150 };
const RALLY = { cd: 15, frac: 0.35 };
const MAP = 40;

type Unit = {
  kind: UnitKind;
  group: THREE.Group;
  hp: number;
  max: number;
  atk: number; // attack timer
  move: THREE.Vector3 | null;
  slot: THREE.Vector3;
  hpBar: THREE.Group;
  hpFill: THREE.Mesh;
  bob: number;
};

type Projectile = { mesh: THREE.Mesh; target: "boss" | Unit; dmg: number; crit: boolean; speed: number };
type Fx = { mesh: THREE.Mesh; age: number; life: number; grow: number };
type Floater = { el: HTMLDivElement; pos: THREE.Vector3; age: number };

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

function distXZ(a: THREE.Vector3, b: THREE.Vector3) {
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

  private hero!: Unit;
  private allies: Unit[] = [];
  private bossGroup!: THREE.Group;
  private bossHp = BOSS.hp;
  private bossAtk = 0;
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

  private deployCd = 0;
  private rallyCd = 0;
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
    this.camTarget.copy(this.hero.group.position);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 32),
      new THREE.MeshBasicMaterial({ color: "#e3c06a", transparent: true, opacity: 0, depthWrite: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.17;
    this.scene.add(this.marker);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();

    canvas.addEventListener("pointerdown", this.onPointer);
    canvas.addEventListener("contextmenu", this.onContext);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);

    this.loop();
  }

  /* ------------------------------------------------------------ public api */

  setPaused(p: boolean) {
    this.paused = p;
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
    const unit = this.spawn(s.recruit, v2(s.at[0] + 1.5, s.at[1] + 1.5), slots[this.allies.length % slots.length]);
    this.allies.push(unit);
    this.ring(unit.group.position, s.rune, 3, 0.8);
    this.emitHud(true);
  }

  deploy() {
    if (this.deployCd > 0 || this.status === "won" || this.status === "lost" || this.paused) return;
    this.deployCd = DEPLOY.cd;
    const p = this.hero.group.position;
    this.ring(p, "#e3c06a", DEPLOY.radius, 0.6);
    if (this.bossAggro && !this.bossDead && distXZ(p, this.bossGroup.position) <= DEPLOY.radius + BOSS.radius) {
      this.hitBoss(DEPLOY.dmg, true);
    }
    this.emitHud(true);
  }

  rally() {
    if (this.rallyCd > 0 || this.status === "won" || this.status === "lost" || this.paused) return;
    this.rallyCd = RALLY.cd;
    for (const u of this.party()) {
      const amt = Math.round(u.max * RALLY.frac);
      u.hp = Math.min(u.max, u.hp + amt);
      this.ring(u.group.position, "#7e9a63", 1.6, 0.6);
      this.float(u.group.position, `+${amt}`, "heal");
    }
    this.emitHud(true);
  }

  /** Test hook: order the hero to walk to a world position. */
  debugMoveTo(x: number, z: number) {
    this.hero.move = v2(x, z);
  }

  /** Test hook: read positions and status. */
  debugState() {
    return { hero: this.hero.group.position.toArray(), status: this.status, bossHp: this.bossHp, allies: this.allies.length, paused: this.paused };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointer);
    this.canvas.removeEventListener("contextmenu", this.onContext);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
    this.floaters.forEach((f) => f.el.remove());
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- input */

  private onContext = (e: Event) => e.preventDefault();

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.view = THREE.MathUtils.clamp(this.view + Math.sign(e.deltaY) * 2, 16, 40);
    this.resize();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName) && e.key === " ") return;
    const k = e.key.toLowerCase();
    if (k === "q") this.deploy();
    else if (k === "w") this.rally();
    else if (k === "s") this.hero.move = null;
  };

  private onPointer = (e: PointerEvent) => {
    if (this.paused || this.status === "won" || this.status === "lost") return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
    hit.x = THREE.MathUtils.clamp(hit.x, -MAP, MAP);
    hit.z = THREE.MathUtils.clamp(hit.z, -MAP, MAP);
    this.hero.move = hit.clone();
    this.marker.position.set(hit.x, 0.17, hit.z);
    (this.marker.material as THREE.MeshBasicMaterial).opacity = 1;
    this.marker.scale.setScalar(1.4);
  };

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

    // Ground with a slightly uneven, flat-shaded surface.
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
      pillar.position.set(ax + Math.cos(a) * 12.5, h / 2, az + Math.sin(a) * 12.5);
      pillar.rotation.y = rand();
      pillar.castShadow = true;
      this.scene.add(pillar);
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
      add(new THREE.ConeGeometry(0.3, 0.35, 6), trim, 0, 1.82, 0); // helm
      add(new THREE.BoxGeometry(0.1, 1.1, 0.1), flat("#d8d8d8"), 0.55, 0.9, 0.2); // sword
    } else if (kind === "engineer") {
      add(new THREE.BoxGeometry(0.12, 0.7, 0.55), trim, -0.5, 0.85, 0.15); // shield
      add(new THREE.BoxGeometry(0.4, 0.25, 0.12), flat("#9a9a9a"), 0.5, 0.95, 0.25); // hammer
    } else if (kind === "strategist") {
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), flat("#6b4a2a"), 0.45, 0.9, 0.1);
      add(new THREE.OctahedronGeometry(0.15), flat(st.trim, { emissive: st.trim, emissiveIntensity: 1 }), 0.45, 1.75, 0.1);
    } else if (kind === "quant") {
      add(new THREE.TorusGeometry(0.38, 0.04, 4, 10, Math.PI), flat("#6b4a2a"), 0.45, 0.9, 0.1);
    } else if (kind === "banner") {
      add(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 5), flat("#6b4a2a"), 0.4, 1.1, -0.1);
      add(new THREE.BoxGeometry(0.02, 0.55, 0.4), trim, 0.42, 1.8, 0.1);
    } else if (kind === "builder") {
      add(new THREE.BoxGeometry(0.5, 0.5, 0.35), flat("#7a5c3a"), 0, 1.0, -0.4); // pack
      add(new THREE.BoxGeometry(0.3, 0.18, 0.1), flat("#9a9a9a"), 0.5, 0.9, 0.25);
    }

    g.scale.setScalar(st.scale);
    g.position.copy(at);
    this.scene.add(g);

    const bar = this.makeBar(1.1, kind === "hero" ? "#e3c06a" : "#7e9a63");
    bar.group.position.y = 2.35;
    g.add(bar.group);

    return { kind, group: g, hp: st.hp, max: st.hp, atk: 0, move: null, slot, hpBar: bar.group, hpFill: bar.fill, bob: Math.random() * 6 };
  }

  /* ----------------------------------------------------------------- loop */

  private loop = (now?: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update(now);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    if (!this.paused) this.update(dt);
    this.updateCamera(dt);
    this.billboardBars();
    this.renderer.render(this.scene, this.camera);
    this.updateFloaters(this.paused ? 0 : dt);
  };

  private party() {
    return [this.hero, ...this.allies].filter((u) => u.hp > 0);
  }

  private update(dt: number) {
    const t = this.timer.getElapsed();

    // Shrine runes spin and bob.
    for (const [id, m] of this.shrineMeshes) {
      m.rune.rotation.y += dt * (this.visited.has(id) ? 0.3 : 1.5);
      m.rune.position.y = 3.3 + Math.sin(t * 2 + m.rune.id) * 0.12;
    }

    // Click marker fades out.
    const mm = this.marker.material as THREE.MeshBasicMaterial;
    mm.opacity = Math.max(0, mm.opacity - dt * 2);
    this.marker.scale.multiplyScalar(1 - dt * 0.8);

    if (this.status === "won" || this.status === "lost") {
      if (this.scroll) {
        this.scroll.rotation.y += dt * 1.2;
        this.scroll.position.y = 1.2 + Math.sin(t * 2) * 0.2;
      }
      this.updateFx(dt);
      return;
    }

    this.deployCd = Math.max(0, this.deployCd - dt);
    this.rallyCd = Math.max(0, this.rallyCd - dt);

    this.updateHero(dt);
    this.updateAllies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateFx(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) this.emitHud(true);
  }

  // Health bars always face the camera, even while paused.
  private billboardBars() {
    for (const u of this.party()) {
      u.hpFill.scale.x = Math.max(0.001, u.hp / u.max);
      u.hpBar.quaternion.copy(this.camera.quaternion).premultiply(u.group.quaternion.clone().invert());
    }
    this.bossHpFill.scale.x = Math.max(0.001, this.bossHp / BOSS.hp);
    this.bossHpBar.visible = this.bossAggro && !this.bossDead;
    this.bossHpBar.quaternion.copy(this.camera.quaternion).premultiply(this.bossGroup.quaternion.clone().invert());
  }

  private stepToward(u: Unit, goal: THREE.Vector3, speed: number, dt: number, stopAt = 0.15) {
    const p = u.group.position;
    const dx = goal.x - p.x;
    const dz = goal.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopAt) return true;
    const step = Math.min(d - stopAt, speed * dt);
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    u.group.rotation.y = Math.atan2(dx, dz);
    u.bob += dt * 12;
    p.y = Math.abs(Math.sin(u.bob)) * 0.12;
    return false;
  }

  private face(u: Unit, target: THREE.Vector3) {
    u.group.rotation.y = Math.atan2(target.x - u.group.position.x, target.z - u.group.position.z);
  }

  private updateHero(dt: number) {
    const h = this.hero;
    if (h.move) {
      if (this.stepToward(h, h.move, STATS.hero.speed, dt)) {
        h.move = null;
        h.group.position.y = 0;
      }
    }

    // Walking into an unvisited shrine opens its chapter.
    for (const s of shrines) {
      if (this.visited.has(s.id)) continue;
      if (distXZ(h.group.position, v2(s.at[0], s.at[1])) < 2.6) {
        h.move = null;
        h.group.position.y = 0;
        this.setPaused(true);
        this.cb.onShrine(s);
        return;
      }
    }

    if (!h.move && this.bossAggro && !this.bossDead) this.meleeBoss(h, dt);
  }

  private meleeBoss(u: Unit, dt: number) {
    const st = STATS[u.kind];
    const d = distXZ(u.group.position, this.bossGroup.position);
    if (d > st.range + BOSS.radius + 0.3) return false;
    this.face(u, this.bossGroup.position);
    u.atk -= dt;
    if (u.atk <= 0) {
      u.atk = st.cd;
      this.hitBoss(st.dmg, false);
    }
    return true;
  }

  private updateAllies(dt: number) {
    const fighting = this.bossAggro && !this.bossDead;
    const hp = this.hero.group.position;

    for (const u of this.allies) {
      if (u.hp <= 0) continue;
      const st = STATS[u.kind];

      // Trained troops step out of an incoming slam on their own. The hero has to be moved by you.
      if (this.telegraph) {
        const c = this.telegraph.at;
        const d = distXZ(u.group.position, c);
        if (d < BOSS.slamRadius + 0.8) {
          const away = u.group.position.clone().sub(c).setY(0);
          if (away.lengthSq() < 0.01) away.set(1, 0, 0);
          away.normalize().multiplyScalar(BOSS.slamRadius + 2).add(c);
          this.stepToward(u, away, st.speed * 1.1, dt);
          continue;
        }
      }

      if (!fighting) {
        const goal = hp.clone().add(u.slot);
        if (distXZ(u.group.position, goal) > 0.8) this.stepToward(u, goal, st.speed * (distXZ(u.group.position, goal) > 6 ? 1.4 : 1), dt, 0.4);
        else u.group.position.y = 0;
        continue;
      }

      if (st.heal) {
        const hurt = this.party()
          .filter((a) => a.hp < a.max)
          .sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
        if (!hurt) continue;
        if (distXZ(u.group.position, hurt.group.position) > st.range) {
          this.stepToward(u, hurt.group.position, st.speed, dt, st.range - 0.5);
          continue;
        }
        u.atk -= dt;
        if (u.atk <= 0) {
          u.atk = st.cd;
          const amt = Math.min(st.heal, hurt.max - hurt.hp);
          hurt.hp += amt;
          this.ring(hurt.group.position, "#7e9a63", 1.2, 0.4);
          if (amt > 0) this.float(hurt.group.position, `+${Math.round(amt)}`, "heal");
        }
        continue;
      }

      const bp = this.bossGroup.position;
      const reach = st.range + BOSS.radius;
      if (distXZ(u.group.position, bp) > reach) {
        this.stepToward(u, bp, st.speed, dt, reach - 0.3);
        continue;
      }
      u.group.position.y = 0;
      this.face(u, bp);
      u.atk -= dt;
      if (u.atk <= 0) {
        u.atk = st.cd;
        if (st.ranged) {
          const crit = !!st.crit && Math.random() < st.crit;
          this.shoot(u.group.position, "boss", st.dmg * (crit ? 2 : 1), crit, st.trim);
        } else {
          this.hitBoss(st.dmg, false);
        }
      }
    }
  }

  private updateBoss(dt: number) {
    if (this.bossDead) return;
    const home = v2(bossDef.arena[0], bossDef.arena[1]);
    const party = this.party();
    const inArena = party.filter((u) => distXZ(u.group.position, home) < 13.5);

    if (!this.bossAggro) {
      if (inArena.length) {
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
      this.bossHp = BOSS.hp;
      this.clearTelegraph();
      this.bossGroup.position.copy(home);
      return;
    }

    const bp = this.bossGroup.position;

    // Slam: telegraph, then hit everything inside the circle.
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

    this.bossSlam -= dt;
    if (this.bossSlam <= 0) {
      this.bossSlam = this.bossHp < BOSS.hp / 2 ? BOSS.slamEvery * 0.7 : BOSS.slamEvery;
      this.startTelegraph(bp.clone().setY(0));
      return;
    }

    // Target: the engineer taunts when close, otherwise the nearest unit.
    const tank = party.find((u) => u.kind === "engineer" && distXZ(u.group.position, bp) < 6);
    const target = tank ?? [...party].sort((a, b) => distXZ(a.group.position, bp) - distXZ(b.group.position, bp))[0];
    if (!target) return;
    const d = distXZ(target.group.position, bp);
    const reach = BOSS.radius + 1.4;
    this.bossGroup.rotation.y = Math.atan2(target.group.position.x - bp.x, target.group.position.z - bp.z);
    if (d > reach) {
      const step = Math.min(d - reach, BOSS.speed * dt);
      const dir = target.group.position.clone().sub(bp).setY(0).normalize();
      bp.addScaledVector(dir, step);
      // Leash to the arena.
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
    const amt = Math.round(this.builderNear(u) ? raw * 0.75 : raw);
    u.hp -= amt;
    this.float(u.group.position, `-${amt}`, "hurt");
    if (u.hp <= 0) {
      u.hp = 0;
      this.scene.remove(u.group);
      if (u === this.hero) this.finish("lost");
    }
  }

  private hitBoss(raw: number, big: boolean) {
    if (this.bossDead) return;
    this.bossHp -= raw;
    this.float(this.bossGroup.position.clone().setY(4), `${Math.round(raw)}`, big ? "crit" : "dmg");
    if (this.bossHp <= 0) {
      this.bossHp = 0;
      this.bossDead = true;
      this.clearTelegraph();
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
    if (this.status === "won" || this.status === "lost") return;
    this.status = result;
    this.emitHud(true);
    this.cb.onEnd(result);
  }

  private shoot(from: THREE.Vector3, target: "boss" | Unit, dmg: number, crit: boolean, color: string) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(crit ? 0.22 : 0.15, 6, 4), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(from).setY(1.3);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, target, dmg, crit, speed: 18 });
  }

  private updateProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter((p) => {
      const goal = p.target === "boss" ? this.bossGroup.position.clone().setY(3) : p.target.group.position.clone().setY(1.2);
      const d = p.mesh.position.distanceTo(goal);
      if (d < 0.4 || this.bossDead) {
        if (!this.bossDead && p.target === "boss") this.hitBoss(p.dmg, p.crit);
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

  private updateCamera(dt: number) {
    if (this.hero.hp > 0) this.camTarget.lerp(this.hero.group.position.clone().setY(0), Math.min(1, dt * 4));
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

  private emitHud(force: boolean) {
    if (!force) return;
    this.hudTimer = 0.1;
    this.cb.onHud({
      heroHp: Math.max(0, Math.round(this.hero.hp)),
      heroMax: this.hero.max,
      warband: this.allies.map((u) => ({ kind: u.kind, hp: Math.round(u.hp), max: u.max })),
      bossHp: Math.round(this.bossHp),
      bossMax: BOSS.hp,
      bossAggro: this.bossAggro && !this.bossDead,
      deployCd: this.deployCd,
      rallyCd: this.rallyCd,
      status: this.status,
    });
  }
}

import * as THREE from "three";

// Pooled particles: one instanced mesh, fixed capacity, no allocation during play.

type BurstOptions = {
  count: number;
  color: string | string[];
  speed?: number; // outward speed
  up?: number; // initial upward speed
  gravity?: number;
  size?: number;
  life?: number;
  spread?: number; // start radius
};

export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private grav: Float32Array;
  private next = 0;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(private capacity = 500) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
      capacity,
    );
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity).fill(1);
    this.size = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.mesh.setColorAt(i, this.c.set("#ffffff"));
    }
  }

  burst(at: THREE.Vector3, o: BurstOptions) {
    const colors = Array.isArray(o.color) ? o.color : [o.color];
    for (let k = 0; k < o.count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.capacity;
      const a = Math.random() * Math.PI * 2;
      const r = (o.spread ?? 0.2) * Math.random();
      const sp = (o.speed ?? 3) * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = at.x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = at.y;
      this.pos[i * 3 + 2] = at.z + Math.sin(a) * r;
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = (o.up ?? 3) * (0.5 + Math.random() * 0.7);
      this.vel[i * 3 + 2] = Math.sin(a) * sp;
      const life = (o.life ?? 0.7) * (0.7 + Math.random() * 0.5);
      this.life[i] = life;
      this.maxLife[i] = life;
      this.size[i] = (o.size ?? 0.14) * (0.6 + Math.random() * 0.8);
      this.grav[i] = o.gravity ?? 9;
      this.mesh.setColorAt(i, this.c.set(colors[k % colors.length]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.mesh.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(0.05, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      const sz = this.size[i] * (0.3 + 0.7 * k);
      this.e.set(this.life[i] * 7, this.life[i] * 5, 0);
      this.m4.compose(this.v.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]), this.q.setFromEuler(this.e), this.s.set(sz, sz, sz));
      this.mesh.setMatrixAt(i, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

let glowTexture: THREE.Texture | null = null;

/** Soft round glow for additive sprites (rune halos, flames). */
export function glowSprite(color: string, scale: number, opacity = 0.9) {
  if (!glowTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowTexture = new THREE.CanvasTexture(c);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

/** A warm pool of light painted on the ground. Stands in for a point light at a fraction of the cost. */
function groundGlow(color: string, size: number, opacity: number) {
  glowSprite(color, 1).material.dispose(); // make sure the shared texture exists
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  return m;
}

export type Brazier = { flame: THREE.Mesh; glow: THREE.Sprite; pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; seed: number };

/** Stone fire bowl with a flickering flame and a warm point light. */
export function buildBrazier(scene: THREE.Scene, x: number, z: number): Brazier {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: "#5f5d56", flatShading: true });
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.0, 6), stone);
  stand.position.y = 0.5;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.32, 8), stone);
  bowl.position.y = 1.12;
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8), new THREE.MeshBasicMaterial({ color: "#ff7a3c", toneMapped: false }));
  coals.position.y = 1.27;
  [stand, bowl].forEach((m) => {
    m.castShadow = true;
    g.add(m);
  });
  g.add(coals);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.9, 7),
    new THREE.MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.9, toneMapped: false }),
  );
  flame.position.y = 1.7;
  g.add(flame);
  const glow = glowSprite("#ff9a3c", 2.6, 0.75);
  glow.position.y = 1.75;
  g.add(glow);
  // No real light: a point light would add a cost to every lit pixel on screen.
  const pool = groundGlow("#ff9a3c", 7, 0.32);
  g.add(pool);
  g.position.set(x, 0, z);
  scene.add(g);
  return { flame, glow, pool, seed: Math.random() * 10 };
}

export function animateBraziers(list: Brazier[], t: number) {
  for (const b of list) {
    const f = 1 + Math.sin(t * 11 + b.seed) * 0.12 + Math.sin(t * 23 + b.seed * 2) * 0.08;
    b.flame.scale.set(1 / f, f, 1 / f);
    b.flame.rotation.y = t * 2 + b.seed;
    b.glow.material.opacity = 0.6 + (f - 1) * 1.2;
    b.pool.material.opacity = 0.3 + (f - 1) * 0.5;
  }
}

// Grid-based navigation: obstacles are stamped as inflated circles, paths come
// from 8-directional A* and are smoothed with line-of-sight checks.

export type Point = { x: number; z: number };

const SQRT2 = Math.SQRT2;

export class NavGrid {
  readonly cells: number;
  private blocked: Uint8Array;

  constructor(
    private half: number, // world extends from -half to +half on both axes
    private cell = 1,
  ) {
    this.cells = Math.ceil((half * 2) / cell);
    this.blocked = new Uint8Array(this.cells * this.cells);
  }

  private toCell(v: number) {
    return Math.floor((v + this.half) / this.cell);
  }

  private center(c: number) {
    return (c + 0.5) * this.cell - this.half;
  }

  private inside(cx: number, cz: number) {
    return cx >= 0 && cz >= 0 && cx < this.cells && cz < this.cells;
  }

  /** Marks every cell whose center lies within `r` of (x, z). */
  blockCircle(x: number, z: number, r: number) {
    const c0x = this.toCell(x - r);
    const c1x = this.toCell(x + r);
    const c0z = this.toCell(z - r);
    const c1z = this.toCell(z + r);
    for (let cz = c0z; cz <= c1z; cz++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        if (!this.inside(cx, cz)) continue;
        if (Math.hypot(this.center(cx) - x, this.center(cz) - z) <= r) this.blocked[cz * this.cells + cx] = 1;
      }
    }
  }

  isBlocked(x: number, z: number) {
    const cx = this.toCell(x);
    const cz = this.toCell(z);
    if (!this.inside(cx, cz)) return true;
    return this.blocked[cz * this.cells + cx] === 1;
  }

  /** True if a straight walk from a to b never enters a blocked cell. */
  lineClear(a: Point, b: Point) {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(d / (this.cell * 0.35));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.isBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** Nearest walkable point to p, searched in growing rings. */
  nearestOpen(p: Point): Point {
    if (!this.isBlocked(p.x, p.z)) return p;
    const cx = this.toCell(p.x);
    const cz = this.toCell(p.z);
    for (let r = 1; r < this.cells; r++) {
      let best: Point | null = null;
      let bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (!this.inside(nx, nz) || this.blocked[nz * this.cells + nx]) continue;
          const q = { x: this.center(nx), z: this.center(nz) };
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          if (d < bestD) {
            bestD = d;
            best = q;
          }
        }
      }
      if (best) return best;
    }
    return p;
  }

  /**
   * Waypoints from `from` to `to` (excluding the start). An unreachable or
   * blocked goal is replaced by the nearest walkable point.
   */
  findPath(from: Point, to: Point): Point[] {
    const goal = this.nearestOpen(to);
    const start = this.isBlocked(from.x, from.z) ? this.nearestOpen(from) : from;
    if (this.lineClear(start, goal)) return [goal];

    const n = this.cells;
    const sx = this.toCell(start.x);
    const sz = this.toCell(start.z);
    const gx = this.toCell(goal.x);
    const gz = this.toCell(goal.z);
    const startI = sz * n + sx;
    const goalI = gz * n + gx;

    const g = new Float32Array(n * n).fill(Infinity);
    const came = new Int32Array(n * n).fill(-1);
    const closed = new Uint8Array(n * n);
    const heap = new MinHeap();
    const h = (i: number) => {
      const dx = Math.abs((i % n) - gx);
      const dz = Math.abs(Math.floor(i / n) - gz);
      return dx + dz + (SQRT2 - 2) * Math.min(dx, dz);
    };

    g[startI] = 0;
    heap.push(startI, h(startI));
    let reached = -1;
    let closest = startI;
    let closestH = h(startI);

    while (heap.size) {
      const cur = heap.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goalI) {
        reached = cur;
        break;
      }
      const hc = h(cur);
      if (hc < closestH) {
        closestH = hc;
        closest = cur;
      }
      const cx = cur % n;
      const cz = Math.floor(cur / n);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (!this.inside(nx, nz)) continue;
          const ni = nz * n + nx;
          if (this.blocked[ni] || closed[ni]) continue;
          // No corner cutting past obstacles.
          if (dx && dz && (this.blocked[cz * n + nx] || this.blocked[nz * n + cx])) continue;
          const cost = g[cur] + (dx && dz ? SQRT2 : 1);
          if (cost < g[ni]) {
            g[ni] = cost;
            came[ni] = cur;
            heap.push(ni, cost + h(ni));
          }
        }
      }
    }

    const end = reached >= 0 ? reached : closest;
    const cellsPath: Point[] = [];
    for (let i = end; i !== -1 && i !== startI; i = came[i]) {
      cellsPath.push({ x: this.center(i % n), z: this.center(Math.floor(i / n)) });
    }
    cellsPath.reverse();
    if (reached >= 0) cellsPath[cellsPath.length - 1] = goal;
    return this.smooth(start, cellsPath);
  }

  /** Drops waypoints that can be skipped with a clear straight line. */
  private smooth(start: Point, pts: Point[]): Point[] {
    if (pts.length < 2) return pts;
    const out: Point[] = [];
    let anchor = start;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineClear(anchor, pts[j])) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size() {
    return this.ids.length;
  }

  push(id: number, key: number) {
    this.ids.push(id);
    this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop() {
    const top = this.ids[0];
    const lastId = this.ids.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.ids.length) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.ids.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}

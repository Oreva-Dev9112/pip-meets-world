import type { VenueKind } from './cast';
import type { Fog } from './fog';
import { NORTH, W } from './island';
import { INK } from './places';
import { dist, seeded, type Point } from './random';

// The town in the north, grown from its own seed so it never changes the island.

export interface Venue extends Point {
  id: string;
  kind: VenueKind;
  name: string;
  cost: number;
  found: boolean;
  visits: number;
  pulse: number;
}

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  wall: string;
  venue?: Venue;
  /** Whether its windows are lit late at night. */
  nightLight: boolean;
}

/** A spot the journal can link to. */
export interface Spot extends Point {
  name: string;
  pulse: number;
}

const COST: Record<VenueKind, number> = { cafe: 2, bakery: 1, pub: 3, theatre: 5, books: 3, records: 4, market: 2 };
const NAMES: Record<VenueKind, string[]> = {
  cafe: ['the Crooked Kettle', 'the Sleepy Spoon', 'Cup and Saucer'],
  bakery: ['Crumb and Co', 'the Rising Loaf', 'Bun Hill Bakery'],
  pub: ['the Wobbly Anchor', 'the Fox and Fiddle', 'the Last Puddle'],
  theatre: ['the Velvet Curtain', 'the Little Stage'],
  books: ['Dog-Ear Books', 'the Quiet Page'],
  records: ['Spin Cycle Records', 'the B-Side'],
  market: ['the Market'],
};
const WALLS = ['#F4E3B5', '#F2D0C4', '#D6E3EE', '#E8DDF2', '#DDEBD3'];

export class Town {
  /** The causeway is there from the start, but only becomes land when it opens. */
  open = false;
  readonly nodes: Point[] = [];
  readonly adj: number[][] = [];
  readonly venues: Venue[] = [];
  readonly houses: Point[] = [];
  readonly causeway: { south: Point; north: Point };
  readonly causewaySpot: Spot;
  readonly square: Point;
  private readonly buildings: Building[] = [];
  private readonly edges: [number, number][] = [];
  private readonly cx: number;
  private readonly cy = 330;
  private readonly rx = 440;
  private readonly ry = 215;
  private readonly wobble: [number, number];
  private readonly R = seeded(5150);

  constructor(shore: Point) {
    const R = this.R;
    this.cx = Math.min(Math.max(shore.x, 520), W - 520);
    this.wobble = [R() * 6.28, R() * 6.28];
    const cwx = shore.x;
    this.causeway = { south: { x: cwx, y: shore.y + 14 }, north: { x: cwx, y: this.cy + this.ry * 0.78 } };
    this.causewaySpot = { name: 'the causeway', x: cwx, y: (this.causeway.south.y + this.causeway.north.y) / 2, pulse: 0 };
    this.layStreets();
    this.square = this.nodes[7];
    this.raiseBuildings();
  }

  /** Land in the north: the town, and the causeway once it is open. */
  isLand(x: number, y: number): boolean {
    const { south, north } = this.causeway;
    if (this.open && Math.abs(x - south.x) < 10 && y <= south.y && y >= north.y - 10) return true;
    return y < NORTH && this.inside(x, y, 1);
  }

  /** North of the causeway's far end counts as being in town. */
  contains(p: Point): boolean {
    return p.y < this.causeway.north.y + 6;
  }

  nearestNode(p: Point): number {
    let best = 0, bd = 1e9;
    this.nodes.forEach((n, i) => { const d = dist(n, p); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /** Waypoints along the streets from one point in town to another, ending at the destination. */
  route(from: Point, to: Point): Point[] {
    const s = this.nearestNode(from), e = this.nearestNode(to);
    const prev = new Array<number>(this.nodes.length).fill(-1);
    const queue = [s];
    prev[s] = s;
    while (queue.length) {
      const n = queue.shift()!;
      if (n === e) break;
      for (const m of this.adj[n]) if (prev[m] < 0) { prev[m] = n; queue.push(m); }
    }
    const path: Point[] = [];
    for (let n = e; n !== s && prev[n] >= 0; n = prev[n]) path.unshift(this.nodes[n]);
    path.unshift(this.nodes[s]);
    // Skip the first corner if it means doubling back.
    if (path.length > 1 && dist(from, path[1]) < dist(path[0], path[1])) path.shift();
    return [...path, to];
  }

  /** The street corner nearest the causeway. */
  get gate(): Point {
    return this.nodes[this.nodes.length - 1];
  }

  /** How much of the town your dot has seen, from 0 to 1. */
  explored(fog: Fog): number {
    let all = 0, seen = 0;
    for (let y = this.cy - this.ry; y < this.cy + this.ry; y += 40) {
      for (let x = this.cx - this.rx; x < this.cx + this.rx; x += 40) {
        if (!this.inside(x, y, 1)) continue;
        all++;
        if (fog.isSeen(x, y)) seen++;
      }
    }
    return all ? seen / all : 0;
  }

  // ---------- Growing it ----------

  private inside(x: number, y: number, k: number): boolean {
    const dx = (x - this.cx) / this.rx, dy = (y - this.cy) / this.ry, a = Math.atan2(dy, dx);
    const r = (1 + Math.sin(a * 3 + this.wobble[0]) * 0.06 + Math.sin(a * 5 + this.wobble[1]) * 0.03) * k;
    return dx * dx + dy * dy < r * r;
  }

  /** A crooked grid of streets, five across and three down, with a few links missing and a gate to the causeway. */
  private layStreets(): void {
    const R = this.R, { cx, cy } = this;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const sq = row === 1 && col === 2;
        this.nodes.push({ x: cx + (col - 2) * 150 + (sq ? 0 : (R() - 0.5) * 40), y: cy + (row - 1) * 100 + (sq ? 0 : (R() - 0.5) * 30) });
      }
    }
    for (let i = 0; i < 15; i++) this.adj.push([]);
    const link = (a: number, b: number) => { this.adj[a].push(b); this.adj[b].push(a); this.edges.push([a, b]); };
    const candidates: [number, number][] = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      const i = row * 5 + col;
      if (col < 4) candidates.push([i, i + 1]);
      if (row < 2) candidates.push([i, i + 5]);
    }
    // Drop a few streets, as long as everywhere can still be reached.
    const dropped = new Set<number>();
    for (let tries = 0; tries < 12 && dropped.size < 4; tries++) {
      const k = (R() * candidates.length) | 0;
      if (dropped.has(k) || candidates[k].includes(7)) continue;
      dropped.add(k);
      if (!this.connected(candidates.filter((_, j) => !dropped.has(j)))) dropped.delete(k);
    }
    candidates.forEach(([a, b], j) => { if (!dropped.has(j)) link(a, b); });
    const gate = { x: this.causeway.north.x, y: this.causeway.north.y - 4 };
    this.nodes.push(gate);
    this.adj.push([]);
    let near = 10, nd = 1e9;
    for (let i = 10; i < 15; i++) { const d = dist(this.nodes[i], gate); if (d < nd) { nd = d; near = i; } }
    link(15, near);
  }

  private connected(edges: [number, number][]): boolean {
    const seen = new Set([0]), stack = [0];
    while (stack.length) {
      const n = stack.pop()!;
      for (const [a, b] of edges) {
        const m = a === n ? b : b === n ? a : -1;
        if (m >= 0 && !seen.has(m)) { seen.add(m); stack.push(m); }
      }
    }
    return seen.size === 15;
  }

  /** Houses along both sides of every street, with the venues nearest the square. */
  private raiseBuildings(): void {
    const R = this.R, slots: Building[] = [];
    const nearStreet = (x: number, y: number, r: number) => this.edges.some(([a, b]) => segDist({ x, y }, this.nodes[a], this.nodes[b]) < r);
    for (const [a, b] of this.edges) {
      const A = this.nodes[a], B = this.nodes[b], len = dist(A, B), nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
      for (let t = 0.25; t <= 0.76; t += 36 / len) {
        for (const side of [-1, 1]) {
          const x = A.x + (B.x - A.x) * t + nx * 30 * side, y = A.y + (B.y - A.y) * t + ny * 30 * side;
          const w = 30, h = 22;
          if (!this.inside(x - w / 2, y - h / 2, 0.92) || !this.inside(x + w / 2, y + h / 2, 0.92) || !this.inside(x - w / 2, y + h / 2, 0.92) || !this.inside(x + w / 2, y - h / 2, 0.92)) continue;
          if (dist({ x, y }, this.square) < 78 || nearStreet(x, y, 22)) continue;
          if (slots.some((s) => Math.abs(s.x - x) < 34 && Math.abs(s.y - y) < 27)) continue;
          slots.push({ x, y, w, h, wall: WALLS[(R() * WALLS.length) | 0], nightLight: R() < 0.35 });
        }
      }
    }
    this.buildings.push(...slots);
    // Venues take the buildings nearest the square, in a shuffled order.
    const byCentre = slots.slice().sort((p, q) => dist(p, this.square) - dist(q, this.square)).slice(0, 14);
    const kinds: VenueKind[] = ['cafe', 'bakery', 'pub', 'theatre', 'books', 'records'];
    for (const kind of kinds) {
      const b = byCentre.splice((R() * Math.min(4, byCentre.length)) | 0, 1)[0];
      if (!b) break;
      const door = this.doorOf(b);
      b.venue = { id: 'v-' + kind, kind, name: NAMES[kind][(R() * NAMES[kind].length) | 0], cost: COST[kind], x: door.x, y: door.y, found: false, visits: 0, pulse: 0 };
      b.nightLight = true;
      this.venues.push(b.venue);
    }
    this.venues.push({ id: 'v-market', kind: 'market', name: 'the Market', cost: COST.market, x: this.square.x, y: this.square.y + 34, found: false, visits: 0, pulse: 0 });
    for (const b of slots) if (!b.venue) this.houses.push(this.doorOf(b));
  }

  /** The point on the nearest street just outside a building's door. */
  private doorOf(b: Building): Point {
    let best = { x: b.x, y: b.y }, bd = 1e9;
    for (const [a, c] of this.edges) {
      const p = closest({ x: b.x, y: b.y }, this.nodes[a], this.nodes[c]), d = dist(p, b);
      if (d < bd) { bd = d; best = p; }
    }
    return { x: b.x + (best.x - b.x) * 0.55, y: b.y + (best.y - b.y) * 0.55 };
  }

  // ---------- Drawing ----------

  /** Paints the town onto the terrain, once. The fog hides it until your dot gets there. */
  paint(g: CanvasRenderingContext2D): void {
    const blob = (k: number) => {
      g.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * 6.283, r = (1 + Math.sin(a * 3 + this.wobble[0]) * 0.06 + Math.sin(a * 5 + this.wobble[1]) * 0.03) * k;
        const x = this.cx + Math.cos(a) * this.rx * r, y = this.cy + Math.sin(a) * this.ry * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
    };
    g.save();
    g.fillStyle = '#ABDADC'; blob(1.06); g.fill();
    g.fillStyle = '#F0E5BE'; blob(1); g.fill();
    g.fillStyle = '#CDE4A6'; blob(0.95); g.fill();
    // Streets: a darker edge, then the cobbles.
    g.lineCap = 'round';
    for (const [w, c] of [[22, '#B9A98C'], [18, '#E5D8BD']] as const) {
      g.strokeStyle = c; g.lineWidth = w; g.beginPath();
      for (const [a, b] of this.edges) { g.moveTo(this.nodes[a].x, this.nodes[a].y); g.lineTo(this.nodes[b].x, this.nodes[b].y); }
      g.stroke();
      g.fillStyle = c; g.beginPath(); g.arc(this.square.x, this.square.y, w === 22 ? 62 : 60, 0, 7); g.fill();
    }
    // The fountain, and market stalls round it.
    const s = this.square;
    g.strokeStyle = INK; g.lineWidth = 2;
    g.fillStyle = '#C3CBCD'; g.beginPath(); g.arc(s.x, s.y, 17, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#9CCFD3'; g.beginPath(); g.arc(s.x, s.y, 12, 0, 7); g.fill();
    g.fillStyle = '#FBFBF6'; g.beginPath(); g.arc(s.x, s.y - 2, 3, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) {
      const a = 0.8 + i * 1.57, x = s.x + Math.cos(a) * 42, y = s.y + Math.sin(a) * 38;
      g.fillStyle = '#B98E5E'; g.fillRect(x - 9, y - 2, 18, 8); g.strokeRect(x - 9, y - 2, 18, 8);
      for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#FBFBF6' : ['#D94F5C', '#6C9CF2', '#F2A93B', '#7ED8A4'][i]; g.fillRect(x - 11 + k * 7.3, y - 10, 7.3, 7); }
      g.strokeRect(x - 11, y - 10, 22, 7);
    }
    for (const b of this.buildings) this.paintBuilding(g, b);
    g.restore();
  }

  private paintBuilding(g: CanvasRenderingContext2D, b: Building): void {
    const { x, y, w, h } = b, big = b.venue?.kind === 'theatre' ? 1.25 : 1, W2 = (w * big) / 2, H2 = (h * big) / 2;
    g.fillStyle = 'rgba(31,51,64,0.12)'; g.fillRect(x - W2 + 3, y - H2 + 4, W2 * 2, H2 * 2);
    g.fillStyle = b.wall; g.strokeStyle = INK; g.lineWidth = 2;
    g.fillRect(x - W2, y - H2, W2 * 2, H2 * 2); g.strokeRect(x - W2, y - H2, W2 * 2, H2 * 2);
    g.fillStyle = b.venue ? '#B5651D' : '#8A9AA3';
    g.beginPath(); g.moveTo(x - W2 - 3, y - H2); g.lineTo(x, y - H2 - 10 * big); g.lineTo(x + W2 + 3, y - H2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5B6B76'; g.fillRect(x - W2 + 5, y - 3, 6, 6); g.fillRect(x + W2 - 11, y - 3, 6, 6);
    g.fillStyle = INK; g.fillRect(x - 3, y + H2 - 9, 6, 9);
    if (!b.venue) return;
    g.font = '700 14px Caveat, cursive'; g.textAlign = 'center'; g.lineWidth = 3;
    const label = b.venue.name.replace(/^the /, '');
    g.strokeStyle = 'rgba(251,251,246,0.95)'; g.strokeText(label, x, y + H2 + 14);
    g.fillStyle = INK; g.fillText(label, x, y + H2 + 14);
  }

  /** Paints the causeway on the day it appears. */
  paintCauseway(g: CanvasRenderingContext2D): void {
    const { south, north } = this.causeway;
    g.save();
    g.fillStyle = '#E2D3A8'; g.strokeStyle = INK; g.lineWidth = 2;
    g.fillRect(south.x - 10, north.y, 20, south.y - north.y);
    g.beginPath(); g.moveTo(south.x - 10, north.y); g.lineTo(south.x - 10, south.y); g.moveTo(south.x + 10, north.y); g.lineTo(south.x + 10, south.y); g.stroke();
    g.fillStyle = 'rgba(31,51,64,0.18)';
    for (let y = north.y + 8; y < south.y; y += 14) { g.beginPath(); g.ellipse(south.x + ((y * 7) % 9) - 4, y, 3, 2, 0, 0, 7); g.fill(); }
    g.restore();
  }

  /** Lit windows after dark, only where your dot has been. The pub stays lit latest. */
  drawLights(g: CanvasRenderingContext2D, glow: HTMLCanvasElement, dark: number, late: boolean, fog: Fog): void {
    if (dark < 0.3) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const b of this.buildings) {
      if (!fog.isSeen(b.x, b.y)) continue;
      const on = b.venue ? !late || b.venue.kind === 'pub' : !late || b.nightLight;
      if (!on) continue;
      const size = b.venue?.kind === 'pub' || b.venue?.kind === 'theatre' ? 70 : b.venue ? 56 : 44;
      g.globalAlpha = Math.min(1, (dark - 0.3) * 1.8);
      g.drawImage(glow, b.x - size / 2, b.y - size / 2, size, size);
    }
    g.restore();
  }
}

function closest(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function segDist(p: Point, a: Point, b: Point): number {
  return dist(p, closest(p, a, b));
}

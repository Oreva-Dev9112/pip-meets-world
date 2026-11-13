import { R, dist, rand, type Point } from './random';

export const W = 1500;
/** The island's own height. The sea above it, to the north, is where the town is. */
export const ISLE_H = 1000;
export const NORTH = 700;
export const H = NORTH + ISLE_H;
const CELL = 10;
const GW = W / CELL;
const GH = ISLE_H / CELL;
const elev = new Float32Array(GW * GH);

/** Smooth noise, pushed down towards the edges so the land comes out as an island. */
export function raiseLand(): void {
  const g = 16;
  const lattice: number[] = [];
  for (let i = 0; i < (g + 2) * (g + 2); i++) lattice.push(R());
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const at = (a: number, b: number) => lattice[(b % (g + 1)) * (g + 2) + (a % (g + 1))];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * xf;
    const bot = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * xf;
    return top + (bot - top) * yf;
  };
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const nx = x / GW, ny = y / GH;
      const n = noise(nx * 5, ny * 5) * 0.6 + noise(nx * 11 + 3, ny * 11 + 7) * 0.4;
      const dx = (nx - 0.5) / 0.5, dy = (ny - 0.5) / 0.5;
      const edge = Math.pow(Math.max(Math.abs(dx), Math.abs(dy)), 3) * 0.55 + (dx * dx + dy * dy) * 0.45;
      elev[y * GW + x] = n * 0.6 + 0.27 - edge * 0.6;
    }
  }
}

/** Height of the island at a world point. Off the island it is -1, deep sea. */
export function elevAt(x: number, y: number): number {
  y -= NORTH;
  return x < 0 || y < 0 || x >= W || y >= ISLE_H ? -1 : elev[((y / CELL) | 0) * GW + ((x / CELL) | 0)];
}

/** Other land beyond the island, such as the town and its causeway. */
let otherLand: ((x: number, y: number) => boolean) | null = null;
export const addLand = (fn: (x: number, y: number) => boolean): void => { otherLand = fn; };
export const isLand = (x: number, y: number): boolean => elevAt(x, y) > 0.3 || (otherLand?.(x, y) ?? false);

/** The most northerly point of the island's shore, where a causeway could start. */
export function northShore(): { x: number; y: number } {
  for (let y = 0; y < GH; y++) for (let x = (GW * 0.25) | 0; x < GW * 0.75; x++) if (elev[y * GW + x] > 0.335) return { x: x * CELL + CELL / 2, y: NORTH + y * CELL };
  return { x: W / 2, y: NORTH };
}

/** True when a straight walk from a to b stays on land. */
export function clearPath(a: Point, b: Point): boolean {
  const n = Math.ceil(dist(a, b) / 12);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!isLand(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/** Sea, sand and grass by height, with trees on the high ground. */
export function paintTerrain(): HTMLCanvasElement {
  const terrain = document.createElement('canvas');
  terrain.width = W;
  terrain.height = H;
  const small = document.createElement('canvas');
  small.width = GW;
  small.height = GH;
  const sg = small.getContext('2d')!, img = sg.createImageData(GW, GH);
  const bands: [number, number[]][] = [[0.22, [140, 198, 205]], [0.3, [171, 218, 220]], [0.335, [240, 229, 190]], [0.5, [205, 228, 166]], [0.62, [176, 211, 148]], [9, [150, 194, 138]]];
  for (let i = 0; i < GW * GH; i++) {
    const c = bands.find((b) => elev[i] < b[0])![1];
    img.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  sg.putImageData(img, 0, 0);
  const g = terrain.getContext('2d')!;
  g.fillStyle = 'rgb(140, 198, 205)';
  g.fillRect(0, 0, W, NORTH + 2);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, NORTH, W, ISLE_H);
  for (let i = 0; i < 520; i++) {
    const x = rand(0, W), y = NORTH + rand(0, ISLE_H), e = elevAt(x, y);
    if (e < 0.56) continue;
    g.fillStyle = 'rgba(31,51,64,0.10)';
    g.beginPath(); g.ellipse(x + 2, y + 7, 8, 3.5, 0, 0, 7); g.fill();
    g.fillStyle = e > 0.62 ? '#6FA573' : '#86B87F';
    g.beginPath(); g.arc(x, y, rand(6, 10), 0, 7); g.fill();
  }
  for (let i = 0; i < 260; i++) {
    const x = rand(0, W), y = NORTH + rand(0, ISLE_H), e = elevAt(x, y);
    if (e < 0.35 || e > 0.5) continue;
    g.strokeStyle = 'rgba(79,125,84,0.45)';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 3, y); g.lineTo(x + 4, y - 5); g.stroke();
  }
  return terrain;
}

/** Worn paths: every step leaves a faint mark, so the map draws itself. */
export function makeTrail(): CanvasRenderingContext2D {
  const paths = document.createElement('canvas');
  paths.width = W;
  paths.height = H;
  const pg = paths.getContext('2d')!;
  pg.lineCap = 'round';
  pg.strokeStyle = 'rgba(122,92,58,0.10)';
  pg.lineWidth = 4;
  return pg;
}

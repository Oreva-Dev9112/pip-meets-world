/**
 * Draws the real map in a hand-made cartoon style: little houses with roofs
 * and windows on the real building outlines, awnings and signs where the
 * cafés and pubs are, lamp posts, trees and planters along the real streets.
 */
import type { Point, WorldMap } from './map';
import { INK } from './paint';

export const TOON_SCALE = 6;

const WALLS = ['#f7dcc4', '#f4e6c3', '#dfe9f6', '#f3d2d9', '#e4dcf3', '#d9ecd4', '#fbe3c6', '#e8e2d6'];
const ROOFS = ['#c96b5a', '#b6786c', '#7d8aa6', '#a1726c', '#8e7cab', '#6f9a7a', '#c48a63', '#8c8c8c'];
const SIGNS: Record<string, { colour: string; text: string }> = {
  cafe: { colour: '#ff9f6b', text: 'CAFÉ' },
  pub: { colour: '#f2c94c', text: 'PUB' },
  food: { colour: '#ff7a7a', text: 'EAT' },
  theatre: { colour: '#ff6fb5', text: '★' },
  treat: { colour: '#b79bff', text: 'ICE' },
  bakery: { colour: '#d9a05b', text: 'BAKE' },
  records: { colour: '#6c8cff', text: '♪' },
  books: { colour: '#4fb0a5', text: 'BOOKS' },
};

const hash = (n: number) => ((n * 2654435761) >>> 0) / 4294967296;

function polygon(ctx: CanvasRenderingContext2D, points: Point[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function bounds(points: Point[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Shrinks a polygon towards its centre by `inset` metres. */
function shrink(points: Point[], inset: number): Point[] {
  const b = bounds(points);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const fx = Math.max(0, 1 - (2 * inset) / b.w);
  const fy = Math.max(0, 1 - (2 * inset) / b.h);
  return points.map((p) => ({ x: cx + (p.x - cx) * fx, y: cy + (p.y - cy) * fy }));
}

function drawBuilding(ctx: CanvasRenderingContext2D, outline: Point[], index: number): void {
  const b = bounds(outline);
  if (b.w < 3 || b.h < 3) return;
  const wall = WALLS[Math.floor(hash(index) * WALLS.length)];
  const roof = ROOFS[Math.floor(hash(index + 99) * ROOFS.length)];
  const storeys = 2 + Math.floor(hash(index + 7) * 2);
  const lift = storeys * 1.4;

  // A little 3D: the footprint is the ground, the same shape shifted up is the roof,
  // and the strip between them is the front wall with its windows.
  const roofShape = outline.map((p) => ({ x: p.x, y: p.y - lift }));

  // Walls: fill the sweep between the ground outline and the roof outline.
  ctx.save();
  polygon(ctx, outline);
  ctx.fillStyle = wall;
  ctx.fill();
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const c = outline[(i + 1) % outline.length];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x, c.y - lift);
    ctx.lineTo(a.x, a.y - lift);
    ctx.closePath();
    ctx.fillStyle = wall;
    ctx.fill();
  }
  // Shade the whole wall block slightly, then draw its outline.
  polygon(ctx, outline);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // Windows on the front-facing (bottom) edges only, one row per storey.
  ctx.fillStyle = '#fff6d6';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.28;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const c = outline[(i + 1) % outline.length];
    // Front-facing edges run left to right across the bottom of the shape.
    const nx = c.y - a.y;
    const ny = -(c.x - a.x);
    if (ny >= 0) continue;
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    if (len < 3) continue;
    const cols = Math.max(1, Math.floor(len / 3.2));
    for (let s = 0; s < storeys; s++) {
      const wy = -(s * 1.4 + 0.75);
      for (let k = 0; k < cols; k++) {
        const t = (k + 0.5) / cols;
        const wx = a.x + (c.x - a.x) * t;
        const wyy = a.y + (c.y - a.y) * t + wy;
        ctx.beginPath();
        ctx.rect(wx - 0.5, wyy - 0.45, 1, 0.9);
        ctx.fill();
        ctx.stroke();
      }
    }
    void nx;
  }

  // Roof
  polygon(ctx, roofShape);
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.4;
  ctx.stroke();
  const inner = shrink(roofShape, 1.2);
  polygon(ctx, inner);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.4;
  ctx.stroke();
  const rb = bounds(roofShape);
  if (hash(index + 3) > 0.55 && rb.w > 6 && rb.h > 6) {
    ctx.fillStyle = '#9a8f8a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.rect(rb.x + rb.w * 0.6, rb.y + rb.h * 0.3, 1.2, 1.5);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawAwning(ctx: CanvasRenderingContext2D, x: number, y: number, kind: string, i: number): void {
  const sign = SIGNS[kind];
  if (!sign) return;
  const w = 4.5;
  ctx.save();
  ctx.translate(x, y);
  // Striped awning
  ctx.fillStyle = sign.colour;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.rect(-w / 2, -1.2, w, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let s = 0; s < 4; s++) ctx.fillRect(-w / 2 + 0.3 + s * (w / 4), -1.2, w / 8, 1.5);
  // Scalloped edge
  ctx.fillStyle = sign.colour;
  for (let s = 0; s < 5; s++) {
    ctx.beginPath();
    ctx.arc(-w / 2 + (w / 5) * (s + 0.5), 0.3, w / 10, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  // A little sign above
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(-w / 2 + 0.4, -2.6, w - 0.8, 1.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `800 0.85px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign.text, 0, -2);
  // Tables outside cafés and pubs
  if ((kind === 'cafe' || kind === 'pub') && hash(i) > 0.4) {
    ctx.fillStyle = '#fff';
    for (const dx of [-1.4, 1.4]) {
      ctx.beginPath();
      ctx.arc(dx, 1.6, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 3.2);
  ctx.stroke();
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(x, y - 3.5, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(43,33,64,0.15)';
  ctx.beginPath();
  ctx.ellipse(x + 0.4, y + 0.6, 2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(x - 0.3, y - 1.5, 0.6, 1.8);
  ctx.fillStyle = hash(i) > 0.5 ? '#7fbf7a' : '#5fa86a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.arc(x, y - 2.6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlanter(ctx: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  ctx.save();
  ctx.fillStyle = '#8a5a44';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.rect(x - 1.1, y - 0.5, 2.2, 1);
  ctx.fill();
  ctx.stroke();
  const flowers = ['#ff7ab6', '#ffc23d', '#e63946'];
  for (let f = 0; f < 3; f++) {
    ctx.fillStyle = flowers[(f + i) % 3];
    ctx.beginPath();
    ctx.arc(x - 0.7 + f * 0.7, y - 0.8, 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Paints the whole map in the cartoon style. Big, so only do it once. */
export function paintToon(map: WorldMap): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(map.width * TOON_SCALE);
  canvas.height = Math.ceil(map.height * TOON_SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(TOON_SCALE, TOON_SCALE);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground: pavement grey with a faint paving pattern.
  ctx.fillStyle = '#ded9e6';
  ctx.fillRect(0, 0, map.width, map.height);
  ctx.strokeStyle = 'rgba(43,33,64,0.06)';
  ctx.lineWidth = 0.2;
  for (let x = 0; x < map.width; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, map.height);
    ctx.stroke();
  }
  for (let y = 0; y < map.height; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(map.width, y);
    ctx.stroke();
  }

  for (const green of map.greens) {
    polygon(ctx, green.outline);
    ctx.fillStyle = green.paved ? '#ebe7f1' : '#a9d98f';
    ctx.fill();
    if (!green.paved) {
      ctx.strokeStyle = '#6f9a5a';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Roads: tarmac with a dashed centre line on the big ones.
  const widths = { major: 13, minor: 8, lane: 4.5, walk: 5 } as const;
  for (const street of map.streets) {
    const pts = street.nodes.map((n) => map.nodes[n]);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = street.kind === 'walk' ? '#efe9f4' : '#6f6a80';
    ctx.lineWidth = widths[street.kind];
    ctx.stroke();
    if (street.kind === 'major' || street.kind === 'minor') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.4;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Buildings, drawn from the back of the map to the front so roofs overlap properly.
  const order = map.buildings.map((b, i) => ({ b, i, y: bounds(b).y + bounds(b).h })).sort((a, c) => a.y - c.y);
  for (const { b, i } of order) drawBuilding(ctx, b, i);

  map.places.forEach((p, i) => drawAwning(ctx, p.x, p.y + 0.6, p.kind, i));
  map.props.forEach((p, i) => {
    if (p.kind === 'tree') drawTree(ctx, p.x, p.y, i);
    else if (p.kind === 'bench' && i % 2 === 0) drawPlanter(ctx, p.x, p.y, i);
    else if (p.kind === 'phone' || p.kind === 'postbox') drawLamp(ctx, p.x, p.y);
  });
  // Lamp posts along the big streets.
  for (const street of map.streets) {
    if (street.kind !== 'major' && street.kind !== 'minor') continue;
    for (let i = 1; i < street.nodes.length; i++) {
      const a = map.nodes[street.nodes[i - 1]];
      const b = map.nodes[street.nodes[i]];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const off = widths[street.kind] / 2 + 1;
      for (let d = 12; d < len - 6; d += 28) {
        const t = d / len;
        drawLamp(ctx, a.x + (b.x - a.x) * t + nx * off, a.y + (b.y - a.y) * t + ny * off);
      }
    }
  }

  // Street names on the road.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const named = new Map<string, { a: Point; b: Point; len: number; major: boolean }>();
  for (const s of map.streets) {
    if (!s.name) continue;
    for (let i = 1; i < s.nodes.length; i++) {
      const a = map.nodes[s.nodes[i - 1]];
      const b = map.nodes[s.nodes[i]];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const cur = named.get(s.name);
      if (!cur || len > cur.len) named.set(s.name, { a, b, len, major: s.kind === 'major' });
    }
  }
  for (const [name, { a, b, len, major }] of named) {
    const size = major ? 4 : 2.6;
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(name.toUpperCase()).width > len + 20) continue;
    let ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.save();
    ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(name.toUpperCase(), 0, 0.2);
    ctx.restore();
  }

  return canvas;
}

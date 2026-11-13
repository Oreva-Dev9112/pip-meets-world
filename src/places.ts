import { ISLE_H, NORTH, W, elevAt } from './island';
import { dist, rand, type Point } from './random';

export type PlaceType = 'home' | 'berries' | 'pond' | 'oak' | 'meadow' | 'bridge' | 'stones' | 'cave' | 'door' | 'tower' | 'edge';

export interface Place extends Point {
  id: string;
  type: PlaceType;
  name: string;
  found: boolean;
  visits: number;
  /** A gold ring that fades out, from 1 to 0, when the place is found or tapped in the journal. */
  pulse: number;
  lastDay?: number;
  /** How built up home is. */
  level?: number;
}

/** Each place sits a set distance band from home, so the far ones are found later. */
const PLACE_TYPES: { type: PlaceType; name: string; near: [number, number] }[] = [
  { type: 'berries', name: 'the Berry Bushes', near: [110, 190] },
  { type: 'pond', name: 'Lookback Pond', near: [170, 260] },
  { type: 'oak', name: 'the Big Oak', near: [200, 300] },
  { type: 'meadow', name: 'Yellow Meadow', near: [240, 340] },
  { type: 'bridge', name: 'the Old Bridge', near: [300, 400] },
  { type: 'stones', name: 'the Stone Ring', near: [330, 440] },
  { type: 'cave', name: 'the Humming Cave', near: [380, 500] },
  { type: 'door', name: 'the Door in the Hill', near: [420, 540] },
  { type: 'tower', name: 'the Stairless Tower', near: [470, 620] },
  { type: 'edge', name: "the World's Edge", near: [480, 700] },
];

/** Home is on gentle ground near the middle of the island. */
export function findHome(): Place {
  let best = { x: W / 2, y: NORTH + ISLE_H / 2 }, be = -1;
  for (let i = 0; i < 400; i++) {
    const p = { x: rand(W * 0.38, W * 0.62), y: NORTH + rand(ISLE_H * 0.38, ISLE_H * 0.62) }, e = elevAt(p.x, p.y);
    if (e > 0.36 && e < 0.5 && e > be) { be = e; best = p; }
  }
  return { id: 'home', type: 'home', name: 'home', x: best.x, y: best.y, found: true, visits: 0, pulse: 0, level: 0 };
}

export function makePlaces(home: Point): Place[] {
  const places: Place[] = [];
  for (const t of PLACE_TYPES) {
    let chosen: Point | null = null;
    for (let i = 0; i < 3000 && !chosen; i++) {
      const a = rand(0, 6.283), d = rand(t.near[0], t.near[1]) * (1 + i / 3000);
      const p = { x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d * 0.8 };
      if (p.x < 60 || p.y < NORTH + 60 || p.x > W - 60 || p.y > NORTH + ISLE_H - 60) continue;
      const e = elevAt(p.x, p.y);
      if (t.type === 'edge' ? !(e > 0.3 && e < 0.335) : !(e > 0.345)) continue;
      // The stranger places prefer the hills.
      if ((t.type === 'door' || t.type === 'cave' || t.type === 'stones') && e < 0.5 && i < 2000) continue;
      if (places.some((q) => dist(p, q) < 150)) continue;
      chosen = p;
    }
    if (chosen) places.push({ type: t.type, name: t.name, ...chosen, id: t.type, found: false, visits: 0, pulse: 0 });
  }
  return places;
}

export const INK = '#1F3340';

/** Draws a place at its spot. `lit` puts a light in home's window. */
export function drawPlace(g: CanvasRenderingContext2D, p: Place, lit: boolean): void {
  const { x, y } = p;
  g.save(); g.translate(x, y); g.lineWidth = 2; g.strokeStyle = INK; g.lineJoin = 'round';
  if (p.pulse > 0) {
    g.beginPath(); g.arc(0, 0, 26 + (1 - p.pulse) * 46, 0, 7);
    g.strokeStyle = `rgba(242,169,59,${p.pulse})`; g.lineWidth = 4; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2;
  }
  switch (p.type) {
    case 'home':
      if (!p.level) { g.fillStyle = '#7A5C3A'; g.fillRect(-3, -6, 6, 16); g.strokeRect(-3, -6, 6, 16); g.fillStyle = '#86B87F'; g.beginPath(); g.arc(0, -16, 15, 0, 7); g.fill(); g.stroke(); }
      else { g.fillStyle = '#F4E3B5'; g.beginPath(); g.rect(-13, -8, 26, 18); g.fill(); g.stroke(); g.fillStyle = '#86B87F'; g.beginPath(); g.moveTo(-19, -8); g.lineTo(0, -26); g.lineTo(19, -8); g.closePath(); g.fill(); g.stroke(); g.fillStyle = lit ? '#F7D774' : '#7A5C3A'; g.fillRect(-4, -1, 8, 11); g.strokeRect(-4, -1, 8, 11); }
      break;
    case 'berries': g.fillStyle = '#6FA573'; g.beginPath(); g.arc(-8, 0, 10, 0, 7); g.arc(7, -2, 12, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#D94F5C'; for (const [a, b] of [[-10, -3], [-4, 3], [5, -6], [11, 1], [3, 4]]) { g.beginPath(); g.arc(a, b, 2.6, 0, 7); g.fill(); } break;
    case 'pond': g.fillStyle = '#9CCFD3'; g.beginPath(); g.ellipse(0, 0, 26, 15, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(-5, -1, 9, 4, 0, 0, 7); g.strokeStyle = 'rgba(31,51,64,0.35)'; g.stroke(); break;
    case 'oak': g.fillStyle = '#7A5C3A'; g.fillRect(-5, -4, 10, 20); g.strokeRect(-5, -4, 10, 20); g.fillStyle = '#5E9C68'; g.beginPath(); g.arc(-12, -18, 15, 0, 7); g.arc(12, -18, 15, 0, 7); g.arc(0, -30, 17, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -18, 14, 0, 7); g.fill(); break;
    case 'meadow': g.fillStyle = '#F2C94C'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(Math.cos(i * 2.4) * (8 + i * 1.6), Math.sin(i * 2.4) * (5 + i), 3.2, 0, 7); g.fill(); g.stroke(); } break;
    case 'bridge': g.fillStyle = '#B98E5E'; for (let i = -3; i <= 3; i++) { if (i === 1) continue; g.fillRect(i * 8 - 3, -9, 6, 18); g.strokeRect(i * 8 - 3, -9, 6, 18); } g.beginPath(); g.moveTo(-30, -11); g.lineTo(30, -11); g.moveTo(-30, 11); g.lineTo(30, 11); g.stroke(); break;
    case 'stones': g.fillStyle = '#AEB8BC'; for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; g.beginPath(); g.ellipse(Math.cos(a) * 20, Math.sin(a) * 12, 5, 6, 0, 0, 7); g.fill(); g.stroke(); } break;
    case 'cave': g.fillStyle = '#9AA6A0'; g.beginPath(); g.moveTo(-26, 12); g.quadraticCurveTo(-22, -24, 0, -26); g.quadraticCurveTo(24, -24, 26, 12); g.closePath(); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.moveTo(-11, 12); g.quadraticCurveTo(-10, -10, 0, -10); g.quadraticCurveTo(10, -10, 11, 12); g.closePath(); g.fill(); break;
    case 'door': g.fillStyle = '#86B87F'; g.beginPath(); g.moveTo(-30, 12); g.quadraticCurveTo(0, -42, 30, 12); g.closePath(); g.fill(); g.stroke(); g.fillStyle = p.visits >= 2 ? INK : '#B5651D'; g.beginPath(); g.moveTo(-7, 12); g.lineTo(-7, -2); g.quadraticCurveTo(0, -11, 7, -2); g.lineTo(7, 12); g.closePath(); g.fill(); g.stroke(); if (p.visits < 2) { g.fillStyle = '#F2A93B'; g.beginPath(); g.arc(3.5, 4, 1.6, 0, 7); g.fill(); } break;
    case 'tower': g.fillStyle = '#C3CBCD'; g.beginPath(); g.rect(-10, -38, 20, 50); g.fill(); g.stroke(); g.fillStyle = '#AEB8BC'; g.beginPath(); g.rect(-14, -46, 28, 9); g.fill(); g.stroke(); g.fillStyle = INK; g.fillRect(-3, -28, 6, 9); break;
    case 'edge': g.strokeStyle = INK; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -22); g.stroke(); g.fillStyle = '#F2A93B'; g.beginPath(); g.moveTo(0, -22); g.lineTo(18, -16); g.lineTo(0, -10); g.closePath(); g.fill(); g.stroke(); break;
  }
  if (p.type !== 'home' || p.level) {
    const label = p.type === 'home' ? 'home' : p.name.replace(/^the /, '');
    g.font = '700 19px Caveat, cursive'; g.textAlign = 'center'; g.lineWidth = 4;
    g.strokeStyle = 'rgba(251,251,246,0.9)'; g.strokeText(label, 0, 34);
    g.fillStyle = INK; g.fillText(label, 0, 34);
  }
  g.restore();
}

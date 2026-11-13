import { hop, type Dot } from './dots';
import { INK } from './places';
import type { Point } from './random';

// Things you can leave on the island. Nobody is told what to do with them;
// each dot uses them in its own way.

export type ToyKind = 'berry' | 'ball' | 'hat' | 'umbrella' | 'kite' | 'flower';

export const TOY_KINDS: ToyKind[] = ['berry', 'ball', 'hat', 'umbrella', 'kite', 'flower'];

export const TOY_LABELS: Record<ToyKind, string> = { berry: 'Berry', ball: 'Ball', hat: 'Hat', umbrella: 'Umbrella', kite: 'Kite', flower: 'Flower' };

/** Toys a dot can carry about. Berries get eaten, balls get kicked and flowers stay put. */
export const CARRIED: ToyKind[] = ['hat', 'umbrella', 'kite'];

export interface Toy extends Point {
  id: number;
  kind: ToyKind;
  /** The dot carrying it, if any. */
  holder: string | null;
  vx: number;
  vy: number;
  /** Days since it was left. Flowers grow with it. */
  age: number;
  /** Your dot has been over to look at it. */
  seen: boolean;
  bloomed?: boolean;
}

/** A toy lying on the ground. */
export function drawToy(g: CanvasRenderingContext2D, t: Toy, time: number): void {
  const { x, y } = t;
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  if (t.kind !== 'flower') { g.fillStyle = 'rgba(31,51,64,0.18)'; g.beginPath(); g.ellipse(0, 7, 7, 2.5, 0, 0, 7); g.fill(); }
  switch (t.kind) {
    case 'berry': {
      const b = Math.sin(time * 4) * 2;
      g.fillStyle = '#D94F5C'; g.beginPath(); g.arc(0, b, 6, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#5E9C68'; g.beginPath(); g.moveTo(0, -6 + b); g.lineTo(4, -11 + b); g.stroke();
      break;
    }
    case 'ball':
      g.fillStyle = '#F2A93B'; g.beginPath(); g.arc(0, 0, 6.5, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#FBFBF6'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 4, (x + y) * 0.05, (x + y) * 0.05 + 2); g.stroke();
      break;
    case 'hat': hatShape(g); break;
    case 'umbrella':
      g.rotate(-1.2);
      g.fillStyle = '#D94F5C'; g.beginPath(); g.moveTo(-10, 2); g.quadraticCurveTo(0, -12, 10, 2); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, 2); g.lineTo(0, 12); g.stroke();
      break;
    case 'kite': kiteShape(g, 0.8); break;
    case 'flower': {
      // A sprout that becomes a bud, then a flower, over two days.
      const grow = Math.min(1, t.age / 2), h = 4 + grow * 14;
      g.strokeStyle = '#4F7D54'; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 6 - h); g.stroke();
      g.fillStyle = '#86B87F'; g.beginPath(); g.ellipse(-4, 4 - h * 0.4, 4, 2, -0.5, 0, 7); g.fill();
      if (grow >= 1) {
        g.fillStyle = '#F29CB7';
        for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 + Math.sin(time) * 0.1; g.beginPath(); g.arc(Math.cos(a) * 5, 6 - h + Math.sin(a) * 5, 4, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); }
        g.fillStyle = '#F7D774'; g.beginPath(); g.arc(0, 6 - h, 3, 0, 7); g.fill(); g.stroke();
      } else if (grow > 0.4) {
        g.fillStyle = '#F29CB7'; g.beginPath(); g.ellipse(0, 4 - h, 3, 4.5, 0, 0, 7); g.fill(); g.lineWidth = 1.2; g.strokeStyle = INK; g.stroke();
      }
      break;
    }
  }
  g.restore();
}

/** A toy being carried, drawn on or above the dot. `wind` lifts kites. */
export function drawHeld(g: CanvasRenderingContext2D, t: Toy, d: Dot, time: number, wind: number): void {
  const { lift } = hop(d), top = d.y - lift - 12;
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  if (t.kind === 'hat') {
    g.translate(d.x + d.face, top + 1);
    g.rotate(d.face * 0.12);
    hatShape(g);
  } else if (t.kind === 'umbrella') {
    const sx = d.x - d.face * 4;
    g.beginPath(); g.moveTo(sx, top + 16); g.lineTo(sx, top - 12); g.stroke();
    g.fillStyle = '#D94F5C'; g.beginPath(); g.moveTo(sx - 17, top - 8); g.quadraticCurveTo(sx, top - 30, sx + 17, top - 8); g.closePath(); g.fill(); g.stroke();
  } else if (t.kind === 'kite') {
    const up = 40 + wind * 50, kx = d.x - 26 - wind * 30 + Math.sin(time * 1.7) * 6, ky = top - up + Math.sin(time * 2.3) * 5;
    g.strokeStyle = 'rgba(31,51,64,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(d.x - d.face * 6, d.y - lift); g.quadraticCurveTo(kx + 10, (ky + d.y) / 2 + 10, kx, ky + 10); g.stroke();
    g.translate(kx, ky);
    g.rotate(Math.sin(time * 1.3) * 0.2);
    g.strokeStyle = INK; g.lineWidth = 2;
    kiteShape(g, 1);
  }
  g.restore();
}

function hatShape(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#3B5368';
  g.beginPath(); g.ellipse(0, 0, 11, 3, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.rect(-6, -11, 12, 11); g.fill(); g.stroke();
  g.fillStyle = '#F2A93B'; g.fillRect(-6, -4, 12, 3);
}

function kiteShape(g: CanvasRenderingContext2D, s: number): void {
  g.fillStyle = '#6C9CF2';
  g.beginPath(); g.moveTo(0, -12 * s); g.lineTo(9 * s, 0); g.lineTo(0, 14 * s); g.lineTo(-9 * s, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#F7D774';
  g.beginPath(); g.moveTo(0, -12 * s); g.lineTo(9 * s, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#D94F5C'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, 14 * s); g.quadraticCurveTo(5 * s, 20 * s, 0, 26 * s); g.quadraticCurveTo(-5 * s, 32 * s, 0, 38 * s); g.stroke();
}

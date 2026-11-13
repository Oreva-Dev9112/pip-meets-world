import { CAST, type Character } from './cast';
import { clearPath, isLand } from './island';
import { INK, type Place } from './places';
import { dist, rand, type Point } from './random';

/** Where a dot is heading, and why. */
export interface Target extends Point {
  gift?: boolean;
  home?: boolean;
  place?: Place;
  /** Walking over to look at a place it has just found. */
  look?: boolean;
  /** Going to a toy, by its id. */
  toy?: number;
  /** Running for cover from the rain. */
  shelter?: boolean;
  /** Going to a venue in town, by its id. */
  venue?: string;
}

export interface Dot extends Point {
  id: string;
  name: string;
  colour: string;
  tx: number;
  ty: number;
  state: 'idle' | 'walk';
  /** Seconds to stand still before choosing somewhere new. */
  wait: number;
  /** Where it is in its hop, in radians. */
  hop: number;
  /** Counts down to the next blink; below zero the eyes are shut. */
  blink: number;
  face: 1 | -1;
  asleep: boolean;
  speed: number;
  /** From -1 (miserable) to 1 (delighted). It shows in the bounce and the mouth. */
  mood: number;
  /** The mood it drifts back to. */
  calm: number;
  /** A speech bubble, with what it means underneath once your dot knows the word. */
  speech?: { text: string; t: number; gloss?: string };
  target?: Target;
  isPip?: boolean;
  named?: boolean;
  character?: Character;
  /** What your dot calls a neighbour before learning its name. */
  label?: string;
  /** How well your dot knows a neighbour: 3 is when it learns the name, 5 and up they are friends. */
  stage?: number;
  metDay?: number;
  known?: boolean;
  base?: Point;
  goingHome?: boolean;
  /** Seconds until it next says something. */
  chat?: number;
  /** The toy it is carrying. */
  holding?: number;
  /** Seconds left of the wobble from being poked. */
  pokeT?: number;
  /** Coins: from dreams for your dot, odd jobs for the townsfolk. Richer dots are bigger. */
  coins?: number;
  /** Corners still to walk through after the current one. */
  route?: Point[];
  /** Townsfolk: hunger, loneliness and boredom, each rising from 0 towards 1. */
  needs?: { hunger: number; social: number; bored: number };
  /** Townsfolk keep their own journal. */
  diary?: { day: number; when: string; text: string }[];
  /** Has met your dot. */
  metPip?: boolean;
  /** Which day it last met each other dot, by id. */
  met?: Record<string, number>;
  greetedDay?: number;

  // Being watched, and chatting.
  /** Seconds it stands still for: in a chat, or frozen because it has noticed you. */
  hold?: number;
  /** Seconds left of acting very normal: a stiff walk and a whistle. */
  stiff?: number;
  /** Seconds left of a quick look up at you. */
  glance?: number;
  /** How far its eyes have turned to look out of the screen at you, from 0 to 1. */
  gaze?: number;
  /** What it is doing about being watched, and for how much longer. */
  react?: { kind: Reaction; t: number; next?: Reaction };
  /** How close it is to noticing you, from 0 to 1. */
  aware?: number;
  /** How used to you it has got, from 0 (spooked) to 1 (waves). */
  used?: number;
  /** Seconds before it can notice you again. */
  noticeCool?: number;
  /** Where your pointer is, when it is near: the eyes follow it. */
  peek?: Point;
  /** Seconds left of the "Play?" bubble that pops up after a poke. */
  invite?: number;
}

export type Reaction = 'stare' | 'cower' | 'twirl' | 'squint' | 'blush' | 'wave' | 'bounce' | 'smile';

type DotSeed = Partial<Dot> & Pick<Dot, 'id' | 'name' | 'colour'>;

export function makeDot(o: DotSeed): Dot {
  const defaults = { x: 0, y: 0, tx: 0, ty: 0, state: 'idle' as const, wait: rand(0.5, 2), hop: rand(0, 6), blink: rand(2, 5), face: 1 as const, asleep: false, speed: 46, mood: 0.2, calm: 0.2 };
  return { ...defaults, ...o };
}

export function makePip(home: Point): Dot {
  return makeDot({ id: 'pip', name: 'The little one', named: false, colour: '#F7D774', x: home.x, y: home.y + 14, isPip: true });
}

/** Two neighbours, each living some way from home and from each other. */
export function makeNeighbours(home: Point): Dot[] {
  const others = [
    makeDot({ id: 'odo', name: 'Odo', label: 'the blue one', colour: '#6C9CF2', stage: 0, metDay: 0, known: false, character: 'worrier', mood: CAST.worrier.mood, calm: CAST.worrier.mood, chat: 0 }),
    makeDot({ id: 'bim', name: 'Bim', label: 'the pink one', colour: '#F29CB7', stage: 0, metDay: 0, known: false, character: 'diva', mood: CAST.diva.mood, calm: CAST.diva.mood, chat: 0 }),
  ];
  others.forEach((o, i) => {
    for (let k = 0; k < 500; k++) {
      const a = rand(0, 6.283), d = rand(200, 300), p = { x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d * 0.8 };
      if (isLand(p.x, p.y) && (i === 0 || dist(p, others[0].base!) > 220)) { o.base = p; break; }
    }
    o.base = o.base || { x: home.x + 220, y: home.y };
    o.x = o.base.x;
    o.y = o.base.y;
  });
  return others;
}

export const callName = (o: Dot): string => (o.known ? o.name : o.label ?? o.name);

export function walkTo(d: Dot, t: Point): void {
  d.tx = t.x;
  d.ty = t.y;
  d.state = 'walk';
}

/** True when a hop is possible from here to there. */
export const canWalk = (d: Dot, t: Point): boolean => isLand(t.x, t.y) && clearPath(d, t);

export function cheer(d: Dot, by: number): void {
  d.mood = Math.max(-1, Math.min(1, d.mood + by));
}

/** Dot size from wealth: broke ones are tiny, very rich ones as big as they get. Dots without coins stay as they are. */
export function sizeOf(d: Dot): number {
  const c = d.coins;
  if (c === undefined) return 12;
  return c < 20 ? 10 : c < 80 ? 12 : c < 200 ? 14 : 15.5;
}

/** Moves a dot towards its target. Returns true on the step it arrives. Your dot wears a path as it goes. */
export function moveDot(d: Dot, dt: number, trail: CanvasRenderingContext2D): boolean {
  d.blink -= dt;
  if (d.blink < -0.15) d.blink = rand(2, 5);
  if (d.state === 'walk' && !d.hold) {
    // Acting normal is slower than being normal.
    const dx = d.tx - d.x, dy = d.ty - d.y, L = Math.hypot(dx, dy), step = d.speed * dt * (d.stiff ? 0.6 : 1);
    if (Math.abs(dx) > 1) d.face = dx > 0 ? 1 : -1;
    if (L <= step) { d.x = d.tx; d.y = d.ty; d.state = 'idle'; return true; }
    const nx = d.x + (dx / L) * step, ny = d.y + (dy / L) * step;
    if (d.isPip) { trail.beginPath(); trail.moveTo(d.x, d.y + 6); trail.lineTo(nx, ny + 6); trail.stroke(); }
    d.x = nx;
    d.y = ny;
    // Happy dots bounce quicker.
    d.hop += dt * 11 * (1 + d.mood * 0.44);
  }
  return false;
}

/**
 * The bounce depends on mood: happy dots bounce high and springy, calm ones
 * low and slow, and sad ones barely leave the ground.
 */
export function hop(d: Dot): { lift: number; squash: number } {
  if (d.state !== 'walk' || d.hold) return { lift: 0, squash: 0 };
  const cycle = Math.abs(Math.sin(d.hop));
  // Trying to look casual: small, careful, identical hops.
  if (d.stiff) return { lift: cycle * 1.5, squash: 0 };
  const sad = d.mood < -0.3;
  const peak = sad ? 1.5 : 4 + (d.mood + 1) * 3.5;
  const landing = Math.max(0, 1 - cycle * 3.2);
  return { lift: cycle * peak, squash: landing * (sad ? 0.06 : 0.17) };
}

export function drawDot(g: CanvasRenderingContext2D, d: Dot, time: number): void {
  const h = hop(d), squash = h.squash, moving = d.state === 'walk' && !d.hold, breathe = Math.sin(time * 2 + d.x) * 0.03;
  const kind = d.react?.kind, gz = d.asleep ? 0 : d.gaze ?? 0;
  // The Chaos One bounces on the spot to get your attention.
  const lift = h.lift + (kind === 'bounce' ? Math.abs(Math.sin(time * 11)) * 9 : 0);
  // A poke makes it jiggle for a moment.
  const jiggle = d.pokeT ? Math.sin(d.pokeT * 40) * d.pokeT * 0.5 : 0;
  let sx = 1 + (moving ? squash * 0.5 - 0.04 : breathe) + jiggle;
  const sy = 1 + (moving ? 0.06 - squash * 0.5 : -breathe) - jiggle, r = 12;
  // A twirl: it turns round on the spot, so it looks thin edge-on halfway.
  const spin = kind === 'twirl' ? Math.cos(time * 13) : 1;
  if (kind === 'twirl') sx *= Math.max(0.15, Math.abs(spin));
  g.save(); g.translate(d.x + (kind === 'cower' ? Math.sin(time * 70) * 0.8 : 0), d.y);
  const k = sizeOf(d) / 12;
  g.scale(k, k);
  g.fillStyle = 'rgba(31,51,64,0.18)'; g.beginPath(); g.ellipse(0, r - 1, r * (1 - lift / 30), 4, 0, 0, 7); g.fill();
  if (d.isPip) { g.strokeStyle = '#F2A93B'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, r - 1, r + 6, 6.5, 0, 0, 7); g.stroke(); }
  g.translate(0, -lift); g.scale(sx, sy);
  g.fillStyle = d.colour; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-4, -5, 3.5, 2.2, -0.5, 0, 7); g.fill();
  // Looking at you, the eyes come round to the front and up, and get bigger.
  const face = kind === 'twirl' ? Math.sign(spin) || 1 : d.face;
  let ex = face * 3 * (1 - gz), ey = -2 - gz * 2.5;
  if (d.peek && gz < 0.5) {
    // Following your pointer.
    const px = d.peek.x - d.x, py = d.peek.y - d.y, L = Math.hypot(px, py) || 1;
    ex = (px / L) * 3; ey = -2 + (py / L) * 1.5;
  }
  const rx = 1.8 + gz * 0.7, ry = 2.6 + gz * 0.8;
  g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = 1.8; g.lineCap = 'round';
  if (d.asleep || (d.blink < 0 && gz < 0.5)) { g.beginPath(); g.moveTo(ex - 5.5, -1); g.lineTo(ex - 1.5, -1); g.moveTo(ex + 1.5, -1); g.lineTo(ex + 5.5, -1); g.stroke(); }
  else if (kind === 'cower') { g.beginPath(); g.moveTo(ex - 5.5, ey - 2); g.lineTo(ex - 2.5, ey); g.lineTo(ex - 5.5, ey + 2); g.moveTo(ex + 5.5, ey - 2); g.lineTo(ex + 2.5, ey); g.lineTo(ex + 5.5, ey + 2); g.stroke(); }
  else if (kind === 'squint') { g.beginPath(); g.moveTo(ex - 5.5, ey); g.lineTo(ex - 1.5, ey + 0.6); g.moveTo(ex + 1.5, ey + 0.6); g.lineTo(ex + 5.5, ey); g.stroke(); g.beginPath(); g.ellipse(ex - 3.5, ey + 1.3, 1.5, 1, 0, 0, 7); g.ellipse(ex + 3.5, ey + 1.3, 1.5, 1, 0, 0, 7); g.fill(); }
  else {
    g.beginPath(); g.ellipse(ex - 3.5, ey, rx, ry, 0, 0, 7); g.ellipse(ex + 3.5, ey, rx, ry, 0, 0, 7); g.fill();
    // Eye contact: a glint in each eye.
    if (gz > 0.4) { g.fillStyle = '#FBFBF6'; g.beginPath(); g.arc(ex - 4.1, ey - 1.2, 0.8, 0, 7); g.arc(ex + 2.9, ey - 1.2, 0.8, 0, 7); g.fill(); g.fillStyle = INK; }
  }
  if (kind === 'blush' || kind === 'smile') { g.fillStyle = 'rgba(255,110,130,0.5)'; g.beginPath(); g.ellipse(ex - 7.5, ey + 4, 2.6, 1.6, 0, 0, 7); g.ellipse(ex + 7.5, ey + 4, 2.6, 1.6, 0, 0, 7); g.fill(); }
  // The mouth shows the mood, except when asleep. Caught looking, it makes a little "o".
  if (!d.asleep) {
    g.lineWidth = 1.6; g.beginPath();
    if (kind === 'smile' || kind === 'wave' || kind === 'bounce' || kind === 'twirl') g.arc(ex, ey + 4.5, 3.2, 0.2, Math.PI - 0.2);
    else if (kind === 'squint') { g.moveTo(ex - 2, ey + 7); g.quadraticCurveTo(ex + 1, ey + 8, ex + 3, ey + 6); }
    else if (gz > 0.6 && kind !== 'blush') { g.ellipse(ex, ey + 6.5, 1.4, 1.8, 0, 0, 7); }
    else if (d.mood > 0.25) g.arc(ex, 2.5, 2.8, 0.3, Math.PI - 0.3);
    else if (d.mood < -0.25) g.arc(ex, 7.5, 2.6, Math.PI + 0.4, -0.4);
    else { g.moveTo(ex - 1.8, 5); g.lineTo(ex + 1.8, 5); }
    g.stroke();
  }
  if (kind === 'wave') {
    // A little arm, waving at you.
    const side = d.face, a = Math.sin(time * 14) * 0.5;
    g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(side * 10, -2); g.lineTo(side * (14 + Math.sin(a) * 4), -12 + Math.cos(a)); g.stroke();
    g.fillStyle = d.colour; g.beginPath(); g.arc(side * (14 + Math.sin(a) * 4), -14 + Math.cos(a), 2.6, 0, 7); g.fill(); g.stroke();
  }
  g.restore();
  if (d.stiff) {
    // Whistling, very casually.
    g.font = '700 15px Caveat, cursive'; g.fillStyle = INK;
    const k = (time * 0.8 + d.x * 0.01) % 1;
    g.globalAlpha = Math.min(1, d.stiff) * (1 - k); g.fillText(k < 0.5 ? '♪' : '♫', d.x - 14 - k * 6, d.y - 14 - k * 14); g.globalAlpha = 1;
  }
  if (d.asleep) {
    g.font = '700 16px Caveat, cursive'; g.fillStyle = INK;
    const k = (time * 0.5 + d.x * 0.01) % 1;
    g.globalAlpha = 1 - k; g.fillText('z', d.x + 12 + k * 8, d.y - 14 - k * 16); g.globalAlpha = 1;
  }
}

/** A speech bubble with one made-up word in it, drawn above the dot. */
export function drawSpeech(g: CanvasRenderingContext2D, d: Dot): void {
  if (!d.speech) return;
  const { text, t, gloss } = d.speech;
  g.save();
  g.globalAlpha = Math.min(1, t * 3);
  g.font = '700 18px Caveat, cursive';
  let w = g.measureText(text).width + 16;
  if (gloss) { g.font = 'italic 13px Caveat, cursive'; w = Math.max(w, g.measureText(gloss).width + 14); g.font = '700 18px Caveat, cursive'; }
  const h = gloss ? 36 : 24, x = d.x - w / 2, y = d.y - 36 - h;
  g.fillStyle = '#FBFBF6'; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(d.x - 5, y + h - 1); g.lineTo(d.x, y + h + 7); g.lineTo(d.x + 5, y + h - 1); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(d.x - 5, y + h); g.lineTo(d.x, y + h + 7); g.lineTo(d.x + 5, y + h); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, d.x, y + (gloss ? 12 : h / 2 + 1));
  if (gloss) { g.font = 'italic 13px Caveat, cursive'; g.fillStyle = 'rgba(31,51,64,0.65)'; g.fillText(gloss, d.x, y + 27); }
  g.restore();
}

/** Where the "Play?" bubble sits beside a dot, in map units. */
export function inviteBox(d: Dot): { x: number; y: number; w: number; h: number } {
  return { x: d.x + 16, y: d.y - 14, w: 52, h: 24 };
}

/** The "Play?" bubble, offering a game of bounce. */
export function drawInvite(g: CanvasRenderingContext2D, d: Dot, time: number): void {
  if (!d.invite) return;
  const b = inviteBox(d), pulse = 1 + Math.sin(time * 6) * 0.04;
  g.save();
  g.globalAlpha = Math.min(1, d.invite * 3);
  g.translate(b.x + b.w / 2, b.y + b.h / 2);
  g.scale(pulse, pulse);
  g.fillStyle = '#F2A93B'; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 12); g.fill(); g.stroke();
  g.fillStyle = INK; g.font = '700 17px Caveat, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Play? ▸', 0, 1);
  g.restore();
}

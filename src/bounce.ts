import type { Character } from './cast';
import { INK } from './places';
import { seeded } from './random';

// The bounce game, played side-on. Inside the Stairless Tower you bounce
// upwards; on a dot's own course you roll along to the golden hoop. Either way
// your air is your life: thorns and spiky balls let some out, so you shrink
// and bounce lower, and blue air bubbles pump you back up. Run right out of
// air and you're back at the last lantern, full again. Word bubbles are points.

export interface BounceResult {
  /** Word bubbles popped: the points. */
  bubbles: number;
  /** Made it to the end: the top of the tower or the golden hoop. */
  top: boolean;
  /** Times it lost air. */
  ouches: number;
}

/** Who is bouncing: your dot, or the dot you tapped. */
export interface Player {
  name: string;
  colour: string;
  character?: Character;
  isPip?: boolean;
}

export type Course = 'tower' | 'run';

interface Ledge { x: number; y: number; w: number; ground?: boolean; thorns?: [number, number]; spring?: number; move?: { range: number; speed: number; x0: number } }
interface Spike { x: number; y: number; bob: number }
interface Bubble { x: number; y: number; syl: string; got?: boolean }
interface Pump { x: number; y: number; got?: boolean }
interface Lantern { x: number; y: number; lit?: boolean }
interface Level { course: Course; ledges: Ledge[]; spikes: Spike[]; bubbles: Bubble[]; pumps: Pump[]; lanterns: Lantern[]; end: { x: number; y: number } }

const W = 800, H = 450, WALL = 70, TOP = -2700, RUN = 3600, R = 15, SPIKE = 14;
const GRAVITY = 1500, ROLL = 1400, MAX_X = 330, JUMP = 560, HELD = 1.25, SPRING = 980;
/** Air runs from flat to as big as it gets; each knock lets out one step. */
const AIR_MIN = 0.5, AIR_MAX = 1.5, AIR_STEP = 0.25;

/** How each kind bounces: rolling speed, floatiness, and how much it springs back off the ground. */
const FEEL: Record<Character | 'pip', { speed: number; float: number; spring: number }> = {
  pip: { speed: 1, float: 1, spring: 0.32 },
  worrier: { speed: 0.9, float: 1, spring: 0.25 },
  diva: { speed: 1, float: 1.12, spring: 0.36 },
  schemer: { speed: 1.08, float: 1, spring: 0.3 },
  romantic: { speed: 0.95, float: 1.15, spring: 0.3 },
  oldtimer: { speed: 0.82, float: 0.95, spring: 0.2 },
  chaos: { speed: 1.2, float: 1, spring: 0.55 },
  foodie: { speed: 0.9, float: 0.95, spring: 0.3 },
};

/** What the writing at the top of the tower says. */
export const TOWER_WRITING = 'WE WENT NORTH. LEAVE THE DOOR OPEN.';

/** The tower is the same every time, so you can learn it. */
function buildTower(sylls: string[]): Level {
  const rnd = seeded(707), r = (a: number, b: number) => a + rnd() * (b - a);
  const ledges: Ledge[] = [{ x: WALL, y: 0, w: W - WALL * 2 }];
  const bubbles: Bubble[] = [], pumps: Pump[] = [], lanterns: Lantern[] = [{ x: W / 2, y: -10, lit: true }];
  // Left, middle, right, middle: a zigzag, so every jump is within reach. The last gap is never too big.
  let y = 0, i = 0;
  while (y > TOP + 116) {
    const high = y < TOP * 0.55, side = [1, 2, 1, 0][i++ % 4];
    y -= r(80, 98);
    const w = r(150, 230);
    const x = side === 0 ? WALL : side === 2 ? W - WALL - w : r(W / 2 - w / 2 - 80, W / 2 - w / 2 + 80);
    const l: Ledge = { x, y, w };
    if (y < -300 && rnd() < 0.3) { const a = r(0.15, 0.5); l.thorns = [a, a + 0.28]; }
    else if (y < -200 && rnd() < 0.18) l.spring = r(0.3, 0.7);
    if (high && side === 1 && rnd() < 0.6) l.move = { range: r(80, 150), speed: r(0.7, 1.3), x0: x };
    ledges.push(l);
    const above = { x: x + w * r(0.25, 0.75), y: y - r(50, 75) };
    if (rnd() < 0.15) pumps.push(above);
    else if (rnd() < 0.8) bubbles.push({ ...above, syl: sylls[(rnd() * sylls.length) | 0] });
    if (Math.floor(-y / 650) > lanterns.length - 1 && !l.thorns && !l.move) lanterns.push({ x: x + w / 2, y: y - 10 });
  }
  ledges.push({ x: WALL, y: TOP, w: W - WALL * 2 });
  return { course: 'tower', ledges, spikes: [], bubbles, pumps, lanterns, end: { x: W / 2, y: TOP } };
}

/** A dot's own course: rolling hills, gaps over the sea, thorns, spiky balls and planks. Each dot's is different, and always the same. */
function buildRun(seed: number, sylls: string[]): Level {
  const rnd = seeded(seed), r = (a: number, b: number) => a + rnd() * (b - a), syl = () => sylls[(rnd() * sylls.length) | 0];
  const ledges: Ledge[] = [{ x: -300, y: 0, w: 700, ground: true }];
  const spikes: Spike[] = [], bubbles: Bubble[] = [], pumps: Pump[] = [], lanterns: Lantern[] = [{ x: 60, y: 0, lit: true }];
  let x = 400, y = 0;
  while (x < RUN - 500) {
    const gap = rnd() < 0.55 ? r(70, 130) : 0;
    // The ground steps up and down a little, never more than a hop.
    y = Math.max(-80, Math.min(60, y + [-50, 0, 0, 50][(rnd() * 4) | 0]));
    x += gap;
    const w = r(260, 520), seg: Ledge = { x, y, w, ground: true };
    ledges.push(seg);
    if (Math.floor(x / 900) >= lanterns.length) lanterns.push({ x: x + 40, y });
    else if (x > 600 && w > 300 && rnd() < 0.5) { const a = r(0.35, 0.6); seg.thorns = [a, a + 60 / w]; }
    else if (rnd() < 0.25) seg.spring = r(0.4, 0.8);
    for (let k = 0, n = 1 + ((rnd() * 3) | 0); k < n; k++) bubbles.push({ x: x + w * ((k + 1) / (n + 1)), y: y - 40, syl: syl() });
    // A plank above, with the better things on it.
    if (rnd() < 0.6) {
      const pw = r(110, 180), px = x + r(0, w - pw), py = y - r(85, 105), plank: Ledge = { x: px, y: py, w: pw };
      if (x > 1600 && rnd() < 0.3) plank.move = { range: r(40, 90), speed: r(0.8, 1.4), x0: px };
      ledges.push(plank);
      if (rnd() < 0.35) pumps.push({ x: px + pw / 2, y: py - 45 });
      else bubbles.push({ x: px + pw / 2, y: py - 45, syl: syl() });
    }
    if (x > 800 && rnd() < 0.45) spikes.push({ x: x + w * r(0.3, 0.7), y: y - r(65, 120), bob: rnd() < 0.5 ? r(20, 40) : 0 });
    x += w;
  }
  ledges.push({ x, y: 0, w: 600, ground: true });
  return { course: 'run', ledges, spikes, bubbles, pumps, lanterns, end: { x: x + 300, y: -45 } };
}

export class Bounce {
  private readonly g: CanvasRenderingContext2D;
  private level: Level = buildTower(['po']);
  private player: Player = { name: 'Pip', colour: '#F7D774', isPip: true };
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private air = 1;
  private camX = 0;
  private camY = 0;
  private ground: Ledge | null = null;
  private coyote = 0;
  private buffer = 0;
  private squash = 0;
  private running = false;
  private done = false;
  private popped = 0;
  private ouches = 0;
  private hurt = 0;
  /** "Pff": air escaping, shown for a moment where it happened. */
  private puff: { x: number; y: number; t: number } | null = null;
  private time = 0;
  private best = 0;
  private readonly keys = { left: false, right: false, jump: false };
  private onEnd: ((r: BounceResult) => void) | null = null;

  constructor(
    private readonly wrap: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly ui: { title: HTMLElement; text: HTMLElement; msg: HTMLElement; go: HTMLButtonElement; close: HTMLButtonElement; quit: HTMLButtonElement; pads: HTMLElement },
    /** Plays the note in a popped bubble. */
    private readonly chime: (syl: string) => void,
  ) {
    this.g = canvas.getContext('2d')!;
    ui.go.addEventListener('click', () => { ui.msg.hidden = true; this.running = true; });
    ui.close.addEventListener('click', () => { wrap.hidden = true; });
    ui.quit.addEventListener('click', () => { if (this.done) wrap.hidden = true; else this.end(false); });
    const set = (code: string, v: boolean): boolean => {
      if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = v;
      else if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = v;
      else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') { if (v && !this.keys.jump) this.buffer = 0.12; this.keys.jump = v; }
      else return false;
      return true;
    };
    window.addEventListener('keydown', (e) => { if (this.open && set(e.code, true)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { set(e.code, false); });
    // On-screen pads for phones: hold to roll, tap or hold to jump.
    ui.pads.querySelectorAll<HTMLButtonElement>('button[data-key]').forEach((b) => {
      const code = b.dataset.key!;
      const down = (e: Event) => { e.preventDefault(); set(code, true); };
      const up = (e: Event) => { e.preventDefault(); set(code, false); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    });
  }

  get open(): boolean {
    return !this.wrap.hidden;
  }

  private get radius(): number {
    return R * this.air ** 0.6;
  }

  private get feel() {
    return FEEL[this.player.isPip ? 'pip' : this.player.character ?? 'foodie'];
  }

  /** `seed` picks the course, so each dot always has the same one. `intro` is said before it starts. */
  start(course: Course, player: Player, sylls: string[], seed: number, intro: string, onEnd: (r: BounceResult) => void): void {
    this.player = player;
    this.level = course === 'tower' ? buildTower(sylls) : buildRun(seed, sylls);
    const first = this.level.lanterns[0];
    Object.assign(this, { x: first.x, y: first.y - R - 2, vx: 0, vy: 0, air: 1, camX: course === 'tower' ? 0 : first.x - W * 0.4, camY: first.y - H * 0.6, ground: null, running: false, done: false, popped: 0, ouches: 0, hurt: 0, puff: null, best: 0 });
    this.onEnd = onEnd;
    this.wrap.hidden = false;
    this.ui.quit.hidden = false;
    const how = 'Roll with ← → (or A and D), jump with space or ↑, and hold the jump to bounce higher. Thorns and spiky balls let your air out. Blue air bubbles pump you back up, and the bigger you are, the higher you bounce.';
    if (course === 'tower') this.message('The Stairless Tower', `No stairs, so ${player.name} will have to bounce. ${how} Mushrooms are springy.`, 'Start bouncing');
    else this.message(`${player.name}'s bounce course`, `${intro} ${how} Get to the golden hoop.`, 'Start bouncing');
    this.draw();
  }

  frame(dt: number): void {
    this.time += dt;
    if (this.running) {
      // Small steps, so fast falls never pass through a ledge.
      const n = Math.ceil(dt / 0.008);
      for (let i = 0; i < n; i++) this.step(dt / n);
    }
    this.draw();
  }

  private message(title: string, text: string, go: string | null, close = false): void {
    const { ui } = this;
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.go.hidden = !go;
    ui.go.textContent = go ?? '';
    ui.close.hidden = !close;
    ui.msg.hidden = false;
  }

  private end(top: boolean): void {
    if (this.done) return;
    this.done = true;
    this.running = false;
    const { name } = this.player, n = this.popped, points = `${n} point${n === 1 ? '' : 's'}`;
    if (top && this.level.course === 'tower') this.message('The top of the tower', `There is writing on the wall, in letters bigger than ${name}: “${TOWER_WRITING}” ${points} on the way up.`, null, true);
    else if (top) this.message(`${name} made it!`, `Through the golden hoop with ${points}, and ${this.ouches ? `only ${this.ouches} knock${this.ouches === 1 ? '' : 's'}` : 'not a single knock'}. ${name} is very pleased with itself.`, null, true);
    else this.message(`${name} has had enough bouncing`, `Got ${Math.round(this.best * 100)}% of the way, with ${points}. The course will still be there.`, null, true);
    this.onEnd?.({ bubbles: n, top, ouches: this.ouches });
    this.onEnd = null;
  }

  private step(dt: number): void {
    const { keys, level } = this, feel = this.feel, rad = this.radius, tower = level.course === 'tower';
    for (const l of level.ledges) if (l.move) l.x = l.move.x0 + Math.sin(this.time * l.move.speed) * l.move.range;
    // Rolling: quick to start, quick to stop, a little slide.
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), top = MAX_X * feel.speed;
    if (dir) this.vx += dir * ROLL * dt;
    else this.vx *= Math.exp(-(this.ground ? 9 : 2) * dt);
    this.vx = Math.max(-top, Math.min(top, this.vx));
    // Riding a moving ledge.
    if (this.ground?.move) this.x += Math.cos(this.time * this.ground.move.speed) * this.ground.move.range * this.ground.move.speed * dt;

    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.ground ? 0.1 : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && (this.ground || this.coyote > 0)) {
      // The more air, the bigger the bounce.
      this.vy = -(JUMP + 140 * (this.air - 1));
      this.ground = null;
      this.coyote = 0;
      this.buffer = 0;
      this.squash = -0.25;
    }
    // Let go early for a little hop, hold for the full bounce.
    const gravity = (this.vy < 0 && !keys.jump ? GRAVITY * 2.2 : GRAVITY / (this.vy < 0 && keys.jump ? HELD : 1)) / feel.float;
    if (!this.ground) this.vy += gravity * dt;

    const oldX = this.x, oldY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // The ground is solid at the sides too, so a step up is a wall until you hop it.
    for (const l of level.ledges) {
      if (!l.ground || this.y + rad <= l.y + 4 || this.x + rad <= l.x || this.x - rad >= l.x + l.w) continue;
      if (oldX <= l.x) { this.x = l.x - rad; this.vx = Math.min(0, this.vx) * 0.3; }
      else if (oldX >= l.x + l.w) { this.x = l.x + l.w + rad; this.vx = Math.max(0, this.vx) * 0.3; }
    }
    const left = tower ? WALL : level.ledges[0].x + 20, right = tower ? W - WALL : level.end.x + 200;
    if (this.x < left + rad) { this.x = left + rad; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > right - rad) { this.x = right - rad; this.vx = -Math.abs(this.vx) * 0.5; }

    // Ledges are only solid from above, so you can bounce up through them.
    if (this.ground && (this.x < this.ground.x - rad * 0.6 || this.x > this.ground.x + this.ground.w + rad * 0.6)) this.ground = null;
    if (!this.ground && this.vy >= 0) {
      for (const l of level.ledges) {
        if (this.x < l.x - rad * 0.6 || this.x > l.x + l.w + rad * 0.6) continue;
        if (oldY + rad <= l.y + 1 && this.y + rad >= l.y) { this.land(l); break; }
      }
    }
    if (this.ground) this.y = this.ground.y - rad;

    this.hurt = Math.max(0, this.hurt - dt);
    if (!this.hurt) this.touchDanger();
    for (const b of level.bubbles) {
      if (b.got || Math.hypot(b.x - this.x, b.y - this.y) > rad + 16) continue;
      b.got = true;
      this.popped++;
      this.chime(b.syl);
    }
    for (const p of level.pumps) {
      if (p.got || this.air >= AIR_MAX || Math.hypot(p.x - this.x, p.y - this.y) > rad + 16) continue;
      p.got = true;
      this.air = Math.min(AIR_MAX, this.air + AIR_STEP);
      this.squash = -0.3;
      this.chime('wi');
    }
    for (const l of level.lanterns) if (!l.lit && Math.hypot(l.x - this.x, l.y - this.y) < 40) l.lit = true;
    if (this.puff && (this.puff.t -= dt) <= 0) this.puff = null;
    this.squash *= Math.exp(-10 * dt);

    if (tower) {
      this.best = Math.max(this.best, Math.min(1, this.y / TOP));
      if (this.y - this.camY > H + 120) this.fall();
      this.camY += (this.y - H * 0.55 - this.camY) * Math.min(1, dt * 5);
      if (this.ground?.y === TOP) this.end(true);
    } else {
      this.best = Math.max(this.best, Math.min(1, this.x / level.end.x));
      if (this.y > 280) this.fall();
      this.camX += (this.x - W * 0.4 - this.camX) * Math.min(1, dt * 5);
      this.camY += (Math.min(this.y, 40) - H * 0.62 - this.camY) * Math.min(1, dt * 3);
      if (Math.hypot(this.x - level.end.x, this.y - level.end.y) < 46) this.end(true);
    }
  }

  private land(l: Ledge): void {
    const speed = this.vy;
    if (l.spring !== undefined && Math.abs(this.x - (l.x + l.w * l.spring)) < 26) {
      this.vy = -SPRING * (0.9 + 0.1 * this.air);
      this.squash = 0.45;
      this.chime('bo');
      return;
    }
    this.squash = Math.min(0.4, speed / 1800);
    // A real ball bounces a little before it settles; a full one bounces more.
    if (speed > 420) { this.vy = -speed * this.feel.spring * (0.8 + 0.2 * this.air); return; }
    this.vy = 0;
    this.ground = l;
  }

  /** Thorns and spiky balls: a knock lets some air out. */
  private touchDanger(): void {
    const { x, y } = this, rad = this.radius;
    for (const l of this.level.ledges) {
      // Thorns point up: they only hurt from above, not when bouncing up through the ledge.
      if (!l.thorns || y > l.y - 4) continue;
      const a = l.x + l.w * l.thorns[0], b = l.x + l.w * l.thorns[1];
      const cx = Math.max(a, Math.min(b, x)), cy = Math.max(l.y - 12, Math.min(l.y, y));
      if (Math.hypot(cx - x, cy - y) < rad * 0.9) return this.knock(x < (a + b) / 2 ? -1 : 1);
    }
    for (const s of this.level.spikes) {
      const sy = s.y + Math.sin(this.time * 2 + s.x) * s.bob;
      if (Math.hypot(s.x - x, sy - y) < rad + SPIKE * 0.8) return this.knock(x < s.x ? -1 : 1);
    }
  }

  private knock(away: number): void {
    this.ouches++;
    this.air -= AIR_STEP;
    this.hurt = 1;
    this.puff = { x: this.x, y: this.y - this.radius, t: 0.7 };
    this.chime('pu');
    if (this.air < AIR_MIN) { this.backToLantern(); return; }
    this.vy = -340;
    this.vx = away * 170;
    this.ground = null;
  }

  /** Falling off the course costs air too, then back to the last lantern. */
  private fall(): void {
    this.ouches++;
    this.air -= AIR_STEP;
    this.backToLantern();
  }

  private backToLantern(): void {
    const lantern = [...this.level.lanterns].reverse().find((l) => l.lit)!;
    if (this.air < AIR_MIN) this.air = 1;
    this.hurt = 1;
    this.x = lantern.x;
    this.y = lantern.y - this.radius - 4;
    this.vx = 0;
    this.vy = 0;
    this.ground = null;
  }

  // ---------- Drawing ----------

  private draw(): void {
    const g = this.g, tower = this.level.course === 'tower';
    if (tower) this.drawTowerInside(); else this.drawOutside();
    g.save();
    g.translate(-this.camX, -this.camY);
    this.drawThings();
    this.drawPlayer();
    g.restore();
    this.drawHud();
  }

  private drawTowerInside(): void {
    const g = this.g, cam = this.camY;
    // Stone inside, getting lighter towards the open top.
    const k = Math.min(1, Math.max(0, cam / TOP));
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, k > 0.85 ? '#BFDDE6' : '#D9D2C3');
    sky.addColorStop(1, '#C9C0AE');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(0, -cam);
    g.strokeStyle = 'rgba(31,51,64,0.08)'; g.lineWidth = 1;
    for (let y = Math.floor(cam / 40) * 40; y < cam + H; y += 40) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = WALL + ((y / 40) % 2) * 40; x < W - WALL; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); }
    }
    // Slit windows, with daylight coming in.
    for (let y = -200; y > TOP; y -= 420) for (const x of [WALL + 40, W - WALL - 60]) {
      if (y < cam - 80 || y > cam + H + 80) continue;
      g.fillStyle = 'rgba(255,248,220,0.6)'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, 20, 60, 10); g.fill(); g.stroke();
    }
    g.fillStyle = INK; g.font = '700 30px Caveat, cursive'; g.textAlign = 'center';
    g.fillText(TOWER_WRITING, W / 2, TOP - 70);
    g.fillStyle = '#AEB8BC'; g.strokeStyle = INK; g.lineWidth = 3;
    g.fillRect(0, cam - 10, WALL, H + 20); g.fillRect(W - WALL, cam - 10, WALL, H + 20);
    g.beginPath(); g.moveTo(WALL, cam - 10); g.lineTo(WALL, cam + H + 10); g.moveTo(W - WALL, cam - 10); g.lineTo(W - WALL, cam + H + 10); g.stroke();
    g.restore();
  }

  private drawOutside(): void {
    const g = this.g;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#BFE3EA');
    sky.addColorStop(1, '#F1F5E4');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // Faraway hills and clouds drift by slower than the ground.
    for (const [depth, colour, base] of [[0.15, '#D7E8C6', 250], [0.35, '#C5DDB0', 300]] as const) {
      g.fillStyle = colour; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) { const wx = x + this.camX * depth; g.lineTo(x, base - this.camY * depth * 0.3 - Math.sin(wx * 0.006) * 40 - Math.sin(wx * 0.017) * 14); }
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 6; i++) {
      const x = (((i * 260 - this.camX * 0.1) % 1560) + 1560) % 1560 - 160, y = 40 + (i % 3) * 30;
      g.beginPath(); g.ellipse(x, y, 46, 14, 0, 0, 7); g.ellipse(x + 26, y - 8, 28, 14, 0, 0, 7); g.fill();
    }
    // The sea, below everything, where the gaps go.
    const sea = 150 - this.camY;
    g.fillStyle = '#9CCFD3'; g.fillRect(0, sea, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
    for (let x = -((this.camX * 0.9) % 60); x < W; x += 60) { g.beginPath(); g.arc(x, sea + 14 + Math.sin(this.time * 2 + x) * 2, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }

  private drawThings(): void {
    const g = this.g, { level, camX, camY } = this, seen = (x: number, y: number, m = 60) => x > camX - m && x < camX + W + m && y > camY - m && y < camY + H + m;
    for (const l of level.ledges) {
      if (!seen(l.x + l.w / 2, l.y, l.w / 2 + 60) && !l.ground) continue;
      g.strokeStyle = INK; g.lineWidth = 2.5;
      if (l.ground) {
        // Solid ground: earth with a grassy top, going down out of sight.
        g.fillStyle = '#E8D9B5'; g.beginPath(); g.rect(l.x, l.y, l.w, 600); g.fill(); g.stroke();
        g.fillStyle = '#9CCB86'; g.beginPath(); g.roundRect(l.x - 3, l.y - 4, l.w + 6, 14, 6); g.fill(); g.stroke();
      } else if (level.course === 'tower') {
        g.fillStyle = '#C3CBCD'; g.beginPath(); g.roundRect(l.x, l.y, l.w, 14, 4); g.fill(); g.stroke();
      } else {
        g.fillStyle = '#C9A27A'; g.beginPath(); g.roundRect(l.x, l.y, l.w, 12, 4); g.fill(); g.stroke();
        g.beginPath(); for (let x = l.x + 30; x < l.x + l.w; x += 30) { g.moveTo(x, l.y); g.lineTo(x, l.y + 12); } g.lineWidth = 1.5; g.stroke();
      }
      if (l.thorns) {
        g.fillStyle = '#5E9C68'; g.lineWidth = 2;
        const a = l.x + l.w * l.thorns[0], b = l.x + l.w * l.thorns[1];
        for (let x = a; x < b; x += 12) { g.beginPath(); g.moveTo(x, l.y); g.lineTo(x + 6, l.y - 13); g.lineTo(x + 12, l.y); g.closePath(); g.fill(); g.stroke(); }
      }
      if (l.spring !== undefined) {
        const x = l.x + l.w * l.spring;
        g.fillStyle = '#F4F6F6'; g.lineWidth = 2; g.fillRect(x - 5, l.y - 10, 10, 10); g.strokeRect(x - 5, l.y - 10, 10, 10);
        g.fillStyle = '#D94F5C'; g.beginPath(); g.ellipse(x, l.y - 12, 18, 11, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#FBFBF6'; for (const dx of [-8, 3, 10]) { g.beginPath(); g.arc(x + dx, l.y - 17 + Math.abs(dx) * 0.3, 2.2, 0, 7); g.fill(); }
      }
    }
    for (const s of level.spikes) {
      const y = s.y + Math.sin(this.time * 2 + s.x) * s.bob;
      if (!seen(s.x, y)) continue;
      g.fillStyle = '#4F7F57'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + this.time * 0.8, r = i % 2 ? SPIKE * 0.7 : SPIKE * 1.25; g.lineTo(s.x + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
    }
    for (const l of level.lanterns) {
      if (!seen(l.x, l.y)) continue;
      g.strokeStyle = INK; g.lineWidth = 2;
      if (l.lit) { g.fillStyle = 'rgba(247,215,116,0.35)'; g.beginPath(); g.arc(l.x, l.y - 16, 22 + Math.sin(this.time * 4) * 2, 0, 7); g.fill(); }
      g.fillStyle = l.lit ? '#F7D774' : '#9AA6A0';
      g.beginPath(); g.roundRect(l.x - 7, l.y - 26, 14, 18, 4); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(l.x, l.y - 26); g.lineTo(l.x, l.y - 32); g.stroke();
    }
    for (const b of level.bubbles) {
      const y = b.y + Math.sin(this.time * 2 + b.x) * 4;
      if (b.got || !seen(b.x, y)) continue;
      g.fillStyle = 'rgba(251,251,246,0.85)'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.arc(b.x, y, 16, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(b.x - 6, y - 7, 4, 2.5, -0.6, 0, 7); g.fill();
      g.fillStyle = INK; g.font = '700 15px Caveat, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.syl, b.x, y + 1);
      g.textBaseline = 'alphabetic';
    }
    for (const p of level.pumps) {
      const y = p.y + Math.sin(this.time * 3 + p.x) * 5;
      if (p.got || !seen(p.x, y)) continue;
      // An air bubble: blue, with a plus, gently swelling.
      const r = 15 + Math.sin(this.time * 4) * 2;
      g.fillStyle = 'rgba(108,156,242,0.85)'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, y, r, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#FBFBF6'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x - 6, y); g.lineTo(p.x + 6, y); g.moveTo(p.x, y - 6); g.lineTo(p.x, y + 6); g.stroke();
    }
    if (level.course === 'run') {
      // The golden hoop at the end.
      const { x, y } = level.end;
      g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y + 45); g.lineTo(x, y + 30); g.stroke();
      g.strokeStyle = '#F2A93B'; g.lineWidth = 9; g.beginPath(); g.ellipse(x, y - 5, 22, 36, 0, 0, 7); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 5, 27, 41, 0, 0, 7); g.ellipse(x, y - 5, 17, 31, 0, 0, 7); g.stroke();
    }
    if (this.puff) {
      g.globalAlpha = Math.min(1, this.puff.t * 2); g.fillStyle = INK; g.font = '700 20px Caveat, cursive'; g.textAlign = 'center';
      g.fillText('pff!', this.puff.x + 16, this.puff.y - (0.7 - this.puff.t) * 40); g.globalAlpha = 1;
    }
  }

  /** The bouncing dot: squashing on landings, smaller and saggier when it's lost air. */
  private drawPlayer(): void {
    const g = this.g, s = this.squash, rad = this.radius, flash = this.hurt > 0 && Math.floor(this.hurt * 12) % 2 === 0;
    const sag = Math.max(0, 1 - this.air) * 0.25;
    g.save();
    g.translate(this.x, this.y + rad * (Math.max(0, s) * 0.5 + sag * 0.5));
    g.scale(1 + s + sag, 1 - s - sag);
    g.fillStyle = flash ? '#FBFBF6' : this.player.colour; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, rad, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-rad * 0.33, -rad * 0.4, rad * 0.27, rad * 0.17, -0.5, 0, 7); g.fill();
    const look = Math.max(-1, Math.min(1, this.vx / 200)) * rad * 0.27, e = rad / 15;
    g.fillStyle = INK; g.beginPath(); g.ellipse(look - 4 * e, -2 * e, 1.9 * e, 2.8 * e, 0, 0, 7); g.ellipse(look + 4 * e, -2 * e, 1.9 * e, 2.8 * e, 0, 0, 7); g.fill();
    g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath();
    if (this.hurt > 0 || this.air < 0.8) g.arc(look, 7 * e, 2.6 * e, Math.PI + 0.4, -0.4); else g.arc(look, 3 * e, 3 * e, 0.3, Math.PI - 0.3);
    g.stroke();
    g.restore();
  }

  /** Points, how far, and how much air: one dot per knock it can take. */
  private drawHud(): void {
    const g = this.g;
    g.fillStyle = '#FBFBF6'; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect(12, 12, 300, 34, 10); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = '700 20px Caveat, cursive'; g.textAlign = 'left';
    const far = Math.round(Math.min(1, this.best) * 100);
    g.fillText(`${far}%   Points ${this.popped}   Air`, 24, 36);
    const steps = Math.round((AIR_MAX - AIR_MIN) / AIR_STEP) + 1, have = Math.round((this.air - AIR_MIN) / AIR_STEP) + 1;
    for (let i = 0; i < steps; i++) {
      g.fillStyle = i < have ? '#6C9CF2' : '#FBFBF6';
      g.beginPath(); g.arc(205 + i * 20, 29, 7, 0, 7); g.fill(); g.stroke();
    }
  }
}

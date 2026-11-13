import { INK } from './places';

// The dream: the one part you actually play. Hold to float up, let go to sink,
// collect sparkles, and don't touch the gulls.

export interface Treasure {
  name: string;
  /** How far into the dream it turns up. */
  at: number;
  colour: string;
  /** Coins it brings in, for spending in town. */
  worth: number;
}

export const TREASURES: Treasure[] = [
  { name: 'a glass acorn', at: 650, colour: '#9CCFD3', worth: 15 },
  { name: 'a little brass key', at: 1600, colour: '#F2A93B', worth: 40 },
  { name: 'a star in a jar', at: 2900, colour: '#F7D774', worth: 90 },
];

export interface DreamResult {
  sparkles: number;
  /** Every treasure reached, kept or not. */
  found: Treasure[];
  /** A gull got the dreamer, so nothing is kept. */
  caught: boolean;
}

interface Bird { x: number; y: number; v: number; bob: number }
interface Spark { x: number; y: number; got?: boolean }

const W = 800, H = 450, PIP_X = 150;

export class Dream {
  private readonly g: CanvasRenderingContext2D;
  private y = H / 2;
  private vy = 0;
  private dist = 0;
  private sparkles = 0;
  private held = false;
  private running = false;
  private items: Treasure[] = [];
  private birds: Bird[] = [];
  private sparks: Spark[] = [];
  private next = 0;
  private treasure: (Treasure & { x: number; y: number }) | null = null;
  private tBird = 0.6;
  private tSpark = 0.3;
  private onEnd: ((r: DreamResult) => void) | null = null;
  /** What to call the dreamer: "Pip" once it has a name. */
  private who = 'Pip';

  constructor(private readonly wrap: HTMLElement, canvas: HTMLCanvasElement, private readonly ui: { title: HTMLElement; text: HTMLElement; msg: HTMLElement; go: HTMLButtonElement; wake: HTMLButtonElement; close: HTMLButtonElement }) {
    this.g = canvas.getContext('2d')!;
    ui.go.addEventListener('click', () => { ui.msg.hidden = true; this.running = true; this.held = false; });
    ui.wake.addEventListener('click', () => this.end(false));
    ui.close.addEventListener('click', () => { wrap.hidden = true; });
    const hold = (v: boolean) => (e: Event) => { if (this.running) { this.held = v; e.preventDefault(); } };
    canvas.addEventListener('pointerdown', hold(true));
    window.addEventListener('pointerup', () => { this.held = false; });
    window.addEventListener('keydown', (e) => { if (this.running && e.code === 'Space') { this.held = true; e.preventDefault(); } });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') this.held = false; });
  }

  get open(): boolean {
    return !this.wrap.hidden;
  }

  start(who: string, onEnd: (r: DreamResult) => void): void {
    this.who = who;
    Object.assign(this, { y: H / 2, vy: 0, dist: 0, sparkles: 0, held: false, running: false, items: [], birds: [], sparks: [], next: 0, treasure: null, tBird: 0.6, tSpark: 0.3 });
    this.onEnd = onEnd;
    this.wrap.hidden = false;
    this.message(who + ' is dreaming', 'Hold anywhere (or the space bar) to float up. Let go to sink. Sparkles are nice. Treasures are kept. Touch a gull and you wake with nothing.', 'Start dreaming');
    this.draw(0);
  }

  frame(dt: number, time: number): void {
    if (this.running) this.step(dt);
    this.draw(time);
  }

  private message(title: string, text: string, go: string | null, wake = false, close = false): void {
    const { ui } = this;
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.go.hidden = !go;
    ui.go.textContent = go ?? '';
    ui.wake.hidden = !wake;
    ui.close.hidden = !close;
    ui.msg.hidden = false;
  }

  private end(caught: boolean): void {
    this.running = false;
    const got = this.items.map((t) => t.name).join(' and '), who = this.who;
    if (caught) this.message('A gull got ' + who, got ? who + ' nearly had ' + got + '. It wakes with nothing.' : who + ' wakes with a start. Nothing kept.', null, false, true);
    else if (this.items.length) this.message(who + ' wakes holding ' + got, 'It goes on the shelf at home.', null, false, true);
    else this.message('A nice dream', 'Sparkles, mostly.', null, false, true);
    this.onEnd?.({ sparkles: this.sparkles, found: this.items, caught });
    this.onEnd = null;
  }

  private step(dt: number): void {
    const sp = 190 + this.dist * 0.035;
    this.dist += sp * dt;
    this.vy = Math.max(-260, Math.min(260, this.vy + (this.held ? -640 : 520) * dt));
    this.y += this.vy * dt;
    if (this.y < 24) { this.y = 24; this.vy = 0; }
    if (this.y > H - 24) { this.y = H - 24; this.vy = 0; }
    this.tBird -= dt;
    if (this.tBird <= 0) { this.tBird = Math.max(0.55, 1.15 - this.dist / 5000); this.birds.push({ x: W + 40, y: 30 + Math.random() * 410, v: sp + 20 + Math.random() * 70, bob: Math.random() * 6 }); }
    this.tSpark -= dt;
    if (this.tSpark <= 0) { this.tSpark = 0.45; this.sparks.push({ x: W + 30, y: 40 + Math.random() * 370 }); }
    if (!this.treasure && this.next < TREASURES.length && this.dist >= TREASURES[this.next].at) this.treasure = { ...TREASURES[this.next], x: W + 50, y: 70 + Math.random() * 310 };
    for (const b of this.birds) {
      b.x -= b.v * dt;
      b.bob += dt * 5;
      if (Math.hypot(b.x - PIP_X, b.y + Math.sin(b.bob) * 8 - this.y) < 30) return this.end(true);
    }
    this.birds = this.birds.filter((b) => b.x > -40);
    for (const s of this.sparks) {
      s.x -= sp * dt;
      if (!s.got && Math.hypot(s.x - PIP_X, s.y - this.y) < 28) { s.got = true; this.sparkles++; }
    }
    this.sparks = this.sparks.filter((s) => s.x > -20 && !s.got);
    const t = this.treasure;
    if (!t) return;
    t.x -= sp * dt;
    if (Math.hypot(t.x - PIP_X, t.y - this.y) < 36) {
      this.items.push(t);
      this.treasure = null;
      this.next++;
      this.running = false;
      this.birds = [];
      const more = this.next < TREASURES.length;
      this.message(this.who + ' found ' + t.name + '!', more ? 'Wake up now and keep everything, or keep dreaming for something rarer. If a gull gets ' + this.who + ', it loses the lot.' : 'That is as far as dreams go. Time to wake up.', more ? 'Keep dreaming' : null, true);
    } else if (t.x < -40) { this.treasure = null; this.next++; }
  }

  private draw(time: number): void {
    const g = this.g, sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2B3A63');
    sky.addColorStop(1, '#8C7BB8');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // Faint stars and floating islands drift past at different speeds.
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 40; i++) { const x = (((i * 137 - this.dist * 0.1) % W) + W) % W; g.beginPath(); g.arc(x, (i * 89) % (H - 60), 1.4, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) {
      const x = (((i * 300 - this.dist * 0.5) % 1200) + 1200) % 1200 - 150, w = 120 + (i % 2) * 40, y = 340 + (i % 3) * 22;
      g.fillStyle = '#CDE4A6'; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w * 0.6, y + 50); g.lineTo(x + w * 0.35, y + 46); g.closePath(); g.fill(); g.stroke();
    }
    for (const s of this.sparks) {
      g.fillStyle = '#F7D774'; g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + time, r = i % 2 ? 4 : 9; g.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
    }
    const t = this.treasure;
    if (t) {
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(t.x, t.y, 30 + Math.sin(time * 5) * 4, 0, 7); g.fill();
      g.fillStyle = t.colour; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.roundRect(t.x - 16, t.y - 12, 32, 24, 8); g.fill(); g.stroke();
      g.beginPath(); g.arc(t.x, t.y - 14, 5, 0, 7); g.fill(); g.stroke();
    }
    for (const b of this.birds) {
      const y = b.y + Math.sin(b.bob) * 8;
      g.fillStyle = '#F4F6F6'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(b.x, y, 20, 11, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.arc(b.x - 18, y - 7, 8, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#F2A93B'; g.beginPath(); g.moveTo(b.x - 25, y - 8); g.lineTo(b.x - 36, y - 5); g.lineTo(b.x - 25, y - 3); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(b.x - 20, y - 9, 1.8, 0, 7); g.fill();
      g.fillStyle = '#C9D6D8'; g.beginPath(); g.moveTo(b.x - 4, y - 4); g.lineTo(b.x + 14, y - 18 - Math.sin(b.bob * 3) * 8); g.lineTo(b.x + 12, y); g.closePath(); g.fill(); g.stroke();
    }
    // The dreamer, big and happy.
    const r = 22;
    g.save(); g.translate(PIP_X, this.y);
    g.fillStyle = '#F7D774'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-7, -9, 6, 4, -0.5, 0, 7); g.fill();
    g.fillStyle = INK; g.beginPath(); g.ellipse(-1, -4, 3, 4.5, 0, 0, 7); g.ellipse(11, -4, 3, 4.5, 0, 0, 7); g.fill();
    g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.arc(5, 4, 5, 0.3, Math.PI - 0.3); g.stroke();
    g.restore();
    g.fillStyle = '#FBFBF6'; g.font = '700 24px Caveat, cursive'; g.textAlign = 'left';
    g.fillText('Sparkles: ' + this.sparkles + '    Treasures: ' + (this.items.map((i) => i.name).join(', ') || 'none yet'), 16, 32);
  }
}

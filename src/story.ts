import { CAST } from './cast';
import { Chats } from './chat';
import { canWalk, cheer, moveDot, walkTo, type Dot, type Target } from './dots';
import { TOWER_WRITING, type BounceResult } from './bounce';
import type { DreamResult } from './dream';
import type { Fog } from './fog';
import { clearPath, isLand } from './island';
import type { Journal } from './journal';
import {
  AGAIN, ARRIVED, BLOOM, BROKE, CAUSEWAY, CAUSEWAY_ODO, FIRST, FRIEND, GIFT, KEY_FITS, MEET, NAMED, NAMED_PIP, ODD, POKED, QUIET_DAY, RAIN, RAIN_OUT, RAIN_UMBRELLA, ROOF, TOOK,
  PLAYED_CLEAN, PLAYED_OTHER, PLAYED_OTHER_QUIT, PLAYED_PIP, PLAYED_QUIT, PLAYED_WON, TOWER_AGAIN, TOWER_TRIED, TOWN_ARRIVE, TOY_AGAIN, TOY_FIRST, VENUE_FIRST, WIND, WIND_HAT, WIND_HAT_OTHER, WIND_KITE, busyDay, dreamCaught, towerTop, dreamCoins, dreamKept, dreamSparkles, learntWord, spent,
} from './lines';
import type { Place } from './places';
import { R, dist, pick, rand, type Point } from './random';
import { CARRIED, type Toy, type ToyKind } from './toys';
import type { Town, Venue } from './town';
import { TownLife, makeTownsfolk } from './townlife';
import { Watching } from './watch';
import { shout, type Concept, type Mark, type Words } from './words';

/** Seconds of real time per dot day at 1x. */
export const DAY = 44;

/** How long a shower and a gust last, in seconds at 1x. */
export const RAIN_TIME = 14;
const WIND_TIME = 6;

export const partOfDay = (t: number): string => (t < 0.25 ? 'morning' : t < 0.55 ? 'afternoon' : t < 0.8 ? 'evening' : 'night');

export interface Ripple extends Point {
  t: number;
}

/** Places with a roof, or near enough, to wait out the rain. */
const SHELTERS = new Set(['home', 'oak', 'cave', 'tower', 'bridge', 'door']);

/** Everything that happens on the island: your dot exploring, the neighbours, the toys, the weather and the days going by. */
export class Story {
  day = 1;
  /** Time of day, from 0 (dawn) to 1. Night starts at 0.8. */
  tod = 0.06;
  readonly toys: Toy[] = [];
  /** Seconds of rain left. */
  rain = 0;
  /** Seconds of wind left. */
  wind = 0;
  readonly ripples: Ripple[] = [];
  /** Things Pip brought back from its dreams. */
  readonly keepsakes: string[] = [];
  private newToday = 0;
  private metToday = 0;
  private gifts = 0;
  private wroteEvening = false;
  /** How far from home your dot dares to go. It grows every day. */
  private range = 0;
  private lastReveal = { x: -99, y: -99 };
  private dreamtTonight = false;
  private nextToy = 1;
  private readonly seenKinds = new Set<ToyKind>();
  private rains = 0;
  private pokesToday = 0;
  private wrotePoke = false;
  /** Your dot has crossed the causeway at least once. */
  townVisited = false;
  readonly life: TownLife;
  readonly chats = new Chats(this);
  readonly watching = new Watching(this);

  constructor(
    readonly home: Place,
    readonly places: Place[],
    readonly pip: Dot,
    readonly others: Dot[],
    private readonly journal: Journal,
    private readonly words: Words,
    private readonly fog: Fog,
    readonly trail: CanvasRenderingContext2D,
    readonly town: Town,
    private readonly hooks: { change: () => void; words: () => void; said: (d: Dot, text: string) => void; sound: (d: Dot, kind: 'whistle') => void; diary: (d: Dot) => void; causeway: () => void },
  ) {
    this.life = new TownLife(this, town, makeTownsfolk(town));
    pip.coins = 25;
    fog.reveal(home.x, home.y, 190);
    fog.markSeen(home.x, home.y);
    this.write(ARRIVED);
  }

  get night(): boolean {
    return this.tod >= 0.8;
  }

  /** How hard the wind is blowing, from 0 to 1. */
  get gust(): number {
    return Math.min(1, this.wind / 1.5);
  }

  /** Pip can dream once a night, while it is asleep. */
  get canDream(): boolean {
    return this.pip.asleep && !this.dreamtTonight;
  }

  get dots(): Dot[] {
    return [this.pip, ...this.others, ...this.life.folk];
  }

  get partOfDay(): string {
    return partOfDay(this.tod);
  }

  writeAbout(text: string, dot: string, place: string | null = null): void {
    this.journal.writeAbout(this.day, text, dot, place);
  }

  diaryChanged(d: Dot): void {
    this.hooks.diary(d);
  }

  dotById(id: string): Dot | undefined {
    return this.dots.find((d) => d.id === id);
  }

  dreamt({ sparkles, found, caught }: DreamResult): void {
    this.dreamtTonight = true;
    const things = found.map((t) => t.name).join(' and ');
    if (caught) { this.write(dreamCaught(things)); cheer(this.pip, -0.4); return; }
    // Sparkles are pocket money; treasures are worth much more.
    const coins = Math.floor(sparkles / 4) + found.reduce((n, t) => n + t.worth, 0);
    this.pip.coins! += coins;
    if (coins && this.townVisited) this.write(dreamCoins(coins));
    if (!found.length) { this.write(dreamSparkles(sparkles)); cheer(this.pip, 0.15); this.hooks.change(); return; }
    this.keepsakes.push(...found.map((t) => t.name));
    this.write(dreamKept(things, found.length), 'home');
    cheer(this.pip, 0.6);
    const door = this.places.find((p) => p.type === 'door');
    if (found.some((t) => t.name.includes('key')) && door?.found) this.write(KEY_FITS, door.id);
    this.hooks.change();
  }

  /** The Stairless Tower, once found, can be bounced up from the inside. */
  get tower(): Place | undefined {
    return this.places.find((p) => p.type === 'tower' && p.found);
  }

  private towerTops = 0;
  private wroteTowerTry = false;

  /** Back from bouncing up the tower: coins for bubbles, and the writing at the top. */
  climbed({ bubbles, top }: BounceResult): void {
    const tower = this.tower!;
    this.pip.coins! += bubbles + (top && !this.towerTops ? 30 : 0);
    if (top) {
      this.write(this.towerTops++ ? TOWER_AGAIN : towerTop(TOWER_WRITING), tower.id);
      if (this.towerTops === 1) this.keepsakes.push('a feather from the top of the tower');
      cheer(this.pip, 0.5);
    } else if (!this.wroteTowerTry) {
      this.wroteTowerTry = true;
      this.write(TOWER_TRIED, tower.id);
    }
    this.hooks.change();
  }

  private playedWith = new Set<string>();

  /** Back from a game of bounce with a dot: coins for points, and they like you more for it. */
  played(d: Dot, { bubbles, top, ouches }: BounceResult): void {
    this.pip.coins! += bubbles + (top ? 10 : 0);
    cheer(d, top ? 0.5 : 0.2);
    d.used = Math.min(1, (d.used ?? 0) + 0.15);
    if (d.diary && d.character) this.life.diary(d, top ? (ouches ? PLAYED_WON : PLAYED_CLEAN) : PLAYED_QUIT);
    if (d.isPip) { if (top && !this.playedWith.has('pip')) { this.playedWith.add('pip'); this.write(PLAYED_PIP); } }
    else if (!this.playedWith.has(d.id) && !this.pip.asleep) { this.playedWith.add(d.id); this.writeAbout(top ? PLAYED_OTHER : PLAYED_OTHER_QUIT, d.id); }
    this.hooks.change();
  }

  // ---------- What you can do ----------

  /** Leaves a toy on the map, but only on land your dot has already seen. */
  leaveToy(kind: ToyKind, x: number, y: number): boolean {
    if (!isLand(x, y) || !this.fog.isSeen(x, y)) return false;
    const remove = (t: Toy | undefined) => { if (t) this.toys.splice(this.toys.indexOf(t), 1); };
    // One berry at a time, and only so much clutter.
    if (kind === 'berry') remove(this.toys.find((t) => t.kind === 'berry'));
    const lying = this.toys.filter((t) => !t.holder && t.kind !== 'flower');
    if (kind !== 'flower' && lying.length >= 6) remove(lying[0]);
    const flowers = this.toys.filter((t) => t.kind === 'flower');
    if (kind === 'flower' && flowers.length >= 5) remove(flowers[0]);
    this.toys.push({ id: this.nextToy++, kind, x, y, holder: null, vx: 0, vy: 0, age: 0, seen: false });
    return true;
  }

  /** Pokes the dot nearest the point, if there is one close enough. It jiggles and complains, but goes on with its day. */
  poke(x: number, y: number): Dot | null {
    let best: Dot | null = null, bd = 20;
    for (const d of this.dots) { const k = dist(d, { x, y }); if (k < bd) { bd = k; best = d; } }
    if (!best) return null;
    best.pokeT = 0.5;
    if (best.asleep) return best;
    best.invite = 3;
    cheer(best, best.isPip ? 0.05 : CAST[best.character!].poked);
    this.say(best, 'ow');
    if (best.isPip && ++this.pokesToday >= 3 && !this.wrotePoke) { this.wrotePoke = true; this.write(POKED); }
    return best;
  }

  makeRain(): void {
    if (this.rain > 0) return;
    this.rain = RAIN_TIME;
    const { pip } = this;
    for (const d of this.dots) {
      if (d.asleep || this.holds(d, 'umbrella')) continue;
      const cover = d.isPip ? this.shelterFor(d) : d.base!;
      if (!cover) continue;
      this.travel(d, { x: cover.x, y: cover.y + (d.diary ? 0 : 14), shelter: true });
      d.speed *= 1.6;
    }
    if (pip.asleep) return;
    if (this.holds(pip, 'umbrella')) { this.write(RAIN_UMBRELLA); cheer(pip, 0.3); return; }
    const cover = this.shelterFor(pip);
    if (cover) this.write(RAIN[this.rains++ % RAIN.length], cover.id);
    else this.write(RAIN_OUT);
  }

  makeWind(): void {
    if (this.wind > 0) return;
    this.wind = WIND_TIME;
    const { pip } = this;
    let wrote = false;
    for (const t of this.toys) {
      if (t.kind === 'ball' && !t.holder) t.vx += rand(120, 200);
      if (t.kind !== 'hat' || !t.holder) continue;
      // Hats blow off and land downwind.
      const d = this.dotById(t.holder)!;
      d.holding = undefined;
      t.holder = null;
      const spot = { x: d.x + rand(80, 140), y: d.y + rand(-20, 20) };
      if (isLand(spot.x, spot.y)) { t.x = spot.x; t.y = spot.y; }
      t.seen = false;
      if (pip.asleep) continue;
      if (d.isPip) { this.write(WIND_HAT); wrote = true; }
      else if (d.known && dist(d, pip) < 300) { this.journal.writeAbout(this.day, WIND_HAT_OTHER, d.id); wrote = true; }
      cheer(d, -0.2);
    }
    for (const d of this.dots) if (this.holds(d, 'kite')) cheer(d, 0.5);
    if (pip.asleep) return;
    if (this.holds(pip, 'kite')) this.write(WIND_KITE);
    else if (!wrote && this.day > 1) this.write(WIND);
  }

  skipToTomorrow(): void {
    const d0 = this.day;
    let n = 0;
    while ((this.day === d0 || this.tod < 0.08) && n++ < 20000) this.update(0.1);
  }

  // ---------- Each moment ----------

  update(dt: number): void {
    this.tod += dt / DAY;
    if (this.tod >= 1) { this.tod -= 1; this.day++; this.newDay(); }
    this.range = 300 + this.day * 110;
    this.rain = Math.max(0, this.rain - dt);
    this.wind = Math.max(0, this.wind - dt);
    const night = this.night;
    const { pip, home } = this;
    const goHome: Target = { x: home.x, y: home.y + 14, home: true };
    for (const d of this.dots) {
      d.mood += (d.calm - d.mood) * Math.min(1, dt * 0.03);
      if (d.speech && (d.speech.t -= dt) <= 0) d.speech = undefined;
      if (d.pokeT) d.pokeT = Math.max(0, d.pokeT - dt);
      if (d.hold) d.hold = Math.max(0, d.hold - dt);
      if (d.invite) d.invite = Math.max(0, d.invite - dt);
      // Rain gets everyone down, apart from whoever has the umbrella.
      if (this.rain > 0 && !d.asleep) cheer(d, this.holds(d, 'umbrella') ? dt * 0.05 : -dt * (d.character === 'worrier' ? 0.06 : 0.03));
    }

    // Your dot
    if (pip.asleep) {
      if (!night) { pip.asleep = false; pip.wait = 0.8; }
    } else {
      if (night && pip.state === 'idle' && dist(pip, home) < 30) {
        pip.asleep = true;
        if (!this.wroteEvening) { this.wroteEvening = true; this.eveningNote(); }
      } else if (pip.state === 'idle') {
        pip.wait -= dt;
        // Bedtime beats the rain.
        if (pip.wait <= 0 && (night || !this.stayingDry(pip))) {
          this.travel(pip, night ? goHome : this.chooseTarget(pip));
          pip.speed = night ? 80 : 46;
        }
      } else if (moveDot(pip, dt, this.trail)) {
        if (pip.route?.length) walkTo(pip, pip.route.shift()!);
        else this.arrive(pip, pip.target);
      } else if (night && pip.target && !pip.target.home) { this.travel(pip, goHome); pip.speed = 80; }
      if (Math.hypot(pip.x - this.lastReveal.x, pip.y - this.lastReveal.y) > 14) {
        this.fog.reveal(pip.x, pip.y, 135);
        this.fog.markSeen(pip.x, pip.y);
        this.lastReveal = { x: pip.x, y: pip.y };
      }
      for (const p of this.places) if (!p.found && dist(p, pip) < 78) { this.discover(p); break; }
      if (this.town.open) this.inTown();
    }
    if (pip.state !== 'walk') moveDot(pip, dt, this.trail);

    // The neighbours
    for (const o of this.others) {
      const base = o.base!, traits = CAST[o.character!];
      if (night) {
        if (dist(o, base) < 12) { o.asleep = true; o.state = 'idle'; }
        else if (o.state !== 'walk' || !o.goingHome) { walkTo(o, base); o.goingHome = true; o.speed = 70 * traits.speed; }
      } else if (o.goingHome || o.asleep) { o.asleep = false; o.goingHome = false; o.speed = 40 * traits.speed; }
      if (o.asleep) continue;
      if (o.state === 'idle') {
        o.wait -= dt;
        if (o.wait <= 0 && !night && !this.stayingDry(o)) {
          o.speed = 40 * traits.speed;
          const t = this.neighbourTarget(o);
          if (canWalk(o, t)) { o.target = t; walkTo(o, t); }
          else o.wait = 0.4;
        }
      } else if (moveDot(o, dt, this.trail)) {
        o.wait = rand(1, 3.5);
        if (o.target?.toy !== undefined) this.useToy(o, o.target.toy);
        o.target = undefined;
      }
      if (o.state !== 'walk') moveDot(o, dt, this.trail);
      if (!pip.asleep && o.metDay !== this.day && dist(o, pip) < 36 && !pip.target?.look) this.meet(o);
      if ((o.chat = o.chat! - dt) <= 0 && !pip.asleep && dist(o, pip) < 90) this.chatter(o);
    }

    this.life.update(dt);
    this.chats.update(dt);
    this.updateToys(dt);
    for (const p of [...this.places, home, ...this.town.venues, this.town.causewaySpot]) if (p.pulse > 0) p.pulse = Math.max(0, p.pulse - dt * 0.35);
    for (const r of this.ripples) r.t += dt;
    while (this.ripples.length && this.ripples[0].t > 1.2) this.ripples.shift();
  }

  private updateToys(dt: number): void {
    for (const t of this.toys) {
      t.age += dt / DAY;
      if (t.holder) { const d = this.dotById(t.holder)!; t.x = d.x; t.y = d.y; continue; }
      if (t.kind === 'ball') this.rollBall(t, dt);
      if (t.kind !== 'flower') continue;
      if (t.age >= 2 && !t.bloomed) {
        t.bloomed = true;
        if (this.fog.isSeen(t.x, t.y)) this.write(BLOOM, this.nearestFound(t).id);
      }
      // A flower cheers up anyone who stops beside it.
      if (t.bloomed) for (const d of this.dots) if (!d.asleep && d.state === 'idle' && dist(d, t) < 50) cheer(d, dt * 0.08);
    }
  }

  /** Balls roll, slow down, bounce off the shoreline, and get kicked by anyone hopping past. */
  private rollBall(t: Toy, dt: number): void {
    for (const d of this.dots) {
      if (d.asleep || d.state !== 'walk' || dist(d, t) > 14 || Math.hypot(t.vx, t.vy) > 40) continue;
      const a = Math.atan2(d.ty - d.y, d.tx - d.x) + rand(-0.5, 0.5), v = rand(110, 170);
      t.vx = Math.cos(a) * v;
      t.vy = Math.sin(a) * v;
      cheer(d, 0.1);
    }
    const nx = t.x + t.vx * dt, ny = t.y + t.vy * dt;
    if (isLand(nx, ny)) { t.x = nx; t.y = ny; }
    else { t.vx *= -0.6; t.vy *= -0.6; }
    const k = Math.exp(-1.4 * dt);
    t.vx *= k;
    t.vy *= k;
  }

  // ---------- Choices ----------

  /** Your dot in the town: arriving for the first time, and finding venues. */
  private inTown(): void {
    const { pip, town } = this;
    if (!this.townVisited && pip.y < town.causeway.north.y - 10) {
      this.townVisited = true;
      this.write(TOWN_ARRIVE);
      this.hooks.change();
    }
    for (const v of town.venues) {
      if (v.found || dist(v, pip) > 50) continue;
      v.found = true;
      v.pulse = 1;
      this.write(VENUE_FIRST[v.kind], v.id);
      cheer(pip, 0.3);
      this.hooks.change();
      break;
    }
  }

  /** Sets off for a target, going by the streets in town and over the causeway between town and island. */
  travel(d: Dot, t: Target): void {
    const { town } = this, { south, north } = town.causeway;
    const onCauseway = Math.abs(d.x - south.x) < 14 && d.y < south.y && d.y > north.y;
    const from = town.contains(d), to = town.contains(t);
    let pts: Point[];
    if (from && to) pts = town.route(d, t);
    else if (!from && to) pts = [...(onCauseway ? [] : [south]), north, ...town.route(town.gate, t)];
    else if (from && !to) pts = [...town.route(d, town.gate), north, south, t];
    else pts = onCauseway ? [south, t] : [t];
    d.target = t;
    walkTo(d, pts.shift()!);
    d.route = pts;
  }

  holds(d: Dot, kind: ToyKind): boolean {
    return d.holding !== undefined && this.toys.find((t) => t.id === d.holding)?.kind === kind;
  }

  /** In the rain, anyone without an umbrella stays where they are once they've found cover. */
  stayingDry(d: Dot): boolean {
    return this.rain > 0 && !this.holds(d, 'umbrella');
  }

  /** The nearest found place with some cover that your dot can walk to. In town, any venue will do. */
  private shelterFor(d: Dot): (Point & { id: string }) | null {
    if (this.town.contains(d)) return this.town.venues.slice().sort((a, b) => dist(d, a) - dist(d, b))[0];
    let best: Place | null = null, bd = 450;
    for (const p of [this.home, ...this.places]) {
      if (!p.found || !SHELTERS.has(p.type)) continue;
      const k = dist(d, p);
      if (k < bd && clearPath(d, p)) { bd = k; best = p; }
    }
    return best;
  }

  private write(text: string, place: string | null = null): void {
    this.journal.write(this.day, text, place);
  }

  private nearestFound(p: Point): Place {
    let best = this.home, bd = 1e9;
    for (const q of this.places) {
      if (!q.found) continue;
      const d = dist(p, q);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }

  /** A new toy it can reach comes first, then home in the evening, then an old haunt or somewhere it hasn't seen. */
  private chooseTarget(d: Dot): Target {
    const { home } = this;
    const toy = this.toys
      .filter((t) => !t.holder && !t.seen && dist(d, t) < 520 && clearPath(d, t))
      .sort((a, b) => dist(d, a) - dist(d, b))[0];
    if (toy) return { x: toy.x, y: toy.y, toy: toy.id };
    if (this.tod > 0.66) return { x: home.x, y: home.y + 14, home: true };
    const { town } = this;
    if (town.open && town.contains(d)) {
      // In town: somewhere new first, then favourite haunts, and now and then back to the island.
      const fresh = town.venues.filter((v) => !v.found).sort((a, b) => dist(d, a) - dist(d, b))[0];
      if (fresh && R() < 0.7) return { x: fresh.x, y: fresh.y, venue: fresh.id };
      if (R() < 0.15) return { x: home.x + rand(-40, 40), y: home.y + rand(-20, 40) };
      const v = pick(town.venues);
      return { x: v.x, y: v.y, venue: v.id };
    }
    if (town.open && this.tod < 0.45 && (!this.townVisited || R() < 0.3)) return { x: town.square.x + rand(-20, 20), y: town.square.y + 30 };
    const known = this.places.filter((p) => p.found && dist(p, d) > 40 && clearPath(d, p));
    if (known.length && R() < 0.3) { const p = pick(known); return { x: p.x, y: p.y + 16, place: p }; }
    let best: Point | null = null, bs = -1e9;
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 6.283), r = rand(90, 300), c = { x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r };
      if (!isLand(c.x, c.y) || dist(c, home) > this.range || !clearPath(d, c)) continue;
      const score = (this.fog.isSeen(c.x, c.y) ? 0 : 200) + r * 0.2 + R() * 60;
      if (score > bs) { bs = score; best = c; }
    }
    return best || { x: home.x + rand(-40, 40), y: home.y + rand(-20, 40) };
  }

  /** Neighbours go for the toy they love, kick balls about, tag along with friends, or potter near home. */
  private neighbourTarget(o: Dot): Target {
    const { pip } = this, base = o.base!, traits = CAST[o.character!];
    const near = (t: Toy) => !t.holder && dist(o, t) < 400 && clearPath(o, t);
    const wanted = !o.holding && this.toys.find((t) => t.kind === traits.wants && near(t));
    if (wanted) return { x: wanted.x, y: wanted.y, toy: wanted.id };
    const ball = R() < 0.25 && this.toys.find((t) => t.kind === 'ball' && near(t));
    if (ball) return { x: ball.x, y: ball.y };
    if (o.stage! >= 5 && R() < 0.5 && !pip.asleep) return { x: pip.tx + rand(-24, 24), y: pip.ty + rand(-10, 24) };
    if (R() < traits.curious) return { x: pip.x + rand(-110, 110), y: pip.y + rand(-90, 90) };
    return { x: base.x + rand(-200, 200) * traits.roam, y: base.y + rand(-160, 160) * traits.roam };
  }

  private arrive(d: Dot, t: Target | undefined): void {
    if (t?.toy !== undefined) { this.useToy(d, t.toy); d.wait = 2.2; return; }
    if (t?.venue) { this.spend(d, this.town.venues.find((v) => v.id === t.venue)!); d.wait = rand(3, 6); return; }
    if (t?.place) {
      const p = t.place;
      p.visits++;
      const lines = AGAIN[p.type];
      if (lines && p.visits >= 2 && p.visits - 2 < lines.length && p.lastDay !== this.day) this.write(lines[p.visits - 2], p.id);
      p.lastDay = this.day;
      d.wait = 2.6;
      return;
    }
    d.wait = rand(0.6, 1.8);
  }

  /** Your dot treats itself at a venue, if it can afford to. */
  private spend(d: Dot, v: Venue): void {
    if (d.coins! < v.cost) { if (R() < 0.5) this.write(BROKE, v.id); cheer(d, -0.1); return; }
    d.coins! -= v.cost;
    v.visits++;
    cheer(d, 0.25);
    if (v.visits === 1 || R() < 0.3) this.write(pick(spent(v.cost)), v.id);
    this.hooks.change();
  }

  /** What a dot does when it reaches a toy: eat it, kick it, pick it up, or admire it. */
  useToy(d: Dot, id: number): void {
    const toy = this.toys.find((t) => t.id === id);
    if (!toy || toy.holder || dist(d, toy) > 20) return;
    if (toy.kind === 'ball') {
      const a = d.face === 1 ? rand(-0.6, 0.6) : Math.PI + rand(-0.6, 0.6);
      toy.vx = Math.cos(a) * 150;
      toy.vy = Math.sin(a) * 150;
    }
    if (CARRIED.includes(toy.kind) && (d.isPip || toy.kind === CAST[d.character!].wants)) {
      if (d.holding !== undefined) this.drop(d);
      toy.holder = d.id;
      d.holding = toy.id;
    }
    if (!d.isPip) { cheer(d, 0.3); return; }

    toy.seen = true;
    const first = !this.seenKinds.has(toy.kind);
    this.seenKinds.add(toy.kind);
    if (toy.kind === 'berry') {
      this.toys.splice(this.toys.indexOf(toy), 1);
      this.write(GIFT[Math.min(this.gifts++, GIFT.length - 1)]);
      cheer(d, 0.5);
      return;
    }
    cheer(d, 0.35);
    if (first) this.write(TOY_FIRST[toy.kind], toy.kind === 'flower' ? this.nearestFound(toy).id : null);
    else if (R() < 0.25) this.write(pick(TOY_AGAIN));
  }

  private drop(d: Dot): void {
    const t = this.toys.find((k) => k.id === d.holding);
    d.holding = undefined;
    if (!t) return;
    t.holder = null;
    t.x = d.x + 10;
    t.y = d.y + 4;
  }

  private discover(p: Place): void {
    p.found = true;
    p.visits = 1;
    p.lastDay = this.day;
    p.pulse = 1;
    this.newToday++;
    this.write(FIRST[p.type]!, p.id);
    cheer(this.pip, 0.35);
    const { pip } = this;
    pip.target = { x: p.x, y: p.y + 16, look: true };
    pip.route = undefined;
    walkTo(pip, pip.target);
    this.hooks.change();
  }

  private meet(o: Dot): void {
    const { pip } = this, traits = CAST[o.character!];
    o.stage = o.stage! + 1;
    o.metDay = this.day;
    this.metToday++;
    if (o.stage === 3) {
      o.known = true;
      this.journal.writeAbout(this.day, NAMED, o.id);
    } else {
      const line = o.stage < MEET.length ? MEET[o.stage]! : pick([...FRIEND, ...traits.lines]);
      this.journal.writeAbout(this.day, line, o.id, this.nearestFound(pip).id);
    }
    pip.wait = o.wait = 2.4;
    pip.state = o.state = 'idle';
    pip.face = o.x > pip.x ? 1 : -1;
    o.face = pip.face === 1 ? -1 : 1;
    this.ripples.push({ x: (pip.x + o.x) / 2, y: (pip.y + o.y) / 2, t: 0 });
    const warmth = o.stage >= 5 ? 0.25 : 0.1;
    cheer(pip, warmth);
    cheer(o, warmth);
    // Once they know each other, a neighbour may help themselves to the toy they love.
    if (o.stage >= 3 && o.holding === undefined && this.holds(pip, traits.wants) && R() < 0.6) {
      const toy = this.toys.find((t) => t.id === pip.holding)!;
      pip.holding = undefined;
      toy.holder = o.id;
      o.holding = toy.id;
      this.journal.writeAbout(this.day, TOOK[toy.kind], o.id);
      cheer(o, 0.4);
    }
  }

  /**
   * A dot says the word for `concept`. Your dot only learns it if it is near
   * enough to hear, and can only say the words it has learnt.
   */
  say(d: Dot, concept: Concept, mark?: Mark): void {
    const { words, pip } = this;
    if (d.isPip && !words.knows(concept)) { d.speech = { text: '…?', t: 1.4 }; return; }
    const heard = !d.isPip && !pip.asleep && dist(d, pip) < 170;
    const { word, learnt } = heard ? words.hear(concept) : { word: words.word(concept), learnt: false };
    d.speech = { text: shout(word, mark), t: 1.6, gloss: words.knows(concept) ? words.gloss(concept) : undefined };
    this.hooks.said(d, d.speech.text);
    if (learnt) this.write(learntWord(word, words.meaning(concept)));
    if (heard) this.hooks.words();
  }

  whistle(d: Dot): void {
    this.hooks.sound(d, 'whistle');
  }

  journalLine(text: string): void {
    this.write(text);
  }

  /** A neighbour near your dot says something, in their own words. What they say depends on what is going on. */
  private chatter(o: Dot): void {
    o.chat = rand(5, 9);
    // Once they know each other, a proper chat now and then. Your dot joins in with whatever words it knows.
    if (o.stage! >= 3 && o.greetedDay === this.day && R() < 0.35 && this.chats.start(o, this.pip)) return;
    const near = this.nearestFound(o);
    const toyNear = (kind: ToyKind, r: number) => this.toys.some((t) => t.kind === kind && !t.holder && dist(o, t) < r && (kind !== 'flower' || t.bloomed));
    let concept: Concept;
    if (o.greetedDay !== this.day) { concept = 'hello'; o.greetedDay = this.day; }
    else if (this.rain > 0) concept = 'rain';
    else if (this.holds(o, 'hat') && R() < 0.5) concept = 'hat';
    else if (toyNear('ball', 100)) concept = 'ball';
    else if (toyNear('flower', 120)) concept = 'flower';
    else if (this.toys.some((t) => !t.holder && !t.seen) && R() < 0.6) concept = 'gift';
    else if (this.tod > 0.6) concept = 'night';
    else if (o.stage! >= 7 && R() < 0.3) concept = 'oldones';
    else if (dist(o, near) < 140 && (near.type === 'berries' || near.type === 'pond' || near.type === 'stones')) concept = near.type === 'berries' ? 'berry' : near.type;
    else concept = o.stage! >= 5 ? 'friend' : 'hello';
    this.say(o, concept);
  }

  private eveningNote(): void {
    if (this.day === 1) return;
    if (this.newToday === 0 && this.metToday === 0 && R() < 0.7) this.write(QUIET_DAY);
    else if (this.newToday >= 2) this.write(busyDay(this.newToday));
  }

  private newDay(): void {
    this.newToday = 0;
    this.metToday = 0;
    this.wroteEvening = false;
    this.dreamtTonight = false;
    this.pokesToday = 0;
    this.wrotePoke = false;
    const { pip, home } = this;
    if (this.day === 2 && !pip.named) { pip.named = true; pip.name = 'Pip'; this.write(NAMED_PIP); }
    if (this.day === 3 && home.level === 0) { home.level = 1; home.pulse = 1; this.write(ROOF, 'home'); }
    if (this.day === 5) this.write(ODD);
    this.life.newDay();
    // Once most of the island is found, a way north appears.
    const { town } = this;
    if (!town.open && this.day >= 4 && this.places.filter((p) => p.found).length >= 7) {
      town.open = true;
      town.causewaySpot.pulse = 1;
      // Pip can see it from the shore, all the way across.
      for (let y = town.causeway.south.y; y > town.causeway.north.y - 40; y -= 30) { this.fog.reveal(town.causeway.south.x, y, 70); this.fog.markSeen(town.causeway.south.x, y); }
      this.write(this.others.find((o) => o.id === 'odo')?.known ? CAUSEWAY_ODO : CAUSEWAY, 'causeway');
      this.hooks.causeway();
    }
    this.hooks.change();
  }
}

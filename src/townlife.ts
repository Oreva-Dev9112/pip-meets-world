import { CAST, CHARACTERS, type Character, type VenueKind } from './cast';
import { cheer, makeDot, moveDot, walkTo, type Dot } from './dots';
import { clearPath } from './island';
import { dist, pick, seeded } from './random';
import type { Story } from './story';
import type { Town, Venue } from './town';

// The townsfolk: the rest of the cast, living their own lives in the town in the north.

const R = seeded(9112);
const rand = (a: number, b: number) => a + R() * (b - a);

const SYL_A = ['Bo', 'Zu', 'Ti', 'Mo', 'Lu', 'Ka', 'Nu', 'Fi', 'Do', 'Wre', 'Ta', 'Bi', 'Ju', 'Ne', 'Ro', 'Sa', 'Gu', 'Ha', 'Pe'];
const SYL_B = ['p', 'ri', 'ki', 'mo', 'lo', 'na', 'zzy', 'bs', 'x', 'do', 'm', 'n', 'lli', 'sh', 'ko', 'tt'];

/** Which venues meet which need. */
const FOR: Record<'hunger' | 'social' | 'bored', VenueKind[]> = { hunger: ['cafe', 'bakery', 'market'], social: ['pub', 'cafe'], bored: ['theatre', 'books', 'records', 'market'] };

/** Fourteen townsfolk: one of each new character first, then a mix of everyone. */
export function makeTownsfolk(town: Town): Dot[] {
  const used = new Set(['Odo', 'Bim', 'Pip']);
  const types: Character[] = ['schemer', 'romantic', 'oldtimer', 'chaos', 'foodie'];
  // Then a mix of everyone, so no one character crowds the streets.
  const start = (R() * CHARACTERS.length) | 0;
  for (let i = 0; types.length < 14; i++) types.push(CHARACTERS[(start + i) % CHARACTERS.length]);
  return types.map((character, i) => {
    let name: string;
    do name = pick(SYL_A) + pick(SYL_B);
    while (used.has(name));
    used.add(name);
    const t = CAST[character], home = town.houses[(i * 5 + 3) % town.houses.length];
    const roll = R();
    const coins = Math.round(roll < 0.45 ? rand(4, 18) : roll < 0.8 ? rand(20, 75) : roll < 0.95 ? rand(80, 190) : rand(200, 300));
    return makeDot({
      id: 't' + i, name, label: 'someone', colour: t.colour, character, x: home.x, y: home.y, base: home, known: false,
      mood: t.mood, calm: t.mood, coins, chat: rand(0, 6), needs: { hunger: R(), social: R(), bored: R() }, diary: [], met: {},
    });
  });
}

/** Shorter lines for meeting another of a character your dot already knows. @D is their name. */
const MET_AGAIN = ['Met @D. Another one of those. I am starting to see a pattern.', 'Said hello to @D. @D said hello back. That is how it starts.', 'Met @D, who seemed busy. Everyone here seems busy.'];

export class TownLife {
  /** Characters your dot has met one of, so it only writes at length about the first. */
  private readonly metKinds = new Set<Character>();
  private writtenToday = { day: 0, n: 0 };

  constructor(private readonly story: Story, private readonly town: Town, readonly folk: Dot[]) {}

  update(dt: number): void {
    const { story } = this, tod = story.tod, night = tod >= 0.8 || tod < 0.03, late = tod >= 0.93 || tod < 0.03;
    for (const d of this.folk) {
      const t = CAST[d.character!], n = d.needs!;
      n.hunger = Math.min(1, n.hunger + (dt / 44) * (d.character === 'foodie' ? 1.4 : 0.9));
      n.social = Math.min(1, n.social + (dt / 44) * (d.character === 'romantic' ? 1.3 : 0.7));
      n.bored = Math.min(1, n.bored + (dt / 44) * (d.character === 'chaos' ? 1.6 : 0.8));
      if (d.asleep) { if (!night) { d.asleep = false; d.wait = rand(0.5, 3); } continue; }

      const out = night && t.nightOwl && !late;
      if (night && !out) {
        // Bedtime: home along the streets, then sleep.
        if (dist(d, d.base!) < 8 && d.state === 'idle') { d.asleep = true; d.route = undefined; continue; }
        if (!d.goingHome) { d.goingHome = true; d.speed = 50 * t.speed; story.travel(d, { x: d.base!.x, y: d.base!.y }); }
      } else if (d.goingHome && !night) d.goingHome = false;

      if (d.state === 'idle') {
        d.wait -= dt;
        if (d.wait <= 0 && !d.goingHome && !story.stayingDry(d)) this.choose(d, out);
      } else if (moveDot(d, dt, story.trail)) {
        if (d.route?.length) walkTo(d, d.route.shift()!);
        else this.arrive(d);
      }
      if (d.state !== 'walk') moveDot(d, dt, story.trail);
      this.meetings(d);
    }
  }

  /** Called at dawn: wages, rent, and the odd windfall or scheme. */
  newDay(): void {
    for (const d of this.folk) {
      const t = CAST[d.character!];
      // A day's odd jobs, less the cost of living.
      d.coins = Math.max(0, d.coins! + 3 + ((R() * 7) | 0));
      if (d.character === 'schemer' && R() < 0.35) {
        const n = Math.round(rand(5, 25));
        if (R() < 0.5) { d.coins += n; this.diary(d, t.voice.rich.replaceAll('{C}', String(n))); }
        else { d.coins = Math.max(0, d.coins - n); this.diary(d, t.voice.poor.replaceAll('{C}', String(n))); }
      } else if (R() < 0.05) {
        const n = Math.round(rand(10, 30));
        d.coins += n;
        this.diary(d, t.voice.rich.replaceAll('{C}', String(n)));
      } else if (d.coins < 3 && R() < 0.5) this.diary(d, t.voice.poor.replaceAll('{C}', String(d.coins)));
    }
  }

  diary(d: Dot, text: string): void {
    const { story } = this;
    d.diary!.push({ day: story.day, when: story.partOfDay, text });
    if (d.diary!.length > 80) d.diary!.shift();
    story.diaryChanged(d);
  }

  /** What to do next: a loved toy, a whim, or whatever they need most. */
  private choose(d: Dot, out: boolean): void {
    const { story, town } = this, t = CAST[d.character!], n = d.needs!;
    d.speed = 40 * t.speed;
    if (out) { this.goTo(d, this.venue('pub')); return; }
    const toy = d.holding === undefined && story.toys.find((k) => k.kind === t.wants && !k.holder && dist(d, k) < 260 && clearPath(d, k));
    if (toy) { d.target = { x: toy.x, y: toy.y, toy: toy.id }; story.travel(d, d.target); return; }
    if (R() < t.whim) {
      if (R() < 0.35) this.diary(d, pick(t.voice.whim));
      const p = R() < 0.5 ? town.square : pick(town.nodes);
      d.target = { x: p.x + rand(-20, 20), y: p.y + rand(-20, 20) };
      story.travel(d, d.target);
      return;
    }
    const need = (Object.keys(n) as (keyof typeof n)[]).sort((a, b) => n[b] - n[a])[0];
    if (n[need] < 0.35) {
      // Nothing pressing: potter about the streets, or go and look at the fountain.
      const p = R() < 0.4 ? town.square : pick(town.nodes);
      d.target = { x: p.x + rand(-25, 25), y: p.y + rand(-25, 25) };
      story.travel(d, d.target);
      return;
    }
    const options = FOR[need], loved = options.filter((k) => t.likes.includes(k));
    this.goTo(d, this.venue(loved.length && R() < 0.75 ? pick(loved) : pick(options)));
  }

  private venue(kind: VenueKind): Venue {
    return this.town.venues.find((v) => v.kind === kind) ?? this.town.venues[0];
  }

  private goTo(d: Dot, v: Venue): void {
    if (dist(d, v) < 6) { d.wait = rand(2, 5); return; }
    d.target = { x: v.x, y: v.y, venue: v.id };
    this.story.travel(d, d.target);
  }

  private arrive(d: Dot): void {
    const tgt = d.target;
    d.target = undefined;
    d.wait = rand(1.5, 4);
    if (tgt?.toy !== undefined) { this.story.useToy(d, tgt.toy); return; }
    if (!tgt?.venue) return;
    const v = this.town.venues.find((k) => k.id === tgt.venue)!, t = CAST[d.character!], n = d.needs!;
    d.wait = rand(4, 9);
    if (d.coins! < v.cost) {
      cheer(d, -0.15);
      if (R() < 0.6) this.diary(d, pick(t.voice.broke).replaceAll('{V}', v.name));
      if (dist(d, this.story.pip) < 120) this.story.say(d, 'coins');
      return;
    }
    d.coins! -= v.cost;
    if (FOR.hunger.includes(v.kind)) n.hunger = v.kind === 'market' ? n.hunger * 0.5 : 0;
    if (FOR.social.includes(v.kind)) n.social = v.kind === 'cafe' ? n.social * 0.5 : 0;
    if (FOR.bored.includes(v.kind)) n.bored = v.kind === 'market' ? n.bored * 0.5 : 0;
    cheer(d, t.likes.includes(v.kind) ? 0.3 : 0.15);
    if (R() < 0.5) this.diary(d, pick(t.voice.visit).replaceAll('{V}', v.name));
    if (FOR.hunger.includes(v.kind) && dist(d, this.story.pip) < 120) this.story.say(d, 'food');
  }

  /** Bumping into each other, and into your dot. */
  private meetings(d: Dot): void {
    const { story } = this, pip = story.pip, t = CAST[d.character!], day = story.day;
    if (!pip.asleep && dist(d, pip) < 26) {
      if (!d.metPip) {
        d.metPip = true;
        d.known = true;
        // A few meetings a day make it into the journal; the rest your dot just remembers.
        if (this.writtenToday.day !== day) this.writtenToday = { day, n: 0 };
        if (this.writtenToday.n++ < 3) story.writeAbout(this.metKinds.has(d.character!) ? pick(MET_AGAIN) : t.met, d.id);
        this.metKinds.add(d.character!);
        this.diary(d, t.voice.pip);
        cheer(d, 0.2);
        cheer(pip, 0.15);
        if (!story.chats.start(d, pip)) story.say(d, 'hello');
      } else if ((d.chat = d.chat! - 0.016) <= 0) {
        d.chat = rand(6, 12);
        if (R() < 0.4 && story.chats.start(d, pip)) return;
        story.say(d, R() < 0.5 ? 'hello' : 'friend');
      }
    }
    for (const o of this.folk) {
      if (o === d || o.asleep || dist(d, o) > 18 || d.met![o.id] === day) continue;
      d.met![o.id] = o.met![d.id] = day;
      d.needs!.social = o.needs!.social = 0;
      cheer(d, 0.1);
      cheer(o, 0.1);
      if (R() < 0.5) this.diary(d, pick(t.voice.meet).replaceAll('{N}', o.name));
      // They stop for a chat. You only hear it if you're looking.
      story.chats.start(d, o);
    }
  }
}

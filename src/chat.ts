import { cheer, type Dot } from './dots';
import { R, pick, rand } from './random';
import type { Story } from './story';
import type { Concept, Mark } from './words';

// Two dots talking: they stop, face each other and take turns, a word at a time.
// Sometimes it is about you.

interface Line {
  /** 0 started the chat, 1 is the other one. */
  who: 0 | 1;
  say?: Concept;
  mark?: Mark;
  /** Both look up at you, or both suddenly act very normal. */
  act?: 'lookup' | 'casual';
}

interface Chat {
  a: Dot;
  b: Dot;
  lines: Line[];
  /** Seconds until the next line. */
  t: number;
}

export type Topic = 'watcher';

export class Chats {
  private list: Chat[] = [];
  /** When each dot last finished a chat, so nobody talks all day. */
  private readonly last = new Map<Dot, number>();
  private clock = 0;

  constructor(private readonly story: Story) {}

  busy(d: Dot): boolean {
    return this.list.some((c) => c.a === d || c.b === d);
  }

  /** Starts a chat between two dots, unless either is busy, asleep or already chatting. */
  start(a: Dot, b: Dot, topic?: Topic): boolean {
    if (a === b || a.asleep || b.asleep || this.busy(a) || this.busy(b) || a.react || b.react) return false;
    // A rest between chats, unless it's about you. And no huddles: one chat per patch of street.
    const rested = (d: Dot) => d.isPip || this.clock - (this.last.get(d) ?? -99) > 20;
    if (topic !== 'watcher' && (!rested(a) || !rested(b))) return false;
    if (this.list.some((c) => Math.hypot(c.a.x - a.x, c.a.y - a.y) < 45)) return false;
    this.list.push({ a, b, lines: this.script(a, b, topic), t: 0.2 });
    return true;
  }

  update(dt: number): void {
    this.clock += dt;
    for (const c of this.list) {
      const { a, b } = c;
      // Stand still and face each other until it's over.
      a.hold = Math.max(a.hold ?? 0, 0.3);
      b.hold = Math.max(b.hold ?? 0, 0.3);
      a.face = b.x > a.x ? 1 : -1;
      b.face = a.x > b.x ? 1 : -1;
      if ((c.t -= dt) > 0) continue;
      const line = c.lines.shift();
      if (!line) continue;
      const who = line.who ? b : a;
      if (line.say) this.story.say(who, line.say, line.mark);
      if (line.act === 'lookup') for (const d of [a, b]) d.glance = 1.4;
      if (line.act === 'casual') for (const d of [a, b]) this.story.watching.actNormal(d);
      const quick = who.character === 'chaos' ? 0.6 : who.character === 'oldtimer' ? 1.4 : 1;
      c.t = line.act === 'lookup' ? 1.5 : rand(0.85, 1.25) * quick;
    }
    for (const c of this.list) {
      if (c.lines.length || c.t > 0) continue;
      cheer(c.a, 0.08); cheer(c.b, 0.08);
      this.last.set(c.a, this.clock).set(c.b, this.clock);
    }
    this.list = this.list.filter((c) => c.lines.length || c.t > 0);
  }

  /** What they talk about: a hello, then something that's going on, or something on their mind. */
  private script(a: Dot, b: Dot, topic?: Topic): Line[] {
    const s = this.story, L: Line[] = [];
    const say = (who: 0 | 1, concept: Concept, mark?: Mark) => L.push({ who, say: concept, mark });
    if (topic !== 'watcher' || R() < 0.3) { say(0, 'hello', '!'); say(1, 'hello'); }

    const options: (() => void)[] = [];
    const want = (n: number, f: () => void) => { for (let i = 0; i < n; i++) options.push(f); };
    // Whispering about you, then both suddenly very interested in the ground.
    const gossip = () => {
      say(0, 'look', '…');
      L.push({ who: 0, act: 'lookup' });
      say(0, 'watcher', '…');
      say(1, 'what', '?');
      say(0, 'shh', '!');
      L.push({ who: 1, act: 'casual' });
    };
    if (topic === 'watcher') want(1, gossip);
    else {
      const ca = a.character, used = Math.min(a.used ?? 0, b.used ?? 0);
      if ((a.used ?? 0) > 0.1 && used < 0.6) want(2, gossip);
      if (s.rain > 0) want(4, () => { say(0, 'rain', '!'); say(1, 'rain', '!'); });
      if (s.tod > 0.62) want(3, () => { say(0, 'night'); say(1, 'tired'); say(0, 'yes'); });
      if (a.needs && a.needs.hunger > 0.5) want(3, () => { say(0, 'food', '?'); say(1, b.needs && b.needs.hunger > 0.4 ? 'yes' : 'no', '!'); });
      if (a.coins !== undefined && a.coins < 4) want(3, () => { say(0, 'coins', '…'); say(1, 'no', '…'); });
      if (ca === 'schemer') want(3, () => { say(0, 'plan', '…'); say(1, 'what', '?'); say(0, 'shh', '!'); });
      if (ca === 'romantic') want(3, () => { say(0, 'love', '…'); say(1, 'what', '?'); say(0, 'love', '!'); });
      if (ca === 'oldtimer' || ca === 'worrier') want(2, () => { say(0, 'oldones', '…'); say(1, 'what', '?'); say(0, 'oldones'); say(1, 'tired'); });
      if (ca === 'chaos') want(3, () => { say(0, 'ball', '!'); say(1, 'no', '!'); say(0, 'ball', '!'); });
      if (ca === 'diva') want(2, () => { say(0, 'hat', '!'); say(1, 'yes', '…'); });
      if (ca === 'foodie') want(3, () => { say(0, 'food', '!'); say(1, 'food', '?'); say(0, 'yes', '!'); });
      want(2, () => { say(0, 'friend', '?'); say(1, R() < 0.75 ? 'friend' : 'what', R() < 0.75 ? '!' : '?'); });
    }
    if (options.length) pick(options)();
    // Sometimes it ends with a goodbye, or rather another hello.
    if (R() < 0.4 && topic !== 'watcher') say(1, 'hello');
    return L;
  }
}

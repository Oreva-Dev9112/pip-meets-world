import { CAST, type Character } from './cast';
import { cheer, type Dot, type Reaction } from './dots';
import { GOSSIP, WATCHED_OTHER, WATCHED_PIP } from './lines';
import { R, dist, rand, type Point } from './random';
import type { Story } from './story';

// Being watched. Zoom in on a dot, keep it in the middle of the view, or rest
// your mouse near it, and it starts to feel it. It stops, looks straight out of
// the screen at you, does something about it, then carries on, very casually.

/** How quickly each kind notices you. The Old-Timer barely does, or says so. */
const SENSE: Record<Character | 'pip', number> = { pip: 0.7, worrier: 1.7, diva: 1.4, schemer: 1.2, romantic: 1.1, oldtimer: 0.3, chaos: 1.3, foodie: 0.8 };

/** What each kind does once it has noticed you, before it gets used to you. */
const REACTION: Record<Character | 'pip', Reaction> = { pip: 'smile', worrier: 'cower', diva: 'twirl', schemer: 'squint', romantic: 'blush', oldtimer: 'stare', chaos: 'bounce', foodie: 'stare' };

/** How fast each kind gets used to you, per time it notices. The Worrier takes longest. */
const SETTLE: Record<Character | 'pip', number> = { pip: 0.12, worrier: 0.05, diva: 0.1, schemer: 0.07, romantic: 0.09, oldtimer: 0.06, chaos: 0.12, foodie: 0.09 };

const kindOf = (d: Dot): Character | 'pip' => (d.isPip ? 'pip' : d.character ?? 'foodie');

/** 0 while spooked, 1 getting used to it, 2 waving. */
const stageOf = (d: Dot): number => ((d.used ?? 0) < 0.3 ? 0 : (d.used ?? 0) < 0.65 ? 1 : 2);

export class Watching {
  /** What has made it into a journal already, so each moment is only written once. */
  private readonly written = new Set<string>();
  private wroteToday = { day: 0, n: 0 };

  constructor(private readonly story: Story) {}

  /** `attention` says how closely you are watching each dot, from 0 to 1. */
  update(dt: number, attention: (d: Dot) => number): void {
    const { story } = this;
    for (const d of story.dots) {
      if (d.glance) d.glance = Math.max(0, d.glance - dt);
      if (d.noticeCool) d.noticeCool = Math.max(0, d.noticeCool - dt);
      if (d.stiff) {
        d.stiff = Math.max(0, d.stiff - dt);
        // A quick look back, to check you're still there.
        if (d.stiff > 0.5 && R() < dt * 0.6) d.glance = 0.45;
      }
      if (d.react && (d.react.t -= dt) <= 0) this.nextReaction(d);
      const looking = d.react ? d.react.kind !== 'twirl' && d.react.kind !== 'cower' : (d.glance ?? 0) > 0;
      d.gaze = (d.gaze ?? 0) + ((looking ? 1 : 0) - (d.gaze ?? 0)) * Math.min(1, dt * 7);

      if (d.asleep || d.react || story.chats.busy(d) || d.noticeCool) { d.aware = Math.max(0, (d.aware ?? 0) - dt * 0.3); continue; }
      const a = attention(d);
      d.aware = Math.max(0, Math.min(1, (d.aware ?? 0) + dt * (a * a * SENSE[kindOf(d)] * 0.55 - 0.12)));
      if (d.aware >= 1) this.notice(d);
    }
  }

  /** Stiff, careful hops and a whistle, as if nothing happened. */
  actNormal(d: Dot): void {
    if (d.character === 'chaos') return;
    d.stiff = rand(3, 5);
    this.story.whistle(d);
  }

  private notice(d: Dot): void {
    const kind = kindOf(d), stage = stageOf(d);
    d.aware = 0;
    d.noticeCool = rand(10, 18);
    d.used = Math.min(1, (d.used ?? 0) + SETTLE[kind]);
    // Once it's used to you it just waves. The Old-Timer mostly pretends not to have noticed.
    const then: Reaction = stage === 2 && R() < 0.8 ? 'wave' : kind === 'oldtimer' && R() < 0.6 ? 'squint' : REACTION[kind];
    d.react = { kind: 'stare', t: stage === 2 ? rand(0.4, 0.7) : rand(0.9, 1.5), next: then };
    d.hold = d.react.t + (then === 'cower' ? 0 : 2);
    if (stage < 2) d.speech = { text: kind === 'oldtimer' ? '…' : '!', t: 1 };
    cheer(d, then === 'cower' ? -0.15 : 0.1);
    this.write(d, stage);
  }

  private nextReaction(d: Dot): void {
    const r = d.react!;
    if (r.next) {
      d.react = { kind: r.next, t: r.next === 'cower' ? 3.2 : r.next === 'wave' ? 1.6 : 2 };
      if (r.next === 'cower') this.hide(d);
      if (r.next === 'twirl' || r.next === 'bounce' || r.next === 'wave') this.story.say(d, 'hello', '!');
      if (r.next === 'blush') d.speech = { text: '♥', t: 1.5 };
      return;
    }
    const was = r.kind;
    d.react = undefined;
    if (was !== 'wave' && was !== 'smile' && was !== 'bounce') this.actNormal(d);
    // And then tell someone about it.
    if (was === 'wave' || R() > 0.55) return;
    const other = this.story.dots.find((o) => o !== d && !o.asleep && dist(o, d) < 80);
    if (other && this.story.chats.start(d, other, 'watcher') && !this.story.pip.asleep && dist(d, this.story.pip) < 160 && d !== this.story.pip && !this.written.has('gossip')) {
      this.written.add('gossip');
      this.story.writeAbout(GOSSIP, d.id);
    }
  }

  /** The Worrier hides behind the nearest house or tree. */
  private hide(d: Dot): void {
    const { story } = this;
    const cover: Point[] = [...story.town.houses, ...story.places.filter((p) => p.type === 'oak' || p.type === 'tower'), story.home];
    const near = cover.filter((p) => dist(p, d) < 160).sort((a, b) => dist(a, d) - dist(b, d))[0];
    if (!near) return;
    d.hold = 0;
    d.speed *= 1.8;
    story.travel(d, { x: near.x + rand(-6, 6), y: near.y - 10 });
  }

  /** A line in its diary, and now and then one in your dot's journal. */
  private write(d: Dot, stage: number): void {
    const { story } = this, day = story.day;
    if (d.diary && d.character && !this.written.has(`${d.id}:${day}`)) {
      this.written.add(`${d.id}:${day}`);
      story.life.diary(d, CAST[d.character].voice.watched[stage]);
    }
    if (story.pip.asleep) return;
    if (this.wroteToday.day !== day) this.wroteToday = { day, n: 0 };
    if (this.wroteToday.n >= 2) return;
    const key = d.isPip ? `pip:${stage}` : `other:${d.id}:${stage}`;
    if (this.written.has(key)) return;
    if (d.isPip) story.journalLine(WATCHED_PIP[stage]);
    else if (d.known && dist(d, story.pip) < 200) story.writeAbout(WATCHED_OTHER[stage], d.id);
    else return;
    this.written.add(key);
    this.wroteToday.n++;
  }
}

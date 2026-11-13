import type { Character } from './cast';
import { SYLLABLES } from './words';

// The dots' voices. They sing their made-up words like a little music box:
// each syllable is a plucked note that rings out, so every word is a tiny
// tune, and the same word always has the same tune. Everyone sings in the
// same key, just higher or lower, so any two dots sound lovely together.
// Happy dots sing in a major key, sad ones in a minor one.

interface Tone {
  /** The bottom of its range, in semitones from A4. All are Cs, so everyone is in the same key. */
  root: number;
  /** Seconds per note. */
  beat: number;
  /** How long each note rings on, in seconds. */
  ring: number;
  /** How much the note wavers, in semitones. */
  vibrato: number;
  /** Slides into each note (1) or plinks straight onto it (0). */
  glide: number;
  /** How much bright "tink" there is at the start of each note. */
  bell: number;
}

const TONES: Record<Character | 'pip', Tone> = {
  pip: { root: 15, beat: 0.14, ring: 0.6, vibrato: 0.1, glide: 0.1, bell: 0.5 },
  worrier: { root: 3, beat: 0.11, ring: 0.35, vibrato: 0.35, glide: 0, bell: 0.4 },
  diva: { root: 15, beat: 0.2, ring: 0.9, vibrato: 0.3, glide: 0.8, bell: 0.7 },
  schemer: { root: -9, beat: 0.17, ring: 0.5, vibrato: 0, glide: 0.4, bell: 0.15 },
  romantic: { root: 3, beat: 0.24, ring: 1.1, vibrato: 0.25, glide: 0.6, bell: 0.25 },
  oldtimer: { root: -21, beat: 0.26, ring: 0.8, vibrato: 0.15, glide: 0.3, bell: 0.1 },
  chaos: { root: 15, beat: 0.09, ring: 0.25, vibrato: 0, glide: 0, bell: 0.9 },
  foodie: { root: -9, beat: 0.16, ring: 0.6, vibrato: 0.1, glide: 0.2, bell: 0.3 },
};

/** Pentatonic scales, so every tune sounds sweet. */
const MAJOR = [0, 2, 4, 7, 9, 12, 14, 16, 19];
const MINOR = [0, 3, 5, 7, 10, 12, 15, 17, 19];

/** A small number from a string, the same every time. */
const hash = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) / 4294967295;

const hz = (semis: number): number => 440 * 2 ** (semis / 12);

/** Splits a made-up word back into the syllables it was built from, trying each way until one fits. */
function syllables(word: string): string[] {
  if (!word) return [];
  for (const s of SYLLABLES) {
    if (!word.startsWith(s)) continue;
    const rest = syllables(word.slice(s.length));
    if (rest.length || s === word) return [s, ...rest];
  }
  return [];
}

type Who = { id: string; character?: Character; isPip?: boolean; mood: number };

export class Voice {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private busyUntil = 0;
  private talking = 0;
  on = true;

  constructor() {
    try { this.on = localStorage.getItem('pip-sound') !== 'off'; } catch { /* no storage, stay on */ }
    // Browsers only allow sound after you have touched the page.
    const wake = () => this.wake();
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
  }

  toggle(): boolean {
    this.on = !this.on;
    try { localStorage.setItem('pip-sound', this.on ? 'on' : 'off'); } catch { /* fine */ }
    if (this.on) this.wake();
    return this.on;
  }

  private wake(): void {
    if (!this.on) return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      // A gentle limiter so a crowd singing at once stays smooth.
      const limit = ctx.createDynamicsCompressor();
      limit.threshold.value = -14;
      limit.knee.value = 10;
      limit.ratio.value = 6;
      limit.connect(ctx.destination);
      // A soft echo, as if they were singing in a little room.
      const room = ctx.createConvolver(), wet = ctx.createGain(), n = Math.floor(ctx.sampleRate * 1.6);
      const ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
      room.buffer = ir;
      wet.gain.value = 0.28;
      this.out = ctx.createGain();
      this.out.gain.value = 1.1;
      this.out.connect(limit);
      this.out.connect(room).connect(wet).connect(limit);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /**
   * Sings `word` in the voice of `who`. `loud` is 0 to 1, from where they are
   * on screen. The tune comes from the word, the key from their mood, and the
   * ending from the punctuation: up for "?", a leap for "!", trailing off for "…".
   */
  say(word: string, who: Who, loud: number): void {
    const ctx = this.ctx;
    if (!this.on || !ctx || !this.out || ctx.state !== 'running' || loud <= 0.02) return;
    // Three at once is a chorus; more is noise.
    if (ctx.currentTime > this.busyUntil) this.talking = 0;
    if (this.talking >= 3) return;
    this.talking++;

    const tone = TONES[who.isPip ? 'pip' : who.character ?? 'foodie'];
    const scale = who.mood < -0.25 ? MINOR : MAJOR;
    const end = word.slice(-1), parts = syllables(word.toLowerCase().replace(/[^a-z]/g, ''));
    // The tune comes from the syllables: where it starts, then small steps up or down, like a real melody.
    let step = 2 + Math.floor(hash(parts[0] ?? word) * 3), t = ctx.currentTime + 0.03, prev: number | null = null;
    parts.forEach((s, i) => {
      const last = i === parts.length - 1;
      if (i > 0) step += [-2, -1, 1, 1, 2][Math.floor(hash(s + i) * 5)];
      if (last && end === '?') step += 2;
      if (last && end === '!') step = Math.max(step + 1, 5);
      if (last && end === '…') step = 0;
      step = Math.max(0, Math.min(scale.length - 1, step));
      const note = tone.root + scale[step];
      this.note(t, note, prev, tone, loud * (last && end === '…' ? 0.7 : 1), last);
      prev = note;
      // A little swing: the first note short, the last one longest.
      t += tone.beat * (last ? 1.5 : i === 0 && parts.length > 1 ? 0.8 : 1);
    });
    this.busyUntil = Math.max(this.busyUntil, t);
  }

  /** One plucked note, like a music box or a kalimba: a bright tink, then a soft ring that fades. */
  private note(t: number, note: number, prev: number | null, tone: Tone, loud: number, last: boolean): void {
    const ctx = this.ctx!, out = this.out!, f = hz(note), ring = tone.ring * (last ? 1.4 : 1);
    // Slide in from the last note, or a tiny "boop" down onto it.
    const from = prev === null || tone.glide === 0 ? f * 1.025 : hz(prev + (note - prev) * (1 - tone.glide));
    const partial = (k: number, gain: number, decay: number, wobble: boolean) => {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(from * k, t);
      o.frequency.exponentialRampToValueAtTime(f * k, t + 0.04);
      if (wobble && tone.vibrato) {
        const lfo = ctx.createOscillator(), depth = ctx.createGain();
        lfo.frequency.value = 5.5;
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(f * (2 ** (tone.vibrato / 12) - 1), t + decay);
        lfo.connect(depth).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + decay + 0.05);
      }
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(gain * loud, t + 0.006);
      a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(a).connect(out);
      o.start(t);
      o.stop(t + decay + 0.05);
    };
    partial(1, 0.3, ring, true);
    partial(2, 0.09, ring * 0.5, false);
    // The tink: a high, quick overtone that makes it sound like a little bell.
    partial(4.01, 0.06 * tone.bell, 0.09, false);
  }

  /** A casual little whistle: a few notes sliding about, in the same key as everyone's singing. */
  whistle(who: Who, loud: number): void {
    const ctx = this.ctx, out = this.out;
    if (!this.on || !ctx || !out || ctx.state !== 'running' || loud <= 0.02) return;
    const root = Math.max(15, TONES[who.isPip ? 'pip' : who.character ?? 'foodie'].root + 12);
    let t = ctx.currentTime + 0.05;
    for (const step of [0, 2, 1, 3].slice(0, 2 + ((Math.random() * 3) | 0))) {
      const f = hz(root + MAJOR[step + 2]);
      const osc = ctx.createOscillator(), amp = ctx.createGain(), len = 0.16 + Math.random() * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.94, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      // A breathy wobble, like a real whistle.
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = f * 0.012;
      lfo.connect(depth).connect(osc.frequency);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(0.13 * loud, t + 0.03);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(amp).connect(out);
      for (const o of [osc, lfo]) { o.start(t); o.stop(t + len + 0.02); }
      t += len + 0.04;
    }
  }
}

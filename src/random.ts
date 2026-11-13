export interface Point {
  x: number;
  y: number;
}

/** Seeded randomness: the same seed grows the same island. */
export function seeded(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const R = seeded(20261112);
export const rand = (a: number, b: number): number => a + R() * (b - a);
export const pick = <T>(list: readonly T[]): T => list[(R() * list.length) | 0];
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

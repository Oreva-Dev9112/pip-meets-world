/** A bubble's mood runs from -1 (miserable) to 1 (delighted). */
export interface Bubble {
  x: number;
  y: number;
  radius: number;
  colour: string;
  mood: number;
  /** Where the bubble is in its current bounce, in radians. */
  bouncePhase: number;
}

export interface Hop {
  /** How far off the ground the bubble is, in pixels. */
  height: number;
  /** How flattened it is from landing, from 0 (round) to about 0.2. */
  squash: number;
}

/** How fast the bounce cycle runs. Happy bubbles bounce quicker. */
export function bounceSpeed(mood: number): number {
  return 3.6 + mood * 1.6;
}

/**
 * The bounce depends on mood: happy bubbles bounce high and springy,
 * calm ones low and slow, and sad ones barely leave the ground.
 * A bubble that is standing still only bobs gently.
 * Heights are in the same units as the bubble's radius, scaled for a radius of about 22.
 */
export function hop(bubble: Bubble, moving = true): Hop {
  const cycle = Math.abs(Math.sin(bubble.bouncePhase));
  if (!moving) return { height: cycle * (1.5 + (bubble.mood + 1) * 1.5), squash: 0 };
  const sad = bubble.mood < -0.3;
  const peak = sad ? 2.5 : 7 + (bubble.mood + 1) * 7;
  const landing = Math.max(0, 1 - cycle * 3.2);
  return { height: cycle * peak, squash: landing * (sad ? 0.06 : 0.17) };
}

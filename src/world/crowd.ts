import type { Bubble } from '../bubble';
import { bounceSpeed } from '../bubble';
import { nearestNode, route, type WorldMap } from './map';

/** A bubble that lives on the map and walks its streets. */
export interface Walker extends Bubble {
  /** The street node it last passed. */
  at: number;
  /** The nodes still to visit on the way to where it is going. */
  path: number[];
  /** Seconds left to stand still before picking somewhere new. */
  rest: number;
  /** -1 when facing left, 1 when facing right. */
  facing: number;
}

const COLOURS = ['#ff6fb5', '#8fc8f2', '#9b8cff', '#ff8a80', '#b5c7a0', '#ffb347', '#7ed8a4'];
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function makeCrowd(map: WorldMap, count: number): Walker[] {
  const crowd: Walker[] = [];
  for (let i = 0; i < count; i++) {
    const at = nearestNode(map, pick(map.places));
    crowd.push({
      x: map.nodes[at].x,
      y: map.nodes[at].y,
      radius: 4.5,
      colour: COLOURS[i % COLOURS.length],
      mood: Math.random() * 1.8 - 0.9,
      bouncePhase: Math.random() * 6,
      at,
      path: [],
      rest: Math.random() * 4,
      facing: 1,
    });
  }
  return crowd;
}

/** True while the bubble is on its way somewhere. */
export const isMoving = (walker: Walker): boolean => walker.path.length > 0;

export function stepCrowd(map: WorldMap, crowd: Walker[], dt: number): void {
  for (const walker of crowd) {
    if (!isMoving(walker)) {
      walker.bouncePhase += 1.4 * dt;
      walker.rest -= dt;
      if (walker.rest <= 0) {
        // Head for a cafe, a pub, a theatre... wherever takes its fancy.
        walker.path = route(map, walker.at, nearestNode(map, pick(map.places)));
        walker.rest = 2 + Math.random() * 6;
        walker.mood = Math.max(-1, Math.min(1, walker.mood + (Math.random() - 0.5) * 0.5));
      }
      continue;
    }

    walker.bouncePhase += bounceSpeed(walker.mood) * dt;
    let travel = (9 + (walker.mood + 1) * 5) * dt;
    while (travel > 0 && walker.path.length > 0) {
      const next = map.nodes[walker.path[0]];
      const dx = next.x - walker.x;
      const dy = next.y - walker.y;
      const gap = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) walker.facing = dx > 0 ? 1 : -1;
      if (gap <= travel) {
        walker.x = next.x;
        walker.y = next.y;
        walker.at = walker.path.shift()!;
        travel -= gap;
      } else {
        walker.x += (dx / gap) * travel;
        walker.y += (dy / gap) * travel;
        travel = 0;
      }
    }
  }
}

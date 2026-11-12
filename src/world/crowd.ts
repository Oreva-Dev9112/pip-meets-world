import type { Bubble } from '../bubble';
import { bounceSpeed } from '../bubble';
import { nearestNode, route, type WorldMap } from './map';
import type { Phase } from './sky';

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
  /** Where it sleeps. */
  home: number;
  asleep: boolean;
  /** Night owls stay out until 2am. */
  owl: boolean;
  /** True while it is on its way home to bed. */
  headingHome: boolean;
}

const COLOURS = ['#ff6fb5', '#8fc8f2', '#9b8cff', '#ff8a80', '#b5c7a0', '#ffb347', '#7ed8a4'];
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function makeCrowd(map: WorldMap, count: number): Walker[] {
  const crowd: Walker[] = [];
  for (let i = 0; i < count; i++) {
    const at = nearestNode(map, pick(map.places));
    const home = nearestNode(map, pick(map.buildings)[0]);
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
      home,
      asleep: false,
      owl: Math.random() < 0.2,
      headingHome: false,
    });
  }
  return crowd;
}

/** True while the bubble is on its way somewhere. */
export const isMoving = (walker: Walker): boolean => walker.path.length > 0;

const NIGHTLIFE = new Set(['pub', 'theatre', 'food']);

/** Somewhere to go. After dark, most bubbles want a pub, a show or dinner. */
function choosePlace(map: WorldMap, phase: Phase) {
  if (phase === 'evening' && Math.random() < 0.8) return pick(map.places.filter((p) => NIGHTLIFE.has(p.kind)));
  return pick(map.places);
}

/**
 * Moves every bubble on by `dt` seconds.
 * `owlHours` is true while night owls are still allowed out.
 */
export function stepCrowd(map: WorldMap, crowd: Walker[], dt: number, phase: Phase, owlHours: boolean): void {
  const bedtime = (walker: Walker) => phase === 'night' && !(walker.owl && owlHours);
  for (const walker of crowd) {
    if (walker.asleep) {
      if (bedtime(walker)) continue;
      walker.asleep = false;
      walker.rest = Math.random() * 5;
    }
    if (isMoving(walker) && !walker.headingHome && bedtime(walker)) {
      // Bedtime: drop whatever it was doing and go home.
      walker.path = route(map, walker.at, walker.home);
      walker.headingHome = true;
    }
    if (!isMoving(walker)) {
      if (walker.headingHome) {
        walker.headingHome = false;
        walker.asleep = true;
        continue;
      }
      walker.bouncePhase += 1.4 * dt;
      walker.rest -= dt;
      if (walker.rest <= 0 || (bedtime(walker) && walker.rest > 1)) {
        if (bedtime(walker)) {
          walker.path = route(map, walker.at, walker.home);
          walker.headingHome = true;
          if (walker.path.length === 0) walker.asleep = true;
        } else {
          // Head for a cafe, a pub, a theatre... wherever takes its fancy.
          walker.path = route(map, walker.at, nearestNode(map, choosePlace(map, phase)));
          walker.mood = Math.max(-1, Math.min(1, walker.mood + (Math.random() - 0.5) * 0.5));
        }
        walker.rest = (phase === 'evening' ? 5 : 2) + Math.random() * 6;
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

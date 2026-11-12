/** The map file written by tools/build_map.py. Lengths are in metres once loaded. */
export interface Street {
  kind: 'major' | 'minor' | 'lane' | 'walk';
  name: string;
  /** Indexes into WorldMap.nodes. */
  nodes: number[];
}

export interface Point {
  x: number;
  y: number;
}

export interface WorldMap {
  name: string;
  credit: string;
  width: number;
  height: number;
  nodes: Point[];
  streets: Street[];
  buildings: Point[][];
  greens: { name: string; paved: boolean; outline: Point[] }[];
  places: (Point & { kind: string })[];
  props: (Point & { kind: string })[];
  stations: (Point & { name: string })[];
  /** For each node, the nodes one step away along a street. */
  links: number[][];
}

interface RawMap {
  name: string;
  credit: string;
  unit: number;
  width: number;
  height: number;
  nodes: number[];
  streets: { k: Street['kind']; name: string; n: number[] }[];
  buildings: number[][];
  greens: { name: string; paved?: boolean; p: number[] }[];
  places: [string, number, number][];
  props: [string, number, number][];
  stations: [string, number, number][];
}

function pairs(flat: number[], unit: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ x: flat[i] * unit, y: flat[i + 1] * unit });
  return out;
}

export function parseMap(raw: RawMap): WorldMap {
  const u = raw.unit;
  const nodes = pairs(raw.nodes, u);
  const links: number[][] = nodes.map(() => []);
  const streets = raw.streets.map((s) => ({ kind: s.k, name: s.name, nodes: s.n }));
  for (const street of streets) {
    for (let i = 1; i < street.nodes.length; i++) {
      const a = street.nodes[i - 1];
      const b = street.nodes[i];
      if (!links[a].includes(b)) links[a].push(b);
      if (!links[b].includes(a)) links[b].push(a);
    }
  }
  return {
    name: raw.name,
    credit: raw.credit,
    width: raw.width,
    height: raw.height,
    nodes,
    streets,
    buildings: raw.buildings.map((b) => pairs(b, u)),
    greens: raw.greens.map((g) => ({ name: g.name, paved: Boolean(g.paved), outline: pairs(g.p, u) })),
    places: raw.places.map(([kind, x, y]) => ({ kind, x: x * u, y: y * u })),
    props: raw.props.map(([kind, x, y]) => ({ kind, x: x * u, y: y * u })),
    stations: raw.stations.map(([name, x, y]) => ({ name, x: x * u, y: y * u })),
    links,
  };
}

export async function loadMap(url: string): Promise<WorldMap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the map (${response.status})`);
  return parseMap((await response.json()) as RawMap);
}

/** The street node closest to a point. */
export function nearestNode(map: WorldMap, point: Point): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < map.nodes.length; i++) {
    if (map.links[i].length === 0) continue;
    const d = (map.nodes[i].x - point.x) ** 2 + (map.nodes[i].y - point.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

/**
 * A route along the streets from one node to another, as a list of nodes
 * that starts after `from` and ends at `to`. Empty when there is no way through.
 */
export function route(map: WorldMap, from: number, to: number): number[] {
  if (from === to) return [];
  const cameFrom = new Int32Array(map.nodes.length).fill(-1);
  cameFrom[from] = from;
  let frontier = [from];
  while (frontier.length > 0 && cameFrom[to] === -1) {
    const next: number[] = [];
    for (const node of frontier) {
      for (const neighbour of map.links[node]) {
        if (cameFrom[neighbour] !== -1) continue;
        cameFrom[neighbour] = node;
        next.push(neighbour);
      }
    }
    frontier = next;
  }
  if (cameFrom[to] === -1) return [];
  const path: number[] = [];
  for (let node = to; node !== from; node = cameFrom[node]) path.push(node);
  return path.reverse();
}

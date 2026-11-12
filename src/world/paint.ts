import type { Point, WorldMap } from './map';

export const INK = '#2b2140';
/** Pixels per metre in the painted map image. */
export const MAP_SCALE = 3;

const BLOCK_COLOURS = ['#ffd6c9', '#ffe8b8', '#cdebd8', '#cfe3f7', '#e5d4f5', '#fbd0e0', '#d9eec2', '#ffddb5'];
const STREET_WIDTH = { major: 15, minor: 9, lane: 5, walk: 6 } as const;
export const PLACE_COLOURS: Record<string, string> = {
  cafe: '#ff9f6b',
  pub: '#f2c94c',
  food: '#ff7a7a',
  theatre: '#ff6fb5',
  treat: '#b79bff',
  bakery: '#d9a05b',
  records: '#6c8cff',
  books: '#4fb0a5',
};

function trace(ctx: CanvasRenderingContext2D, points: Point[], close: boolean): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** Paints the whole map once into an image, so each frame only has to copy it. */
export function paintMap(map: WorldMap): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(map.width * MAP_SCALE);
  canvas.height = Math.ceil(map.height * MAP_SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(MAP_SCALE, MAP_SCALE);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = '#e6e1ee';
  ctx.fillRect(0, 0, map.width, map.height);

  for (const green of map.greens) {
    trace(ctx, green.outline, true);
    ctx.fillStyle = green.paved ? '#f3f0f8' : '#bfe3a8';
    ctx.fill();
  }

  // Streets: a darker edge first, then the pale surface on top.
  for (const pass of ['edge', 'surface'] as const) {
    for (const street of map.streets) {
      trace(ctx, street.nodes.map((n) => map.nodes[n]), false);
      ctx.strokeStyle = pass === 'edge' ? '#cfc8dc' : '#fbfafd';
      ctx.lineWidth = STREET_WIDTH[street.kind] + (pass === 'edge' ? 1.6 : 0);
      ctx.stroke();
    }
  }

  map.buildings.forEach((outline, i) => {
    trace(ctx, outline, true);
    ctx.fillStyle = BLOCK_COLOURS[(i * 7 + outline.length) % BLOCK_COLOURS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.55)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  for (const prop of map.props) {
    if (prop.kind !== 'tree') continue;
    ctx.fillStyle = '#7fbf7a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.arc(prop.x, prop.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const place of map.places) {
    ctx.fillStyle = PLACE_COLOURS[place.kind] ?? '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(place.x, place.y, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  paintStreetNames(ctx, map);

  for (const station of map.stations) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(station.x, station.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '800 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', station.x, station.y + 0.5);
    ctx.font = '700 6px system-ui, sans-serif';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeText(station.name, station.x, station.y + 13);
    ctx.fillText(station.name, station.x, station.y + 13);
  }

  return canvas;
}

/** Writes each street's name once, along its longest stretch. */
function paintStreetNames(ctx: CanvasRenderingContext2D, map: WorldMap): void {
  const longest = new Map<string, { a: Point; b: Point; length: number; major: boolean }>();
  for (const street of map.streets) {
    if (!street.name) continue;
    for (let i = 1; i < street.nodes.length; i++) {
      const a = map.nodes[street.nodes[i - 1]];
      const b = map.nodes[street.nodes[i]];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const best = longest.get(street.name);
      if (!best || length > best.length) longest.set(street.name, { a, b, length, major: street.kind === 'major' });
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [name, { a, b, length, major }] of longest) {
    const size = major ? 5.2 : 3.6;
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(name.toUpperCase()).width > length + 30) continue;
    let angle = Math.atan2(b.y - a.y, b.x - a.x);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
    ctx.save();
    ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.rotate(angle);
    ctx.fillStyle = '#7d7391';
    ctx.fillText(name.toUpperCase(), 0, 0.3);
    ctx.restore();
  }
}

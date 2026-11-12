import { hop } from './bubble';
import { isMoving, makeCrowd, stepCrowd, type Walker } from './world/crowd';
import { loadMap, type WorldMap } from './world/map';
import { cloudinessFor, Sky } from './world/clouds';
import { INK, PLACE_COLOURS } from './world/paint';
import { paintToon, TOON_SCALE } from './world/toon';
import { clockText, darkness, goldenness, londonTime, owlsOut, phaseAt, skyLabel, sunElevation, sunTimes } from './world/sky';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const status = document.getElementById('status')!;
const clockLine = document.getElementById('clock')!;
const timeButton = document.getElementById('time-mode') as HTMLButtonElement;

/** Live follows the real London clock. Fast-forward runs a whole day in two minutes. */
const clock = { time: new Date(), speed: 1 };
const FAST = 720;

let width = 0;
let height = 0;
let ratio = 1;

/** Where the camera is looking, in metres, and how many screen pixels one metre takes. */
const camera = { x: 0, y: 0, zoom: 1 };
let minZoom = 0.5;
const MAX_ZOOM = 14;

function resize(): void {
  ratio = Math.min(2, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
}

function fit(map: WorldMap): void {
  minZoom = Math.min(width / map.width, height / map.height) * 0.95;
  camera.zoom = Math.max(camera.zoom, minZoom);
}

function zoomBy(factor: number, screenX = width / 2, screenY = height / 2): void {
  const before = { x: camera.x + (screenX - width / 2) / camera.zoom, y: camera.y + (screenY - height / 2) / camera.zoom };
  camera.zoom = Math.max(minZoom, Math.min(MAX_ZOOM, camera.zoom * factor));
  camera.x = before.x - (screenX - width / 2) / camera.zoom;
  camera.y = before.y - (screenY - height / 2) / camera.zoom;
}

function drawWalker(walker: Walker): void {
  // Bubbles are tiny, a speck in the crowd from above. Faces appear when you are close.
  const r = Math.max(walker.radius, 2.2 / camera.zoom);
  const scale = r / 22;
  const close = r * camera.zoom > 9;
  const { height: lift, squash } = hop(walker, isMoving(walker));
  const up = lift * scale;

  ctx.fillStyle = 'rgba(43, 33, 64, 0.18)';
  ctx.beginPath();
  ctx.ellipse(walker.x, walker.y + r * 0.9, r * Math.max(0.5, 1 - lift / 70), r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(walker.x, walker.y - up);
  ctx.scale(1 + squash, 1 - squash);

  ctx.fillStyle = walker.colour;
  ctx.strokeStyle = INK;
  if (walker.asleep) ctx.globalAlpha = 0.85;
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, -2.4, -1.6);
  ctx.stroke();

  ctx.globalAlpha = 1;
  if (!close) {
    ctx.restore();
    return;
  }
  const look = walker.asleep ? 0 : walker.facing * r * 0.14;
  ctx.fillStyle = INK;
  if (walker.asleep) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.12, r * 0.12, 0.2, Math.PI - 0.2);
    ctx.moveTo(r * 0.4, -r * 0.08);
    ctx.arc(r * 0.28, -r * 0.12, r * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(look - r * 0.28, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(look + r * 0.28, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.11;
  ctx.beginPath();
  if (walker.asleep) ctx.arc(0, r * 0.32, r * 0.08, 0, Math.PI * 2);
  else if (walker.mood > 0.15) ctx.arc(look, r * 0.14, r * 0.2, 0.2, Math.PI - 0.2);
  else if (walker.mood < -0.15) ctx.arc(look, r * 0.44, r * 0.18, Math.PI + 0.3, -0.3);
  else {
    ctx.moveTo(look - r * 0.14, r * 0.28);
    ctx.lineTo(look + r * 0.14, r * 0.28);
  }
  ctx.stroke();
  ctx.restore();

  if (walker.asleep && close) {
    const drift = (performance.now() / 2000 + walker.home * 0.37) % 1;
    ctx.globalAlpha = 1 - drift;
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${r * 0.9}px system-ui, sans-serif`;
    ctx.fillText('z', walker.x + r * (0.9 + drift * 0.6), walker.y - r * (1 + drift * 1.4));
    ctx.globalAlpha = 1;
  }
}

/** A soft warm light, drawn once and reused for every lit window. */
function makeGlow(): HTMLCanvasElement {
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const g = glow.getContext('2d')!;
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 214, 140, 0.95)');
  gradient.addColorStop(0.35, 'rgba(255, 190, 110, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 170, 90, 0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return glow;
}

function start(map: WorldMap): void {
  const picture = paintToon(map);
  const crowd = makeCrowd(map, 160);
  const glow = makeGlow();
  const sky = new Sky(map.width, map.height);
  let sun = { day: '', sunrise: 0, sunset: 0 };
  let lastClockText = '';

  timeButton.addEventListener('click', () => {
    if (clock.speed === 1) {
      clock.speed = FAST;
      timeButton.textContent = 'Back to live time';
    } else {
      clock.speed = 1;
      clock.time = new Date();
      timeButton.textContent = 'Fast-forward a day';
    }
  });
  camera.x = map.width / 2;
  camera.y = map.height / 2;
  fit(map);
  camera.zoom = minZoom;
  status.textContent = `${map.name}, London. ${crowd.length} bubbles out and about.`;

  window.addEventListener('resize', () => {
    resize();
    fit(map);
  });

  // One finger or the mouse drags. Two fingers pinch to zoom. Double-tap zooms in.
  const pointers = new Map<number, { x: number; y: number }>();
  let lastTap = 0;
  const local = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  canvas.addEventListener('pointerdown', (event) => {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers refuse capture for synthetic pointers; dragging still works without it.
    }
    pointers.set(event.pointerId, local(event));
    if (pointers.size === 1) {
      const now = performance.now();
      if (now - lastTap < 300) zoomBy(1.8, local(event).x, local(event).y);
      lastTap = now;
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    const after = local(event);
    if (pointers.size === 1) {
      camera.x -= (after.x - before.x) / camera.zoom;
      camera.y -= (after.y - before.y) / camera.zoom;
    } else if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1];
      const spreadBefore = Math.hypot(before.x - other.x, before.y - other.y);
      const spreadAfter = Math.hypot(after.x - other.x, after.y - other.y);
      const mid = { x: (after.x + other.x) / 2, y: (after.y + other.y) / 2 };
      camera.x -= (after.x - before.x) / 2 / camera.zoom;
      camera.y -= (after.y - before.y) / 2 / camera.zoom;
      if (spreadBefore > 10) zoomBy(spreadAfter / spreadBefore, mid.x, mid.y);
    }
    pointers.set(event.pointerId, after);
  });
  const release = (event: PointerEvent) => pointers.delete(event.pointerId);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  window.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') zoomBy(1.4);
    if (event.key === '-' || event.key === '_') zoomBy(1 / 1.4);
  });
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - box.left, event.clientY - box.top);
    },
    { passive: false },
  );
  document.getElementById('zoom-in')!.addEventListener('click', () => zoomBy(1.5));
  document.getElementById('zoom-out')!.addEventListener('click', () => zoomBy(1 / 1.5));

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock.time = clock.speed === 1 ? new Date() : new Date(clock.time.getTime() + dt * 1000 * clock.speed);
    const london = londonTime(clock.time);
    if (london.day !== sun.day) sun = { day: london.day, ...sunTimes(clock.time) };
    const elevation = sunElevation(clock.time);
    const phase = phaseAt(london.minutes, elevation);
    const dark = darkness(elevation);
    const gold = goldenness(elevation);

    // At fast-forward speed, let the bubbles hurry too, so the day still makes sense.
    const steps = clock.speed === 1 ? 1 : 12;
    for (let i = 0; i < steps; i++) stepCrowd(map, crowd, dt, phase, owlsOut(london.minutes));
    sky.cloudiness = cloudinessFor(london.day, london.minutes);
    sky.step(dt, clock.speed === 1 ? 2.5 : 25);
    // 1 when zoomed right out above the clouds, 0 when down among the streets.
    const altitude = Math.max(0, Math.min(1, 1 - Math.log(camera.zoom / minZoom) / Math.log(4)));

    const asleep = crowd.filter((w) => w.asleep).length;
    const text = `London ${clockText(london.minutes)} · ${skyLabel(elevation, phase)} · Sunset ${clockText(sun.sunset)}${asleep ? ` · ${asleep} asleep` : ''}`;
    if (text !== lastClockText) {
      clockLine.textContent = text;
      lastClockText = text;
    }

    camera.x = Math.max(0, Math.min(map.width, camera.x));
    camera.y = Math.max(0, Math.min(map.height, camera.y));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9edf3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = ratio * camera.zoom;
    ctx.setTransform(k, 0, 0, k, (width / 2 - camera.x * camera.zoom) * ratio, (height / 2 - camera.y * camera.zoom) * ratio);
    ctx.drawImage(picture, 0, 0, picture.width / TOON_SCALE, picture.height / TOON_SCALE);

    sky.drawShadows(ctx, 1 - dark);
    crowd.sort((a, b) => a.y - b.y);
    // Sleeping bubbles sit under the night sky. Awake ones are drawn on top, so they stay easy to follow.
    for (const walker of crowd) if (walker.asleep) drawWalker(walker);

    if (dark > 0 || gold > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Multiplying keeps colours rich: a warm wash at golden hour, deep blue at night.
      ctx.globalCompositeOperation = 'multiply';
      const mix = (day: number, night: number, warm: number) => Math.round((day + (night - day) * dark) * (1 - 0.25 * gold * (1 - warm)));
      // From high up, night is near-black and only the lights show. Down at
      // street level your eyes adjust, so buildings and streets come through.
      const close = 1 - altitude;
      ctx.fillStyle = `rgb(${mix(255, 14 + 50 * close, 1)}, ${mix(255, 14 + 52 * close, 0.6)}, ${mix(255, 22 + 78 * close, 0)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (dark > 0.3) {
      // Cafes, pubs and theatres light up after dark.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const late = phase === 'night';
      for (let i = 0; i < map.places.length; i++) {
        const place = map.places[i];
        const open = !late || place.kind === 'pub' || i % 5 === 0;
        if (!open) continue;
        const size = place.kind === 'theatre' ? 26 : 13;
        ctx.globalAlpha = Math.min(1, (dark - 0.3) * 1.4) * (late ? 0.75 : 1);
        ctx.drawImage(glow, place.x - size / 2, place.y - size / 2, size, size);
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.min(1, (dark - 0.3) * 1.6);
      for (const place of map.places) {
        ctx.fillStyle = PLACE_COLOURS[place.kind] ?? '#ffffff';
        ctx.beginPath();
        ctx.arc(place.x, place.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const walker of crowd) if (!walker.asleep) drawWalker(walker);
    sky.draw(ctx, altitude, dark);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

resize();
loadMap(`${import.meta.env.BASE_URL}maps/soho.json`)
  .then(start)
  .catch((error: unknown) => {
    status.textContent = 'The map did not load. Check your connection and reload the page.';
    console.error(error);
  });

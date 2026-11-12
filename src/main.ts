import { hop } from './bubble';
import { isMoving, makeCrowd, stepCrowd, type Walker } from './world/crowd';
import { loadMap, type WorldMap } from './world/map';
import { INK, MAP_SCALE, paintMap } from './world/paint';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const status = document.getElementById('status')!;

let width = 0;
let height = 0;
let ratio = 1;

/** Where the camera is looking, in metres, and how many screen pixels one metre takes. */
const camera = { x: 0, y: 0, zoom: 1 };
let minZoom = 0.5;
const MAX_ZOOM = 7;

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
  // Keep bubbles easy to see when the whole map is on screen.
  const r = Math.max(walker.radius, 8 / camera.zoom);
  const scale = r / 22;
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

  const look = walker.facing * r * 0.14;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(look - r * 0.28, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(look + r * 0.28, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.11;
  ctx.beginPath();
  if (walker.mood > 0.15) ctx.arc(look, r * 0.14, r * 0.2, 0.2, Math.PI - 0.2);
  else if (walker.mood < -0.15) ctx.arc(look, r * 0.44, r * 0.18, Math.PI + 0.3, -0.3);
  else {
    ctx.moveTo(look - r * 0.14, r * 0.28);
    ctx.lineTo(look + r * 0.14, r * 0.28);
  }
  ctx.stroke();
  ctx.restore();
}

function start(map: WorldMap): void {
  const picture = paintMap(map);
  const crowd = makeCrowd(map, 40);
  camera.x = map.width / 2;
  camera.y = map.height / 2;
  fit(map);
  camera.zoom = minZoom;
  status.textContent = `${map.name}, London. ${crowd.length} bubbles out and about.`;

  window.addEventListener('resize', () => {
    resize();
    fit(map);
  });

  // Drag to move, wheel or buttons to zoom.
  let drag: { x: number; y: number; cameraX: number; cameraY: number } | null = null;
  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    camera.x = drag.cameraX - (event.clientX - drag.x) / camera.zoom;
    camera.y = drag.cameraY - (event.clientY - drag.y) / camera.zoom;
  });
  canvas.addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener('pointercancel', () => (drag = null));
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
    stepCrowd(map, crowd, dt);

    camera.x = Math.max(0, Math.min(map.width, camera.x));
    camera.y = Math.max(0, Math.min(map.height, camera.y));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9edf3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = ratio * camera.zoom;
    ctx.setTransform(k, 0, 0, k, (width / 2 - camera.x * camera.zoom) * ratio, (height / 2 - camera.y * camera.zoom) * ratio);
    ctx.drawImage(picture, 0, 0, picture.width / MAP_SCALE, picture.height / MAP_SCALE);

    crowd.sort((a, b) => a.y - b.y);
    for (const walker of crowd) drawWalker(walker);

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

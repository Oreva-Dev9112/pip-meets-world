import { type Bubble, bounceSpeed, hop } from './bubble';

const INK = '#2b2140';
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Three bubbles in three moods, so the difference in bounce is easy to see.
const bubbles: Bubble[] = [
  { x: 0, y: 0, radius: 22, colour: '#ffb347', mood: 0.9, bouncePhase: 0 },
  { x: 0, y: 0, radius: 22, colour: '#7ed8a4', mood: 0.1, bouncePhase: 1 },
  { x: 0, y: 0, radius: 22, colour: '#8fc8f2', mood: -0.7, bouncePhase: 2 },
];

let width = 0;
let height = 0;

function resize(): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawBubble(bubble: Bubble): void {
  const { height: lift, squash } = hop(bubble);
  const r = bubble.radius;

  // Shadow shrinks as the bubble rises.
  ctx.fillStyle = 'rgba(43, 33, 64, 0.16)';
  ctx.beginPath();
  ctx.ellipse(bubble.x, bubble.y + r * 0.9, r * Math.max(0.5, 1 - lift / 70), r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(bubble.x, bubble.y - lift);
  ctx.scale(1 + squash, 1 - squash);

  ctx.fillStyle = bubble.colour;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.4, -r * 0.08, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth follows mood
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (bubble.mood > 0.15) ctx.arc(r * 0.1, r * 0.14, r * 0.2, 0.2, Math.PI - 0.2);
  else if (bubble.mood < -0.15) ctx.arc(r * 0.1, r * 0.44, r * 0.18, Math.PI + 0.3, -0.3);
  else { ctx.moveTo(-r * 0.04, r * 0.28); ctx.lineTo(r * 0.24, r * 0.28); }
  ctx.stroke();
  ctx.restore();
}

let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  ctx.clearRect(0, 0, width, height);
  bubbles.forEach((bubble, i) => {
    const speed = 40 + (bubble.mood + 1) * 25;
    bubble.x = (bubble.x + speed * dt) % (width + 60);
    bubble.y = height * (0.3 + i * 0.2);
    bubble.bouncePhase += bounceSpeed(bubble.mood) * dt;
    drawBubble(bubble);
  });

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

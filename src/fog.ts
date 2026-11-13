import { H, W } from './island';

const SCALE = 0.5;
const SEEN = 50;
const seenW = W / SEEN;
const seenH = H / SEEN;

/** Blank chart paper over the island that clears where your dot has been. */
export class Fog {
  readonly canvas = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private readonly seen = new Uint8Array(seenW * seenH);

  constructor() {
    this.canvas.width = W * SCALE;
    this.canvas.height = H * SCALE;
    const g = (this.g = this.canvas.getContext('2d')!);
    g.fillStyle = '#E4ECEC';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.strokeStyle = 'rgba(31,51,64,0.07)';
    g.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += 25) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, this.canvas.height); g.stroke(); }
    for (let y = 0; y <= this.canvas.height; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(this.canvas.width, y); g.stroke(); }
  }

  reveal(x: number, y: number, r: number): void {
    const g = this.g;
    g.globalCompositeOperation = 'destination-out';
    const grad = g.createRadialGradient(x * SCALE, y * SCALE, r * SCALE * 0.35, x * SCALE, y * SCALE, r * SCALE);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x * SCALE, y * SCALE, r * SCALE, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  /** Remembers the area around a point as explored, for choosing where to go next. */
  markSeen(x: number, y: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ((x / SEEN) | 0) + dx, cy = ((y / SEEN) | 0) + dy;
        if (cx >= 0 && cy >= 0 && cx < seenW && cy < seenH) this.seen[cy * seenW + cx] = 1;
      }
    }
  }

  isSeen(x: number, y: number): boolean {
    return this.seen[((y / SEEN) | 0) * seenW + ((x / SEEN) | 0)] === 1;
  }
}

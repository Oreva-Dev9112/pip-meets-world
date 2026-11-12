/**
 * Clouds drift over the map. Zoomed right out they fill the sky; zooming in
 * takes you below them, so they fade away and the streets come through.
 */

export interface Cloud {
  x: number;
  y: number;
  /** Width in metres. */
  size: number;
  sprite: number;
  /** Extra drift speed, so clouds don't move in lockstep. */
  speed: number;
}

const SPRITE_W = 256;
const SPRITE_H = 128;

function makeSprite(seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d')!;
  let s = seed;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const puffs = 7 + Math.floor(rand() * 5);
  for (let i = 0; i < puffs; i++) {
    const x = 50 + rand() * 156;
    const y = 52 + rand() * 30 - Math.sin(((x - 50) / 156) * Math.PI) * 18;
    const r = 26 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/**
 * How cloudy the sky is, from 0 (clear) to 1 (overcast). Each London day gets
 * its own weather, which drifts a little through the day. Made up, not forecast.
 */
export function cloudinessFor(day: string, minutes: number): number {
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) % 100003;
  const base = (hash % 1000) / 1000;
  const drift = Math.sin(minutes / 180 + hash) * 0.15;
  return Math.max(0, Math.min(1, base + drift));
}

/** A copy of a cloud sprite in one flat colour, keeping its soft edges. */
function recolour(sprite: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export class Sky {
  readonly clouds: Cloud[] = [];
  /** 0 is a clear sky, 1 is overcast. */
  cloudiness = 0.5;
  private readonly sprites = [1, 7, 23].map(makeSprite);
  /** The same clouds painted in night blue-grey, and in shadow black. */
  private readonly nightSprites = this.sprites.map((s) => recolour(s, '#3a3f58'));
  private readonly shadowSprites = this.sprites.map((s) => recolour(s, '#000000'));

  constructor(private readonly width: number, private readonly height: number, count = 16) {
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * (width + 600) - 300,
        y: Math.random() * height,
        size: 140 + Math.random() * 160,
        sprite: i % this.sprites.length,
        speed: 0.7 + Math.random() * 0.6,
      });
    }
  }

  /** `wind` is in metres per second of game time. */
  step(dt: number, wind: number): void {
    for (const cloud of this.clouds) {
      cloud.x += wind * cloud.speed * dt;
      if (cloud.x - cloud.size / 2 > this.width + 300) {
        cloud.x = -300;
        cloud.y = Math.random() * this.height;
      }
    }
  }

  /** Soft shadows on the ground, only in daylight. */
  drawShadows(ctx: CanvasRenderingContext2D, daylight: number): void {
    if (daylight <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.1 * daylight;
    this.visible().forEach((cloud) => this.drawOne(ctx, this.shadowSprites, cloud, 40, 60));
    ctx.restore();
  }

  /**
   * The clouds themselves. `height` runs from 0 (zoomed right in, under the
   * clouds) to 1 (zoomed right out, looking down from above them).
   */
  draw(ctx: CanvasRenderingContext2D, height: number, darkness: number): void {
    const opacity = Math.max(0, Math.min(1, (height - 0.15) / 0.6)) * 0.85;
    if (opacity <= 0) return;
    ctx.save();
    // White by day, fading to dim blue-grey at night.
    for (const cloud of this.visible()) {
      ctx.globalAlpha = opacity * (1 - darkness);
      if (darkness < 1) this.drawOne(ctx, this.sprites, cloud, 0, 0);
      ctx.globalAlpha = opacity * darkness * 0.6;
      if (darkness > 0) this.drawOne(ctx, this.nightSprites, cloud, 0, 0);
    }
    ctx.restore();
  }

  /** On a clear day only a few clouds show; on an overcast one, all of them. */
  private visible(): Cloud[] {
    const count = Math.round(this.cloudiness * this.clouds.length);
    return this.clouds.slice(0, count);
  }

  private drawOne(ctx: CanvasRenderingContext2D, sprites: HTMLCanvasElement[], cloud: Cloud, dx: number, dy: number): void {
    const w = cloud.size;
    const h = (w * SPRITE_H) / SPRITE_W;
    ctx.drawImage(sprites[cloud.sprite], cloud.x - w / 2 + dx, cloud.y - h / 2 + dy, w, h);
  }
}

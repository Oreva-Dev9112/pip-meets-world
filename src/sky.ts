/**
 * Light and weather over the island. Clouds drift across and cast soft
 * shadows; dusk turns golden before night comes in.
 */

interface Cloud {
  x: number;
  y: number;
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
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
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

/** How cloudy a day is, from 0 (clear) to 1 (overcast), drifting a little through the day. */
export function cloudinessFor(day: number, tod: number): number {
  const base = ((day * 7919) % 1000) / 1000;
  return Math.max(0, Math.min(1, base + Math.sin(tod * 6.283 + day) * 0.15));
}

/** How dark it is, from 0 in daylight to 1 at night. */
export const darkness = (tod: number): number => (tod >= 0.72 ? Math.min(1, (tod - 0.72) / 0.08) : tod < 0.05 ? 1 - tod / 0.05 : 0);

/** How golden the light is around dawn and dusk, from 0 to 1. */
export const goldenness = (tod: number): number => Math.max(0, 1 - Math.abs(tod - 0.67) / 0.09, 1 - Math.abs(tod - 0.04) / 0.05);

export class Sky {
  /** 0 is a clear sky, 1 is overcast. */
  cloudiness = 0.5;
  private readonly clouds: Cloud[] = [];
  private readonly sprites = [1, 7, 23].map(makeSprite);
  private readonly nightSprites = this.sprites.map((s) => recolour(s, '#3a3f58'));
  private readonly shadowSprites = this.sprites.map((s) => recolour(s, '#000000'));

  constructor(private readonly width: number, private readonly height: number, count = 12) {
    for (let i = 0; i < count; i++) {
      this.clouds.push({ x: Math.random() * (width + 600) - 300, y: Math.random() * height, size: 160 + Math.random() * 180, sprite: i % this.sprites.length, speed: 0.7 + Math.random() * 0.6 });
    }
  }

  step(dt: number, wind = 9): void {
    for (const cloud of this.clouds) {
      cloud.x += wind * cloud.speed * dt;
      if (cloud.x - cloud.size / 2 > this.width + 300) {
        cloud.x = -300;
        cloud.y = Math.random() * this.height;
      }
    }
  }

  /** Soft shadows on the ground, only in daylight. */
  drawShadows(ctx: CanvasRenderingContext2D, dark: number): void {
    if (dark >= 1) return;
    ctx.save();
    ctx.globalAlpha = 0.08 * (1 - dark);
    for (const cloud of this.visible()) this.drawOne(ctx, this.shadowSprites, cloud, 40, 60);
    ctx.restore();
  }

  /** `altitude` runs from 0 (zoomed right in, under the clouds) to 1 (zoomed right out, above them). */
  draw(ctx: CanvasRenderingContext2D, altitude: number, dark: number): void {
    const opacity = 0.25 + altitude * 0.6;
    ctx.save();
    for (const cloud of this.visible()) {
      ctx.globalAlpha = opacity * (1 - dark);
      if (dark < 1) this.drawOne(ctx, this.sprites, cloud, 0, 0);
      ctx.globalAlpha = opacity * dark * 0.6;
      if (dark > 0) this.drawOne(ctx, this.nightSprites, cloud, 0, 0);
    }
    ctx.restore();
  }

  /** The tint over the whole scene: a warm wash at dawn and dusk, soft blue at night. */
  tint(dark: number, gold: number): string | null {
    if (dark <= 0 && gold <= 0) return null;
    const mix = (night: number, warm: number) => Math.round((255 + (night - 255) * dark) * (1 - 0.4 * gold * (1 - warm)));
    return `rgb(${mix(172, 1)}, ${mix(180, 0.6)}, ${mix(214, 0)})`;
  }

  /** On a clear day only a few clouds show; on an overcast one, all of them. */
  private visible(): Cloud[] {
    return this.clouds.slice(0, Math.round(this.cloudiness * this.clouds.length));
  }

  private drawOne(ctx: CanvasRenderingContext2D, sprites: HTMLCanvasElement[], cloud: Cloud, dx: number, dy: number): void {
    const w = cloud.size, h = (w * SPRITE_H) / SPRITE_W;
    ctx.drawImage(sprites[cloud.sprite], cloud.x - w / 2 + dx, cloud.y - h / 2 + dy, w, h);
  }
}

/** A soft warm light, drawn once and reused for lit windows. */
export function makeGlow(): HTMLCanvasElement {
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

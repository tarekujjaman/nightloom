// The night behind everything: an indigo-to-black gradient, slow nebula clouds of violet, magenta
// and teal, a faint aurora along the bottom, and three parallax layers of twinkling backdrop stars.
import { FIELD, PALETTE } from './config.js';
import { drawSprite } from './glow.js';

let skyGradient = null;
let nebulaSprites = null;

/** A soft cloud sprite of one colour, built once. */
function makeCloud(rgb, radius) {
  const size = radius * 2;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `rgba(${rgb}, 0.42)`);
  gradient.addColorStop(0.3, `rgba(${rgb}, 0.22)`);
  gradient.addColorStop(0.65, `rgba(${rgb}, 0.07)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/** The sky gradient. */
export function drawSky(ctx) {
  if (!skyGradient) {
    skyGradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    skyGradient.addColorStop(0, PALETTE.skyTop);
    skyGradient.addColorStop(0.45, PALETTE.skyMid);
    skyGradient.addColorStop(1, PALETTE.skyBottom);
  }
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** Nebula clouds drifting very slowly, and an aurora band low in the sky. */
export function drawNebula(ctx, time) {
  if (!nebulaSprites) {
    nebulaSprites = {
      violet: makeCloud(PALETTE.nebulaViolet, 260),
      magenta: makeCloud(PALETTE.nebulaMagenta, 200),
      teal: makeCloud(PALETTE.nebulaTeal, 230),
    };
  }
  const t = time * 0.05;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, nebulaSprites.violet, 300 + Math.sin(t) * 40, 260 + Math.cos(t * 0.7) * 30, 1.9, 0.75);
  drawSprite(ctx, nebulaSprites.magenta, 980 + Math.cos(t * 0.8) * 50, 200 + Math.sin(t * 0.5) * 25, 1.7, 0.6);
  drawSprite(ctx, nebulaSprites.teal, 760 + Math.sin(t * 0.6) * 60, 620 + Math.cos(t) * 30, 2.0, 0.55);
  drawSprite(ctx, nebulaSprites.violet, 1120 + Math.cos(t * 0.4) * 30, 640 + Math.sin(t * 0.9) * 30, 1.2, 0.5);
  drawSprite(ctx, nebulaSprites.teal, 160 + Math.sin(t * 0.9) * 30, 660 + Math.cos(t * 0.6) * 20, 1.1, 0.45);
  const aurora = ctx.createLinearGradient(0, FIELD.height - 160, 0, FIELD.height);
  aurora.addColorStop(0, 'rgba(60, 200, 220, 0)');
  aurora.addColorStop(0.6, 'rgba(60, 200, 220, 0.05)');
  aurora.addColorStop(1, 'rgba(120, 90, 230, 0.12)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, FIELD.height - 160, FIELD.width, 160);
  ctx.restore();
}

/** The backdrop stars, slid by (parallaxX, parallaxY) times each layer's depth, twinkling with time. */
export function drawBackdropStars(ctx, backdrop, parallaxX, parallaxY, time) {
  ctx.save();
  for (const layer of backdrop) {
    const dx = -parallaxX * layer.depth;
    const dy = -parallaxY * layer.depth;
    for (const star of layer.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
      ctx.globalAlpha = layer.alpha * twinkle;
      ctx.fillStyle = star.warm ? '#ffe9b0' : '#dff6ff';
      const x = star.x + dx;
      const y = star.y + dy;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size > 2.2) {
        ctx.globalAlpha = layer.alpha * twinkle * 0.5;
        ctx.fillRect(x - star.size * 2.5, y - 0.5, star.size * 5, 1);
        ctx.fillRect(x - 0.5, y - star.size * 2.5, 1, star.size * 5);
      }
    }
  }
  ctx.restore();
}

/** Darken the edges so the middle of the sky, where the play is, glows brightest. */
export function drawVignette(ctx, strength = 0.55) {
  const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35, FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.72);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(2, 0, 8, ${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

// The twilight behind everything: the violet-to-teal gradient, nebula clouds, an aurora and parallax stars.
import { FIELD, PALETTE } from './config.js';
import { drawSprite } from './glow.js';

let skyGradient = null;
let clouds = null;

function makeCloud(rgb, radius) {
  const sprite = document.createElement('canvas');
  sprite.width = radius * 2;
  sprite.height = radius * 2;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `rgba(${rgb}, 0.5)`);
  gradient.addColorStop(0.3, `rgba(${rgb}, 0.26)`);
  gradient.addColorStop(0.65, `rgba(${rgb}, 0.08)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return sprite;
}

export function drawSky(ctx) {
  if (!skyGradient) {
    skyGradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    skyGradient.addColorStop(0, PALETTE.skyTop);
    skyGradient.addColorStop(0.5, PALETTE.skyMid);
    skyGradient.addColorStop(1, PALETTE.skyBottom);
  }
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawNebula(ctx, time) {
  if (!clouds) clouds = { violet: makeCloud(PALETTE.nebulaViolet, 240), magenta: makeCloud(PALETTE.nebulaMagenta, 190), teal: makeCloud(PALETTE.nebulaTeal, 220) };
  const t = time * 0.05;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [cloud, x, y, scale, alpha, a, b] of [['violet', 230, 200, 1.9, 0.8, 1, 0.7], ['magenta', 740, 160, 1.7, 0.65, 0.8, 0.5], ['teal', 580, 500, 2, 0.7, 0.6, 1], ['violet', 850, 520, 1.2, 0.55, 0.4, 0.9], ['teal', 120, 540, 1.1, 0.55, 0.9, 0.6]]) {
    drawSprite(ctx, clouds[cloud], x + Math.sin(t * a) * 40, y + Math.cos(t * b) * 30, scale, alpha);
  }
  const aurora = ctx.createLinearGradient(0, FIELD.height - 150, 0, FIELD.height);
  aurora.addColorStop(0, 'rgba(60, 220, 230, 0)');
  aurora.addColorStop(0.6, 'rgba(60, 220, 230, 0.1)');
  aurora.addColorStop(1, 'rgba(130, 100, 240, 0.22)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, FIELD.height - 150, FIELD.width, 150);
  ctx.restore();
}

export function drawBackdropStars(ctx, backdrop, parallaxX, parallaxY, time) {
  ctx.save();
  for (const layer of backdrop) {
    for (const star of layer.stars) {
      ctx.globalAlpha = layer.alpha * (0.55 + 0.45 * Math.sin(time * star.speed + star.phase));
      ctx.fillStyle = star.warm ? '#ffe9b0' : '#eefaff';
      const x = star.x - parallaxX * layer.depth;
      const y = star.y - parallaxY * layer.depth;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size > 2.2) {
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x - star.size * 2.5, y - 0.5, star.size * 5, 1);
        ctx.fillRect(x - 0.5, y - star.size * 2.5, 1, star.size * 5);
      }
    }
  }
  ctx.restore();
}

export function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.4, FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.75);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(6, 0, 20, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

// The Loom on the summit of the Weavers' Hill: its health and the bites that tear its warp; the landmark is the painted tower (art/loom.png) with live warp threads, the great wheel turning, a tapestry woven as the night goes on, lantern light and the health plaque.
import { LOOM, PALETTE as P } from './config.js';
import { ART, artLoaded } from './art.js';
import { drawSprite, lighter, line, makeGlowSprite, poly, rgba, ring, roundRect, sparklePath } from './glow.js';

// Cells of art/loom.png (painted at 2x by tools/paint.mjs): [sx, sy, sw, sh, dx, dy], d from the hub.
const SHEET = { tower: [0, 0, 520, 780, -130, -188], wheel: [0, 784, 260, 260, -65, -65], cloth: [264, 784, 280, 110, -70, 88] };
const OPEN = { x: 77, top: -126, bottom: 62 };
const CLOTH = { x: -66, y: 90, w: 132, h: 50 };
let sprites = null;

export const createLoom = () => ({ health: LOOM.health, max: LOOM.health, hurt: 0, fall: 0, bites: 0 });
export const mothAtLoom = (moth) => Math.hypot(moth.x - LOOM.x, moth.y - LOOM.y) < LOOM.radius + moth.radius * 0.5;
export const loomColor = (frac) => (frac > 0.5 ? P.gold : frac > 0.25 ? P.emberGlow : P.ember);

export function biteLoom(loom, damage) {
  loom.health = Math.max(0, loom.health - damage);
  loom.hurt = 1;
  loom.bites += 1;
  return loom.health <= 0;
}

export function healLoom(loom, amount) {
  loom.health = Math.min(loom.max, loom.health + amount);
}

export function stepLoom(loom, dt) {
  loom.hurt = Math.max(0, loom.hurt - dt * 1.6);
  if (loom.health <= 0) loom.fall = Math.min(1, loom.fall + dt * 0.6);
}

function cell(ctx, name, crop = 1) {
  const [sx, sy, sw, sh, dx, dy] = SHEET[name];
  ctx.drawImage(ART.loom, sx, sy, sw, sh * crop, dx, dy, sw / 2, (sh / 2) * crop);
}

/** `progress` is how much of the night is woven (0 to 1): the tapestry grows with it. */
export function drawLoom(ctx, loom, time, accent, progress) {
  if (!sprites) sprites = { glow: makeGlowSprite(P.gold, 160, 0.02), hub: makeGlowSprite('#ffffff', 26, 0.3), ember: makeGlowSprite(P.ember, 120, 0.05), lantern: makeGlowSprite('#ffb860', 30, 0.2) };
  const frac = loom.health / loom.max;
  const torn = Math.round((1 - frac) * LOOM.threads);
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.6);
  ctx.save();
  ctx.translate(LOOM.x + loom.hurt * Math.sin(time * 70) * 3, LOOM.y + loom.fall * 30);
  ctx.rotate(loom.fall * 0.12);
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.glow, 0, 20, 1.7 + 0.1 * pulse, (0.45 + 0.15 * pulse) * (0.3 + 0.7 * frac) * (1 - loom.fall * 0.8));
  const danger = frac < 0.3 ? 0.25 + 0.2 * Math.sin(time * 6) : 0;
  if (loom.hurt > 0 || danger) drawSprite(ctx, sprites.ember, 0, 0, 1.8, Math.max(loom.hurt * 0.7, danger));
  const ray = ctx.createLinearGradient(0, 0, 0, -300);
  ray.addColorStop(0, rgba(P.gold, 0.2 * frac));
  ray.addColorStop(1, rgba(P.gold, 0));
  ctx.fillStyle = ray;
  ctx.rotate(time * 0.08);
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    poly(ctx, [{ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 36, y: -300 }, { x: -36, y: -300 }]);
    ctx.fill();
  }
  ctx.restore();
  // the warp between the beams: whole threads glow, torn ones dangle
  ctx.fillStyle = 'rgba(8, 4, 24, 0.5)';
  ctx.fillRect(-OPEN.x, OPEN.top, OPEN.x * 2, OPEN.bottom - OPEN.top);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < LOOM.threads; i += 1) {
    const x = -OPEN.x + 10 + (i * (OPEN.x * 2 - 20)) / (LOOM.threads - 1);
    if ((i * 5) % LOOM.threads < torn) {
      const sway = Math.sin(time * 3 + i) * 6;
      ctx.strokeStyle = rgba(P.emberGlow, 0.8);
      poly(ctx, [{ x, y: OPEN.top }, { x: x + sway * 0.4, y: OPEN.top + 40 }, { x: x + sway, y: OPEN.top + 70 }], false);
      ctx.stroke();
      line(ctx, x, OPEN.bottom, x - sway * 0.5, OPEN.bottom - 30);
    } else {
      ctx.strokeStyle = rgba(P.cyan, 0.7 + 0.3 * Math.sin(time * 2 + i * 0.7));
      line(ctx, x, OPEN.top, x, OPEN.bottom);
    }
  }
  if (artLoaded()) {
    cell(ctx, 'tower');
    // the tapestry below the cloth beam: bare warp, then the woven part, its fell line and the shuttle on it
    ctx.strokeStyle = rgba(P.cyan, 0.45);
    ctx.lineWidth = 1;
    for (let x = CLOTH.x + 6; x < CLOTH.x + CLOTH.w; x += 12) line(ctx, x, CLOTH.y, x, CLOTH.y + CLOTH.h);
    const woven = Math.max(0.04, Math.min(1, progress));
    cell(ctx, 'cloth', woven);
    const fell = CLOTH.y + CLOTH.h * woven;
    ctx.fillStyle = P.goldLight;
    ctx.fillRect(CLOTH.x, fell - 1, CLOTH.w, 2);
    const sx = Math.sin(time * 1.3) * (CLOTH.w / 2 - 10);
    poly(ctx, [{ x: sx - 12, y: fell }, { x: sx, y: fell - 5 }, { x: sx + 12, y: fell }, { x: sx, y: fell + 5 }]);
    ctx.fill();
    ctx.save();
    ctx.rotate(time * 0.5 * (0.3 + 0.7 * frac));
    cell(ctx, 'wheel');
    ctx.restore();
  }
  ring(ctx, 0, 0, 40, rgba(accent, 0.9), 2, [6, 5], time * 20);
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.hub, 0, 0, 1.2 + 0.2 * pulse, 0.6 + 0.4 * frac);
  for (const [x, k] of [[-98, 0], [98, 1]]) {
    const flicker = 0.5 + 0.5 * Math.sin(time * 11 + k * 2) * Math.sin(time * 2.7 + k);
    const gutter = frac < 0.3 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 9 + k)) : 1;
    drawSprite(ctx, sprites.lantern, x, -112, 1 + 0.3 * flicker, (0.5 + 0.4 * flicker) * gutter);
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  sparklePath(ctx, 0, 0, 12, 0.35, time * 0.7);
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, -64, 174, 128 * frac, 8, 4);
    ctx.fillStyle = loomColor(frac);
    ctx.fill();
  }
  ctx.restore();
}

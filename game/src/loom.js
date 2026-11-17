// The Loom at the heart of the sky: its health, the bites that tear its warp threads, and the landmark itself.
import { LOOM, PALETTE as P } from './config.js';
import { disc, drawSprite, lighter, line, makeGlowSprite, poly, rgba, roundRect, sparklePath } from './glow.js';

const W = 82;
const H = 66;
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

export function drawLoom(ctx, loom, time, accent) {
  if (!sprites) sprites = { glow: makeGlowSprite(P.gold, 160, 0.02), hub: makeGlowSprite('#ffffff', 26, 0.3), ember: makeGlowSprite(P.ember, 120, 0.05) };
  const frac = loom.health / loom.max;
  const torn = Math.round((1 - frac) * LOOM.threads);
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.6);
  ctx.save();
  ctx.translate(LOOM.x, LOOM.y + loom.fall * 24);
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.glow, 0, 0, 1.15 + 0.08 * pulse, (0.5 + 0.15 * pulse) * (0.3 + 0.7 * frac) * (1 - loom.fall * 0.8));
  const danger = frac < 0.3 ? 0.25 + 0.2 * Math.sin(time * 6) : 0;
  if (loom.hurt > 0 || danger) drawSprite(ctx, sprites.ember, 0, 0, 1.3, Math.max(loom.hurt * 0.7, danger));
  const ray = ctx.createLinearGradient(0, 0, 0, -260);
  ray.addColorStop(0, rgba(P.gold, 0.22 * frac));
  ray.addColorStop(1, rgba(P.gold, 0));
  ctx.fillStyle = ray;
  ctx.rotate(time * 0.08);
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    poly(ctx, [{ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 34, y: -260 }, { x: -34, y: -260 }]);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineCap = 'round';
  ctx.strokeStyle = loom.hurt > 0.5 ? P.emberGlow : P.gold;
  ctx.shadowColor = P.gold;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 7;
  line(ctx, -W, -H - 6, -W, H + 6);
  line(ctx, W, -H - 6, W, H + 6);
  ctx.lineWidth = 5;
  line(ctx, -W - 8, -H, W + 8, -H);
  line(ctx, -W - 8, H, W + 8, H);
  ctx.shadowBlur = 0;
  ctx.fillStyle = P.goldLight;
  for (const [x, y] of [[-W, -H - 12], [W, -H - 12], [-W, H + 12], [W, H + 12]]) {
    sparklePath(ctx, x, y, 7, 0.4, 0);
    ctx.fill();
  }
  ctx.lineWidth = 1.6;
  for (let i = 0; i < LOOM.threads; i += 1) {
    const x = -W + 14 + (i * (2 * W - 28)) / (LOOM.threads - 1);
    if ((i * 5) % LOOM.threads < torn) {
      const sway = Math.sin(time * 3 + i) * 5;
      ctx.strokeStyle = rgba(P.emberGlow, 0.8);
      poly(ctx, [{ x, y: -H }, { x: x + sway * 0.4, y: -H + 22 }, { x: x + sway, y: -H + 36 }], false);
      ctx.stroke();
      line(ctx, x, H, x - sway * 0.5, H - 18);
    } else {
      ctx.strokeStyle = rgba(P.cyan, 0.75 + 0.25 * Math.sin(time * 2 + i * 0.7));
      line(ctx, x, -H, x, H);
    }
  }
  const sx = Math.sin(time * 1.3) * (W - 26);
  ctx.fillStyle = P.goldLight;
  poly(ctx, [{ x: sx - 16, y: 10 }, { x: sx, y: 4 }, { x: sx + 16, y: 10 }, { x: sx, y: 16 }]);
  ctx.fill();
  ctx.save();
  ctx.rotate(time * 0.5 * (0.3 + 0.7 * frac));
  ctx.strokeStyle = ctx.shadowColor = accent;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 12;
  disc(ctx, 0, 0, 40, false);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 0;
  for (let i = 0; i < 8; i += 1) line(ctx, 0, 0, Math.cos((i * Math.PI) / 4) * 40, Math.sin((i * Math.PI) / 4) * 40);
  ctx.setLineDash([6, 5]);
  disc(ctx, 0, 0, 26, false);
  ctx.restore();
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.hub, 0, 0, 1.2 + 0.2 * pulse, 0.6 + 0.4 * frac);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  sparklePath(ctx, 0, 0, 12, 0.35, time * 0.7);
  ctx.fill();
  roundRect(ctx, -60, H + 24, 120, 7, 3.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, -60, H + 24, 120 * frac, 7, 3.5);
    ctx.fillStyle = loomColor(frac);
    ctx.fill();
  }
  ctx.restore();
}

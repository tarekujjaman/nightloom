// The Weaver: movement, reach, hearts and the grace after a hit.
import { FIELD, LOOM, WEAVER } from './config.js';

export function createWeaver() {
  return { x: LOOM.x, y: LOOM.y + 160, vx: 0, vy: 0, radius: WEAVER.radius, reach: WEAVER.reach, speedMult: 1, hearts: WEAVER.hearts, maxHearts: WEAVER.hearts, invulnerable: 0, shield: 0, pulse: 0, trail: [] };
}

export function stepWeaver(weaver, control, dt) {
  const speed = WEAVER.speed * weaver.speedMult;
  const ease = 1 - Math.exp(-dt * 14);
  weaver.vx += (control.moveX * speed - weaver.vx) * ease;
  weaver.vy += (control.moveY * speed - weaver.vy) * ease;
  weaver.x = Math.max(weaver.radius, Math.min(FIELD.width - weaver.radius, weaver.x + weaver.vx * dt));
  weaver.y = Math.max(weaver.radius, Math.min(FIELD.height - weaver.radius, weaver.y + weaver.vy * dt));
  weaver.pulse += dt;
  weaver.invulnerable = Math.max(0, weaver.invulnerable - dt);
  weaver.shield = Math.max(0, weaver.shield - dt);
  weaver.trail.push({ x: weaver.x, y: weaver.y });
  if (weaver.trail.length > WEAVER.trailLength) weaver.trail.shift();
}

export const weaverVulnerable = (weaver) => weaver.invulnerable <= 0 && weaver.shield <= 0;

export function hurtWeaver(weaver) {
  weaver.hearts = Math.max(0, weaver.hearts - 1);
  weaver.invulnerable = WEAVER.invulnerable;
  return weaver.hearts === 0;
}

export function growHearts(weaver) {
  weaver.maxHearts = Math.min(WEAVER.maxHearts, weaver.maxHearts + 1);
  weaver.hearts = Math.min(weaver.maxHearts, weaver.hearts + 1);
}

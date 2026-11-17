// Pluck (RMB), Lance (Q) and Star (E): their cooldown, charges and cost, and the lances in flight.
import { ABILITY, FIELD, LOOM, STARS } from './config.js';
import { chainSegments, nearestOnSegment, releaseThread } from './threads.js';
import { knockBack } from './enemies.js';
import { lighter, line, sparklePath } from './glow.js';
import { placedStars, spendStarlight, starCost } from './starlight.js';

export const createAbilities = () => ({ pluck: 0, burst: 0, charges: ABILITY.lanceCharges, recharge: 0, lances: [], flash: { pluck: 0, lance: 0, star: 0 }, faceX: 1, faceY: 0 });

const onField = (x, y, margin) => x > margin && x < FIELD.width - margin && y > margin && y < FIELD.height - margin;

export function stepAbilities(state, control, dt) {
  const a = state.abilities;
  if (control.moveX || control.moveY) [a.faceX, a.faceY] = [control.moveX, control.moveY];
  a.pluck = Math.max(0, a.pluck - dt);
  a.burst = Math.max(0, a.burst - dt * 2.5);
  for (const k in a.flash) a.flash[k] = Math.max(0, a.flash[k] - dt * 3);
  if (a.charges < ABILITY.lanceCharges && (a.recharge += dt) >= ABILITY.lanceRecharge) {
    a.charges += 1;
    a.recharge = 0;
  }
  const pinned = [];
  for (const lance of a.lances) {
    const step = ABILITY.lanceSpeed * dt;
    const px = lance.x;
    const py = lance.y;
    lance.x += lance.dx * step;
    lance.y += lance.dy * step;
    lance.travelled += step;
    for (const moth of state.moths) {
      if (!moth.alive || lance.hit.includes(moth.id) || nearestOnSegment(moth.x, moth.y, px, py, lance.x, lance.y).distance > moth.radius + 6) continue;
      lance.hit.push(moth.id);
      moth.pinned = moth.boss ? 0.8 : ABILITY.lancePin;
      Object.assign(moth, { stun: Math.max(moth.stun, moth.pinned), vx: 0, vy: 0, state: 'drift' });
      pinned.push(moth);
    }
  }
  a.lances = a.lances.filter((l) => l.travelled < ABILITY.lanceRange && onField(l.x, l.y, -40));
  return pinned;
}

export function pluck(state) {
  const a = state.abilities;
  if (a.pluck > 0) return null;
  a.pluck = ABILITY.pluckCooldown;
  a.flash.pluck = 1;
  const { weave, stars, weaver, moths } = state;
  const segments = weave.active ? chainSegments(weave, stars) : [];
  const hit = [];
  for (const moth of moths) {
    if (!moth.alive || moth.boss) continue;
    let from = null;
    if (segments.length) {
      const near = segments.map((s) => nearestOnSegment(moth.x, moth.y, s.ax, s.ay, s.bx, s.by)).sort((p, q) => p.distance - q.distance)[0];
      if (near.distance < ABILITY.pluckReach + moth.radius) from = near;
    } else if (Math.hypot(moth.x - weaver.x, moth.y - weaver.y) < ABILITY.pluckBurst + moth.radius) from = weaver;
    if (!from) continue;
    knockBack(moth, from.x, from.y);
    moth.stun = ABILITY.pluckStun;
    hit.push(moth);
  }
  weave.pluckWave = 1;
  if (!segments.length) a.burst = 1;
  return hit;
}

export function fireLance(state, control) {
  const a = state.abilities;
  if (a.charges <= 0) return false;
  a.charges -= 1;
  a.flash.lance = 1;
  const { weaver } = state;
  let dx = a.faceX;
  let dy = a.faceY;
  if (!control.moveX && !control.moveY && onField(control.cursorX, control.cursorY, 0)) {
    const d = Math.hypot(control.cursorX - weaver.x, control.cursorY - weaver.y) || 1;
    dx = (control.cursorX - weaver.x) / d;
    dy = (control.cursorY - weaver.y) / d;
  }
  a.lances.push({ x: weaver.x + dx * 20, y: weaver.y + dy * 20, dx, dy, travelled: 0, hit: [] });
  return true;
}

export function placeStar(state) {
  const { weaver, stars } = state;
  const { x, y } = weaver;
  if (state.starlight.have < starCost(state)) return 'poor';
  if (!onField(x, y, 40) || Math.hypot(x - LOOM.x, y - LOOM.y) < LOOM.radius + 50 || stars.some((s) => Math.hypot(s.x - x, s.y - y) < STARS.placedSpacing)) return 'blocked';
  spendStarlight(state.starlight, starCost(state));
  if (placedStars(state) >= STARS.maxPlaced) {
    releaseThread(state.weave);
    stars.splice(stars.findIndex((s) => s.placed), 1);
  }
  stars.push({ x, y, size: 7, phase: state.random.angle(), twinkle: 2, placed: true });
  state.stats.starsPlaced += 1;
  state.abilities.flash.star = 1;
  return 'ok';
}

export function drawLances(ctx, lances, time) {
  ctx.save();
  lighter(ctx);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#74f3ff';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(255, 242, 196, 0.9)';
  ctx.fillStyle = '#ffffff';
  for (const l of lances) {
    line(ctx, l.x - l.dx * 70, l.y - l.dy * 70, l.x, l.y);
    sparklePath(ctx, l.x, l.y, 8, 0.3, time * 10);
    ctx.fill();
  }
  ctx.restore();
}

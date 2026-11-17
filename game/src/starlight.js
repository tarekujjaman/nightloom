// Starlight: captures pay it out as motes that fly to the HUD counter; stars and cards spend it.
import { ARENA, STARLIGHT } from './config.js';
import { drawSprite, lighter, line, makeGlowSprite, sparklePath } from './glow.js';

const TARGET = { x: 792 - ARENA.x, y: 34 - ARENA.y };
let sprite = null;

export function createStarlight() {
  return { have: STARLIGHT.start, shown: STARLIGHT.start, earned: 0, spent: 0, motes: [], pop: 0 };
}

export function earnStarlight(state, amount, x, y) {
  const st = state.starlight;
  const { random } = state;
  st.have += amount;
  st.earned += amount;
  const count = Math.min(10, Math.max(1, Math.round(amount / 4)));
  const each = Math.floor(amount / count);
  for (let i = 0; i < count; i += 1) {
    const a = random.angle();
    const r = random.range(10, 50);
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r;
    st.motes.push({ sx, sy, x: sx, y: sy, cx: x + random.range(-220, 220), cy: y - random.range(80, 260), age: -i * 0.05, life: random.range(0.8, 1.1), value: each + (i === 0 ? amount - each * count : 0) });
  }
}

export function spendStarlight(st, amount) {
  if (st.have < amount) return false;
  st.have -= amount;
  st.shown -= amount;
  st.spent += amount;
  st.pop = 1;
  return true;
}

export function stepStarlight(st, dt) {
  st.pop = Math.max(0, st.pop - dt * 3);
  for (const m of st.motes) {
    m.age += dt;
    const e = Math.min(1, Math.max(0, m.age / m.life)) ** 2;
    const u = 1 - e;
    m.x = u * u * m.sx + 2 * u * e * m.cx + e * e * TARGET.x;
    m.y = u * u * m.sy + 2 * u * e * m.cy + e * e * TARGET.y;
    if (m.age >= m.life) {
      st.shown += m.value;
      st.pop = 1;
    }
  }
  st.motes = st.motes.filter((m) => m.age < m.life);
}

export function drawMotes(ctx, st, time) {
  if (!sprite) sprite = makeGlowSprite('#ffd36b', 14, 0.3);
  ctx.save();
  lighter(ctx);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 211, 107, 0.6)';
  for (const m of st.motes) {
    if (m.age < 0) continue;
    const e = (m.age / m.life) ** 2;
    const dx = (1 - e) * (m.cx - m.sx) + e * (TARGET.x - m.cx);
    const dy = (1 - e) * (m.cy - m.sy) + e * (TARGET.y - m.cy);
    const d = Math.hypot(dx, dy) || 1;
    line(ctx, m.x - (dx / d) * 26, m.y - (dy / d) * 26, m.x, m.y);
    drawSprite(ctx, sprite, m.x, m.y, 2, 0.95);
    ctx.fillStyle = '#fff6d8';
    sparklePath(ctx, m.x, m.y, 6 + 2 * Math.sin(time * 20 + m.sx), 0.35, time * 4);
    ctx.fill();
  }
  ctx.restore();
}

export const placedStars = (state) => state.stars.filter((star) => star.placed).length;
export const starCost = (state) => STARLIGHT.star + STARLIGHT.starStep * placedStars(state);

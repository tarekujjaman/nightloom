// Sparks, floating labels, screen shake and colour flashes: feedback that is not part of the rules.

export function createEffects() {
  return { particles: [], texts: [], shake: 0, shakeX: 0, shakeY: 0, redFlash: 0, goldFlash: 0, cyanFlash: 0 };
}

/** `count` sparks from (x, y) in every direction. */
export function burst(effects, random, x, y, { count = 16, colors = ['#ffd36b'], speed = 220, life = 0.7, size = 3, drag = 2.5, gravity = 0 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = random.angle();
    const velocity = speed * (0.35 + random.next() * 0.65);
    effects.particles.push({
      x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: life * (0.6 + random.next() * 0.4), age: 0,
      size: size * (0.6 + random.next() * 0.8), color: colors[Math.floor(random.next() * colors.length)], drag, gravity,
    });
  }
}

export function edgeSparks(effects, random, polygon, colors) {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const count = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 28));
    for (let k = 0; k < count; k += 1) {
      const t = (k + random.next()) / count;
      burst(effects, random, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, { count: 1, colors, speed: 70, life: 0.6, size: 2.4, drag: 3 });
    }
  }
}

export function floatText(effects, x, y, text, { color = '#ffd36b', size = 28, life = 1.3, rise = 46 } = {}) {
  effects.texts.push({ x, y, text, color, size, life, age: 0, rise });
}

export function addShake(effects, amount) {
  effects.shake = Math.min(28, effects.shake + amount);
}

export function stepEffects(effects, random, dt) {
  for (const p of effects.particles) {
    p.age += dt;
    const slow = Math.exp(-p.drag * dt);
    p.vx *= slow;
    p.vy = p.vy * slow + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  effects.particles = effects.particles.filter((p) => p.age < p.life);
  if (effects.particles.length > 900) effects.particles.splice(0, effects.particles.length - 900);
  for (const t of effects.texts) t.age += dt;
  effects.texts = effects.texts.filter((t) => t.age < t.life);
  effects.shake = Math.max(0, effects.shake - dt * 40);
  effects.shakeX = effects.shake > 0 ? (random.next() * 2 - 1) * effects.shake : 0;
  effects.shakeY = effects.shake > 0 ? (random.next() * 2 - 1) * effects.shake : 0;
  effects.redFlash = Math.max(0, effects.redFlash - dt * 2.2);
  effects.goldFlash = Math.max(0, effects.goldFlash - dt * 1.6);
  effects.cyanFlash = Math.max(0, effects.cyanFlash - dt * 1.2);
}

// Feedback that is not part of the rules: sparks that burst when a moth is captured, embers when
// the Weaver is hit, floating score labels, the screen shake and the full-screen colour flashes.

/** Empty effect pools. */
export function createEffects() {
  return { particles: [], texts: [], shake: 0, shakeX: 0, shakeY: 0, redFlash: 0, goldFlash: 0, cyanFlash: 0 };
}

/** `count` sparks from (x, y) in every direction. */
export function burst(effects, random, x, y, { count = 16, colors = ['#ffd36b'], speed = 220, life = 0.7, size = 3, drag = 2.5, gravity = 0, spread = Math.PI * 2, direction = 0 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = direction + (random.next() - 0.5) * spread;
    const velocity = speed * (0.35 + random.next() * 0.65);
    effects.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: life * (0.6 + random.next() * 0.4),
      age: 0,
      size: size * (0.6 + random.next() * 0.8),
      color: colors[Math.floor(random.next() * colors.length)],
      drag,
      gravity,
    });
  }
}

/** A ring of sparks that expands along a polygon's edges when it snaps shut. */
export function edgeSparks(effects, random, polygon, colors) {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(2, Math.floor(length / 28));
    for (let k = 0; k < count; k += 1) {
      const t = (k + random.next()) / count;
      burst(effects, random, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, { count: 1, colors, speed: 70, life: 0.6, size: 2.4, drag: 3 });
    }
  }
}

/** A label that drifts upward and fades. */
export function floatText(effects, x, y, text, { color = '#ffd36b', size = 28, life = 1.3, rise = 46 } = {}) {
  effects.texts.push({ x, y, text, color, size, life, age: 0, rise });
}

/** Kick the screen; the shake decays on its own. */
export function addShake(effects, amount) {
  effects.shake = Math.min(28, effects.shake + amount);
}

/** Advance sparks, labels and shake by `dt`. */
export function stepEffects(effects, random, dt) {
  for (const p of effects.particles) {
    p.age += dt;
    const slow = Math.exp(-p.drag * dt);
    p.vx *= slow;
    p.vy *= slow;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  effects.particles = effects.particles.filter((p) => p.age < p.life);
  if (effects.particles.length > 900) effects.particles.splice(0, effects.particles.length - 900);
  for (const t of effects.texts) t.age += dt;
  effects.texts = effects.texts.filter((t) => t.age < t.life);
  if (effects.shake > 0) {
    effects.shake = Math.max(0, effects.shake - dt * 40);
    effects.shakeX = (random.next() * 2 - 1) * effects.shake;
    effects.shakeY = (random.next() * 2 - 1) * effects.shake;
  } else {
    effects.shakeX = 0;
    effects.shakeY = 0;
  }
  effects.redFlash = Math.max(0, effects.redFlash - dt * 2.2);
  effects.goldFlash = Math.max(0, effects.goldFlash - dt * 1.6);
  effects.cyanFlash = Math.max(0, effects.cyanFlash - dt * 1.2);
}

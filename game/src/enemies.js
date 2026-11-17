// The void-moths: how each kind spawns and flies at the Loom, and what a loop or the Weaver can touch.
import { ATTRACT, FIELD, LOOM, MOTHS, SPAWN, WEAVE } from './config.js';
import { chainSegments, nearestOnSegment } from './threads.js';

let nextId = 1;

export function spawnMoth(kind, x, y, random, speedScale = 1) {
  const spec = MOTHS[kind];
  return {
    id: (nextId += 1), kind, x, y, radius: spec.radius, points: spec.points, speed: spec.speed * speedScale, speedScale,
    heading: Math.atan2(LOOM.y - y, LOOM.x - x) + random.range(-0.7, 0.7), vx: 0, vy: 0, flap: random.angle(), turn: random.range(-0.8, 0.8),
    state: 'drift', timer: random.range(1.2, 3), age: 0, burn: 0, stun: 0, pinned: 0, alive: true, parent: null, boss: false, veils: 0, maxVeils: 0,
    escortTimer: 0, shedTimer: kind === 'splitter' ? spec.shedEvery * 0.6 : 0, chew: 0, chewSegment: -1, aimX: 0, aimY: 0, visible: 1,
    fadeTimer: kind === 'phantom' ? spec.shown * random.range(0.4, 1) : 0,
  };
}

export function edgeSpawnPoint(random, attract = false) {
  const side = attract ? random.int(1, 2) * 2 - 1 : random.int(0, 3);
  const inset = -SPAWN.edgeInset;
  const along = attract ? random.range(ATTRACT.top + 40, ATTRACT.bottom - 40) : random.range(80, (side % 2 ? FIELD.height : FIELD.width) - 80);
  if (side % 2) return { x: side === 1 ? FIELD.width - inset : inset, y: along };
  return { x: along, y: side === 0 ? inset : FIELD.height - inset };
}

export function steerToward(moth, tx, ty, rate, dt) {
  let delta = Math.atan2(ty - moth.y, tx - moth.x) - moth.heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  moth.heading += Math.max(-rate * dt, Math.min(rate * dt, delta));
}

function keepInField(moth, world, dt) {
  const top = world.attract ? ATTRACT.top + 30 : 40;
  const bottom = world.attract ? ATTRACT.bottom - 30 : FIELD.height - 40;
  if (moth.x < 40 || moth.x > FIELD.width - 40 || moth.y < top || moth.y > bottom) steerToward(moth, FIELD.width / 2, (top + bottom) / 2, 3.5, dt);
}

export function advance(moth, speed, dt) {
  moth.vx = Math.cos(moth.heading) * speed;
  moth.vy = Math.sin(moth.heading) * speed;
  moth.x += moth.vx * dt;
  moth.y += moth.vy * dt;
}

function hunt(moth, world, dt, turn, speed) {
  moth.turn = Math.max(-1.6, Math.min(1.6, moth.turn + (world.random.next() - 0.5) * 6 * dt));
  moth.heading += moth.turn * dt;
  steerToward(moth, LOOM.x, LOOM.y, world.attract ? turn * 0.4 : turn, dt);
  keepInField(moth, world, dt);
  advance(moth, speed, dt);
}

export function lunge(moth, world, dt, aim, dash, rest) {
  moth.timer -= dt;
  if (moth.state === 'aim') {
    steerToward(moth, world.weaver.x, world.weaver.y, 6, dt);
    advance(moth, moth.speed * 0.15, dt);
    moth.aimX = world.weaver.x;
    moth.aimY = world.weaver.y;
    if (moth.timer <= 0) {
      moth.state = 'dash';
      moth.timer = dash;
      moth.heading = Math.atan2(moth.aimY - moth.y, moth.aimX - moth.x);
    }
    return true;
  }
  if (moth.state === 'dash') {
    advance(moth, MOTHS[moth.kind].dashSpeed * moth.speedScale, dt);
    if (moth.timer <= 0) {
      moth.state = 'drift';
      moth.timer = rest();
    }
    return true;
  }
  if (moth.timer <= 0) {
    moth.state = 'aim';
    moth.timer = aim;
  }
  return false;
}

function stepSplitter(moth, world, dt) {
  const spec = MOTHS.splitter;
  hunt(moth, world, dt, 0.25, moth.speed);
  if ((moth.shedTimer -= dt) > 0) return;
  moth.shedTimer = spec.shedEvery;
  if (world.moths.filter((other) => other.alive && other.parent === moth.id).length >= spec.maxMites || moth.x < 0 || moth.x > FIELD.width || moth.y < 0 || moth.y > FIELD.height) return;
  for (const side of [1, -1]) world.pending.push(Object.assign(spawnMoth('mite', moth.x, moth.y, world.random, moth.speedScale), { parent: moth.id, heading: moth.heading + side * world.random.range(1.4, 2.4) }));
}

function stepMite(moth, world, dt) {
  if ((moth.timer -= dt) <= 0) {
    moth.timer = world.random.range(0.3, 0.9);
    moth.heading = world.random.chance(0.5) ? Math.atan2(world.weaver.y - moth.y, world.weaver.x - moth.x) + world.random.range(-0.8, 0.8) : world.random.angle();
  }
  keepInField(moth, world, dt);
  advance(moth, moth.speed, dt);
}

function stepCutter(moth, world, dt) {
  const segments = world.weave.active && !world.upgrades.moonspool ? chainSegments(world.weave, world.stars) : [];
  if (segments.length === 0) {
    moth.state = 'drift';
    moth.chew = 0;
    moth.chewSegment = -1;
    hunt(moth, world, dt, 0.7, moth.speed * 0.7);
    return false;
  }
  const best = segments.map((s) => ({ ...nearestOnSegment(moth.x, moth.y, s.ax, s.ay, s.bx, s.by), index: s.index })).sort((p, q) => p.distance - q.distance)[0];
  if (best.index !== moth.chewSegment) {
    moth.chew = 0;
    moth.chewSegment = best.index;
  }
  if (best.distance > 7) {
    moth.state = 'hunt';
    steerToward(moth, best.x, best.y, 7, dt);
    advance(moth, moth.speed, dt);
    moth.chew = Math.max(0, moth.chew - dt);
    return false;
  }
  moth.state = 'chew';
  moth.x = best.x;
  moth.y = best.y;
  moth.chew += dt;
  const needed = world.upgrades.steady ? WEAVE.steadyCutSeconds : WEAVE.cutSeconds;
  world.weave.cut = { segment: best.index, x: best.x, y: best.y, progress: Math.min(1, moth.chew / needed) };
  if (moth.chew < needed) return false;
  moth.chew = 0;
  moth.chewSegment = -1;
  moth.state = 'drift';
  return true;
}

function stepPhantom(moth, world, dt) {
  const spec = MOTHS.phantom;
  if ((moth.fadeTimer -= dt) <= 0) {
    moth.state = moth.state === 'fade' ? 'drift' : 'fade';
    moth.fadeTimer = moth.state === 'fade' ? spec.hidden : spec.shown;
  }
  const target = moth.state === 'fade' ? 0.12 : 1;
  moth.visible += Math.max(-dt / spec.fade, Math.min(dt / spec.fade, target - moth.visible));
  hunt(moth, world, dt, 0.5, moth.speed * (moth.state === 'fade' ? 1.4 : 1));
}

export function stepCommon(moth, dt) {
  moth.age += dt;
  moth.flap += dt * (moth.boss ? 3 : moth.kind === 'mite' ? 26 : 13);
  moth.pinned = Math.max(0, moth.pinned - dt);
  if (moth.stun <= 0) return false;
  moth.stun -= dt;
  const slow = Math.exp(-3 * dt);
  moth.vx *= slow;
  moth.vy *= slow;
  moth.x += moth.vx * dt;
  moth.y += moth.vy * dt;
  if (moth.vx !== 0 || moth.vy !== 0) moth.heading = Math.atan2(moth.vy, moth.vx);
  return true;
}

export function stepMoth(moth, world, dt) {
  if (stepCommon(moth, dt)) return false;
  if (moth.kind === 'cutter') return stepCutter(moth, world, dt);
  if (moth.kind === 'dasher') {
    if (!lunge(moth, world, dt, 0.55, 0.38, () => world.random.range(1.6, 3.2))) hunt(moth, world, dt, 0.6, moth.speed);
  } else if (moth.kind === 'splitter') stepSplitter(moth, world, dt);
  else if (moth.kind === 'mite') stepMite(moth, world, dt);
  else if (moth.kind === 'phantom') stepPhantom(moth, world, dt);
  else hunt(moth, world, dt, moth.kind === 'warden' ? 0.3 : 0.45, moth.speed);
  return false;
}

export function mothCapturable(moth, moths) {
  if (moth.visible <= 0.6) return false;
  return moth.kind === 'warden' || moth.boss || !moths.some((other) => other.alive && other.kind === 'warden' && Math.hypot(other.x - moth.x, other.y - moth.y) < MOTHS.warden.shieldRadius);
}

export const mothTouchesWeaver = (moth, weaver) => moth.visible > 0.6 && Math.hypot(moth.x - weaver.x, moth.y - weaver.y) < moth.radius + weaver.radius;

export function knockBack(moth, x, y) {
  const angle = Math.atan2(moth.y - y, moth.x - x);
  const push = moth.boss ? 60 : 320;
  Object.assign(moth, { vx: Math.cos(angle) * push, vy: Math.sin(angle) * push, stun: moth.boss ? 0.4 : 0.9, state: 'drift' });
}

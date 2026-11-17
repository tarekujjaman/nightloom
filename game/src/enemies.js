// The void-moths: how each kind spawns and moves (bosses are in bosses.js), and what a loop or the Weaver can touch.
import { FIELD, LOOM, MOTHS, SPAWN } from './config.js';
import { chainSegments, nearestOnSegment } from './threads.js';

let nextId = 1;

/** A moth of `kind` at (x, y), heading roughly for the middle of the sky. */
export function spawnMoth(kind, x, y, random, speedScale = 1) {
  const spec = MOTHS[kind];
  nextId += 1;
  return {
    id: nextId, kind, x, y, radius: spec.radius, points: spec.points, speed: spec.speed * speedScale, speedScale,
    heading: Math.atan2(FIELD.height / 2 - y, FIELD.width / 2 - x) + random.range(-0.7, 0.7), vx: 0, vy: 0,
    flap: random.angle(), turn: random.range(-0.8, 0.8), state: 'drift', timer: random.range(1.2, 3), age: 0, burn: 0, stun: 0,
    alive: true, parent: null, boss: false, veils: 0, maxVeils: 0, escortTimer: 0, shedTimer: kind === 'splitter' ? spec.shedEvery * 0.6 : 0,
    chew: 0, chewSegment: -1, wake: [], aimX: 0, aimY: 0, visible: 1, fadeTimer: kind === 'phantom' ? spec.shown * random.range(0.4, 1) : 0,
  };
}

/** A point just outside a random edge of the field. */
export function edgeSpawnPoint(random) {
  const side = random.int(0, 3);
  const inset = -SPAWN.edgeInset;
  if (side === 0) return { x: random.range(80, FIELD.width - 80), y: inset };
  if (side === 1) return { x: FIELD.width - inset, y: random.range(80, FIELD.height - 80) };
  if (side === 2) return { x: random.range(80, FIELD.width - 80), y: FIELD.height - inset };
  return { x: inset, y: random.range(80, FIELD.height - 80) };
}

/** Turn `moth.heading` toward (tx, ty) by at most `rate` radians per second. */
export function steerToward(moth, tx, ty, rate, dt) {
  let delta = Math.atan2(ty - moth.y, tx - moth.x) - moth.heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  moth.heading += Math.max(-rate * dt, Math.min(rate * dt, delta));
}

function keepInField(moth, dt) {
  if (moth.x < 40 || moth.x > FIELD.width - 40 || moth.y < 40 || moth.y > FIELD.height - 40) steerToward(moth, FIELD.width / 2, FIELD.height / 2, 3.5, dt);
}

function wander(moth, random, dt, strength = 1) {
  moth.turn = Math.max(-1.6, Math.min(1.6, moth.turn + (random.next() - 0.5) * 6 * dt));
  moth.heading += moth.turn * strength * dt;
}

/** Move along the heading at `speed`. */
export function advance(moth, speed, dt) {
  moth.vx = Math.cos(moth.heading) * speed;
  moth.vy = Math.sin(moth.heading) * speed;
  moth.x += moth.vx * dt;
  moth.y += moth.vy * dt;
}

function hunt(moth, world, dt, turn, speed) {
  wander(moth, world.random, dt);
  steerToward(moth, world.weaver.x, world.weaver.y, turn, dt);
  keepInField(moth, dt);
  advance(moth, speed, dt);
}

function stepDasher(moth, world, dt) {
  moth.timer -= dt;
  if (moth.state === 'drift') {
    hunt(moth, world, dt, 0.6, moth.speed);
    if (moth.timer <= 0) {
      moth.state = 'aim';
      moth.timer = 0.55;
    }
  } else if (moth.state === 'aim') {
    steerToward(moth, world.weaver.x, world.weaver.y, 6, dt);
    advance(moth, moth.speed * 0.15, dt);
    moth.aimX = world.weaver.x;
    moth.aimY = world.weaver.y;
    if (moth.timer <= 0) {
      moth.state = 'dash';
      moth.timer = 0.38;
      moth.heading = Math.atan2(moth.aimY - moth.y, moth.aimX - moth.x);
    }
  } else {
    advance(moth, MOTHS.dasher.dashSpeed * moth.speedScale, dt);
    moth.wake.push({ x: moth.x, y: moth.y });
    if (moth.wake.length > 10) moth.wake.shift();
    if (moth.timer <= 0) {
      moth.state = 'drift';
      moth.timer = world.random.range(1.6, 3.2);
    }
  }
  if (moth.state !== 'dash' && moth.wake.length > 0) moth.wake.shift();
}

function stepSplitter(moth, world, dt) {
  const spec = MOTHS.splitter;
  hunt(moth, world, dt, 0.25, moth.speed);
  moth.shedTimer -= dt;
  if (moth.shedTimer > 0) return null;
  moth.shedTimer = spec.shedEvery;
  let mites = 0;
  for (const other of world.moths) if (other.alive && other.parent === moth.id) mites += 1;
  if (mites >= spec.maxMites || moth.x < 0 || moth.x > FIELD.width || moth.y < 0 || moth.y > FIELD.height) return null;
  for (let i = 0; i < 2; i += 1) {
    const mite = spawnMoth('mite', moth.x, moth.y, world.random, moth.speedScale);
    mite.parent = moth.id;
    mite.heading = moth.heading + (i === 0 ? 1 : -1) * world.random.range(1.4, 2.4);
    world.pending.push(mite);
  }
  return 'shed';
}

function stepMite(moth, world, dt) {
  moth.timer -= dt;
  if (moth.timer <= 0) {
    moth.timer = world.random.range(0.3, 0.9);
    moth.heading = world.random.chance(0.5) ? Math.atan2(world.weaver.y - moth.y, world.weaver.x - moth.x) + world.random.range(-0.8, 0.8) : world.random.angle();
  }
  keepInField(moth, dt);
  advance(moth, moth.speed, dt);
}

function stepCutter(moth, world, dt) {
  const segments = world.loom.active && !world.upgrades.moonspool ? chainSegments(world.loom, world.stars) : [];
  if (segments.length === 0) {
    moth.state = 'drift';
    moth.chew = 0;
    moth.chewSegment = -1;
    hunt(moth, world, dt, 0.7, moth.speed * 0.7);
    return null;
  }
  let best = null;
  for (const segment of segments) {
    const near = nearestOnSegment(moth.x, moth.y, segment.ax, segment.ay, segment.bx, segment.by);
    if (best === null || near.distance < best.distance) best = { ...near, index: segment.index };
  }
  if (best.index !== moth.chewSegment) {
    moth.chew = 0;
    moth.chewSegment = best.index;
  }
  if (best.distance > 7) {
    moth.state = 'hunt';
    steerToward(moth, best.x, best.y, 7, dt);
    advance(moth, moth.speed, dt);
    moth.chew = Math.max(0, moth.chew - dt);
    return null;
  }
  moth.state = 'chew';
  moth.x = best.x;
  moth.y = best.y;
  moth.chew += dt;
  const needed = world.upgrades.steady ? LOOM.steadyCutSeconds : LOOM.cutSeconds;
  world.loom.cut = { segment: best.index, x: best.x, y: best.y, progress: Math.min(1, moth.chew / needed) };
  if (moth.chew < needed) return null;
  moth.chew = 0;
  moth.chewSegment = -1;
  moth.state = 'drift';
  return 'cut';
}

function stepPhantom(moth, world, dt) {
  const spec = MOTHS.phantom;
  moth.fadeTimer -= dt;
  if (moth.fadeTimer <= 0) {
    moth.state = moth.state === 'fade' ? 'drift' : 'fade';
    moth.fadeTimer = moth.state === 'fade' ? spec.hidden : spec.shown;
  }
  const target = moth.state === 'fade' ? 0.12 : 1;
  moth.visible += Math.max(-dt / spec.fade, Math.min(dt / spec.fade, target - moth.visible));
  hunt(moth, world, dt, 0.5, moth.speed * (moth.state === 'fade' ? 1.4 : 1));
}

/** Age, flap and the stun slide shared by every moth; returns true while the moth is stunned. */
export function stepCommon(moth, dt) {
  moth.age += dt;
  moth.flap += dt * (moth.boss ? 3 : moth.kind === 'mite' ? 26 : 13);
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

/** Advance one ordinary moth by `dt`; returns 'cut' or 'shed' when it did that, else null. */
export function stepMoth(moth, world, dt) {
  if (stepCommon(moth, dt)) return null;
  switch (moth.kind) {
    case 'dasher': stepDasher(moth, world, dt); return null;
    case 'splitter': return stepSplitter(moth, world, dt);
    case 'mite': stepMite(moth, world, dt); return null;
    case 'cutter': return stepCutter(moth, world, dt);
    case 'phantom': stepPhantom(moth, world, dt); return null;
    case 'warden': hunt(moth, world, dt, 0.3, moth.speed); return null;
    default: hunt(moth, world, dt, 0.45, moth.speed); return null;
  }
}

/** The living warden whose shield covers `moth`, or null. */
export function shieldedBy(moth, moths) {
  if (moth.kind === 'warden' || moth.boss) return null;
  return moths.find((other) => other.alive && other.kind === 'warden' && Math.hypot(other.x - moth.x, other.y - moth.y) < MOTHS.warden.shieldRadius) || null;
}

/** True when a loop closed around the moth would take it: it is not faded and no warden shields it. */
export function mothCapturable(moth, moths) {
  return moth.visible > 0.6 && !shieldedBy(moth, moths);
}

/** True when the moth's body overlaps the Weaver (a faded phantom passes through). */
export function mothTouchesWeaver(moth, weaver) {
  return moth.visible > 0.6 && Math.hypot(moth.x - weaver.x, moth.y - weaver.y) < moth.radius + weaver.radius;
}

/** Throw the moth away from (x, y) and stun it for a moment, so one touch is one hit. */
export function knockBack(moth, x, y) {
  const angle = Math.atan2(moth.y - y, moth.x - x);
  const push = moth.boss ? 60 : 320;
  moth.vx = Math.cos(angle) * push;
  moth.vy = Math.sin(angle) * push;
  moth.stun = moth.boss ? 0.4 : 0.9;
  moth.state = 'drift';
}

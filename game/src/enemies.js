// The void-moths: how each kind is born at the edge of the dark and how it moves. Drifters wander
// toward the Weaver, dashers aim and lunge, splitters shed mites, cutters hunt the held thread and
// chew through it, and the Eclipse Moth circles the sky and loses a veil to every loop closed on it.
import { FIELD, LOOM, MOTHS, SPAWN } from './config.js';
import { chainSegments, nearestOnSegment } from './threads.js';

let nextId = 1;

/** A moth of `kind` at (x, y), heading roughly for the middle of the sky. */
export function spawnMoth(kind, x, y, random, speedScale = 1) {
  const spec = MOTHS[kind];
  const heading = Math.atan2(FIELD.height / 2 - y, FIELD.width / 2 - x) + random.range(-0.7, 0.7);
  const speed = spec.speed * speedScale;
  nextId += 1;
  return {
    id: nextId,
    kind,
    x,
    y,
    radius: spec.radius,
    points: spec.points,
    speed,
    speedScale,
    heading,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    flap: random.angle(),
    turn: random.range(-0.8, 0.8),
    state: 'drift',
    timer: random.range(1.2, 3),
    age: 0,
    burn: 0,
    stun: 0,
    alive: true,
    parent: null,
    shedTimer: kind === 'splitter' ? spec.shedEvery * 0.6 : 0,
    veils: 0,
    maxVeils: 0,
    escortTimer: kind === 'eclipse' ? spec.escortEvery * 0.5 : 0,
    chew: 0,
    chewSegment: -1,
    wake: [],
    aimX: 0,
    aimY: 0,
  };
}

/** A point just outside a random edge of the field. */
export function edgeSpawnPoint(random) {
  const side = random.int(0, 3);
  const inset = -SPAWN.edgeInset;
  if (side === 0) return { x: random.range(80, FIELD.width - 80), y: inset };
  if (side === 1) return { x: FIELD.width - inset, y: random.range(120, FIELD.height - 80) };
  if (side === 2) return { x: random.range(80, FIELD.width - 80), y: FIELD.height - inset };
  return { x: inset, y: random.range(120, FIELD.height - 80) };
}

/** Turn `moth.heading` toward (tx, ty) by at most `rate` radians per second. */
function steerToward(moth, tx, ty, rate, dt) {
  const wanted = Math.atan2(ty - moth.y, tx - moth.x);
  let delta = wanted - moth.heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const step = rate * dt;
  moth.heading += Math.max(-step, Math.min(step, delta));
}

/** Nudge a moth that has strayed out of the field back toward its middle. */
function keepInField(moth, dt) {
  const inset = 40;
  if (moth.x < inset || moth.x > FIELD.width - inset || moth.y < inset || moth.y > FIELD.height - inset) {
    steerToward(moth, FIELD.width / 2, FIELD.height / 2, 3.5, dt);
  }
}

/** A gentle wander: the turn rate drifts, and the heading follows it. */
function wander(moth, random, dt, strength = 1) {
  moth.turn += (random.next() - 0.5) * 6 * dt;
  moth.turn = Math.max(-1.6, Math.min(1.6, moth.turn));
  moth.heading += moth.turn * strength * dt;
}

/** Move along the heading at `speed`. */
function advance(moth, speed, dt) {
  moth.vx = Math.cos(moth.heading) * speed;
  moth.vy = Math.sin(moth.heading) * speed;
  moth.x += moth.vx * dt;
  moth.y += moth.vy * dt;
}

function stepDrifter(moth, world, dt) {
  wander(moth, world.random, dt);
  steerToward(moth, world.weaver.x, world.weaver.y, 0.45, dt);
  keepInField(moth, dt);
  advance(moth, moth.speed, dt);
}

function stepDasher(moth, world, dt) {
  const spec = MOTHS.dasher;
  moth.timer -= dt;
  if (moth.state === 'drift') {
    wander(moth, world.random, dt);
    steerToward(moth, world.weaver.x, world.weaver.y, 0.6, dt);
    keepInField(moth, dt);
    advance(moth, moth.speed, dt);
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
    advance(moth, spec.dashSpeed * moth.speedScale, dt);
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
  wander(moth, world.random, dt, 0.7);
  steerToward(moth, world.weaver.x, world.weaver.y, 0.25, dt);
  keepInField(moth, dt);
  advance(moth, moth.speed, dt);
  moth.shedTimer -= dt;
  if (moth.shedTimer <= 0) {
    moth.shedTimer = spec.shedEvery;
    let mites = 0;
    for (const other of world.moths) if (other.alive && other.parent === moth.id) mites += 1;
    if (mites < spec.maxMites && moth.x > 0 && moth.x < FIELD.width && moth.y > 0 && moth.y < FIELD.height) {
      for (let i = 0; i < 2; i += 1) {
        const mite = spawnMoth('mite', moth.x, moth.y, world.random, moth.speedScale);
        mite.parent = moth.id;
        mite.heading = moth.heading + (i === 0 ? 1 : -1) * world.random.range(1.4, 2.4);
        world.pending.push(mite);
      }
      return 'shed';
    }
  }
  return null;
}

function stepMite(moth, world, dt) {
  moth.timer -= dt;
  if (moth.timer <= 0) {
    moth.timer = world.random.range(0.3, 0.9);
    if (world.random.chance(0.5)) moth.heading = Math.atan2(world.weaver.y - moth.y, world.weaver.x - moth.x) + world.random.range(-0.8, 0.8);
    else moth.heading = world.random.angle();
  }
  keepInField(moth, dt);
  advance(moth, moth.speed, dt);
}

/** The cutter hunts the nearest held thread; it returns 'cut' when it has chewed through one. */
function stepCutter(moth, world, dt) {
  const segments = world.loom.active ? chainSegments(world.loom, world.stars) : [];
  if (segments.length === 0) {
    moth.state = 'drift';
    moth.chew = 0;
    moth.chewSegment = -1;
    wander(moth, world.random, dt);
    steerToward(moth, world.weaver.x, world.weaver.y, 0.7, dt);
    keepInField(moth, dt);
    advance(moth, moth.speed * 0.7, dt);
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
  if (moth.chew >= needed) {
    moth.chew = 0;
    moth.chewSegment = -1;
    moth.state = 'drift';
    return 'cut';
  }
  return null;
}

/** The Eclipse Moth circles the sky's middle and releases escorts from its dark; its veils fall to loops. */
function stepEclipse(moth, world, dt) {
  const spec = MOTHS.eclipse;
  const t = moth.age;
  const targetX = FIELD.width / 2 + Math.sin(t * 0.21) * 400;
  const targetY = FIELD.height / 2 + 30 + Math.cos(t * 0.33) * 190;
  steerToward(moth, targetX, targetY, 1.2, dt);
  advance(moth, moth.speed, dt);
  moth.escortTimer -= dt;
  if (moth.escortTimer <= 0) {
    moth.escortTimer = spec.escortEvery;
    let escorts = 0;
    for (const other of world.moths) if (other.alive && other.parent === moth.id) escorts += 1;
    if (escorts < spec.maxEscorts) {
      for (let i = 0; i < 2; i += 1) {
        const kind = world.random.chance(0.35) ? 'dasher' : 'drifter';
        const escort = spawnMoth(kind, moth.x, moth.y, world.random, moth.speedScale);
        escort.parent = moth.id;
        escort.heading = world.random.angle();
        escort.stun = 0.5;
        escort.vx = Math.cos(escort.heading) * 240;
        escort.vy = Math.sin(escort.heading) * 240;
        world.pending.push(escort);
      }
      return 'escort';
    }
  }
  return null;
}

/**
 * Advance one moth by `dt` (already scaled by slow time). Returns 'cut' when a cutter severed a
 * thread (the segment is in `world.loom.cut`), 'shed' or 'escort' when it released moths, else null.
 */
export function stepMoth(moth, world, dt) {
  moth.age += dt;
  moth.flap += dt * (moth.kind === 'eclipse' ? 3 : moth.kind === 'mite' ? 26 : 13);
  if (moth.stun > 0) {
    moth.stun -= dt;
    const slow = Math.exp(-3 * dt);
    moth.vx *= slow;
    moth.vy *= slow;
    moth.x += moth.vx * dt;
    moth.y += moth.vy * dt;
    moth.heading = Math.atan2(moth.vy, moth.vx);
    return null;
  }
  switch (moth.kind) {
    case 'dasher': stepDasher(moth, world, dt); return null;
    case 'splitter': return stepSplitter(moth, world, dt);
    case 'mite': stepMite(moth, world, dt); return null;
    case 'cutter': return stepCutter(moth, world, dt);
    case 'eclipse': return stepEclipse(moth, world, dt);
    default: stepDrifter(moth, world, dt); return null;
  }
}

/** True when the moth's body overlaps the Weaver. */
export function mothTouchesWeaver(moth, weaver) {
  return Math.hypot(moth.x - weaver.x, moth.y - weaver.y) < moth.radius + weaver.radius;
}

/** Throw the moth away from (x, y) and stun it for a moment, so one touch is one hit. */
export function knockBack(moth, x, y) {
  const angle = Math.atan2(moth.y - y, moth.x - x);
  const push = moth.kind === 'eclipse' ? 60 : 320;
  moth.vx = Math.cos(angle) * push;
  moth.vy = Math.sin(angle) * push;
  moth.stun = moth.kind === 'eclipse' ? 0.4 : 0.9;
  moth.state = 'drift';
}

/** Give the boss its veils: the number of loops it takes to capture it. */
export function veilEclipse(moth, veils) {
  moth.veils = veils;
  moth.maxVeils = veils;
}

/** Strip one veil; the body tightens; returns true when the last veil fell. */
export function stripVeil(moth) {
  moth.veils = Math.max(0, moth.veils - 1);
  moth.radius = MOTHS.eclipse.radius * (0.72 + 0.28 * (moth.veils / Math.max(1, moth.maxVeils)));
  moth.stun = 0.6;
  moth.vx = 0;
  moth.vy = 0;
  return moth.veils === 0;
}

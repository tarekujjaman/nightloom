// The two bosses, the Eclipse Moth and the Hollow Queen: veils that fall to loops, three phases, escorts, and the Queen's lunge.
import { FIELD, MOTHS } from './config.js';
import { advance, spawnMoth, steerToward, stepCommon } from './enemies.js';

export const BOSSES = {
  eclipse: { name: 'Eclipse Moth', phases: ['CORONA', 'UMBRA', 'TOTALITY'], escorts: [['drifter', 'drifter'], ['dasher', 'drifter'], ['cutter', 'dasher']], hint: 'close a loop around it to strip a veil' },
  queen: { name: 'Hollow Queen', phases: ['BROOD', 'TEETH', 'FURY'], escorts: [['mite', 'mite', 'mite'], ['cutter', 'phantom'], ['dasher', 'dasher']], hint: 'five veils to strip; in FURY it lunges at you' },
};

/** The boss of `kind` descending from the top of the sky with `veils` to strip. */
export function spawnBoss(kind, veils, random, speedScale) {
  const boss = spawnMoth(kind, FIELD.width / 2, -90, random, speedScale);
  boss.boss = true;
  boss.veils = veils;
  boss.maxVeils = veils;
  boss.escortTimer = MOTHS[kind].escortEvery * 0.5;
  boss.timer = 3;
  return boss;
}

/** Phase 0, 1 or 2 from the veils already stripped. */
export function bossPhase(moth) {
  return Math.min(2, Math.floor(((moth.maxVeils - moth.veils) * 3) / moth.maxVeils));
}

/** The living boss among `moths`, or null. */
export function findBoss(moths) {
  return moths.find((moth) => moth.alive && moth.boss) || null;
}

/** Advance the boss by `dt`; returns 'escort' when it released moths, 'lunge' when the Queen dashes, else null. */
export function stepBoss(moth, world, dt) {
  if (stepCommon(moth, dt)) return null;
  const spec = MOTHS[moth.kind];
  const phase = bossPhase(moth);
  const t = moth.age;
  if (moth.kind === 'queen' && phase === 2) {
    moth.timer -= dt;
    if (moth.state === 'aim') {
      steerToward(moth, world.weaver.x, world.weaver.y, 5, dt);
      advance(moth, spec.speed * 0.2, dt);
      moth.aimX = world.weaver.x;
      moth.aimY = world.weaver.y;
      if (moth.timer > 0) return null;
      moth.state = 'dash';
      moth.timer = 0.6;
      moth.heading = Math.atan2(moth.aimY - moth.y, moth.aimX - moth.x);
      return 'lunge';
    }
    if (moth.state === 'dash') {
      advance(moth, spec.dashSpeed * moth.speedScale, dt);
      moth.wake.push({ x: moth.x, y: moth.y });
      if (moth.wake.length > 12) moth.wake.shift();
      if (moth.timer <= 0) {
        moth.state = 'drift';
        moth.timer = 3.5;
      }
      return null;
    }
    if (moth.timer <= 0) {
      moth.state = 'aim';
      moth.timer = 0.7;
    }
  }
  if (moth.wake.length > 0) moth.wake.shift();
  const queen = moth.kind === 'queen';
  const tx = FIELD.width / 2 + Math.sin(t * (queen ? 0.3 : 0.21)) * (queen ? 330 : 300);
  const ty = FIELD.height / 2 + (queen ? Math.sin(t * 0.6) * 150 : 20 + Math.cos(t * 0.33) * 150);
  steerToward(moth, tx, ty, 1.2, dt);
  advance(moth, moth.speed * (1 + 0.3 * phase), dt);
  moth.escortTimer -= dt;
  if (moth.escortTimer > 0) return null;
  moth.escortTimer = spec.escortEvery * (1 - 0.15 * phase);
  let escorts = 0;
  for (const other of world.moths) if (other.alive && other.parent === moth.id) escorts += 1;
  if (escorts >= spec.maxEscorts) return null;
  for (const kind of BOSSES[moth.kind].escorts[phase]) {
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

/** Strip one veil: the body tightens and the boss reels; returns true when the last veil fell. */
export function stripVeil(moth) {
  moth.veils = Math.max(0, moth.veils - 1);
  moth.radius = MOTHS[moth.kind].radius * (0.72 + 0.28 * (moth.veils / Math.max(1, moth.maxVeils)));
  moth.stun = 0.6;
  moth.vx = 0;
  moth.vy = 0;
  moth.state = 'drift';
  return moth.veils === 0;
}

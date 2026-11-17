// The two bosses, the Eclipse Moth and the Hollow Queen: veils that fall to loops, three phases, escorts, and the Queen's lunge.
import { FIELD, MOTHS } from './config.js';
import { advance, lunge, spawnMoth, steerToward, stepCommon } from './enemies.js';

/** Each boss: phases, the escorts released in each, the boss bar's hint and the objective line per phase (# is the veils left). */
export const BOSSES = {
  eclipse: {
    name: 'Eclipse Moth', phases: ['CORONA', 'UMBRA', 'TOTALITY'], escorts: [['drifter', 'drifter'], ['dasher', 'drifter'], ['cutter', 'dasher']], hint: 'close a loop around it to strip a veil',
    tips: ['Close a loop around the Eclipse Moth to strip a veil: # to go', 'Umbra: its escorts now dash. Loop the Eclipse Moth again, # veils left', 'Totality: Cutters guard it. One more loop round the Eclipse Moth ends it'],
  },
  queen: {
    name: 'Hollow Queen', phases: ['BROOD', 'TEETH', 'FURY'], escorts: [['mite', 'mite', 'mite'], ['cutter', 'phantom'], ['dasher', 'dasher']], hint: 'five veils to strip; in FURY it lunges at you',
    tips: ['Close loops around the Hollow Queen to strip her veils: # to go', 'Teeth: her Cutters hunt your thread. Loop the Queen between cuts, # veils left', 'Fury: the Queen lunges at you. Dodge, then loop her once more'],
  },
};

export function spawnBoss(kind, veils, random, speedScale) {
  const boss = spawnMoth(kind, FIELD.width / 2, -90, random, speedScale);
  boss.boss = true;
  boss.veils = veils;
  boss.maxVeils = veils;
  boss.escortTimer = MOTHS[kind].escortEvery * 0.5;
  boss.timer = 3;
  return boss;
}

export function bossPhase(moth) {
  return Math.min(2, Math.floor(((moth.maxVeils - moth.veils) * 3) / moth.maxVeils));
}

export function findBoss(moths) {
  return moths.find((moth) => moth.alive && moth.boss) || null;
}

/** Advance the boss by `dt`: in the Queen's Fury a lunge, else a slow orbit and, every so often, the phase's escorts. */
export function stepBoss(moth, world, dt) {
  if (stepCommon(moth, dt)) return;
  const spec = MOTHS[moth.kind];
  const phase = bossPhase(moth);
  const queen = moth.kind === 'queen';
  if (queen && phase === 2 && lunge(moth, world, dt, 0.7, 0.6, () => 3.5)) return;
  const t = moth.age;
  const tx = FIELD.width / 2 + Math.sin(t * (queen ? 0.3 : 0.21)) * (queen ? 330 : 300);
  const ty = FIELD.height / 2 + (queen ? Math.sin(t * 0.6) * 150 : 20 + Math.cos(t * 0.33) * 150);
  steerToward(moth, tx, ty, 1.2, dt);
  advance(moth, moth.speed * (1 + 0.3 * phase), dt);
  moth.escortTimer -= dt;
  if (moth.escortTimer > 0) return;
  moth.escortTimer = spec.escortEvery * (1 - 0.15 * phase);
  if (world.moths.filter((other) => other.alive && other.parent === moth.id).length >= spec.maxEscorts) return;
  for (const kind of BOSSES[moth.kind].escorts[phase]) {
    const escort = spawnMoth(kind, moth.x, moth.y, world.random, moth.speedScale);
    escort.parent = moth.id;
    escort.heading = world.random.angle();
    escort.stun = 0.5;
    escort.vx = Math.cos(escort.heading) * 240;
    escort.vy = Math.sin(escort.heading) * 240;
    world.pending.push(escort);
  }
}

export function stripVeil(moth) {
  moth.veils = Math.max(0, moth.veils - 1);
  moth.radius = MOTHS[moth.kind].radius * (0.72 + 0.28 * (moth.veils / Math.max(1, moth.maxVeils)));
  moth.stun = 0.6;
  moth.vx = 0;
  moth.vy = 0;
  moth.state = 'drift';
  return moth.veils === 0;
}

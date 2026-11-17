// The Eclipse Moth and the Hollow Queen: veils that fall to loops, three phases, escorts, the Queen's lunge.
import { FIELD, MOTHS } from './config.js';
import { advance, lunge, spawnMoth, steerToward, stepCommon } from './enemies.js';

export const BOSSES = {
  eclipse: {
    name: 'Eclipse Moth', phases: ['CORONA', 'UMBRA', 'TOTALITY'], escorts: [['drifter', 'drifter'], ['dasher', 'drifter'], ['cutter', 'dasher']], hint: 'close a loop around it to strip a veil',
    tips: ['Close a loop around the Eclipse Moth to strip a veil: # to go', 'Umbra: its escorts now dash. Loop it again, # veils left', 'Totality: Cutters guard it. One more loop round it ends the Eclipse'],
  },
  queen: {
    name: 'Hollow Queen', phases: ['BROOD', 'TEETH', 'FURY'], escorts: [['mite', 'mite', 'mite'], ['cutter', 'phantom'], ['dasher', 'dasher']], hint: 'five veils to strip; in FURY it lunges at you',
    tips: ['Close loops around the Hollow Queen to strip her veils: # to go', 'Teeth: her Cutters hunt your thread. Loop her between cuts, # left', 'Fury: the Queen lunges at you. Dodge, then loop her once more'],
  },
};

export function spawnBoss(kind, veils, random, speedScale) {
  const boss = spawnMoth(kind, FIELD.width / 2, -90, random, speedScale);
  return Object.assign(boss, { boss: true, veils, maxVeils: veils, escortTimer: MOTHS[kind].escortEvery * 0.5, timer: 3 });
}

export const bossPhase = (moth) => Math.min(2, Math.floor(((moth.maxVeils - moth.veils) * 3) / moth.maxVeils));
export const findBoss = (moths) => moths.find((moth) => moth.alive && moth.boss) || null;

export function stepBoss(moth, world, dt) {
  if (stepCommon(moth, dt)) return;
  const spec = MOTHS[moth.kind];
  const phase = bossPhase(moth);
  const queen = moth.kind === 'queen';
  if (queen && phase === 2 && lunge(moth, world, dt, 0.7, 0.6, () => 3.5)) return;
  const t = moth.age;
  steerToward(moth, FIELD.width / 2 + Math.sin(t * (queen ? 0.3 : 0.21)) * (queen ? 330 : 300), FIELD.height / 2 + (queen ? Math.sin(t * 0.6) * 150 : 20 + Math.cos(t * 0.33) * 150), 1.2, dt);
  advance(moth, moth.speed * (1 + 0.3 * phase), dt);
  if ((moth.escortTimer -= dt) > 0) return;
  moth.escortTimer = spec.escortEvery * (1 - 0.15 * phase);
  if (world.moths.filter((other) => other.alive && other.parent === moth.id).length >= spec.maxEscorts) return;
  for (const kind of BOSSES[moth.kind].escorts[phase]) {
    const escort = spawnMoth(kind, moth.x, moth.y, world.random, moth.speedScale);
    const heading = world.random.angle();
    world.pending.push(Object.assign(escort, { parent: moth.id, heading, stun: 0.5, vx: Math.cos(heading) * 240, vy: Math.sin(heading) * 240 }));
  }
}

export function stripVeil(moth) {
  moth.veils = Math.max(0, moth.veils - 1);
  Object.assign(moth, { radius: MOTHS[moth.kind].radius * (0.72 + 0.28 * (moth.veils / Math.max(1, moth.maxVeils))), stun: 0.6, vx: 0, vy: 0, state: 'drift' });
  return moth.veils === 0;
}

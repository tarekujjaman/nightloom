// The ten waves of the night: which moths each one sends, how much faster they fly, and the two
// boss waves where the Eclipse Moth rises. A wave ends when every moth it sent has been captured.

export const WAVE_COUNT = 10;

export const WAVES = [
  { name: 'First Light', tagline: 'Drifters wander in from the dark', moths: { drifter: 6 } },
  { name: 'Wings in the Dark', tagline: 'Dashers aim, then lunge', moths: { drifter: 8, dasher: 2 } },
  { name: 'The Brood', tagline: 'Splitters shed mites until caught', moths: { drifter: 8, dasher: 3, splitter: 1 } },
  { name: 'Severance', tagline: 'Cutters chew through held threads', moths: { drifter: 8, dasher: 4, splitter: 2, cutter: 2 } },
  { name: 'The Eclipse Moth', tagline: 'Close three loops around it', boss: { veils: 3 }, moths: { drifter: 4 } },
  { name: 'Deep Night', tagline: 'The dark grows bold', moths: { drifter: 10, dasher: 5, splitter: 2, cutter: 3 } },
  { name: 'The Swarm', tagline: 'Weave fast, weave wide', moths: { drifter: 10, dasher: 6, splitter: 3, cutter: 3 } },
  { name: 'Teeth of the Void', tagline: 'Every thread is hunted', moths: { drifter: 12, dasher: 7, splitter: 3, cutter: 4 } },
  { name: 'Last Threads', tagline: 'Hold the loom together', moths: { drifter: 12, dasher: 8, splitter: 4, cutter: 5 } },
  { name: 'Eclipse Ascendant', tagline: 'Five loops to end the night', boss: { veils: 5 }, moths: { drifter: 6, dasher: 3 } },
];

/** The wave's definition (1-based). */
export function waveDefinition(wave) {
  return WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
}

/** The kinds the wave sends, in a shuffled order; a boss always leads. */
export function waveSpawnList(wave, random) {
  const definition = waveDefinition(wave);
  const kinds = [];
  for (const [kind, count] of Object.entries(definition.moths)) {
    for (let i = 0; i < count; i += 1) kinds.push(kind);
  }
  random.shuffle(kinds);
  if (definition.boss) kinds.unshift('eclipse');
  return kinds;
}

/** How much faster this wave's moths fly than the first wave's. */
export function waveSpeedScale(wave) {
  return 1 + 0.07 * (wave - 1);
}

/** True for the two boss waves. */
export function isBossWave(wave) {
  return Boolean(waveDefinition(wave).boss);
}

/** The veils the boss of this wave wears, or 0. */
export function bossVeils(wave) {
  const definition = waveDefinition(wave);
  return definition.boss ? definition.boss.veils : 0;
}

/** Seconds between spawns, a little quicker in later waves. */
export function spawnInterval(wave, base) {
  return base * Math.max(0.55, 1 - 0.05 * (wave - 1));
}

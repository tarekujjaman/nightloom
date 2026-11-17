// The ten waves: which moths each sends, how much faster they fly, and the two boss waves.

export const WAVE_COUNT = 10;

export const WAVES = [
  { name: 'First Light', tagline: 'Drifters wander in from the dark', moths: { drifter: 6 } },
  { name: 'Wings in the Dark', tagline: 'Dashers aim, then lunge', moths: { drifter: 7, dasher: 3 } },
  { name: 'The Brood', tagline: 'Splitters shed mites until caught', moths: { drifter: 7, dasher: 3, splitter: 2 } },
  { name: 'Severance', tagline: 'Cutters chew through held threads', moths: { drifter: 7, dasher: 4, splitter: 2, cutter: 2 } },
  { name: 'The Eclipse Moth', tagline: 'Close three loops around it', boss: { kind: 'eclipse', veils: 3 }, moths: { drifter: 4, dasher: 2 } },
  { name: 'Veilfall', tagline: 'Phantoms fade out of your loops', moths: { drifter: 8, dasher: 4, splitter: 2, cutter: 2, phantom: 3 } },
  { name: 'Hex Night', tagline: 'Wardens shield the moths around them', moths: { drifter: 8, dasher: 5, splitter: 2, cutter: 3, phantom: 3, warden: 1 } },
  { name: 'Teeth of the Void', tagline: 'Every thread is hunted', moths: { drifter: 10, dasher: 6, splitter: 3, cutter: 4, phantom: 4, warden: 2 } },
  { name: 'Last Threads', tagline: 'Hold the loom together', moths: { drifter: 10, dasher: 7, splitter: 4, cutter: 5, phantom: 5, warden: 2 } },
  { name: 'The Hollow Queen', tagline: 'Five veils, and a Fury at the last', boss: { kind: 'queen', veils: 5 }, moths: { drifter: 6, dasher: 4, cutter: 3, phantom: 3 } },
];

/** The wave's definition (1-based). */
export function waveDefinition(wave) {
  return WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
}

/** The kinds the wave sends, in a shuffled order; a boss always leads. */
export function waveSpawnList(wave, random) {
  const definition = waveDefinition(wave);
  const kinds = [];
  for (const [kind, count] of Object.entries(definition.moths)) for (let i = 0; i < count; i += 1) kinds.push(kind);
  random.shuffle(kinds);
  if (definition.boss) kinds.unshift(definition.boss.kind);
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

/** Seconds between spawns, a little quicker in later waves. */
export function spawnInterval(wave, base) {
  return base * Math.max(0.55, 1 - 0.05 * (wave - 1));
}

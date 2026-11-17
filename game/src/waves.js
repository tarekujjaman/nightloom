// The ten waves: name, banner tagline, the objective line shown while each plays, its moths and, twice, its boss.

export const WAVE_COUNT = 10;

export const WAVES = [
  { name: 'First Light', tagline: 'Drifters wander in from the dark', tip: 'Loop the Drifters: hold LMB on a star in reach, drag star to star, back to the first', moths: { drifter: 6 } },
  { name: 'Wings in the Dark', tagline: 'Dashers aim, then lunge', tip: 'Dashers lunge where you stand: step aside, then loop them while they aim', moths: { drifter: 7, dasher: 3 } },
  { name: 'The Brood', tagline: 'Splitters shed mites until caught', tip: 'Loop the Splitters early, before they shed their mites', moths: { drifter: 7, dasher: 3, splitter: 2 } },
  { name: 'Severance', tagline: 'Cutters chew through held threads', tip: 'Cutters chew a held thread: close loops fast, or loop the Cutter first', moths: { drifter: 7, dasher: 4, splitter: 2, cutter: 2 } },
  { name: 'The Eclipse Moth', tagline: 'Close three loops around it', tip: 'Close a loop around the Eclipse Moth to strip a veil', boss: { kind: 'eclipse', veils: 3 }, moths: { drifter: 4, dasher: 2 } },
  { name: 'Veilfall', tagline: 'Phantoms fade out of your loops', tip: 'A faded Phantom slips out of a loop: close it while they show', moths: { drifter: 8, dasher: 4, splitter: 2, cutter: 2, phantom: 3 } },
  { name: 'Hex Night', tagline: 'Wardens shield the moths around them', tip: 'Loop the Hex Warden first: every moth near it is shielded', moths: { drifter: 8, dasher: 5, splitter: 2, cutter: 3, phantom: 3, warden: 1 } },
  { name: 'Teeth of the Void', tagline: 'Every thread is hunted', tip: 'Every thread is hunted: close loops within 5 s of each other to chain', moths: { drifter: 10, dasher: 6, splitter: 3, cutter: 4, phantom: 4, warden: 2 } },
  { name: 'Last Threads', tagline: 'Hold the loom together', tip: 'Bigger loops, more moths, quick chains: the grade is score against par', moths: { drifter: 10, dasher: 7, splitter: 4, cutter: 5, phantom: 5, warden: 2 } },
  { name: 'The Hollow Queen', tagline: 'Five veils, and a Fury at the last', tip: 'Close loops around the Hollow Queen to strip her veils', boss: { kind: 'queen', veils: 5 }, moths: { drifter: 6, dasher: 4, cutter: 3, phantom: 3 } },
];

export function waveDefinition(wave) {
  return WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
}

export function waveSpawnList(wave, random) {
  const definition = waveDefinition(wave);
  const kinds = [];
  for (const [kind, count] of Object.entries(definition.moths)) for (let i = 0; i < count; i += 1) kinds.push(kind);
  random.shuffle(kinds);
  if (definition.boss) kinds.unshift(definition.boss.kind);
  return kinds;
}

export function waveSpeedScale(wave) {
  return 1 + 0.07 * (wave - 1);
}

export function spawnInterval(wave, base) {
  return base * Math.max(0.55, 1 - 0.05 * (wave - 1));
}

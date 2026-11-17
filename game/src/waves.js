// The ten waves: name, tagline, objective tip, moths and, twice, a boss.

export const WAVE_COUNT = 10;

export const WAVES = [
  { name: 'First Light', tagline: 'Drifters wander in toward the Loom', tip: 'Loop the Drifters before they reach the Loom: hold LMB on a star, drag star to star, back to the first', moths: { drifter: 6 } },
  { name: 'Wings in the Dark', tagline: 'Dashers aim, then lunge', tip: 'Dashers lunge where you stand: step aside, then loop them while they aim', moths: { drifter: 7, dasher: 3 } },
  { name: 'The Brood', tagline: 'Splitters shed mites until caught', tip: 'Loop the Splitters before they shed; E plants a star where you stand', moths: { drifter: 7, dasher: 3, splitter: 2 } },
  { name: 'Severance', tagline: 'Cutters chew through held threads', tip: 'Cutters chew a held thread: close loops fast, or pluck them off (RMB)', moths: { drifter: 7, dasher: 4, splitter: 2, cutter: 2 } },
  { name: 'The Eclipse Moth', tagline: 'Close three loops around it', tip: 'Close a loop around the Eclipse Moth to strip a veil', boss: { kind: 'eclipse', veils: 3 }, moths: { drifter: 4, dasher: 2 } },
  { name: 'Veilfall', tagline: 'Phantoms fade out of your loops', tip: 'A faded Phantom slips out of a loop: pin it with a Lance (Q), then close', moths: { drifter: 8, dasher: 4, splitter: 2, cutter: 2, phantom: 3 } },
  { name: 'Hex Night', tagline: 'Wardens shield the moths around them', tip: 'Loop the Hex Warden first: every moth near it is shielded', moths: { drifter: 8, dasher: 5, splitter: 2, cutter: 3, phantom: 3, warden: 1 } },
  { name: 'Teeth of the Void', tagline: 'Every thread is hunted', tip: 'Close loops within 5 s of each other to chain the combo', moths: { drifter: 10, dasher: 6, splitter: 3, cutter: 4, phantom: 4, warden: 2 } },
  { name: 'Last Threads', tagline: 'Hold the Loom together', tip: 'Bigger loops, more moths, quick chains: the grade is score against par', moths: { drifter: 10, dasher: 7, splitter: 4, cutter: 5, phantom: 5, warden: 2 } },
  { name: 'The Hollow Queen', tagline: 'Five veils, and a Fury at the last', tip: 'Close loops around the Hollow Queen to strip her veils', boss: { kind: 'queen', veils: 5 }, moths: { drifter: 6, dasher: 4, cutter: 3, phantom: 3 } },
];

export const waveDefinition = (wave) => WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];

export function waveSpawnList(wave, random) {
  const definition = waveDefinition(wave);
  const kinds = random.shuffle(Object.entries(definition.moths).flatMap(([kind, count]) => Array(count).fill(kind)));
  if (definition.boss) kinds.unshift(definition.boss.kind);
  return kinds;
}

export const waveSpeedScale = (wave) => 1 + 0.07 * (wave - 1);
export const spawnInterval = (wave, base) => base * Math.max(0.55, 1 - 0.05 * (wave - 1));

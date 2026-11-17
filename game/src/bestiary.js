// What each void-moth is called and does, for the threat queue, the field labels and the title's bestiary.

export const MOTH_INFO = {
  drifter: { name: 'Drifter', does: 'wanders toward you', color: '#d9ccff' },
  dasher: { name: 'Dasher', does: 'aims, then lunges', color: '#ff8a45' },
  splitter: { name: 'Splitter', does: 'sheds mites until caught', color: '#ff6ad5' },
  mite: { name: 'Mite', does: 'small and quick', color: '#d9ccff' },
  cutter: { name: 'Cutter', does: 'cuts your held thread', color: '#ff5a5a' },
  phantom: { name: 'Phantom', does: 'fades out of loops', color: '#b48cff' },
  warden: { name: 'Hex Warden', does: 'shields moths near it', color: '#74f3ff' },
  eclipse: { name: 'Eclipse Moth', does: 'boss · 3 veils, 3 phases', color: '#ffd36b' },
  queen: { name: 'Hollow Queen', does: 'boss · 5 veils, lunges in Fury', color: '#ffd36b' },
};

/** Bosses first, then the kinds that most change how you weave. */
export const MOTH_ORDER = ['eclipse', 'queen', 'warden', 'cutter', 'phantom', 'splitter', 'dasher', 'drifter', 'mite'];

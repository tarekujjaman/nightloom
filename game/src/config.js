// Every tuning number and colour NIGHTLOOM uses, in one place: the field, the palette, the Weaver,
// the loom (threads and loops), each kind of void-moth, the scoring tiers and the slow-time burst.

/** Logical canvas size; the renderer scales it to fit the window. */
export const FIELD = { width: 1280, height: 800 };
/** Fixed simulation step in seconds. */
export const STEP = 1 / 60;
/** localStorage key of the saved high score. */
export const BEST_KEY = 'nightloom.best.v1';

/** Gold and cyan light against violet darkness; the moths are dark with ember eyes. */
export const PALETTE = {
  skyTop: '#1a0e3f',
  skyMid: '#0c0622',
  skyBottom: '#030109',
  nebulaViolet: '122, 58, 214',
  nebulaMagenta: '186, 64, 190',
  nebulaTeal: '36, 150, 190',
  gold: '#ffd36b',
  goldLight: '#fff2c4',
  goldDeep: '#e0a030',
  cyan: '#74f3ff',
  cyanDeep: '#2ec2dc',
  violet: '#a27bff',
  ember: '#ff3b2a',
  emberGlow: '#ff8a45',
  mothBody: '#120818',
  mothWing: '#22113a',
  mothEdge: '#7a4fb0',
  mothAura: '#1c0636',
  text: '#f6eeff',
  textDim: '#a494cc',
  heart: '#ff4d6d',
  heartDim: '#4a2238',
};

export const WEAVER = {
  speed: 330,
  radius: 11,
  reach: 290,
  hearts: 3,
  maxHearts: 6,
  invulnerable: 1.6,
  trailLength: 14,
};

export const STARS = {
  count: 16,
  margin: 110,
  spacing: 150,
  hitRadius: 34,
  topMargin: 150,
  attractTopMargin: 330,
};

export const LOOM = {
  minLoop: 3,
  flash: 0.7,
  afterglow: 3,
  attractAfterglow: 16,
  cutSeconds: 0.8,
  steadyCutSeconds: 1.8,
  burnSeconds: 0.55,
  cutterBurnSeconds: 1.6,
  wideNet: 40,
};

export const MOTHS = {
  drifter: { radius: 17, speed: 58, points: 10, wingspan: 2.2 },
  dasher: { radius: 16, speed: 75, dashSpeed: 660, points: 15, wingspan: 2.4 },
  splitter: { radius: 25, speed: 36, points: 20, wingspan: 2.0, shedEvery: 7, maxMites: 4 },
  mite: { radius: 9, speed: 120, points: 5, wingspan: 2.0 },
  cutter: { radius: 17, speed: 100, points: 25, wingspan: 2.3 },
  eclipse: { radius: 64, speed: 30, points: 1000, veilPoints: 150, wingspan: 2.6, escortEvery: 6, maxEscorts: 6 },
};

export const SCORING = {
  /** Loop area thresholds (px²) for tiers 2, 3 and 4. */
  tiers: [38000, 110000, 230000],
  tierNames: ['LOOP', 'BIG LOOP', 'GRAND LOOP', 'CELESTIAL LOOP'],
  waveClear: 100,
  perfectWave: 250,
  comboWindow: 5,
};

export const SLOW_TIME = { factor: 0.28, duration: 3, cooldown: 12 };

export const SPAWN = { interval: 0.85, firstDelay: 1.2, edgeInset: 30 };

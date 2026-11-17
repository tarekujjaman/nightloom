// Every tuning number, colour and layout box, in one place.

export const VIEW = { width: 1280, height: 800 };
export const LAYOUT = { top: 66, side: 312, bottom: 100 };
export const ARENA = { x: 0, y: LAYOUT.top, width: VIEW.width - LAYOUT.side, height: VIEW.height - LAYOUT.top - LAYOUT.bottom };
export const FIELD = { width: ARENA.width, height: ARENA.height };
export const STEP = 1 / 60;

export const PALETTE = {
  gold: '#ffd36b', goldLight: '#fff2c4', goldDeep: '#e0a030', cyan: '#74f3ff', cyanDeep: '#2ec2dc', violet: '#b48cff', magenta: '#ff6ad5',
  ember: '#ff3b2a', emberGlow: '#ff8a45', mothBody: '#1a0a2e', mothWing: '#3d1d70', mothEdge: '#eadcff', mothAura: '#2a0a4a',
  text: '#ffffff', textSoft: '#d9ccff', ink: '#160a30', heart: '#ff4d6d', heartDim: '#4a2238',
  panel: 'rgba(12, 6, 32, 0.94)', panelLine: '#6a4bb8', win: '#4df0b0', lose: '#ff5a5a',
};

export const WEAVER = { speed: 330, radius: 11, reach: 270, hearts: 3, maxHearts: 6, invulnerable: 1.6, trailLength: 14 };
export const STARS = { count: 15, margin: 70, spacing: 135, hitRadius: 34, topMargin: 76, placedSpacing: 70, maxPlaced: 5 };
export const ATTRACT = { top: 228, bottom: 440, stars: 12 };
export const WEAVE = {
  minLoop: 3, flash: 0.7, afterglow: 3.5, attractAfterglow: 12, cutSeconds: 0.8, steadyCutSeconds: 1.8,
  burnSeconds: 0.55, cutterBurnSeconds: 1.6, wideNet: 40, lodestar: 80, stunRadius: 90,
};
export const LOOM = { x: FIELD.width / 2, y: FIELD.height / 2 - 6, radius: 74, clear: 150, health: 100, threads: 12, heal: 12, perfectHeal: 10 };
export const MOTHS = {
  drifter: { radius: 17, speed: 58, points: 10, bite: 4 },
  dasher: { radius: 16, speed: 75, dashSpeed: 660, points: 15, bite: 5 },
  splitter: { radius: 25, speed: 36, points: 20, shedEvery: 7, maxMites: 4, bite: 6 },
  mite: { radius: 9, speed: 120, points: 5, bite: 1 },
  cutter: { radius: 17, speed: 100, points: 25, bite: 4 },
  phantom: { radius: 17, speed: 68, points: 30, shown: 2.6, fade: 0.5, hidden: 1.8, bite: 5 },
  warden: { radius: 22, speed: 30, points: 40, shieldRadius: 120, bite: 6 },
  eclipse: { radius: 64, speed: 30, points: 1000, veilPoints: 150, escortEvery: 6, maxEscorts: 6, bite: 0 },
  queen: { radius: 58, speed: 40, points: 1500, veilPoints: 200, escortEvery: 5, maxEscorts: 8, dashSpeed: 520, bite: 0 },
};
export const SCORING = {
  tiers: [24000, 70000, 150000], tierNames: ['LOOP', 'BIG LOOP', 'GRAND LOOP', 'CELESTIAL LOOP'],
  waveClear: 100, perfectWave: 250, comboWindow: 5, par: 250, grades: [['S', 1.5], ['A', 1], ['B', 0.65], ['C', 0.35], ['D', 0]],
};
export const SLOW_TIME = { factor: 0.28, duration: 3, cooldown: 14 };
export const STARLIGHT = { start: 30, perMoth: 3, perTier: 2, perChain: 3, burn: 1, veil: 15, bossFall: 40, star: 45, starStep: 10, fourth: 60, reroll: 30 };
export const ABILITY = { pluckCooldown: 4, pluckReach: 70, pluckBurst: 95, pluckStun: 1.5, lanceCharges: 3, lanceRecharge: 7, lanceSpeed: 980, lanceRange: 460, lancePin: 2.2 };
export const SPAWN = { interval: 0.85, firstDelay: 1.2, edgeInset: 30 };
export const RELIC_WAVE = 5;

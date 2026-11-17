// The cards between waves: nine thread upgrades in three rarities with levels and live stats, and four relics after the first boss.
import { RELIC_WAVE, SLOW_TIME, WEAVER } from './config.js';
import { growHearts } from './weaver.js';

export const UPGRADES = [
  { id: 'reach', name: 'Long Reach', rarity: 'common', max: 3, blurb: 'Threads anchor to stars farther from the Weaver.', effect: '+90 reach', stat: (lv) => `reach ${WEAVER.reach + 90 * lv} px` },
  { id: 'swift', name: 'Swift Spark', rarity: 'common', max: 3, blurb: 'The Weaver flies a quarter faster.', effect: '+25% speed', stat: (lv) => `speed ${Math.round(100 * 1.25 ** lv)}%` },
  { id: 'heart', name: 'Another Heart', rarity: 'common', max: 3, blurb: 'One more heart, and one healed now.', effect: '+1 heart', stat: (lv) => `${WEAVER.hearts + lv} hearts` },
  { id: 'ember', name: 'Ember Thread', rarity: 'rare', max: 1, blurb: 'Moths that linger on a held thread burn away.', effect: 'threads burn', stat: () => 'burns a moth in 0.55 s' },
  { id: 'still', name: 'Still Time', rarity: 'rare', max: 2, blurb: 'Space slows every moth to a crawl for a few seconds.', effect: 'SPACE: still time', stat: (lv) => `${SLOW_TIME.duration + 2 * (lv - 1)} s slow · ${Math.max(6, SLOW_TIME.cooldown - 4 * (lv - 1))} s recharge` },
  { id: 'shield', name: 'Star Shield', rarity: 'rare', max: 1, blurb: 'Closing a loop shields the Weaver for 2.5 s.', effect: 'shield on snap', stat: () => '2.5 s shield per loop' },
  { id: 'steady', name: 'Steady Hand', rarity: 'rare', max: 1, blurb: 'Cutters need twice as long to sever a thread.', effect: 'slow cutters', stat: () => 'cut takes 1.8 s' },
  { id: 'net', name: 'Wide Net', rarity: 'rare', max: 1, blurb: 'Loops also catch moths just outside the thread.', effect: '+40 px catch', stat: () => 'catch margin 40 px' },
  { id: 'gold', name: 'Gold Weave', rarity: 'epic', max: 1, blurb: 'Every loop scores one tier higher.', effect: '+1 tier', stat: () => 'tier +1 on every loop' },
];

export const RELICS = [
  { id: 'moonspool', name: 'Moonspool', rarity: 'relic', max: 1, blurb: 'Held threads cannot be cut; cutters can only chase you.', effect: 'uncuttable threads', stat: () => 'threads cannot be cut' },
  { id: 'starfall', name: 'Starfall', rarity: 'relic', max: 1, blurb: 'Every closed loop stuns the moths around it for 2 s.', effect: 'snap stuns nearby', stat: () => 'stuns within 90 px' },
  { id: 'hourglass', name: 'Hourglass', rarity: 'relic', max: 1, blurb: 'Grants Still Time; every moth caught recharges a quarter of it.', effect: 'captures recharge', stat: () => '+25% charge per moth' },
  { id: 'lodestar', name: 'Lodestar', rarity: 'relic', max: 1, blurb: 'Loops catch moths up to 80 px outside the thread.', effect: '+80 px catch', stat: () => 'catch margin 80 px' },
];

export const RARITY_COLORS = { common: '#74f3ff', rare: '#b48cff', epic: '#ffd36b', relic: '#ff6ad5' };
const ROMAN = ['', 'I', 'II', 'III'];

export function emptyUpgrades() {
  return Object.fromEntries([...UPGRADES, ...RELICS].map((card) => [card.id, 0]));
}

export function upgradeById(id) {
  return [...UPGRADES, ...RELICS].find((card) => card.id === id);
}

export function offersRelic(wave, held) {
  return wave === RELIC_WAVE && !RELICS.some((relic) => held[relic.id] > 0);
}

/** Three cards for the wave just cleared: relics after the first boss, else threads not yet at their cap. */
export function offerCards(random, held, wave) {
  const pool = offersRelic(wave, held) ? RELICS : UPGRADES.filter((card) => held[card.id] < card.max);
  return random.shuffle(pool.map((card) => card.id)).slice(0, 3);
}

export function applyUpgrade(world, id) {
  world.upgrades[id] = (world.upgrades[id] || 0) + 1;
  const weaver = world.weaver;
  switch (id) {
    case 'reach': weaver.reach += 90; break;
    case 'swift': weaver.speedMult *= 1.25; break;
    case 'heart': growHearts(weaver); break;
    case 'still':
      world.slow.owned = true;
      world.slow.duration = SLOW_TIME.duration + (world.upgrades.still - 1) * 2;
      world.slow.cooldown = Math.max(6, SLOW_TIME.cooldown - (world.upgrades.still - 1) * 4);
      world.slow.charge = 1;
      break;
    case 'hourglass':
      world.slow.owned = true;
      world.slow.charge = 1;
      break;
    default: break;
  }
}

/** The cards held, for the HUD: name with level, rarity and the stat line at that level. */
export function heldCards(held) {
  return [...UPGRADES, ...RELICS].filter((card) => held[card.id] > 0).map((card) => {
    const level = held[card.id];
    return { id: card.id, name: card.max > 1 ? `${card.name} ${ROMAN[level] || level}` : card.name, rarity: card.rarity, stat: card.stat(level) };
  });
}

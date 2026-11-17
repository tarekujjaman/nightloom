// The cards: ten threads in three rarities with levels, four relics after the first boss, and the offers.
import { RELIC_WAVE, SLOW_TIME, WEAVER } from './config.js';
import { growHearts } from './weaver.js';

export const UPGRADES = [
  { id: 'reach', name: 'Long Reach', rarity: 'common', max: 3, blurb: 'Threads anchor to stars farther away.', effect: '+90 reach', stat: (lv) => `reach ${WEAVER.reach + 90 * lv} px` },
  { id: 'swift', name: 'Swift Spark', rarity: 'common', max: 3, blurb: 'The Weaver flies a quarter faster.', effect: '+25% speed', stat: (lv) => `speed ${Math.round(100 * 1.25 ** lv)}%` },
  { id: 'heart', name: 'Another Heart', rarity: 'common', max: 3, blurb: 'One more heart, and one healed now.', effect: '+1 heart', stat: (lv) => `${WEAVER.hearts + lv} hearts` },
  { id: 'mend', name: 'Mending Thread', rarity: 'common', max: 3, blurb: 'Every moth you catch knits the Loom back together.', effect: 'catches mend the Loom', stat: (lv) => `+${2 * lv} Loom per catch` },
  { id: 'ember', name: 'Ember Thread', rarity: 'rare', max: 1, blurb: 'Moths that linger on a held thread burn away.', effect: 'threads burn', stat: () => 'burns a moth in 0.55 s' },
  { id: 'still', name: 'Deeper Stillness', rarity: 'rare', max: 2, blurb: 'Still Time lasts longer and recharges sooner.', effect: '+2 s · faster recharge', stat: (lv) => `${SLOW_TIME.duration + 2 * lv} s slow · ${Math.max(6, SLOW_TIME.cooldown - 4 * lv)} s recharge` },
  { id: 'shield', name: 'Star Shield', rarity: 'rare', max: 1, blurb: 'Closing a loop shields the Weaver for 2.5 s.', effect: 'shield on snap', stat: () => '2.5 s shield per loop' },
  { id: 'steady', name: 'Steady Hand', rarity: 'rare', max: 1, blurb: 'Cutters need twice as long to sever a thread.', effect: 'slow cutters', stat: () => 'cut takes 1.8 s' },
  { id: 'net', name: 'Wide Net', rarity: 'rare', max: 1, blurb: 'Loops also catch moths just outside the thread.', effect: '+40 px catch', stat: () => 'catch margin 40 px' },
  { id: 'gold', name: 'Gold Weave', rarity: 'epic', max: 1, blurb: 'Every loop scores one tier higher.', effect: '+1 tier', stat: () => 'tier +1 on every loop' },
];

export const RELICS = [
  { id: 'moonspool', name: 'Moonspool', rarity: 'relic', max: 1, blurb: 'Held threads cannot be cut.', effect: 'uncuttable threads', stat: () => 'threads cannot be cut' },
  { id: 'starfall', name: 'Starfall', rarity: 'relic', max: 1, blurb: 'Every closed loop stuns the moths around it.', effect: 'snap stuns nearby', stat: () => 'stuns within 90 px' },
  { id: 'hourglass', name: 'Hourglass', rarity: 'relic', max: 1, blurb: 'Every moth caught recharges a quarter of Still Time.', effect: 'captures recharge', stat: () => '+25% charge per moth' },
  { id: 'lodestar', name: 'Lodestar', rarity: 'relic', max: 1, blurb: 'Loops catch moths up to 80 px outside the thread.', effect: '+80 px catch', stat: () => 'catch margin 80 px' },
];

export const RARITY_COLORS = { common: '#74f3ff', rare: '#b48cff', epic: '#ffd36b', relic: '#ff6ad5' };
const RANK = { common: 0, rare: 1, relic: 1, epic: 2 };
const ROMAN = ['', 'I', 'II', 'III'];
const ALL = [...UPGRADES, ...RELICS];

export const emptyUpgrades = () => Object.fromEntries(ALL.map((card) => [card.id, 0]));
export const upgradeById = (id) => ALL.find((card) => card.id === id);
export const offersRelic = (wave, held) => wave === RELIC_WAVE && !RELICS.some((relic) => held[relic.id] > 0);

export function offerCards(random, held, wave) {
  const pool = random.shuffle((offersRelic(wave, held) ? RELICS : UPGRADES.filter((card) => held[card.id] < card.max)).map((card) => card.id));
  const rest = pool.slice(3).sort((a, b) => RANK[upgradeById(b).rarity] - RANK[upgradeById(a).rarity]);
  return rest.length ? [...pool.slice(0, 3), rest[0]] : pool;
}

export function applyUpgrade(world, id) {
  world.upgrades[id] = (world.upgrades[id] || 0) + 1;
  const { weaver, slow } = world;
  if (id === 'reach') weaver.reach += 90;
  if (id === 'swift') weaver.speedMult *= 1.25;
  if (id === 'heart') growHearts(weaver);
  if (id === 'still') Object.assign(slow, { duration: SLOW_TIME.duration + world.upgrades.still * 2, cooldown: Math.max(6, SLOW_TIME.cooldown - world.upgrades.still * 4), charge: 1 });
  if (id === 'hourglass') slow.charge = 1;
}

export function heldCards(held) {
  return ALL.filter((card) => held[card.id] > 0).map((card) => ({ id: card.id, name: card.max > 1 ? `${card.name} ${ROMAN[held[card.id]] || held[card.id]}` : card.name, rarity: card.rarity, stat: card.stat(held[card.id]) }));
}

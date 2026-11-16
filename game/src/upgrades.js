// The upgrade cards offered between waves: what each one is called, what it does, how many times
// it can be taken, and how picking one changes the world. Three are offered; the player keeps one.
import { SLOW_TIME } from './config.js';
import { growHearts } from './weaver.js';

export const UPGRADES = [
  { id: 'reach', name: 'Long Reach', max: 3, blurb: 'Threads anchor to stars farther from the Weaver.', effect: '+90 reach' },
  { id: 'swift', name: 'Swift Spark', max: 3, blurb: 'The Weaver flies a quarter faster.', effect: '+25% speed' },
  { id: 'ember', name: 'Ember Thread', max: 1, blurb: 'Moths that touch a held thread burn away.', effect: 'threads burn' },
  { id: 'heart', name: 'Another Heart', max: 3, blurb: 'One more heart, and one healed now.', effect: '+1 heart' },
  { id: 'still', name: 'Still Time', max: 2, blurb: 'Space slows every moth for a few seconds.', effect: 'Space: slow time' },
  { id: 'shield', name: 'Star Shield', max: 1, blurb: 'Closing a loop shields the Weaver for 2.5 s.', effect: 'shield on snap' },
  { id: 'gold', name: 'Gold Weave', max: 1, blurb: 'Every loop scores one tier higher.', effect: '+1 tier' },
  { id: 'steady', name: 'Steady Hand', max: 1, blurb: 'Cutters need twice as long to sever a thread.', effect: 'slow cutters' },
  { id: 'net', name: 'Wide Net', max: 1, blurb: 'Loops also catch moths just outside the thread.', effect: '+40 px catch' },
];

/** Fresh counts of every upgrade: none held. */
export function emptyUpgrades() {
  const held = {};
  for (const upgrade of UPGRADES) held[upgrade.id] = 0;
  return held;
}

/** Three cards the player does not already hold at the maximum, in a random order. */
export function offerUpgrades(random, held) {
  const candidates = UPGRADES.filter((upgrade) => (held[upgrade.id] || 0) < upgrade.max).map((upgrade) => upgrade.id);
  random.shuffle(candidates);
  return candidates.slice(0, 3);
}

/** The definition of an upgrade by id. */
export function upgradeById(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id);
}

/** Apply the upgrade `id` to the world and count it as held. */
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
    default: break;
  }
}

/** Short badges for the HUD: the held upgrades with roman numerals for stacks. */
export function upgradeBadges(held) {
  const numerals = ['', 'I', 'II', 'III'];
  const badges = [];
  for (const upgrade of UPGRADES) {
    const count = held[upgrade.id] || 0;
    if (count > 0) badges.push({ id: upgrade.id, label: upgrade.max > 1 ? `${upgrade.name} ${numerals[count] || count}` : upgrade.name });
  }
  return badges;
}

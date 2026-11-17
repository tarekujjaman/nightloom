// A small seeded generator (mulberry32), so a seed replays the same night; nothing in the simulation calls Math.random.

/** next() in [0, 1), range(low, high), int(low, high) inclusive, chance(p), angle() and an in-place Fisher–Yates shuffle. */
export function createRandom(seed) {
  let a = seed >>> 0;
  const random = {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(low, high) {
      return low + (high - low) * random.next();
    },
    int(low, high) {
      return low + Math.floor(random.next() * (high - low + 1));
    },
    chance(p) {
      return random.next() < p;
    },
    angle() {
      return random.next() * Math.PI * 2;
    },
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random.next() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    },
  };
  return random;
}

// A small seeded random generator (mulberry32), so a seed replays the same night: the same stars,
// the same moths, the same sparks. Nothing in the simulation calls Math.random.

/** A generator whose sequence is fixed by `seed`. */
export function createRandom(seed) {
  let a = seed >>> 0;
  const random = {
    /** A float in [0, 1). */
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** A float in [low, high). */
    range(low, high) {
      return low + (high - low) * random.next();
    },
    /** An integer in [low, high]. */
    int(low, high) {
      return low + Math.floor(random.next() * (high - low + 1));
    },
    /** True with probability `p`. */
    chance(p) {
      return random.next() < p;
    },
    /** A unit-ish angle in [0, 2π). */
    angle() {
      return random.next() * Math.PI * 2;
    },
    /** Shuffle `list` in place (Fisher–Yates) and return it. */
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random.next() * (i + 1));
        const swap = list[i];
        list[i] = list[j];
        list[j] = swap;
      }
      return list;
    },
  };
  return random;
}

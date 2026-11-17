// The anchor stars (planted ones persist across waves) and the parallax backdrop stars.
import { FIELD, LOOM, STARS } from './config.js';

export function placeAnchorStars(random, count = STARS.count, top = STARS.topMargin, bottom = FIELD.height - STARS.margin, keep = []) {
  const stars = keep.slice();
  for (let attempts = 0; stars.length < count + keep.length && attempts < 4000; attempts += 1) {
    const x = random.range(STARS.margin, FIELD.width - STARS.margin);
    const y = random.range(top, bottom);
    const spacing = attempts > 2000 ? STARS.spacing * 0.7 : STARS.spacing;
    if (Math.hypot(x - LOOM.x, y - LOOM.y) >= LOOM.clear && stars.every((star) => Math.hypot(star.x - x, star.y - y) >= spacing)) {
      stars.push({ x, y, size: random.range(5, 8), phase: random.angle(), twinkle: random.range(1.2, 2.4) });
    }
  }
  return stars;
}

export function makeBackdropStars(random) {
  return [[0.015, 150, 0.7, 1.4, 0.5], [0.035, 80, 1.1, 2, 0.7], [0.07, 36, 1.7, 2.8, 0.95]].map(([depth, count, lo, hi, alpha]) => ({
    depth, alpha,
    stars: Array.from({ length: count }, () => ({ x: random.range(-80, FIELD.width + 80), y: random.range(-80, FIELD.height + 80), size: random.range(lo, hi), phase: random.angle(), speed: random.range(0.6, 2.2), warm: random.chance(0.3) })),
  }));
}

export function starAt(stars, x, y, radius = STARS.hitRadius) {
  let best = -1;
  let bestDistance = radius;
  stars.forEach((star, i) => {
    const distance = Math.hypot(star.x - x, star.y - y);
    if (distance < bestDistance) [best, bestDistance] = [i, distance];
  });
  return best;
}

export const starInReach = (star, x, y, reach) => Math.hypot(star.x - x, star.y - y) <= reach;

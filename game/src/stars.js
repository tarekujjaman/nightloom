// The anchor stars: placed clear of the Loom each wave; planted ones persist across waves.
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

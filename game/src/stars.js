// The anchor stars a thread can be woven between, and the parallax backdrop stars.
import { FIELD, STARS } from './config.js';

/** `count` anchor stars inside the margins, none closer than STARS.spacing to another. */
export function placeAnchorStars(random, count = STARS.count, topMargin = STARS.topMargin) {
  const stars = [];
  for (let attempts = 0; stars.length < count && attempts < 4000; attempts += 1) {
    const x = random.range(STARS.margin, FIELD.width - STARS.margin);
    const y = random.range(topMargin, FIELD.height - STARS.margin);
    const spacing = attempts > 2000 ? STARS.spacing * 0.7 : STARS.spacing;
    if (stars.every((star) => Math.hypot(star.x - x, star.y - y) >= spacing)) {
      stars.push({ x, y, size: random.range(5, 8), phase: random.angle(), twinkle: random.range(1.2, 2.4) });
    }
  }
  return stars;
}

/** Three parallax depths of small backdrop stars. */
export function makeBackdropStars(random) {
  return [
    { depth: 0.015, count: 150, size: [0.7, 1.4], alpha: 0.5 },
    { depth: 0.035, count: 80, size: [1.1, 2.0], alpha: 0.7 },
    { depth: 0.07, count: 36, size: [1.7, 2.8], alpha: 0.95 },
  ].map((layer) => ({
    depth: layer.depth,
    alpha: layer.alpha,
    stars: Array.from({ length: layer.count }, () => ({
      x: random.range(-80, FIELD.width + 80), y: random.range(-80, FIELD.height + 80),
      size: random.range(layer.size[0], layer.size[1]), phase: random.angle(), speed: random.range(0.6, 2.2), warm: random.chance(0.3),
    })),
  }));
}

/** The index of the anchor star under (x, y) within STARS.hitRadius, or -1. */
export function starAt(stars, x, y, radius = STARS.hitRadius) {
  let best = -1;
  let bestDistance = radius;
  for (let i = 0; i < stars.length; i += 1) {
    const distance = Math.hypot(stars[i].x - x, stars[i].y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** True when the star is within `reach` of the point. */
export function starInReach(star, x, y, reach) {
  return Math.hypot(star.x - x, star.y - y) <= reach;
}

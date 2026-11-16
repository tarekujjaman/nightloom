// The sky's stars: the anchor stars a thread can be woven between (placed each wave with a minimum
// spacing so they read as a constellation) and the three parallax layers of backdrop stars.
import { FIELD, STARS } from './config.js';

/** `count` anchor stars inside the margins, none closer than STARS.spacing to another. */
export function placeAnchorStars(random, count = STARS.count, topMargin = STARS.topMargin) {
  const stars = [];
  let attempts = 0;
  while (stars.length < count && attempts < 4000) {
    attempts += 1;
    const x = random.range(STARS.margin, FIELD.width - STARS.margin);
    const y = random.range(topMargin, FIELD.height - STARS.margin);
    const spacing = attempts > 2000 ? STARS.spacing * 0.7 : STARS.spacing;
    let clear = true;
    for (const star of stars) {
      if (Math.hypot(star.x - x, star.y - y) < spacing) {
        clear = false;
        break;
      }
    }
    if (clear) stars.push({ x, y, size: random.range(5, 8), phase: random.angle(), twinkle: random.range(1.2, 2.4) });
  }
  return stars;
}

/** Three depths of small backdrop stars; nearer layers are brighter and slide more with the Weaver. */
export function makeBackdropStars(random) {
  const layers = [
    { depth: 0.015, count: 170, size: [0.6, 1.3], alpha: 0.35 },
    { depth: 0.035, count: 90, size: [1.0, 1.9], alpha: 0.55 },
    { depth: 0.07, count: 40, size: [1.6, 2.6], alpha: 0.85 },
  ];
  return layers.map((layer) => ({
    depth: layer.depth,
    alpha: layer.alpha,
    stars: Array.from({ length: layer.count }, () => ({
      x: random.range(-80, FIELD.width + 80),
      y: random.range(-80, FIELD.height + 80),
      size: random.range(layer.size[0], layer.size[1]),
      phase: random.angle(),
      speed: random.range(0.6, 2.2),
      warm: random.chance(0.3),
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

/** True when the star is within `reach` of the point: the Weaver can only weave what it can touch. */
export function starInReach(star, x, y, reach) {
  return Math.hypot(star.x - x, star.y - y) <= reach;
}

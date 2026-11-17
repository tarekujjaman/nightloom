// The loom: the chain being woven, the loop it closes into, its flash and afterglow, and what a loop encloses.
import { LOOM } from './config.js';

export function createLoom() {
  return { chain: [], active: false, cursorX: 0, cursorY: 0, flashes: [], afterglows: [], ghosts: [], cut: null, plucked: 0 };
}

export function anchorThread(loom, starIndex) {
  loom.chain = [starIndex];
  loom.active = true;
  loom.cut = null;
  loom.plucked = 1;
}

export function extendThread(loom, starIndex) {
  loom.chain.push(starIndex);
  loom.plucked += 1;
}

export function canCloseLoop(loom, starIndex) {
  return loom.active && loom.chain.length >= LOOM.minLoop && loom.chain[0] === starIndex;
}

export function canExtendTo(loom, starIndex) {
  return loom.active && !loom.chain.includes(starIndex);
}

/** Close the chain into a loop: it flashes, then glows for `afterglowSeconds`; the chain is cleared. */
export function closeLoop(loom, stars, afterglowSeconds, tier = 1) {
  const polygon = loom.chain.map((index) => ({ x: stars[index].x, y: stars[index].y }));
  loom.flashes.push({ polygon, age: 0, tier });
  loom.afterglows.push({ polygon, age: 0, life: afterglowSeconds, tier });
  loom.chain = [];
  loom.active = false;
  loom.cut = null;
}

export function releaseThread(loom, stars) {
  if (loom.chain.length >= 2) loom.ghosts.push({ points: loom.chain.map((index) => ({ x: stars[index].x, y: stars[index].y })), age: 0 });
  loom.chain = [];
  loom.active = false;
  loom.cut = null;
}

/** A cutter has severed segment `segmentIndex`: the chain keeps the stars up to it; the rest falls away. */
export function severThread(loom, stars, segmentIndex) {
  const lost = loom.chain.slice(segmentIndex);
  if (lost.length >= 2) loom.ghosts.push({ points: lost.map((index) => ({ x: stars[index].x, y: stars[index].y })), age: 0, cut: true });
  loom.chain = loom.chain.slice(0, segmentIndex + 1);
  loom.cut = null;
  if (loom.chain.length === 0) loom.active = false;
}

export function chainSegments(loom, stars) {
  const segments = [];
  for (let i = 0; i + 1 < loom.chain.length; i += 1) {
    const a = stars[loom.chain[i]];
    const b = stars[loom.chain[i + 1]];
    segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, index: i });
  }
  return segments;
}

export function stepLoom(loom, dt) {
  for (const flash of loom.flashes) flash.age += dt;
  loom.flashes = loom.flashes.filter((flash) => flash.age < LOOM.flash);
  for (const glow of loom.afterglows) glow.age += dt;
  loom.afterglows = loom.afterglows.filter((glow) => glow.age < glow.life);
  for (const ghost of loom.ghosts) ghost.age += dt;
  loom.ghosts = loom.ghosts.filter((ghost) => ghost.age < 0.6);
}

export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonCentroid(points) {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function nearestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const x = ax + dx * t;
  const y = ay + dy * t;
  return { x, y, distance: Math.hypot(px - x, py - y) };
}

export function distanceToPolygonEdge(x, y, points) {
  let best = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    best = Math.min(best, nearestOnSegment(x, y, a.x, a.y, b.x, b.y).distance);
  }
  return best;
}

export function polygonCaptures(x, y, points, margin = 0) {
  return pointInPolygon(x, y, points) || (margin > 0 && distanceToPolygonEdge(x, y, points) <= margin);
}

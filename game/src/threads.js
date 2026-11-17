// The weave: the chain being threaded, the loop it closes into, its flash and afterglow, and polygon maths.
import { WEAVE } from './config.js';

export const createWeave = () => ({ chain: [], active: false, cursorX: 0, cursorY: 0, flashes: [], afterglows: [], cut: null, plucked: 0, pluckWave: 0 });

export function anchorThread(weave, starIndex) {
  Object.assign(weave, { chain: [starIndex], active: true, cut: null, plucked: 1 });
}

export function extendThread(weave, starIndex) {
  weave.chain.push(starIndex);
  weave.plucked += 1;
}

export const canCloseLoop = (weave, starIndex) => weave.active && weave.chain.length >= WEAVE.minLoop && weave.chain[0] === starIndex;
export const canExtendTo = (weave, starIndex) => weave.active && !weave.chain.includes(starIndex);

export function closeLoop(weave, stars, afterglowSeconds, tier = 1) {
  const polygon = weave.chain.map((index) => ({ x: stars[index].x, y: stars[index].y }));
  weave.flashes.push({ polygon, age: 0, tier });
  weave.afterglows.push({ polygon, age: 0, life: afterglowSeconds, tier });
  releaseThread(weave);
}

export function releaseThread(weave) {
  Object.assign(weave, { chain: [], active: false, cut: null });
}

export function severThread(weave, segmentIndex) {
  weave.chain = weave.chain.slice(0, segmentIndex + 1);
  weave.cut = null;
  weave.active = weave.chain.length > 0;
}

export function chainSegments(weave, stars) {
  return weave.chain.slice(1).map((index, i) => {
    const a = stars[weave.chain[i]];
    const b = stars[index];
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y, index: i };
  });
}

export function stepWeave(weave, dt) {
  for (const list of [weave.flashes, weave.afterglows]) for (const item of list) item.age += dt;
  weave.flashes = weave.flashes.filter((flash) => flash.age < WEAVE.flash);
  weave.afterglows = weave.afterglows.filter((glow) => glow.age < glow.life);
  weave.pluckWave = Math.max(0, weave.pluckWave - dt * 1.8);
}

export const polygonArea = (pts) => Math.abs(pts.reduce((sum, a, i) => sum + a.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * a.y, 0)) / 2;
export const polygonCentroid = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });

export function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i];
    const b = pts[j];
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

export const distanceToPolygonEdge = (x, y, pts) => Math.min(...pts.map((a, i) => nearestOnSegment(x, y, a.x, a.y, pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y).distance));
export const polygonCaptures = (x, y, pts, margin = 0) => pointInPolygon(x, y, pts) || (margin > 0 && distanceToPolygonEdge(x, y, pts) <= margin);

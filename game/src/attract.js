// The autopilot that weaves on the title: pick a star cluster, fly there, sweep the cursor round it.
import { FIELD } from './config.js';
import { pointInPolygon, polygonArea, polygonCentroid } from './threads.js';

const CURSOR_SPEED = 620;

export const createAttractPilot = () => ({ phase: 'choose', cluster: [], index: 0, timer: 0.6, elapsed: 0, recent: [], loopsAtStart: 0, targetX: 0, targetY: 0, control: { moveX: 0, moveY: 0, cursorX: FIELD.width / 2, cursorY: FIELD.height / 2, pressed: false } });

export function chooseCluster(state, recent = []) {
  const { stars, moths, weaver } = state;
  let best = null;
  for (const origin of stars) {
    const byDistance = stars.map((star, i) => [Math.hypot(star.x - origin.x, star.y - origin.y), i]).sort((a, b) => a[0] - b[0]).map((entry) => entry[1]);
    for (const size of [4, 5, 6]) {
      if (byDistance.length < size) continue;
      const centre = polygonCentroid(byDistance.slice(0, size).map((i) => stars[i]));
      const ordered = byDistance.slice(0, size).sort((a, b) => Math.atan2(stars[a].y - centre.y, stars[a].x - centre.x) - Math.atan2(stars[b].y - centre.y, stars[b].x - centre.x));
      if (recent.some((cluster) => cluster.filter((star) => ordered.includes(star)).length * 2 > Math.min(cluster.length, size))) continue;
      const polygon = ordered.map((i) => stars[i]);
      if (polygon.some((p) => Math.hypot(p.x - centre.x, p.y - centre.y) > weaver.reach - 24)) continue;
      const count = moths.filter((moth) => moth.alive && !moth.boss && pointInPolygon(moth.x, moth.y, polygon)).length;
      const score = count * 100000 + polygonArea(polygon) / 100;
      if (!best || score > best.score) best = { score, cluster: ordered, centre, count };
    }
  }
  return best;
}

export function pilotControl(pilot, state, dt) {
  const control = pilot.control;
  control.moveX = control.moveY = 0;
  pilot.elapsed += dt;
  pilot.timer -= dt;
  if (pilot.phase === 'choose' || pilot.phase === 'rest') {
    control.pressed = false;
    if (pilot.timer > 0) return control;
    const choice = chooseCluster(state, pilot.recent) || chooseCluster(state);
    if (!choice) {
      pilot.timer = 0.5;
      return control;
    }
    pilot.recent = [...pilot.recent.slice(-2), choice.cluster];
    Object.assign(pilot, { phase: 'approach', elapsed: 0, index: 0, cluster: choice.cluster, targetX: Math.max(40, Math.min(FIELD.width - 40, choice.centre.x)), targetY: Math.max(40, Math.min(FIELD.height - 40, choice.centre.y)) });
    return control;
  }
  if (pilot.phase === 'approach') {
    const dx = pilot.targetX - state.weaver.x;
    const dy = pilot.targetY - state.weaver.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 12 && pilot.elapsed < 4) {
      control.moveX = dx / distance;
      control.moveY = dy / distance;
    } else Object.assign(pilot, { phase: 'weave', elapsed: 0, loopsAtStart: state.stats.loops });
    return control;
  }
  const n = pilot.cluster.length;
  const star = state.stars[pilot.cluster[pilot.index % n]];
  const dx = star.x - control.cursorX;
  const dy = star.y - control.cursorY;
  const distance = Math.hypot(dx, dy);
  const step = CURSOR_SPEED * dt;
  if (distance <= step) {
    control.cursorX = star.x;
    control.cursorY = star.y;
    if (pilot.index === 0) control.pressed = true;
    pilot.index += 1;
  } else {
    control.cursorX += (dx / distance) * step;
    control.cursorY += (dy / distance) * step;
  }
  const closed = state.stats.loops > pilot.loopsAtStart || pilot.index > n;
  if (closed || pilot.elapsed > 7) Object.assign(pilot, { phase: 'rest', timer: closed ? 0.9 : 0.3, elapsed: 0 });
  return control;
}

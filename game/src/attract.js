// The autopilot that weaves on the title and stages screenshots: pick a star cluster, fly there, sweep the cursor round it.
import { FIELD } from './config.js';
import { pointInPolygon, polygonArea, polygonCentroid } from './threads.js';

const CURSOR_SPEED = 620;
const WEAVE_TIMEOUT = 7;

export function createAttractPilot() {
  return {
    phase: 'choose', cluster: [], index: 0, timer: 0.6, elapsed: 0, recent: [], loopsAtStart: 0, targetX: FIELD.width / 2, targetY: FIELD.height / 2,
    control: { moveX: 0, moveY: 0, cursorX: FIELD.width / 2, cursorY: FIELD.height / 2, pressed: false, slowPressed: false },
  };
}

function orderByAngle(stars, indices) {
  const centre = polygonCentroid(indices.map((i) => stars[i]));
  return indices.slice().sort((a, b) => Math.atan2(stars[a].y - centre.y, stars[a].x - centre.x) - Math.atan2(stars[b].y - centre.y, stars[b].x - centre.x));
}

/** The cluster of 4 to 6 stars within reach of their middle whose loop would enclose the most moths (then the largest), none sharing half its stars with a `recent` one. */
export function chooseCluster(state, recent = []) {
  const { stars, moths, weaver } = state;
  let best = null;
  for (let s = 0; s < stars.length; s += 1) {
    const byDistance = stars.map((star, i) => ({ i, d: Math.hypot(star.x - stars[s].x, star.y - stars[s].y) })).sort((a, b) => a.d - b.d).map((entry) => entry.i);
    for (const size of [4, 5, 6]) {
      if (byDistance.length < size) continue;
      const ordered = orderByAngle(stars, byDistance.slice(0, size));
      if (recent.some((cluster) => cluster.filter((star) => ordered.includes(star)).length * 2 > Math.min(cluster.length, ordered.length))) continue;
      const polygon = ordered.map((i) => stars[i]);
      const centre = polygonCentroid(polygon);
      if (polygon.some((p) => Math.hypot(p.x - centre.x, p.y - centre.y) > weaver.reach - 24)) continue;
      const count = moths.filter((moth) => moth.alive && !moth.boss && pointInPolygon(moth.x, moth.y, polygon)).length;
      const score = count * 100000 + polygonArea(polygon) / 100;
      if (!best || score > best.score) best = { score, cluster: ordered, centre, count };
    }
  }
  return best;
}

/** The control for this step: where the Weaver flies, where the cursor is, whether it is held. */
export function pilotControl(pilot, state, dt) {
  const control = pilot.control;
  control.moveX = 0;
  control.moveY = 0;
  control.slowPressed = false;
  pilot.elapsed += dt;
  if (pilot.phase === 'choose') {
    pilot.timer -= dt;
    control.pressed = false;
    if (pilot.timer > 0) return control;
    const choice = chooseCluster(state, pilot.recent) || chooseCluster(state);
    if (!choice) {
      pilot.timer = 0.5;
      return control;
    }
    pilot.cluster = choice.cluster;
    pilot.recent.push(choice.cluster);
    if (pilot.recent.length > 3) pilot.recent.shift();
    pilot.targetX = Math.max(40, Math.min(FIELD.width - 40, choice.centre.x));
    pilot.targetY = Math.max(40, Math.min(FIELD.height - 40, choice.centre.y));
    pilot.phase = 'approach';
    pilot.elapsed = 0;
    pilot.index = 0;
    return control;
  }
  if (pilot.phase === 'approach') {
    const dx = pilot.targetX - state.weaver.x;
    const dy = pilot.targetY - state.weaver.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 12 && pilot.elapsed < 4) {
      control.moveX = dx / distance;
      control.moveY = dy / distance;
      return control;
    }
    pilot.phase = 'weave';
    pilot.elapsed = 0;
    pilot.index = 0;
    pilot.loopsAtStart = state.stats.loops;
    return control;
  }
  if (pilot.phase === 'weave') {
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
    if (closed || pilot.elapsed > WEAVE_TIMEOUT) {
      pilot.phase = 'rest';
      pilot.timer = closed ? 0.9 : 0.3;
      pilot.elapsed = 0;
    }
    return control;
  }
  pilot.timer -= dt;
  control.pressed = false;
  if (pilot.timer <= 0) {
    pilot.phase = 'choose';
    pilot.timer = 0.2;
  }
  return control;
}

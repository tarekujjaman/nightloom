// The screenshot scenes behind ?shot=play|title|upgrade|results: real game state staged to its best moment. Lives beside the tools (main.js imports it only under ?shot), so the hand-in's game/ stays lean.
import { ATTRACT, FIELD, LOOM, STEP } from '../game/src/config.js';
import { PHASE, createWorld, startWave, stepWorld } from '../game/src/world.js';
import { chooseCluster, createAttractPilot, pilotControl } from '../game/src/attract.js';
import { applyUpgrade } from '../game/src/upgrades.js';
import { anchorThread, distanceToPolygonEdge, extendThread, pointInPolygon, polygonCentroid } from '../game/src/threads.js';
import { spawnMoth } from '../game/src/enemies.js';
import { findBoss, stripVeil } from '../game/src/bosses.js';
import { SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE } from '../game/src/render.js';

const IDLE = { moveX: 0, moveY: 0, cursorX: -200, cursorY: -200, pressed: false };
const UI = { best: 38950, hover: -1, muted: false, isNewBest: false, time: 0.491 };
/** The Loom tower's box on the field: the cover keeps the loop, the boss, the Weaver and the stray moths off it. */
const TOWER = { x0: 336, x1: 632, y0: 104, y1: 516 };
const clearOfTower = (x, y, pad = 0) => x < TOWER.x0 - pad || x > TOWER.x1 + pad || y < TOWER.y0 - pad || y > TOWER.y1 + pad;
const sideOf = (polygon) => (polygon.every((p) => p.x < TOWER.x0) ? -1 : polygon.every((p) => p.x > TOWER.x1) ? 1 : 0);

function run(state, seconds, pilot = null) {
  for (let i = Math.round(seconds / STEP); i > 0; i -= 1) stepWorld(state, pilot ? pilotControl(pilot, state, STEP) : IDLE, STEP);
}

/** A night `seconds` into `wave` with `cards` held and `stats` so far, run so far as the attract scene (no hurt). */
function night(seed, cards, wave, seconds, pilot = null, stats = {}) {
  const state = createWorld(seed, false);
  for (const id of cards) applyUpgrade(state, id);
  Object.assign(state.stats, stats);
  startWave(state, wave);
  state.attract = true;
  run(state, seconds, pilot);
  state.attract = false;
  state.banner = null;
  return state;
}

function placeMoth(state, kind, x, y) {
  const moth = spawnMoth(kind, x, y, state.random, 1.6);
  moth.heading = state.random.angle();
  state.moths.push(moth);
  return moth;
}

/** How untidy the attract scene looks: moths piled together, out of the band or too few, fewer than two loops glowing, the fresh loop empty. */
function titleClutter(state) {
  const shown = state.moths.filter((moth) => moth.alive && moth.visible > 0.6 && moth.kind !== 'mite');
  let cost = (state.weave.afterglows.length < 2 ? 1000 : 0) + (state.callout ? 0 : 500) + Math.max(0, 6 - shown.length) * 90;
  shown.forEach((a, i) => {
    if (a.y < ATTRACT.top + 20 || a.y > ATTRACT.bottom - 20) cost += 60;
    for (const b of shown.slice(i + 1)) cost += Math.max(0, 90 - Math.hypot(a.x - b.x, a.y - b.y));
  });
  return cost;
}

/** The attract scene at its tidiest fresh loop in 45 s: one pass scores each, a second (the night replays alike) stops there. */
function stageTitle(seed) {
  let best = { step: Math.round(20 / STEP), cost: Infinity };
  let state;
  for (const pass of [0, 1]) {
    state = createWorld(seed, true);
    startWave(state, 3);
    const pilot = createAttractPilot();
    const steps = pass === 0 ? Math.round(45 / STEP) : best.step;
    for (let i = 0; i < steps; i += 1) {
      stepWorld(state, pilotControl(pilot, state, STEP), STEP);
      if (pass === 1 || i < Math.round(12 / STEP) || !state.weave.flashes.some((flash) => flash.age >= 0.16 && flash.age < 0.18)) continue;
      const cost = titleClutter(state);
      if (cost < best.cost) best = { step: i + 1, cost };
    }
  }
  return { state, screen: SCREEN_TITLE, ui: UI };
}

/** Wave 5 in the Ember Nebula on the Weavers' Hill: the Eclipse Moth caught inside a closing loop beside the village with escorts, the callout above, starlight flying, a lance pinning a dasher, the Loom torn to 58 and standing clear. */
function stagePlay(seed) {
  const pilot = createAttractPilot();
  const state = night(seed, ['reach', 'reach', 'swift', 'ember', 'heart', 'mend', 'gold'], 5, 14, pilot);
  const { weaver, random } = state;
  const boss = findBoss(state.moths);
  Object.assign(boss, { veils: 3, maxVeils: 3, alive: true, stun: 0 });
  stripVeil(boss);
  Object.assign(boss, { veils: 3, stun: 0 });
  state.weave.afterglows = [];
  weaver.hearts = 3;
  Object.assign(state.combo, { best: 18, chain: 2, lastCapture: state.time });
  Object.assign(state, { score: 23480, spawnQueue: ['dasher', 'drifter'], spawnTimer: 9, pending: [] });
  state.stats.waveCaptured = 9;
  Object.assign(state.starlight, { have: 186, shown: 186 });
  Object.assign(state.abilities, { pluck: 2.6, charges: 2, recharge: 3.1 });
  state.slow.charge = 0.7;
  // The loop: a pentagon of stars on the western slope, wholly clear of the tower (balancing the side panel), built by moving the five westernmost stars onto it; stars left standing on the tower go.
  const ring = [[190, 284], [312, 372], [266, 516], [114, 516], [68, 372]].map(([x, y]) => ({ x: x + random.range(-10, 10), y: y + random.range(-8, 8) }));
  const byX = state.stars.slice().sort((a, b) => a.x - b.x);
  const chosen = byX.slice(0, 5);
  const rest = byX.slice(5).filter((s) => clearOfTower(s.x, s.y, 10) && ring.every((p) => Math.hypot(p.x - s.x, p.y - s.y) >= 100));
  const moved = ring.map((target) => {
    const star = chosen.splice(chosen.map((s, i) => [Math.hypot(s.x - target.x, s.y - target.y), i]).sort((a, b) => a[0] - b[0])[0][1], 1)[0];
    return Object.assign(star, target);
  });
  state.stars = [...moved, ...rest];
  const choice = { cluster: [0, 1, 2, 3, 4], centre: polygonCentroid(moved) };
  const polygon = moved;
  const centre = choice.centre;
  const { stars } = state;
  boss.x = centre.x;
  boss.y = centre.y + 12;
  state.moths = [boss];
  moved[1].placed = true;
  moved[4].placed = true;
  let spot = { room: 0 };
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    for (const side of [1, -1]) {
      const x = (a.x + b.x) / 2 + (side * (b.y - a.y) * 90) / length;
      const y = (a.y + b.y) / 2 - (side * (b.x - a.x) * 90) / length;
      const room = Math.min(...stars.map((star) => Math.hypot(star.x - x, star.y - y)));
      if (room > spot.room && !pointInPolygon(x, y, polygon) && clearOfTower(x, y, 30) && x > 90 && x < FIELD.width - 90 && y > 140 && y < FIELD.height - 110) spot = { x, y, room };
    }
  });
  Object.assign(weaver, { x: spot.x, y: spot.y, trail: [] });
  ['mite', 'dasher', 'mite', 'cutter', 'drifter', 'drifter'].forEach((kind, i) => {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    let r = 120;
    while (r > 40 && !pointInPolygon(boss.x + Math.cos(angle) * r, boss.y + Math.sin(angle) * r, polygon)) r -= 10;
    placeMoth(state, kind, boss.x + Math.cos(angle) * r, boss.y + Math.sin(angle) * r);
  });
  const free = (x, y, gap) => clearOfTower(x, y, 36) && !pointInPolygon(x, y, polygon) && distanceToPolygonEdge(x, y, polygon) >= 80 && ![...state.moths, weaver].some((o) => Math.hypot(o.x - x, o.y - y) < gap) && !stars.some((s) => Math.hypot(s.x - x, s.y - y) < 60);
  for (const kind of ['drifter', 'dasher', 'cutter', 'splitter', 'drifter', 'dasher', 'cutter', 'drifter', 'dasher', 'mite', 'mite']) {
    for (let tries = 0; tries < 600; tries += 1) {
      const x = random.range(60, FIELD.width - 60);
      const y = random.range(110, FIELD.height - 80);
      if (!free(x, y, 125)) continue;
      placeMoth(state, kind, x, y);
      break;
    }
  }
  // Two moths out of the dark edge, flying in at the Loom.
  for (const [kind, x, y] of [['drifter', 40, 250], ['dasher', FIELD.width - 50, 300]]) {
    if (free(x, y, 90)) placeMoth(state, kind, x, y).heading = Math.atan2(LOOM.y - y, LOOM.x - x);
  }
  for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
    const x = weaver.x + Math.cos(angle) * 190;
    const y = weaver.y + Math.sin(angle) * 190;
    if (x < 70 || x > FIELD.width - 70 || y < 130 || y > FIELD.height - 100 || !free(x, y, 90)) continue;
    const pinned = placeMoth(state, 'dasher', x, y);
    Object.assign(pinned, { pinned: 1.8, stun: 1.8, heading: angle + Math.PI / 2 });
    state.abilities.lances.push({ x: x + Math.cos(angle) * 36, y: y + Math.sin(angle) * 36, dx: Math.cos(angle), dy: Math.sin(angle), travelled: 230, hit: [pinned.id] });
    break;
  }
  anchorThread(state.weave, choice.cluster[0]);
  for (let i = 1; i < choice.cluster.length; i += 1) extendThread(state.weave, choice.cluster[i]);
  const first = stars[choice.cluster[0]];
  for (let i = 0; i < 38; i += 1) stepWorld(state, { ...IDLE, cursorX: first.x, cursorY: first.y, pressed: true }, STEP);
  // The loop just stripped a veil: the phase banner and floating labels would sit on the callout, so they go.
  state.banner = null;
  state.effects.texts = [];
  state.loom.health = 58;
  return { state, screen: SCREEN_PLAY, ui: UI };
}

/** Wave 8 cleared in the Frost Veil, the Hollow Dark next: three threads, a fourth for starlight, and the re-roll. */
function stageUpgrade(seed) {
  const state = night(seed, ['reach', 'heart', 'still', 'swift'], 8, 9, createAttractPilot());
  Object.assign(state, { moths: [], spawnQueue: [], pending: [], phase: PHASE.UPGRADE, offer: ['reach', 'ember', 'net', 'gold'], score: 41260 });
  state.combo.best = 24;
  state.stats.waveCaptured = state.waveTotal;
  Object.assign(state.starlight, { have: 142, shown: 142, earned: 610 });
  state.loom.health = 81;
  return { state, screen: SCREEN_UPGRADE, ui: { ...UI, hover: 1 } };
}

/** Victory in the Hollow Dark: the night woven, every stat filled, a new best. */
function stageResults(seed) {
  const state = night(seed, ['reach', 'reach', 'swift', 'ember', 'gold', 'heart', 'mend', 'moonspool', 'still'], 10, 9, null, { captured: 168, loops: 44, burned: 14, hits: 4, bestLoop: 16240, perfectWaves: 5, bestChain: 5, waveCaptured: 16, starsPlaced: 6 });
  Object.assign(state, { score: 98730, phase: PHASE.WON, phaseTime: 5 });
  state.combo.best = 42;
  Object.assign(state.starlight, { have: 64, shown: 64, earned: 912 });
  state.loom.health = 58;
  return { state, screen: SCREEN_RESULTS, ui: { ...UI, best: 98730, isNewBest: true } };
}

export function stageShot(name, seed) {
  if (name === 'play') return stagePlay(seed);
  if (name === 'upgrade') return stageUpgrade(seed);
  if (name === 'results') return stageResults(seed);
  return stageTitle(seed);
}

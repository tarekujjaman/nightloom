// The screenshot scenes behind ?shot=play|title|upgrade|results: real game state staged to its best moment.
import { ATTRACT, FIELD, STEP } from './config.js';
import { PHASE, createWorld, startWave, stepWorld } from './world.js';
import { chooseCluster, createAttractPilot, pilotControl } from './attract.js';
import { applyUpgrade } from './upgrades.js';
import { anchorThread, distanceToPolygonEdge, extendThread, pointInPolygon } from './threads.js';
import { spawnMoth } from './enemies.js';
import { findBoss, stripVeil } from './bosses.js';
import { SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const IDLE = { moveX: 0, moveY: 0, cursorX: -200, cursorY: -200, pressed: false, slowPressed: false };
const UI = { best: 38950, hover: -1, muted: false, isNewBest: false, time: 0.491 };

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
}

/** How untidy the attract scene looks: moths piled together, out of the band or too few, fewer than two loops glowing, the fresh loop empty. */
function titleClutter(state) {
  const shown = state.moths.filter((moth) => moth.alive && moth.visible > 0.6 && moth.kind !== 'mite');
  let cost = (state.loom.afterglows.length < 2 ? 1000 : 0) + (state.callout ? 0 : 500) + Math.max(0, 6 - shown.length) * 90;
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
      if (pass === 1 || i < Math.round(12 / STEP) || !state.loom.flashes.some((flash) => flash.age >= 0.16 && flash.age < 0.18)) continue;
      const cost = titleClutter(state);
      if (cost < best.cost) best = { step: i + 1, cost };
    }
  }
  return { state, screen: SCREEN_TITLE, ui: UI };
}

/** Wave 10: the Hollow Queen caught low inside a closing loop with six escorts, the callout above her, the Weaver just outside, a dozen moths spread round the sky. */
function stagePlay(seed) {
  const pilot = createAttractPilot();
  const state = night(seed, ['reach', 'reach', 'swift', 'ember', 'still', 'gold', 'heart', 'moonspool'], 10, 15, pilot);
  const { stars, weaver, random } = state;
  const boss = findBoss(state.moths);
  boss.veils = 4;
  stripVeil(boss);
  boss.stun = 0;
  state.loom.afterglows = state.loom.afterglows.slice(-1);
  weaver.hearts = 3;
  state.combo.best = 24;
  state.score = 41280;
  state.stats.waveCaptured = 12;
  state.spawnQueue = ['cutter', 'phantom', 'dasher'];
  state.spawnTimer = 9;
  state.pending = [];
  const choice = chooseCluster(state, pilot.recent) || chooseCluster(state);
  const polygon = choice.cluster.map((i) => stars[i]);
  const centre = choice.centre;
  let drop = 70;
  while (drop > 0 && !pointInPolygon(centre.x, centre.y + drop, polygon)) drop -= 10;
  boss.x = centre.x;
  boss.y = centre.y + drop;
  state.moths = [boss];
  let spot = { room: 0 };
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    for (const side of [1, -1]) {
      const x = (a.x + b.x) / 2 + (side * (b.y - a.y) * 90) / length;
      const y = (a.y + b.y) / 2 - (side * (b.x - a.x) * 90) / length;
      const room = Math.min(...stars.map((star) => Math.hypot(star.x - x, star.y - y)));
      if (room > spot.room && !pointInPolygon(x, y, polygon) && x > 90 && x < FIELD.width - 90 && y > 140 && y < FIELD.height - 110) spot = { x, y, room };
    }
  });
  Object.assign(weaver, { x: spot.x, y: spot.y, trail: [] });
  ['mite', 'dasher', 'mite', 'cutter', 'phantom', 'drifter'].forEach((kind, i) => {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    let r = 120;
    while (r > 40 && !pointInPolygon(boss.x + Math.cos(angle) * r, boss.y + Math.sin(angle) * r, polygon)) r -= 10;
    placeMoth(state, kind, boss.x + Math.cos(angle) * r, boss.y + Math.sin(angle) * r);
  });
  for (const kind of ['drifter', 'dasher', 'cutter', 'phantom', 'drifter', 'dasher', 'cutter', 'phantom', 'drifter', 'dasher', 'mite', 'mite']) {
    for (let tries = 0; tries < 600; tries += 1) {
      const x = random.range(60, FIELD.width - 60);
      const y = random.range(110, FIELD.height - 80);
      if (pointInPolygon(x, y, polygon) || distanceToPolygonEdge(x, y, polygon) < 80) continue;
      if ([...state.moths, weaver].some((other) => Math.hypot(other.x - x, other.y - y) < 125) || stars.some((star) => Math.hypot(star.x - x, star.y - y) < 60)) continue;
      placeMoth(state, kind, x, y);
      break;
    }
  }
  state.combo.chain = 2;
  state.combo.lastCapture = state.time;
  anchorThread(state.loom, choice.cluster[0]);
  for (let i = 1; i < choice.cluster.length; i += 1) extendThread(state.loom, choice.cluster[i]);
  const first = stars[choice.cluster[0]];
  for (let i = 0; i < 14; i += 1) stepWorld(state, { ...IDLE, cursorX: first.x, cursorY: first.y, pressed: true }, STEP);
  return { state, screen: SCREEN_PLAY, ui: UI };
}

function stageUpgrade(seed) {
  const state = night(seed, ['reach', 'heart', 'still'], 6, 9, createAttractPilot());
  Object.assign(state, { moths: [], spawnQueue: [], pending: [], phase: PHASE.UPGRADE, offer: ['reach', 'ember', 'gold'], score: 11840 });
  state.combo.best = 12;
  state.stats.waveCaptured = state.waveTotal;
  return { state, screen: SCREEN_UPGRADE, ui: { ...UI, hover: 1 } };
}

function stageResults(seed) {
  const state = night(seed, ['swift', 'swift', 'ember', 'reach', 'still', 'moonspool'], 8, 9, null, { captured: 96, loops: 27, burned: 9, hits: 5, bestLoop: 2640, perfectWaves: 3, bestChain: 4, waveCaptured: 9 });
  Object.assign(state, { score: 12460, phase: PHASE.LOST, phaseTime: 5 });
  state.combo.best = 18;
  state.weaver.hearts = 0;
  return { state, screen: SCREEN_RESULTS, ui: UI };
}

export function stageShot(name, seed) {
  switch (name) {
    case 'play': return stagePlay(seed);
    case 'upgrade': return stageUpgrade(seed);
    case 'results': return stageResults(seed);
    default: return stageTitle(seed);
  }
}

// The screenshot scenes behind ?shot=play|title|upgrade|results: real game state staged to its best moment.
import { STEP } from './config.js';
import { PHASE, createWorld, startWave, stepWorld } from './world.js';
import { chooseCluster, createAttractPilot, pilotControl } from './attract.js';
import { applyUpgrade } from './upgrades.js';
import { anchorThread, extendThread, pointInPolygon } from './threads.js';
import { edgeSpawnPoint, spawnMoth } from './enemies.js';
import { findBoss, stripVeil } from './bosses.js';
import { SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const IDLE = { moveX: 0, moveY: 0, cursorX: -200, cursorY: -200, pressed: false, slowPressed: false };

function runPilot(state, seconds, pilot = createAttractPilot()) {
  for (let i = Math.round(seconds / STEP); i > 0; i -= 1) stepWorld(state, pilotControl(pilot, state, STEP), STEP);
  return pilot;
}

function runIdle(state, seconds) {
  for (let i = Math.round(seconds / STEP); i > 0; i -= 1) stepWorld(state, IDLE, STEP);
}

function ui(extra = {}) {
  return { best: 38950, hover: -1, muted: false, isNewBest: false, time: 0.491, ...extra };
}

function veteranWorld(seed, cards, stats, bestCombo) {
  const state = createWorld(seed, false);
  for (const id of cards) applyUpgrade(state, id);
  Object.assign(state.stats, stats);
  state.combo.best = bestCombo;
  return state;
}

function weaveCluster(state, choice, holdFrames) {
  const { stars, loom, weaver } = state;
  weaver.x = choice.centre.x;
  weaver.y = choice.centre.y;
  weaver.trail = [];
  anchorThread(loom, choice.cluster[0]);
  for (let i = 1; i < choice.cluster.length; i += 1) extendThread(loom, choice.cluster[i]);
  const first = stars[choice.cluster[0]];
  const control = { moveX: 0, moveY: 0, cursorX: first.x, cursorY: first.y, pressed: true, slowPressed: false };
  for (let i = 0; i < holdFrames; i += 1) stepWorld(state, control, STEP);
}

function gatherMoths(state, choice, wanted) {
  const { stars, weaver, moths } = state;
  const polygon = choice.cluster.map((i) => stars[i]);
  const candidates = moths.filter((moth) => moth.alive && !moth.boss && moth.kind !== 'warden').sort((a, b) => Math.hypot(a.x - weaver.x, a.y - weaver.y) - Math.hypot(b.x - weaver.x, b.y - weaver.y));
  let inside = candidates.filter((moth) => pointInPolygon(moth.x, moth.y, polygon)).length;
  let vertex = 0;
  for (const moth of candidates) {
    if (inside >= wanted) break;
    if (pointInPolygon(moth.x, moth.y, polygon)) continue;
    const corner = polygon[vertex % polygon.length];
    vertex += 1;
    moth.x = choice.centre.x + (corner.x - choice.centre.x) * 0.55 + (vertex % 2 ? 18 : -18);
    moth.y = choice.centre.y + (corner.y - choice.centre.y) * 0.55;
    moth.stun = 0;
    moth.visible = 1;
    moth.state = 'drift';
    inside += 1;
  }
}

function stageTitle(seed) {
  const state = createWorld(seed, true);
  startWave(state, 3);
  const pilot = createAttractPilot();
  for (let i = 0; i < Math.round(45 / STEP); i += 1) {
    stepWorld(state, pilotControl(pilot, state, STEP), STEP);
    const fresh = state.loom.flashes.some((flash) => flash.age >= 0.16 && flash.age < 0.18);
    if (i >= Math.round(12 / STEP) && fresh && state.loom.afterglows.length >= 3) break;
  }
  return { state, screen: SCREEN_TITLE, ui: ui() };
}

function stagePlay(seed) {
  const state = veteranWorld(seed, ['reach', 'reach', 'swift', 'ember', 'still', 'gold', 'heart', 'moonspool'], {}, 24);
  state.weaver.hearts = 3;
  startWave(state, 10);
  state.attract = true;
  const pilot = runPilot(state, 15);
  const boss = findBoss(state.moths);
  if (boss) {
    stripVeil(boss);
    stripVeil(boss);
    boss.stun = 0;
  }
  for (const kind of ['drifter', 'drifter', 'dasher', 'dasher', 'cutter', 'cutter', 'phantom', 'phantom', 'drifter', 'mite', 'mite']) {
    const point = edgeSpawnPoint(state.random);
    state.moths.push(spawnMoth(kind, point.x, point.y, state.random, 1.5));
  }
  runIdle(state, 2.2);
  state.attract = false;
  state.banner = null;
  state.score = 41280;
  state.stats.waveCaptured = 12;
  state.spawnQueue.push('cutter', 'phantom', 'dasher');
  const choice = chooseCluster(state, pilot.recent) || chooseCluster(state);
  gatherMoths(state, choice, 6);
  state.combo.chain = 2;
  state.combo.lastCapture = state.time;
  weaveCluster(state, choice, 14);
  return { state, screen: SCREEN_PLAY, ui: ui() };
}

function stageUpgrade(seed) {
  const state = veteranWorld(seed, ['reach', 'heart', 'still'], {}, 12);
  startWave(state, 6);
  state.attract = true;
  runPilot(state, 9);
  state.attract = false;
  state.moths = [];
  state.spawnQueue = [];
  state.pending = [];
  state.banner = null;
  state.phase = PHASE.UPGRADE;
  state.offer = ['reach', 'ember', 'gold'];
  state.score = 11840;
  state.stats.waveCaptured = state.waveTotal;
  return { state, screen: SCREEN_UPGRADE, ui: ui({ hover: 1 }) };
}

function stageResults(seed) {
  const state = veteranWorld(seed, ['swift', 'swift', 'ember', 'reach', 'still', 'moonspool'], { captured: 96, loops: 27, burned: 9, hits: 5, bestLoop: 2640, perfectWaves: 3, bestChain: 4 }, 18);
  startWave(state, 8);
  state.attract = true;
  runIdle(state, 9);
  state.attract = false;
  state.score = 12460;
  state.stats.waveCaptured = 9;
  state.weaver.hearts = 0;
  state.phase = PHASE.LOST;
  state.phaseTime = 5;
  return { state, screen: SCREEN_RESULTS, ui: ui() };
}

/** Build the named scene from `seed`: its world, the screen on top and the UI values to show. */
export function stageShot(name, seed) {
  switch (name) {
    case 'play': return stagePlay(seed);
    case 'upgrade': return stageUpgrade(seed);
    case 'results': return stageResults(seed);
    default: return stageTitle(seed);
  }
}

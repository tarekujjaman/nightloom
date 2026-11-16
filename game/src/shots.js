// The screenshot scenes behind ?shot=title|play|upgrade|victory|defeat (with &seed=N). Each one
// builds real game state with the real rules, autopiloted or scripted forward to the moment that
// shows the game best, and the same seed always gives the same frame.
import { STEP } from './config.js';
import { PHASE_LOST, PHASE_UPGRADE, PHASE_WON, createWorld, startWave, stepWorld } from './world.js';
import { chooseCluster, createAttractPilot, pilotControl } from './attract.js';
import { applyUpgrade } from './upgrades.js';
import { anchorThread, extendThread, pointInPolygon } from './threads.js';
import { SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE } from './screens.js';

const IDLE = { moveX: 0, moveY: 0, cursorX: -200, cursorY: -200, pressed: false, slowPressed: false };

/** Let the autopilot weave for `seconds`; returns the pilot. */
function runPilot(state, seconds, pilot = createAttractPilot()) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(state, pilotControl(pilot, state, STEP), STEP);
  return pilot;
}

/** Let the world run with no input for `seconds`. */
function runIdle(state, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(state, IDLE, STEP);
}

/** UI values for a frame; the wall time is chosen so every pulsing prompt is at its brightest. */
function ui(extra = {}) {
  return { best: 0, hover: -1, muted: false, isNewBest: false, time: 0.491, ...extra };
}

/** Weave the chosen cluster with the real rules: anchor, extend, then hold the cursor on the first star. */
function weaveCluster(state, choice, holdFrames) {
  const { stars, loom, weaver } = state;
  const cluster = choice.cluster;
  weaver.x = choice.centre.x;
  weaver.y = choice.centre.y;
  weaver.trail = [];
  anchorThread(loom, cluster[0]);
  for (let i = 1; i < cluster.length; i += 1) extendThread(loom, cluster[i]);
  const first = stars[cluster[0]];
  const control = { moveX: 0, moveY: 0, cursorX: first.x, cursorY: first.y, pressed: true, slowPressed: false };
  for (let i = 0; i < holdFrames; i += 1) stepWorld(state, control, STEP);
}

/** Move up to `wanted` of the nearest moths inside the cluster's polygon, so the loop has a catch. */
function gatherMoths(state, choice, wanted) {
  const { stars, weaver, moths } = state;
  const polygon = choice.cluster.map((i) => stars[i]);
  const candidates = moths.filter((moth) => moth.alive && moth.kind !== 'eclipse').sort((a, b) => Math.hypot(a.x - weaver.x, a.y - weaver.y) - Math.hypot(b.x - weaver.x, b.y - weaver.y));
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
    moth.state = 'drift';
    inside += 1;
  }
}

/** The cover: the title over an attract scene caught just as a loop snaps shut with others still glowing. */
function stageTitle(seed) {
  const state = createWorld(seed, true);
  startWave(state, 3);
  const pilot = createAttractPilot();
  const minSteps = Math.round(12 / STEP);
  const maxSteps = Math.round(45 / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    stepWorld(state, pilotControl(pilot, state, STEP), STEP);
    const fresh = state.loom.flashes.some((flash) => flash.age >= 0.16 && flash.age < 0.18);
    if (i >= minSteps && fresh && state.loom.afterglows.length >= 3) break;
  }
  return { state, screen: SCREEN_TITLE, ui: ui({ best: 12480 }) };
}

/** Wave 4 in full swing: threads held, a loop snapping shut on a knot of moths, every HUD element alive. */
function stagePlay(seed) {
  const state = createWorld(seed, false);
  for (const id of ['reach', 'ember', 'swift', 'still']) applyUpgrade(state, id);
  state.score = 6240;
  state.combo.best = 12;
  state.stats.captured = 31;
  state.stats.loops = 9;
  state.weaver.hearts = 2;
  startWave(state, 4);
  state.attract = true;
  runIdle(state, 10.5);
  const earlier = chooseCluster(state);
  gatherMoths(state, earlier, 2);
  weaveCluster(state, earlier, 2);
  runIdle(state, 1.4);
  state.attract = false;
  state.banner = null;
  const choice = chooseCluster(state, [earlier.cluster]);
  gatherMoths(state, choice, 5);
  weaveCluster(state, choice, 15);
  return { state, screen: SCREEN_PLAY, ui: ui({ best: 12480 }) };
}

/** The choice between waves: three cards over the field just cleared. */
function stageUpgrade(seed) {
  const state = createWorld(seed, false);
  applyUpgrade(state, 'reach');
  applyUpgrade(state, 'heart');
  state.score = 2860;
  state.combo.best = 8;
  state.stats.captured = 22;
  state.stats.loops = 6;
  startWave(state, 3);
  state.attract = true;
  runPilot(state, 9);
  state.attract = false;
  state.moths = [];
  state.spawnQueue = [];
  state.banner = null;
  state.phase = PHASE_UPGRADE;
  state.phaseTime = 0;
  state.offer = ['ember', 'still', 'heart'];
  state.score += 300;
  return { state, screen: SCREEN_UPGRADE, ui: ui({ hover: 1 }) };
}

/** The results after the tenth wave: the victory screen, its stats and the restart prompt. */
function stageVictory(seed) {
  const state = createWorld(seed, false);
  for (const id of ['reach', 'reach', 'swift', 'ember', 'heart', 'heart', 'gold', 'still']) applyUpgrade(state, id);
  startWave(state, 10);
  state.attract = true;
  runPilot(state, 8);
  state.attract = false;
  state.moths = [];
  state.spawnQueue = [];
  state.pending = [];
  state.banner = null;
  state.score = 48620;
  state.combo.best = 24;
  state.stats.captured = 163;
  state.stats.burned = 12;
  state.stats.loops = 41;
  state.weaver.hearts = 2;
  state.phase = PHASE_WON;
  state.phaseTime = 0;
  runIdle(state, 1.1);
  state.phaseTime = 5;
  return { state, screen: SCREEN_RESULTS, ui: ui({ best: 48620, isNewBest: true }) };
}

/** The results after the hearts run out. */
function stageDefeat(seed) {
  const state = createWorld(seed, false);
  for (const id of ['swift', 'ember']) applyUpgrade(state, id);
  state.score = 9480;
  state.combo.best = 10;
  state.stats.captured = 54;
  state.stats.loops = 15;
  startWave(state, 6);
  state.attract = true;
  runIdle(state, 9);
  state.attract = false;
  state.weaver.hearts = 0;
  state.phase = PHASE_LOST;
  state.phaseTime = 5;
  return { state, screen: SCREEN_RESULTS, ui: ui({ best: 12480 }) };
}

/** Build the named scene from `seed`: its world, the screen on top and the UI values to show. */
export function stageShot(name, seed) {
  switch (name) {
    case 'play': return stagePlay(seed);
    case 'upgrade': return stageUpgrade(seed);
    case 'victory': return stageVictory(seed);
    case 'defeat': return stageDefeat(seed);
    default: return stageTitle(seed);
  }
}

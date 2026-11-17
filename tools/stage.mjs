// The screenshot scenes behind ?shot=play|title|upgrade|results: real game state staged to its best moment. Lives beside the tools (main.js imports it only under ?shot), so the hand-in's game/ stays lean.
import { ATTRACT, FIELD, LOOM, STEP } from '../game/src/config.js';
import { PHASE, createWorld, startWave, stepWorld } from '../game/src/world.js';
import { createAttractPilot, pilotControl } from '../game/src/attract.js';
import { applyUpgrade } from '../game/src/upgrades.js';
import { anchorThread, distanceToPolygonEdge, extendThread, nearestOnSegment, pointInPolygon, polygonCentroid } from '../game/src/threads.js';
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

/** The attract scene (its Ember Nebula wave, so the sheet shows a second realm beside the cover's Aurora) at its tidiest fresh loop in 45 s: one pass scores each, a second (the night replays alike) stops there. */
function stageTitle(seed) {
  let best = { step: Math.round(20 / STEP), cost: Infinity };
  let state;
  for (const pass of [0, 1]) {
    state = createWorld(seed, true);
    startWave(state, 4);
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

/** The cover's loop: six stars filling the western third of the field, clear of the tower; the catch sits in its lower half, the callout lands in its upper half. */
const RING = [[82, 112], [270, 100], [330, 312], [280, 552], [92, 574], [42, 346]];
/** The new thread on the eastern slope: anchored at the first star, drawn to the second, the cursor on its way to the third. */
const HELD = [[676, 168], [914, 236], [848, 470]];
const CURSOR = { x: 870, y: 392 };

/** Wave 3 in Aurora Reach (wave 5 in the Ember Nebula round the Eclipse Moth with ?realm=1): a loop just snapped shut round seven moths, which dissolve in gold under the LOOP CLOSED callout, while the Weaver already holds a new thread on the eastern slope and more moths fly in at the torn Loom. Aurora was kept for the cover because its snow and teal give the clearest contrast for the threads, the moths, the Loom and the village. */
function stagePlay(seed, realm) {
  const ember = realm === 1;
  const state = night(seed, ember ? ['reach', 'reach', 'swift', 'ember', 'heart', 'mend', 'gold'] : ['reach', 'heart'], ember ? 5 : 3, 14, createAttractPilot());
  const { weaver, random } = state;
  const boss = ember ? findBoss(state.moths) : null;
  if (boss) {
    Object.assign(boss, { veils: 3, maxVeils: 3, alive: true, stun: 0 });
    stripVeil(boss);
    Object.assign(boss, { veils: 3, stun: 0 });
  }
  state.weave.afterglows = [];
  state.effects.caught = [];
  weaver.hearts = 3;
  Object.assign(state.combo, { best: ember ? 18 : 8, chain: 4, lastCapture: state.time });
  Object.assign(state, { score: ember ? 23480 : 6140, spawnQueue: ['dasher', 'drifter'], spawnTimer: 9, pending: [] });
  state.stats.waveCaptured = 9;
  Object.assign(state.starlight, { have: ember ? 186 : 94, shown: ember ? 186 : 94 });
  Object.assign(state.abilities, { pluck: 2.6, charges: 2, recharge: 3.1 });
  state.slow.charge = 0.7;
  // The loop's six stars and the held thread's three are made by moving the nine westernmost stars; the rest stay if they are clear of the tower, the loop and the thread.
  const ring = RING.map(([x, y]) => ({ x: x + random.range(-6, 6), y: y + random.range(-6, 6) }));
  const targets = [...ring, ...HELD.map(([x, y]) => ({ x, y }))];
  const byX = state.stars.slice().sort((a, b) => a.x - b.x);
  const chosen = byX.slice(0, targets.length);
  const moved = targets.map((target) => Object.assign(chosen.splice(chosen.map((s, i) => [Math.hypot(s.x - target.x, s.y - target.y), i]).sort((a, b) => a[0] - b[0])[0][1], 1)[0], target));
  const polygon = moved.slice(0, 6);
  const heldSegment = (x, y) => Math.min(nearestOnSegment(x, y, HELD[0][0], HELD[0][1], HELD[1][0], HELD[1][1]).distance, nearestOnSegment(x, y, HELD[1][0], HELD[1][1], CURSOR.x, CURSOR.y).distance);
  const rest = byX.slice(targets.length).filter((s) => clearOfTower(s.x, s.y, 10) && !pointInPolygon(s.x, s.y, polygon) && targets.every((p) => Math.hypot(p.x - s.x, p.y - s.y) >= 100) && heldSegment(s.x, s.y) > 70);
  state.stars = [...moved, ...rest];
  const { stars } = state;
  polygon[2].placed = true;
  polygon[5].placed = true;
  const centre = polygonCentroid(polygon);
  const hero = { x: centre.x, y: centre.y + 86 };
  state.moths = boss ? [Object.assign(boss, hero)] : [];
  if (!boss) placeMoth(state, 'splitter', hero.x, hero.y);
  // The escorts ring the catch at its sides and below, leaving the callout's room above and the boss's name tag beneath.
  [-0.4, 0.25, 0.8, 2.3, 2.9, 3.5].forEach((angle, i) => {
    let r = 108 + (i % 2) * 14;
    while (r > 40 && !pointInPolygon(hero.x + Math.cos(angle) * r, hero.y + Math.sin(angle) * r, polygon)) r -= 10;
    placeMoth(state, ['dasher', 'drifter', 'mite', 'drifter', 'cutter', 'dasher'][i], hero.x + Math.cos(angle) * r, hero.y + Math.sin(angle) * r);
  });
  Object.assign(weaver, { x: 722, y: 236, trail: [] });
  const free = (x, y, gap) => clearOfTower(x, y, 36) && !pointInPolygon(x, y, polygon) && distanceToPolygonEdge(x, y, polygon) >= 80 && heldSegment(x, y) > 56 && ![...state.moths, weaver].some((o) => Math.hypot(o.x - x, o.y - y) < gap) && !stars.some((s) => Math.hypot(s.x - x, s.y - y) < 60);
  for (const kind of ['drifter', 'cutter', 'splitter', 'drifter', 'dasher', 'mite']) {
    for (let tries = 0; tries < 600; tries += 1) {
      const x = random.range(60, FIELD.width - 60);
      const y = random.range(110, FIELD.height - 100);
      if (!free(x, y, 120)) continue;
      placeMoth(state, kind, x, y);
      break;
    }
  }
  // Two moths out of the dark edge, flying in at the Loom.
  for (const [kind, x, y] of [['drifter', FIELD.width - 46, 330], ['dasher', 560, FIELD.height - 70]]) {
    if (free(x, y, 90)) placeMoth(state, kind, x, y).heading = Math.atan2(LOOM.y - y, LOOM.x - x);
  }
  // The loop closes, the button lifts, and a new thread is anchored and drawn east: a third of a second in all, so the flash has settled into the gold afterglow while the bursts and the dissolving catch still show.
  anchorThread(state.weave, 0);
  for (let i = 1; i < 6; i += 1) extendThread(state.weave, i);
  const at = (star, pressed = true) => ({ ...IDLE, cursorX: star.x, cursorY: star.y, pressed });
  for (const control of [at(stars[0]), at(stars[0], false), at(stars[6]), at(stars[7]), ...Array(16).fill(at(CURSOR))]) stepWorld(state, control, STEP);
  // The loop just stripped a veil: the phase banner, the floating labels and the starlight motes would sit on the callout, so they go.
  state.banner = null;
  state.effects.texts = [];
  state.starlight.motes = [];
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
  if (name === 'play') return stagePlay(seed, Number(new URLSearchParams(window.location.search).get('realm') ?? 0));
  if (name === 'upgrade') return stageUpgrade(seed);
  if (name === 'results') return stageResults(seed);
  return stageTitle(seed);
}

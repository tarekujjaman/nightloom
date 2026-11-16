// The rules of NIGHTLOOM, advanced in fixed steps: the Weaver moves, a held thread chains from star
// to star and snaps into a loop that captures every moth inside, moths spawn by wave and hunt the
// Weaver, hearts are lost on touch, waves clear into upgrade choices, and the night is won at ten.
import { FIELD, LOOM, MOTHS, SCORING, SLOW_TIME, SPAWN, STARS } from './config.js';
import { createRandom } from './random.js';
import { makeBackdropStars, placeAnchorStars, starAt, starInReach } from './stars.js';
import { createWeaver, hurtWeaver, stepWeaver, weaverVulnerable } from './weaver.js';
import {
  anchorThread, canCloseLoop, canExtendTo, chainSegments, closeLoop, createLoom, extendThread,
  nearestOnSegment, polygonArea, polygonCaptures, polygonCentroid, releaseThread, severThread, stepLoom,
} from './threads.js';
import { edgeSpawnPoint, knockBack, mothTouchesWeaver, spawnMoth, stepMoth, stripVeil, veilEclipse } from './enemies.js';
import { WAVE_COUNT, bossVeils, spawnInterval, waveDefinition, waveSpawnList, waveSpeedScale } from './waves.js';
import { applyUpgrade, emptyUpgrades, offerUpgrades } from './upgrades.js';
import { addShake, burst, createEffects, edgeSparks, floatText, stepEffects } from './particles.js';
import { scoreLoop, tierName, waveBonus } from './scoring.js';

/** A new night from `seed`; in attract mode the Weaver cannot be hurt and waves cycle for the title. */
export function createWorld(seed, attract = false) {
  const random = createRandom(seed);
  const state = {
    seed,
    random,
    attract,
    time: 0,
    phase: PHASE_PLAY,
    phaseTime: 0,
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    stars: [],
    backdrop: makeBackdropStars(random),
    weaver: createWeaver(),
    loom: createLoom(),
    moths: [],
    pending: [],
    score: 0,
    combo: { chain: 0, lastCapture: -Infinity, best: 0, current: 0 },
    stats: { captured: 0, loops: 0, burned: 0, hits: 0, bestLoop: 0, perfectWaves: 0 },
    upgrades: emptyUpgrades(),
    offer: [],
    slow: { owned: false, charge: 1, active: 0, duration: SLOW_TIME.duration, cooldown: SLOW_TIME.cooldown },
    effects: createEffects(),
    hitThisWave: false,
    banner: null,
    lastCapture: null,
    hoverStar: -1,
    pressConsumed: false,
    celebrateTimer: 0,
  };
  return state;
}

/** Begin wave `wave`: a fresh constellation, a new spawn list and the wave banner. */
export function startWave(state, wave) {
  state.wave = wave;
  state.stars = placeAnchorStars(state.random, STARS.count, state.attract ? STARS.attractTopMargin : STARS.topMargin);
  state.spawnQueue = waveSpawnList(wave, state.random);
  state.waveTotal = state.spawnQueue.length;
  state.spawnTimer = SPAWN.firstDelay;
  state.phase = PHASE_PLAY;
  state.phaseTime = 0;
  state.hitThisWave = false;
  state.offer = [];
  releaseThread(state.loom, state.stars);
  const definition = waveDefinition(wave);
  state.banner = { title: `WAVE ${wave}`, name: definition.name, tagline: definition.tagline, boss: Boolean(definition.boss), age: 0 };
  for (const star of state.stars) burst(state.effects, state.random, star.x, star.y, { count: 4, colors: GOLD_SPARKS, speed: 60, life: 0.8, size: 2 });
  return EVENT_WAVE;
}

/** Pick the offered upgrade `id` and move on to the next wave. */
export function chooseUpgrade(state, id) {
  if (state.phase !== PHASE_UPGRADE || !state.offer.includes(id)) return 0;
  applyUpgrade(state, id);
  return startWave(state, state.wave + 1) | EVENT_UPGRADE;
}

export const PHASE_PLAY = 'play';
export const PHASE_CLEAR = 'clear';
export const PHASE_UPGRADE = 'upgrade';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

export const EVENT_ANCHOR = 1;
export const EVENT_EXTEND = 2;
export const EVENT_SNAP = 4;
export const EVENT_CAPTURE = 8;
export const EVENT_HIT = 16;
export const EVENT_CUT = 32;
export const EVENT_WAVE = 64;
export const EVENT_CLEAR = 128;
export const EVENT_WON = 256;
export const EVENT_LOST = 512;
export const EVENT_SLOW = 1024;
export const EVENT_RELEASE = 2048;
export const EVENT_BURN = 4096;
export const EVENT_VEIL = 8192;
export const EVENT_UPGRADE = 16384;

const CLEAR_SECONDS = 2.0;
const WON_SECONDS = 2.6;
const LOST_SECONDS = 2.0;
const ATTRACT_WAVES = 4;

const GOLD_SPARKS = ['#ffd36b', '#fff2c4', '#74f3ff', '#ffffff'];
const EMBER_SPARKS = ['#ff3b2a', '#ff8a45', '#ffd36b'];
const VOID_SPARKS = ['#a27bff', '#74f3ff', '#ffffff'];

/** Spawn the next queued moth at the edge of the dark (the Eclipse Moth descends from the top). */
function spawnNext(state) {
  const kind = state.spawnQueue.shift();
  const scale = waveSpeedScale(state.wave);
  if (kind === 'eclipse') {
    const boss = spawnMoth('eclipse', FIELD.width / 2, -90, state.random, scale);
    veilEclipse(boss, bossVeils(state.wave));
    state.moths.push(boss);
    return;
  }
  const point = edgeSpawnPoint(state.random);
  state.moths.push(spawnMoth(kind, point.x, point.y, state.random, scale));
}

/** Weave by the cursor: anchor, extend, close or release the chain. */
function stepWeaving(state, control) {
  const { loom, stars, weaver } = state;
  let events = 0;
  loom.cursorX = control.cursorX;
  loom.cursorY = control.cursorY;
  const hover = starAt(stars, control.cursorX, control.cursorY);
  state.hoverStar = hover;
  if (!control.pressed) {
    state.pressConsumed = false;
    if (loom.active) {
      releaseThread(loom, stars);
      events |= EVENT_RELEASE;
    }
    return events;
  }
  if (hover < 0) return events;
  const star = stars[hover];
  if (!loom.active) {
    if (!state.pressConsumed && starInReach(star, weaver.x, weaver.y, weaver.reach)) {
      anchorThread(loom, hover);
      burst(state.effects, state.random, star.x, star.y, { count: 8, colors: GOLD_SPARKS, speed: 90, life: 0.5, size: 2 });
      events |= EVENT_ANCHOR;
    }
    return events;
  }
  if (canCloseLoop(loom, hover)) {
    events |= EVENT_SNAP | captureLoop(state);
    state.pressConsumed = true;
  } else if (canExtendTo(loom, hover) && starInReach(star, weaver.x, weaver.y, weaver.reach)) {
    extendThread(loom, hover);
    burst(state.effects, state.random, star.x, star.y, { count: 6, colors: GOLD_SPARKS, speed: 80, life: 0.45, size: 2 });
    events |= EVENT_EXTEND;
  }
  return events;
}

/** Snap the held chain shut and capture what it encloses. */
function captureLoop(state) {
  const { loom, stars, moths, weaver, effects, random } = state;
  const afterglow = state.attract ? LOOM.attractAfterglow : LOOM.afterglow;
  const polygon = loom.chain.map((index) => ({ x: stars[index].x, y: stars[index].y }));
  const area = polygonArea(polygon);
  const margin = state.upgrades.net ? LOOM.wideNet : 0;
  const worths = [];
  let events = 0;
  for (const moth of moths) {
    if (!moth.alive || !polygonCaptures(moth.x, moth.y, polygon, margin)) continue;
    if (moth.kind === 'eclipse') {
      if (stripVeil(moth)) {
        moth.alive = false;
        worths.push(moth.points);
        state.stats.captured += 1;
        burst(effects, random, moth.x, moth.y, { count: 90, colors: GOLD_SPARKS, speed: 420, life: 1.4, size: 4, drag: 1.6 });
        burst(effects, random, moth.x, moth.y, { count: 40, colors: EMBER_SPARKS, speed: 200, life: 1.0, size: 3 });
        addShake(effects, 16);
      } else {
        worths.push(MOTHS.eclipse.veilPoints);
        burst(effects, random, moth.x, moth.y, { count: 40, colors: VOID_SPARKS, speed: 300, life: 1.0, size: 3.5 });
        floatText(effects, moth.x, moth.y - moth.radius - 20, `VEIL ${moth.maxVeils - moth.veils} / ${moth.maxVeils}`, { color: '#a27bff', size: 30 });
        events |= EVENT_VEIL;
      }
      continue;
    }
    moth.alive = false;
    worths.push(moth.points);
    state.stats.captured += 1;
    burst(effects, random, moth.x, moth.y, { count: 20, colors: GOLD_SPARKS, speed: 230, life: 0.8, size: 3 });
    burst(effects, random, moth.x, moth.y, { count: 6, colors: EMBER_SPARKS, speed: 120, life: 0.5, size: 2.5 });
  }
  const chain = state.time - state.combo.lastCapture <= SCORING.comboWindow ? state.combo.chain + 1 : 1;
  const result = scoreLoop(area, worths, chain, state.upgrades.gold > 0);
  closeLoop(loom, stars, afterglow, result.tier);
  state.stats.loops += 1;
  edgeSparks(effects, random, polygon, GOLD_SPARKS);
  const centre = polygonCentroid(polygon);
  if (worths.length > 0) {
    state.combo.chain = chain;
    state.combo.lastCapture = state.time;
    state.combo.current = result.multiplier;
    state.combo.best = Math.max(state.combo.best, result.multiplier);
    state.score += result.points;
    state.stats.bestLoop = Math.max(state.stats.bestLoop, result.points);
    state.lastCapture = { points: result.points, tier: result.tier, count: result.count, multiplier: result.multiplier, chain, x: centre.x, y: centre.y, age: 0 };
    floatText(effects, centre.x, centre.y - 74, `+${result.points}`, { color: '#fff2c4', size: 44, life: 1.6, rise: 60 });
    floatText(effects, centre.x, centre.y - 34, `${tierName(result.tier)}  ×${Math.round(result.multiplier * 10) / 10}`, { color: '#74f3ff', size: 24, life: 1.6, rise: 40 });
    effects.goldFlash = Math.min(1, 0.25 + 0.12 * result.count);
    events |= EVENT_CAPTURE;
  } else {
    floatText(effects, centre.x, centre.y, 'EMPTY LOOP', { color: '#a494cc', size: 22, life: 1.0 });
  }
  if (state.upgrades.shield > 0) weaver.shield = 2.5;
  return events;
}

/** Ember threads: a moth that lingers on a held thread burns away for its base worth. */
function stepBurning(state, dt) {
  const { loom, stars, moths, effects, random } = state;
  let events = 0;
  const segments = loom.active && loom.chain.length >= 2 ? chainSegments(loom, stars) : [];
  for (const moth of moths) {
    if (!moth.alive || moth.kind === 'eclipse') continue;
    let touching = false;
    for (const segment of segments) {
      if (nearestOnSegment(moth.x, moth.y, segment.ax, segment.ay, segment.bx, segment.by).distance < moth.radius + 4) {
        touching = true;
        break;
      }
    }
    if (!touching) {
      moth.burn = Math.max(0, moth.burn - dt * 1.5);
      continue;
    }
    moth.burn += dt;
    if (random.chance(0.5)) burst(effects, random, moth.x, moth.y, { count: 1, colors: EMBER_SPARKS, speed: 90, life: 0.5, size: 2.5, gravity: -120 });
    const needed = moth.kind === 'cutter' ? LOOM.cutterBurnSeconds : LOOM.burnSeconds;
    if (moth.burn >= needed) {
      moth.alive = false;
      state.score += moth.points;
      state.stats.burned += 1;
      burst(effects, random, moth.x, moth.y, { count: 22, colors: EMBER_SPARKS, speed: 200, life: 0.8, size: 3, gravity: -80 });
      floatText(effects, moth.x, moth.y - 20, `+${moth.points}`, { color: '#ff8a45', size: 22, life: 1.0 });
      events |= EVENT_BURN;
    }
  }
  return events;
}

/** The Weaver touched by a moth: a heart falls, the moth is thrown back, and the night may end. */
function stepCollisions(state) {
  const { weaver, moths, effects, random } = state;
  let events = 0;
  for (const moth of moths) {
    if (!moth.alive || !mothTouchesWeaver(moth, weaver)) continue;
    if (state.attract) {
      knockBack(moth, weaver.x, weaver.y);
      continue;
    }
    if (!weaverVulnerable(weaver)) continue;
    knockBack(moth, weaver.x, weaver.y);
    state.hitThisWave = true;
    state.stats.hits += 1;
    state.combo.chain = 0;
    state.combo.current = 0;
    burst(effects, random, weaver.x, weaver.y, { count: 30, colors: EMBER_SPARKS, speed: 260, life: 0.8, size: 3 });
    addShake(effects, 14);
    effects.redFlash = 0.8;
    events |= EVENT_HIT;
    if (hurtWeaver(weaver)) {
      state.phase = PHASE_LOST;
      state.phaseTime = 0;
      releaseThread(state.loom, state.stars);
      burst(effects, random, weaver.x, weaver.y, { count: 120, colors: ['#ffffff', '#ffd36b', '#ff3b2a', '#74f3ff'], speed: 380, life: 1.6, size: 4, drag: 1.4 });
      addShake(effects, 24);
      events |= EVENT_LOST;
      break;
    }
  }
  return events;
}

/** True once every moth of the wave has been sent and captured. */
function waveIsClear(state) {
  if (state.spawnQueue.length > 0 || state.pending.length > 0) return false;
  for (const moth of state.moths) if (moth.alive) return false;
  return true;
}

/** The wave is done: bonus points, a banner, and on to the cards (or the victory). */
function finishWave(state) {
  const perfect = !state.hitThisWave;
  const bonus = waveBonus(state.wave, perfect);
  state.score += bonus;
  if (perfect) state.stats.perfectWaves += 1;
  state.phase = PHASE_CLEAR;
  state.phaseTime = 0;
  releaseThread(state.loom, state.stars);
  state.banner = { title: 'WAVE CLEARED', name: perfect ? `Untouched  +${bonus}` : `Wave bonus  +${bonus}`, tagline: '', boss: false, age: 0, clear: true };
  state.effects.goldFlash = 0.6;
  return EVENT_CLEAR;
}

/** Slow time on Space while it is owned and charged. */
function stepSlowTime(state, control, dt) {
  const slow = state.slow;
  let events = 0;
  if (slow.active > 0) {
    slow.active = Math.max(0, slow.active - dt);
  } else if (slow.owned && slow.charge < 1) {
    slow.charge = Math.min(1, slow.charge + dt / slow.cooldown);
  }
  if (control.slowPressed && slow.owned && slow.charge >= 1 && slow.active <= 0) {
    slow.active = slow.duration;
    slow.charge = 0;
    state.effects.cyanFlash = 1;
    events |= EVENT_SLOW;
  }
  return events;
}

/**
 * Advance the night by `dt` seconds under `control` ({ moveX, moveY, cursorX, cursorY, pressed,
 * slowPressed }). Returns the EVENT_ bits of what happened, for sounds and announcements.
 */
export function stepWorld(state, control, dt) {
  state.time += dt;
  state.phaseTime += dt;
  stepEffects(state.effects, state.random, dt);
  stepLoom(state.loom, dt);
  if (state.banner) {
    state.banner.age += dt;
    if (state.banner.age > 3.2) state.banner = null;
  }
  if (state.lastCapture) {
    state.lastCapture.age += dt;
    if (state.lastCapture.age > 2.5) state.lastCapture = null;
  }
  if (state.combo.chain > 0 && state.time - state.combo.lastCapture > SCORING.comboWindow) {
    state.combo.chain = 0;
    state.combo.current = 0;
  }
  if (state.phase === PHASE_UPGRADE) return 0;
  if (state.phase === PHASE_WON) {
    state.celebrateTimer -= dt;
    if (state.celebrateTimer <= 0 && state.phaseTime < WON_SECONDS + 1.5) {
      state.celebrateTimer = 0.22;
      const x = state.random.range(120, FIELD.width - 120);
      const y = state.random.range(140, FIELD.height - 120);
      burst(state.effects, state.random, x, y, { count: 36, colors: GOLD_SPARKS, speed: 260, life: 1.2, size: 3.2, drag: 1.8 });
    }
    return 0;
  }

  let events = 0;
  const slowFactor = state.slow.active > 0 ? SLOW_TIME.factor : 1;
  const mothDt = dt * slowFactor;

  if (state.phase !== PHASE_LOST) {
    stepWeaver(state.weaver, control, dt);
    events |= stepSlowTime(state, control, dt);
    if (state.phase === PHASE_PLAY) {
      events |= stepWeaving(state, control);
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnNext(state);
          state.spawnTimer = spawnInterval(state.wave, SPAWN.interval);
        }
      }
    }
  }

  for (const moth of state.moths) {
    if (!moth.alive) continue;
    const outcome = stepMoth(moth, state, mothDt);
    if (outcome === 'cut' && state.loom.cut) {
      const segment = state.loom.cut.segment;
      burst(state.effects, state.random, state.loom.cut.x, state.loom.cut.y, { count: 18, colors: ['#ff3b2a', '#ffffff', '#74f3ff'], speed: 180, life: 0.6, size: 2.5 });
      floatText(state.effects, state.loom.cut.x, state.loom.cut.y - 16, 'CUT!', { color: '#ff3b2a', size: 24, life: 0.9 });
      severThread(state.loom, state.stars, segment);
      addShake(state.effects, 5);
      events |= EVENT_CUT;
    }
  }
  if (state.loom.cut && !state.moths.some((moth) => moth.alive && moth.kind === 'cutter' && moth.state === 'chew')) state.loom.cut = null;
  if (state.pending.length > 0) {
    for (const moth of state.pending) state.moths.push(moth);
    state.pending.length = 0;
  }
  if (state.upgrades.ember > 0 && state.phase === PHASE_PLAY) events |= stepBurning(state, dt);
  if (state.phase === PHASE_PLAY) events |= stepCollisions(state);
  if (state.moths.length > 0 && state.moths.some((moth) => !moth.alive)) state.moths = state.moths.filter((moth) => moth.alive);

  if (state.phase === PHASE_PLAY && state.phaseTime > 1 && waveIsClear(state)) events |= finishWave(state);
  if (state.phase === PHASE_CLEAR && state.phaseTime >= CLEAR_SECONDS) {
    if (state.attract) {
      events |= startWave(state, (state.wave % ATTRACT_WAVES) + 1);
    } else if (state.wave >= WAVE_COUNT) {
      state.phase = PHASE_WON;
      state.phaseTime = 0;
      state.effects.goldFlash = 1;
      events |= EVENT_WON;
    } else {
      state.phase = PHASE_UPGRADE;
      state.phaseTime = 0;
      state.offer = offerUpgrades(state.random, state.upgrades);
      state.banner = null;
    }
  }
  return events;
}

/** True when the end screen should take over from the field. */
export function worldFinished(state) {
  return (state.phase === PHASE_WON && state.phaseTime >= WON_SECONDS) || (state.phase === PHASE_LOST && state.phaseTime >= LOST_SECONDS);
}

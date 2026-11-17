// The rules of NIGHTLOOM in fixed steps: weaving, captures, moths, hearts, waves, cards and the end of the night.
import { FIELD, LOOM, MOTHS, SCORING, SLOW_TIME, SPAWN, STARS } from './config.js';
import { createRandom } from './random.js';
import { makeBackdropStars, placeAnchorStars, starAt, starInReach } from './stars.js';
import { createWeaver, hurtWeaver, stepWeaver, weaverVulnerable } from './weaver.js';
import { anchorThread, canCloseLoop, canExtendTo, chainSegments, closeLoop, createLoom, distanceToPolygonEdge, extendThread, nearestOnSegment, polygonArea, polygonCaptures, polygonCentroid, releaseThread, severThread, stepLoom } from './threads.js';
import { edgeSpawnPoint, knockBack, mothCapturable, mothTouchesWeaver, spawnMoth, stepMoth } from './enemies.js';
import { BOSSES, bossPhase, spawnBoss, stepBoss, stripVeil } from './bosses.js';
import { WAVE_COUNT, spawnInterval, waveDefinition, waveSpawnList, waveSpeedScale } from './waves.js';
import { applyUpgrade, emptyUpgrades, offerCards } from './upgrades.js';
import { addShake, burst, createEffects, edgeSparks, floatText, stepEffects } from './particles.js';
import { scoreLoop, tierName, waveBonus } from './scoring.js';

export const PHASE = { PLAY: 'play', CLEAR: 'clear', UPGRADE: 'upgrade', WON: 'won', LOST: 'lost' };

export const EVENT = { ANCHOR: 1, EXTEND: 2, SNAP: 4, CAPTURE: 8, HIT: 16, CUT: 32, WAVE: 64, CLEAR: 128, WON: 256, LOST: 512, SLOW: 1024, RELEASE: 2048, BURN: 4096, VEIL: 8192, UPGRADE: 16384, PHASE: 32768 };

const CLEAR_SECONDS = 2;
const WON_SECONDS = 2.6;
const LOST_SECONDS = 2;
const ATTRACT_WAVES = 4;
const GOLD = ['#ffd36b', '#fff2c4', '#74f3ff', '#ffffff'];
const EMBER = ['#ff3b2a', '#ff8a45', '#ffd36b'];
const VOID = ['#b48cff', '#74f3ff', '#ffffff'];
const SPARKS = {
  star: { count: 4, colors: GOLD, speed: 60, life: 0.8, size: 2 }, anchor: { count: 8, colors: GOLD, speed: 90, life: 0.5, size: 2 },
  extend: { count: 6, colors: GOLD, speed: 80, life: 0.45, size: 2 }, catch: { count: 20, colors: GOLD, speed: 230, life: 0.8, size: 3 },
  catchEmber: { count: 6, colors: EMBER, speed: 120, life: 0.5, size: 2.5 }, bossFall: { count: 90, colors: GOLD, speed: 420, life: 1.4, size: 4, drag: 1.6 },
  bossEmber: { count: 40, colors: EMBER, speed: 200, life: 1, size: 3 }, veil: { count: 40, colors: VOID, speed: 300, life: 1, size: 3.5 },
  stun: { count: 6, colors: VOID, speed: 90, life: 0.6, size: 2 }, smoulder: { count: 1, colors: EMBER, speed: 90, life: 0.5, size: 2.5, gravity: -120 },
  burn: { count: 22, colors: EMBER, speed: 200, life: 0.8, size: 3, gravity: -80 }, hit: { count: 30, colors: EMBER, speed: 260, life: 0.8, size: 3 },
  fall: { count: 120, colors: ['#ffffff', '#ffd36b', '#ff3b2a', '#74f3ff'], speed: 380, life: 1.6, size: 4, drag: 1.4 },
  cut: { count: 18, colors: ['#ff3b2a', '#ffffff', '#74f3ff'], speed: 180, life: 0.6, size: 2.5 }, cheer: { count: 36, colors: GOLD, speed: 260, life: 1.2, size: 3.2, drag: 1.8 },
};
const sparks = (state, x, y, kind) => burst(state.effects, state.random, x, y, SPARKS[kind]);

/** A new night from `seed`; in attract mode the Weaver cannot be hurt and waves cycle for the title. */
export function createWorld(seed, attract = false) {
  const random = createRandom(seed);
  return {
    seed, random, attract, time: 0, phase: PHASE.PLAY, phaseTime: 0, wave: 0, waveTotal: 0, spawnQueue: [], spawnTimer: 0,
    stars: [], backdrop: makeBackdropStars(random), weaver: createWeaver(), loom: createLoom(), moths: [], pending: [],
    score: 0, combo: { chain: 0, lastCapture: -Infinity, best: 0, current: 0 },
    stats: { captured: 0, loops: 0, burned: 0, hits: 0, bestLoop: 0, perfectWaves: 0, bestChain: 0, waveCaptured: 0 },
    upgrades: emptyUpgrades(), offer: [], slow: { owned: false, charge: 1, active: 0, duration: SLOW_TIME.duration, cooldown: SLOW_TIME.cooldown },
    effects: createEffects(), hitThisWave: false, banner: null, callout: null, hoverStar: -1, pressConsumed: false, celebrateTimer: 0,
  };
}

/** Begin wave `wave`: a fresh constellation, a new spawn list and the wave banner. */
export function startWave(state, wave) {
  const definition = waveDefinition(wave);
  state.wave = wave;
  state.stars = placeAnchorStars(state.random, STARS.count, state.attract ? STARS.attractTopMargin : STARS.topMargin);
  state.spawnQueue = waveSpawnList(wave, state.random);
  state.waveTotal = state.spawnQueue.length;
  state.spawnTimer = SPAWN.firstDelay;
  state.phase = PHASE.PLAY;
  state.phaseTime = 0;
  state.hitThisWave = false;
  state.stats.waveCaptured = 0;
  state.offer = [];
  releaseThread(state.loom, state.stars);
  state.banner = { title: `WAVE ${wave}`, name: definition.name, tagline: definition.tagline, boss: Boolean(definition.boss), age: 0 };
  for (const star of state.stars) sparks(state, star.x, star.y, 'star');
  return EVENT.WAVE;
}

/** Pick the offered card `id` and move on to the next wave. */
export function chooseUpgrade(state, id) {
  if (state.phase !== PHASE.UPGRADE || !state.offer.includes(id)) return 0;
  applyUpgrade(state, id);
  return startWave(state, state.wave + 1) | EVENT.UPGRADE;
}

function spawnNext(state) {
  const kind = state.spawnQueue.shift();
  const scale = waveSpeedScale(state.wave);
  const boss = waveDefinition(state.wave).boss;
  if (boss && kind === boss.kind) {
    state.moths.push(spawnBoss(kind, boss.veils, state.random, scale));
    return;
  }
  const point = edgeSpawnPoint(state.random);
  state.moths.push(spawnMoth(kind, point.x, point.y, state.random, scale));
}

function stepWeaving(state, control) {
  const { loom, stars, weaver } = state;
  loom.cursorX = control.cursorX;
  loom.cursorY = control.cursorY;
  const hover = starAt(stars, control.cursorX, control.cursorY);
  state.hoverStar = hover;
  if (!control.pressed) {
    state.pressConsumed = false;
    if (!loom.active) return 0;
    releaseThread(loom, stars);
    return EVENT.RELEASE;
  }
  if (hover < 0) return 0;
  const star = stars[hover];
  const reachable = starInReach(star, weaver.x, weaver.y, weaver.reach);
  if (!loom.active) {
    if (state.pressConsumed || !reachable) return 0;
    anchorThread(loom, hover);
    sparks(state, star.x, star.y, 'anchor');
    return EVENT.ANCHOR;
  }
  if (canCloseLoop(loom, hover)) {
    state.pressConsumed = true;
    return EVENT.SNAP | captureLoop(state);
  }
  if (!canExtendTo(loom, hover) || !reachable) return 0;
  extendThread(loom, hover);
  sparks(state, star.x, star.y, 'extend');
  return EVENT.EXTEND;
}

function stripBoss(state, moth, worths) {
  const before = bossPhase(moth);
  if (stripVeil(moth)) {
    moth.alive = false;
    worths.push(moth.points);
    state.stats.captured += 1;
    state.stats.waveCaptured += 1;
    sparks(state, moth.x, moth.y, 'bossFall');
    sparks(state, moth.x, moth.y, 'bossEmber');
    addShake(state.effects, 16);
    return 0;
  }
  worths.push(MOTHS[moth.kind].veilPoints);
  sparks(state, moth.x, moth.y, 'veil');
  floatText(state.effects, moth.x, moth.y - moth.radius - 24, `VEIL ${moth.maxVeils - moth.veils} / ${moth.maxVeils}`, { color: '#b48cff', size: 30 });
  const phase = bossPhase(moth);
  if (phase === before) return EVENT.VEIL;
  const boss = BOSSES[moth.kind];
  state.banner = { title: boss.phases[phase], name: `${boss.name} · phase ${phase + 1} of 3`, tagline: boss.hint, boss: true, age: 0 };
  return EVENT.VEIL | EVENT.PHASE;
}

function captureLoop(state) {
  const { loom, stars, moths, weaver, effects, upgrades } = state;
  const polygon = loom.chain.map((index) => ({ x: stars[index].x, y: stars[index].y }));
  const margin = Math.max(upgrades.net ? LOOM.wideNet : 0, upgrades.lodestar ? LOOM.lodestar : 0);
  const worths = [];
  let events = 0;
  for (const moth of moths) {
    if (!moth.alive || !polygonCaptures(moth.x, moth.y, polygon, margin)) continue;
    if (!mothCapturable(moth, moths)) {
      floatText(effects, moth.x, moth.y - 24, moth.visible <= 0.6 ? 'FADED' : 'SHIELDED', { color: '#b48cff', size: 18, life: 0.9 });
    } else if (moth.boss) {
      events |= stripBoss(state, moth, worths);
    } else {
      moth.alive = false;
      worths.push(moth.points);
      state.stats.captured += 1;
      state.stats.waveCaptured += 1;
      sparks(state, moth.x, moth.y, 'catch');
      sparks(state, moth.x, moth.y, 'catchEmber');
    }
  }
  const chain = state.time - state.combo.lastCapture <= SCORING.comboWindow ? state.combo.chain + 1 : 1;
  const result = scoreLoop(polygonArea(polygon), worths, chain, upgrades.gold > 0);
  closeLoop(loom, stars, state.attract ? LOOM.attractAfterglow : LOOM.afterglow, result.tier);
  state.stats.loops += 1;
  edgeSparks(effects, state.random, polygon, GOLD);
  const centre = polygonCentroid(polygon);
  if (upgrades.starfall) {
    for (const moth of moths) {
      if (!moth.alive || moth.boss || distanceToPolygonEdge(moth.x, moth.y, polygon) > LOOM.stunRadius) continue;
      moth.stun = Math.max(moth.stun, 2);
      sparks(state, moth.x, moth.y, 'stun');
    }
  }
  if (upgrades.shield > 0) weaver.shield = 2.5;
  if (worths.length === 0) {
    floatText(effects, centre.x, centre.y, 'EMPTY LOOP', { color: '#d9ccff', size: 22, life: 1 });
    return events;
  }
  state.combo.chain = chain;
  state.combo.lastCapture = state.time;
  state.combo.current = result.multiplier;
  state.combo.best = Math.max(state.combo.best, result.multiplier);
  state.stats.bestChain = Math.max(state.stats.bestChain, chain);
  state.score += result.points;
  state.stats.bestLoop = Math.max(state.stats.bestLoop, result.points);
  if (upgrades.hourglass && state.slow.active <= 0) state.slow.charge = Math.min(1, state.slow.charge + 0.25 * result.count);
  state.callout = { points: result.points, tier: tierName(result.tier), count: result.count, multiplier: result.multiplier, chain, x: centre.x, y: centre.y, age: 0 };
  effects.goldFlash = Math.min(1, 0.25 + 0.12 * result.count);
  return events | EVENT.CAPTURE;
}

function stepBurning(state, dt) {
  const { loom, stars, moths } = state;
  let events = 0;
  const segments = loom.active && loom.chain.length >= 2 ? chainSegments(loom, stars) : [];
  for (const moth of moths) {
    if (!moth.alive || moth.boss) continue;
    if (!segments.some((s) => nearestOnSegment(moth.x, moth.y, s.ax, s.ay, s.bx, s.by).distance < moth.radius + 4)) {
      moth.burn = Math.max(0, moth.burn - dt * 1.5);
      continue;
    }
    moth.burn += dt;
    if (state.random.chance(0.5)) sparks(state, moth.x, moth.y, 'smoulder');
    if (moth.burn < (moth.kind === 'cutter' ? LOOM.cutterBurnSeconds : LOOM.burnSeconds)) continue;
    moth.alive = false;
    state.score += moth.points;
    state.stats.burned += 1;
    state.stats.waveCaptured += 1;
    sparks(state, moth.x, moth.y, 'burn');
    floatText(state.effects, moth.x, moth.y - 20, `BURNED +${moth.points}`, { color: '#ff8a45', size: 20, life: 1 });
    events |= EVENT.BURN;
  }
  return events;
}

function stepCollisions(state) {
  const { weaver, moths, effects } = state;
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
    sparks(state, weaver.x, weaver.y, 'hit');
    addShake(effects, 14);
    effects.redFlash = 0.8;
    events |= EVENT.HIT;
    if (!hurtWeaver(weaver)) continue;
    state.phase = PHASE.LOST;
    state.phaseTime = 0;
    releaseThread(state.loom, state.stars);
    sparks(state, weaver.x, weaver.y, 'fall');
    addShake(effects, 24);
    return events | EVENT.LOST;
  }
  return events;
}

function finishWave(state) {
  const perfect = !state.hitThisWave;
  const bonus = waveBonus(state.wave, perfect);
  state.score += bonus;
  if (perfect) state.stats.perfectWaves += 1;
  state.phase = PHASE.CLEAR;
  state.phaseTime = 0;
  releaseThread(state.loom, state.stars);
  state.banner = { title: 'WAVE CLEARED', name: perfect ? `Untouched  +${bonus}` : `Wave bonus  +${bonus}`, tagline: '', boss: false, age: 0, clear: true };
  state.effects.goldFlash = 0.6;
  return EVENT.CLEAR;
}

function stepSlowTime(state, control, dt) {
  const slow = state.slow;
  if (slow.active > 0) slow.active = Math.max(0, slow.active - dt);
  else if (slow.owned && slow.charge < 1) slow.charge = Math.min(1, slow.charge + dt / slow.cooldown);
  if (!control.slowPressed || !slow.owned || slow.charge < 1 || slow.active > 0) return 0;
  slow.active = slow.duration;
  slow.charge = 0;
  state.effects.cyanFlash = 1;
  return EVENT.SLOW;
}

/** Advance the night by `dt` seconds under `control`; returns the EVENT bits of what happened. */
export function stepWorld(state, control, dt) {
  state.time += dt;
  state.phaseTime += dt;
  stepEffects(state.effects, state.random, dt);
  stepLoom(state.loom, dt);
  if (state.banner && (state.banner.age += dt) > 3.2) state.banner = null;
  if (state.callout && (state.callout.age += dt) > 2.4) state.callout = null;
  if (state.combo.chain > 0 && state.time - state.combo.lastCapture > SCORING.comboWindow) {
    state.combo.chain = 0;
    state.combo.current = 0;
  }
  if (state.phase === PHASE.UPGRADE) return 0;
  if (state.phase === PHASE.WON) {
    if ((state.celebrateTimer -= dt) <= 0 && state.phaseTime < WON_SECONDS + 1.5) {
      state.celebrateTimer = 0.22;
      sparks(state, state.random.range(100, FIELD.width - 100), state.random.range(100, FIELD.height - 100), 'cheer');
    }
    return 0;
  }

  let events = 0;
  const mothDt = dt * (state.slow.active > 0 ? SLOW_TIME.factor : 1);
  if (state.phase !== PHASE.LOST) {
    stepWeaver(state.weaver, control, dt);
    events |= stepSlowTime(state, control, dt);
    if (state.phase === PHASE.PLAY) {
      events |= stepWeaving(state, control);
      if (state.spawnQueue.length > 0 && (state.spawnTimer -= dt) <= 0) {
        spawnNext(state);
        state.spawnTimer = spawnInterval(state.wave, SPAWN.interval);
      }
    }
  }
  for (const moth of state.moths) {
    if (!moth.alive) continue;
    const outcome = moth.boss ? stepBoss(moth, state, mothDt) : stepMoth(moth, state, mothDt);
    if (outcome !== 'cut' || !state.loom.cut) continue;
    const cut = state.loom.cut;
    sparks(state, cut.x, cut.y, 'cut');
    floatText(state.effects, cut.x, cut.y - 16, 'THREAD CUT!', { color: '#ff3b2a', size: 24, life: 0.9 });
    severThread(state.loom, state.stars, cut.segment);
    addShake(state.effects, 5);
    events |= EVENT.CUT;
  }
  if (state.loom.cut && !state.moths.some((moth) => moth.alive && moth.kind === 'cutter' && moth.state === 'chew')) state.loom.cut = null;
  state.moths.push(...state.pending);
  state.pending.length = 0;
  if (state.phase === PHASE.PLAY) {
    if (state.upgrades.ember > 0) events |= stepBurning(state, dt);
    events |= stepCollisions(state);
  }
  if (state.moths.some((moth) => !moth.alive)) state.moths = state.moths.filter((moth) => moth.alive);

  const clear = state.spawnQueue.length === 0 && state.pending.length === 0 && !state.moths.some((moth) => moth.alive);
  if (state.phase === PHASE.PLAY && state.phaseTime > 1 && clear) events |= finishWave(state);
  if (state.phase === PHASE.CLEAR && state.phaseTime >= CLEAR_SECONDS) {
    if (state.attract) {
      events |= startWave(state, (state.wave % ATTRACT_WAVES) + 1);
    } else if (state.wave >= WAVE_COUNT) {
      state.phase = PHASE.WON;
      state.phaseTime = 0;
      state.effects.goldFlash = 1;
      events |= EVENT.WON;
    } else {
      state.phase = PHASE.UPGRADE;
      state.phaseTime = 0;
      state.offer = offerCards(state.random, state.upgrades, state.wave);
      state.banner = null;
    }
  }
  return events;
}

/** True when the end screen should take over from the field. */
export function worldFinished(state) {
  return (state.phase === PHASE.WON && state.phaseTime >= WON_SECONDS) || (state.phase === PHASE.LOST && state.phaseTime >= LOST_SECONDS);
}

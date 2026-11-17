// The rules in fixed steps: weaving, captures, the Loom's bites, starlight, abilities, moths, hearts, waves, realms, cards and the end of the night.
import { ATTRACT, LOOM, MOTHS, SCORING, SLOW_TIME, SPAWN, STARLIGHT, STARS, WEAVE } from './config.js';
import { createRandom } from './random.js';
import { placeAnchorStars, starAt, starInReach } from './stars.js';
import { createWeaver, hurtWeaver, stepWeaver, weaverVulnerable } from './weaver.js';
import { anchorThread, canCloseLoop, canExtendTo, chainSegments, closeLoop, createWeave, distanceToPolygonEdge, extendThread, nearestOnSegment, polygonArea, polygonCaptures, polygonCentroid, releaseThread, severThread, stepWeave } from './threads.js';
import { edgeSpawnPoint, knockBack, mothCapturable, mothTouchesWeaver, spawnMoth, stepMoth } from './enemies.js';
import { BOSSES, bossPhase, spawnBoss, stepBoss, stripVeil } from './bosses.js';
import { WAVE_COUNT, spawnInterval, waveDefinition, waveSpawnList, waveSpeedScale } from './waves.js';
import { applyUpgrade, emptyUpgrades, offerCards } from './upgrades.js';
import { addShake, burst, createEffects, floatText, stepEffects } from './particles.js';
import { scoreLoop, tierName, waveBonus } from './scoring.js';
import { biteLoom, createLoom, healLoom, mothAtLoom, stepLoom } from './loom.js';
import { createStarlight, earnStarlight, spendStarlight, starCost, stepStarlight } from './starlight.js';
import { createAbilities, fireLance, placeStar, pluck, stepAbilities } from './abilities.js';
import { REALMS, realmIndex } from './realms.js';

export const PHASE = { PLAY: 'play', CLEAR: 'clear', UPGRADE: 'upgrade', WON: 'won', LOST: 'lost' };
export const EVENT = Object.fromEntries(['ANCHOR', 'EXTEND', 'SNAP', 'CAPTURE', 'HIT', 'CUT', 'WAVE', 'CLEAR', 'WON', 'LOST', 'SLOW', 'RELEASE', 'BURN', 'VEIL', 'PHASE', 'LOOM', 'PLUCK', 'LANCE', 'STAR', 'DENY', 'REALM'].map((name, i) => [name, 1 << i]));

const CLEAR_SECONDS = 2;
const ATTRACT_WAVES = 4;
const GOLD = ['#ffd36b', '#fff2c4', '#74f3ff', '#ffffff'];
const EMBER = ['#ff3b2a', '#ff8a45', '#ffd36b'];
const VOID = ['#b48cff', '#74f3ff', '#ffffff'];
const spec = (count, colors, speed, life, size, drag, gravity) => ({ count, colors, speed, life, size, drag, gravity });
const SPARKS = {
  star: spec(6, GOLD, 80, 0.5, 2), catch: spec(26, [...GOLD, ...EMBER], 230, 0.8, 3), bossFall: spec(130, [...GOLD, ...EMBER], 420, 1.4, 4, 1.6), veil: spec(40, VOID, 300, 1, 3.5),
  stun: spec(6, VOID, 90, 0.6, 2), bite: spec(10, EMBER, 160, 0.5, 2.5), smoulder: spec(1, EMBER, 90, 0.5, 2.5, undefined, -120),
  burn: spec(22, EMBER, 200, 0.8, 3, undefined, -80), hit: spec(30, EMBER, 260, 0.8, 3), fall: spec(120, ['#ffffff', ...GOLD, '#ff3b2a'], 380, 1.6, 4, 1.4),
  unravel: spec(220, ['#ffffff', ...GOLD, ...EMBER], 460, 1.8, 4, 1.3), cut: spec(18, ['#ff3b2a', '#ffffff', '#74f3ff'], 180, 0.6, 2.5),
};
const sparks = (state, x, y, kind) => burst(state.effects, state.random, x, y, SPARKS[kind]);

export function createWorld(seed, attract = false) {
  const random = createRandom(seed);
  return {
    seed, random, attract, time: 0, phase: PHASE.PLAY, phaseTime: 0, wave: 0, waveTotal: 0, spawnQueue: [], spawnTimer: 0, realm: -1,
    stars: [], weaver: createWeaver(), weave: createWeave(), loom: createLoom(), starlight: createStarlight(), abilities: createAbilities(), moths: [], pending: [],
    score: 0, combo: { chain: 0, lastCapture: -Infinity, best: 0, current: 0 }, lostBy: '',
    stats: { captured: 0, loops: 0, burned: 0, hits: 0, bestLoop: 0, perfectWaves: 0, bestChain: 0, waveCaptured: 0, starsPlaced: 0 },
    upgrades: emptyUpgrades(), offer: [], slow: { charge: 1, active: 0, duration: SLOW_TIME.duration, cooldown: SLOW_TIME.cooldown },
    effects: createEffects(), hitThisWave: false, banner: null, callout: null, hoverStar: -1, pressConsumed: false,
  };
}

export function startWave(state, wave) {
  const definition = waveDefinition(wave);
  const realm = realmIndex(wave);
  state.wave = wave;
  // In play the stars are laid out again until at least three stand within the Weaver's reach, so every wave opens with a loop to hand.
  const { weaver } = state;
  for (let tries = 0; tries < 12; tries += 1) {
    state.stars = state.attract ? placeAnchorStars(state.random, ATTRACT.stars, ATTRACT.top + 12, ATTRACT.bottom - 16) : placeAnchorStars(state.random, STARS.count, undefined, undefined, state.stars.filter((star) => star.placed));
    if (state.attract || state.stars.filter((star) => starInReach(star, weaver.x, weaver.y, weaver.reach)).length >= 3) break;
  }
  state.spawnQueue = waveSpawnList(wave, state.random);
  Object.assign(state, { waveTotal: state.spawnQueue.length, spawnTimer: SPAWN.firstDelay, phase: PHASE.PLAY, phaseTime: 0, hitThisWave: false, offer: [] });
  state.stats.waveCaptured = 0;
  releaseThread(state.weave);
  for (const star of state.stars) sparks(state, star.x, star.y, 'star');
  if (realm === state.realm) {
    state.banner = { title: `WAVE ${wave}`, name: definition.name, tagline: definition.tagline, boss: Boolean(definition.boss), age: 0 };
    return EVENT.WAVE;
  }
  state.realm = realm;
  const sky = REALMS[realm];
  state.banner = { title: sky.name.toUpperCase(), name: `REALM ${realm + 1} OF ${REALMS.length}  ·  WAVE ${wave}  ·  ${definition.name}`, tagline: sky.tagline, realm: true, color: sky.accent, age: 0 };
  return EVENT.WAVE | EVENT.REALM;
}

export function chooseUpgrade(state, index) {
  if (state.phase !== PHASE.UPGRADE || !state.offer[index]) return 0;
  if (index === 3 && !spendStarlight(state.starlight, STARLIGHT.fourth)) return EVENT.DENY;
  applyUpgrade(state, state.offer[index]);
  return startWave(state, state.wave + 1);
}

export function rerollOffer(state) {
  if (state.phase !== PHASE.UPGRADE || !spendStarlight(state.starlight, STARLIGHT.reroll)) return EVENT.DENY;
  state.offer = offerCards(state.random, state.upgrades, state.wave);
  return EVENT.STAR;
}

function spawnNext(state) {
  const kind = state.spawnQueue.shift();
  const scale = waveSpeedScale(state.wave);
  const boss = waveDefinition(state.wave).boss;
  if (boss && kind === boss.kind) return state.moths.push(spawnBoss(kind, boss.veils, state.random, scale));
  const point = edgeSpawnPoint(state.random, state.attract);
  return state.moths.push(spawnMoth(kind, point.x, point.y, state.random, scale));
}

function stepWeaving(state, control) {
  const { weave, stars, weaver } = state;
  weave.cursorX = control.cursorX;
  weave.cursorY = control.cursorY;
  const hover = starAt(stars, control.cursorX, control.cursorY);
  state.hoverStar = hover;
  if (!control.pressed) {
    state.pressConsumed = false;
    if (!weave.active) return 0;
    releaseThread(weave);
    return EVENT.RELEASE;
  }
  if (hover < 0) return 0;
  const star = stars[hover];
  const reachable = starInReach(star, weaver.x, weaver.y, weaver.reach);
  if (!weave.active) {
    if (state.pressConsumed || !reachable) return 0;
    anchorThread(weave, hover);
    sparks(state, star.x, star.y, 'star');
    return EVENT.ANCHOR;
  }
  if (canCloseLoop(weave, hover)) {
    state.pressConsumed = true;
    return EVENT.SNAP | captureLoop(state);
  }
  if (!canExtendTo(weave, hover) || !reachable) return 0;
  extendThread(weave, hover);
  sparks(state, star.x, star.y, 'star');
  return EVENT.EXTEND;
}

function catchMoth(state, moth, worths, kind) {
  moth.alive = false;
  moth.gone = 0;
  state.effects.caught.push(moth);
  worths.push(moth.points);
  state.stats.captured += 1;
  state.stats.waveCaptured += 1;
  sparks(state, moth.x, moth.y, kind);
}

function stripBoss(state, moth, worths) {
  const before = bossPhase(moth);
  if (stripVeil(moth)) {
    catchMoth(state, moth, worths, 'bossFall');
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
  const { weave, stars, moths, weaver, effects, upgrades } = state;
  const polygon = weave.chain.map((index) => ({ x: stars[index].x, y: stars[index].y }));
  const margin = Math.max(upgrades.net ? WEAVE.wideNet : 0, upgrades.lodestar ? WEAVE.lodestar : 0);
  const worths = [];
  let events = 0;
  let bounty = 0;
  for (const moth of moths) {
    if (!moth.alive || !polygonCaptures(moth.x, moth.y, polygon, margin)) continue;
    if (!mothCapturable(moth, moths)) floatText(effects, moth.x, moth.y - 24, moth.visible <= 0.6 ? 'FADED' : 'SHIELDED', { color: '#b48cff', size: 18, life: 0.9 });
    else if (moth.boss) {
      bounty += moth.veils === 1 ? STARLIGHT.bossFall : STARLIGHT.veil;
      events |= stripBoss(state, moth, worths);
    } else catchMoth(state, moth, worths, 'catch');
  }
  const chain = state.time - state.combo.lastCapture <= SCORING.comboWindow ? state.combo.chain + 1 : 1;
  const result = scoreLoop(polygonArea(polygon), worths, chain, upgrades.gold > 0);
  closeLoop(weave, stars, state.attract ? WEAVE.attractAfterglow : WEAVE.afterglow, result.tier);
  state.stats.loops += 1;
  const centre = polygonCentroid(polygon);
  if (upgrades.starfall) {
    for (const moth of moths) {
      if (!moth.alive || moth.boss || distanceToPolygonEdge(moth.x, moth.y, polygon) > WEAVE.stunRadius) continue;
      moth.stun = Math.max(moth.stun, 2);
      sparks(state, moth.x, moth.y, 'stun');
    }
  }
  if (upgrades.shield > 0) weaver.shield = 2.5;
  if (worths.length === 0) {
    floatText(effects, centre.x, centre.y, 'EMPTY LOOP', { color: '#d9ccff', size: 22, life: 1 });
    return events;
  }
  Object.assign(state.combo, { chain, lastCapture: state.time, current: result.multiplier, best: Math.max(state.combo.best, result.multiplier) });
  state.stats.bestChain = Math.max(state.stats.bestChain, chain);
  state.score += result.points;
  state.stats.bestLoop = Math.max(state.stats.bestLoop, result.points);
  if (upgrades.hourglass && state.slow.active <= 0) state.slow.charge = Math.min(1, state.slow.charge + 0.25 * result.count);
  if (upgrades.mend) healLoom(state.loom, 2 * upgrades.mend * result.count);
  earnStarlight(state, result.count * STARLIGHT.perMoth + result.tier * STARLIGHT.perTier + (chain - 1) * STARLIGHT.perChain + bounty, centre.x, centre.y);
  state.callout = { points: result.points, tier: tierName(result.tier), count: result.count, multiplier: result.multiplier, chain, x: centre.x, y: centre.y, age: 0 };
  effects.goldFlash = Math.min(1, 0.25 + 0.12 * result.count);
  return events | EVENT.CAPTURE;
}

function stepBurning(state, dt) {
  const { weave, stars, moths } = state;
  let events = 0;
  const segments = weave.active && weave.chain.length >= 2 ? chainSegments(weave, stars) : [];
  for (const moth of moths) {
    if (!moth.alive || moth.boss) continue;
    if (!segments.some((s) => nearestOnSegment(moth.x, moth.y, s.ax, s.ay, s.bx, s.by).distance < moth.radius + 4)) {
      moth.burn = Math.max(0, moth.burn - dt * 1.5);
      continue;
    }
    moth.burn += dt;
    if (state.random.chance(0.5)) sparks(state, moth.x, moth.y, 'smoulder');
    if (moth.burn < (moth.kind === 'cutter' ? WEAVE.cutterBurnSeconds : WEAVE.burnSeconds)) continue;
    moth.alive = false;
    state.score += moth.points;
    state.stats.burned += 1;
    state.stats.waveCaptured += 1;
    sparks(state, moth.x, moth.y, 'burn');
    events |= EVENT.BURN;
    floatText(state.effects, moth.x, moth.y - 20, `BURNED +${moth.points}`, { color: '#ff8a45', size: 20, life: 1 });
    earnStarlight(state, STARLIGHT.burn, moth.x, moth.y);
  }
  return events;
}

function lose(state, by, x, y, kind) {
  Object.assign(state, { phase: PHASE.LOST, phaseTime: 0, lostBy: by });
  releaseThread(state.weave);
  sparks(state, x, y, kind);
  addShake(state.effects, 26);
  state.effects.redFlash = 1;
  return EVENT.LOST;
}

function stepBites(state) {
  let events = 0;
  for (const moth of state.moths) {
    if (!moth.alive || moth.boss || moth.visible <= 0.6 || moth.stun > 0 || !mothAtLoom(moth)) continue;
    knockBack(moth, LOOM.x, LOOM.y);
    moth.stun = 1.2;
    sparks(state, moth.x, moth.y, 'bite');
    if (state.attract) continue;
    const bite = MOTHS[moth.kind].bite;
    addShake(state.effects, 4);
    floatText(state.effects, LOOM.x + state.random.range(-50, 50), LOOM.y - 96, `-${bite}`, { color: '#ff8a45', size: 22, life: 1, rise: 30 });
    events |= EVENT.LOOM;
    if (biteLoom(state.loom, bite)) return events | lose(state, 'loom', LOOM.x, LOOM.y, 'unravel');
  }
  return events;
}

function stepCollisions(state) {
  const { weaver, moths, effects } = state;
  let events = 0;
  for (const moth of moths) {
    if (!moth.alive || !mothTouchesWeaver(moth, weaver)) continue;
    knockBack(moth, weaver.x, weaver.y);
    if (state.attract || !weaverVulnerable(weaver)) continue;
    state.hitThisWave = true;
    state.stats.hits += 1;
    Object.assign(state.combo, { chain: 0, current: 0 });
    sparks(state, weaver.x, weaver.y, 'hit');
    addShake(effects, 14);
    effects.redFlash = 0.8;
    events |= EVENT.HIT;
    if (hurtWeaver(weaver)) return events | lose(state, 'weaver', weaver.x, weaver.y, 'fall');
  }
  return events;
}

function finishWave(state) {
  const perfect = !state.hitThisWave;
  const bonus = waveBonus(state.wave, perfect);
  const mend = LOOM.heal + (perfect ? LOOM.perfectHeal : 0);
  state.score += bonus;
  if (perfect) state.stats.perfectWaves += 1;
  healLoom(state.loom, mend);
  Object.assign(state, { phase: PHASE.CLEAR, phaseTime: 0 });
  releaseThread(state.weave);
  state.banner = { title: 'WAVE CLEARED', name: `${perfect ? 'Untouched' : 'Wave bonus'}  +${bonus}`, tagline: `the Loom mends +${mend}`, clear: true, age: 0 };
  state.effects.goldFlash = 0.6;
  return EVENT.CLEAR;
}

function stepSlowTime(state, control, dt) {
  const slow = state.slow;
  if (slow.active > 0) slow.active = Math.max(0, slow.active - dt);
  else if (slow.charge < 1) slow.charge = Math.min(1, slow.charge + dt / slow.cooldown);
  if (!control.slowPressed || slow.charge < 1 || slow.active > 0) return 0;
  slow.active = slow.duration;
  slow.charge = 0;
  state.effects.cyanFlash = 1;
  return EVENT.SLOW;
}

function stepActions(state, control) {
  let events = 0;
  if (control.pluckPressed) {
    const hit = pluck(state);
    if (hit) events |= EVENT.PLUCK;
    for (const moth of hit || []) sparks(state, moth.x, moth.y, 'stun');
  }
  if (control.lancePressed) events |= fireLance(state, control) ? EVENT.LANCE : EVENT.DENY;
  if (!control.starPressed) return events;
  const result = placeStar(state);
  if (result === 'ok') {
    sparks(state, state.weaver.x, state.weaver.y, 'catch');
    return events | EVENT.STAR;
  }
  floatText(state.effects, state.weaver.x, state.weaver.y - 30, result === 'poor' ? `NEED ${starCost(state)} STARLIGHT` : 'TOO CLOSE TO PLANT', { color: '#ff8a45', size: 16, life: 1 });
  return events | EVENT.DENY;
}

export function stepWorld(state, control, dt) {
  state.time += dt;
  state.phaseTime += dt;
  stepEffects(state.effects, state.random, dt);
  stepWeave(state.weave, dt);
  stepLoom(state.loom, dt);
  stepStarlight(state.starlight, dt);
  if (state.banner && (state.banner.age += dt) > (state.banner.realm ? 4.2 : 3.2)) state.banner = null;
  if (state.callout && (state.callout.age += dt) > 2.4) state.callout = null;
  if (state.combo.chain > 0 && state.time - state.combo.lastCapture > SCORING.comboWindow) Object.assign(state.combo, { chain: 0, current: 0 });
  if (state.phase === PHASE.UPGRADE || state.phase === PHASE.WON) return 0;

  let events = 0;
  const mothDt = dt * (state.slow.active > 0 ? SLOW_TIME.factor : 1);
  if (state.phase !== PHASE.LOST) {
    stepWeaver(state.weaver, control, dt);
    events |= stepSlowTime(state, control, dt);
    for (const moth of stepAbilities(state, control, dt)) sparks(state, moth.x, moth.y, 'star');
    if (state.phase === PHASE.PLAY) {
      events |= stepWeaving(state, control) | stepActions(state, control);
      if (state.spawnQueue.length > 0 && (state.spawnTimer -= dt) <= 0) {
        spawnNext(state);
        state.spawnTimer = spawnInterval(state.wave, SPAWN.interval);
      }
    }
  }
  for (const moth of state.moths) {
    if (!moth.alive) continue;
    if (moth.boss) stepBoss(moth, state, mothDt);
    else if (stepMoth(moth, state, mothDt) && state.weave.cut) {
      const cut = state.weave.cut;
      sparks(state, cut.x, cut.y, 'cut');
      floatText(state.effects, cut.x, cut.y - 16, 'THREAD CUT!', { color: '#ff3b2a', size: 24, life: 0.9 });
      severThread(state.weave, cut.segment);
      addShake(state.effects, 5);
      events |= EVENT.CUT;
    }
  }
  if (state.weave.cut && !state.moths.some((moth) => moth.alive && moth.kind === 'cutter' && moth.state === 'chew')) state.weave.cut = null;
  state.moths.push(...state.pending);
  state.pending.length = 0;
  if (state.phase === PHASE.PLAY) {
    if (state.upgrades.ember > 0) events |= stepBurning(state, dt);
    events |= stepBites(state);
    if (state.phase === PHASE.PLAY) events |= stepCollisions(state);
  }
  if (state.moths.some((moth) => !moth.alive)) state.moths = state.moths.filter((moth) => moth.alive);

  const clear = state.spawnQueue.length === 0 && state.pending.length === 0 && !state.moths.some((moth) => moth.alive);
  if (state.phase === PHASE.PLAY && state.phaseTime > 1 && clear) events |= finishWave(state);
  if (state.phase === PHASE.CLEAR && state.phaseTime >= CLEAR_SECONDS) {
    if (state.attract) events |= startWave(state, (state.wave % ATTRACT_WAVES) + 1);
    else if (state.wave >= WAVE_COUNT) {
      Object.assign(state, { phase: PHASE.WON, phaseTime: 0 });
      state.effects.goldFlash = 1;
      events |= EVENT.WON;
    } else Object.assign(state, { phase: PHASE.UPGRADE, phaseTime: 0, offer: offerCards(state.random, state.upgrades, state.wave), banner: null });
  }
  return events;
}

export const worldFinished = (state) => (state.phase === PHASE.WON && state.phaseTime >= 2.6) || (state.phase === PHASE.LOST && state.phaseTime >= 2.2);

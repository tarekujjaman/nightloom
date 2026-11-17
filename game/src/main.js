// Boot and the one loop: input each frame, fixed 1/60 s steps, then a paint. ?seed=N fixes the night; ?shot= stages a scene from tools/stage.mjs.
import { STEP } from './config.js';
import { EVENT, PHASE, chooseUpgrade, createWorld, rerollOffer, startWave, stepWorld, worldFinished } from './world.js';
import { ACTION, createInput } from './input.js';
import { createAudio } from './audio.js';
import { SCREEN_PAUSED, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE, createRenderer } from './render.js';
import { rerollAt, upgradeCardAt } from './screens/upgrade.js';
import { createAttractPilot, pilotControl } from './attract.js';
import { runGrade } from './scoring.js';
import { waveDefinition } from './waves.js';
import { realmOf } from './realms.js';
import { ART, artReady } from './art.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'nightloom.best.v1';
const SOUND_OF = [[EVENT.SNAP, 'snap'], [EVENT.VEIL, 'veil'], [EVENT.BURN, 'burn'], [EVENT.RELEASE, 'release'], [EVENT.CUT, 'cut'], [EVENT.SLOW, 'slow'], [EVENT.PLUCK, 'pluck'], [EVENT.LANCE, 'lance'], [EVENT.STAR, 'star'], [EVENT.DENY, 'deny'], [EVENT.HIT, 'hit'], [EVENT.CLEAR, 'clear']];
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

// The high score lives in localStorage; with storage off it lasts this visit only.
function store(value) {
  try {
    if (value !== undefined) window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
    return Math.max(0, Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0);
  } catch {
    return value || 0;
  }
}

async function runShot(name) {
  const [{ stageShot }] = await Promise.all([import(new URL('../../tools/stage.mjs', import.meta.url).href), artReady]);
  const scene = stageShot(name, seed);
  let painted = 0;
  requestAnimationFrame(function paint() {
    renderer.draw(scene.state, scene.screen, scene.ui);
    if ((painted += 1) < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  });
}

function runGame() {
  const audio = createAudio();
  const input = createInput(canvas, renderer.toLogical);
  input.onFirstGesture(() => audio.unlock());
  let gameSeed = seed;
  let world;
  let pilot;
  let screen;
  let best = store();
  let isNewBest = false;
  let hover = -1;
  let accumulator = 0;
  let pending = 0;
  let last = performance.now();
  let wall = 0;

  const announce = (message) => {
    status.textContent = message;
  };

  function newGame() {
    world = createWorld(gameSeed, false);
    gameSeed = (gameSeed + 1) >>> 0;
    startWave(world, 1);
    world.pressConsumed = true;
    screen = SCREEN_PLAY;
    isNewBest = false;
    accumulator = 0;
    audio.play('fanfare');
    announce('Wave 1. Move with WASD, hold the mouse on a star to weave, defend the Loom.');
  }

  function backToTitle() {
    world = createWorld((gameSeed ^ 0x9e3779b9) >>> 0, true);
    startWave(world, 3);
    pilot = createAttractPilot();
    screen = SCREEN_TITLE;
    announce('NIGHTLOOM. Click to begin.');
  }

  function finishGame() {
    if (world.score <= best) return;
    best = store(world.score);
    isNewBest = true;
  }

  function playEvents(events) {
    for (const [bit, name] of SOUND_OF) if (events & bit) audio.play(name);
    if (events & EVENT.ANCHOR) audio.playAnchor(0);
    if (events & EVENT.EXTEND) audio.playAnchor(world.weave.plucked - 1);
    if (events & EVENT.CAPTURE && world.callout) audio.playCapture(world.callout.count, world.callout.multiplier);
    if (events & EVENT.LOOM) audio.playLoomHit(world.loom.health / world.loom.max);
    if (events & EVENT.PHASE) {
      audio.play('bossFanfare');
      announce(`${world.banner.name}: ${world.banner.title}.`);
    }
    if (events & EVENT.HIT) announce(`Hit. ${world.weaver.hearts} heart${world.weaver.hearts === 1 ? '' : 's'} left.`);
    if (events & EVENT.CLEAR) announce(`Wave ${world.wave} cleared. Score ${world.score}. Grade ${runGrade(world).letter}.`);
    if (events & EVENT.REALM && world.wave > 1) {
      audio.play('realm');
      announce(`${realmOf(world.wave).name}, realm ${world.realm + 1} of 4.`);
    } else if (events & EVENT.WAVE && world.wave > 1) audio.play(waveDefinition(world.wave).boss ? 'bossFanfare' : 'fanfare');
    if (events & EVENT.WON) {
      finishGame();
      audio.play('victory');
      announce(`Victory. The night is woven. Score ${world.score}. Best ${best}.`);
    }
    if (events & EVENT.LOST) {
      finishGame();
      audio.play('defeat');
      announce(`${world.lostBy === 'loom' ? 'The Loom unravelled' : 'The Weaver fell'} on wave ${world.wave}. Score ${world.score}. Best ${best}.`);
    }
  }

  // One-shot verbs wait in `pending` until a fixed step runs, so a press between steps is never dropped.
  function advance(control, actions) {
    pending |= actions;
    while (accumulator >= STEP && screen === SCREEN_PLAY) {
      control.slowPressed = Boolean(pending & ACTION.SLOW);
      control.pluckPressed = Boolean(pending & ACTION.PLUCK);
      control.lancePressed = Boolean(pending & ACTION.LANCE);
      control.starPressed = Boolean(pending & ACTION.STAR);
      pending = 0;
      playEvents(stepWorld(world, control, STEP));
      accumulator -= STEP;
      if (world.phase === PHASE.UPGRADE) {
        screen = SCREEN_UPGRADE;
        hover = -1;
        announce(`Choose a card: 1, 2, 3, or 4 for starlight.`);
      } else if (worldFinished(world)) screen = SCREEN_RESULTS;
    }
  }

  function idle(control) {
    while (accumulator >= STEP) {
      stepWorld(world, control, STEP);
      accumulator -= STEP;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    wall += dt;
    accumulator += dt;
    const actions = input.takeActions();
    const control = input.control();
    if (actions & ACTION.MUTE) announce(audio.toggleMute() ? 'Muted.' : 'Sound on.');
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION.CLICK | ACTION.CONFIRM)) newGame();
      else idle(pilotControl(pilot, world, STEP));
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION.PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else advance(control, actions);
    } else if (screen === SCREEN_PAUSED) {
      accumulator = 0;
      if (actions & (ACTION.PAUSE | ACTION.CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_UPGRADE) {
      hover = upgradeCardAt(control.viewX, control.viewY, world.offer.length);
      let pick = [ACTION.PICK_1, ACTION.PICK_2, ACTION.PICK_3, ACTION.PICK_4].findIndex((bit) => actions & bit);
      if (pick < 0 && actions & ACTION.CLICK) pick = hover;
      const reroll = actions & ACTION.REROLL || (actions & ACTION.CLICK && rerollAt(control.viewX, control.viewY));
      playEvents(pick >= 0 ? chooseUpgrade(world, pick) : reroll ? rerollOffer(world) : 0);
      if (world.phase !== PHASE.UPGRADE) {
        audio.play('select');
        world.pressConsumed = true;
        screen = SCREEN_PLAY;
        accumulator = 0;
      } else idle(control);
    } else if (actions & (ACTION.RESTART | ACTION.CLICK | ACTION.CONFIRM)) newGame();
    else if (actions & ACTION.PAUSE) backToTitle();
    else idle(control);
    renderer.draw(world, screen, { best, hover, muted: audio.muted, isNewBest, time: wall });
  }

  backToTitle();
  requestAnimationFrame(frame);
  if (params.has('debug')) window.__nightloom = { world: () => world, screen: () => screen, best: () => best, grade: () => runGrade(world), realm: () => realmOf(world.wave).name, art: () => ({ loaded: ART.loaded, total: ART.total, failed: ART.failed }) };
}

if (params.get('shot')) runShot(params.get('shot'));
else runGame();

// Boot and the one loop: input each frame, fixed 1/60 s world steps, then a paint. ?seed=N fixes the night;
// ?shot=play|title|upgrade|results (with &seed=N) stages that scene for a screenshot.
import { STEP } from './config.js';
import { EVENT, PHASE, chooseUpgrade, createWorld, startWave, stepWorld, worldFinished } from './world.js';
import { ACTION, createInput } from './input.js';
import { createAudio } from './audio.js';
import { SCREEN_PAUSED, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE, createRenderer } from './render.js';
import { upgradeCardAt } from './screens/upgrade.js';
import { createAttractPilot, pilotControl } from './attract.js';
import { runGrade } from './scoring.js';
import { waveDefinition } from './waves.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'nightloom.best.v1';
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

/** The saved high score, or 0; with storage off (private windows) the score lasts this visit only. */
function readHighScore() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
  } catch {
    // Storage is off: the score stays in memory for this visit.
  }
}

function runShot(name) {
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
  let best = readHighScore();
  let isNewBest = false;
  let hover = -1;
  let accumulator = 0;
  let last = performance.now();
  let wall = 0;

  // The status line screen readers hear.
  function announce(message) {
    status.textContent = message;
  }

  function newGame() {
    world = createWorld(gameSeed, false);
    gameSeed = (gameSeed + 1) >>> 0;
    startWave(world, 1);
    world.pressConsumed = true;
    screen = SCREEN_PLAY;
    isNewBest = false;
    accumulator = 0;
    audio.playFanfare(false);
    announce('Wave 1. Move with WASD, hold the mouse on a star to weave.');
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
    best = world.score;
    saveHighScore(best);
    isNewBest = true;
  }

  function playEvents(events) {
    if (events & EVENT.ANCHOR) audio.playAnchor(0);
    if (events & EVENT.EXTEND) audio.playAnchor(world.loom.plucked - 1);
    if (events & EVENT.SNAP) audio.playSnap();
    if (events & EVENT.CAPTURE && world.callout) audio.playCapture(world.callout.count, world.callout.multiplier);
    if (events & EVENT.VEIL) audio.playVeil();
    if (events & EVENT.PHASE) {
      audio.playFanfare(true);
      announce(`${world.banner.name}: ${world.banner.title}.`);
    }
    if (events & EVENT.BURN) audio.playBurn();
    if (events & EVENT.RELEASE) audio.playRelease();
    if (events & EVENT.CUT) audio.playCut();
    if (events & EVENT.SLOW) audio.playSlow();
    if (events & EVENT.HIT) {
      audio.playHit();
      announce(`Hit. ${world.weaver.hearts} heart${world.weaver.hearts === 1 ? '' : 's'} left.`);
    }
    if (events & EVENT.CLEAR) {
      audio.playClear();
      announce(`Wave ${world.wave} cleared. Score ${world.score}. Grade ${runGrade(world).letter}.`);
    }
    if (events & EVENT.WAVE && world.wave > 1) audio.playFanfare(Boolean(waveDefinition(world.wave).boss));
    if (events & EVENT.WON) {
      finishGame();
      audio.playVictory();
      announce(`Victory. The night is woven. Score ${world.score}. Best ${best}.`);
    }
    if (events & EVENT.LOST) {
      finishGame();
      audio.playDefeat();
      announce(`Defeat on wave ${world.wave}. Score ${world.score}. Best ${best}.`);
    }
  }

  function advance(control, slow = false) {
    while (accumulator >= STEP && screen === SCREEN_PLAY) {
      control.slowPressed = slow;
      playEvents(stepWorld(world, control, STEP));
      control.slowPressed = false;
      slow = false;
      accumulator -= STEP;
      if (world.phase === PHASE.UPGRADE) {
        screen = SCREEN_UPGRADE;
        hover = -1;
        announce(`Wave ${world.wave} cleared. Choose a card: 1, 2 or 3.`);
      } else if (worldFinished(world)) screen = SCREEN_RESULTS;
    }
  }

  /** The world keeps breathing behind a screen that takes no play input. */
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
      } else advance(control, Boolean(actions & ACTION.SLOW));
    } else if (screen === SCREEN_PAUSED) {
      accumulator = 0;
      if (actions & (ACTION.PAUSE | ACTION.CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_UPGRADE) {
      hover = upgradeCardAt(control.viewX, control.viewY, world.offer.length);
      const pick = actions & ACTION.PICK_1 ? 0 : actions & ACTION.PICK_2 ? 1 : actions & ACTION.PICK_3 ? 2 : actions & ACTION.CLICK ? hover : -1;
      if (pick >= 0 && pick < world.offer.length) {
        audio.playSelect();
        playEvents(chooseUpgrade(world, world.offer[pick]));
        world.pressConsumed = true;
        screen = SCREEN_PLAY;
        accumulator = 0;
      } else idle(control);
    } else if (actions & (ACTION.RESTART | ACTION.CLICK | ACTION.CONFIRM)) newGame();
    else if (actions & ACTION.PAUSE) backToTitle();
    else idle(control);
    renderer.draw(world, screen, { best, hover, muted: audio.muted, isNewBest, time: wall });
  }

  // A hidden tab pauses the game.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  backToTitle();
  requestAnimationFrame(frame);
  // ?debug exposes the state to tools/check.mjs.
  if (params.has('debug')) window.__nightloom = { world: () => world, screen: () => screen, best: () => best, grade: () => runGrade(world) };
}

if (params.get('shot')) runShot(params.get('shot'));
else runGame();

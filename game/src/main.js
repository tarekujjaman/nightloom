// Boot and the one loop. Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. The game moves between five screens: the title (with the
// autopilot weaving behind it), play, paused, the upgrade choice between waves, and the results.
//
// ?seed=N fixes the night. ?shot=title|play|upgrade|victory|defeat (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import {
  EVENT_ANCHOR, EVENT_BURN, EVENT_CAPTURE, EVENT_CLEAR, EVENT_CUT, EVENT_EXTEND, EVENT_HIT, EVENT_LOST, EVENT_RELEASE,
  EVENT_SLOW, EVENT_SNAP, EVENT_VEIL, EVENT_WAVE, EVENT_WON, PHASE_UPGRADE, chooseUpgrade, createWorld, startWave,
  stepWorld, worldFinished,
} from './world.js';
import {
  ACTION_CLICK, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2, ACTION_PICK_3, ACTION_RESTART,
  ACTION_SLOW, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { SCREEN_PAUSED, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE, upgradeCardAt } from './screens.js';
import { createAttractPilot, pilotControl } from './attract.js';
import { readHighScore, saveHighScore } from './storage.js';
import { isBossWave } from './waves.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

/** Stage one scene, paint it twice and flag it ready. */
function runShot(name) {
  const scene = stageShot(name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(scene.state, scene.screen, scene.ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** The playable game. */
function runGame() {
  const audio = createAudio();
  const input = createInput(canvas, renderer.toLogical);
  input.onFirstGesture(() => audio.unlock());

  let gameSeed = seed;
  let world = createWorld((seed ^ 0x9e3779b9) >>> 0, true);
  startWave(world, 3);
  let pilot = createAttractPilot();
  let screen = SCREEN_TITLE;
  let best = readHighScore();
  let isNewBest = false;
  let hover = -1;
  let accumulator = 0;
  let last = performance.now();
  let wall = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
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
    if (world.score > best) {
      best = world.score;
      saveHighScore(best);
      isNewBest = true;
    }
  }

  function playEvents(events) {
    if (events & EVENT_ANCHOR) audio.playAnchor(0);
    if (events & EVENT_EXTEND) audio.playAnchor(world.loom.plucked - 1);
    if (events & EVENT_SNAP) audio.playSnap();
    if (events & EVENT_CAPTURE && world.lastCapture) audio.playCapture(world.lastCapture.count, world.lastCapture.tier);
    if (events & EVENT_VEIL) audio.playVeil();
    if (events & EVENT_BURN) audio.playBurn();
    if (events & EVENT_RELEASE) audio.playRelease();
    if (events & EVENT_CUT) audio.playCut();
    if (events & EVENT_SLOW) audio.playSlow();
    if (events & EVENT_HIT) {
      audio.playHit();
      announce(world.weaver.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.weaver.hearts} hearts left.`);
    }
    if (events & EVENT_CLEAR) {
      audio.playClear();
      announce(`Wave ${world.wave} cleared. Score ${world.score}.`);
    }
    if (events & EVENT_WAVE && world.wave > 1) audio.playFanfare(isBossWave(world.wave));
    if (events & EVENT_WON) {
      finishGame();
      audio.playVictory();
      announce(`Victory. The night is woven. Score ${world.score}. Best ${best}.`);
    }
    if (events & EVENT_LOST) {
      finishGame();
      audio.playDefeat();
      announce(`Defeat on wave ${world.wave}. Score ${world.score}. Best ${best}.`);
    }
  }

  function stepPlay(control, slowPressed) {
    control.slowPressed = slowPressed;
    const events = stepWorld(world, control, STEP);
    control.slowPressed = false;
    playEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    wall += dt;
    accumulator += dt;
    const actions = input.takeActions();
    const control = input.control();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    switch (screen) {
      case SCREEN_TITLE:
        if (actions & (ACTION_CLICK | ACTION_CONFIRM)) {
          newGame();
        } else {
          while (accumulator >= STEP) {
            stepWorld(world, pilotControl(pilot, world, STEP), STEP);
            accumulator -= STEP;
          }
        }
        break;
      case SCREEN_PLAY:
        if (actions & ACTION_PAUSE) {
          screen = SCREEN_PAUSED;
          announce('Paused.');
          break;
        }
        {
          let slow = Boolean(actions & ACTION_SLOW);
          while (accumulator >= STEP && screen === SCREEN_PLAY) {
            stepPlay(control, slow);
            slow = false;
            accumulator -= STEP;
            if (world.phase === PHASE_UPGRADE) {
              screen = SCREEN_UPGRADE;
              hover = -1;
              announce(`Wave ${world.wave} cleared. Choose an upgrade: 1, 2 or 3.`);
            } else if (worldFinished(world)) {
              screen = SCREEN_RESULTS;
            }
          }
        }
        break;
      case SCREEN_PAUSED:
        accumulator = 0;
        if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
          screen = SCREEN_PLAY;
          announce('Playing.');
        }
        break;
      case SCREEN_UPGRADE: {
        hover = upgradeCardAt(control.cursorX, control.cursorY, world.offer.length);
        let pick = -1;
        if (actions & ACTION_PICK_1) pick = 0;
        else if (actions & ACTION_PICK_2) pick = 1;
        else if (actions & ACTION_PICK_3) pick = 2;
        else if (actions & ACTION_CLICK && hover >= 0) pick = hover;
        if (pick >= 0 && pick < world.offer.length) {
          audio.playSelect();
          playEvents(chooseUpgrade(world, world.offer[pick]));
          world.pressConsumed = true;
          screen = SCREEN_PLAY;
          accumulator = 0;
        } else {
          while (accumulator >= STEP) {
            stepWorld(world, control, STEP);
            accumulator -= STEP;
          }
        }
        break;
      }
      default:
        if (actions & (ACTION_RESTART | ACTION_CLICK | ACTION_CONFIRM)) newGame();
        else if (actions & ACTION_PAUSE) backToTitle();
        else {
          while (accumulator >= STEP) {
            stepWorld(world, control, STEP);
            accumulator -= STEP;
          }
        }
        break;
    }
    renderer.draw(world, screen, { best, hover, muted: audio.muted, isNewBest, time: wall });
  }

  // Leaving the tab pauses a running game rather than letting moths fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('NIGHTLOOM. Click to begin.');
  requestAnimationFrame(frame);

  // ?debug exposes the live state for the automated play-through in tools/check.mjs.
  if (params.has('debug')) {
    window.__nightloom = {
      world: () => world,
      screen: () => screen,
      best: () => best,
    };
  }
}

if (shot) runShot(shot);
else runGame();

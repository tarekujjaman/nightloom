// Keyboard and mouse: WASD / arrows move, the held left button weaves, one-shot actions are a bitfield taken once a frame.
import { ARENA } from './config.js';

export const ACTION = Object.fromEntries(['CONFIRM', 'PAUSE', 'MUTE', 'RESTART', 'SLOW', 'PICK_1', 'PICK_2', 'PICK_3', 'PICK_4', 'CLICK', 'PLUCK', 'STAR', 'LANCE', 'REROLL'].map((name, i) => [name, 1 << i]));

const MOVE_KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const KEY_ACTIONS = {
  Enter: ACTION.CONFIRM, Space: ACTION.SLOW | ACTION.CONFIRM, KeyP: ACTION.PAUSE, Escape: ACTION.PAUSE, KeyM: ACTION.MUTE, KeyR: ACTION.RESTART,
  KeyE: ACTION.STAR, KeyQ: ACTION.LANCE, Tab: ACTION.REROLL, Digit1: ACTION.PICK_1, Digit2: ACTION.PICK_2, Digit3: ACTION.PICK_3, Digit4: ACTION.PICK_4,
};

export function createInput(canvas, toLogical) {
  const held = new Set();
  const control = { moveX: 0, moveY: 0, cursorX: ARENA.width / 2, cursorY: ARENA.height / 2, viewX: 0, viewY: 0, pressed: false, slowPressed: false, pluckPressed: false, lancePressed: false, starPressed: false };
  let actions = 0;
  let firstGesture = null;

  function gesture() {
    if (!firstGesture) return;
    firstGesture();
    firstGesture = null;
  }

  function trackPointer(event) {
    const point = toLogical(event.clientX, event.clientY);
    Object.assign(control, { viewX: point.x, viewY: point.y, cursorX: point.x - ARENA.x, cursorY: point.y - ARENA.y });
  }

  window.addEventListener('keydown', (event) => {
    gesture();
    if (MOVE_KEYS[event.code] || event.code === 'Space' || event.code === 'Tab') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    actions |= KEY_ACTIONS[event.code] || 0;
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    control.pressed = false;
  });
  window.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    gesture();
    trackPointer(event);
    if (event.button === 0) {
      control.pressed = true;
      actions |= ACTION.CLICK | ACTION.CONFIRM;
    }
    if (event.button === 2) actions |= ACTION.PLUCK;
    event.preventDefault();
  });
  window.addEventListener('pointerup', (event) => {
    trackPointer(event);
    if (event.button === 0) control.pressed = false;
  });
  window.addEventListener('pointercancel', () => {
    control.pressed = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    control() {
      const [x, y] = [...held].reduce(([sx, sy], code) => (MOVE_KEYS[code] ? [sx + MOVE_KEYS[code][0], sy + MOVE_KEYS[code][1]] : [sx, sy]), [0, 0]);
      const length = Math.hypot(x, y) || 1;
      control.moveX = x / length;
      control.moveY = y / length;
      return control;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    onFirstGesture(callback) {
      firstGesture = callback;
    },
  };
}

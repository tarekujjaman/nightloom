// Keyboard and mouse: WASD / arrows move, the held left button weaves, one-shot actions are a bitfield taken once a frame.
import { ARENA } from './config.js';

export const ACTION = { CONFIRM: 1, PAUSE: 2, MUTE: 4, RESTART: 8, SLOW: 16, PICK_1: 32, PICK_2: 64, PICK_3: 128, CLICK: 256 };

const MOVE_KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const KEY_ACTIONS = {
  Enter: ACTION.CONFIRM, Space: ACTION.SLOW | ACTION.CONFIRM, KeyP: ACTION.PAUSE, Escape: ACTION.PAUSE, KeyM: ACTION.MUTE, KeyR: ACTION.RESTART,
  Digit1: ACTION.PICK_1, Numpad1: ACTION.PICK_1, Digit2: ACTION.PICK_2, Numpad2: ACTION.PICK_2, Digit3: ACTION.PICK_3, Numpad3: ACTION.PICK_3,
};

/** Listen on the window and the canvas; `toLogical` maps client points into the 1280x800 view. */
export function createInput(canvas, toLogical) {
  const held = new Set();
  const control = { moveX: 0, moveY: 0, cursorX: ARENA.width / 2, cursorY: ARENA.height / 2, viewX: 0, viewY: 0, pressed: false, slowPressed: false };
  let actions = 0;
  let firstGesture = null;

  function gesture() {
    if (!firstGesture) return;
    const call = firstGesture;
    firstGesture = null;
    call();
  }

  function trackPointer(event) {
    const point = toLogical(event.clientX, event.clientY);
    control.viewX = point.x;
    control.viewY = point.y;
    control.cursorX = point.x - ARENA.x;
    control.cursorY = point.y - ARENA.y;
  }

  window.addEventListener('keydown', (event) => {
    gesture();
    if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
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
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      const length = Math.hypot(x, y);
      control.moveX = length > 0 ? x / length : 0;
      control.moveY = length > 0 ? y / length : 0;
      return control;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Run `callback` once, on the first key press or click (browsers unlock audio only then). */
    onFirstGesture(callback) {
      firstGesture = callback;
    },
  };
}

// Keyboard and mouse, read as the game needs them: WASD / arrows move the Weaver, the left mouse
// button held over stars weaves, and one-shot actions (confirm, pause, mute, restart, slow time,
// card picks) are collected as a bitfield the loop takes once per frame.
import { FIELD } from './config.js';

/**
 * Listen on the window and the canvas. `toLogical(clientX, clientY)` maps a client point to the
 * 1280x800 field; the renderer provides it since it knows the letterbox.
 */
export function createInput(canvas, toLogical) {
  const held = new Set();
  const control = { moveX: 0, moveY: 0, cursorX: FIELD.width / 2, cursorY: FIELD.height / 2, pressed: false };
  let actions = 0;
  let firstGesture = null;

  function gesture() {
    if (firstGesture) {
      const call = firstGesture;
      firstGesture = null;
      call();
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return;
    gesture();
    if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    actions |= ACTION_ANY_KEY;
    switch (event.code) {
      case 'Enter': actions |= ACTION_CONFIRM; break;
      case 'Space': actions |= ACTION_SLOW | ACTION_CONFIRM; break;
      case 'KeyP': case 'Escape': actions |= ACTION_PAUSE; break;
      case 'KeyM': actions |= ACTION_MUTE; break;
      case 'KeyR': actions |= ACTION_RESTART; break;
      case 'Digit1': case 'Numpad1': actions |= ACTION_PICK_1; break;
      case 'Digit2': case 'Numpad2': actions |= ACTION_PICK_2; break;
      case 'Digit3': case 'Numpad3': actions |= ACTION_PICK_3; break;
      default: break;
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    control.pressed = false;
  });

  function trackPointer(event) {
    const point = toLogical(event.clientX, event.clientY);
    control.cursorX = point.x;
    control.cursorY = point.y;
  }
  window.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    gesture();
    trackPointer(event);
    if (event.button === 0) {
      control.pressed = true;
      actions |= ACTION_CLICK | ACTION_CONFIRM;
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
    /** The movement vector and cursor for this frame; movement is normalised so diagonals are no faster. */
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
    /** The one-shot actions since the last call, then cleared. */
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

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_SLOW = 16;
export const ACTION_PICK_1 = 32;
export const ACTION_PICK_2 = 64;
export const ACTION_PICK_3 = 128;
export const ACTION_CLICK = 256;
export const ACTION_ANY_KEY = 512;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

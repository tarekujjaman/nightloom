// The saved high score, kept in localStorage when the browser allows it and forgotten otherwise.
import { BEST_KEY } from './config.js';

/** The saved high score, or 0. */
export function readHighScore() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Save `value` as the high score; storage can be off (private windows), and then it lasts this visit only. */
export function saveHighScore(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
  } catch {
    // Nothing to do: the score stays in memory for this visit.
  }
}

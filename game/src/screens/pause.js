// The pause veil over the playfield, with the controls spelled out.
import { ARENA, PALETTE } from '../config.js';
import { FONT_TITLE, glowText } from '../glow.js';
import { keyStrip } from '../hud/widgets.js';
import { CONTROLS } from '../hud/bottombar.js';

/** Draw the veil in view coordinates. */
export function drawPause(ctx, ui) {
  ctx.fillStyle = 'rgba(6, 2, 18, 0.66)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  const cx = ARENA.x + ARENA.width / 2;
  const cy = ARENA.y + ARENA.height / 2;
  glowText(ctx, 'PAUSED', cx, cy - 90, { font: FONT_TITLE, size: 76, weight: '700', color: PALETTE.gold, glow: PALETTE.cyan, blur: 30, letterSpacing: 12 });
  glowText(ctx, 'P or ESC to resume', cx, cy - 22, { size: 22, color: PALETTE.text, letterSpacing: 2, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
  keyStrip(ctx, CONTROLS.slice(0, 4), cx - 330, cy + 40, 15);
  keyStrip(ctx, CONTROLS.slice(4), cx - 330, cy + 80, 15);
}

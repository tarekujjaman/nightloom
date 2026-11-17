// The bottom bar: hearts, still time, combo, high score, run grade and the controls strip.
import { LAYOUT, PALETTE, SCORING, VIEW } from '../config.js';
import { glowText } from '../glow.js';
import { formatScore, runGrade } from '../scoring.js';
import { heartRow, keyStrip, meter, pill, tag } from './widgets.js';

export const CONTROLS = [['WASD', 'move'], ['HOLD LMB', 'weave star to star'], ['1ST STAR', 'closes the loop'], ['SPACE', 'still time'], ['P', 'pause'], ['M', 'sound'], ['R', 'restart']];
export const GRADE_COLORS = { S: PALETTE.gold, A: PALETTE.win, B: PALETTE.cyan, C: PALETTE.violet, D: PALETTE.textSoft };

/** Draw the bar along the bottom of the view. */
export function drawBottomBar(ctx, state, ui, title) {
  const y = VIEW.height - LAYOUT.bottom;
  const row = y + 27;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, y, VIEW.width, LAYOUT.bottom);
  ctx.fillStyle = PALETTE.panelLine;
  ctx.fillRect(0, y, VIEW.width, 2);
  const { weaver, slow, combo } = state;

  let x = 16 + tag(ctx, 'HEARTS', 16, row, PALETTE.heart, 12) + 12;
  heartRow(ctx, x, row, weaver.hearts, weaver.maxHearts, 24, weaver.invulnerable > 0, state.time);

  x = 300;
  const ready = slow.owned && slow.active <= 0 && slow.charge >= 1;
  tag(ctx, 'STILL TIME', x, row - 9, slow.owned ? PALETTE.cyan : PALETTE.panelLine, 11, 7);
  const status = title ? 'SPACE · slows moths' : !slow.owned ? 'not held yet' : slow.active > 0 ? 'SLOWING THE SKY' : ready ? 'READY · press SPACE' : 'recharging';
  glowText(ctx, status, x + 96, row - 9, { size: 12, color: ready || slow.active > 0 ? PALETTE.cyan : PALETTE.textSoft, align: 'left' });
  meter(ctx, x, row + 5, 200, 10, slow.owned ? (slow.active > 0 ? slow.active / slow.duration : slow.charge) : 0, PALETTE.cyan);

  x = 530;
  const comboOn = combo.current > 0 && !title;
  tag(ctx, 'COMBO', x, row - 9, comboOn ? PALETTE.cyan : PALETTE.panelLine, 11, 7);
  if (comboOn) {
    glowText(ctx, `×${Math.round(combo.current * 10) / 10}`, x + 72, row - 9, { size: 22, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 10, align: 'left' });
    glowText(ctx, combo.chain > 1 ? `${combo.chain}-LOOP CHAIN` : 'chain more loops!', x + 140, row - 9, { size: 12, color: PALETTE.textSoft, align: 'left' });
  } else {
    glowText(ctx, combo.best > 0 && !title ? `best ×${Math.round(combo.best * 10) / 10} · loops within 5 s chain` : 'loops closed within 5 s chain', x + 72, row - 9, { size: 12, color: PALETTE.textSoft, align: 'left' });
  }
  meter(ctx, x, row + 5, 200, 8, comboOn ? Math.max(0, 1 - (state.time - combo.lastCapture) / SCORING.comboWindow) : 0, PALETTE.cyan);

  x = 770;
  x += tag(ctx, 'BEST', x, row, PALETTE.gold, 12) + 10;
  glowText(ctx, formatScore(ui.best), x, row, { size: 18, color: PALETTE.goldLight, align: 'left' });

  x = 990;
  const grade = title ? { letter: 'S', progress: 1 } : runGrade(state);
  const color = GRADE_COLORS[grade.letter];
  pill(ctx, x, row - 23, 54, 46, color, PALETTE.panel, 2.5);
  glowText(ctx, grade.letter, x + 27, row + 1, { size: 32, color, glow: color, blur: 14 });
  tag(ctx, title ? 'GRADES S·A·B·C·D' : 'RUN GRADE', x + 64, row - 9, color, 11, 7);
  meter(ctx, x + 64, row + 5, 120, 8, grade.progress, color);
  glowText(ctx, title ? 'score vs par' : 'to next grade', x + 192, row + 9, { size: 10, color: PALETTE.textSoft, align: 'left' });

  keyStrip(ctx, CONTROLS, 16, y + 65, 14);
}

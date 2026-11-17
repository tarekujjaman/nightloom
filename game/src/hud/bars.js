// The top bar (word mark, score, wave progress, WIN and LOSE with live counts) and the bottom bar (hearts, still time, combo, best, grade, controls).
import { LAYOUT, PALETTE, SCORING, VIEW } from '../config.js';
import { glowText } from '../glow.js';
import { drawLogo } from '../screens/title.js';
import { formatScore, runGrade } from '../scoring.js';
import { WAVE_COUNT, waveDefinition } from '../waves.js';
import { heartRow, keyStrip, meter, pill, tag, tagWidth } from './widgets.js';

export const CONTROLS = [['WASD', 'move'], ['HOLD LMB', 'weave star to star'], ['1ST STAR', 'closes the loop'], ['SPACE', 'still time'], ['P', 'pause'], ['M', 'sound'], ['R', 'restart']];
export const GRADE_COLORS = { S: PALETTE.gold, A: PALETTE.win, B: PALETTE.cyan, C: PALETTE.violet, D: PALETTE.textSoft };

/** Moths still to capture this wave: alive, queued or about to hatch. */
export function mothsLeft(state) {
  return state.moths.filter((moth) => moth.alive).length + state.spawnQueue.length + state.pending.length;
}

function banner(ctx, x, w, label, color, rule, count) {
  pill(ctx, x, 7, w, LAYOUT.top - 14, color);
  const used = tag(ctx, label, x + 10, 33, color, 14, 9);
  glowText(ctx, rule, x + 18 + used, 33, { size: 16, weight: '700', color: PALETTE.text, align: 'left' });
  if (count) glowText(ctx, count, x + w - 12, 33, { size: 22, color, align: 'right' });
}

export function drawTopBar(ctx, state, ui, title) {
  const h = LAYOUT.top;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, h);
  ctx.fillStyle = PALETTE.panelLine;
  ctx.fillRect(0, h - 2, VIEW.width, 2);
  drawLogo(ctx, 94, 28, 22, ui.time);

  pill(ctx, 182, 7, 168, h - 14, PALETTE.gold);
  glowText(ctx, title ? 'HIGH SCORE' : 'SCORE', 194, 19, { size: 11, color: PALETTE.gold, align: 'left', letterSpacing: 3 });
  glowText(ctx, formatScore(title ? ui.best : state.score), 194, 42, { size: 27, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 14, align: 'left' });

  pill(ctx, 360, 7, 222, h - 14, PALETTE.violet);
  if (title) {
    glowText(ctx, `${WAVE_COUNT} WAVES`, 372, 22, { size: 20, color: PALETTE.text, align: 'left' });
    glowText(ctx, '2 BOSSES · 9 THREADS · 4 RELICS', 372, 45, { size: 11, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });
  } else {
    const left = mothsLeft(state);
    const total = Math.max(1, state.waveTotal);
    glowText(ctx, `WAVE ${state.wave} / ${WAVE_COUNT}`, 372, 21, { size: 20, color: PALETTE.text, align: 'left' });
    glowText(ctx, `${waveDefinition(state.wave).name.toUpperCase()} · ${left} LEFT`, 372, 41, { size: 11, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });
    meter(ctx, 372, 50, 198, 5, 1 - Math.min(left, total) / total, PALETTE.violet);
  }

  banner(ctx, 592, 300, 'WIN', PALETTE.win, `weave all ${WAVE_COUNT} waves`, title ? '' : `${state.wave - 1}/${WAVE_COUNT}`);
  banner(ctx, 902, 276, 'LOSE', PALETTE.lose, 'all hearts gone', title ? '' : `${state.weaver.hearts}/${state.weaver.maxHearts} ♥`);
  const sound = ui.muted ? 'MUTED' : 'SOUND ON';
  tag(ctx, sound, VIEW.width - 10 - tagWidth(ctx, sound, 11, 8), 33, ui.muted ? PALETTE.lose : PALETTE.cyan, 11, 8);
}

export function drawBottomBar(ctx, state, ui, title) {
  const y = VIEW.height - LAYOUT.bottom;
  const row = y + 27;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, y, VIEW.width, LAYOUT.bottom);
  ctx.fillStyle = PALETTE.panelLine;
  ctx.fillRect(0, y, VIEW.width, 2);
  const { weaver, slow, combo } = state;

  heartRow(ctx, 28 + tag(ctx, 'HEARTS', 16, row, PALETTE.heart, 12), row, weaver.hearts, weaver.maxHearts, 24, weaver.invulnerable > 0, state.time);

  const ready = slow.owned && slow.active <= 0 && slow.charge >= 1;
  tag(ctx, 'STILL TIME', 300, row - 9, slow.owned ? PALETTE.cyan : PALETTE.panelLine, 11, 7);
  const status = title ? 'SPACE · slows moths' : !slow.owned ? 'not held yet' : slow.active > 0 ? 'SLOWING THE SKY' : ready ? 'READY · press SPACE' : 'recharging';
  glowText(ctx, status, 396, row - 9, { size: 12, color: ready || slow.active > 0 ? PALETTE.cyan : PALETTE.textSoft, align: 'left' });
  meter(ctx, 300, row + 5, 200, 10, slow.owned ? (slow.active > 0 ? slow.active / slow.duration : slow.charge) : 0, PALETTE.cyan);

  const comboOn = combo.current > 0 && !title;
  tag(ctx, 'COMBO', 530, row - 9, comboOn ? PALETTE.cyan : PALETTE.panelLine, 11, 7);
  if (comboOn) {
    glowText(ctx, `×${Math.round(combo.current * 10) / 10}`, 602, row - 9, { size: 22, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 10, align: 'left' });
    glowText(ctx, combo.chain > 1 ? `${combo.chain}-LOOP CHAIN` : 'chain more loops!', 670, row - 9, { size: 12, color: PALETTE.textSoft, align: 'left' });
  } else {
    glowText(ctx, combo.best > 0 && !title ? `best ×${Math.round(combo.best * 10) / 10} · loops within 5 s chain` : 'loops closed within 5 s chain', 602, row - 9, { size: 12, color: PALETTE.textSoft, align: 'left' });
  }
  meter(ctx, 530, row + 5, 200, 8, comboOn ? Math.max(0, 1 - (state.time - combo.lastCapture) / SCORING.comboWindow) : 0, PALETTE.cyan);

  glowText(ctx, formatScore(ui.best), 780 + tag(ctx, 'BEST', 770, row, PALETTE.gold, 12), row, { size: 18, color: PALETTE.goldLight, align: 'left' });

  const grade = title ? { letter: 'S', progress: 1 } : runGrade(state);
  const color = GRADE_COLORS[grade.letter];
  pill(ctx, 990, row - 23, 54, 46, color, PALETTE.panel, 2.5);
  glowText(ctx, grade.letter, 1017, row + 1, { size: 32, color, glow: color, blur: 14 });
  tag(ctx, title ? 'GRADES S·A·B·C·D' : 'RUN GRADE', 1054, row - 9, color, 11, 7);
  meter(ctx, 1054, row + 5, 120, 8, grade.progress, color);
  glowText(ctx, title ? 'score vs par' : 'to next grade', 1182, row + 9, { size: 11, color: PALETTE.textSoft, align: 'left' });

  keyStrip(ctx, CONTROLS, 16, y + 65, 14);
}

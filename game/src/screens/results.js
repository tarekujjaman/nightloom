// The results: score, run grade, the run's stats, the high score, threads held and the restart prompt.
import { PALETTE, VIEW } from '../config.js';
import { FONT_TITLE, glowText, roundRect } from '../glow.js';
import { formatScore, runGrade } from '../scoring.js';
import { RARITY_COLORS, heldCards } from '../upgrades.js';
import { WAVE_COUNT } from '../waves.js';
import { PHASE } from '../world.js';
import { GRADE_COLORS } from '../hud/bottombar.js';
import { pill, tag, tagCentred, tagWidth } from '../hud/widgets.js';

/** Draw the results in view coordinates. */
export function drawResults(ctx, state, ui) {
  ctx.fillStyle = 'rgba(6, 2, 18, 0.8)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const won = state.phase === PHASE.WON;
  const color = won ? PALETTE.gold : PALETTE.ember;
  const w = 860;
  const h = 610;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  const cx = VIEW.width / 2;
  pill(ctx, x, y, w, h, color, 'rgba(14, 7, 34, 0.96)', 3);
  tagCentred(ctx, won ? 'VICTORY' : 'DEFEAT', cx, y + 36, won ? PALETTE.win : PALETTE.lose, 14);
  glowText(ctx, won ? 'THE NIGHT IS WOVEN' : 'THE NIGHT UNRAVELS', cx, y + 86, { font: FONT_TITLE, size: 56, weight: '700', color, glow: won ? PALETTE.cyan : PALETTE.violet, blur: 30, letterSpacing: 8 });
  glowText(ctx, won ? `All ${WAVE_COUNT} waves cleared. The sky is yours.` : `The moths overran the loom on wave ${state.wave} of ${WAVE_COUNT}.`, cx, y + 130, { size: 17, weight: '700', color: PALETTE.text });

  const left = x + 64;
  glowText(ctx, 'SCORE', left, y + 176, { size: 13, color: PALETTE.gold, align: 'left', letterSpacing: 5 });
  glowText(ctx, formatScore(state.score), left, y + 216, { size: 56, color: PALETTE.gold, glow: PALETTE.goldDeep, blur: 22, align: 'left' });
  const hx = left + tag(ctx, 'HIGH SCORE', left, y + 266, PALETTE.gold, 12) + 12;
  glowText(ctx, formatScore(ui.best), hx, y + 266, { size: 20, color: PALETTE.goldLight, align: 'left' });
  if (ui.isNewBest) tag(ctx, 'NEW BEST!', hx + 110, y + 266, PALETTE.cyan, 12);

  const grade = runGrade(state);
  const gradeColor = GRADE_COLORS[grade.letter];
  const gx = x + w - 150;
  const gy = y + 212;
  ctx.beginPath();
  ctx.arc(gx, gy, 56, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  ctx.strokeStyle = gradeColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  glowText(ctx, grade.letter, gx, gy + 2, { size: 64, color: gradeColor, glow: gradeColor, blur: 24 });
  tagCentred(ctx, 'RUN GRADE', gx, gy - 78, gradeColor, 12);
  glowText(ctx, `score ×${grade.ratio.toFixed(2)} of par`, gx, gy + 76, { size: 12, color: PALETTE.textSoft });

  const rows = [
    ['WAVE REACHED', `${state.wave} / ${WAVE_COUNT}`], ['MOTHS CAPTURED', String(state.stats.captured + state.stats.burned)],
    ['LOOPS CLOSED', String(state.stats.loops)], ['BEST LOOP', `+${formatScore(state.stats.bestLoop)}`],
    ['BEST COMBO', `×${Math.round(state.combo.best * 10) / 10}`], ['LONGEST CHAIN', `${state.stats.bestChain} loops`],
    ['PERFECT WAVES', String(state.stats.perfectWaves)], ['HEARTS LOST', String(state.stats.hits)],
  ];
  const colW = (w - 168) / 2;
  rows.forEach(([label, value], i) => {
    const rx = left + (i % 2) * (colW + 40);
    const ry = y + 318 + Math.floor(i / 2) * 36;
    glowText(ctx, label, rx, ry, { size: 13, color: PALETTE.textSoft, align: 'left', letterSpacing: 2 });
    glowText(ctx, value, rx + colW, ry, { size: 20, color: PALETTE.text, align: 'right' });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(rx, ry + 16, colW, 1);
  });

  let tx = left + tag(ctx, 'THREADS HELD', left, y + 470, PALETTE.gold, 12) + 10;
  const held = heldCards(state.upgrades);
  if (held.length === 0) glowText(ctx, 'none', tx, y + 470, { size: 13, color: PALETTE.textSoft, align: 'left' });
  for (const card of held) {
    const text = card.name.toUpperCase();
    const tw = tagWidth(ctx, text, 11, 7);
    if (tx + tw > x + w - 40) break;
    roundRect(ctx, tx, y + 460, tw, 20, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    glowText(ctx, text, tx + tw / 2, y + 471, { size: 11, color: RARITY_COLORS[card.rarity], letterSpacing: 1.5 });
    tx += tw + 8;
  }

  glowText(ctx, 'PRESS R  /  CLICK TO PLAY AGAIN', cx, y + 530, { size: 30, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 22, letterSpacing: 5, alpha: 0.7 + 0.3 * Math.sin(ui.time * 3.2) });
  glowText(ctx, 'ESC  back to the title   ·   M  sound', cx, y + 570, { size: 13, color: PALETTE.textSoft, letterSpacing: 2 });
}

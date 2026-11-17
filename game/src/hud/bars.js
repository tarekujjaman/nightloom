// The top bar (score, wave and realm, LOOM health, starlight, WIN and LOSE) and the bottom bar (hearts, hotbar, combo, best, grade, keys).
import { LAYOUT, PALETTE as P, SCORING, VIEW } from '../config.js';
import { glowText, label, measureText } from '../glow.js';
import { drawLogo } from '../screens/title.js';
import { formatScore, runGrade } from '../scoring.js';
import { WAVE_COUNT, waveDefinition } from '../waves.js';
import { REALMS, realmOf } from '../realms.js';
import { loomColor } from '../loom.js';
import { drawHotbar } from './hotbar.js';
import { SOFT, heartRow, keyStrip, meter, pill, starGlyph, tag, tagWidth } from './widgets.js';

export const CONTROLS = [['WASD', 'move'], ['HOLD LMB', 'weave star to star'], ['1ST STAR', 'closes the loop'], ['RMB', 'pluck'], ['SPACE', 'still time'], ['E', 'plant a star'], ['Q', 'lance'], ['P', 'pause'], ['M', 'sound'], ['R', 'restart']];
export const GRADE_COLORS = { S: P.gold, A: P.win, B: P.cyan, C: P.violet, D: P.textSoft };

export const mothsLeft = (state) => state.moths.filter((moth) => moth.alive).length + state.spawnQueue.length + state.pending.length;

function banner(ctx, x, w, name, color, rule, count) {
  pill(ctx, x, 7, w, LAYOUT.top - 14, color);
  tag(ctx, name, x + 10, 22, color, 12, 7);
  if (count) label(ctx, count, x + w - 12, 22, 15, color, 'right');
  glowText(ctx, rule, x + 10, 45, { ...SOFT, size: 11.5, color: P.text });
}

export function drawTopBar(ctx, state, ui, title) {
  const h = LAYOUT.top;
  ctx.fillStyle = P.panel;
  ctx.fillRect(0, 0, VIEW.width, h);
  ctx.fillStyle = P.panelLine;
  ctx.fillRect(0, h - 2, VIEW.width, 2);
  drawLogo(ctx, 90, 28, 21, ui.time);

  pill(ctx, 176, 7, 134, h - 14, P.gold);
  label(ctx, title ? 'HIGH SCORE' : 'SCORE', 188, 19, 10.5, P.gold, 'left', 3);
  glowText(ctx, formatScore(title ? ui.best : state.score), 188, 42, { size: 25, color: P.goldLight, glow: P.gold, blur: 14, align: 'left' });

  const realm = realmOf(state.wave);
  pill(ctx, 318, 7, 206, h - 14, realm.accent);
  if (title) {
    label(ctx, `${WAVE_COUNT} WAVES · ${REALMS.length} REALMS`, 330, 21, 17, P.text, 'left');
    glowText(ctx, '2 BOSSES · 10 THREADS · 4 RELICS', 330, 44, { ...SOFT, size: 10.5, letterSpacing: 1 });
  } else {
    const left = mothsLeft(state);
    label(ctx, `WAVE ${state.wave} / ${WAVE_COUNT}`, 330, 20, 17, P.text, 'left');
    label(ctx, `${left} LEFT`, 516, 20, 10.5, P.textSoft, 'right', 0.5);
    const used = tag(ctx, realm.name.toUpperCase(), 330, 42, realm.accent, 9.5, 5);
    const name = waveDefinition(state.wave).name.toUpperCase();
    if (338 + used + measureText(ctx, name, { size: 9 }) < 516) label(ctx, name, 338 + used, 42, 9, P.textSoft, 'left');
    meter(ctx, 330, 53, 182, 4, 1 - Math.min(left, state.waveTotal) / Math.max(1, state.waveTotal), realm.accent);
  }

  const { loom } = state;
  const frac = loom.health / loom.max;
  const tint = loom.hurt > 0.4 ? '#ffffff' : loomColor(frac);
  pill(ctx, 532, 7, 196, h - 14, loom.hurt > 0 ? P.ember : P.gold);
  tag(ctx, 'LOOM', 544, 22, P.gold, 12, 7);
  label(ctx, `${Math.ceil(loom.health)} / ${loom.max}`, 716, 22, 17, tint, 'right');
  meter(ctx, 544, 40, 172, 9, frac, tint);
  glowText(ctx, frac < 0.3 && !title ? 'FRAYING · catch the moths at its heart' : 'moths that reach it tear its threads', 544, 55, { ...SOFT, size: 9.5, color: frac < 0.3 && !title ? P.ember : P.textSoft });

  const st = state.starlight;
  pill(ctx, 736, 7, 134, h - 14, P.gold);
  starGlyph(ctx, 754, 33, 11 + st.pop * 3, P.goldLight);
  glowText(ctx, String(Math.max(0, st.shown)), 770, 30, { size: 24 + st.pop * 4, color: P.goldLight, glow: P.gold, blur: 12, align: 'left' });
  label(ctx, 'STARLIGHT', 770, 50, 9.5, P.gold, 'left', 2);

  banner(ctx, 878, 170, 'WIN', P.win, `weave all ${WAVE_COUNT} waves`, title ? '' : `${state.wave - 1}/${WAVE_COUNT}`);
  banner(ctx, 1056, 216, 'LOSE', P.lose, 'the Loom unravels or the Weaver falls', title ? '' : `${Math.ceil(loom.health)} LOOM · ${state.weaver.hearts}/${state.weaver.maxHearts} ♥`);
}

export function drawBottomBar(ctx, state, ui, title) {
  const y = VIEW.height - LAYOUT.bottom;
  ctx.fillStyle = P.panel;
  ctx.fillRect(0, y, VIEW.width, LAYOUT.bottom);
  ctx.fillStyle = P.panelLine;
  ctx.fillRect(0, y, VIEW.width, 2);
  const { weaver, combo } = state;

  heartRow(ctx, 28 + tag(ctx, 'HEARTS', 16, y + 30, P.heart, 12), y + 30, weaver.hearts, weaver.maxHearts, 22, weaver.invulnerable > 0, state.time);
  drawHotbar(ctx, state, title);

  const comboOn = combo.current > 0 && !title;
  tag(ctx, 'COMBO', 690, y + 20, comboOn ? P.cyan : P.panelLine, 11, 7);
  if (comboOn) {
    glowText(ctx, `×${Math.round(combo.current * 10) / 10}`, 760, y + 20, { size: 20, color: P.cyan, glow: P.cyanDeep, blur: 10, align: 'left' });
    glowText(ctx, combo.chain > 1 ? `${combo.chain}-LOOP CHAIN` : 'chain more!', 822, y + 20, { ...SOFT, size: 11 });
  } else glowText(ctx, combo.best > 0 && !title ? `best ×${Math.round(combo.best * 10) / 10} · 5 s chain` : 'loops within 5 s chain', 760, y + 20, { ...SOFT, size: 11 });
  meter(ctx, 690, y + 36, 196, 7, comboOn ? Math.max(0, 1 - (state.time - combo.lastCapture) / SCORING.comboWindow) : 0, P.cyan);

  label(ctx, formatScore(ui.best), 906 + tag(ctx, 'BEST', 898, y + 20, P.gold, 11, 7), y + 20, 15, P.goldLight, 'left');

  const grade = title ? { letter: 'S', progress: 1 } : runGrade(state);
  const color = GRADE_COLORS[grade.letter];
  pill(ctx, 1036, y + 9, 48, 42, color, P.panel, 2.5);
  glowText(ctx, grade.letter, 1060, y + 31, { size: 28, color, glow: color, blur: 14 });
  tag(ctx, title ? 'GRADES S·A·B·C·D' : 'RUN GRADE', 1094, y + 20, color, 10.5, 6);
  meter(ctx, 1094, y + 36, 172, 7, grade.progress, color);
  glowText(ctx, title ? 'score against par' : 'to the next grade', 1094, y + 53, { ...SOFT, size: 10 });

  keyStrip(ctx, [CONTROLS[0], CONTROLS[2], CONTROLS[7], CONTROLS[8], CONTROLS[9]], 16, y + 81, 13);
  if (ui.muted) tag(ctx, 'MUTED', VIEW.width - 10 - tagWidth(ctx, 'MUTED', 11, 7), y + 81, P.lose, 11, 7);
}

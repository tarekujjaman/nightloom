// The results (score, grade, stats, high score, threads held, restart) and the pause veil.
import { ARENA, PALETTE as P, VIEW } from '../config.js';
import { FONT_TITLE, disc, glowText, label, roundRect } from '../glow.js';
import { formatScore, runGrade } from '../scoring.js';
import { RARITY_COLORS, heldCards } from '../upgrades.js';
import { WAVE_COUNT } from '../waves.js';
import { REALMS, realmIndex } from '../realms.js';
import { PHASE } from '../world.js';
import { CONTROLS, GRADE_COLORS } from '../hud/bars.js';
import { keyStrip, pill, tag, tagCentred, tagWidth } from '../hud/widgets.js';

export function drawResults(ctx, state, ui) {
  ctx.fillStyle = 'rgba(6, 2, 18, 0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const won = state.phase === PHASE.WON;
  const byLoom = state.lostBy === 'loom';
  const color = won ? P.gold : P.ember;
  const w = 860;
  const h = 672;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  const cx = VIEW.width / 2;
  const realm = REALMS[realmIndex(state.wave)].name;
  pill(ctx, x, y, w, h, color, 'rgba(14, 7, 34, 0.96)', 3);
  tagCentred(ctx, won ? 'VICTORY' : 'DEFEAT', cx, y + 34, won ? P.win : P.lose, 14);
  glowText(ctx, won ? 'THE NIGHT IS WOVEN' : byLoom ? 'THE LOOM UNRAVELS' : 'THE WEAVER FALLS', cx, y + 82, { font: FONT_TITLE, size: 56, weight: '700', color, glow: won ? P.cyan : P.violet, blur: 30, letterSpacing: 8 });
  const story = won ? `All ${WAVE_COUNT} waves woven across four realms; the Loom stands at ${Math.ceil(state.loom.health)}.` : `${byLoom ? "The moths tore the Loom's last thread" : 'The Weaver lost the last heart'} on wave ${state.wave}, in ${realm}.`;
  glowText(ctx, story, x + 64, y + 124, { size: 15, weight: '700', align: 'left' });

  const left = x + 64;
  label(ctx, 'SCORE', left, y + 166, 13, P.gold, 'left', 5);
  glowText(ctx, formatScore(state.score), left, y + 204, { size: 54, color: P.gold, glow: P.goldDeep, blur: 22, align: 'left' });
  const hx = left + tag(ctx, 'HIGH SCORE', left, y + 252, P.gold, 12) + 12;
  label(ctx, formatScore(ui.best), hx, y + 252, 20, P.goldLight, 'left');
  if (ui.isNewBest) tag(ctx, 'NEW BEST!', hx + 110, y + 252, P.cyan, 12);

  const grade = runGrade(state);
  const gradeColor = GRADE_COLORS[grade.letter];
  const gx = x + w - 150;
  const gy = y + 204;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  disc(ctx, gx, gy, 54);
  ctx.strokeStyle = gradeColor;
  ctx.lineWidth = 4;
  disc(ctx, gx, gy, 54, false);
  glowText(ctx, grade.letter, gx, gy + 2, { size: 62, color: gradeColor, glow: gradeColor, blur: 24 });
  tagCentred(ctx, 'RUN GRADE', gx, gy - 76, gradeColor, 12);
  label(ctx, `score ×${grade.ratio.toFixed(2)} of par`, gx, gy + 74, 12, P.textSoft);

  const { stats } = state;
  const rows = [
    ['WAVE REACHED', `${state.wave} / ${WAVE_COUNT}`], ['MOTHS CAUGHT', String(stats.captured + stats.burned)],
    ['REALMS CROSSED', `${realmIndex(state.wave) + 1} / ${REALMS.length}`], ['LOOPS CLOSED', String(stats.loops)],
    ['LOOM HEALTH', `${Math.ceil(state.loom.health)} / ${state.loom.max}`], ['BEST LOOP', `+${formatScore(stats.bestLoop)}`],
    ['STARLIGHT EARNED', String(state.starlight.earned)], ['BEST COMBO', `×${Math.round(state.combo.best * 10) / 10}`],
    ['STARS PLANTED', String(stats.starsPlaced)], ['LONGEST CHAIN', `${stats.bestChain} loops`],
    ['PERFECT WAVES', String(stats.perfectWaves)], ['HEARTS LOST', String(stats.hits)],
  ];
  const colW = (w - 168) / 2;
  rows.forEach(([name, value], i) => {
    const rx = left + (i % 2) * (colW + 40);
    const ry = y + 300 + Math.floor(i / 2) * 34;
    label(ctx, name, rx, ry, 12.5, P.textSoft, 'left', 2);
    label(ctx, value, rx + colW, ry, 19, P.text, 'right');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(rx, ry + 15, colW, 1);
  });

  let tx = left + tag(ctx, 'THREADS HELD', left, y + 524, P.gold, 12) + 10;
  const held = heldCards(state.upgrades);
  if (held.length === 0) label(ctx, 'none', tx, y + 524, 13, P.textSoft, 'left');
  for (const card of held) {
    const text = card.name.toUpperCase();
    const tw = tagWidth(ctx, text, 11, 7);
    if (tx + tw > x + w - 40) break;
    roundRect(ctx, tx, y + 514, tw, 20, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    label(ctx, text, tx + tw / 2, y + 525, 11, RARITY_COLORS[card.rarity], 'center', 1.5);
    tx += tw + 8;
  }

  glowText(ctx, 'PRESS R  /  CLICK TO PLAY AGAIN', cx, y + 586, { size: 30, color: P.goldLight, glow: P.gold, blur: 22, letterSpacing: 5, alpha: 0.7 + 0.3 * Math.sin(ui.time * 3.2) });
  label(ctx, 'ESC  title   ·   M  sound', cx, y + 630, 13, P.textSoft, 'center', 2);
}

export function drawPause(ctx, ui) {
  ctx.fillStyle = 'rgba(6, 2, 18, 0.66)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  const cx = ARENA.x + ARENA.width / 2;
  const cy = ARENA.y + ARENA.height / 2;
  glowText(ctx, 'PAUSED', cx, cy - 90, { font: FONT_TITLE, size: 76, weight: '700', color: P.gold, glow: P.cyan, blur: 30, letterSpacing: 12 });
  glowText(ctx, 'P or ESC to resume', cx, cy - 22, { size: 22, letterSpacing: 2, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
  keyStrip(ctx, CONTROLS.slice(0, 4), cx - 360, cy + 40, 15);
  keyStrip(ctx, CONTROLS.slice(4), cx - 360, cy + 80, 15);
}

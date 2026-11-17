// The card choice between waves: rarity, key, icon, name, level, stat, blurb and effect on each card.
import { ARENA, PALETTE } from '../config.js';
import { FONT_TITLE, glowText, roundRect, wrapText } from '../glow.js';
import { WAVE_COUNT } from '../waves.js';
import { RARITY_COLORS, offersRelic, upgradeById } from '../upgrades.js';
import { pill, tagCentred } from '../hud/widgets.js';
import { drawUpgradeIcon } from './icons.js';

const CARD = { width: 272, height: 420, gap: 26, y: ARENA.y + 106 };

function cardX(index, count) {
  const total = count * CARD.width + (count - 1) * CARD.gap;
  return ARENA.x + (ARENA.width - total) / 2 + index * (CARD.width + CARD.gap);
}

/** The index of the card under the view point (x, y), or -1. */
export function upgradeCardAt(x, y, count = 3) {
  for (let i = 0; i < count; i += 1) {
    const left = cardX(i, count);
    if (x >= left && x <= left + CARD.width && y >= CARD.y && y <= CARD.y + CARD.height) return i;
  }
  return -1;
}

function drawCard(ctx, state, ui, id, index, count) {
  const card = upgradeById(id);
  const hovered = ui.hover === index;
  const color = RARITY_COLORS[card.rarity];
  const x = cardX(index, count);
  const y = CARD.y + (hovered ? -10 : 0);
  const mid = x + CARD.width / 2;
  const held = state.upgrades[id] || 0;
  ctx.save();
  roundRect(ctx, x, y, CARD.width, CARD.height, 18);
  const fill = ctx.createLinearGradient(0, y, 0, y + CARD.height);
  fill.addColorStop(0, hovered ? '#2e1c5e' : '#1e1240');
  fill.addColorStop(1, '#0c0620');
  ctx.fillStyle = fill;
  ctx.shadowColor = hovered ? color : 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = hovered ? 34 : 20;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = hovered ? 4 : 2.5;
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CARD.width, 28);
  ctx.restore();
  glowText(ctx, card.rarity === 'relic' ? 'RELIC OF THE ECLIPSE' : `${card.rarity.toUpperCase()} THREAD`, mid, y + 15, { size: 12, color: PALETTE.ink, letterSpacing: 3 });
  roundRect(ctx, x + 12, y + 40, 32, 32, 8);
  ctx.fillStyle = hovered ? PALETTE.gold : 'rgba(255, 211, 107, 0.3)';
  ctx.fill();
  glowText(ctx, String(index + 1), x + 28, y + 57, { size: 19, color: hovered ? PALETTE.ink : PALETTE.goldLight });
  drawUpgradeIcon(ctx, id, mid, y + 110, 66);
  glowText(ctx, card.name.toUpperCase(), mid, y + 172, { size: 22, color: card.rarity === 'relic' ? PALETTE.magenta : PALETTE.goldLight, glow: hovered ? color : null, blur: 14, letterSpacing: 2 });
  tagCentred(ctx, held > 0 ? `LEVEL ${held} → ${held + 1} OF ${card.max}` : card.max > 1 ? `NEW · UP TO LEVEL ${card.max}` : 'NEW · ONCE PER NIGHT', mid, y + 204, color, 11);
  glowText(ctx, held > 0 ? `now ${card.stat(held)}` : card.stat(1), mid, y + 232, { size: 13.5, color: PALETTE.gold });
  if (held > 0) glowText(ctx, `next ${card.stat(held + 1)}`, mid, y + 252, { size: 13.5, color: PALETTE.goldLight });
  let ly = y + (held > 0 ? 284 : 268);
  for (const line of wrapText(ctx, card.blurb, CARD.width - 44, { size: 15, weight: '600' })) {
    glowText(ctx, line, mid, ly, { size: 15, weight: '600', color: PALETTE.text });
    ly += 22;
  }
  tagCentred(ctx, card.effect.toUpperCase(), mid, y + 362, PALETTE.cyan, 13);
  glowText(ctx, hovered ? 'CLICK TO TAKE IT' : `press ${index + 1} or click`, mid, y + 396, { size: 12, color: hovered ? PALETTE.goldLight : PALETTE.textSoft, letterSpacing: 1 });
}

/** Draw the card choice in view coordinates. */
export function drawUpgradeChoice(ctx, state, ui) {
  ctx.fillStyle = 'rgba(6, 2, 20, 0.72)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  const cx = ARENA.x + ARENA.width / 2;
  const relic = offersRelic(state.wave, state.upgrades);
  glowText(ctx, `WAVE ${state.wave} CLEARED`, cx, ARENA.y + 44, { font: FONT_TITLE, size: 46, weight: '700', color: PALETTE.gold, glow: PALETTE.cyan, blur: 24, letterSpacing: 8 });
  glowText(ctx, relic ? 'THE ECLIPSE MOTH FALLS  ·  CHOOSE A RELIC' : `CHOOSE A THREAD FOR THE LOOM  ·  WAVE ${state.wave + 1} OF ${WAVE_COUNT} WAITS`, cx, ARENA.y + 82, { size: 15, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 10, letterSpacing: 4 });
  for (let i = 0; i < state.offer.length; i += 1) drawCard(ctx, state, ui, state.offer[i], i, state.offer.length);
  const py = CARD.y + CARD.height + 34;
  pill(ctx, cx - 190, py - 16, 380, 32, PALETTE.gold);
  glowText(ctx, 'CLICK A CARD  OR PRESS  1 · 2 · 3', cx, py + 1, { size: 15, color: PALETTE.goldLight, letterSpacing: 3, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
}

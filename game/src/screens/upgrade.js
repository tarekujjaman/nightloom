// The card choice between waves (rarity, key, icon, name, level, stat, blurb and effect on each card) and the line icon of every card.
import { ARENA, PALETTE } from '../config.js';
import { FONT_TITLE, glowText, heartPath, roundRect, sparklePath, wrapText } from '../glow.js';
import { WAVE_COUNT } from '../waves.js';
import { RARITY_COLORS, offersRelic, upgradeById } from '../upgrades.js';
import { pill, tagCentred } from '../hud/widgets.js';

const CARD = { width: 272, height: 420, gap: 26, y: ARENA.y + 106 };

function ring(ctx, r, dash = null) {
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function sparkle(ctx, x, y, r, pinch, rotation, color) {
  ctx.fillStyle = color;
  sparklePath(ctx, x, y, r, pinch, rotation);
  ctx.fill();
}

/** The icon of card `id`, drawn inside a `size` box centred on (x, y). */
export function drawUpgradeIcon(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.gold;
  ctx.fillStyle = PALETTE.gold;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = size * 0.25;
  if (['still', 'shield', 'net'].includes(id)) ctx.strokeStyle = ctx.shadowColor = PALETTE.cyan;
  if (['moonspool', 'starfall', 'hourglass', 'lodestar'].includes(id)) ctx.strokeStyle = PALETTE.magenta;
  switch (id) {
    case 'reach':
      ring(ctx, s * 0.9, [6, 6]);
      disc(ctx, 0, 0, s * 0.18);
      line(ctx, s * 0.25, 0, s * 0.85, 0);
      line(ctx, s * 0.65, -s * 0.2, s * 0.85, 0);
      line(ctx, s * 0.65, s * 0.2, s * 0.85, 0);
      break;
    case 'swift':
      disc(ctx, s * 0.35, 0, s * 0.3);
      for (let i = -1; i <= 1; i += 1) line(ctx, s * 0.1, i * s * 0.28, -s * (0.9 - Math.abs(i) * 0.3), i * s * 0.28);
      break;
    case 'ember':
      ctx.fillStyle = PALETTE.emberGlow;
      ctx.shadowColor = PALETTE.ember;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.7, s * 0.9, 0, s * 0.95);
      ctx.bezierCurveTo(-s * 0.7, s * 0.9, -s * 0.9, -s * 0.2, 0, -s * 0.95);
      ctx.fill();
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.bezierCurveTo(s * 0.4, s * 0.1, s * 0.3, s * 0.7, 0, s * 0.75);
      ctx.bezierCurveTo(-s * 0.3, s * 0.7, -s * 0.4, s * 0.1, 0, -s * 0.3);
      ctx.fill();
      break;
    case 'heart':
      ctx.fillStyle = PALETTE.heart;
      ctx.shadowColor = PALETTE.heart;
      heartPath(ctx, 0, 0, size * 0.9);
      ctx.fill();
      break;
    case 'still':
      ring(ctx, s * 0.85);
      line(ctx, 0, -s * 0.55, 0, 0);
      line(ctx, 0, 0, s * 0.4, s * 0.25);
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.8, s * 0.5, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.8, s * 0.5, -s * 0.8, -s * 0.6);
      ctx.closePath();
      ctx.stroke();
      sparkle(ctx, 0, -s * 0.05, s * 0.35, 0.3, 0, PALETTE.goldLight);
      break;
    case 'gold':
      sparkle(ctx, 0, 0, s * 0.95, 0.32, 0, PALETTE.gold);
      sparkle(ctx, 0, 0, s * 0.4, 0.32, Math.PI / 4, '#ffffff');
      break;
    case 'steady':
      ctx.strokeStyle = PALETTE.textSoft;
      ctx.shadowBlur = 0;
      line(ctx, -s * 0.7, -s * 0.7, s * 0.5, s * 0.5);
      line(ctx, s * 0.7, -s * 0.7, -s * 0.5, s * 0.5);
      ctx.strokeStyle = PALETTE.gold;
      ctx.shadowBlur = size * 0.25;
      ctx.lineWidth *= 1.6;
      line(ctx, -s * 0.95, 0, s * 0.95, 0);
      break;
    case 'net':
      ctx.lineWidth *= 0.7;
      for (let i = -2; i <= 2; i += 1) {
        line(ctx, -s * 0.9, i * s * 0.4, s * 0.9, i * s * 0.4);
        line(ctx, i * s * 0.4, -s * 0.9, i * s * 0.4, s * 0.9);
      }
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth *= 1.6;
      ring(ctx, s * 0.95);
      break;
    case 'moonspool':
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.arc(s * 0.35, -s * 0.2, s * 0.7, 0, Math.PI * 2, true);
      ctx.fill();
      for (let i = -1; i <= 1; i += 1) line(ctx, s * 0.1, s * (0.5 + i * 0.22), s * 0.95, s * (0.5 + i * 0.22));
      break;
    case 'starfall':
      for (let i = 0; i < 3; i += 1) line(ctx, -s * 0.9 + i * s * 0.35, -s * 0.9, -s * 0.5 + i * s * 0.35, -s * 0.3);
      sparkle(ctx, s * 0.2, s * 0.25, s * 0.7, 0.3, 0, PALETTE.goldLight);
      break;
    case 'hourglass':
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.9);
      ctx.lineTo(s * 0.6, -s * 0.9);
      ctx.lineTo(-s * 0.6, s * 0.9);
      ctx.lineTo(s * 0.6, s * 0.9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.85);
      ctx.lineTo(s * 0.4, s * 0.85);
      ctx.lineTo(0, s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ring(ctx, s * 0.95, [4, 5]);
      sparkle(ctx, 0, 0, s * 0.8, 0.22, 0, PALETTE.goldLight);
      ctx.fillStyle = PALETTE.magenta;
      disc(ctx, 0, 0, s * 0.16);
      break;
  }
  ctx.restore();
}

function cardX(index, count) {
  return ARENA.x + (ARENA.width - count * CARD.width - (count - 1) * CARD.gap) / 2 + index * (CARD.width + CARD.gap);
}

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

export function drawUpgradeChoice(ctx, state, ui) {
  ctx.fillStyle = 'rgba(6, 2, 20, 0.72)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  const cx = ARENA.x + ARENA.width / 2;
  const relic = offersRelic(state.wave, state.upgrades);
  glowText(ctx, `WAVE ${state.wave} CLEARED`, cx, ARENA.y + 44, { font: FONT_TITLE, size: 46, weight: '700', color: PALETTE.gold, glow: PALETTE.cyan, blur: 24, letterSpacing: 8 });
  glowText(ctx, relic ? 'THE ECLIPSE MOTH FALLS  ·  CHOOSE A RELIC' : `CHOOSE A THREAD FOR THE LOOM  ·  WAVE ${state.wave + 1} OF ${WAVE_COUNT} WAITS`, cx, ARENA.y + 82, { size: 15, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 10, letterSpacing: 4 });
  state.offer.forEach((id, i) => drawCard(ctx, state, ui, id, i, state.offer.length));
  const py = CARD.y + CARD.height + 34;
  pill(ctx, cx - 190, py - 16, 380, 32, PALETTE.gold);
  glowText(ctx, 'CLICK A CARD  OR PRESS  1 · 2 · 3', cx, py + 1, { size: 15, color: PALETTE.goldLight, letterSpacing: 3, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
}

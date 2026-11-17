// The card choice between waves: three free cards, a fourth for starlight and a re-roll; every card's line icon.
import { ARENA, PALETTE as P, STARLIGHT } from '../config.js';
import { FONT_TITLE, drawGlyph, glowText, label, roundRect, wrapText } from '../glow.js';
import { WAVE_COUNT } from '../waves.js';
import { RARITY_COLORS, offersRelic, upgradeById } from '../upgrades.js';
import { REALMS, realmIndex } from '../realms.js';
import { pill, starAmount, tagCentred, tagWidth } from '../hud/widgets.js';

const CARD = { width: 218, height: 400, gap: 16, y: ARENA.y + 98 };
const REROLL = { x: ARENA.x + ARENA.width / 2 + 40, y: CARD.y + CARD.height + 18, w: 250, h: 32 };
const CYAN = ['C', P.cyan, P.cyan, P.cyan];
const ICONS = {
  reach: [['R', 0.9, [6, 6]], ['D', 0, 0, 0.18], ['L', 0.25, 0, 0.85, 0], ['L', 0.65, -0.2, 0.85, 0], ['L', 0.65, 0.2, 0.85, 0]],
  swift: [['D', 0.35, 0, 0.3], ['L', 0.1, -0.28, -0.6, -0.28], ['L', 0.1, 0, -0.9, 0], ['L', 0.1, 0.28, -0.6, 0.28]],
  heart: [['C', P.heart, P.heart, P.heart], ['H']],
  mend: [['L', -0.9, 0.3, -0.3, -0.3], ['L', -0.3, -0.3, 0.2, 0.3], ['L', 0.2, 0.3, 0.9, -0.4], ['C', P.cyan], ['W', 0.7], ['L', -0.6, -0.9, -0.6, 0.9], ['L', 0, -0.9, 0, 0.9], ['L', 0.6, -0.9, 0.6, 0.9]],
  ember: [['C', P.emberGlow, P.emberGlow, P.ember], ['F', 0.95, 0.9, 0.7], ['C', P.goldLight, P.goldLight], ['F', 0.3, 0.4, 0.3]],
  still: [CYAN, ['R', 0.85], ['L', 0, -0.55, 0, 0], ['L', 0, 0, 0.4, 0.25]],
  shield: [CYAN, ['P', [[0, -0.95], [0.8, -0.6], [0.7, 0.3], [0, 0.95], [-0.7, 0.3], [-0.8, -0.6]]], ['S', 0, -0.05, 0.35, 0.3, 0, P.goldLight]],
  steady: [['C', P.textSoft], ['L', -0.7, -0.7, 0.5, 0.5], ['L', 0.7, -0.7, -0.5, 0.5], ['C', P.gold], ['W', 1.6], ['L', -0.95, 0, 0.95, 0]],
  net: [CYAN, ['W', 0.7], ['G'], ['C', P.gold], ['W', 1.6], ['R', 0.95]],
  gold: [['S', 0, 0, 0.95, 0.32, 0, P.gold], ['S', 0, 0, 0.4, 0.32, Math.PI / 4, '#ffffff']],
  moonspool: [['C', P.magenta, P.goldLight], ['M'], ['L', 0.1, 0.28, 0.95, 0.28], ['L', 0.1, 0.5, 0.95, 0.5], ['L', 0.1, 0.72, 0.95, 0.72]],
  starfall: [['C', P.magenta], ['L', -0.9, -0.9, -0.5, -0.3], ['L', -0.55, -0.9, -0.15, -0.3], ['L', -0.2, -0.9, 0.2, -0.3], ['S', 0.2, 0.25, 0.7, 0.3, 0, P.goldLight]],
  hourglass: [['C', P.magenta, P.goldLight], ['P', [[-0.6, -0.9], [0.6, -0.9], [-0.6, 0.9], [0.6, 0.9]]], ['P', [[-0.4, 0.85], [0.4, 0.85], [0, 0.2]], true]],
  lodestar: [['C', P.magenta], ['R', 0.95, [4, 5]], ['S', 0, 0, 0.8, 0.22, 0, P.goldLight], ['C', P.magenta, P.magenta], ['D', 0, 0, 0.16]],
};

export function drawUpgradeIcon(ctx, id, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = P.gold;
  ctx.shadowBlur = size * 0.25;
  drawGlyph(ctx, ICONS[id], size / 2);
  ctx.restore();
}

const cardX = (index, count) => ARENA.x + (ARENA.width - count * CARD.width - (count - 1) * CARD.gap) / 2 + index * (CARD.width + CARD.gap);

export function upgradeCardAt(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const left = cardX(i, count);
    if (x >= left && x <= left + CARD.width && y >= CARD.y && y <= CARD.y + CARD.height) return i;
  }
  return -1;
}

export const rerollAt = (x, y) => x >= REROLL.x && x <= REROLL.x + REROLL.w && y >= REROLL.y && y <= REROLL.y + REROLL.h;

function drawCard(ctx, state, ui, id, index, count) {
  const card = upgradeById(id);
  const hovered = ui.hover === index;
  const color = RARITY_COLORS[card.rarity];
  const x = cardX(index, count);
  const y = CARD.y + (hovered ? -10 : 0);
  const mid = x + CARD.width / 2;
  const held = state.upgrades[id] || 0;
  const priced = index === 3;
  const affordable = !priced || state.starlight.have >= STARLIGHT.fourth;
  ctx.save();
  ctx.globalAlpha = affordable ? 1 : 0.55;
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
  ctx.strokeStyle = priced ? P.gold : color;
  ctx.lineWidth = hovered ? 4 : 2.5;
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CARD.width, 26);
  ctx.restore();
  label(ctx, card.rarity === 'relic' ? 'RELIC OF THE ECLIPSE' : `${card.rarity.toUpperCase()} THREAD`, mid, y + 14, 11.5, P.ink, 'center', 3);
  roundRect(ctx, x + 12, y + 38, 30, 30, 8);
  ctx.fillStyle = hovered ? P.gold : 'rgba(255, 211, 107, 0.3)';
  ctx.fill();
  label(ctx, String(index + 1), x + 27, y + 54, 18, hovered ? P.ink : P.goldLight);
  if (priced) {
    roundRect(ctx, x + CARD.width - 76, y + 38, 64, 30, 8);
    ctx.fillStyle = 'rgba(255, 211, 107, 0.18)';
    ctx.fill();
    starAmount(ctx, STARLIGHT.fourth, x + CARD.width - 68, y + 54, 16, affordable ? P.gold : P.lose);
  }
  drawUpgradeIcon(ctx, id, mid, y + 104, 56);
  glowText(ctx, card.name.toUpperCase(), mid, y + 158, { size: 19, color: card.rarity === 'relic' ? P.magenta : P.goldLight, glow: hovered ? color : null, blur: 14, letterSpacing: 1.5 });
  tagCentred(ctx, held > 0 ? `LEVEL ${held} → ${held + 1} OF ${card.max}` : card.max > 1 ? `NEW · UP TO LEVEL ${card.max}` : 'NEW · ONCE PER NIGHT', mid, y + 188, color, 10.5);
  label(ctx, held > 0 ? `now ${card.stat(held)}` : card.stat(1), mid, y + 214, 12.5, P.gold);
  if (held > 0) label(ctx, `next ${card.stat(held + 1)}`, mid, y + 232, 12.5, P.goldLight);
  let ly = y + (held > 0 ? 262 : 248);
  for (const text of wrapText(ctx, card.blurb, CARD.width - 36, { size: 14, weight: '600' })) {
    glowText(ctx, text, mid, ly, { size: 14, weight: '600' });
    ly += 20;
  }
  tagCentred(ctx, card.effect.toUpperCase(), mid, y + 344, P.cyan, 12);
  const prompt = priced ? (affordable ? `press 4 · spends ${STARLIGHT.fourth} starlight` : `needs ${STARLIGHT.fourth} starlight`) : hovered ? 'CLICK TO TAKE IT' : `press ${index + 1} or click`;
  label(ctx, prompt, mid, y + 376, 11.5, hovered || priced ? P.goldLight : P.textSoft, 'center', 1);
  ctx.restore();
}

export function drawUpgradeChoice(ctx, state, ui) {
  ctx.fillStyle = 'rgba(6, 2, 20, 0.72)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  const cx = ARENA.x + ARENA.width / 2;
  const relic = offersRelic(state.wave, state.upgrades);
  const nextRealm = realmIndex(state.wave + 1) !== realmIndex(state.wave) ? REALMS[realmIndex(state.wave + 1)] : null;
  glowText(ctx, `WAVE ${state.wave} CLEARED`, cx, ARENA.y + 40, { font: FONT_TITLE, size: 44, weight: '700', color: P.gold, glow: P.cyan, blur: 24, letterSpacing: 8 });
  const subtitle = relic ? 'THE ECLIPSE MOTH FALLS  ·  CHOOSE A RELIC' : nextRealm ? `A NEW REALM WAITS: ${nextRealm.name.toUpperCase()}  ·  WAVE ${state.wave + 1} OF ${WAVE_COUNT}` : `CHOOSE A THREAD FOR THE LOOM  ·  WAVE ${state.wave + 1} OF ${WAVE_COUNT} WAITS`;
  glowText(ctx, subtitle, cx, ARENA.y + 76, { size: 14.5, color: nextRealm ? nextRealm.accent : P.cyan, glow: P.cyanDeep, blur: 10, letterSpacing: 4 });
  state.offer.forEach((id, i) => drawCard(ctx, state, ui, id, i, state.offer.length));
  const py = REROLL.y + 16;
  pill(ctx, cx - 320, py - 16, 350, 32, P.gold);
  glowText(ctx, 'CLICK A CARD  OR PRESS  1 · 2 · 3 · 4', cx - 145, py + 1, { size: 14, color: P.goldLight, letterSpacing: 3, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
  const can = state.starlight.have >= STARLIGHT.reroll;
  pill(ctx, REROLL.x, REROLL.y, REROLL.w, REROLL.h, can ? P.magenta : P.panelLine);
  const used = tagWidth(ctx, 'TAB', 11, 6);
  tagCentred(ctx, 'TAB', REROLL.x + 14 + used / 2, py + 1, can ? P.magenta : P.textSoft, 11, 6);
  label(ctx, 'RE-ROLL THE CARDS', REROLL.x + 22 + used, py + 1, 12.5, can ? P.text : P.textSoft, 'left', 1);
  starAmount(ctx, STARLIGHT.reroll, REROLL.x + REROLL.w - 52, py + 1, 14, can ? P.gold : P.textSoft);
}

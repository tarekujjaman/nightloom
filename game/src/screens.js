// The screens drawn over the field: the title with its logo and how-to, the wave banner, the pause
// veil, the three upgrade cards between waves, and the results after a victory or a defeat.
import { FIELD, PALETTE } from './config.js';
import { FONT_TITLE, FONT_UI, glowText, heartPath, measureText, rgba, roundRect, sparklePath, wrapText } from './glow.js';
import { formatScore } from './scoring.js';
import { upgradeById } from './upgrades.js';
import { WAVE_COUNT } from './waves.js';
import { PHASE_WON } from './world.js';

/** The title screen over the live attract scene. */
export function drawTitle(ctx, state, ui) {
  const cx = FIELD.width / 2;
  const t = ui.time;
  dim(ctx, 0.18);
  const top = ctx.createLinearGradient(0, 0, 0, 330);
  top.addColorStop(0, 'rgba(4, 2, 14, 0.85)');
  top.addColorStop(0.75, 'rgba(4, 2, 14, 0.55)');
  top.addColorStop(1, 'rgba(4, 2, 14, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, FIELD.width, 330);
  const bottom = ctx.createLinearGradient(0, 560, 0, FIELD.height);
  bottom.addColorStop(0, 'rgba(4, 2, 14, 0)');
  bottom.addColorStop(0.35, 'rgba(4, 2, 14, 0.6)');
  bottom.addColorStop(1, 'rgba(4, 2, 14, 0.9)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 560, FIELD.width, FIELD.height - 560);
  drawLogo(ctx, cx, 160, 126, t);
  glowText(ctx, 'WEAVE THE STARS  ·  CATCH THE VOID', cx, 282, { size: 21, weight: '700', color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 12, letterSpacing: 6 });
  const pulse = 0.72 + 0.28 * Math.sin(t * 3.2);
  glowText(ctx, 'CLICK TO BEGIN', cx, 636, { size: 36, weight: '800', color: PALETTE.goldLight, glow: PALETTE.gold, blur: 26, letterSpacing: 7, alpha: pulse });
  const lines = [
    ['WASD / ARROWS', 'move the Weaver, your spark of light'],
    ['HOLD LEFT MOUSE', 'on a star within reach, drag star to star, return to the first star to snap the loop and capture every moth inside'],
    ['10 WAVES', 'a thread upgrade after each, two Eclipse Moths to unveil  ·  P pause  ·  M mute'],
  ];
  let y = 692;
  for (const [key, text] of lines) {
    glowText(ctx, key, cx - 236, y, { size: 15, weight: '800', color: PALETTE.gold, align: 'right', letterSpacing: 1.5 });
    glowText(ctx, text, cx - 218, y, { size: 15, weight: '500', color: PALETTE.text, align: 'left' });
    y += 28;
  }
  if (ui.best > 0) glowText(ctx, `HIGH SCORE  ${formatScore(ui.best)}`, FIELD.width - 40, 40, { size: 15, weight: '700', color: PALETTE.textDim, align: 'right', letterSpacing: 3 });
  if (ui.muted) glowText(ctx, 'MUTED', 40, 40, { size: 13, weight: '800', color: PALETTE.ember, align: 'left', letterSpacing: 3 });
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_RESULTS = 'results';

const CARD = { width: 300, height: 370, gap: 40, y: 232 };

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 2, 12, ${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** A soft dark pool behind text so it reads over a busy sky. */
function pool(ctx, x, y, rx, ry, alpha = 0.6) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gradient.addColorStop(0, `rgba(4, 2, 14, ${alpha})`);
  gradient.addColorStop(0.7, `rgba(4, 2, 14, ${alpha * 0.7})`);
  gradient.addColorStop(1, 'rgba(4, 2, 14, 0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The NIGHTLOOM word mark: wide-tracked serif capitals in gold with a cyan halo and a woven underline. */
export function drawLogo(ctx, x, y, size, time) {
  const spec = { font: FONT_TITLE, size, weight: '700', letterSpacing: size * 0.12 };
  const width = measureText(ctx, 'NIGHTLOOM', spec);
  ctx.save();
  ctx.font = `${spec.weight} ${size}px ${spec.font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spec.letterSpacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = rgba(PALETTE.cyan, 0.55);
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = size * 0.22;
  const gradient = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  gradient.addColorStop(0, '#fff6d8');
  gradient.addColorStop(0.45, PALETTE.gold);
  gradient.addColorStop(1, PALETTE.goldDeep);
  ctx.fillStyle = gradient;
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowBlur = 0;
  ctx.restore();
  const left = x - width / 2;
  const right = x + width / 2;
  const lineY = y + size * 0.62;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(PALETTE.cyan, 0.8);
  ctx.lineWidth = 2;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(left, lineY);
  ctx.lineTo(x - size * 0.6, lineY + size * 0.12);
  ctx.lineTo(x, lineY);
  ctx.lineTo(x + size * 0.6, lineY + size * 0.12);
  ctx.lineTo(right, lineY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.goldLight;
  for (const [sx, sy] of [[left, lineY], [x - size * 0.6, lineY + size * 0.12], [x, lineY], [x + size * 0.6, lineY + size * 0.12], [right, lineY]]) {
    sparklePath(ctx, sx, sy, 7 + 2 * Math.sin(time * 3 + sx), 0.3, 0);
    ctx.fill();
  }
  ctx.restore();
}

/** The wave banner that fades in and out at the start of each wave and when one is cleared. */
export function drawWaveBanner(ctx, state) {
  const banner = state.banner;
  if (!banner) return;
  const age = banner.age;
  const alpha = Math.min(1, age / 0.25) * (age > 2.4 ? Math.max(0, 1 - (age - 2.4) / 0.8) : 1);
  if (alpha <= 0) return;
  const cx = FIELD.width / 2;
  const y = 300;
  ctx.save();
  ctx.globalAlpha = alpha;
  const band = ctx.createLinearGradient(0, 0, FIELD.width, 0);
  band.addColorStop(0, 'rgba(4, 2, 14, 0)');
  band.addColorStop(0.2, 'rgba(4, 2, 14, 0.7)');
  band.addColorStop(0.8, 'rgba(4, 2, 14, 0.7)');
  band.addColorStop(1, 'rgba(4, 2, 14, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y - 70, FIELD.width, 150);
  const color = banner.boss ? PALETTE.ember : banner.clear ? PALETTE.cyan : PALETTE.gold;
  glowText(ctx, banner.title, cx, y - 14, { font: FONT_TITLE, size: 58, weight: '700', color, glow: color, blur: 26, letterSpacing: 8 });
  glowText(ctx, banner.name.toUpperCase(), cx, y + 36, { size: 22, weight: '800', color: PALETTE.goldLight, letterSpacing: 5 });
  if (banner.tagline) glowText(ctx, banner.tagline, cx, y + 64, { size: 16, weight: '500', color: PALETTE.textDim });
  ctx.restore();
}

/** The pause veil. */
export function drawPause(ctx, ui) {
  dim(ctx, 0.62);
  const cx = FIELD.width / 2;
  glowText(ctx, 'PAUSED', cx, 300, { font: FONT_TITLE, size: 76, weight: '700', color: PALETTE.gold, glow: PALETTE.cyan, blur: 30, letterSpacing: 12 });
  glowText(ctx, 'P or ESC to resume', cx, 372, { size: 22, weight: '700', color: PALETTE.text, letterSpacing: 2, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
  const lines = ['WASD / ARROWS  move', 'HOLD LEFT MOUSE  weave star to star', 'FIRST STAR AGAIN  close the loop', 'SPACE  still time (when held)', 'M  mute', 'R  restart (on the results screen)'];
  let y = 440;
  for (const line of lines) {
    glowText(ctx, line, cx, y, { size: 17, weight: '600', color: PALETTE.textDim, letterSpacing: 1 });
    y += 30;
  }
}

/** Left edge of card `index` of `count` cards. */
function cardX(index, count) {
  const total = count * CARD.width + (count - 1) * CARD.gap;
  return (FIELD.width - total) / 2 + index * (CARD.width + CARD.gap);
}

/** The index of the upgrade card under (x, y), or -1. */
export function upgradeCardAt(x, y, count = 3) {
  for (let i = 0; i < count; i += 1) {
    const left = cardX(i, count);
    if (x >= left && x <= left + CARD.width && y >= CARD.y && y <= CARD.y + CARD.height) return i;
  }
  return -1;
}

/** A line icon for an upgrade, drawn inside a `size` box centred on (x, y). */
export function drawUpgradeIcon(ctx, id, x, y, size, time) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.gold;
  ctx.fillStyle = PALETTE.gold;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 16;
  switch (id) {
    case 'reach':
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.25, 0);
      ctx.lineTo(s * 0.85, 0);
      ctx.moveTo(s * 0.65, -s * 0.2);
      ctx.lineTo(s * 0.85, 0);
      ctx.lineTo(s * 0.65, s * 0.2);
      ctx.stroke();
      break;
    case 'swift':
      ctx.beginPath();
      ctx.arc(s * 0.35, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * 0.1, i * s * 0.28);
        ctx.lineTo(-s * (0.9 - Math.abs(i) * 0.3), i * s * 0.28);
        ctx.stroke();
      }
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
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(0, 0);
      ctx.lineTo(s * 0.4, s * 0.25);
      ctx.stroke();
      ctx.fillStyle = PALETTE.cyan;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(Math.cos((i * Math.PI) / 2) * s * 0.85, Math.sin((i * Math.PI) / 2) * s * 0.85, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'shield':
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.8, s * 0.5, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.8, s * 0.5, -s * 0.8, -s * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = PALETTE.goldLight;
      sparklePath(ctx, 0, -s * 0.05, s * 0.35, 0.3, 0);
      ctx.fill();
      break;
    case 'gold':
      sparklePath(ctx, 0, 0, s * 0.95, 0.32, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      sparklePath(ctx, 0, 0, s * 0.4, 0.32, Math.PI / 4);
      ctx.fill();
      break;
    case 'steady':
      ctx.strokeStyle = PALETTE.textDim;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.7);
      ctx.lineTo(s * 0.5, s * 0.5);
      ctx.moveTo(s * 0.7, -s * 0.7);
      ctx.lineTo(-s * 0.5, s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.65, s * 0.65, s * 0.22, 0, Math.PI * 2);
      ctx.arc(s * 0.65, s * 0.65, s * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.gold;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, 0);
      ctx.lineTo(s * 0.95, 0);
      ctx.stroke();
      break;
    case 'net':
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.9, i * s * 0.4);
        ctx.lineTo(s * 0.9, i * s * 0.4);
        ctx.moveTo(i * s * 0.4, -s * 0.9);
        ctx.lineTo(i * s * 0.4, s * 0.9);
        ctx.stroke();
      }
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      break;
  }
  ctx.restore();
}

/** The between-wave choice: three cards, the hovered one lifted. */
export function drawUpgradeChoice(ctx, state, ui) {
  dim(ctx, 0.66);
  const cx = FIELD.width / 2;
  glowText(ctx, `WAVE ${state.wave} CLEARED`, cx, 112, { font: FONT_TITLE, size: 54, weight: '700', color: PALETTE.gold, glow: PALETTE.cyan, blur: 26, letterSpacing: 8 });
  glowText(ctx, 'CHOOSE A THREAD FOR THE LOOM', cx, 166, { size: 18, weight: '800', color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 10, letterSpacing: 5 });
  glowText(ctx, `Wave ${state.wave + 1} of ${WAVE_COUNT} waits beyond this choice`, cx, 196, { size: 15, weight: '500', color: PALETTE.textDim });
  const offers = state.offer;
  for (let i = 0; i < offers.length; i += 1) {
    const upgrade = upgradeById(offers[i]);
    if (!upgrade) continue;
    const hovered = ui.hover === i;
    const lift = hovered ? -10 : 0;
    const x = cardX(i, offers.length);
    const y = CARD.y + lift;
    const mid = x + CARD.width / 2;
    ctx.save();
    roundRect(ctx, x, y, CARD.width, CARD.height, 18);
    const fill = ctx.createLinearGradient(0, y, 0, y + CARD.height);
    fill.addColorStop(0, hovered ? '#2a1a52' : '#1c1138');
    fill.addColorStop(1, '#0a0518');
    ctx.fillStyle = fill;
    ctx.shadowColor = hovered ? PALETTE.gold : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = hovered ? 34 : 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hovered ? PALETTE.goldLight : rgba(PALETTE.gold, 0.6);
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.stroke();
    roundRect(ctx, x + 8, y + 8, CARD.width - 16, CARD.height - 16, 12);
    ctx.strokeStyle = rgba(PALETTE.cyan, hovered ? 0.35 : 0.18);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    roundRect(ctx, x + 16, y + 16, 34, 34, 8);
    ctx.fillStyle = hovered ? PALETTE.gold : rgba(PALETTE.gold, 0.25);
    ctx.fill();
    glowText(ctx, String(i + 1), x + 33, y + 34, { size: 18, weight: '800', color: hovered ? '#1a0e3f' : PALETTE.goldLight });
    drawUpgradeIcon(ctx, upgrade.id, mid, y + 112, 76, ui.time);
    glowText(ctx, upgrade.name.toUpperCase(), mid, y + 190, { size: 23, weight: '800', color: PALETTE.goldLight, glow: hovered ? PALETTE.gold : null, blur: 14, letterSpacing: 2 });
    const lines = wrapText(ctx, upgrade.blurb, CARD.width - 56, { size: 17, weight: '500' });
    let ly = y + 230;
    for (const line of lines) {
      glowText(ctx, line, mid, ly, { size: 17, weight: '500', color: PALETTE.text });
      ly += 25;
    }
    roundRect(ctx, mid - 90, y + 296, 180, 30, 15);
    ctx.fillStyle = rgba(PALETTE.cyan, 0.12);
    ctx.fill();
    glowText(ctx, upgrade.effect.toUpperCase(), mid, y + 311, { size: 13, weight: '800', color: PALETTE.cyan, letterSpacing: 2 });
    const held = state.upgrades[upgrade.id] || 0;
    glowText(ctx, held > 0 ? `held ${held} of ${upgrade.max}` : upgrade.max > 1 ? `can be taken ${upgrade.max} times` : 'once per night', mid, y + 345, { size: 13, weight: '600', color: PALETTE.textDim });
  }
  glowText(ctx, 'CLICK A CARD  OR PRESS  1 · 2 · 3', cx, 660, { size: 17, weight: '800', color: PALETTE.textDim, letterSpacing: 3, alpha: 0.75 + 0.25 * Math.sin(ui.time * 3) });
}

/** The results after the night ends, in victory or defeat, with the restart prompt. */
export function drawResults(ctx, state, ui) {
  dim(ctx, 0.72);
  const cx = FIELD.width / 2;
  const won = state.phase === PHASE_WON;
  const title = won ? 'THE NIGHT IS WOVEN' : 'THE LOOM GOES DARK';
  const color = won ? PALETTE.gold : PALETTE.ember;
  pool(ctx, cx, 150, 620, 120, 0.5);
  glowText(ctx, won ? 'VICTORY' : 'DEFEAT', cx, 92, { size: 20, weight: '800', color: won ? PALETTE.cyan : PALETTE.violet, letterSpacing: 10 });
  glowText(ctx, title, cx, 150, { font: FONT_TITLE, size: 66, weight: '700', color, glow: won ? PALETTE.cyan : PALETTE.violet, blur: 30, letterSpacing: 8 });
  glowText(ctx, won ? `All ${WAVE_COUNT} waves cleared. The sky is yours.` : `The moths overran the loom on wave ${state.wave}.`, cx, 206, { size: 19, weight: '500', color: PALETTE.text });
  const boxW = 620;
  const boxX = cx - boxW / 2;
  const boxY = 250;
  const boxH = 330;
  roundRect(ctx, boxX, boxY, boxW, boxH, 18);
  ctx.fillStyle = 'rgba(14, 8, 30, 0.85)';
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();
  glowText(ctx, 'SCORE', cx, boxY + 36, { size: 15, weight: '800', color: PALETTE.textDim, letterSpacing: 5 });
  glowText(ctx, formatScore(state.score), cx, boxY + 84, { size: 60, weight: '800', color: PALETTE.gold, glow: PALETTE.goldDeep, blur: 22 });
  const rows = [
    ['WAVE REACHED', `${state.wave} / ${WAVE_COUNT}`],
    ['BEST COMBO', `×${Math.round(state.combo.best * 10) / 10}`],
    ['MOTHS CAPTURED', String(state.stats.captured + state.stats.burned)],
    ['LOOPS CLOSED', String(state.stats.loops)],
    ['HIGH SCORE', formatScore(ui.best)],
  ];
  let y = boxY + 140;
  for (const [label, value] of rows) {
    glowText(ctx, label, boxX + 60, y, { size: 16, weight: '800', color: PALETTE.textDim, align: 'left', letterSpacing: 3 });
    glowText(ctx, value, boxX + boxW - 60, y, { size: 24, weight: '800', color: PALETTE.text, align: 'right' });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(boxX + 60, y + 16, boxW - 120, 1);
    if (label === 'HIGH SCORE' && ui.isNewBest) {
      const labelWidth = measureText(ctx, label, { size: 16, weight: '800', letterSpacing: 3 });
      const tagX = boxX + 60 + labelWidth + 18;
      roundRect(ctx, tagX, y - 12, 86, 24, 12);
      ctx.fillStyle = PALETTE.cyan;
      ctx.fill();
      glowText(ctx, 'NEW BEST', tagX + 43, y, { size: 12, weight: '800', color: '#061018', letterSpacing: 2 });
    }
    y += 36;
  }
  const pulse = 0.7 + 0.3 * Math.sin(ui.time * 3.2);
  glowText(ctx, 'PRESS R  /  CLICK TO PLAY AGAIN', cx, 640, { size: 28, weight: '800', color: PALETTE.goldLight, glow: PALETTE.gold, blur: 22, letterSpacing: 5, alpha: pulse });
  glowText(ctx, 'M mute', cx, 684, { size: 14, weight: '700', color: PALETTE.textDim, letterSpacing: 3 });
}

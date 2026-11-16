// The HUD over the field: score and combo top-left, the wave and its progress top-centre, hearts
// top-right, the upgrades held bottom-left, the slow-time charge and the controls bottom-right.
import { FIELD, PALETTE, SCORING } from './config.js';
import { FONT_UI, glowText, heartPath, measureText, rgba, roundRect } from './glow.js';
import { formatScore } from './scoring.js';
import { upgradeBadges } from './upgrades.js';
import { WAVE_COUNT, waveDefinition } from './waves.js';

const TOTAL_WAVES = WAVE_COUNT;

function drawScore(ctx, state) {
  glowText(ctx, 'SCORE', 36, 30, { size: 15, weight: '700', color: PALETTE.textDim, align: 'left', letterSpacing: 4 });
  glowText(ctx, formatScore(state.score), 34, 66, { size: 46, weight: '800', color: PALETTE.gold, glow: PALETTE.goldDeep, blur: 18, align: 'left' });
  const combo = state.combo;
  if (combo.current > 0) {
    const remaining = Math.max(0, 1 - (state.time - combo.lastCapture) / SCORING.comboWindow);
    glowText(ctx, `COMBO ×${Math.round(combo.current * 10) / 10}`, 36, 104, { size: 22, weight: '800', color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 14, align: 'left' });
    const width = measureText(ctx, `COMBO ×${Math.round(combo.current * 10) / 10}`, { size: 22, weight: '800' });
    ctx.fillStyle = rgba(PALETTE.cyan, 0.25);
    ctx.fillRect(36, 118, width, 3);
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillRect(36, 118, width * remaining, 3);
    if (combo.chain > 1) glowText(ctx, `${combo.chain} loop chain`, 36 + width + 14, 104, { size: 15, weight: '600', color: PALETTE.textDim, align: 'left' });
  } else if (combo.best > 0) {
    glowText(ctx, `BEST COMBO ×${Math.round(combo.best * 10) / 10}`, 36, 102, { size: 15, weight: '700', color: PALETTE.textDim, align: 'left', letterSpacing: 1 });
  }
}

function drawWave(ctx, state) {
  const cx = FIELD.width / 2;
  const definition = waveDefinition(state.wave);
  glowText(ctx, `WAVE ${state.wave} / ${TOTAL_WAVES}`, cx, 34, { size: 28, weight: '800', color: PALETTE.text, glow: PALETTE.violet, blur: 16, letterSpacing: 2 });
  glowText(ctx, definition.name.toUpperCase(), cx, 62, { size: 14, weight: '700', color: PALETTE.textDim, letterSpacing: 3 });
  let alive = 0;
  let boss = null;
  for (const moth of state.moths) {
    if (!moth.alive) continue;
    alive += 1;
    if (moth.kind === 'eclipse') boss = moth;
  }
  const total = Math.max(1, state.waveTotal || 1);
  const left = Math.min(total, alive + state.spawnQueue.length + state.pending.length);
  const width = 300;
  roundRect(ctx, cx - width / 2, 76, width, 8, 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  roundRect(ctx, cx - width / 2, 76, width * (left / total), 8, 4);
  ctx.fillStyle = boss ? PALETTE.ember : PALETTE.violet;
  ctx.fill();
  glowText(ctx, `${left} moth${left === 1 ? '' : 's'} left`, cx, 97, { size: 13, weight: '600', color: PALETTE.textDim });
  if (boss) {
    glowText(ctx, 'ECLIPSE MOTH', cx, 120, { size: 15, weight: '800', color: PALETTE.ember, glow: PALETTE.ember, blur: 12, letterSpacing: 3 });
    const pip = 18;
    const start = cx - ((boss.maxVeils - 1) * (pip + 8)) / 2;
    for (let i = 0; i < boss.maxVeils; i += 1) {
      const x = start + i * (pip + 8);
      ctx.beginPath();
      ctx.arc(x, 143, pip / 2, 0, Math.PI * 2);
      if (i < boss.veils) {
        ctx.fillStyle = PALETTE.violet;
        ctx.fill();
      } else {
        ctx.strokeStyle = rgba(PALETTE.violet, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    glowText(ctx, `${boss.veils} veil${boss.veils === 1 ? '' : 's'} to strip`, cx, 165, { size: 13, weight: '600', color: PALETTE.textDim });
  }
}

function drawHearts(ctx, state) {
  const { weaver } = state;
  const size = 30;
  const gap = 38;
  const right = FIELD.width - 40;
  glowText(ctx, 'HEARTS', right, 30, { size: 15, weight: '700', color: PALETTE.textDim, align: 'right', letterSpacing: 4 });
  for (let i = 0; i < weaver.maxHearts; i += 1) {
    const x = right - size / 2 - (weaver.maxHearts - 1 - i) * gap;
    const y = 64;
    const filled = i < weaver.hearts;
    const hurt = weaver.invulnerable > 0 && i === weaver.hearts;
    heartPath(ctx, x, y, size);
    if (filled) {
      ctx.save();
      ctx.shadowColor = PALETTE.heart;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.heart;
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x - size * 0.18, y - size * 0.28, size * 0.12, size * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = hurt ? rgba(PALETTE.ember, 0.3 + 0.3 * Math.sin(state.time * 20)) : PALETTE.heartDim;
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.heart, 0.45);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawBadges(ctx, state) {
  const badges = upgradeBadges(state.upgrades);
  let x = 34;
  const y = FIELD.height - 46;
  glowText(ctx, 'THREADS HELD', 36, y - 20, { size: 12, weight: '700', color: PALETTE.textDim, align: 'left', letterSpacing: 3 });
  if (badges.length === 0) {
    glowText(ctx, 'none yet', 36, y + 6, { size: 14, weight: '600', color: rgba(PALETTE.textDim, 0.7), align: 'left' });
    return;
  }
  for (const badge of badges) {
    const label = badge.label.toUpperCase();
    const width = measureText(ctx, label, { size: 13, weight: '800', letterSpacing: 1 }) + 24;
    roundRect(ctx, x, y - 8, width, 28, 14);
    ctx.fillStyle = 'rgba(20, 10, 40, 0.85)';
    ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.gold, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    glowText(ctx, label, x + width / 2, y + 6, { size: 13, weight: '800', color: PALETTE.goldLight, letterSpacing: 1 });
    x += width + 10;
  }
}

function drawSlowTime(ctx, state) {
  const { slow } = state;
  const right = FIELD.width - 40;
  const y = FIELD.height - 64;
  if (!slow.owned) return;
  const width = 180;
  const ready = slow.active <= 0 && slow.charge >= 1;
  const label = slow.active > 0 ? 'STILL TIME' : ready ? 'STILL TIME  READY · SPACE' : 'STILL TIME  CHARGING';
  glowText(ctx, label, right, y - 12, { size: 13, weight: '800', color: ready ? PALETTE.cyan : PALETTE.textDim, glow: ready ? PALETTE.cyanDeep : null, blur: 10, align: 'right', letterSpacing: 2 });
  roundRect(ctx, right - width, y, width, 8, 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  const fill = slow.active > 0 ? slow.active / slow.duration : slow.charge;
  roundRect(ctx, right - width, y, width * fill, 8, 4);
  ctx.fillStyle = slow.active > 0 ? PALETTE.cyan : ready ? PALETTE.cyan : rgba(PALETTE.cyan, 0.5);
  ctx.fill();
}

function drawControls(ctx, state, ui) {
  const right = FIELD.width - 40;
  const y = FIELD.height - 28;
  const hint = 'WASD / ARROWS move  ·  HOLD LEFT MOUSE on a star, drag star to star  ·  P pause  ·  M mute';
  glowText(ctx, hint, right, y, { size: 13, weight: '600', color: rgba(PALETTE.textDim, 0.85), align: 'right', letterSpacing: 0.5 });
  if (ui.muted) glowText(ctx, 'MUTED', right, 100, { size: 13, weight: '800', color: PALETTE.ember, align: 'right', letterSpacing: 3 });
  if (state.slow.active > 0) {
    glowText(ctx, 'STILL TIME', FIELD.width / 2, FIELD.height - 60, { size: 26, weight: '800', color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 20, letterSpacing: 8, alpha: 0.6 + 0.4 * Math.sin(state.time * 6) });
  }
}

/** Draw the whole HUD over the field. */
export function drawHud(ctx, state, ui, { wave = true } = {}) {
  ctx.save();
  ctx.font = `600 16px ${FONT_UI}`;
  drawScore(ctx, state);
  if (wave) drawWave(ctx, state);
  drawHearts(ctx, state);
  drawBadges(ctx, state);
  drawSlowTime(ctx, state);
  drawControls(ctx, state, ui);
  ctx.restore();
}

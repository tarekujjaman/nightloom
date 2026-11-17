// The hotbar: LMB WEAVE · RMB PLUCK · SPACE STILL TIME · E STAR (its cost) · Q LANCE (its charges), with cooldown sweeps.
import { ABILITY, ARENA, LAYOUT, PALETTE as P, VIEW } from '../config.js';
import { drawGlyph, glowText, label, roundRect } from '../glow.js';
import { starCost } from '../starlight.js';
import { starAmount, sweep, tag } from './widgets.js';

const SLOTS = [
  ['LMB', 'WEAVE', P.gold, [['P', [[-0.9, 0.6], [0, -0.9], [0.9, 0.6]]], ['C', P.goldLight, P.goldLight], ['D', -0.9, 0.6, 0.22], ['D', 0, -0.9, 0.22], ['D', 0.9, 0.6, 0.22]]],
  ['RMB', 'PLUCK', P.magenta, [['L', -0.95, -0.75, -0.35, 0], ['L', -0.35, 0, -0.95, 0.75], ['W', 0.7], ['L', 0.1, -0.45, 0.75, -0.45], ['L', 0.1, 0, 0.9, 0], ['L', 0.1, 0.45, 0.75, 0.45]]],
  ['SPACE', 'STILL TIME', P.cyan, [['R', 0.9], ['L', 0, -0.55, 0, 0], ['L', 0, 0, 0.45, 0.28]]],
  ['E', 'STAR', P.gold, [['S', 0, 0, 1, 0.36, 0, P.gold], ['S', 0, 0, 0.42, 0.36, Math.PI / 4, '#ffffff']]],
  ['Q', 'LANCE', P.violet, [['W', 1.4], ['L', -0.9, 0.85, 0.65, -0.7], ['S', 0.7, -0.75, 0.45, 0.35, 0, P.goldLight], ['W', 0.5], ['R', 0.36, null, -0.25, 0.2]]],
];
export const HOTBAR = { slot: 68, gap: 6, height: 58, y: VIEW.height - LAYOUT.bottom + 7 };
HOTBAR.x = ARENA.width / 2 - (5 * HOTBAR.slot + 4 * HOTBAR.gap) / 2;

function slotState(state, index, title) {
  const { weave, slow, abilities: a } = state;
  if (title) return ['', true, 0, 0, index === 4 ? '3/3' : ''];
  if (index === 0) return [weave.active ? String(weave.chain.length) : '', true, 0, weave.flashes.length ? 1 : 0];
  if (index === 1) return [a.pluck > 0 ? a.pluck.toFixed(1) : '', a.pluck <= 0, a.pluck / ABILITY.pluckCooldown, a.flash.pluck];
  if (index === 2) return slow.active > 0 ? [slow.active.toFixed(1), true, slow.active / slow.duration, 1] : [slow.charge < 1 ? `${Math.round(slow.charge * 100)}%` : '', slow.charge >= 1, 1 - slow.charge, 0];
  if (index === 3) return ['', state.starlight.have >= starCost(state), 0, a.flash.star];
  return ['', a.charges > 0, a.charges < ABILITY.lanceCharges ? 1 - a.recharge / ABILITY.lanceRecharge : 0, a.flash.lance, `${a.charges}/${ABILITY.lanceCharges}`];
}

export function drawHotbar(ctx, state, title) {
  const { slot, gap, height, y } = HOTBAR;
  SLOTS.forEach(([key, name, color, glyph], i) => {
    const x = HOTBAR.x + i * (slot + gap);
    const [busy, ready, remaining, flash, corner] = slotState(state, i, title);
    const cx = x + slot / 2;
    const cy = y + 26;
    ctx.save();
    roundRect(ctx, x, y, slot, height, 10);
    ctx.fillStyle = ready ? 'rgba(22, 11, 50, 0.96)' : 'rgba(12, 7, 28, 0.96)';
    ctx.fill();
    ctx.strokeStyle = ready ? color : 'rgba(120, 100, 160, 0.5)';
    ctx.lineWidth = 2 + flash * 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * flash;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = ready ? 1 : 0.45;
    ctx.lineWidth = 2.2;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = ready ? color : P.textSoft;
    ctx.shadowBlur = 8;
    drawGlyph(ctx, glyph, 11);
    ctx.restore();
    sweep(ctx, cx, cy, 19, Math.min(1, remaining), color);
    if (busy) glowText(ctx, busy, cx, cy, { size: 13, color: P.text, outline: P.ink });
    tag(ctx, key, x + 4, y + 10, ready ? P.gold : P.textSoft, 8.5, 4);
    if (corner) label(ctx, corner, x + slot - 5, y + 10, 10, ready ? color : P.textSoft, 'right');
    if (i === 3) starAmount(ctx, starCost(state), x + slot - 34, y + 10, 10.5, ready ? P.gold : P.textSoft);
    label(ctx, name, cx, y + height - 10, 9.5, ready ? P.text : P.textSoft, 'center', 1);
  });
}

// The HUD's shared pieces: pills, tags, meters, segments, key caps, hearts, the starlight glyph and cooldown sweeps.
import { PALETTE as P } from '../config.js';
import { glowText, heartPath, label, measureText, rgba, roundRect, sparklePath } from '../glow.js';

export const SOFT = { size: 12, weight: '700', color: P.textSoft, align: 'left' };

export function pill(ctx, x, y, w, h, stroke = P.panelLine, fill = P.panel, lineWidth = 2) {
  roundRect(ctx, x, y, w, h, Math.min(14, h / 2));
  ctx.fillStyle = fill;
  ctx.fill();
  if (!stroke) return;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export const tagWidth = (ctx, text, size = 13, pad = 9) => measureText(ctx, text, { size, letterSpacing: 1.5 }) + pad * 2;

export function tag(ctx, text, x, y, color, size = 13, pad = 9) {
  const w = tagWidth(ctx, text, size, pad);
  roundRect(ctx, x, y - size * 0.8, w, size * 1.6, size * 0.5);
  ctx.fillStyle = color;
  ctx.fill();
  label(ctx, text, x + w / 2, y + 1, size, P.ink, 'center', 1.5);
  return w;
}

export const tagCentred = (ctx, text, cx, y, color, size = 13, pad = 9) => tag(ctx, text, cx - tagWidth(ctx, text, size, pad) / 2, y, color, size, pad);

export function meter(ctx, x, y, w, h, fraction, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fill();
  if (fraction <= 0) return;
  roundRect(ctx, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function segments(ctx, x, y, w, h, filled, total, color) {
  const sw = (w - 4 * (total - 1)) / total;
  for (let i = 0; i < total; i += 1) {
    roundRect(ctx, x + i * (sw + 4), y, sw, h, 3);
    ctx.fillStyle = i < filled ? color : 'rgba(255, 255, 255, 0.16)';
    ctx.fill();
  }
}

export function keyStrip(ctx, items, x, y, size = 14, color = P.gold) {
  let cx = x;
  for (const [key, what] of items) {
    cx += tag(ctx, key, cx, y, color, size - 1, 7) + 7;
    glowText(ctx, what, cx, y, { size, weight: '700', align: 'left' });
    cx += measureText(ctx, what, { size, weight: '700' }) + 16;
  }
  return cx - x;
}

export function heartRow(ctx, x, y, hearts, max, size, hurt = false, time = 0) {
  for (let i = 0; i < max; i += 1) {
    heartPath(ctx, x + size / 2 + i * (size + 6), y, size);
    if (i < hearts) {
      ctx.save();
      ctx.shadowColor = ctx.fillStyle = P.heart;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = hurt && i === hearts ? rgba(P.ember, 0.4 + 0.4 * Math.sin(time * 20)) : P.heartDim;
      ctx.fill();
      ctx.strokeStyle = rgba(P.heart, 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

export function starGlyph(ctx, x, y, r, color = P.gold) {
  ctx.save();
  ctx.shadowColor = ctx.fillStyle = color;
  ctx.shadowBlur = r;
  sparklePath(ctx, x, y, r, 0.38, 0);
  ctx.fill();
  ctx.restore();
}

export function starAmount(ctx, amount, x, y, size, color = P.gold) {
  starGlyph(ctx, x + size * 0.45, y, size * 0.45, color);
  label(ctx, String(amount), x + size, y, size, color, 'left');
}

export function sweep(ctx, cx, cy, r, remaining, color) {
  if (remaining <= 0) return;
  const end = -Math.PI / 2 + Math.PI * 2 * remaining;
  ctx.fillStyle = 'rgba(4, 2, 14, 0.62)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, end);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, end, Math.PI * 1.5);
  ctx.stroke();
}

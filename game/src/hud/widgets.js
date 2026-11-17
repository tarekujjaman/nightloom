// The HUD's shared pieces: pills, tags, meters, segments, key caps and hearts.
import { PALETTE } from '../config.js';
import { glowText, heartPath, measureText, rgba, roundRect } from '../glow.js';

export function pill(ctx, x, y, w, h, stroke = PALETTE.panelLine, fill = PALETTE.panel, lineWidth = 2) {
  roundRect(ctx, x, y, w, h, Math.min(14, h / 2));
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function tagWidth(ctx, text, size = 13, pad = 9) {
  return measureText(ctx, text, { size, letterSpacing: 1.5 }) + pad * 2;
}

/** A bright solid tag with dark text, its left edge at x and centre line at y; returns its width. */
export function tag(ctx, text, x, y, color, size = 13, pad = 9) {
  const w = tagWidth(ctx, text, size, pad);
  roundRect(ctx, x, y - size * 0.8, w, size * 1.6, size * 0.5);
  ctx.fillStyle = color;
  ctx.fill();
  glowText(ctx, text, x + w / 2, y + 1, { size, color: PALETTE.ink, letterSpacing: 1.5 });
  return w;
}

export function tagCentred(ctx, text, cx, y, color, size = 13, pad = 9) {
  tag(ctx, text, cx - tagWidth(ctx, text, size, pad) / 2, y, color, size, pad);
}

export function meter(ctx, x, y, w, h, fraction, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fill();
  if (fraction > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function segments(ctx, x, y, w, h, filled, total, color) {
  const sw = (w - 4 * (total - 1)) / total;
  for (let i = 0; i < total; i += 1) {
    roundRect(ctx, x + i * (sw + 4), y, sw, h, 3);
    ctx.fillStyle = i < filled ? color : 'rgba(255, 255, 255, 0.16)';
    ctx.fill();
  }
}

export function keyStrip(ctx, items, x, y, size = 14, color = PALETTE.gold) {
  let cx = x;
  for (const [key, what] of items) {
    cx += tag(ctx, key, cx, y, color, size - 1, 7) + 7;
    glowText(ctx, what, cx, y, { size, weight: '700', color: PALETTE.text, align: 'left' });
    cx += measureText(ctx, what, { size, weight: '700' }) + 16;
  }
  return cx - x;
}

export function heartRow(ctx, x, y, hearts, max, size, hurt = false, time = 0) {
  for (let i = 0; i < max; i += 1) {
    const hx = x + size / 2 + i * (size + 6);
    heartPath(ctx, hx, y, size);
    if (i < hearts) {
      ctx.save();
      ctx.shadowColor = PALETTE.heart;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.heart;
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(hx - size * 0.18, y - size * 0.28, size * 0.12, size * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = hurt && i === hearts ? rgba(PALETTE.ember, 0.4 + 0.4 * Math.sin(time * 20)) : PALETTE.heartDim;
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.heart, 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

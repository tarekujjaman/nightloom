// Drawing helpers: glow sprites, text, boxes, lines, discs, rings, polygons, sparkles, hearts and line icons.

export const FONT_TITLE = "'Palatino Linotype', Palatino, Georgia, serif";
export const FONT_UI = "'Segoe UI', 'Trebuchet MS', Arial, sans-serif";
const TAU = Math.PI * 2;

export const lighter = (ctx) => {
  ctx.globalCompositeOperation = 'lighter';
};
export const rgba = (hex, alpha) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;

export function makeGlowSprite(color, radius, core = 0.08) {
  const size = Math.ceil(radius * 2) + 2;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, radius);
  for (const [at, a] of [[0, 1], [core, 0.85], [0.35, 0.3], [0.7, 0.07], [1, 0]]) gradient.addColorStop(at, rgba(color, a));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

export function drawSprite(ctx, sprite, x, y, scale = 1, alpha = 1) {
  if (alpha <= 0) return;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * Math.min(1, alpha);
  ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
  ctx.globalAlpha = previous;
}

export function glowText(ctx, text, x, y, { font = FONT_UI, size = 20, weight = '800', color = '#ffffff', glow = null, blur = 12, align = 'center', alpha = 1, letterSpacing = 0, outline = null } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = blur;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = blur * 0.5;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

export const label = (ctx, text, x, y, size, color, align = 'center', letterSpacing = 0) => glowText(ctx, text, x, y, { size, color, align, letterSpacing });

export function measureText(ctx, text, { font = FONT_UI, size = 20, weight = '800', letterSpacing = 0 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

export function wrapText(ctx, text, maxWidth, fontSpec) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const candidate = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (measureText(ctx, candidate, fontSpec) > maxWidth && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] = candidate;
  }
  return lines;
}

export function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

export function disc(ctx, x, y, r, fill = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) ctx.fill();
  else ctx.stroke();
}

export function ring(ctx, x, y, r, color, width = 1.5, dash = [], offset = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.lineDashOffset = offset;
  disc(ctx, x, y, r, false);
  ctx.setLineDash([]);
}

export function poly(ctx, points, close = true) {
  ctx.beginPath();
  for (const p of points) ctx.lineTo(p.x, p.y);
  if (close) ctx.closePath();
}

export function sparklePath(ctx, x, y, radius, pinch = 0.28, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = rotation + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : radius * pinch;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
}

export function heartPath(ctx, x, y, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.9, y - s * 1.1, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}

// Icon ops in a unit box × s: R ring(r, dash, x, y) · D disc(x, y, r) · L line · S sparkle(x, y, r, pinch, rot, color) · P polygon(points, filled) · C colours(stroke, fill, shadow) · W width× · F flame · H heart · M crescent · G grid.
export function drawGlyph(ctx, ops, s) {
  for (const [op, ...a] of ops) {
    if (op === 'R') {
      ctx.setLineDash(a[1] || []);
      disc(ctx, s * (a[2] || 0), s * (a[3] || 0), s * a[0], false);
      ctx.setLineDash([]);
    } else if (op === 'D') disc(ctx, s * a[0], s * a[1], s * a[2]);
    else if (op === 'L') line(ctx, s * a[0], s * a[1], s * a[2], s * a[3]);
    else if (op === 'S') {
      ctx.fillStyle = a[5];
      sparklePath(ctx, s * a[0], s * a[1], s * a[2], a[3], a[4]);
      ctx.fill();
    } else if (op === 'P') {
      poly(ctx, a[0].map(([x, y]) => ({ x: s * x, y: s * y })));
      if (a[1]) ctx.fill();
      else ctx.stroke();
    } else if (op === 'C') {
      ctx.strokeStyle = a[0];
      if (a[1]) ctx.fillStyle = a[1];
      if (a[2]) ctx.shadowColor = a[2];
    } else if (op === 'W') ctx.lineWidth *= a[0];
    else if (op === 'F') {
      ctx.beginPath();
      ctx.moveTo(0, -s * a[0]);
      ctx.bezierCurveTo(s * a[1], -s * 0.2, s * a[2], s * 0.9, 0, s * 0.95);
      ctx.bezierCurveTo(-s * a[2], s * 0.9, -s * a[1], -s * 0.2, 0, -s * a[0]);
      ctx.fill();
    } else if (op === 'H') {
      heartPath(ctx, 0, 0, s * 1.8);
      ctx.fill();
    } else if (op === 'M') {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, TAU);
      ctx.arc(s * 0.35, -s * 0.2, s * 0.7, 0, TAU, true);
      ctx.fill();
    } else if (op === 'G') {
      for (let i = -2; i <= 2; i += 1) {
        line(ctx, -s * 0.9, i * s * 0.4, s * 0.9, i * s * 0.4);
        line(ctx, i * s * 0.4, -s * 0.9, i * s * 0.4, s * 0.9);
      }
    }
  }
}

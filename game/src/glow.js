// Drawing helpers for light: pre-rendered glow sprites (a radial gradient on a small canvas, cheap
// to stamp hundreds of times), glowing text, rounded boxes, word wrapping and the fonts.

export const FONT_TITLE = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, 'Times New Roman', serif";
export const FONT_UI = "'Segoe UI', 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif";

/** '#rrggbb' to 'rgba(r, g, b, alpha)'. */
export function rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A canvas holding a soft disc of `color` fading to nothing at `radius`. */
export function makeGlowSprite(color, radius, core = 0.08) {
  const size = Math.ceil(radius * 2) + 2;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, radius);
  gradient.addColorStop(0, rgba(color, 1));
  gradient.addColorStop(core, rgba(color, 0.85));
  gradient.addColorStop(0.35, rgba(color, 0.3));
  gradient.addColorStop(0.7, rgba(color, 0.07));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/** Stamp a sprite centred on (x, y). */
export function drawSprite(ctx, sprite, x, y, scale = 1, alpha = 1) {
  if (alpha <= 0) return;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * Math.min(1, alpha);
  ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
  ctx.globalAlpha = previous;
}

/** Text with a coloured halo; `glow` is the halo colour, `blur` its spread. */
export function glowText(ctx, text, x, y, { font = FONT_UI, size = 20, weight = '600', color = '#ffffff', glow = null, blur = 12, align = 'center', baseline = 'middle', alpha = 1, letterSpacing = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
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

/** Width of `text` at the given font, for layout. */
export function measureText(ctx, text, { font = FONT_UI, size = 20, weight = '600', letterSpacing = 0 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

/** Break `text` into lines no wider than `maxWidth`. */
export function wrapText(ctx, text, maxWidth, fontSpec) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(ctx, candidate, fontSpec) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A rounded rectangle path (not filled or stroked). */
export function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** A four-pointed sparkle path centred on (x, y). */
export function sparklePath(ctx, x, y, radius, pinch = 0.28, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = rotation + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : radius * pinch;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A heart path centred on (x, y), `size` wide. */
export function heartPath(ctx, x, y, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.9, y - s * 1.1, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}

// Painting helpers for tools/paint.mjs: colours, soft shapes, value noise and blurred layers. Everything is
// deterministic: the only randomness is the seeded generator handed in, and no text is ever drawn.
import { createRandom } from '../../game/src/random.js';

export const TAU = Math.PI * 2;
export { createRandom };

const channels = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
export const rgba = (hex, alpha = 1) => `rgba(${channels(hex).join(', ')}, ${alpha})`;
const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
export const toHex = (r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** `t` of the way from colour a to colour b. */
export function mix(a, b, t) {
  const ca = channels(a);
  const cb = channels(b);
  return toHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}
export const shade = (hex, k) => mix(hex, k < 0 ? '#000000' : '#ffffff', Math.abs(k));

export function canvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export function ellipsePath(ctx, x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, TAU);
}

export function fillEllipse(ctx, x, y, rx, ry, style, rotation = 0) {
  ellipsePath(ctx, x, y, rx, ry, rotation);
  ctx.fillStyle = style;
  ctx.fill();
}

/** A radial gradient disc: `stops` are [at, cssColour] pairs. */
export function softDisc(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A soft glow of one colour: alpha `a` at the centre falling to 0 at r. */
export const glow = (ctx, x, y, r, hex, a, core = 0.15) => softDisc(ctx, x, y, r, [[0, rgba(hex, a)], [core, rgba(hex, a * 0.7)], [0.6, rgba(hex, a * 0.18)], [1, rgba(hex, 0)]]);

/** A soft elliptical glow (for pools of light on the ground). */
export function softEllipse(ctx, x, y, rx, ry, hex, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  softDisc(ctx, 0, 0, rx, [[0, rgba(hex, a)], [0.5, rgba(hex, a * 0.4)], [1, rgba(hex, 0)]]);
  ctx.restore();
}

export function polygon(ctx, points, close = true) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

export function fillPoly(ctx, points, style) {
  polygon(ctx, points);
  ctx.fillStyle = style;
  ctx.fill();
}

export function strokePoly(ctx, points, style, width, close = false) {
  polygon(ctx, points, close);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function lineTo(ctx, ax, ay, bx, by, style, width) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A smooth curve through `points` (Catmull-Rom as beziers), as a path. */
export function curvePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

/** A 4-point star sparkle path. */
export function sparklePath(ctx, x, y, r, pinch = 0.3, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = rotation + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * pinch;
    ctx.lineTo(x + Math.cos(angle) * rr, y + Math.sin(angle) * rr);
  }
  ctx.closePath();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Value noise with fractal sums, seeded. */
export function makeNoise(random) {
  const size = 256;
  const table = Float32Array.from({ length: size * size }, () => random.next());
  const value = (ix, iy) => table[((iy & 255) << 8) | (ix & 255)];
  function noise2(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = value(ix, iy) + (value(ix + 1, iy) - value(ix, iy)) * sx;
    const b = value(ix, iy + 1) + (value(ix + 1, iy + 1) - value(ix, iy + 1)) * sx;
    return a + (b - a) * sy;
  }
  function fbm(x, y, octaves = 4, gain = 0.5, lacunarity = 2.03) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let i = 0; i < octaves; i += 1) {
      sum += amp * noise2(x, y);
      norm += amp;
      x = x * lacunarity + 31.7;
      y = y * lacunarity + 17.3;
      amp *= gain;
    }
    return sum / norm;
  }
  return { noise2, fbm };
}

/** Draw `source` onto ctx through a blur filter, optionally with a composite and alpha. */
export function blurOnto(ctx, source, px, { alpha = 1, composite = 'source-over', x = 0, y = 0 } = {}) {
  ctx.save();
  ctx.filter = `blur(${px}px)`;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = composite;
  ctx.drawImage(source, x, y);
  ctx.restore();
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

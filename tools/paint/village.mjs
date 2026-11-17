// The Weavers' Hill itself: one village layout shared by every realm (so the window-light layers line up), and the
// painters for its cottages, well, drying racks, trees and ruins. Each painter draws the thing into the backdrop
// and its lit parts (window panes, lantern glass, glowing cloth) into the lights layer the game flickers and dims.
import { TAU, clamp, curvePath, fillEllipse, fillPoly, glow, lerp, lineTo, mix, polygon, rgba, roundRectPath, shade, softEllipse, sparklePath } from './brush.mjs';

export const FIELD = { width: 968, height: 634 };
export const LOOM = { x: 484, y: 311 };
export const DAIS = { x: 484, y: 461, rx: 118, ry: 28 };
export const HORIZON = 168;
/** The hill's crest against the valley, left to right. */
export const CREST = [[-30, 358], [150, 296], [320, 236], [484, 224], [648, 236], [818, 296], [998, 358]];
/** The tower's box on screen; nothing of the village is placed under it. */
export const TOWER = { x0: 348, x1: 620, y0: 120, y1: 500 };

// Cottages as [base centre x, base y, front width, wall height, side the side wall shows (+1 right, -1 left)].
export const COTTAGES = [
  { x: 292, y: 296, w: 30, h: 16, f: 1 }, { x: 230, y: 328, w: 34, h: 18, f: 1 }, { x: 680, y: 290, w: 30, h: 16, f: -1 }, { x: 746, y: 324, w: 36, h: 18, f: -1 },
  { x: 144, y: 398, w: 44, h: 24, f: 1 }, { x: 828, y: 406, w: 46, h: 24, f: -1 }, { x: 236, y: 458, w: 48, h: 26, f: 1 }, { x: 746, y: 468, w: 50, h: 26, f: -1 },
  { x: 310, y: 542, w: 58, h: 32, f: 1 }, { x: 664, y: 554, w: 60, h: 32, f: -1 }, { x: 116, y: 568, w: 56, h: 30, f: 1 }, { x: 868, y: 580, w: 58, h: 30, f: -1 },
];
export const WELL = { x: 584, y: 526 };
export const RACKS = [{ x: 298, y: 476, w: 52 }, { x: 690, y: 430, w: 46 }, { x: 204, y: 514, w: 50 }];
export const PATHS = [
  [[430, 668], [446, 598], [462, 542], [476, 504], [484, 488]],
  [[-20, 426], [110, 434], [240, 448], [368, 462]],
  [[990, 446], [860, 460], [730, 474], [600, 464]],
  [[232, 338], [296, 384], [356, 438], [396, 474]],
  [[744, 334], [692, 378], [632, 422], [580, 454]],
  [[586, 532], [562, 504], [540, 484]],
  [[318, 550], [344, 522], [382, 494]],
  [[656, 562], [630, 532], [602, 498]],
];

const crestSamples = [];
export function crestY(x) {
  if (crestSamples.length === 0) {
    const c = document.createElement('canvas').getContext('2d');
    curvePath(c, CREST);
    // Sample the same spline the fill uses: evaluate Catmull-Rom beziers numerically.
    for (let i = 0; i < CREST.length - 1; i += 1) {
      const p0 = CREST[Math.max(0, i - 1)];
      const p1 = CREST[i];
      const p2 = CREST[i + 1];
      const p3 = CREST[Math.min(CREST.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (let k = 0; k < 40; k += 1) {
        const t = k / 40;
        const u = 1 - t;
        crestSamples.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
      }
    }
  }
  let best = crestSamples[0];
  for (const p of crestSamples) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
  return best[1];
}

export function hillPath(ctx) {
  curvePath(ctx, CREST);
  ctx.lineTo(1100, 720);
  ctx.lineTo(-100, 720);
  ctx.closePath();
}

/** How large things look at screen y: small at the crest, big at the foot. */
export const perspective = (y) => 0.55 + (clamp(y, 224, 634) - 224) / 410;
export const insideHill = (x, y) => y > crestY(x) + 2;
const inTower = (x, y, pad = 0) => x > TOWER.x0 - pad && x < TOWER.x1 + pad && y > TOWER.y0 - pad && y < TOWER.y1 + pad;

function pathDistance(x, y) {
  let best = Infinity;
  for (const path of PATHS) {
    for (let i = 0; i + 1 < path.length; i += 1) {
      const [ax, ay] = path[i];
      const [bx, by] = path[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
  }
  return best;
}

/** Tree spots: a sparse line along the crest, groves on the slopes (noise-clumped), none under the tower or on a path. */
export function treeSpots(random, noise) {
  const spots = [];
  const clear = (x, y, s) => !inTower(x, y, 10) && pathDistance(x, y) > 9 + 8 * s && COTTAGES.every((c) => Math.hypot(c.x - x, c.y - y) > c.w * 1.05 + 8 * s) && RACKS.every((r) => Math.hypot(r.x - x, r.y - y) > r.w * 0.8) && Math.hypot(WELL.x - x, WELL.y - y) > 34 && Math.hypot(DAIS.x - x, DAIS.y - y) > 150;
  for (let x = -10; x < FIELD.width + 10; x += 18 + random.range(0, 14)) {
    const y = crestY(x) + random.range(5, 20);
    const s = perspective(y) * random.range(0.7, 1.1);
    if (clear(x, y, s) && random.chance(0.8)) spots.push({ x, y, s, v: random.next(), crest: true });
  }
  for (let tries = 0; tries < 2600 && spots.length < 150; tries += 1) {
    const x = random.range(-10, FIELD.width + 10);
    const y = random.range(226, 650);
    if (!insideHill(x, y)) continue;
    const density = noise.fbm(x * 0.011, y * 0.013, 3);
    const edge = Math.min(x + 20, FIELD.width + 20 - x) / 220;
    if (density < 0.47 + 0.25 * clamp(edge, 0, 1) - 0.1 * clamp((y - 540) / 90, 0, 1)) continue;
    const s = perspective(y) * random.range(0.75, 1.2);
    if (!clear(x, y, s) || spots.some((p) => Math.hypot(p.x - x, p.y - y) < 10 + 11 * s)) continue;
    spots.push({ x, y, s, v: random.next(), crest: false });
  }
  return spots;
}

/** Near silhouettes along the bottom edge and the lower corners: the dark woods the moths come out of. */
export function foregroundSpots(random) {
  const spots = [];
  for (let x = -20; x < FIELD.width + 30; x += 48 + random.range(0, 40)) spots.push({ x, y: 624 + random.range(10, 56), s: random.range(2, 3.2), v: random.next() });
  for (const side of [0, 1]) {
    for (let i = 0; i < 4; i += 1) {
      const y = random.range(430, 600);
      spots.push({ x: side ? FIELD.width + 6 - random.range(0, 40) * (y - 400) / 200 : -6 + random.range(0, 40) * (y - 400) / 200, y, s: random.range(1.4, 2.4), v: random.next() });
    }
  }
  return spots.sort((a, b) => a.y - b.y);
}

/** How brightly the Loom lights a spot (1 at its foot, 0 far away). */
export const loomLight = (x, y) => clamp(1.15 - Math.hypot(x - DAIS.x, (y - DAIS.y) * 1.3) / 560, 0, 1);

export function paintSmoke(ctx, x, y, s, random, color = '#cfc6dc') {
  let drift = 0;
  for (let k = 0; k < 5; k += 1) {
    drift += random.range(0.6, 2.2) * s;
    softEllipse(ctx, x + drift, y - k * 5.2 * s, (2.6 + k * 1.5) * s, (2 + k * 1.1) * s, color, 0.2 - k * 0.032);
  }
}

export function cottageRidge(c) {
  const side = c.w * 0.46;
  const rise = side * 0.42;
  return { x: c.x + c.f * side * 0.5, y: c.y - rise * 0.5 - c.h - c.h * 1.05, left: c.x - c.w / 2 + c.f * side * 0.5, right: c.x + c.w / 2 + c.f * side * 0.5 };
}

function windowLight(lights, x, y, w, h, S, strength = 1) {
  lights.fillStyle = rgba(S.window, 0.95 * strength);
  lights.fillRect(x, y, w, h);
  lights.fillStyle = 'rgba(20, 8, 10, 0.55)';
  lights.fillRect(x + w / 2 - 0.5, y, 1, h);
  lights.fillRect(x, y + h / 2 - 0.5, w, 1);
  glow(lights, x + w / 2, y + h / 2, Math.max(w, h) * 2.6, S.windowGlow, 0.36 * strength, 0.1);
  softEllipse(lights, x + w / 2, y + h * 2.1, w * 2.4, h * 1, S.windowGlow, 0.16 * strength);
}

export function paintCottage(ctx, lights, c, S, random, noise) {
  const { x, y, w, h, f } = c;
  const side = w * 0.46;
  const rise = side * 0.42;
  const roofH = h * 1.05;
  const o = w * 0.09;
  const lit = loomLight(x, y);
  const wall = mix(S.wall, S.wallLit, lit * 0.8);
  const roof = mix(S.roof, S.roofLit, lit * 0.5);
  const xL = x - w / 2;
  const xR = x + w / 2;
  const x0 = f === 1 ? xR : xL;
  const x1 = x0 + f * side;
  const ridge = cottageRidge(c);
  softEllipse(ctx, x + f * side * 0.25, y + 2, w * 0.85, h * 0.36, '#000000', 0.42);
  // side wall (faces the Loom, so a touch lighter), then the front wall
  fillPoly(ctx, [[x0, y], [x1, y - rise], [x1, y - rise - h], [x0, y - h]], shade(wall, 0.08));
  const front = ctx.createLinearGradient(0, y - h, 0, y);
  front.addColorStop(0, shade(wall, -0.05));
  front.addColorStop(1, shade(wall, -0.4));
  ctx.fillStyle = front;
  ctx.fillRect(xL, y - h, w, h);
  // timber lines on the front, a dark plinth
  ctx.fillStyle = rgba(shade(wall, -0.55), 0.6);
  ctx.fillRect(xL, y - 2, w, 2);
  if (w >= 40) for (const k of [0.33, 0.66]) ctx.fillRect(xL + w * k, y - h, 1, h);
  // gable on the side wall
  fillPoly(ctx, [[x0, y - h], [x1, y - rise - h], [ridge.x + f * w / 2, ridge.y]], shade(wall, -0.12));
  // near roof slope and its shingles
  const eaveL = xL - o;
  const eaveR = xR + o;
  const rL = ridge.left - o;
  const rR = ridge.right + o;
  const slope = ctx.createLinearGradient(0, ridge.y, 0, y - h);
  slope.addColorStop(0, shade(roof, 0.12));
  slope.addColorStop(1, shade(roof, -0.3));
  fillPoly(ctx, [[eaveL, y - h], [eaveR, y - h], [rR, ridge.y], [rL, ridge.y]], slope);
  for (let k = 1; k <= 5; k += 1) {
    const t = k / 6;
    lineTo(ctx, lerp(eaveL, rL, t), lerp(y - h, ridge.y, t), lerp(eaveR, rR, t), lerp(y - h, ridge.y, t), rgba(shade(roof, -0.35), 0.5), 1);
  }
  lineTo(ctx, rL, ridge.y, rR, ridge.y, shade(roof, 0.35), 1.4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(xL, y - h, w, 2.5);
  if (S.ruined) {
    // a broken roof: notches torn out of the ridge, cracks down the walls
    for (let k = 0; k < 3; k += 1) {
      const nx = lerp(rL + 4, rR - 4, random.next());
      const nw = w * random.range(0.08, 0.2);
      fillPoly(ctx, [[nx - nw, ridge.y - 1], [nx + nw, ridge.y - 1], [nx + nw * 0.3, ridge.y + roofH * random.range(0.3, 0.6)], [nx - nw * 0.4, ridge.y + roofH * 0.3]], '#0c0618');
    }
    for (let k = 0; k < 2; k += 1) {
      const cx = xL + w * random.range(0.15, 0.85);
      const pts = [[cx, y]];
      for (let j = 1; j <= 4; j += 1) pts.push([cx + random.range(-3, 3), y - (h * j) / 4.5]);
      polygon(ctx, pts, false);
      ctx.strokeStyle = 'rgba(8, 2, 20, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      polygon(lights, pts, false);
      lights.strokeStyle = rgba(S.window, 0.75);
      lights.lineWidth = 1;
      lights.stroke();
      glow(lights, cx, y - h / 2, h * 0.9, S.windowGlow, 0.25);
    }
  }
  // chimney and smoke
  const cw = Math.max(3, w * 0.12);
  const cxm = lerp(ridge.left, ridge.right, f === 1 ? 0.72 : 0.28);
  const ch = roofH * 0.6;
  ctx.fillStyle = shade(wall, -0.35);
  ctx.fillRect(cxm - cw / 2, ridge.y - ch, cw, ch + roofH * 0.3);
  ctx.fillStyle = shade(wall, -0.15);
  ctx.fillRect(cxm - cw / 2 - 1, ridge.y - ch - 2, cw + 2, 2.5);
  if (!S.ruined || random.chance(0.4)) paintSmoke(ctx, cxm, ridge.y - ch - 3, w / 44, random, S.smoke);
  // door toward the Loom, windows along the front, one on the side wall of a bigger house
  const dw = w * 0.17;
  const dh = h * 0.6;
  const dx = f === 1 ? xR - w * 0.14 - dw : xL + w * 0.14;
  roundRectPath(ctx, dx, y - dh, dw, dh + 1, dw * 0.45);
  ctx.fillStyle = shade(wall, -0.7);
  ctx.fill();
  ctx.strokeStyle = rgba(S.wallLit, 0.35);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const ww = w * 0.15;
  const wh = h * 0.42;
  const wy = y - h * 0.74;
  const spots = w >= 40 ? [xL + w * 0.16, xL + w * 0.44] : [xL + w * 0.3];
  const windows = f === 1 ? spots : spots.map((wx) => xR - (wx - xL) - ww);
  for (const wx of windows) {
    ctx.fillStyle = shade(wall, -0.6);
    ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    ctx.fillStyle = mix(S.window, '#1a0c14', 0.65);
    ctx.fillRect(wx, wy, ww, wh);
    windowLight(lights, wx, wy, ww, wh, S);
  }
  if (w >= 44) {
    const sx = x0 + f * side * 0.45;
    const sy = y - rise * 0.45 - h * 0.74;
    const sw = side * 0.26;
    const skew = rise * 0.26;
    fillPoly(ctx, [[sx, sy], [sx + f * sw, sy - skew], [sx + f * sw, sy - skew + wh], [sx, sy + wh]], mix(S.window, '#1a0c14', 0.65));
    fillPoly(lights, [[sx, sy], [sx + f * sw, sy - skew], [sx + f * sw, sy - skew + wh], [sx, sy + wh]], rgba(S.window, 0.9));
    glow(lights, sx + f * sw / 2, sy + wh / 2, wh * 2.6, S.windowGlow, 0.3, 0.1);
  }
  // snow: a cap along the ridge, a rim at the eave, a drift at the foot
  if (S.snow) {
    const pts = [[rL, ridge.y], [rR, ridge.y]];
    for (let k = 5; k >= 0; k -= 1) {
      const t = k / 5;
      pts.push([lerp(rL, rR, t) + lerp(0, 0, t), ridge.y + roofH * (0.28 + 0.22 * noise.noise2(x * 0.3 + k * 1.7, y * 0.2))]);
    }
    fillPoly(ctx, pts, rgba(S.snowColor, 0.92));
    lineTo(ctx, eaveL, y - h + 1, eaveR, y - h + 1, rgba(S.snowColor, 0.85), 2.4);
    ctx.fillStyle = S.snowColor;
    ctx.fillRect(cxm - cw / 2 - 1, ridge.y - ch - 3.5, cw + 2, 2);
    softEllipse(ctx, x, y + 1, w * 0.7, h * 0.22, S.snowColor, 0.45);
  }
  // the warm spill from the door onto the path
  softEllipse(lights, dx + dw / 2, y + 3, dw * 2.4, dh * 0.5, S.windowGlow, 0.26);
  lights.fillStyle = rgba(S.window, 0.55);
  lights.fillRect(dx + dw * 0.25, y - dh * 0.55, dw * 0.5, dh * 0.5);
}

export function paintRack(ctx, lights, r, S, random) {
  const s = perspective(r.y);
  const { x, y, w } = r;
  const ph = 24 * s;
  softEllipse(ctx, x, y + 1, w * 0.6, 4 * s, '#000000', 0.3);
  const strips = 4 + (random.next() < 0.5 ? 1 : 0);
  const gap = w / (strips + 1);
  for (let i = 0; i < strips; i += 1) {
    const sx = x - w / 2 + gap * (i + 1);
    const sw = gap * 0.62;
    const sh = ph * random.range(0.58, 0.8);
    const color = S.cloth[i % S.cloth.length];
    const sway = random.range(-1.5, 1.5) * s;
    const quad = [[sx - sw / 2, y - ph + 1], [sx + sw / 2, y - ph + 1], [sx + sw / 2 + sway, y - ph + sh], [sx - sw / 2 + sway * 1.2, y - ph + sh]];
    const g = ctx.createLinearGradient(0, y - ph, 0, y - ph + sh);
    g.addColorStop(0, shade(color, 0.2));
    g.addColorStop(1, shade(color, -0.35));
    fillPoly(ctx, quad, g);
    fillPoly(lights, quad, rgba(color, 0.4));
    glow(lights, sx, y - ph + sh / 2, sh * 1.2, color, 0.22, 0.1);
  }
  for (const px of [x - w / 2, x + w / 2]) lineTo(ctx, px, y, px, y - ph - 2, S.wood, 2.6 * s);
  lineTo(ctx, x - w / 2 - 2, y - ph, x + w / 2 + 2, y - ph, shade(S.wood, 0.15), 1.8 * s);
}

export function paintWell(ctx, lights, p, S) {
  const s = perspective(p.y);
  const { x, y } = p;
  const rx = 13 * s;
  const ry = 6.5 * s;
  const wallH = 6 * s;
  softEllipse(ctx, x + 3 * s, y + 2, rx * 1.4, ry * 1.1, '#000000', 0.4);
  fillEllipse(ctx, x, y, rx, ry, shade(S.stone, -0.4));
  ctx.fillStyle = shade(S.stone, -0.25);
  ctx.fillRect(x - rx, y - wallH, rx * 2, wallH);
  fillEllipse(ctx, x, y - wallH, rx, ry, shade(S.stone, 0.1));
  fillEllipse(ctx, x, y - wallH, rx * 0.62, ry * 0.6, '#06030c');
  for (let k = 0; k < 7; k += 1) {
    const a = Math.PI * (0.1 + (0.8 * k) / 6);
    lineTo(ctx, x + Math.cos(a) * rx, y - wallH + Math.sin(a) * ry, x + Math.cos(a) * rx, y + Math.sin(a) * ry, rgba('#000000', 0.35), 1);
  }
  const top = y - 28 * s;
  for (const px of [x - rx * 0.8, x + rx * 0.8]) lineTo(ctx, px, y - wallH, px, top + 4 * s, S.wood, 2.2 * s);
  lineTo(ctx, x - rx * 0.8, y - 18 * s, x + rx * 0.8, y - 18 * s, shade(S.wood, 0.2), 1.8 * s);
  lineTo(ctx, x, y - 18 * s, x, y - 10 * s, '#d8c8a0', 0.8);
  fillPoly(ctx, [[x - 2.5 * s, y - 10 * s], [x + 2.5 * s, y - 10 * s], [x + 2 * s, y - 6 * s], [x - 2 * s, y - 6 * s]], shade(S.wood, -0.2));
  fillPoly(ctx, [[x - rx * 1.25, top + 6 * s], [x, top - 2 * s], [x + rx * 1.25, top + 6 * s]], shade(S.roof, -0.1));
  lineTo(ctx, x - rx * 1.25, top + 6 * s, x, top - 2 * s, shade(S.roof, 0.3), 1.2);
  lineTo(ctx, x, top - 2 * s, x + rx * 1.25, top + 6 * s, shade(S.roof, 0.3), 1.2);
  if (S.snow) fillPoly(ctx, [[x - rx * 1.1, top + 5.5 * s], [x, top - 1.5 * s], [x + rx * 1.1, top + 5.5 * s], [x + rx * 0.9, top + 7 * s], [x, top + 1 * s], [x - rx * 0.9, top + 7 * s]], rgba(S.snowColor, 0.85));
  // a lantern hung under the eave
  const lx = x + rx * 0.95;
  const ly = y - 20 * s;
  lineTo(ctx, lx, top + 5 * s, lx, ly - 4 * s, '#2a2030', 1);
  roundRectPath(ctx, lx - 2.2 * s, ly - 4 * s, 4.4 * s, 6 * s, 1.2 * s);
  ctx.fillStyle = '#ffb860';
  ctx.fill();
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  ctx.stroke();
  roundRectPath(lights, lx - 2 * s, ly - 3.6 * s, 4 * s, 5.2 * s, 1 * s);
  lights.fillStyle = rgba('#ffe2a8', 0.95);
  lights.fill();
  glow(lights, lx, ly - s, 16 * s, '#ffb860', 0.55, 0.12);
  softEllipse(lights, lx, y + 2, rx * 1.6, ry * 1.2, '#ffb860', 0.2);
}

function pine(ctx, x, y, s, S, v) {
  softEllipse(ctx, x, y + 1, 7 * s, 2.6 * s, '#000000', 0.3);
  lineTo(ctx, x, y, x, y - 9 * s, S.trunk, 2.4 * s);
  const tiers = s < 0.7 ? 4 : 5;
  for (let i = 0; i < tiers; i += 1) {
    const cy = y - s * (6 + i * 8.2);
    const hw = s * (13.5 - i * 2.3) * (0.85 + v * 0.3);
    const apex = cy - s * 7.5;
    const pts = [[x - hw, cy + s * 3.5]];
    for (let k = 1; k < 4; k += 1) pts.push([x - hw + (2 * hw * k) / 4, cy + s * (k % 2 ? 1.2 : 3.8)]);
    pts.push([x + hw, cy + s * 3.5], [x, apex]);
    const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    g.addColorStop(0, shade(S.leaf, 0.18));
    g.addColorStop(0.5, S.leaf);
    g.addColorStop(1, shade(S.leaf, -0.4));
    fillPoly(ctx, pts, g);
    if (S.snow) fillPoly(ctx, [[x - hw * 0.5, cy - s * 0.5], [x, apex + s], [x + hw * 0.5, cy - s * 0.5], [x, cy + s * 0.5]], rgba(S.snowColor, 0.72));
  }
}

function autumn(ctx, x, y, s, S, v, random) {
  softEllipse(ctx, x, y + 1, 8 * s, 3 * s, '#000000', 0.3);
  fillPoly(ctx, [[x - 1.8 * s, y], [x + 1.8 * s, y], [x + 1 * s, y - 12 * s], [x - 1 * s, y - 12 * s]], S.trunk);
  lineTo(ctx, x, y - 10 * s, x + 4 * s, y - 15 * s, S.trunk, 1.2 * s);
  lineTo(ctx, x, y - 9 * s, x - 4 * s, y - 14 * s, S.trunk, 1.2 * s);
  const discs = [];
  for (let i = 0; i < 8; i += 1) {
    const a = random.angle();
    const d = Math.sqrt(random.next());
    discs.push({ cx: x + Math.cos(a) * d * 7 * s, cy: y - 16 * s + Math.sin(a) * d * 5.5 * s, r: s * random.range(4.2, 7.2), color: S.leaves[Math.floor(random.next() * S.leaves.length)] });
  }
  discs.sort((a, b) => b.r - a.r);
  for (const d of discs) {
    const g = ctx.createRadialGradient(d.cx - d.r * 0.35, d.cy - d.r * 0.4, d.r * 0.1, d.cx, d.cy, d.r);
    g.addColorStop(0, shade(d.color, 0.28));
    g.addColorStop(0.55, d.color);
    g.addColorStop(1, shade(d.color, -0.45));
    fillEllipse(ctx, d.cx, d.cy, d.r, d.r * 0.92, g);
  }
  for (let i = 0; i < 3; i += 1) fillEllipse(ctx, x + random.range(-9, 9) * s, y + random.range(-1, 2) * s, 1.1 * s, 0.7 * s, S.leaves[i % S.leaves.length]);
}

function branches(ctx, x, y, angle, len, width, depth, colorAt, random, spread, tips) {
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  lineTo(ctx, x, y, ex, ey, colorAt(depth), width);
  if (depth === 0) {
    if (tips) fillEllipse(ctx, ex, ey, width * 0.9, width * 0.9, tips);
    return;
  }
  const n = depth >= 3 ? 3 : 2;
  for (let i = 0; i < n; i += 1) {
    const centre = i === 1 && n === 3;
    branches(ctx, ex, ey, angle + random.range(-spread, spread) * (centre ? 0.3 : 1) + (n === 2 ? (i ? 1 : -1) * spread * 0.5 : 0), len * random.range(0.58, 0.74), width * 0.66, depth - 1, colorAt, random, spread, tips);
  }
}

function frozen(ctx, x, y, s, S, random) {
  softEllipse(ctx, x, y + 1, 7 * s, 2.6 * s, '#000000', 0.28);
  glow(ctx, x, y - 15 * s, 16 * s, S.ice, 0.16, 0.1);
  ctx.lineCap = 'round';
  branches(ctx, x, y, -Math.PI / 2 + random.range(-0.12, 0.12), 10 * s, 2.6 * s, 4, (d) => mix(S.ice, S.trunk, d / 4.5), random, 0.62, rgba('#ffffff', 0.85));
}

function dead(ctx, x, y, s, S, random) {
  softEllipse(ctx, x, y + 1, 6 * s, 2.4 * s, '#000000', 0.3);
  ctx.lineCap = 'round';
  branches(ctx, x, y, -Math.PI / 2 + random.range(-0.25, 0.25), 11 * s, 2.4 * s, 3, (d) => mix(S.violet, S.trunk, 0.3 + d / 5), random, 0.85, null);
}

export function paintRuin(ctx, lights, r, S, random) {
  const { x, y, s, v } = r;
  softEllipse(ctx, x, y + 1, 9 * s, 3 * s, '#000000', 0.35);
  const stone = ctx.createLinearGradient(x - 6 * s, 0, x + 6 * s, 0);
  stone.addColorStop(0, shade(S.stone, 0.2));
  stone.addColorStop(1, shade(S.stone, -0.45));
  if (v < 0.45) {
    const tilt = random.range(-0.1, 0.1);
    const height = s * random.range(14, 26);
    const w = 4.6 * s;
    const top = [x + Math.sin(tilt) * height, y - height];
    fillPoly(ctx, [[x - w, y], [x + w, y], [top[0] + w * 0.9, top[1] + 2 * s], [top[0] + w * 0.2, top[1] - s], [top[0] - w * 0.5, top[1] + s], [top[0] - w * 0.9, top[1] + 2.5 * s]], stone);
    fillPoly(ctx, [[x - w * 1.3, y], [x + w * 1.3, y], [x + w * 1.2, y - 2.5 * s], [x - w * 1.2, y - 2.5 * s]], shade(S.stone, -0.1));
    for (let k = 1; k < 4; k += 1) lineTo(ctx, x - w * 0.9 + k * w * 0.45, y - 2 * s, top[0] - w * 0.9 + k * w * 0.45, top[1] + 3 * s, rgba('#000000', 0.25), 0.8);
  } else if (v < 0.75) {
    const rad = s * random.range(7, 11);
    ctx.beginPath();
    ctx.arc(x, y - rad * 0.9, rad, Math.PI, Math.PI * 1.9);
    ctx.strokeStyle = stone;
    ctx.lineWidth = 3.4 * s;
    ctx.stroke();
    fillPoly(ctx, [[x - rad - 1.7 * s, y], [x - rad + 1.7 * s, y], [x - rad + 1.7 * s, y - rad * 0.9], [x - rad - 1.7 * s, y - rad * 0.9]], stone);
    fillPoly(ctx, [[x + rad - 1.7 * s, y], [x + rad + 1.7 * s, y], [x + rad + 1.7 * s, y - rad * 0.3], [x + rad - 1.7 * s, y - rad * 0.45]], stone);
  } else {
    const w = s * random.range(10, 16);
    const h = s * random.range(6, 11);
    fillPoly(ctx, [[x - w, y], [x + w, y], [x + w, y - h * 0.5], [x + w * 0.5, y - h * 0.8], [x + w * 0.1, y - h], [x - w * 0.4, y - h * 0.7], [x - w, y - h * 0.9]], stone);
    for (let k = 0; k < 3; k += 1) lineTo(ctx, x - w, y - (h * (k + 1)) / 4, x + w, y - (h * (k + 1)) / 4 - s, rgba('#000000', 0.25), 0.8);
  }
  // gold light bleeding from the cracks at its foot
  for (let k = 0; k < 2; k += 1) {
    const cx = x + random.range(-5, 5) * s;
    polygon(lights, [[cx, y], [cx + random.range(-2, 2) * s, y - 4 * s], [cx + random.range(-3, 3) * s, y - 8 * s]], false);
    lights.strokeStyle = rgba(S.gold, 0.8);
    lights.lineWidth = 1;
    lights.stroke();
  }
  glow(lights, x, y - 2 * s, 12 * s, S.gold, 0.28, 0.1);
}

export function paintTree(ctx, lights, t, S, random) {
  if (S.tree === 'pine') pine(ctx, t.x, t.y, t.s, S, t.v);
  else if (S.tree === 'autumn') autumn(ctx, t.x, t.y, t.s, S, t.v, random);
  else if (S.tree === 'frozen') frozen(ctx, t.x, t.y, t.s, S, random);
  else if (t.v < 0.42 && !t.crest) paintRuin(ctx, lights, t, S, random);
  else dead(ctx, t.x, t.y, t.s, S, random);
}

/** Lantern strings for the Ember Nebula: catenaries between roofs with warm bulbs (bulbs also into the lights). */
export function paintLanternString(ctx, lights, a, b, S, random) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = d * 0.14;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2];
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mid[0], mid[1], b.x, b.y);
  ctx.strokeStyle = 'rgba(30, 14, 20, 0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const count = Math.max(4, Math.round(d / 26));
  for (let i = 1; i < count; i += 1) {
    const t = i / count;
    const u = 1 - t;
    const px = u * u * a.x + 2 * u * t * mid[0] + t * t * b.x;
    const py = u * u * a.y + 2 * u * t * mid[1] + t * t * b.y;
    const s = perspective(py) * 0.9;
    const color = S.bulbs[(i + Math.floor(random.next() * 2)) % S.bulbs.length];
    lineTo(ctx, px, py, px, py + 2.2 * s, '#2a1410', 0.8);
    roundRectPath(ctx, px - 1.7 * s, py + 2.2 * s, 3.4 * s, 4.4 * s, 1.2 * s);
    ctx.fillStyle = color;
    ctx.fill();
    roundRectPath(lights, px - 1.5 * s, py + 2.5 * s, 3 * s, 3.8 * s, s);
    lights.fillStyle = rgba(shade(color, 0.3), 0.95);
    lights.fill();
    glow(lights, px, py + 4.4 * s, 7 * s, color, 0.42, 0.15);
  }
}

/** The winding paths: a wide soft track and a brighter worn core, narrowing with distance. */
export function paintPaths(ctx, S, noise) {
  for (const path of PATHS) {
    const wobbly = path.map(([x, y]) => [x + (noise.noise2(x * 0.05, y * 0.05) - 0.5) * 10, y + (noise.noise2(y * 0.05, x * 0.05) - 0.5) * 6]);
    for (const [width, alpha] of [[2.2, 0.16], [1.2, 0.22], [0.55, 0.3]]) {
      for (let i = 0; i + 1 < wobbly.length; i += 1) {
        const [ax, ay] = wobbly[i];
        const [bx, by] = wobbly[i + 1];
        const s = perspective((ay + by) / 2);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        const p0 = wobbly[Math.max(0, i - 1)];
        const p3 = wobbly[Math.min(wobbly.length - 1, i + 2)];
        ctx.bezierCurveTo(ax + (bx - p0[0]) / 6, ay + (by - p0[1]) / 6, bx - (p3[0] - ax) / 6, by - (p3[1] - ay) / 6, bx, by);
        ctx.strokeStyle = rgba(S.path, alpha);
        ctx.lineWidth = width * 5.2 * s;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }
}

/** Little marks in the lights layer at the Loom's foot: nothing; the game draws that glow live. */
export const sparkle = (ctx, x, y, r, color, rot = 0) => {
  sparklePath(ctx, x, y, r, 0.3, rot);
  ctx.fillStyle = color;
  ctx.fill();
};

export { TAU };

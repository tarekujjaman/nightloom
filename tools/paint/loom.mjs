// The Loom sheet (game/art/loom.png), painted at 2x: the tower (dais, plaque, uprights, beams, roof cap, lanterns),
// the great wheel the game turns, and the woven cloth it crops to the night's progress. The game's loom.js draws the
// warp threads, the wheel's turn, the lantern light and the health meter live over these cells; its SHEET table
// names the same cells: tower 520x780 at (0,0) with the hub at (260,376); wheel 260x260 at (0,784); cloth 280x110 at (264,784).
import { TAU, canvas, fillEllipse, fillPoly, lineTo, mix, rgba, roundRectPath, shade, softEllipse, sparklePath } from './brush.mjs';

const GOLD = '#ffd36b';
const GOLD_LIGHT = '#fff2c4';
const GOLD_DEEP = '#b07a20';
const WOOD = '#6a4222';
const WOOD_DARK = '#2e1a0c';
const WOOD_LIGHT = '#a8703a';
const STONE = '#4a4466';
const STONE_LIGHT = '#8a84a8';
const SLATE = '#2a1c3c';
const CYAN = '#74f3ff';
const MAGENTA = '#ff6ad5';
const VIOLET = '#b48cff';

function woodRect(ctx, x, y, w, h, vertical = true) {
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, WOOD_DARK);
  g.addColorStop(0.28, WOOD_LIGHT);
  g.addColorStop(0.55, WOOD);
  g.addColorStop(1, WOOD_DARK);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(30, 14, 4, 0.4)';
  ctx.lineWidth = 0.6;
  const n = Math.max(2, Math.round((vertical ? w : h) / 3.2));
  for (let i = 1; i < n; i += 1) {
    ctx.beginPath();
    if (vertical) {
      const gx = x + (w * i) / n;
      for (let t = y; t <= y + h; t += 5) ctx.lineTo(gx + Math.sin(t * 0.13 + i * 1.7) * 0.7, t);
    } else {
      const gy = y + (h * i) / n;
      for (let t = x; t <= x + w; t += 5) ctx.lineTo(t, gy + Math.sin(t * 0.11 + i * 1.3) * 0.6);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 230, 180, 0.2)';
  if (vertical) ctx.fillRect(x + 1, y, 1.5, h);
  else ctx.fillRect(x, y + 1, w, 1.5);
}

function goldBar(ctx, x, y, w, h, vertical = false) {
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, GOLD_DEEP);
  g.addColorStop(0.35, GOLD_LIGHT);
  g.addColorStop(0.62, GOLD);
  g.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(60, 30, 0, 0.6)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6);
}

function goldKnob(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.5, GOLD);
  g.addColorStop(1, GOLD_DEEP);
  fillEllipse(ctx, x, y, r, r, g);
}

function stoneStep(ctx, cy, rx, ry, riser, random, light = 0) {
  fillEllipse(ctx, 0, cy + riser, rx, ry, shade(STONE, -0.5));
  ctx.fillStyle = shade(STONE, -0.38);
  ctx.fillRect(-rx, cy, rx * 2, riser);
  const face = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  face.addColorStop(0, shade(STONE_LIGHT, 0.1 + light));
  face.addColorStop(1, shade(STONE, light));
  fillEllipse(ctx, 0, cy, rx, ry, face);
  for (let i = 0; i < rx * 1.6; i += 1) {
    const a = random.angle();
    const d = Math.sqrt(random.next());
    fillEllipse(ctx, Math.cos(a) * d * rx * 0.96, cy + Math.sin(a) * d * ry * 0.96, 0.8, 0.5, rgba(random.chance(0.5) ? '#ffffff' : '#000000', 0.12));
  }
  for (let k = 0; k < 9; k += 1) {
    const a = Math.PI * (0.08 + (0.84 * k) / 8);
    lineTo(ctx, Math.cos(a) * rx, cy + Math.sin(a) * ry, Math.cos(a) * rx, cy + riser + Math.sin(a) * ry, 'rgba(0, 0, 0, 0.35)', 0.8);
  }
}

function lantern(ctx, x, y) {
  lineTo(ctx, x, y - 14, x, y - 7, '#3a3040', 1.2);
  fillPoly(ctx, [[x - 7, y - 4], [x, y - 9], [x + 7, y - 4]], GOLD_DEEP);
  roundRectPath(ctx, x - 5, y - 4, 10, 14, 2);
  const glass = ctx.createLinearGradient(0, y - 4, 0, y + 10);
  glass.addColorStop(0, '#ffd080');
  glass.addColorStop(1, '#ff8a30');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  lineTo(ctx, x, y - 4, x, y + 10, rgba(GOLD_DEEP, 0.8), 1);
  goldKnob(ctx, x, y + 11.5, 2);
}

function paintTower(ctx, random) {
  softEllipse(ctx, 0, 160, 160, 38, '#000000', 0.5);
  stoneStep(ctx, 152, 118, 28, 9, random);
  stoneStep(ctx, 143, 96, 22, 8, random, 0.05);
  stoneStep(ctx, 135, 74, 17, 7, random, 0.12);
  // gold inlay on the summit stone
  ctx.save();
  ctx.strokeStyle = rgba(GOLD, 0.8);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 135, 60, 13.5, 0, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k += 1) {
    const a = (k * TAU) / 12;
    lineTo(ctx, Math.cos(a) * 44, 135 + Math.sin(a) * 10, Math.cos(a) * 60, 135 + Math.sin(a) * 13.5, rgba(GOLD, 0.7), 1);
  }
  ctx.restore();
  // the plaque at the dais foot (the health meter sits in its slot)
  roundRectPath(ctx, -80, 165, 160, 26, 7);
  const plaque = ctx.createLinearGradient(0, 165, 0, 191);
  plaque.addColorStop(0, shade(STONE_LIGHT, -0.1));
  plaque.addColorStop(1, shade(STONE, -0.35));
  ctx.fillStyle = plaque;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRectPath(ctx, -66, 172, 132, 12, 6);
  ctx.fillStyle = '#0a0614';
  ctx.fill();
  ctx.strokeStyle = rgba(GOLD_DEEP, 0.8);
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const x of [-73, 73]) goldKnob(ctx, x, 178, 2.4);
  // uprights with gold bands and a carved spiral
  for (const side of [-1, 1]) {
    const x = side * 84;
    woodRect(ctx, x - 7, -132, 14, 272, true);
    ctx.strokeStyle = 'rgba(255, 220, 160, 0.3)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let t = -126; t <= 126; t += 2) ctx.lineTo(x + Math.sin(t * 0.22) * 4.5, t);
    ctx.stroke();
    for (const y of [-118, -58, 2, 62, 118]) goldBar(ctx, x - 8.5, y - 3, 17, 6);
    goldBar(ctx, x - 10, 130, 20, 10);
    // tassel from the beam's end
    lineTo(ctx, side * 104, -126, side * 104, -108, GOLD, 1.2);
    fillEllipse(ctx, side * 104, -105, 2.4, 4, GOLD);
  }
  // beams
  woodRect(ctx, -106, -140, 212, 14, false);
  goldBar(ctx, -108, -142, 216, 3);
  goldBar(ctx, -108, -127, 216, 2.5);
  for (let x = -96; x <= 96; x += 24) if (x !== 0) goldKnob(ctx, x, -133, 2);
  goldKnob(ctx, 0, -133, 11);
  sparklePath(ctx, 0, -133, 6.5, 0.32, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  woodRect(ctx, -96, 62, 192, 12, false);
  goldBar(ctx, -98, 61, 196, 2.5);
  for (const side of [-1, 1]) goldKnob(ctx, side * 100, 68, 7);
  // the cloth beam: a roller with gold caps and a ratchet
  woodRect(ctx, -80, 76, 160, 13, false);
  goldBar(ctx, -88, 74, 8, 17, true);
  goldBar(ctx, 80, 74, 8, 17, true);
  ctx.save();
  ctx.translate(93, 82.5);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let k = 0; k < 16; k += 1) {
    const a = (k * TAU) / 16;
    const r = k % 2 ? 7 : 5.2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  fillEllipse(ctx, 0, 0, 2, 2, WOOD_DARK);
  ctx.restore();
  // roof cap and finial
  const slate = ctx.createLinearGradient(0, -178, 0, -140);
  slate.addColorStop(0, shade(SLATE, 0.35));
  slate.addColorStop(1, SLATE);
  fillPoly(ctx, [[-122, -140], [0, -178], [122, -140]], slate);
  for (let k = 1; k <= 4; k += 1) {
    const y = -140 - k * 7.6;
    const half = 122 * (1 - (k * 7.6) / 38);
    lineTo(ctx, -half, y, half, y, 'rgba(0, 0, 0, 0.3)', 0.8);
  }
  for (const side of [-1, 1]) lineTo(ctx, 0, -178, side * 122, -140, GOLD, 1.8);
  goldBar(ctx, -124, -141.5, 248, 3);
  lineTo(ctx, 0, -178, 0, -190, GOLD, 2);
  goldKnob(ctx, 0, -191, 3.5);
  sparklePath(ctx, 0, -191, 7, 0.3, 0);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fill();
  lantern(ctx, -98, -118);
  lantern(ctx, 98, -118);
}

function paintWheel(ctx, random) {
  const R = 62;
  for (let k = 0; k < 24; k += 1) {
    const a0 = (k * TAU) / 24;
    ctx.beginPath();
    ctx.arc(0, 0, 57, a0, a0 + TAU / 24 + 0.01);
    ctx.strokeStyle = mix(WOOD, WOOD_LIGHT, 0.2 + 0.6 * random.next());
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, R - 1.2, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = GOLD_DEEP;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 52.4, 0, TAU);
  ctx.stroke();
  for (let k = 0; k < 12; k += 1) {
    const a = (k * TAU) / 12;
    const c = Math.cos(a);
    const s = Math.sin(a);
    lineTo(ctx, c * 12, s * 12, c * 52, s * 52, WOOD_DARK, 5.2);
    lineTo(ctx, c * 12, s * 12, c * 52, s * 52, WOOD_LIGHT, 1.6);
    goldKnob(ctx, c * 48, s * 48, 2.6);
    goldKnob(ctx, c * 16, s * 16, 2.2);
  }
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = rgba(GOLD, 0.9);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, TAU);
  ctx.stroke();
  goldKnob(ctx, 0, 0, 13);
  fillEllipse(ctx, 0, 0, 4, 4, WOOD_DARK);
  for (let k = 0; k < 6; k += 1) fillEllipse(ctx, Math.cos((k * TAU) / 6) * 9, Math.sin((k * TAU) / 6) * 9, 1.4, 1.4, 'rgba(60, 30, 0, 0.8)');
}

function paintCloth(ctx, random) {
  const x0 = 4;
  const w = 132;
  const bands = [[7, GOLD], [5, CYAN], [4, MAGENTA], [7, VIOLET], [3, '#ffffff'], [6, GOLD], [7, CYAN], [5, MAGENTA], [6, VIOLET]];
  let y = 0;
  for (const [h, color] of bands) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(color, 0.18));
    g.addColorStop(1, shade(color, -0.22));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y, w, h);
    if (color === GOLD) for (let x = x0 + 6; x < x0 + w - 4; x += 9) fillPoly(ctx, [[x, y + h / 2 - 2.4], [x + 2.4, y + h / 2], [x, y + h / 2 + 2.4], [x - 2.4, y + h / 2]], rgba('#3a1a4a', 0.8));
    if (color === VIOLET) {
      ctx.beginPath();
      for (let x = x0; x <= x0 + w; x += 6) ctx.lineTo(x, ((x - x0) / 6) % 2 === 0 ? y + 1.5 : y + h - 1.5);
      ctx.strokeStyle = rgba(CYAN, 0.85);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    if (color === CYAN) for (let x = x0 + 5; x < x0 + w - 3; x += 8) fillEllipse(ctx, x, y + h / 2, 1.3, 1.3, rgba(GOLD_LIGHT, 0.9));
    if (color === MAGENTA) for (let x = x0 + 3; x < x0 + w - 2; x += 5) fillEllipse(ctx, x, y + h / 2, 0.9, h * 0.3, rgba('#ffffff', 0.5));
    y += h;
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
  for (let t = 0; t < 50; t += 2) ctx.fillRect(x0, t, w, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let t = x0; t < x0 + w; t += 3) ctx.fillRect(t, 0, 1, 50);
  const edges = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  edges.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  edges.addColorStop(0.14, 'rgba(0, 0, 0, 0)');
  edges.addColorStop(0.86, 'rgba(0, 0, 0, 0)');
  edges.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = edges;
  ctx.fillRect(x0, 0, w, 50);
  for (const x of [x0, x0 + w]) lineTo(ctx, x, 0, x, 50, GOLD, 1.4);
  for (let x = x0 + 2; x < x0 + w; x += 3) lineTo(ctx, x, 50, x + random.range(-0.6, 0.6), 55, rgba(GOLD, 0.9), 1.1);
}

export function paintLoomSheet(makeRandom) {
  const sheet = canvas(560, 1100);
  const ctx = sheet.getContext('2d');
  const random = makeRandom(515);
  // The tower on its own layer first, then a soft dark halo of its silhouette under it, so it stands off any ground.
  const tower = canvas(520, 780);
  const t = tower.getContext('2d');
  t.scale(2, 2);
  t.translate(130, 188);
  paintTower(t, random);
  ctx.save();
  ctx.filter = 'blur(7px) brightness(0)';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(tower, 0, 4);
  ctx.restore();
  ctx.drawImage(tower, 0, 0);
  ctx.save();
  ctx.scale(2, 2);
  ctx.translate(65, 392 + 65);
  paintWheel(ctx, random);
  ctx.restore();
  ctx.save();
  ctx.scale(2, 2);
  ctx.translate(132, 392);
  paintCloth(ctx, random);
  ctx.restore();
  return sheet;
}

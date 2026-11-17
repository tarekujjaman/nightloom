// One realm's view of the Weavers' Hill: the sky and its realm (aurora, nebula, halo moon, gold threads), the far
// mountains and the valley, the textured hill with its paths, cottages, well, racks and trees, the near woods and
// the vignette. Returns the backdrop and the lights layer (window panes, lanterns, cloth) as two canvases.
import { TAU, blurOnto, canvas, clamp, curvePath, fillEllipse, fillPoly, glow, lerp, lineTo, mix, polygon, rgba, shade, smoothstep, softDisc, softEllipse, sparklePath } from './brush.mjs';
import { COTTAGES, CREST, DAIS, FIELD, HORIZON, PATHS, RACKS, WELL, cottageRidge, crestY, foregroundSpots, hillPath, insideHill, loomLight, paintCottage, paintLanternString, paintPaths, paintRack, paintTree, paintWell, perspective, treeSpots } from './village.mjs';

const W = FIELD.width;
const H = FIELD.height;
/** A clearing every realm shares: a pond that mirrors its sky. */
export const POND = { x: 838, y: 508, rx: 50, ry: 19 };

export const STYLES = [
  {
    name: 'Aurora Reach', sky: ['#050b1c', '#0a1c3c', '#0f3550', '#145a5c'], horizon: '#4df0b0', mountainFar: '#0e2a46', mountainNear: '#0a1c30', valley: '#06101f', valleyTree: '#0a2030', mist: '#6af0c0',
    ground: { deep: '#0d1a30', mid: '#223858', lit: '#45668a', warm: '#8c7858' }, snow: true, snowColor: '#c4dcee', speckle: '#e4f4ff',
    tree: 'pine', leaf: '#0d3236', trunk: '#2a1a14', wall: '#3e3344', wallLit: '#b88a60', roof: '#26203a', roofLit: '#5c4f72', window: '#ffd27a', windowGlow: '#ffb050',
    wood: '#4a3222', stone: '#58607a', path: '#d8e8f4', cloth: ['#74f3ff', '#ffd36b', '#ff6ad5', '#f0f6ff'], smoke: '#c8d4e4', silhouette: '#040a16', vignette: '#02060f', pond: '#8ac4e0', gold: '#ffd36b',
  },
  {
    name: 'Ember Nebula', sky: ['#1a0618', '#3a0e2a', '#5a1e30', '#7a3028'], horizon: '#ff8a45', mountainFar: '#3a1426', mountainNear: '#240a1c', valley: '#180816', valleyTree: '#200a1a', mist: '#ff9a5a',
    ground: { deep: '#180a1c', mid: '#34182a', lit: '#5a2e36', warm: '#8a583c' }, snow: false, grassLight: '#984a32', grassDark: '#1c0a12',
    tree: 'autumn', leaves: ['#d2541e', '#b5301c', '#e8a63a', '#c2461a', '#f0c050'], trunk: '#2a1410', wall: '#5a3a30', wallLit: '#e0a060', roof: '#3a1c22', roofLit: '#8a4a3a', window: '#ffd27a', windowGlow: '#ff9a40',
    wood: '#4a2a18', stone: '#6a5048', path: '#e8c090', cloth: ['#ffd36b', '#74f3ff', '#ff6ad5', '#fff0d0'], smoke: '#d8b8a8', bulbs: ['#ffb040', '#ff7a40', '#ffd36b'], silhouette: '#120408', vignette: '#0c0208', pond: '#5a2a30', gold: '#ffd36b',
  },
  {
    name: 'Frost Veil', sky: ['#040a1e', '#081a3e', '#0f2e66', '#1a4a80'], horizon: '#9fe8ff', mountainFar: '#1a3a6c', mountainNear: '#0e2450', valley: '#071430', valleyTree: '#0a1c3c', mist: '#bfeeff',
    ground: { deep: '#0e1a3a', mid: '#1e3462', lit: '#406a98', warm: '#8098b0' }, snow: true, snowColor: '#d8eefc', speckle: '#ffffff',
    tree: 'frozen', ice: '#b8f0ff', trunk: '#1c2a4a', wall: '#2e3a5a', wallLit: '#9fc0d8', roof: '#1c2444', roofLit: '#4a6a9a', window: '#ffe3a0', windowGlow: '#ffc870',
    wood: '#2c3450', stone: '#607898', path: '#e0f0ff', cloth: ['#9fe8ff', '#ffd36b', '#ff6ad5', '#ffffff'], smoke: '#d8e8f4', silhouette: '#040a1c', vignette: '#02061a', lake: '#8fd0ec', pond: '#a8dcf0', gold: '#ffd36b',
  },
  {
    name: 'The Hollow Dark', sky: ['#0a0318', '#1e0a3c', '#38146c', '#4a1c7a'], horizon: '#ffd36b', mountainFar: '#2a1050', mountainNear: '#1a0836', valley: '#10052a', valleyTree: '#180a38', mist: '#8a5ad0',
    ground: { deep: '#140826', mid: '#28144c', lit: '#4e3278', warm: '#9c7044' }, snow: false, grassLight: '#7a50b0', grassDark: '#0c0418',
    tree: 'hollow', violet: '#b48cff', trunk: '#0e0618', stone: '#5a4a8a', gold: '#ffd36b', wall: '#3a2a5a', wallLit: '#c0a070', roof: '#20143a', roofLit: '#5a4080', window: '#ffd36b', windowGlow: '#ffb040', ruined: true,
    wood: '#2a1a3a', path: '#c8b0e8', cloth: ['#ffd36b', '#b48cff', '#ff6ad5', '#ffffff'], smoke: '#9a8ab8', silhouette: '#08020f', vignette: '#050110', pond: '#2a1050',
  },
];

function paintSky(ctx, S, random) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
  S.sky.forEach((color, i) => g.addColorStop(i / (S.sky.length - 1), color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // stars: dense and small high up, sparse near the haze of the horizon; a few bright ones with a cross
  for (let i = 0; i < 520; i += 1) {
    const x = random.range(-4, W + 4);
    const y = random.range(-4, HORIZON + 40);
    if (random.next() < smoothstep(HORIZON - 120, HORIZON + 30, y) * 0.85) continue;
    const r = random.range(0.4, 1.3) * (random.chance(0.12) ? 1.8 : 1);
    const warm = random.chance(0.3);
    ctx.fillStyle = rgba(warm ? '#ffe9b0' : '#eefaff', random.range(0.35, 1));
    fillEllipse(ctx, x, y, r, r, ctx.fillStyle);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = random.range(20, W - 20);
    const y = random.range(10, HORIZON - 60);
    const r = random.range(1.6, 2.6);
    glow(ctx, x, y, r * 7, '#eefaff', 0.35, 0.05);
    ctx.fillStyle = '#ffffff';
    fillEllipse(ctx, x, y, r, r, '#ffffff');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(x - r * 4, y - 0.5, r * 8, 1);
    ctx.fillRect(x - 0.5, y - r * 4, 1, r * 8);
  }
  // a soft band of sky-dust across the upper sky
  const band = canvas(W, HORIZON);
  const b = band.getContext('2d');
  for (let i = 0; i < 70; i += 1) {
    const t = i / 70;
    softDisc(b, lerp(-60, W + 60, t), 40 + Math.sin(t * 3.2) * 36 + random.range(-16, 16), random.range(26, 60), [[0, 'rgba(220, 230, 255, 0.07)'], [1, 'rgba(220, 230, 255, 0)']]);
  }
  blurOnto(ctx, band, 6, { composite: 'lighter' });
}

function paintAurora(ctx, random, noise) {
  const layer = canvas(W, 280);
  const c = layer.getContext('2d');
  c.globalCompositeOperation = 'lighter';
  for (const [baseY, amp, color, top, alpha] of [[128, 26, '#4df0b0', '#b48cff', 0.55], [156, 18, '#7dffd0', '#4df0b0', 0.42], [96, 30, '#5af0c8', '#6a8cff', 0.3]]) {
    const phase = random.range(0, 10);
    for (let x = -10; x < W + 10; x += 2) {
      const ridge = baseY + Math.sin(x * 0.0062 + phase) * amp + Math.sin(x * 0.0171 + phase * 2) * amp * 0.4;
      const h = 44 + 96 * noise.fbm(x * 0.0045 + phase, 0.3, 3);
      const bright = 0.35 + 0.65 * noise.fbm(x * 0.021 + phase, 7.1, 3);
      const g = c.createLinearGradient(0, ridge, 0, ridge - h);
      g.addColorStop(0, rgba(color, alpha * bright));
      g.addColorStop(0.3, rgba(color, alpha * 0.55 * bright));
      g.addColorStop(1, rgba(top, 0));
      c.fillStyle = g;
      c.fillRect(x, ridge - h, 2.3, h);
    }
  }
  blurOnto(ctx, layer, 2.5, { composite: 'lighter', alpha: 0.95 });
  blurOnto(ctx, layer, 16, { composite: 'lighter', alpha: 0.55 });
}

function paintNebula(ctx, noise, { colors, y1, scale, threshold, alpha, offset, composite = 'screen' }) {
  const img = ctx.createImageData(W, y1);
  const d = img.data;
  const rgb = colors.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let y = 0; y < y1; y += 1) {
    const fade = smoothstep(y1, y1 - 110, y);
    for (let x = 0; x < W; x += 1) {
      const n = noise.fbm(x * scale + offset, y * scale * 1.5 + offset, 5, 0.55);
      const m = smoothstep(threshold, threshold + 0.3, n);
      if (m <= 0) continue;
      const hue = clamp(noise.fbm(x * scale * 0.6 + 40, y * scale * 0.6 + 40, 3) * 1.6 - 0.3, 0, 0.999) * (rgb.length - 1);
      const k = Math.floor(hue);
      const t = hue - k;
      const i = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch += 1) d[i + ch] = rgb[k][ch] + (rgb[k + 1][ch] - rgb[k][ch]) * t;
      d[i + 3] = 255 * alpha * m * fade;
    }
  }
  const layer = canvas(W, y1);
  layer.getContext('2d').putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

function paintEmberSky(ctx, random, noise) {
  paintNebula(ctx, noise, { colors: ['#5a1030', '#c83a4a', '#ff8a45', '#ffc070'], y1: 230, scale: 0.0052, threshold: 0.42, alpha: 0.72, offset: 3.3 });
  paintNebula(ctx, noise, { colors: ['#3a0a30', '#ff5a7a', '#ff9a50'], y1: 200, scale: 0.011, threshold: 0.56, alpha: 0.35, offset: 11.7, composite: 'lighter' });
  // ash motes drifting up
  for (let i = 0; i < 90; i += 1) {
    const x = random.range(0, W);
    const y = random.range(20, HORIZON + 10);
    glow(ctx, x, y, random.range(2, 5), '#ffb060', random.range(0.3, 0.8), 0.3);
  }
  const warmth = ctx.createRadialGradient(W * 0.3, HORIZON + 20, 10, W * 0.3, HORIZON + 20, 460);
  warmth.addColorStop(0, 'rgba(255, 130, 60, 0.35)');
  warmth.addColorStop(1, 'rgba(255, 130, 60, 0)');
  ctx.fillStyle = warmth;
  ctx.fillRect(0, 0, W, HORIZON + 40);
}

function paintFrostSky(ctx, random) {
  const mx = 760;
  const my = 66;
  glow(ctx, mx, my, 150, '#9fe8ff', 0.22, 0.05);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(mx, my, 60, mx, my, 92);
  halo.addColorStop(0, 'rgba(159, 232, 255, 0)');
  halo.addColorStop(0.5, 'rgba(200, 240, 255, 0.22)');
  halo.addColorStop(1, 'rgba(159, 232, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 100, my - 100, 200, 200);
  ctx.restore();
  const moon = ctx.createRadialGradient(mx - 6, my - 6, 2, mx, my, 22);
  moon.addColorStop(0, '#ffffff');
  moon.addColorStop(0.7, '#dff4ff');
  moon.addColorStop(1, '#a8d8ee');
  fillEllipse(ctx, mx, my, 22, 22, moon);
  for (const [dx, dy, r] of [[-6, 4, 4], [7, -3, 2.6], [3, 9, 2]]) fillEllipse(ctx, mx + dx, my + dy, r, r, 'rgba(150, 200, 225, 0.5)');
  // ice-crystal stars: six-pointed
  for (let i = 0; i < 22; i += 1) {
    const x = random.range(10, W - 10);
    const y = random.range(10, HORIZON - 40);
    const r = random.range(2, 4.5);
    ctx.strokeStyle = rgba('#dff4ff', random.range(0.4, 0.9));
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k += 1) {
      const a = (k * Math.PI) / 3 + 0.2;
      lineTo(ctx, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, ctx.strokeStyle, 0.8);
    }
  }
  // thin haze bands
  for (let i = 0; i < 5; i += 1) softEllipse(ctx, random.range(100, W - 100), random.range(40, HORIZON), random.range(160, 320), random.range(10, 22), '#bfeeff', 0.07);
}

function paintHollowSky(ctx, random, noise) {
  paintNebula(ctx, noise, { colors: ['#180630', '#4a1a8a', '#8a3ad0', '#b48cff'], y1: 220, scale: 0.0058, threshold: 0.46, alpha: 0.6, offset: 21.1 });
  // gold threads drawn through the deeps, and their soft light
  const layer = canvas(W, HORIZON + 40);
  const c = layer.getContext('2d');
  for (let i = 0; i < 6; i += 1) {
    const pts = [];
    let y = random.range(20, HORIZON - 20);
    for (let x = -20; x <= W + 20; x += 90) {
      y += random.range(-26, 26);
      pts.push([x, clamp(y, 8, HORIZON + 10)]);
    }
    curvePath(c, pts);
    c.strokeStyle = rgba('#ffd36b', random.range(0.35, 0.7));
    c.lineWidth = random.range(0.7, 1.4);
    c.stroke();
  }
  for (let i = 0; i < 50; i += 1) glow(c, random.range(0, W), random.range(0, HORIZON), random.range(1.5, 4), '#ffd36b', random.range(0.4, 0.9), 0.3);
  blurOnto(ctx, layer, 4, { composite: 'lighter', alpha: 0.7 });
  ctx.drawImage(layer, 0, 0);
  const crack = ctx.createLinearGradient(0, HORIZON - 40, 0, HORIZON + 8);
  crack.addColorStop(0, 'rgba(255, 211, 107, 0)');
  crack.addColorStop(1, 'rgba(255, 211, 107, 0.28)');
  ctx.fillStyle = crack;
  ctx.fillRect(0, HORIZON - 40, W, 48);
}

function ridgeLine(random, noise, base, amp, step, seedShift) {
  const pts = [[-30, HORIZON + 80]];
  for (let x = -30; x <= W + 30; x += step) pts.push([x, base - amp * noise.fbm(x * 0.0065 + seedShift, 1.1, 3) - amp * 0.3 * Math.abs(Math.sin(x * 0.021 + seedShift))]);
  pts.push([W + 30, HORIZON + 80]);
  return pts;
}

function paintMountains(ctx, S, random, noise) {
  const haze = ctx.createLinearGradient(0, HORIZON - 90, 0, HORIZON);
  haze.addColorStop(0, rgba(S.horizon, 0));
  haze.addColorStop(1, rgba(S.horizon, 0.22));
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZON - 90, W, 90);
  const far = ridgeLine(random, noise, HORIZON - 4, 44, 14, 2.2);
  const g = ctx.createLinearGradient(0, HORIZON - 50, 0, HORIZON + 60);
  g.addColorStop(0, S.mountainFar);
  g.addColorStop(1, S.valley);
  fillPoly(ctx, far, g);
  polygon(ctx, far.slice(1, -1), false);
  ctx.strokeStyle = rgba(S.snow ? S.snowColor : S.horizon, S.snow ? 0.3 : 0.22);
  ctx.lineWidth = S.snow ? 2.2 : 1.4;
  ctx.stroke();
  const near = ridgeLine(random, noise, HORIZON + 10, 26, 18, 7.9);
  const g2 = ctx.createLinearGradient(0, HORIZON - 20, 0, HORIZON + 70);
  g2.addColorStop(0, S.mountainNear);
  g2.addColorStop(1, S.valley);
  fillPoly(ctx, near, g2);
  // mist pooled at their feet, soft-edged
  const mist = canvas(W, 140);
  const m = mist.getContext('2d');
  m.fillStyle = rgba(S.mist, 0.3);
  m.fillRect(0, 44, W, 26);
  for (let i = 0; i < 12; i += 1) softEllipse(m, random.range(0, W), 56 + random.range(-6, 10), random.range(60, 160), random.range(6, 12), S.mist, 0.25);
  blurOnto(ctx, mist, 9, { alpha: 0.6, y: HORIZON - 40 });
}

function paintValley(ctx, S, random, noise) {
  ctx.fillStyle = S.valley;
  ctx.fillRect(0, HORIZON + 30, W, 420);
  if (S.lake) {
    const lx = 150;
    const ly = 266;
    const g = ctx.createLinearGradient(0, ly - 36, 0, ly + 36);
    g.addColorStop(0, shade(S.lake, -0.2));
    g.addColorStop(1, shade(S.lake, -0.55));
    fillEllipse(ctx, lx, ly, 190, 40, g);
    for (let i = 0; i < 9; i += 1) {
      const a = random.angle();
      const len = random.range(30, 110);
      const x = lx + random.range(-120, 120);
      const y = ly + random.range(-18, 18);
      lineTo(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.25, rgba('#ffffff', 0.35), 0.8);
    }
    softEllipse(ctx, lx, ly, 150, 26, '#dff4ff', 0.12);
  }
  // the valley forest: a carpet of tiny trees up to the hill's crest
  for (let i = 0; i < 1700; i += 1) {
    const x = random.range(-10, W + 10);
    const y = random.range(HORIZON + 8, 400);
    if (y > crestY(x) - 1 || (S.lake && (x - 150) ** 2 / 190 ** 2 + (y - 266) ** 2 / 40 ** 2 < 1.05)) continue;
    const s = 0.4 + ((y - HORIZON) / 230) * 1.1;
    const alpha = 0.5 + 0.5 * smoothstep(HORIZON, HORIZON + 120, y);
    ctx.fillStyle = rgba(mix(S.valleyTree, S.mist, 0.1 + 0.12 * random.next()), alpha);
    if (S.tree === 'autumn' && random.chance(0.4)) fillEllipse(ctx, x, y, 2.2 * s, 1.8 * s, rgba(S.leaves[i % S.leaves.length], 0.35 * alpha));
    else fillPoly(ctx, [[x - 2 * s, y], [x + 2 * s, y], [x, y - 5 * s]], ctx.fillStyle);
  }
  if (S.tree === 'autumn') for (let i = 0; i < 16; i += 1) glow(ctx, random.range(20, W - 20), random.range(HORIZON + 30, 300), 4, '#ffb060', 0.7, 0.25);
  if (S.tree === 'hollow') {
    for (let i = 0; i < 9; i += 1) {
      const x = random.range(10, W - 10);
      const y = random.range(HORIZON + 20, 300);
      if (y > crestY(x) - 20) continue;
      const s = 0.5 + ((y - HORIZON) / 150) * 0.8;
      fillPoly(ctx, [[x - 3 * s, y], [x + 3 * s, y], [x + 1.5 * s, y - 26 * s], [x - 1 * s, y - 20 * s]], shade(S.valleyTree, 0.25));
      glow(ctx, x, y - 10 * s, 10 * s, S.gold, 0.25, 0.1);
    }
  }
  // the valley's own haze, thicker toward the hill's foot
  const haze = ctx.createLinearGradient(0, HORIZON + 40, 0, 330);
  haze.addColorStop(0, rgba(S.mist, 0));
  haze.addColorStop(1, rgba(S.mist, 0.14));
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZON + 40, W, 300);
}

/** A soft rim of light where the hill's crest meets the night, so the mound reads against the valley. */
function paintCrestMist(ctx, S) {
  const mist = canvas(W, H);
  const m = mist.getContext('2d');
  curvePath(m, CREST.map(([x, y]) => [x, y - 4]));
  m.strokeStyle = rgba(S.mist, 0.55);
  m.lineWidth = 18;
  m.stroke();
  blurOnto(ctx, mist, 12, { alpha: 0.55, composite: 'lighter' });
}

function paintGround(ctx, S, random, noise) {
  const layer = canvas(W, H);
  const c = layer.getContext('2d');
  c.save();
  hillPath(c);
  c.clip();
  const g = c.createRadialGradient(DAIS.x, DAIS.y, 20, DAIS.x, DAIS.y, 640);
  g.addColorStop(0, mix(S.ground.lit, S.ground.warm, 0.5));
  g.addColorStop(0.18, S.ground.lit);
  g.addColorStop(0.5, S.ground.mid);
  g.addColorStop(1, S.ground.deep);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const v = c.createLinearGradient(0, 220, 0, H);
  v.addColorStop(0, rgba(S.horizon, 0.26));
  v.addColorStop(0.22, rgba(S.horizon, 0));
  v.addColorStop(0.72, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
  c.restore();
  const img = c.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 215; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      const n = noise.fbm(x * 0.009, y * 0.014, 4) - 0.5;
      const fine = noise.noise2(x * 0.23, y * 0.23) - 0.5;
      const k = 1 + n * 0.24 + fine * 0.07;
      d[i] *= k;
      d[i + 1] *= k;
      d[i + 2] *= k;
    }
  }
  c.putImageData(img, 0, 0);
  c.save();
  hillPath(c);
  c.clip();
  // terraces: faint rings of the slope around the summit
  for (let k = 1; k <= 7; k += 1) {
    const r = 120 + k * 92;
    const pts = [];
    for (let a = 0; a <= TAU + 0.01; a += TAU / 90) {
      const wob = 1 + (noise.noise2(Math.cos(a) * 2 + k, Math.sin(a) * 2 + k) - 0.5) * 0.12;
      pts.push([DAIS.x + Math.cos(a) * r * wob, DAIS.y - 24 + Math.sin(a) * r * 0.44 * wob]);
    }
    polygon(c, pts, false);
    c.strokeStyle = rgba(S.ground.lit, 0.09);
    c.lineWidth = 2.2;
    c.stroke();
  }
  // dabs: snow glints or grass tufts, thicker where the Loom lights them
  for (let i = 0; i < 3200; i += 1) {
    const x = random.range(-10, W + 10);
    const y = random.range(222, H + 10);
    if (!insideHill(x, y)) continue;
    const s = perspective(y);
    const light = loomLight(x, y);
    if (S.snow) {
      c.fillStyle = rgba(S.speckle, 0.15 + 0.6 * random.next() * (0.3 + light));
      fillEllipse(c, x, y, 0.9 * s, 0.55 * s, c.fillStyle);
    } else {
      lineTo(c, x, y, x + random.range(-1.2, 1.2) * s, y - random.range(2, 4.2) * s, rgba(random.chance(0.45 + 0.3 * light) ? S.grassLight : S.grassDark, 0.5), 0.9 * s);
    }
  }
  c.restore();
  // the Loom's warm pool on the summit
  softEllipse(c, DAIS.x, DAIS.y + 8, 300, 140, S.ground.warm, 0.22);
  ctx.drawImage(layer, 0, 0);
}

function paintPond(ctx, S, random) {
  const { x, y, rx, ry } = POND;
  softEllipse(ctx, x, y + 4, rx * 1.25, ry * 1.5, '#000000', 0.3);
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, shade(S.pond, 0.15));
  g.addColorStop(1, shade(S.pond, -0.45));
  fillEllipse(ctx, x, y, rx, ry, g);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.clip();
  // the sky in the water: the horizon colour pooled at the far edge, a few star glints
  const sky = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  sky.addColorStop(0, rgba(S.horizon, 0.35));
  sky.addColorStop(1, rgba(S.horizon, 0));
  ctx.fillStyle = sky;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  for (let i = 0; i < 9; i += 1) fillEllipse(ctx, x + random.range(-rx, rx) * 0.9, y + random.range(-ry, ry) * 0.8, 0.9, 0.6, 'rgba(255, 255, 255, 0.7)');
  if (S.snow) {
    for (let i = 0; i < 6; i += 1) {
      const a = random.range(-0.5, 0.5);
      const px = x + random.range(-rx, rx) * 0.8;
      const py = y + random.range(-ry, ry) * 0.7;
      lineTo(ctx, px, py, px + Math.cos(a) * 26, py + Math.sin(a) * 8, 'rgba(255, 255, 255, 0.4)', 0.8);
    }
  }
  ctx.restore();
  ctx.strokeStyle = rgba(S.snow ? S.snowColor : S.ground.lit, 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 1, ry + 1, 0, 0, TAU);
  ctx.stroke();
}

function paintForeground(ctx, S, random) {
  const layer = canvas(W, H + 120);
  const c = layer.getContext('2d');
  const mono = S.silhouette;
  const dim = (hex) => mix(hex, mono, 0.8);
  const M = { ...S, wall: mono, wallLit: mono, roof: mono, roofLit: mono, leaf: dim(S.leaf || mono), trunk: mono, leaves: (S.leaves || [mono]).map(dim), ice: dim(S.ice || mono), violet: dim(S.violet || mono), stone: mono, gold: mono, snow: false, ruined: false, window: mono, windowGlow: mono };
  const scratch = canvas(8, 8).getContext('2d');
  const scale = S.tree === 'autumn' ? 0.72 : 1;
  for (const spot of foregroundSpots(random)) paintTree(c, scratch, { ...spot, s: spot.s * scale, v: Math.min(spot.v, 0.41) + 0.5 }, M, random);
  blurOnto(ctx, layer, 1.3, { alpha: 0.96 });
  const foot = ctx.createLinearGradient(0, H - 70, 0, H);
  foot.addColorStop(0, rgba(S.vignette, 0));
  foot.addColorStop(1, rgba(S.vignette, 0.75));
  ctx.fillStyle = foot;
  ctx.fillRect(0, H - 70, W, 70);
}

function paintVignette(ctx, S) {
  const g = ctx.createRadialGradient(484, 300, 240, 484, 320, 760);
  g.addColorStop(0, rgba(S.vignette, 0));
  g.addColorStop(0.6, rgba(S.vignette, 0.16));
  g.addColorStop(1, rgba(S.vignette, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function paintHollowCracks(lights, S, random) {
  for (let i = 0; i < 11; i += 1) {
    let a = (i / 11) * TAU + random.range(-0.2, 0.2);
    let x = DAIS.x + Math.cos(a) * 140;
    let y = DAIS.y + Math.sin(a) * 64;
    const pts = [[x, y]];
    for (let k = 0; k < 6; k += 1) {
      a += random.range(-0.8, 0.8);
      const len = random.range(14, 36);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len * 0.5;
      if (!insideHill(x, y) || y < 236 || !clearOfVillage(x, y)) break;
      pts.push([x, y]);
    }
    if (pts.length < 3) continue;
    polygon(lights, pts, false);
    lights.strokeStyle = rgba(S.gold, 0.5);
    lights.lineWidth = 1.3;
    lights.stroke();
    const [fx, fy] = pts[Math.floor(pts.length / 2)];
    lineTo(lights, fx, fy, fx + Math.cos(a + 1.3) * 16, fy + Math.sin(a + 1.3) * 8, rgba(S.gold, 0.4), 1);
    for (const [px, py] of pts) glow(lights, px, py, 11, S.gold, 0.13, 0.1);
  }
}

const clearOfVillage = (x, y) => COTTAGES.every((c) => Math.hypot(c.x - x, c.y - y) > c.w * 1.1) && Math.hypot(WELL.x - x, WELL.y - y) > 30 && RACKS.every((r) => Math.hypot(r.x - x, r.y - y) > r.w * 0.7);

/** Paint realm `index`; returns { backdrop, lights }. The layout's randomness is re-seeded per realm so each realm's
 * trees share the same spots (the same village) while its sky, snow and grain differ. */
export function paintRealm(index, makeRandom, makeNoise) {
  const S = STYLES[index];
  const backdrop = canvas(W, H);
  const lights = canvas(W, H);
  const ctx = backdrop.getContext('2d');
  const L = lights.getContext('2d');
  const layoutRandom = makeRandom(9001);
  const layoutNoise = makeNoise(makeRandom(4242));
  const random = makeRandom(1301 + index * 977);
  const noise = makeNoise(makeRandom(777 + index));
  paintSky(ctx, S, random);
  if (index === 0) paintAurora(ctx, random, noise);
  if (index === 1) paintEmberSky(ctx, random, noise);
  if (index === 2) paintFrostSky(ctx, random);
  if (index === 3) paintHollowSky(ctx, random, noise);
  paintMountains(ctx, S, random, noise);
  paintValley(ctx, S, random, noise);
  paintGround(ctx, S, random, noise);
  paintCrestMist(ctx, S);
  ctx.save();
  hillPath(ctx);
  ctx.clip();
  paintPaths(ctx, S, layoutNoise);
  ctx.restore();
  paintPond(ctx, S, random);
  if (S.ruined) paintHollowCracks(L, S, random);
  const grow = S.tree === 'frozen' || S.tree === 'hollow' ? 1.28 : 1;
  const spots = treeSpots(layoutRandom, layoutNoise).filter((t) => Math.hypot((t.x - POND.x) / POND.rx, (t.y - POND.y) / POND.ry) > 1.25).map((t) => ({ ...t, s: t.s * grow }));
  const objects = [
    ...COTTAGES.map((c) => ({ y: c.y, draw: () => paintCottage(ctx, L, c, S, random, noise) })),
    ...spots.map((t) => ({ y: t.y, draw: () => paintTree(ctx, L, t, S, random) })),
    ...RACKS.map((r) => ({ y: r.y, draw: () => paintRack(ctx, L, r, S, random) })),
    { y: WELL.y, draw: () => paintWell(ctx, L, WELL, S) },
  ].sort((a, b) => a.y - b.y);
  for (const o of objects) o.draw();
  if (S.bulbs) {
    const ridges = COTTAGES.map((c) => cottageRidge(c));
    const posts = RACKS.map((r) => ({ x: r.x, y: r.y - 24 * perspective(r.y) }));
    for (const [a, b] of [[ridges[0], ridges[1]], [ridges[2], ridges[3]], [ridges[4], ridges[6]], [ridges[5], ridges[7]], [ridges[6], posts[0]], [ridges[7], posts[1]], [ridges[8], { x: WELL.x - 30, y: WELL.y - 30 }], [ridges[9], { x: WELL.x + 16, y: WELL.y - 32 }]]) {
      paintLanternString(ctx, L, a, b, S, random);
    }
  }
  if (S.tree === 'autumn') {
    // leaves fallen along the paths
    for (const path of PATHS) for (let i = 0; i < 26; i += 1) {
      const seg = path[Math.floor(random.next() * (path.length - 1))];
      fillEllipse(ctx, seg[0] + random.range(-26, 26), seg[1] + random.range(-10, 10), 1.3, 0.9, rgba(S.leaves[i % S.leaves.length], 0.6));
    }
  }
  paintForeground(ctx, S, random);
  paintVignette(ctx, S);
  return { backdrop, lights };
}

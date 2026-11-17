// What each void-moth is called and does, and how it is drawn (wings, ember eyes, a kind badge) in the field and as an icon.
import { MOTHS, PALETTE as P, WEAVE } from './config.js';
import { disc, drawSprite, lighter, line, makeGlowSprite, poly, ring } from './glow.js';

export const MOTH_INFO = {
  drifter: { name: 'Drifter', does: 'drifts at the Loom · bites 4', color: '#d9ccff' },
  dasher: { name: 'Dasher', does: 'aims, then lunges · bites 5', color: '#ff8a45' },
  splitter: { name: 'Splitter', does: 'sheds mites until caught · bites 6', color: '#ff6ad5' },
  mite: { name: 'Mite', does: 'small and quick · bites 1', color: '#d9ccff' },
  cutter: { name: 'Cutter', does: 'cuts your held thread · bites 4', color: '#ff5a5a' },
  phantom: { name: 'Phantom', does: 'fades out of loops · bites 5', color: '#b48cff' },
  warden: { name: 'Hex Warden', does: 'shields moths near it · bites 6', color: '#74f3ff' },
  eclipse: { name: 'Eclipse Moth', does: 'boss · 3 veils, 3 phases', color: '#ffd36b' },
  queen: { name: 'Hollow Queen', does: 'boss · 5 veils, lunges in Fury', color: '#ffd36b' },
};
export const MOTH_ORDER = ['eclipse', 'queen', 'warden', 'cutter', 'phantom', 'splitter', 'dasher', 'drifter', 'mite'];

// Each kind's wing ellipses as [x, y, rx, ry, rotation, fill, edge] in body radii (y flaps), and its head's [rx, ry, eye scale, eye glow, antennae].
const WINGS = {
  drifter: [[-0.55, 0.95, 0.72, 0.62, 0.25], [0.3, 1.15, 0.98, 0.78, -0.3]],
  dasher: [[-0.7, 0.75, 0.75, 0.34, -0.5, '#2a1050'], [-0.1, 1.25, 1.35, 0.42, -0.95, P.mothWing, '#ffb08a']],
  splitter: [[-0.6, 0.85, 0.8, 0.7, 0.3], [0.2, 1, 0.92, 0.9, -0.15, P.mothWing, '#ff9ae6']],
  mite: [[-0.1, 1, 0.7, 0.55, -0.2]],
  phantom: [[-0.4, 0.9, 1.2, 0.5, -0.6, 'rgba(120, 80, 220, 0.75)', '#d8c4ff'], [0.2, 1.2, 0.8, 0.6, -0.2, 'rgba(160, 120, 255, 0.7)', '#ffffff']],
  warden: [[-0.5, 0.9, 0.9, 0.75, 0.2, '#1e3a6a', P.cyan], [0.35, 1.1, 0.95, 0.8, -0.25, '#24487a', P.cyan]],
};
const HEADS = { drifter: [], dasher: [1.15, 0.42], splitter: [1, 0.7, 0.9], mite: [1, 0.6, 1.1, 1, false], phantom: [1, 0.42, 1, 1.2], warden: [1, 0.6, 0.9, 1, false] };
const CUTTER_WING = [[0.4, 0.15], [1.05, 0.9], [0.75, 1.05], [1.25, 1.7], [0.55, 1.5], [0.35, 2.05], [-0.1, 1.45], [-0.6, 1.7], [-0.5, 0.95], [-1, 0.7], [-0.35, 0.2]];
const DRAW_SCALE = 1.25;
const hex = (r) => Array.from({ length: 6 }, (_, i) => ({ x: Math.cos((i * Math.PI) / 3) * r, y: Math.sin((i * Math.PI) / 3) * r }));
let sprites = null;

export function drawMoth(ctx, moth, time) {
  if (!sprites) {
    sprites = {
      aura: makeGlowSprite(P.mothAura, 40, 0.3), eye: makeGlowSprite(P.ember, 14, 0.15), burn: makeGlowSprite(P.emberGlow, 48, 0.05),
      corona: makeGlowSprite(P.gold, 140, 0.02), belly: makeGlowSprite(P.ember, 30, 0.1), shield: makeGlowSprite(P.cyan, 60, 0.02),
    };
  }
  const flap = 0.5 + 0.5 * Math.abs(Math.sin(moth.flap));
  ctx.save();
  ctx.translate(moth.x, moth.y);
  if (moth.kind === 'warden') drawShieldRing(ctx, time);
  ctx.globalAlpha *= moth.visible;
  drawSprite(ctx, sprites.aura, 0, 0, (moth.radius / 40) * 3.6, 0.85);
  ctx.rotate(moth.heading + (moth.stun > 0 ? Math.sin(time * 30) * 0.25 : 0));
  if (moth.burn > 0) glowSprite(ctx, sprites.burn, 0, 0, (moth.radius / 15) * 1.4, Math.min(1, moth.burn / (moth.kind === 'cutter' ? WEAVE.cutterBurnSeconds : WEAVE.burnSeconds)) * 0.9);
  if (moth.boss) drawBossBody(ctx, moth, flap, time);
  else {
    ctx.scale(DRAW_SCALE, DRAW_SCALE);
    if (moth.kind === 'cutter') drawCutter(ctx, moth, flap, time);
    else drawBody(ctx, moth, flap, time);
  }
  ctx.restore();
  ctx.save();
  if (moth.visible < 0.6) ring(ctx, moth.x, moth.y, moth.radius * 1.3, 'rgba(180, 140, 255, 0.7)', 2, [5, 6]);
  if (moth.state === 'aim') {
    lighter(ctx);
    ctx.strokeStyle = 'rgba(255, 70, 50, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    line(ctx, moth.x, moth.y, moth.aimX, moth.aimY);
    ctx.setLineDash([]);
  }
  if (moth.pinned > 0) {
    ctx.strokeStyle = P.goldLight;
    ctx.lineWidth = 3;
    ctx.shadowColor = P.gold;
    ctx.shadowBlur = 10;
    line(ctx, moth.x + 16, moth.y - moth.radius - 20, moth.x, moth.y);
    ctx.fillStyle = P.gold;
    disc(ctx, moth.x + 16, moth.y - moth.radius - 20, 4.5);
  }
  if (!moth.boss && moth.kind !== 'mite' && moth.visible > 0.6) drawBadge(ctx, moth);
  ctx.restore();
}

function drawBadge(ctx, moth) {
  const { color } = MOTH_INFO[moth.kind];
  const r = moth.radius * DRAW_SCALE;
  const x = moth.x + r * 0.95;
  const y = moth.y - r * 0.95;
  ctx.fillStyle = 'rgba(12, 6, 32, 0.85)';
  disc(ctx, x, y, 8);
  ring(ctx, x, y, 8, color, 1.6);
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  if (moth.kind === 'dasher') {
    poly(ctx, [{ x: x - 3, y: y - 4 }, { x: x + 2.5, y }, { x: x - 3, y: y + 4 }], false);
    ctx.stroke();
  } else if (moth.kind === 'splitter') for (const [dx, dy] of [[-3.5, 1.5], [3.5, 1.5], [0, -3]]) disc(ctx, x + dx, y + dy, 1.8);
  else if (moth.kind === 'cutter') {
    line(ctx, x - 3.5, y - 3.5, x + 3.5, y + 3.5);
    line(ctx, x + 3.5, y - 3.5, x - 3.5, y + 3.5);
  } else if (moth.kind === 'phantom') ring(ctx, x, y, 4, color, 1.6, [2, 2]);
  else if (moth.kind === 'warden') {
    poly(ctx, hex(4.5).map((p) => ({ x: x + p.x, y: y + p.y })));
    ctx.stroke();
  } else disc(ctx, x, y, 2.5);
}

export function drawMothIcon(ctx, kind, x, y, size, time) {
  const spec = MOTHS[kind];
  const boss = kind === 'eclipse' || kind === 'queen';
  const moth = { kind, x: 0, y: 0, radius: spec.radius, heading: -Math.PI / 2, flap: time * 4 + size, state: 'drift', stun: 0, pinned: 0, burn: 0, visible: 1, boss, veils: kind === 'queen' ? 5 : 3, maxVeils: 5 };
  ctx.save();
  ctx.translate(x, y);
  const scale = size / (spec.radius * (boss ? 3.4 : 3.1));
  ctx.scale(scale, scale);
  drawMoth(ctx, moth, time);
  ctx.restore();
}

function wing(ctx, x, y, rx, ry, rotation, fill = P.mothWing, edge = P.mothEdge) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function glowSprite(ctx, sprite, x, y, scale, alpha) {
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprite, x, y, scale, alpha);
  ctx.restore();
}

function drawEyes(ctx, ex, ey, size, glow = 1) {
  glowSprite(ctx, sprites.eye, ex, -ey, (size / 14) * 3.4, glow);
  glowSprite(ctx, sprites.eye, ex, ey, (size / 14) * 3.4, glow);
  for (const [fill, dx, r] of [['#ff6a3c', 0, size], ['#fff1c4', size * 0.25, size * 0.4]]) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(ex + dx, -ey, r, 0, Math.PI * 2);
    ctx.arc(ex + dx, ey, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHead(ctx, r, rx = 0.95, ry = 0.5, eyeScale = 1, eyeGlow = 1, antennae = true) {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * rx, r * ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = P.mothBody;
  ctx.fill();
  ctx.strokeStyle = P.mothEdge;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(140, 90, 200, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, 0, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  if (antennae) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.2);
    ctx.quadraticCurveTo(r * 1.3, -r * 0.6, r * 1.5, -r);
    ctx.moveTo(r * 0.6, r * 0.2);
    ctx.quadraticCurveTo(r * 1.3, r * 0.6, r * 1.5, r);
    ctx.stroke();
  }
  drawEyes(ctx, r * 0.5, r * 0.34, r * 0.2 * eyeScale, eyeGlow);
}

function bothWings(ctx, draw) {
  draw();
  ctx.save();
  ctx.scale(1, -1);
  draw();
  ctx.restore();
}

function drawBody(ctx, moth, flap, time) {
  const r = moth.radius;
  const kind = moth.kind;
  const fold = kind === 'dasher' && moth.state !== 'drift' ? 0.55 : 1;
  bothWings(ctx, () => {
    for (const [x, y, rx, ry, rotation, fill, edge] of WINGS[kind]) wing(ctx, r * x, r * y * flap * fold, r * rx, r * ry, rotation, fill, edge);
    if (kind === 'drifter') ring(ctx, r * 0.45, r * 1.25 * flap, r * 0.26, 'rgba(116, 243, 255, 0.8)');
  });
  const head = HEADS[kind].slice();
  if (kind === 'dasher') head.push(moth.state === 'aim' ? 1.5 : 1.1, moth.state === 'aim' ? 1.6 : 1);
  drawHead(ctx, r, ...head);
  if (kind === 'splitter') {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5 + moth.flap * 0.1);
    glowSprite(ctx, sprites.belly, -r * 0.1, 0, (r / 30) * 1.6, 0.35 + 0.45 * pulse);
    ctx.fillStyle = `rgba(255, 90, 50, ${0.5 + 0.4 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, 0, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'warden') {
    ctx.strokeStyle = P.cyan;
    ctx.lineWidth = 2;
    poly(ctx, hex(r * 0.38));
    ctx.stroke();
  }
}

function drawCutter(ctx, moth, flap, time) {
  const r = moth.radius;
  bothWings(ctx, () => {
    poly(ctx, CUTTER_WING.map(([px, py]) => ({ x: px * r, y: py * r * (py > 0.3 ? flap : 1) })));
    ctx.fillStyle = '#2c0f3e';
    ctx.fill();
    ctx.strokeStyle = '#ff8c8c';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  });
  const chewing = moth.state === 'chew';
  drawHead(ctx, r, 1.05, 0.45, 0.85, chewing ? 1.5 : 1, false);
  ctx.strokeStyle = chewing ? `rgba(255, 120, 90, ${0.6 + 0.4 * Math.sin(time * 40)})` : 'rgba(255, 220, 220, 0.9)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  const open = chewing ? 0.35 + 0.25 * Math.sin(time * 30) : 0.45;
  line(ctx, r * 0.8, -r * 0.25, r * 1.55, -r * open);
  line(ctx, r * 0.8, r * 0.25, r * 1.55, r * open);
}

function drawShieldRing(ctx, time) {
  const radius = MOTHS.warden.shieldRadius;
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.shield, 0, 0, (radius / 60) * 1.9, 0.35);
  ctx.rotate(time * 0.3);
  ctx.strokeStyle = 'rgba(116, 243, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -time * 30;
  poly(ctx, hex(radius));
  ctx.stroke();
  ctx.restore();
}

function drawBossBody(ctx, moth, flap, time) {
  const r = moth.radius;
  const w = MOTHS[moth.kind].radius;
  const queen = moth.kind === 'queen';
  bothWings(ctx, () => {
    wing(ctx, -w * 0.6, w * 1.05 * flap, w * 1.1, w * 0.9, 0.35, queen ? '#3a1a6a' : '#140820', queen ? '#ff9ae6' : '#8a5ad0');
    wing(ctx, w * 0.3, w * 1.45 * flap, w * 1.5, w * 1.05, -0.3, queen ? '#4a2484' : '#1a0c2c', queen ? '#ffd0f4' : '#a06ae8');
    ctx.fillStyle = queen ? 'rgba(255, 106, 213, 0.3)' : 'rgba(180, 140, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, w * 1.6 * flap, w * 0.4, w * 0.26, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.1);
  ctx.save();
  lighter(ctx);
  drawSprite(ctx, sprites.corona, 0, 0, (r / 64) * 2.3, 0.45 + 0.25 * pulse);
  for (let i = 0; i < moth.veils; i += 1) ring(ctx, 0, 0, r + 16 + i * 13, queen ? `rgba(255, 106, 213, ${0.6 - i * 0.07})` : `rgba(180, 140, 255, ${0.6 - i * 0.08})`, 3, [14, 10], time * (18 + i * 6) * (i % 2 === 0 ? 1 : -1));
  ctx.restore();
  ctx.fillStyle = queen ? '#efe4ff' : '#05020a';
  disc(ctx, 0, 0, r);
  if (queen) {
    ctx.fillStyle = '#5a2a9a';
    poly(ctx, Array.from({ length: 14 }, (_, i) => ({ x: Math.cos((i * Math.PI) / 7) * r * (i % 2 ? 0.9 : 1.25), y: Math.sin((i * Math.PI) / 7) * r * (i % 2 ? 0.9 : 1.25) })));
    ctx.fill();
    ctx.fillStyle = '#efe4ff';
    disc(ctx, 0, 0, r * 0.86);
  }
  ctx.save();
  lighter(ctx);
  ctx.shadowColor = P.gold;
  ctx.shadowBlur = 26;
  ring(ctx, 0, 0, r + 1, `rgba(255, 211, 107, ${0.75 + 0.25 * pulse})`, 5);
  ctx.restore();
  drawEyes(ctx, r * 0.42, r * 0.3, r * 0.13, 1.4);
}

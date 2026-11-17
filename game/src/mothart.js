// What each void-moth is called and does, and how it looks (violet wings, pale outline, ember eyes) in the field and as a HUD icon.
import { LOOM, MOTHS, PALETTE } from './config.js';
import { drawSprite, makeGlowSprite } from './glow.js';

export const MOTH_INFO = {
  drifter: { name: 'Drifter', does: 'wanders toward you', color: '#d9ccff' },
  dasher: { name: 'Dasher', does: 'aims, then lunges', color: '#ff8a45' },
  splitter: { name: 'Splitter', does: 'sheds mites until caught', color: '#ff6ad5' },
  mite: { name: 'Mite', does: 'small and quick', color: '#d9ccff' },
  cutter: { name: 'Cutter', does: 'cuts your held thread', color: '#ff5a5a' },
  phantom: { name: 'Phantom', does: 'fades out of loops', color: '#b48cff' },
  warden: { name: 'Hex Warden', does: 'shields moths near it', color: '#74f3ff' },
  eclipse: { name: 'Eclipse Moth', does: 'boss · 3 veils, 3 phases', color: '#ffd36b' },
  queen: { name: 'Hollow Queen', does: 'boss · 5 veils, lunges in Fury', color: '#ffd36b' },
};
export const MOTH_ORDER = ['eclipse', 'queen', 'warden', 'cutter', 'phantom', 'splitter', 'dasher', 'drifter', 'mite'];

const DRAW_SCALE = 1.25;
let sprites = null;

function dashedCircle(ctx, x, y, r, color, width, dash, offset = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.lineDashOffset = offset;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw `moth` at its place in the world; `time` drives pulses and flickers. */
export function drawMoth(ctx, moth, time) {
  if (!sprites) {
    sprites = {
      aura: makeGlowSprite(PALETTE.mothAura, 40, 0.3), eye: makeGlowSprite(PALETTE.ember, 14, 0.15), burn: makeGlowSprite(PALETTE.emberGlow, 48, 0.05),
      corona: makeGlowSprite(PALETTE.gold, 140, 0.02), belly: makeGlowSprite(PALETTE.ember, 30, 0.1), shield: makeGlowSprite(PALETTE.cyan, 60, 0.02),
    };
  }
  if (moth.wake.length > 1) drawDashWake(ctx, moth);
  const flap = 0.5 + 0.5 * Math.abs(Math.sin(moth.flap));
  ctx.save();
  ctx.translate(moth.x, moth.y);
  if (moth.kind === 'warden') drawShieldRing(ctx, time);
  ctx.globalAlpha *= moth.visible;
  drawSprite(ctx, sprites.aura, 0, 0, (moth.radius / 40) * 3.6, 0.85);
  ctx.rotate(moth.heading + (moth.stun > 0 ? Math.sin(time * 30) * 0.25 : 0));
  if (moth.burn > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, sprites.burn, 0, 0, (moth.radius / 15) * 1.4, Math.min(1, moth.burn / (moth.kind === 'cutter' ? LOOM.cutterBurnSeconds : LOOM.burnSeconds)) * 0.9);
    ctx.restore();
  }
  if (!moth.boss) ctx.scale(DRAW_SCALE, DRAW_SCALE);
  switch (moth.kind) {
    case 'dasher': drawDasher(ctx, moth, flap); break;
    case 'splitter': drawSplitter(ctx, moth, flap, time); break;
    case 'mite': drawMite(ctx, moth, flap); break;
    case 'cutter': drawCutter(ctx, moth, flap, time); break;
    case 'phantom': drawPhantom(ctx, moth, flap); break;
    case 'warden': drawWarden(ctx, moth, flap); break;
    case 'eclipse': case 'queen': drawBossBody(ctx, moth, flap, time); break;
    default: drawDrifter(ctx, moth, flap); break;
  }
  ctx.restore();
  ctx.save();
  if (moth.visible < 0.6) dashedCircle(ctx, moth.x, moth.y, moth.radius * 1.3, 'rgba(180, 140, 255, 0.7)', 2, [5, 6]);
  if (moth.state === 'aim') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 70, 50, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(moth.x, moth.y);
    ctx.lineTo(moth.aimX, moth.aimY);
    ctx.stroke();
  }
  ctx.restore();
}

/** A moth of `kind` facing up, fitted into a `size` box centred on (x, y), for the HUD and the bestiary. */
export function drawMothIcon(ctx, kind, x, y, size, time) {
  const spec = MOTHS[kind];
  const boss = kind === 'eclipse' || kind === 'queen';
  const moth = { kind, x: 0, y: 0, radius: spec.radius, heading: -Math.PI / 2, flap: time * 4 + size, state: 'drift', stun: 0, burn: 0, visible: 1, wake: [], boss, veils: kind === 'queen' ? 5 : 3, maxVeils: 5 };
  ctx.save();
  ctx.translate(x, y);
  const scale = size / (spec.radius * (boss ? 3.4 : 3.1));
  ctx.scale(scale, scale);
  drawMoth(ctx, moth, time);
  ctx.restore();
}

function wing(ctx, x, y, rx, ry, rotation, fill = PALETTE.mothWing, edge = PALETTE.mothEdge) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function drawEyes(ctx, ex, ey, size, glow = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.eye, ex, -ey, (size / 14) * 3.4, glow);
  drawSprite(ctx, sprites.eye, ex, ey, (size / 14) * 3.4, glow);
  ctx.restore();
  ctx.fillStyle = '#ff6a3c';
  ctx.beginPath();
  ctx.arc(ex, -ey, size, 0, Math.PI * 2);
  ctx.arc(ex, ey, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1c4';
  ctx.beginPath();
  ctx.arc(ex + size * 0.25, -ey, size * 0.4, 0, Math.PI * 2);
  ctx.arc(ex + size * 0.25, ey, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(ctx, r, rx = 0.95, ry = 0.5, eyeScale = 1, eyeGlow = 1, antennae = true) {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * rx, r * ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.mothBody;
  ctx.fill();
  ctx.strokeStyle = PALETTE.mothEdge;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(140, 90, 200, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, 0, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  if (antennae) {
    ctx.strokeStyle = PALETTE.mothEdge;
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

function drawDrifter(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wing(ctx, -r * 0.55, r * 0.95 * flap, r * 0.72, r * 0.62, 0.25);
    wing(ctx, r * 0.3, r * 1.15 * flap, r * 0.98, r * 0.78, -0.3);
    ctx.strokeStyle = 'rgba(116, 243, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r * 0.45, r * 1.25 * flap, r * 0.26, 0, Math.PI * 2);
    ctx.stroke();
  });
  drawHead(ctx, r);
}

function drawDasher(ctx, moth, flap) {
  const r = moth.radius;
  const fold = moth.state === 'drift' ? 1 : 0.55;
  bothWings(ctx, () => {
    wing(ctx, -r * 0.7, r * 0.75 * flap * fold, r * 0.75, r * 0.34, -0.5, '#2a1050');
    wing(ctx, -r * 0.1, r * 1.25 * flap * fold, r * 1.35, r * 0.42, -0.95, PALETTE.mothWing, '#ffb08a');
  });
  drawHead(ctx, r, 1.15, 0.42, moth.state === 'aim' ? 1.5 : 1.1, moth.state === 'aim' ? 1.6 : 1);
}

function drawSplitter(ctx, moth, flap, time) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wing(ctx, -r * 0.6, r * 0.85 * flap, r * 0.8, r * 0.7, 0.3);
    wing(ctx, r * 0.2, r * flap, r * 0.92, r * 0.9, -0.15, PALETTE.mothWing, '#ff9ae6');
  });
  drawHead(ctx, r, 1, 0.7, 0.9);
  const pulse = 0.5 + 0.5 * Math.sin(time * 5 + moth.flap * 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.belly, -r * 0.1, 0, (r / 30) * 1.6, 0.35 + 0.45 * pulse);
  ctx.restore();
  ctx.fillStyle = `rgba(255, 90, 50, ${0.5 + 0.4 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, 0, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMite(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => wing(ctx, -r * 0.1, r * flap, r * 0.7, r * 0.55, -0.2));
  drawHead(ctx, r, 1, 0.6, 1.1, 1, false);
}

function drawCutter(ctx, moth, flap, time) {
  const r = moth.radius;
  const f = flap;
  const points = [[0.4, 0.15], [1.05, 0.9 * f], [0.75, 1.05 * f], [1.25, 1.7 * f], [0.55, 1.5 * f], [0.35, 2.05 * f], [-0.1, 1.45 * f], [-0.6, 1.7 * f], [-0.5, 0.95 * f], [-1, 0.7 * f], [-0.35, 0.2]];
  bothWings(ctx, () => {
    ctx.beginPath();
    for (const [px, py] of points) ctx.lineTo(px * r, py * r);
    ctx.closePath();
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
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.25);
  ctx.lineTo(r * 1.55, -r * open);
  ctx.moveTo(r * 0.8, r * 0.25);
  ctx.lineTo(r * 1.55, r * open);
  ctx.stroke();
}

function drawPhantom(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wing(ctx, -r * 0.4, r * 0.9 * flap, r * 1.2, r * 0.5, -0.6, 'rgba(120, 80, 220, 0.75)', '#d8c4ff');
    wing(ctx, r * 0.2, r * 1.2 * flap, r * 0.8, r * 0.6, -0.2, 'rgba(160, 120, 255, 0.7)', '#ffffff');
  });
  drawHead(ctx, r, 1, 0.42, 1, 1.2);
}

function drawWarden(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wing(ctx, -r * 0.5, r * 0.9 * flap, r * 0.9, r * 0.75, 0.2, '#1e3a6a', PALETTE.cyan);
    wing(ctx, r * 0.35, r * 1.1 * flap, r * 0.95, r * 0.8, -0.25, '#24487a', PALETTE.cyan);
  });
  drawHead(ctx, r, 1, 0.6, 0.9, 1, false);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) ctx.lineTo(Math.cos((i * Math.PI) / 3) * r * 0.38, Math.sin((i * Math.PI) / 3) * r * 0.38);
  ctx.closePath();
  ctx.stroke();
}

function drawShieldRing(ctx, time) {
  const radius = MOTHS.warden.shieldRadius;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.shield, 0, 0, (radius / 60) * 1.9, 0.35);
  ctx.strokeStyle = 'rgba(116, 243, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -time * 30;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) ctx.lineTo(Math.cos((i * Math.PI) / 3 + time * 0.3) * radius, Math.sin((i * Math.PI) / 3 + time * 0.3) * radius);
  ctx.closePath();
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
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.corona, 0, 0, (r / 64) * 2.3, 0.45 + 0.25 * pulse);
  for (let i = 0; i < moth.veils; i += 1) {
    dashedCircle(ctx, 0, 0, r + 16 + i * 13, queen ? `rgba(255, 106, 213, ${0.6 - i * 0.07})` : `rgba(180, 140, 255, ${0.6 - i * 0.08})`, 3, [14, 10], time * (18 + i * 6) * (i % 2 === 0 ? 1 : -1));
  }
  ctx.restore();
  ctx.fillStyle = queen ? '#efe4ff' : '#05020a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (queen) {
    ctx.fillStyle = '#5a2a9a';
    ctx.beginPath();
    for (let i = 0; i < 14; i += 1) ctx.lineTo(Math.cos((i * Math.PI) / 7) * r * (i % 2 ? 0.9 : 1.25), Math.sin((i * Math.PI) / 7) * r * (i % 2 ? 0.9 : 1.25));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#efe4ff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 211, 107, ${0.75 + 0.25 * pulse})`;
  ctx.lineWidth = 5;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawEyes(ctx, r * 0.42, r * 0.3, r * 0.13, 1.4);
}

function drawDashWake(ctx, moth) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < moth.wake.length; i += 1) {
    const t = i / moth.wake.length;
    ctx.strokeStyle = `rgba(255, 70, 60, ${0.5 * t})`;
    ctx.lineWidth = (2 + 8 * t) * (moth.boss ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(moth.wake[i - 1].x, moth.wake[i - 1].y);
    ctx.lineTo(moth.wake[i].x, moth.wake[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

// How each void-moth looks: dark wings and bodies with ember-red eyes, drawn head-first along the
// heading. Drifters are round-winged, dashers swept, splitters bloated with a glowing belly, mites
// tiny, cutters jagged with mandibles, and the Eclipse Moth a black disc in a golden corona.
import { LOOM, MOTHS, PALETTE } from './config.js';
import { drawSprite, makeGlowSprite } from './glow.js';

let sprites = null;

/** Draw `moth` at its place in the world; `time` drives pulses and flickers. */
export function drawMoth(ctx, moth, time) {
  ensureSprites();
  if (moth.kind === 'dasher') drawDashWake(ctx, moth);
  const flap = 0.5 + 0.5 * Math.abs(Math.sin(moth.flap));
  ctx.save();
  ctx.translate(moth.x, moth.y);
  const auraScale = moth.kind === 'eclipse' ? (moth.radius / 40) * 3.2 : (moth.radius / 40) * 3.4;
  drawSprite(ctx, sprites.aura, 0, 0, auraScale, moth.kind === 'eclipse' ? 0.9 : 0.8);
  ctx.rotate(moth.heading + (moth.stun > 0 ? Math.sin(time * 30) * 0.25 : 0));
  if (moth.burn > 0) {
    const needed = moth.kind === 'cutter' ? LOOM.cutterBurnSeconds : LOOM.burnSeconds;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, sprites.burn, 0, 0, (moth.radius / 15) * 1.4, Math.min(1, moth.burn / needed) * 0.9);
    ctx.restore();
  }
  switch (moth.kind) {
    case 'dasher': drawDasher(ctx, moth, flap); break;
    case 'splitter': drawSplitter(ctx, moth, flap, time); break;
    case 'mite': drawMite(ctx, moth, flap); break;
    case 'cutter': drawCutter(ctx, moth, flap, time); break;
    case 'eclipse': drawEclipse(ctx, moth, flap, time); break;
    default: drawDrifter(ctx, moth, flap); break;
  }
  ctx.restore();
  if (moth.kind === 'dasher' && moth.state === 'aim') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 60, 40, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(moth.x, moth.y);
    ctx.lineTo(moth.aimX, moth.aimY);
    ctx.stroke();
    ctx.restore();
  }
}

function ensureSprites() {
  if (sprites) return;
  sprites = {
    aura: makeGlowSprite(PALETTE.mothAura, 40, 0.3),
    eye: makeGlowSprite(PALETTE.ember, 14, 0.15),
    eyeBig: makeGlowSprite(PALETTE.ember, 40, 0.12),
    burn: makeGlowSprite(PALETTE.emberGlow, 48, 0.05),
    corona: makeGlowSprite(PALETTE.gold, 140, 0.02),
    belly: makeGlowSprite(PALETTE.ember, 30, 0.1),
    veil: makeGlowSprite(PALETTE.violet, 120, 0.02),
  };
}

/** A wing as a rotated ellipse; mirrored for the other side by the caller. */
function wingEllipse(ctx, x, y, rx, ry, rotation) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.closePath();
}

/** Fill and edge the current wing path. */
function paintWing(ctx, fill = PALETTE.mothWing, edge = PALETTE.mothEdge) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Two ember eyes at the head. */
function drawEyes(ctx, r, scale = 1, glow = 1) {
  const ex = r * 0.5;
  const ey = r * 0.32;
  const size = r * 0.17 * scale;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.eye, ex, -ey, (size / 14) * 3.2, 0.9 * glow);
  drawSprite(ctx, sprites.eye, ex, ey, (size / 14) * 3.2, 0.9 * glow);
  ctx.restore();
  ctx.fillStyle = '#ff7a4a';
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

function drawAntennae(ctx, r) {
  ctx.strokeStyle = PALETTE.mothEdge;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -r * 0.2);
  ctx.quadraticCurveTo(r * 1.3, -r * 0.6, r * 1.5, -r * 1.0);
  ctx.moveTo(r * 0.6, r * 0.2);
  ctx.quadraticCurveTo(r * 1.3, r * 0.6, r * 1.5, r * 1.0);
  ctx.stroke();
}

function drawBody(ctx, r, rx = 0.95, ry = 0.5) {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * rx, r * ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.mothBody;
  ctx.fill();
  ctx.strokeStyle = PALETTE.mothEdge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(80, 40, 110, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, 0, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Both wings from one right-wing drawing function. */
function bothWings(ctx, draw) {
  draw(1);
  ctx.save();
  ctx.scale(1, -1);
  draw(-1);
  ctx.restore();
}

function drawDrifter(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wingEllipse(ctx, -r * 0.55, r * 0.95 * flap, r * 0.72, r * 0.62, 0.25);
    paintWing(ctx);
    wingEllipse(ctx, r * 0.3, r * 1.15 * flap, r * 0.98, r * 0.78, -0.3);
    paintWing(ctx);
    ctx.strokeStyle = 'rgba(162, 123, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r * 0.45, r * 1.25 * flap, r * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(116, 243, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(r * 0.45, r * 1.25 * flap, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  drawBody(ctx, r);
  drawAntennae(ctx, r);
  drawEyes(ctx, r);
}

function drawDasher(ctx, moth, flap) {
  const r = moth.radius;
  const fold = moth.state === 'aim' ? 0.5 : moth.state === 'dash' ? 0.55 : 1;
  bothWings(ctx, () => {
    wingEllipse(ctx, -r * 0.7, r * 0.75 * flap * fold, r * 0.75, r * 0.34, -0.5);
    paintWing(ctx, '#1a0c2c');
    wingEllipse(ctx, -r * 0.1, r * 1.25 * flap * fold, r * 1.35, r * 0.42, -0.95);
    paintWing(ctx, PALETTE.mothWing, '#4b2a6a');
  });
  drawBody(ctx, r, 1.15, 0.42);
  drawAntennae(ctx, r);
  drawEyes(ctx, r, moth.state === 'aim' ? 1.5 : 1.1, moth.state === 'aim' ? 1.6 : 1);
}

function drawSplitter(ctx, moth, flap, time) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wingEllipse(ctx, -r * 0.6, r * 0.85 * flap, r * 0.8, r * 0.7, 0.3);
    paintWing(ctx);
    wingEllipse(ctx, r * 0.2, r * 1.0 * flap, r * 0.92, r * 0.9, -0.15);
    paintWing(ctx);
  });
  drawBody(ctx, r, 1.0, 0.7);
  const pulse = 0.5 + 0.5 * Math.sin(time * 5 + moth.flap * 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.belly, -r * 0.1, 0, (r / 30) * 1.6, 0.35 + 0.45 * pulse);
  ctx.restore();
  ctx.fillStyle = `rgba(255, 90, 50, ${0.5 + 0.4 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, 0, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  drawAntennae(ctx, r);
  drawEyes(ctx, r, 0.9);
  drawEyesSmallPair(ctx, r);
}

function drawEyesSmallPair(ctx, r) {
  ctx.fillStyle = '#ff6a3c';
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.5, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.25, r * 0.5, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawMite(ctx, moth, flap) {
  const r = moth.radius;
  bothWings(ctx, () => {
    wingEllipse(ctx, -r * 0.1, r * 1.0 * flap, r * 0.7, r * 0.55, -0.2);
    paintWing(ctx);
  });
  drawBody(ctx, r, 1.0, 0.6);
  drawEyes(ctx, r, 1.1);
}

/** The cutter: jagged wings and two pale mandibles that flash while it chews. */
function drawCutter(ctx, moth, flap, time) {
  const r = moth.radius;
  bothWings(ctx, () => {
    ctx.beginPath();
    const f = flap;
    const points = [
      [0.4, 0.15], [1.05, 0.9 * f], [0.75, 1.05 * f], [1.25, 1.7 * f], [0.55, 1.5 * f], [0.35, 2.05 * f],
      [-0.1, 1.45 * f], [-0.6, 1.7 * f], [-0.5, 0.95 * f], [-1.0, 0.7 * f], [-0.35, 0.2],
    ];
    points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px * r, py * r) : ctx.lineTo(px * r, py * r)));
    ctx.closePath();
    paintWing(ctx, '#170a26', '#5a2a4a');
  });
  drawBody(ctx, r, 1.05, 0.45);
  const chewing = moth.state === 'chew';
  const flash = chewing ? 0.6 + 0.4 * Math.sin(time * 40) : 0.75;
  ctx.strokeStyle = `rgba(255, ${chewing ? 120 : 200}, ${chewing ? 90 : 190}, ${flash})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const open = chewing ? 0.35 + 0.25 * Math.sin(time * 30) : 0.45;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.25);
  ctx.lineTo(r * 1.55, -r * open);
  ctx.moveTo(r * 0.8, r * 0.25);
  ctx.lineTo(r * 1.55, r * open);
  ctx.stroke();
  drawEyes(ctx, r, 0.85, chewing ? 1.5 : 1);
}

/** The Eclipse Moth: a black disc with a golden corona, ringed by the veils still to be stripped. */
function drawEclipse(ctx, moth, flap, time) {
  const r = moth.radius;
  const wingR = MOTHS.eclipse.radius;
  bothWings(ctx, () => {
    wingEllipse(ctx, -wingR * 0.6, wingR * 1.05 * flap, wingR * 1.1, wingR * 0.9, 0.35);
    paintWing(ctx, '#0d0616', '#3d1f5a');
    wingEllipse(ctx, wingR * 0.3, wingR * 1.45 * flap, wingR * 1.5, wingR * 1.05, -0.3);
    paintWing(ctx, '#140a20', '#4a2470');
    ctx.fillStyle = 'rgba(162, 123, 255, 0.16)';
    ctx.beginPath();
    ctx.ellipse(wingR * 0.55, wingR * 1.6 * flap, wingR * 0.4, wingR * 0.26, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.corona, 0, 0, (r / 64) * 2.3, 0.45 + 0.25 * pulse);
  for (let i = 0; i < moth.veils; i += 1) {
    const ring = r + 16 + i * 13;
    ctx.strokeStyle = `rgba(162, 123, 255, ${0.5 - i * 0.06})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = time * (18 + i * 6) * (i % 2 === 0 ? 1 : -1);
    ctx.beginPath();
    ctx.arc(0, 0, ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  ctx.fillStyle = '#05020a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 211, 107, ${0.75 + 0.25 * pulse})`;
  ctx.lineWidth = 5;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 245, 220, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, sprites.eyeBig, r * 0.42, -r * 0.3, (r / 64) * 1.6, 0.9);
  drawSprite(ctx, sprites.eyeBig, r * 0.42, r * 0.3, (r / 64) * 1.6, 0.9);
  ctx.restore();
  ctx.fillStyle = '#ff6a3c';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.3, r * 0.13, 0, Math.PI * 2);
  ctx.arc(r * 0.42, r * 0.3, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1c4';
  ctx.beginPath();
  ctx.arc(r * 0.46, -r * 0.3, r * 0.05, 0, Math.PI * 2);
  ctx.arc(r * 0.46, r * 0.3, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

/** The streak a dasher leaves while lunging, drawn in world space before the moth. */
export function drawDashWake(ctx, moth) {
  if (moth.wake.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < moth.wake.length; i += 1) {
    const t = i / moth.wake.length;
    ctx.strokeStyle = `rgba(255, 70, 60, ${0.5 * t})`;
    ctx.lineWidth = 2 + 8 * t;
    ctx.beginPath();
    ctx.moveTo(moth.wake[i - 1].x, moth.wake[i - 1].y);
    ctx.lineTo(moth.wake[i].x, moth.wake[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

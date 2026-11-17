// A line icon for every thread upgrade and relic, drawn inside a `size` box centred on (x, y).
import { PALETTE } from '../config.js';
import { heartPath, sparklePath } from '../glow.js';

function ring(ctx, r, dash = null) {
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the icon of card `id`. */
export function drawUpgradeIcon(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.gold;
  ctx.fillStyle = PALETTE.gold;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = size * 0.25;
  switch (id) {
    case 'reach':
      ring(ctx, s * 0.9, [6, 6]);
      disc(ctx, 0, 0, s * 0.18);
      line(ctx, s * 0.25, 0, s * 0.85, 0);
      line(ctx, s * 0.65, -s * 0.2, s * 0.85, 0);
      line(ctx, s * 0.65, s * 0.2, s * 0.85, 0);
      break;
    case 'swift':
      disc(ctx, s * 0.35, 0, s * 0.3);
      for (let i = -1; i <= 1; i += 1) line(ctx, s * 0.1, i * s * 0.28, -s * (0.9 - Math.abs(i) * 0.3), i * s * 0.28);
      break;
    case 'ember':
      ctx.fillStyle = PALETTE.emberGlow;
      ctx.shadowColor = PALETTE.ember;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.7, s * 0.9, 0, s * 0.95);
      ctx.bezierCurveTo(-s * 0.7, s * 0.9, -s * 0.9, -s * 0.2, 0, -s * 0.95);
      ctx.fill();
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.bezierCurveTo(s * 0.4, s * 0.1, s * 0.3, s * 0.7, 0, s * 0.75);
      ctx.bezierCurveTo(-s * 0.3, s * 0.7, -s * 0.4, s * 0.1, 0, -s * 0.3);
      ctx.fill();
      break;
    case 'heart':
      ctx.fillStyle = PALETTE.heart;
      ctx.shadowColor = PALETTE.heart;
      heartPath(ctx, 0, 0, size * 0.9);
      ctx.fill();
      break;
    case 'still':
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ring(ctx, s * 0.85);
      line(ctx, 0, -s * 0.55, 0, 0);
      line(ctx, 0, 0, s * 0.4, s * 0.25);
      break;
    case 'shield':
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.8, s * 0.5, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.8, s * 0.5, -s * 0.8, -s * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = PALETTE.goldLight;
      sparklePath(ctx, 0, -s * 0.05, s * 0.35, 0.3, 0);
      ctx.fill();
      break;
    case 'gold':
      sparklePath(ctx, 0, 0, s * 0.95, 0.32, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      sparklePath(ctx, 0, 0, s * 0.4, 0.32, Math.PI / 4);
      ctx.fill();
      break;
    case 'steady':
      ctx.strokeStyle = PALETTE.textSoft;
      ctx.shadowBlur = 0;
      line(ctx, -s * 0.7, -s * 0.7, s * 0.5, s * 0.5);
      line(ctx, s * 0.7, -s * 0.7, -s * 0.5, s * 0.5);
      ctx.strokeStyle = PALETTE.gold;
      ctx.shadowBlur = size * 0.25;
      ctx.lineWidth *= 1.6;
      line(ctx, -s * 0.95, 0, s * 0.95, 0);
      break;
    case 'net':
      ctx.strokeStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.lineWidth *= 0.7;
      for (let i = -2; i <= 2; i += 1) {
        line(ctx, -s * 0.9, i * s * 0.4, s * 0.9, i * s * 0.4);
        line(ctx, i * s * 0.4, -s * 0.9, i * s * 0.4, s * 0.9);
      }
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth *= 1.6;
      ring(ctx, s * 0.95);
      break;
    case 'moonspool':
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.arc(s * 0.35, -s * 0.2, s * 0.7, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = PALETTE.magenta;
      for (let i = -1; i <= 1; i += 1) line(ctx, s * 0.1, s * (0.5 + i * 0.22), s * 0.95, s * (0.5 + i * 0.22));
      break;
    case 'starfall':
      ctx.strokeStyle = PALETTE.magenta;
      for (let i = 0; i < 3; i += 1) line(ctx, -s * 0.9 + i * s * 0.35, -s * 0.9, -s * 0.5 + i * s * 0.35, -s * 0.3);
      ctx.fillStyle = PALETTE.goldLight;
      sparklePath(ctx, s * 0.2, s * 0.25, s * 0.7, 0.3, 0);
      ctx.fill();
      break;
    case 'hourglass':
      ctx.strokeStyle = PALETTE.magenta;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.9);
      ctx.lineTo(s * 0.6, -s * 0.9);
      ctx.lineTo(-s * 0.6, s * 0.9);
      ctx.lineTo(s * 0.6, s * 0.9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = PALETTE.goldLight;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.85);
      ctx.lineTo(s * 0.4, s * 0.85);
      ctx.lineTo(0, s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'lodestar':
      ctx.strokeStyle = PALETTE.magenta;
      ring(ctx, s * 0.95, [4, 5]);
      ctx.fillStyle = PALETTE.goldLight;
      sparklePath(ctx, 0, 0, s * 0.8, 0.22, 0);
      ctx.fill();
      ctx.fillStyle = PALETTE.magenta;
      disc(ctx, 0, 0, s * 0.16);
      break;
    default:
      break;
  }
  ctx.restore();
}

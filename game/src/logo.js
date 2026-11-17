// The NIGHTLOOM word mark, large on the title and small in the top bar.
import { PALETTE } from './config.js';
import { FONT_TITLE, measureText, rgba, sparklePath } from './glow.js';

/** Draw the mark centred on (x, y) at `size` px; `time` twinkles the underline's stars. */
export function drawLogo(ctx, x, y, size, time, underline = true) {
  const spec = { font: FONT_TITLE, size, weight: '700', letterSpacing: size * 0.12 };
  const width = measureText(ctx, 'NIGHTLOOM', spec);
  ctx.save();
  ctx.font = `${spec.weight} ${size}px ${spec.font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spec.letterSpacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = PALETTE.ink;
  ctx.strokeText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = rgba(PALETTE.cyan, 0.55);
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = size * 0.22;
  const gradient = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  gradient.addColorStop(0, '#fff6d8');
  gradient.addColorStop(0.45, PALETTE.gold);
  gradient.addColorStop(1, PALETTE.goldDeep);
  ctx.fillStyle = gradient;
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.restore();
  if (!underline) return;
  const left = x - width / 2;
  const right = x + width / 2;
  const lineY = y + size * 0.62;
  const knots = [[left, lineY], [x - size * 0.6, lineY + size * 0.12], [x, lineY], [x + size * 0.6, lineY + size * 0.12], [right, lineY]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(PALETTE.cyan, 0.85);
  ctx.lineWidth = 2;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (const [kx, ky] of knots) ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.goldLight;
  for (const [kx, ky] of knots) {
    sparklePath(ctx, kx, ky, 7 + 2 * Math.sin(time * 3 + kx), 0.3, 0);
    ctx.fill();
  }
  ctx.restore();
}

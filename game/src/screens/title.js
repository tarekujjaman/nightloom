// The NIGHTLOOM word mark, and the title screen over the attract scene: tagline, CLICK TO BEGIN, the high score and HOW TO PLAY.
import { FIELD, PALETTE } from '../config.js';
import { FONT_TITLE, glowText, measureText, rgba, sparklePath } from '../glow.js';
import { formatScore } from '../scoring.js';
import { keyStrip, pill, tag, tagWidth } from '../hud/widgets.js';

/** The word mark centred on (x, y) at `size` px, over a knotted thread whose stars twinkle with `time`. */
export function drawLogo(ctx, x, y, size, time) {
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
  const lineY = y + size * 0.62;
  const knots = [[x - width / 2, lineY], [x - size * 0.6, lineY + size * 0.12], [x, lineY], [x + size * 0.6, lineY + size * 0.12], [x + width / 2, lineY]];
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

const HOW_TO = [
  [['WASD / ARROWS', 'move the Weaver'], ['HOLD LMB', 'on a star in reach, then drag star to star']],
  [['BACK TO THE 1ST STAR', 'snaps the loop shut: every void-moth inside is caught in a burst of gold']],
  [['BIGGER LOOPS · MORE MOTHS · QUICK CHAINS', 'multiply the score'], ['SPACE', 'still time'], ['P', 'pause']],
];
const PANEL = { x: 84, y: 540, w: FIELD.width - 168, h: 100 };
/** The title's words, in field coordinates, that the attract scene's labels keep clear of. */
export const TITLE_ZONES = [{ x: 0, y: 0, w: FIELD.width, h: 216 }, { x: FIELD.width / 2 - 340, y: 462, w: 680, h: 70 }, PANEL];

function shade(ctx, y0, y1, stops) {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, alpha] of stops) gradient.addColorStop(at, `rgba(8, 3, 26, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y0, FIELD.width, y1 - y0);
}

export function drawTitle(ctx, state, ui) {
  const cx = FIELD.width / 2;
  const t = ui.time;
  ctx.fillStyle = 'rgba(8, 3, 26, 0.22)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  shade(ctx, 0, 236, [[0, 0.85], [0.8, 0.6], [1, 0]]);
  shade(ctx, 440, FIELD.height, [[0, 0], [0.25, 0.72], [1, 0.92]]);

  drawLogo(ctx, cx, 86, 92, t);
  glowText(ctx, 'WEAVE THE STARS  ·  CATCH THE VOID', cx, 174, { size: 20, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 12, letterSpacing: 6 });
  glowText(ctx, 'Hold a thread from star to star, close the loop, and every void-moth inside is caught in a burst of gold.', cx, 203, { size: 14.5, weight: '700', color: PALETTE.text, outline: PALETTE.ink });

  glowText(ctx, 'CLICK TO BEGIN', cx, 484, { size: 38, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 26, letterSpacing: 7, alpha: 0.72 + 0.28 * Math.sin(t * 3.2), outline: PALETTE.ink });
  const scoreText = `HIGH SCORE  ${formatScore(ui.best)}`;
  tag(ctx, scoreText, cx - tagWidth(ctx, scoreText, 13) / 2 - 64, 520, PALETTE.gold, 13);
  glowText(ctx, 'or press ENTER', cx + 80, 520, { size: 13, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });

  pill(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PALETTE.cyan, 'rgba(12, 6, 32, 0.9)', 2);
  HOW_TO.forEach((items, i) => {
    const y = PANEL.y + 22 + i * 28;
    keyStrip(ctx, items, PANEL.x + 20 + (i === 0 ? tag(ctx, 'HOW TO PLAY', PANEL.x + 20, y, PALETTE.cyan, 13) + 14 : 0), y, 13.5);
  });
}

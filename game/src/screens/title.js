// The word mark and the title screen: tagline, CLICK TO BEGIN, the high score and HOW TO PLAY.
import { FIELD, PALETTE as P } from '../config.js';
import { FONT_TITLE, glowText, label, lighter, measureText, rgba, sparklePath } from '../glow.js';
import { formatScore } from '../scoring.js';
import { keyStrip, pill, tag, tagWidth } from '../hud/widgets.js';

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
  ctx.strokeStyle = P.ink;
  ctx.strokeText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowColor = P.cyan;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = rgba(P.cyan, 0.55);
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.shadowColor = P.gold;
  ctx.shadowBlur = size * 0.22;
  const gradient = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  gradient.addColorStop(0, '#fff6d8');
  gradient.addColorStop(0.45, P.gold);
  gradient.addColorStop(1, P.goldDeep);
  ctx.fillStyle = gradient;
  ctx.fillText('NIGHTLOOM', x + spec.letterSpacing / 2, y);
  ctx.restore();
  const lineY = y + size * 0.62;
  const knots = [[x - width / 2, lineY], [x - size * 0.6, lineY + size * 0.12], [x, lineY], [x + size * 0.6, lineY + size * 0.12], [x + width / 2, lineY]];
  ctx.save();
  lighter(ctx);
  ctx.strokeStyle = rgba(P.cyan, 0.85);
  ctx.lineWidth = 2;
  ctx.shadowColor = P.cyan;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (const [kx, ky] of knots) ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = P.goldLight;
  for (const [kx, ky] of knots) {
    sparklePath(ctx, kx, ky, 7 + 2 * Math.sin(time * 3 + kx), 0.3, 0);
    ctx.fill();
  }
  ctx.restore();
}

const HOW_TO = [
  [['WASD', 'move'], ['HOLD LMB', 'on a star in reach, drag star to star, back to the first: the loop snaps shut round every moth in it']],
  [['DEFEND THE LOOM', 'moths that reach it tear its threads'], ['RMB', 'pluck the thread to whip them off'], ['SPACE', 'still time'], ['Q', 'lance pins one']],
  [['STARLIGHT', 'from every catch'], ['E', 'plants a star where you stand'], ['4TH CARD · RE-ROLL', 'between waves cost starlight']],
];
const PANEL = { x: 40, y: 520, w: FIELD.width - 80, h: 98 };

export function drawTitle(ctx, state, ui) {
  const cx = FIELD.width / 2;
  const t = ui.time;
  const shade = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  for (const [at, alpha] of [[0, 0.72], [0.3, 0.5], [0.37, 0.18], [0.69, 0.18], [0.78, 0.66], [1, 0.9]]) shade.addColorStop(at, `rgba(8, 3, 26, ${alpha})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  drawLogo(ctx, cx, 86, 92, t);
  glowText(ctx, 'WEAVE THE STARS  ·  DEFEND THE LOOM', cx, 174, { size: 20, color: P.cyan, glow: P.cyanDeep, blur: 12, letterSpacing: 6 });
  glowText(ctx, 'Hold a thread from star to star and close the loop: every void-moth inside is caught in gold.', cx, 203, { size: 14.5, weight: '700', outline: P.ink });

  glowText(ctx, 'CLICK TO BEGIN', cx, 470, { size: 36, color: P.goldLight, glow: P.gold, blur: 26, letterSpacing: 7, alpha: 0.72 + 0.28 * Math.sin(t * 3.2), outline: P.ink });
  const scoreText = `HIGH SCORE  ${formatScore(ui.best)}`;
  tag(ctx, scoreText, cx - tagWidth(ctx, scoreText, 13) / 2 - 64, 502, P.gold, 13);
  label(ctx, 'or press ENTER', cx + 80, 502, 13, P.textSoft, 'left', 1);

  pill(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, P.cyan, 'rgba(12, 6, 32, 0.9)', 2);
  HOW_TO.forEach((items, i) => {
    const y = PANEL.y + 21 + i * 28;
    keyStrip(ctx, items, PANEL.x + 16 + (i === 0 ? tag(ctx, 'HOW TO PLAY', PANEL.x + 16, y, P.cyan, 12) + 10 : 0), y, 12);
  });
}

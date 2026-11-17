// The title screen over the attract scene: word mark, tagline, high score, CLICK TO BEGIN and HOW TO PLAY.
import { FIELD, PALETTE } from '../config.js';
import { glowText } from '../glow.js';
import { drawLogo } from '../logo.js';
import { formatScore } from '../scoring.js';
import { keyStrip, pill, tag, tagWidth } from '../hud/widgets.js';

const HOW_TO = [
  [['WASD / ARROWS', 'move the Weaver'], ['HOLD LMB', 'on a star in reach, then drag star to star']],
  [['BACK TO THE 1ST STAR', 'snaps the loop shut: every void-moth inside is caught']],
  [['BIGGER LOOPS · MORE MOTHS · QUICK CHAINS', 'multiply the score'], ['SPACE', 'still time'], ['P', 'pause']],
];

/** Draw the title in playfield coordinates. */
export function drawTitle(ctx, state, ui) {
  const cx = FIELD.width / 2;
  const t = ui.time;
  ctx.fillStyle = 'rgba(8, 3, 26, 0.22)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const top = ctx.createLinearGradient(0, 0, 0, 250);
  top.addColorStop(0, 'rgba(8, 3, 26, 0.85)');
  top.addColorStop(1, 'rgba(8, 3, 26, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, FIELD.width, 250);
  const bottom = ctx.createLinearGradient(0, 380, 0, FIELD.height);
  bottom.addColorStop(0, 'rgba(8, 3, 26, 0)');
  bottom.addColorStop(0.3, 'rgba(8, 3, 26, 0.7)');
  bottom.addColorStop(1, 'rgba(8, 3, 26, 0.92)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 380, FIELD.width, FIELD.height - 380);

  drawLogo(ctx, cx, 92, 96, t);
  glowText(ctx, 'WEAVE THE STARS  ·  CATCH THE VOID', cx, 184, { size: 21, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 12, letterSpacing: 6 });
  glowText(ctx, 'Hold a thread from star to star, close the loop, and every void-moth inside is caught in a burst of gold.', cx, 216, { size: 14.5, weight: '700', color: PALETTE.text, outline: PALETTE.ink });

  glowText(ctx, 'CLICK TO BEGIN', cx, 414, { size: 40, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 26, letterSpacing: 7, alpha: 0.72 + 0.28 * Math.sin(t * 3.2), outline: PALETTE.ink });
  const scoreText = `HIGH SCORE  ${formatScore(ui.best)}`;
  tag(ctx, scoreText, cx - tagWidth(ctx, scoreText, 13) / 2 - 64, 452, PALETTE.gold, 13);
  glowText(ctx, 'or press ENTER', cx + 80, 452, { size: 13, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });

  pill(ctx, 84, 476, FIELD.width - 168, 156, PALETTE.cyan, 'rgba(12, 6, 32, 0.9)', 2);
  tag(ctx, 'HOW TO PLAY', 104, 498, PALETTE.cyan, 13);
  glowText(ctx, '10 waves · a card after each · bosses on waves 5 and 10 · lose every heart and the night unravels', 104 + tagWidth(ctx, 'HOW TO PLAY', 13) + 14, 498, { size: 13, color: PALETTE.textSoft, align: 'left' });
  let y = 532;
  for (const items of HOW_TO) {
    keyStrip(ctx, items, 104, y, 14.5);
    y += 34;
  }
}

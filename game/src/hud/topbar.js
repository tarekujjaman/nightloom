// The top bar: the word mark, score, wave progress and the WIN and LOSE banners with live counts.
import { LAYOUT, PALETTE, VIEW } from '../config.js';
import { glowText } from '../glow.js';
import { drawLogo } from '../logo.js';
import { formatScore } from '../scoring.js';
import { WAVE_COUNT, waveDefinition } from '../waves.js';
import { meter, pill, tag, tagWidth } from './widgets.js';

/** Moths still to capture this wave: alive, queued or about to hatch. */
export function mothsLeft(state) {
  return state.moths.filter((moth) => moth.alive).length + state.spawnQueue.length + state.pending.length;
}

function banner(ctx, x, w, label, color, rule, count) {
  pill(ctx, x, 7, w, LAYOUT.top - 14, color);
  const used = tag(ctx, label, x + 10, 33, color, 14, 9);
  glowText(ctx, rule, x + 18 + used, 33, { size: 16, weight: '700', color: PALETTE.text, align: 'left' });
  if (count) glowText(ctx, count, x + w - 12, 33, { size: 22, color, align: 'right' });
}

/** Draw the bar across the top of the view; on the title it shows the rules and the high score. */
export function drawTopBar(ctx, state, ui, title) {
  const h = LAYOUT.top;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, h);
  ctx.fillStyle = PALETTE.panelLine;
  ctx.fillRect(0, h - 2, VIEW.width, 2);
  drawLogo(ctx, 94, 28, 22, ui.time);

  pill(ctx, 182, 7, 168, h - 14, PALETTE.gold);
  glowText(ctx, title ? 'HIGH SCORE' : 'SCORE', 194, 19, { size: 11, color: PALETTE.gold, align: 'left', letterSpacing: 3 });
  glowText(ctx, formatScore(title ? ui.best : state.score), 194, 42, { size: 27, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 14, align: 'left' });

  pill(ctx, 360, 7, 222, h - 14, PALETTE.violet);
  if (title) {
    glowText(ctx, `${WAVE_COUNT} WAVES`, 372, 22, { size: 20, color: PALETTE.text, align: 'left' });
    glowText(ctx, '2 BOSSES · 9 THREADS · 4 RELICS', 372, 45, { size: 11, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });
  } else {
    const left = mothsLeft(state);
    const total = Math.max(1, state.waveTotal);
    glowText(ctx, `WAVE ${state.wave} / ${WAVE_COUNT}`, 372, 21, { size: 20, color: PALETTE.text, align: 'left' });
    glowText(ctx, `${waveDefinition(state.wave).name.toUpperCase()} · ${left} LEFT`, 372, 41, { size: 11, color: PALETTE.textSoft, align: 'left', letterSpacing: 1 });
    meter(ctx, 372, 50, 198, 5, 1 - Math.min(left, total) / total, PALETTE.violet);
  }

  banner(ctx, 592, 300, 'WIN', PALETTE.win, `weave all ${WAVE_COUNT} waves`, title ? '' : `${state.wave - 1}/${WAVE_COUNT}`);
  banner(ctx, 902, 276, 'LOSE', PALETTE.lose, 'all hearts gone', title ? '' : `${state.weaver.hearts}/${state.weaver.maxHearts} ♥`);

  const sound = ui.muted ? 'MUTED' : 'SOUND ON';
  tag(ctx, sound, VIEW.width - 10 - tagWidth(ctx, sound, 10, 8), 33, ui.muted ? PALETTE.lose : PALETTE.cyan, 10, 8);
}

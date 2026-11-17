// The boss bar over the playfield: name, phase, a segment per veil and the hint on stripping them.
import { FIELD, PALETTE } from '../config.js';
import { glowText } from '../glow.js';
import { BOSSES, bossPhase, findBoss } from '../bosses.js';
import { pill, segments, tag, tagWidth } from './widgets.js';

/** Draw the bar in playfield coordinates, or nothing when no boss is alive. */
export function drawBossBar(ctx, state) {
  const boss = findBoss(state.moths);
  if (!boss) return;
  const spec = BOSSES[boss.kind];
  const phase = bossPhase(boss);
  const w = 560;
  const x = (FIELD.width - w) / 2;
  const y = 12;
  pill(ctx, x, y, w, 52, PALETTE.ember, PALETTE.panel, 2.5);
  const used = tag(ctx, 'BOSS', x + 12, y + 20, PALETTE.ember, 12, 8);
  glowText(ctx, spec.name.toUpperCase(), x + 20 + used, y + 20, { size: 18, color: PALETTE.gold, align: 'left', letterSpacing: 1.5 });
  const phaseText = `PHASE ${phase + 1}/3 · ${spec.phases[phase]}`;
  tag(ctx, phaseText, x + w - 12 - tagWidth(ctx, phaseText, 12, 8), y + 20, PALETTE.magenta, 12, 8);
  segments(ctx, x + 12, y + 36, w - 24, 10, boss.veils, boss.maxVeils, PALETTE.violet);
  glowText(ctx, `${boss.veils} OF ${boss.maxVeils} VEILS · ${spec.hint}`, FIELD.width / 2, y + 66, { size: 13, color: PALETTE.textSoft, outline: PALETTE.ink, letterSpacing: 0.5 });
}

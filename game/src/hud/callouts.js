// The words over the playfield: the boss bar, the wave banner, the LOOP CLOSED callout and the objective line saying what to do now.
import { FIELD, LOOM, PALETTE } from '../config.js';
import { FONT_TITLE, glowText, measureText } from '../glow.js';
import { formatScore } from '../scoring.js';
import { BOSSES, bossPhase, findBoss } from '../bosses.js';
import { waveDefinition } from '../waves.js';
import { PHASE } from '../world.js';
import { pill, segments, tag, tagCentred, tagWidth } from './widgets.js';

const THREAD_TIPS = ['Drag the thread to a second star, then a third', 'One more star, then back to the first to close the loop', 'Back to the first star snaps the loop shut'];

export function drawBossBar(ctx, state) {
  const boss = findBoss(state.moths);
  if (!boss) return;
  const spec = BOSSES[boss.kind];
  const phase = bossPhase(boss);
  const w = 560;
  const x = (FIELD.width - w) / 2;
  pill(ctx, x, 12, w, 52, PALETTE.ember, PALETTE.panel, 2.5);
  const used = tag(ctx, 'BOSS', x + 12, 32, PALETTE.ember, 12, 8);
  glowText(ctx, spec.name.toUpperCase(), x + 20 + used, 32, { size: 18, color: PALETTE.gold, align: 'left', letterSpacing: 1.5 });
  const phaseText = `PHASE ${phase + 1}/3 · ${spec.phases[phase]}`;
  tag(ctx, phaseText, x + w - 12 - tagWidth(ctx, phaseText, 12, 8), 32, PALETTE.magenta, 12, 8);
  segments(ctx, x + 12, 48, w - 24, 10, boss.veils, boss.maxVeils, PALETTE.violet);
  glowText(ctx, `${boss.veils} OF ${boss.maxVeils} VEILS · ${spec.hint}`, FIELD.width / 2, 78, { size: 13, color: PALETTE.textSoft, outline: PALETTE.ink, letterSpacing: 0.5 });
}

export function drawWaveBanner(ctx, state) {
  const banner = state.banner;
  if (!banner) return;
  const age = banner.age;
  const alpha = Math.min(1, age / 0.25) * (age > 2.4 ? Math.max(0, 1 - (age - 2.4) / 0.8) : 1);
  if (alpha <= 0) return;
  const cx = FIELD.width / 2;
  const y = 170;
  ctx.save();
  ctx.globalAlpha = alpha;
  const band = ctx.createLinearGradient(0, 0, FIELD.width, 0);
  for (const [at, a] of [[0, 0], [0.2, 0.78], [0.8, 0.78], [1, 0]]) band.addColorStop(at, `rgba(10, 4, 30, ${a})`);
  ctx.fillStyle = band;
  ctx.fillRect(0, y - 64, FIELD.width, 134);
  const color = banner.boss ? PALETTE.ember : banner.clear ? PALETTE.cyan : PALETTE.gold;
  glowText(ctx, banner.title, cx, y - 12, { font: FONT_TITLE, size: 54, weight: '700', color, glow: color, blur: 26, letterSpacing: 8 });
  glowText(ctx, banner.name.toUpperCase(), cx, y + 32, { size: 20, color: PALETTE.goldLight, letterSpacing: 4 });
  if (banner.tagline) glowText(ctx, banner.tagline, cx, y + 56, { size: 15, weight: '700', color: PALETTE.textSoft });
  ctx.restore();
}

export function calloutAnchor(state) {
  const c = state.callout;
  const top = state.banner ? 330 : findBoss(state.moths) ? 180 : 100;
  return { x: Math.max(250, Math.min(FIELD.width - 250, c.x)), y: Math.max(top, Math.min(FIELD.height - 90, c.y - 100 - c.age * 14)) };
}

export function drawCallout(ctx, state) {
  const c = state.callout;
  if (!c) return;
  const life = 2.4;
  const alpha = c.age < 0.12 ? c.age / 0.12 : c.age > life - 0.5 ? (life - c.age) / 0.5 : 1;
  const pop = 1 + Math.max(0, 0.22 - c.age) * 1.6;
  const { x, y } = calloutAnchor(state);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  tagCentred(ctx, 'LOOP CLOSED!', 0, -62, PALETTE.cyan, 16, 12);
  glowText(ctx, `+${formatScore(c.points)}`, 0, -12, { size: 52, color: PALETTE.goldLight, glow: PALETTE.gold, blur: 22, outline: PALETTE.ink });
  const chain = c.chain > 1 ? ` · ${c.chain}-LOOP CHAIN` : '';
  glowText(ctx, `${c.tier} · ${c.count} MOTH${c.count === 1 ? '' : 'S'} · ×${Math.round(c.multiplier * 10) / 10}${chain}`, 0, 30, { size: 18, color: c.chain > 1 ? PALETTE.magenta : PALETTE.text, outline: PALETTE.ink, letterSpacing: 1 });
  ctx.restore();
}

/** What to do right now: the thread in hand, the boss's phase with its veils left, or the wave's own tip. */
export function objective(state) {
  if (state.phase === PHASE.CLEAR) return 'Wave cleared: a card for the loom comes next';
  if (state.loom.active) return THREAD_TIPS[Math.min(LOOM.minLoop, state.loom.chain.length) - 1];
  const boss = findBoss(state.moths);
  if (boss) return BOSSES[boss.kind].tips[bossPhase(boss)].replace('#', boss.veils);
  return waveDefinition(state.wave).tip;
}

export function drawObjective(ctx, state) {
  const text = objective(state);
  const label = tagWidth(ctx, 'NOW', 11, 7);
  const w = measureText(ctx, text, { size: 14, weight: '700' }) + label + 36;
  const x = (FIELD.width - w) / 2;
  const y = FIELD.height - 44;
  pill(ctx, x, y, w, 32, PALETTE.violet, 'rgba(12, 6, 32, 0.88)', 1.5);
  tag(ctx, 'NOW', x + 10, y + 16, PALETTE.gold, 11, 7);
  glowText(ctx, text, x + 18 + label, y + 16, { size: 14, weight: '700', color: PALETTE.text, align: 'left' });
}

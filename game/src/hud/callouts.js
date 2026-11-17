// Words over the playfield: the boss bar, the wave banner and realm card, the LOOP CLOSED callout and the NOW line.
import { FIELD, PALETTE as P, WEAVE } from '../config.js';
import { FONT_TITLE, glowText, label, measureText } from '../glow.js';
import { formatScore } from '../scoring.js';
import { BOSSES, bossPhase, findBoss } from '../bosses.js';
import { waveDefinition } from '../waves.js';
import { PHASE } from '../world.js';
import { starCost } from '../starlight.js';
import { pill, segments, tag, tagCentred, tagWidth } from './widgets.js';

const THREAD_TIPS = ['Drag the thread to a second star, then a third', 'One more star, then back to the first', 'Back to the first star snaps the loop shut'];

export function drawBossBar(ctx, state) {
  const boss = findBoss(state.moths);
  if (!boss) return;
  const spec = BOSSES[boss.kind];
  const phase = bossPhase(boss);
  const w = 560;
  const x = (FIELD.width - w) / 2;
  pill(ctx, x, 12, w, 52, P.ember, P.panel, 2.5);
  const used = tag(ctx, 'BOSS', x + 12, 32, P.ember, 12, 8);
  label(ctx, spec.name.toUpperCase(), x + 20 + used, 32, 18, P.gold, 'left', 1.5);
  const phaseText = `PHASE ${phase + 1}/3 · ${spec.phases[phase]}`;
  tag(ctx, phaseText, x + w - 12 - tagWidth(ctx, phaseText, 12, 8), 32, P.magenta, 12, 8);
  segments(ctx, x + 12, 48, w - 24, 10, boss.veils, boss.maxVeils, P.violet);
  glowText(ctx, `${boss.veils} OF ${boss.maxVeils} VEILS · ${spec.hint}`, FIELD.width / 2, 78, { size: 13, color: P.textSoft, outline: P.ink, letterSpacing: 0.5 });
}

export function drawWaveBanner(ctx, state) {
  const banner = state.banner;
  if (!banner) return;
  const { age, realm } = banner;
  const life = realm ? 4.2 : 3.2;
  const alpha = Math.min(1, age / 0.25) * (age > life - 0.8 ? Math.max(0, (life - age) / 0.8) : 1);
  if (alpha <= 0) return;
  const cx = FIELD.width / 2;
  const y = realm ? 150 : 170;
  ctx.save();
  ctx.globalAlpha = alpha;
  const band = ctx.createLinearGradient(0, 0, FIELD.width, 0);
  for (const [at, a] of [[0, 0], [0.2, realm ? 0.86 : 0.78], [0.8, realm ? 0.86 : 0.78], [1, 0]]) band.addColorStop(at, `rgba(10, 4, 30, ${a})`);
  ctx.fillStyle = band;
  ctx.fillRect(0, y - (realm ? 84 : 64), FIELD.width, realm ? 176 : 134);
  const color = banner.color || (banner.boss ? P.ember : banner.clear ? P.cyan : P.gold);
  if (realm) tagCentred(ctx, 'A NEW REALM', cx, y - 60, color, 11);
  glowText(ctx, banner.title, cx, y - 12, { font: FONT_TITLE, size: realm ? 62 : 54, weight: '700', color, glow: color, blur: 26, letterSpacing: 8 });
  label(ctx, banner.name.toUpperCase(), cx, y + 34, realm ? 17 : 20, P.goldLight, 'center', 4);
  if (banner.tagline) glowText(ctx, banner.tagline, cx, y + (realm ? 62 : 58), { size: 15, weight: '700', color: P.textSoft });
  ctx.restore();
}

export function drawCallout(ctx, state) {
  const c = state.callout;
  if (!c) return;
  const alpha = c.age < 0.12 ? c.age / 0.12 : c.age > 1.9 ? (2.4 - c.age) / 0.5 : 1;
  const pop = 1 + Math.max(0, 0.22 - c.age) * 1.6;
  const top = state.banner ? 330 : findBoss(state.moths) ? 180 : 100;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.max(250, Math.min(FIELD.width - 250, c.x)), Math.max(top, Math.min(FIELD.height - 90, c.y - 100 - c.age * 14)));
  ctx.scale(pop, pop);
  tagCentred(ctx, 'LOOP CLOSED!', 0, -62, P.cyan, 16, 12);
  glowText(ctx, `+${formatScore(c.points)}`, 0, -12, { size: 52, color: P.goldLight, glow: P.gold, blur: 22, outline: P.ink });
  const chain = c.chain > 1 ? ` · ${c.chain}-LOOP CHAIN` : '';
  glowText(ctx, `${c.tier} · ${c.count} MOTH${c.count === 1 ? '' : 'S'} · ×${Math.round(c.multiplier * 10) / 10}${chain}`, 0, 30, { size: 18, color: c.chain > 1 ? P.magenta : P.text, outline: P.ink, letterSpacing: 1 });
  ctx.restore();
}

export function objective(state) {
  const { loom, weave, weaver, stars, starlight } = state;
  if (state.phase === PHASE.CLEAR) return 'Wave cleared: a card for the loom comes next';
  if (loom.health < loom.max * 0.3) return `The Loom frays at ${Math.ceil(loom.health)}: loop the moths at its heart, or pluck them off`;
  if (weave.active) return THREAD_TIPS[Math.min(WEAVE.minLoop, weave.chain.length) - 1];
  const boss = findBoss(state.moths);
  if (boss) return BOSSES[boss.kind].tips[bossPhase(boss)].replace('#', boss.veils);
  if (starlight.have >= starCost(state) && !stars.some((star) => Math.hypot(star.x - weaver.x, star.y - weaver.y) < 150)) return `No star near you: E plants one here for ${starCost(state)} starlight`;
  return waveDefinition(state.wave).tip;
}

export function drawObjective(ctx, state) {
  const text = objective(state);
  const used = tagWidth(ctx, 'NOW', 11, 7);
  const w = measureText(ctx, text, { size: 14, weight: '700' }) + used + 36;
  const x = (FIELD.width - w) / 2;
  const y = FIELD.height - 44;
  pill(ctx, x, y, w, 32, P.violet, 'rgba(12, 6, 32, 0.88)', 1.5);
  tag(ctx, 'NOW', x + 10, y + 16, P.gold, 11, 7);
  glowText(ctx, text, x + 18 + used, y + 16, { size: 14, weight: '700', align: 'left' });
}

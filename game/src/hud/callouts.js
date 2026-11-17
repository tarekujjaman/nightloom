// The big words over the playfield: the wave banner and the LOOP CLOSED callout.
import { FIELD, PALETTE } from '../config.js';
import { FONT_TITLE, glowText } from '../glow.js';
import { formatScore } from '../scoring.js';
import { tagCentred } from './widgets.js';

/** The banner that fades in and out at the start of each wave, on a boss phase and when a wave is cleared. */
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
  band.addColorStop(0, 'rgba(10, 4, 30, 0)');
  band.addColorStop(0.2, 'rgba(10, 4, 30, 0.78)');
  band.addColorStop(0.8, 'rgba(10, 4, 30, 0.78)');
  band.addColorStop(1, 'rgba(10, 4, 30, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y - 64, FIELD.width, 134);
  const color = banner.boss ? PALETTE.ember : banner.clear ? PALETTE.cyan : PALETTE.gold;
  glowText(ctx, banner.title, cx, y - 12, { font: FONT_TITLE, size: 54, weight: '700', color, glow: color, blur: 26, letterSpacing: 8 });
  glowText(ctx, banner.name.toUpperCase(), cx, y + 32, { size: 20, color: PALETTE.goldLight, letterSpacing: 4 });
  if (banner.tagline) glowText(ctx, banner.tagline, cx, y + 56, { size: 15, weight: '700', color: PALETTE.textSoft });
  ctx.restore();
}

/** The LOOP CLOSED callout above the loop's middle, rising and fading over its 2.4 seconds. */
export function drawCallout(ctx, state) {
  const c = state.callout;
  if (!c) return;
  const life = 2.4;
  const alpha = c.age < 0.12 ? c.age / 0.12 : c.age > life - 0.5 ? (life - c.age) / 0.5 : 1;
  const pop = 1 + Math.max(0, 0.22 - c.age) * 1.6;
  const x = Math.max(190, Math.min(FIELD.width - 190, c.x));
  const y = Math.max(130, Math.min(FIELD.height - 70, c.y - 80)) - c.age * 14;
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

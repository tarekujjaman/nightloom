// The side panel: THREAT QUEUE (what is coming, boss veils and phase, what spawns next) and THREADS HELD; the bestiary on the title.
import { ARENA, LAYOUT, PALETTE, VIEW } from '../config.js';
import { glowText } from '../glow.js';
import { MOTH_INFO, MOTH_ORDER } from '../bestiary.js';
import { BOSSES, bossPhase } from '../bosses.js';
import { drawMothIcon } from '../mothart.js';
import { RARITY_COLORS, heldCards } from '../upgrades.js';
import { waveDefinition } from '../waves.js';
import { PHASE } from '../world.js';
import { drawUpgradeIcon } from '../screens/icons.js';
import { segments, tag } from './widgets.js';

/** The threat queue: one row per kind on the field or still to come, bosses first; `boss` carries the live boss. */
export function threatRows(state) {
  const counts = {};
  let boss = null;
  if (state.phase === PHASE.UPGRADE) {
    const next = waveDefinition(state.wave + 1);
    Object.assign(counts, next.moths);
    if (next.boss) counts[next.boss.kind] = 1;
  } else {
    for (const moth of state.moths) {
      if (!moth.alive) continue;
      counts[moth.kind] = (counts[moth.kind] || 0) + 1;
      if (moth.boss) boss = moth;
    }
    for (const kind of [...state.spawnQueue, ...state.pending.map((moth) => moth.kind)]) counts[kind] = (counts[kind] || 0) + 1;
  }
  return MOTH_ORDER.filter((kind) => counts[kind]).map((kind) => ({ kind, count: counts[kind], boss: boss && boss.kind === kind ? boss : null }));
}

function row(ctx, x, y, w, kind, count, boss, time) {
  const info = MOTH_INFO[kind];
  drawMothIcon(ctx, kind, x + 22, y + 22, BOSSES[kind] ? 44 : 36, time);
  glowText(ctx, info.name.toUpperCase(), x + 50, y + 13, { size: 15, color: info.color, align: 'left', letterSpacing: 0.5 });
  glowText(ctx, info.does, x + 50, y + 31, { size: 12, weight: '700', color: PALETTE.textSoft, align: 'left' });
  if (boss) {
    const phase = bossPhase(boss);
    tag(ctx, `PHASE ${phase + 1}/3 · ${BOSSES[kind].phases[phase]}`, x + 50, y + 51, PALETTE.magenta, 10, 6);
    segments(ctx, x + w - 92, y + 16, 84, 10, boss.veils, boss.maxVeils, PALETTE.violet);
    glowText(ctx, `${boss.veils}/${boss.maxVeils} VEILS`, x + w - 8, y + 38, { size: 11, color: PALETTE.violet, align: 'right', letterSpacing: 1 });
  } else if (count > 0) {
    glowText(ctx, `×${count}`, x + w - 8, y + 22, { size: 20, color: PALETTE.text, align: 'right' });
  }
}

/** Draw the panel down the right of the view. */
export function drawSidePanel(ctx, state, ui, title) {
  const x = VIEW.width - LAYOUT.side;
  const y = ARENA.y;
  const w = LAYOUT.side;
  const h = ARENA.height;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.panelLine;
  ctx.fillRect(x, y, 2, h);
  const inner = x + 14;
  const innerW = w - 28;
  let cy = y + 22;
  const preview = state.phase === PHASE.UPGRADE;
  const next = waveDefinition(state.wave + 1);
  tag(ctx, title ? 'THE VOID-MOTHS' : preview ? `NEXT WAVE ${state.wave + 1}` : 'THREAT QUEUE', inner, cy, PALETTE.lose, 13);
  const rows = title ? MOTH_ORDER.filter((kind) => kind !== 'mite').map((kind) => ({ kind, count: 0, boss: null })) : threatRows(state);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (!title) glowText(ctx, preview ? next.name.toUpperCase() : `${total} LEFT`, x + w - 14, cy, { size: 12, color: PALETTE.text, align: 'right', letterSpacing: 1 });
  cy += 22;
  const queueH = title ? 42 : Math.min(46, (h * 0.58) / Math.max(1, rows.length));
  for (const r of rows) {
    row(ctx, inner, cy, innerW, r.kind, r.count, r.boss, ui.time);
    cy += r.boss ? queueH + 22 : queueH;
  }
  if (rows.length === 0) {
    glowText(ctx, 'the sky is clear', inner, cy + 14, { size: 13, weight: '700', color: PALETTE.textSoft, align: 'left' });
    cy += 30;
  }
  if (!title) {
    cy += 6;
    let nx = inner + tag(ctx, 'NEXT', inner, cy, PALETTE.violet, 11, 7) + 8;
    const coming = preview ? [] : state.spawnQueue.slice(0, 3);
    if (coming.length === 0) glowText(ctx, preview ? next.tagline : 'all moths are out', nx, cy, { size: 12, weight: '700', color: PALETTE.textSoft, align: 'left' });
    for (const kind of coming) {
      drawMothIcon(ctx, kind, nx + 10, cy, 20, ui.time);
      glowText(ctx, MOTH_INFO[kind].name, nx + 24, cy, { size: 12, color: MOTH_INFO[kind].color, align: 'left' });
      nx += 24 + MOTH_INFO[kind].name.length * 7 + 14;
    }
    cy += 28;
  }

  if (title) cy += 10;
  tag(ctx, 'THREADS HELD', inner, cy, PALETTE.gold, 13);
  cy += 18;
  const held = heldCards(state.upgrades);
  if (title) {
    for (const line of ['One card after every wave: 9 threads', 'in 3 rarities, levelled up to III, and', 'a relic after the Eclipse Moth falls.']) {
      cy += 18;
      glowText(ctx, line, inner, cy, { size: 12.5, weight: '700', color: PALETTE.textSoft, align: 'left' });
    }
    return;
  }
  if (held.length === 0) {
    glowText(ctx, 'none yet · one card after every wave', inner, cy + 16, { size: 12.5, weight: '700', color: PALETTE.textSoft, align: 'left' });
    return;
  }
  const rowH = Math.max(26, Math.min(36, (y + h - 10 - cy) / held.length));
  for (const card of held) {
    drawUpgradeIcon(ctx, card.id, inner + 16, cy + rowH / 2, Math.min(22, rowH - 10), ui.time);
    glowText(ctx, card.name.toUpperCase(), inner + 38, cy + rowH / 2 - (rowH > 30 ? 7 : 0), { size: 13.5, color: RARITY_COLORS[card.rarity], align: 'left', letterSpacing: 0.5 });
    if (rowH > 30) glowText(ctx, card.stat, inner + 38, cy + rowH / 2 + 9, { size: 11.5, weight: '700', color: PALETTE.textSoft, align: 'left' });
    cy += rowH;
  }
}

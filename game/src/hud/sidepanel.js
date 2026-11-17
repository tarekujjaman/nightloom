// The side panel: THREAT QUEUE and THREADS HELD; the bestiary and the four realms on the title.
import { ARENA, LAYOUT, PALETTE as P, VIEW } from '../config.js';
import { glowText, label } from '../glow.js';
import { BOSSES, bossPhase } from '../bosses.js';
import { MOTH_INFO, MOTH_ORDER, drawMothIcon } from '../mothart.js';
import { RARITY_COLORS, heldCards } from '../upgrades.js';
import { waveDefinition } from '../waves.js';
import { REALMS } from '../realms.js';
import { PHASE } from '../world.js';
import { drawUpgradeIcon } from '../screens/upgrade.js';
import { SOFT, segments, tag } from './widgets.js';

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
  label(ctx, info.name.toUpperCase(), x + 50, y + 13, 15, info.color, 'left', 0.5);
  glowText(ctx, info.does, x + 50, y + 31, SOFT);
  if (boss) {
    const phase = bossPhase(boss);
    tag(ctx, `PHASE ${phase + 1}/3 · ${BOSSES[kind].phases[phase]}`, x + 50, y + 51, P.magenta, 11, 6);
    segments(ctx, x + w - 92, y + 16, 84, 10, boss.veils, boss.maxVeils, P.violet);
    label(ctx, `${boss.veils}/${boss.maxVeils} VEILS`, x + w - 8, y + 38, 11, P.violet, 'right', 1);
  } else if (count > 0) label(ctx, `×${count}`, x + w - 8, y + 22, 20, P.text, 'right');
}

export function drawSidePanel(ctx, state, ui, title) {
  const x = VIEW.width - LAYOUT.side;
  const y = ARENA.y;
  const w = LAYOUT.side;
  const h = ARENA.height;
  ctx.fillStyle = P.panel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P.panelLine;
  ctx.fillRect(x, y, 2, h);
  const inner = x + 14;
  const innerW = w - 28;
  let cy = y + 22;
  const preview = state.phase === PHASE.UPGRADE;
  const next = waveDefinition(state.wave + 1);
  tag(ctx, title ? 'THE VOID-MOTHS' : preview ? `NEXT WAVE ${state.wave + 1}` : 'THREAT QUEUE', inner, cy, P.lose, 13);
  const rows = title ? MOTH_ORDER.filter((kind) => kind !== 'mite').map((kind) => ({ kind, count: 0, boss: null })) : threatRows(state);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (!title) label(ctx, preview ? next.name.toUpperCase() : `${total} LEFT`, x + w - 14, cy, 12, P.text, 'right', 1);
  cy += 22;
  const queueH = title ? 40 : Math.min(46, (h * 0.56) / Math.max(1, rows.length));
  for (const r of rows) {
    row(ctx, inner, cy, innerW, r.kind, r.count, r.boss, ui.time);
    cy += r.boss ? queueH + 22 : queueH;
  }
  if (rows.length === 0) {
    glowText(ctx, 'the sky is clear', inner, cy + 14, { ...SOFT, size: 13 });
    cy += 30;
  }
  if (!title) {
    cy += 6;
    let nx = inner + tag(ctx, 'NEXT', inner, cy, P.violet, 11, 7) + 8;
    const coming = preview ? [] : state.spawnQueue.slice(0, 3);
    if (coming.length === 0) glowText(ctx, preview ? next.tagline : 'all moths are out', nx, cy, SOFT);
    for (const kind of coming) {
      drawMothIcon(ctx, kind, nx + 10, cy, 20, ui.time);
      label(ctx, MOTH_INFO[kind].name, nx + 24, cy, 12, MOTH_INFO[kind].color, 'left');
      nx += 24 + MOTH_INFO[kind].name.length * 7 + 14;
    }
    cy += 28;
  } else {
    cy += 14;
    tag(ctx, 'FOUR REALMS', inner, cy, P.violet, 13);
    REALMS.forEach((realm, i) => {
      const ry = cy + 24 + i * 21;
      ctx.fillStyle = realm.sky[0];
      ctx.strokeStyle = realm.accent;
      ctx.lineWidth = 2;
      ctx.fillRect(inner, ry - 7, 22, 14);
      ctx.strokeRect(inner, ry - 7, 22, 14);
      label(ctx, realm.name.toUpperCase(), inner + 32, ry, 12, realm.accent, 'left', 1);
      glowText(ctx, `waves ${realm.first}–${realm.last}`, x + w - 14, ry, { ...SOFT, size: 11, align: 'right' });
    });
    cy += 34 + REALMS.length * 21;
  }
  tag(ctx, 'THREADS HELD', inner, cy, P.gold, 13);
  cy += 18;
  const held = heldCards(state.upgrades);
  if (title || held.length === 0) {
    const lines = title ? ['One card after every wave: ten threads,', 'a fourth for starlight, relics after the boss.'] : ['none yet · one card after every wave'];
    lines.forEach((text, i) => glowText(ctx, text, inner, cy + 16 + i * 18, { ...SOFT, size: 12.5 }));
    return;
  }
  const rowH = Math.max(26, Math.min(36, (y + h - 10 - cy) / held.length));
  for (const card of held) {
    drawUpgradeIcon(ctx, card.id, inner + 16, cy + rowH / 2, Math.min(22, rowH - 10));
    label(ctx, card.name.toUpperCase(), inner + 38, cy + rowH / 2 - (rowH > 30 ? 7 : 0), 13.5, RARITY_COLORS[card.rarity], 'left', 0.5);
    if (rowH > 30) glowText(ctx, card.stat, inner + 38, cy + rowH / 2 + 9, { ...SOFT, size: 11.5 });
    cy += rowH;
  }
}

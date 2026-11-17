// Field labels that never collide: YOU, one "kind · what it does" per kind on screen, a short name on the rest, each slotted round its owner clear of the HUD's words, the stars and each other.
import { FIELD, PALETTE } from './config.js';
import { glowText, measureText, roundRect } from './glow.js';
import { MOTH_INFO, MOTH_ORDER } from './mothart.js';
import { PHASE } from './world.js';

const GAP = 4;
// Below, above, right, left, then the diagonals; each tried near, then a ring farther out.
const SLOTS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];

function overlaps(a, b) {
  return a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x && a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y;
}

function slotBox(label, w, h, slot, ring) {
  const [dx, dy] = SLOTS[slot];
  const away = (label.ring + 6 + ring * 16) * (dx && dy ? 0.72 : 1);
  return { x: label.x + dx * (away + w / 2) - w / 2, y: label.y + dy * (away + h / 2) - h / 2, w, h };
}

/** The best free box for `label`: no `hard` box touched, the fewest `soft` ones, the owner's last slot winning ties. */
function fit(label, w, h, hard, soft) {
  let best = null;
  for (let k = 0; k < SLOTS.length * 2 && (!best || best.cost > 0); k += 1) {
    const slot = ((label.owner.labelSlot || 0) + k) % SLOTS.length;
    const ring = k >= SLOTS.length ? 1 : 0;
    const box = slotBox(label, w, h, slot, ring);
    if (box.x < 4 || box.y < 4 || box.x + box.w > FIELD.width - 4 || box.y + box.h > FIELD.height - 4 || hard.some((other) => overlaps(box, other))) continue;
    const cost = soft.reduce((sum, other) => sum + (overlaps(box, other) ? 4 : 0), 0) + ring * 3 + k * 0.05;
    if (!best || cost < best.cost) best = { box, slot, cost };
  }
  return best;
}

/** Draw every field label of `state`, keeping clear of the `hard` boxes (the HUD's words, in field coordinates); `brief` (the title) names each kind once, short. */
export function drawFieldLabels(ctx, state, hard, brief = false) {
  const { weaver, moths, stars } = state;
  const shown = moths.filter((moth) => moth.alive && moth.visible >= 0.6 && moth.x > 10 && moth.x < FIELD.width - 10 && moth.y > 10 && moth.y < FIELD.height - 10);
  const ringOf = (moth) => (moth.boss ? moth.radius + 10 + 13 * moth.veils : moth.radius * 1.5);
  const soft = [...shown.map((moth) => ({ x: moth.x - ringOf(moth), y: moth.y - ringOf(moth), w: ringOf(moth) * 2, h: ringOf(moth) * 2 })), ...stars.map((star) => ({ x: star.x - 16, y: star.y - 16, w: 32, h: 32 }))];
  const labels = [];
  if (state.phase !== PHASE.LOST) labels.push({ owner: weaver, x: weaver.x, y: weaver.y, ring: 22, text: 'YOU', size: 11, color: PALETTE.goldLight, bare: true });
  const ordered = shown.filter((moth) => moth.kind !== 'mite').sort((a, b) => MOTH_ORDER.indexOf(a.kind) - MOTH_ORDER.indexOf(b.kind) || a.id - b.id);
  const firsts = new Map();
  for (const moth of ordered) if (!firsts.has(moth.kind)) firsts.set(moth.kind, moth);
  for (const moth of [...firsts.values(), ...ordered.filter((moth) => firsts.get(moth.kind) !== moth)]) {
    const info = MOTH_INFO[moth.kind];
    const first = firsts.get(moth.kind) === moth;
    if (!first && (brief || moth.kind === 'drifter')) continue;
    const full = first && !moth.boss && !brief;
    labels.push({ owner: moth, x: moth.x, y: moth.y, ring: ringOf(moth), text: full ? `${info.name.toUpperCase()} · ${info.does}` : info.name.toUpperCase(), size: moth.boss ? 14 : full ? 12.5 : 11, color: info.color, dim: !first });
  }
  const taken = hard.slice();
  for (const label of labels) {
    const w = measureText(ctx, label.text, { size: label.size, letterSpacing: 0.5 }) + (label.bare ? 6 : 14);
    const h = label.size + 8;
    // YOU always shows: with nothing free it sits above the Weaver anyway.
    const found = fit(label, w, h, taken, soft) || (label.bare ? { box: slotBox(label, w, h, 1, 0), slot: 1 } : null);
    if (!found) continue;
    label.owner.labelSlot = found.slot;
    const { box } = found;
    taken.push(box);
    if (label.bare) {
      glowText(ctx, label.text, box.x + w / 2, box.y + h / 2, { size: label.size, color: label.color, outline: PALETTE.ink, letterSpacing: 2 });
      continue;
    }
    // A leader from the moth's edge to a label set off to its side.
    const nx = Math.max(box.x, Math.min(box.x + w, label.x));
    const ny = Math.max(box.y, Math.min(box.y + h, label.y));
    const reach = Math.hypot(nx - label.x, ny - label.y);
    if (reach - label.ring > 10) {
      ctx.strokeStyle = label.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(label.x + ((nx - label.x) * label.ring) / reach, label.y + ((ny - label.y) * label.ring) / reach);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    roundRect(ctx, box.x, box.y, w, h, h / 2);
    ctx.fillStyle = label.dim ? 'rgba(16, 6, 36, 0.7)' : 'rgba(16, 6, 36, 0.84)';
    ctx.fill();
    glowText(ctx, label.text, box.x + w / 2, box.y + h / 2 + 1, { size: label.size, color: label.color, letterSpacing: 0.5, alpha: label.dim ? 0.85 : 1 });
  }
}

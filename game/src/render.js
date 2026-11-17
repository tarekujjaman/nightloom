// The renderer: the realm's painted hill, the Loom and the field back to front, then the HUD frame, the screen on top and the motes last.
import { ABILITY, ARENA, FIELD, PALETTE as P, VIEW, WEAVE } from './config.js';
import { drawSprite, glowText, lighter, makeGlowSprite, poly, rgba, ring, sparklePath } from './glow.js';
import { REALMS, drawRealm } from './realms.js';
import { drawLoom } from './loom.js';
import { WAVE_COUNT } from './waves.js';
import { drawMoth } from './mothart.js';
import { drawLances } from './abilities.js';
import { drawMotes } from './starlight.js';
import { starInReach } from './stars.js';
import { PHASE } from './world.js';
import { BOSSES, findBoss } from './bosses.js';
import { drawBottomBar, drawTopBar } from './hud/bars.js';
import { drawSidePanel } from './hud/sidepanel.js';
import { drawBossBar, drawCallout, drawObjective, drawWaveBanner } from './hud/callouts.js';
import { tagCentred } from './hud/widgets.js';
import { drawTitle } from './screens/title.js';
import { drawUpgradeChoice } from './screens/upgrade.js';
import { drawPause, drawResults } from './screens/results.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_RESULTS = 'results';

const TIER_COLORS = [P.cyan, P.cyan, P.gold, P.magenta, P.gold, P.gold];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { dpr: 1, scale: 1, offsetX: 0, offsetY: 0, width: VIEW.width, height: VIEW.height };
  const sprites = {
    star: makeGlowSprite(P.gold, 30, 0.1), starCyan: makeGlowSprite(P.cyan, 36, 0.06), weaver: makeGlowSprite(P.gold, 64, 0.06),
    weaverCore: makeGlowSprite('#ffffff', 18, 0.3), spark: makeGlowSprite(P.cyan, 12, 0.3), cut: makeGlowSprite(P.ember, 40, 0.1),
  };

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const scale = Math.min(width / VIEW.width, height / VIEW.height);
    Object.assign(view, { dpr: Math.min(2, window.devicePixelRatio || 1), width, height, scale, offsetX: (width - VIEW.width * scale) / 2, offsetY: (height - VIEW.height * scale) / 2 });
    canvas.width = Math.round(width * view.dpr);
    canvas.height = Math.round(height * view.dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  const toLogical = (clientX, clientY) => ({ x: (clientX - view.offsetX) / view.scale, y: (clientY - view.offsetY) / view.scale });

  function glowStroke(color, width, blur, alpha) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /** A thread: a cyan halo added to the scene, then a solid gold core with a pale heart, so it stays gold over the glow. */
  function threadStroke(color, alpha, width = 1) {
    glowStroke(P.cyan, 16 * width, 28, 0.55 * alpha);
    ctx.globalCompositeOperation = 'source-over';
    glowStroke(color, 6 * width, 0, alpha);
    glowStroke(P.goldLight, 2 * width, 0, 0.9 * alpha);
    lighter(ctx);
  }

  function fillNet(polygon, color, alpha, time) {
    ctx.save();
    poly(ctx, polygon);
    ctx.clip();
    ctx.fillStyle = rgba(color, 0.2 * alpha);
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = rgba(color, 0.32 * alpha);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const shift = (time * 10) % 24;
    for (let d = -FIELD.height; d < FIELD.width + FIELD.height; d += 24) {
      ctx.moveTo(d + shift, 0);
      ctx.lineTo(d + shift - FIELD.height, FIELD.height);
      ctx.moveTo(d - shift, 0);
      ctx.lineTo(d - shift + FIELD.height, FIELD.height);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAfterglows(state) {
    const { weave } = state;
    for (const glow of weave.afterglows) {
      const alpha = Math.min(1, (1 - glow.age / glow.life) * 1.4);
      const color = TIER_COLORS[glow.tier] || P.cyan;
      fillNet(glow.polygon, color, alpha, state.time);
      ctx.save();
      lighter(ctx);
      ctx.lineJoin = 'round';
      poly(ctx, glow.polygon);
      threadStroke(color === P.cyan ? P.cyanDeep : color, alpha, 1.1);
      for (const p of glow.polygon) drawSprite(ctx, sprites.star, p.x, p.y, 1.2, 0.8 * alpha);
      ctx.restore();
    }
  }

  /** Moths a loop just caught dissolve in gold for a moment, so the catch is seen, not only its burst. */
  function drawCaught(state) {
    for (const moth of state.effects.caught) {
      const k = moth.gone;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(moth.x, moth.y);
      ctx.scale(1 - 0.4 * k, 1 - 0.4 * k);
      ctx.translate(-moth.x, -moth.y);
      drawMoth(ctx, moth, state.time);
      lighter(ctx);
      drawSprite(ctx, sprites.weaver, moth.x, moth.y, (moth.radius / 30) * (1 + k), 0.9);
      ctx.restore();
    }
  }

  function drawAnchorStars(state) {
    const { stars, weave, weaver } = state;
    ctx.save();
    ring(ctx, weaver.x, weaver.y, weaver.reach, rgba(P.cyan, weave.active ? 0.4 : 0.2), 1.5, [5, 11], -state.time * 24);
    stars.forEach((star, i) => {
      const twinkle = 0.8 + 0.2 * Math.sin(state.time * star.twinkle + star.phase);
      const inChain = weave.chain.includes(i);
      const reachable = starInReach(star, weaver.x, weaver.y, weaver.reach);
      const hovered = i === state.hoverStar;
      lighter(ctx);
      drawSprite(ctx, sprites.star, star.x, star.y, (star.size / 7) * (inChain ? 1.9 : reachable ? 1.35 : 0.95) * twinkle, inChain ? 1 : reachable ? 0.85 : 0.5);
      if (reachable) drawSprite(ctx, sprites.starCyan, star.x, star.y, 0.9, inChain ? 0.6 : 0.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = inChain ? '#ffffff' : P.goldLight;
      sparklePath(ctx, star.x, star.y, star.size * 1.25 * twinkle, 0.3, 0);
      ctx.fill();
      if (star.placed) ring(ctx, star.x, star.y, 23, rgba(P.gold, 0.7), 1.5, [3, 5], state.time * 10);
      if (reachable || inChain) ring(ctx, star.x, star.y, hovered ? 20 : 15, rgba(P.cyan, hovered ? 0.95 : inChain ? 0.75 : 0.45), hovered ? 2.5 : 1.5);
      if (weave.active && weave.chain[0] === i && weave.chain.length >= WEAVE.minLoop) {
        const pulse = 0.5 + 0.5 * Math.sin(state.time * 8);
        ring(ctx, star.x, star.y, 26 + pulse * 5, rgba(P.gold, 0.5 + 0.5 * pulse), 2.5, [6, 6]);
        glowText(ctx, 'CLOSE HERE', star.x, star.y - 38, { size: 12, color: P.gold, outline: P.ink, letterSpacing: 1 });
      }
    });
    ctx.restore();
  }

  function drawThreads(state) {
    const { weave, stars, abilities } = state;
    ctx.save();
    lighter(ctx);
    ctx.lineJoin = ctx.lineCap = 'round';
    if (abilities.burst > 0) ring(ctx, state.weaver.x, state.weaver.y, (1 - abilities.burst) * ABILITY.pluckBurst + 20, rgba(P.magenta, abilities.burst), 4, [10, 8]);
    const points = weave.chain.map((index) => stars[index]);
    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const amp = weave.pluckWave * 18 * Math.sin(state.time * 45 + i);
        ctx.quadraticCurveTo((a.x + b.x) / 2 - ((b.y - a.y) / d) * amp, (a.y + b.y) / 2 + ((b.x - a.x) / d) * amp, b.x, b.y);
      }
      threadStroke(P.gold, 1);
      for (let i = 0; i + 1 < points.length; i += 1) {
        for (let k = 0; k < 2; k += 1) {
          const t = (state.time * 0.55 + k * 0.5 + i * 0.21) % 1;
          drawSprite(ctx, sprites.spark, points[i].x + (points[i + 1].x - points[i].x) * t, points[i].y + (points[i + 1].y - points[i].y) * t, 1.1, 0.8);
        }
      }
    }
    if (weave.active) {
      const last = points[points.length - 1];
      ctx.strokeStyle = rgba(P.cyan, 0.75);
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -state.time * 60;
      poly(ctx, [last, { x: weave.cursorX, y: weave.cursorY }], false);
      ctx.stroke();
      ctx.setLineDash([]);
      drawSprite(ctx, sprites.spark, weave.cursorX, weave.cursorY, 1.6, 0.9);
    }
    if (weave.cut) {
      const p = weave.cut.progress;
      drawSprite(ctx, sprites.cut, weave.cut.x, weave.cut.y, 0.8 + p * 0.9, 0.4 + p * 0.6);
      ctx.strokeStyle = rgba(P.ember, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(weave.cut.x, weave.cut.y, 10 + p * 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.stroke();
    }
    for (const flash of weave.flashes) {
      const alpha = (1 - flash.age / WEAVE.flash) ** 1.5;
      poly(ctx, flash.polygon);
      ctx.fillStyle = rgba(P.goldDeep, 0.28 * alpha);
      ctx.fill();
      glowStroke(P.cyan, 14, 36, 0.8 * alpha);
      glowStroke('#ffffff', 3 + 3 * alpha, 18, alpha);
    }
    ctx.restore();
  }

  function drawWeaver(state) {
    const { weaver } = state;
    const alpha = weaver.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0 ? 0.3 : 1;
    ctx.save();
    lighter(ctx);
    weaver.trail.forEach((p, i) => {
      const t = (i + 1) / weaver.trail.length;
      drawSprite(ctx, sprites.spark, p.x, p.y, 0.5 + t * 0.9, t * 0.45 * alpha);
    });
    drawSprite(ctx, sprites.weaver, weaver.x, weaver.y, 0.9 + 0.1 * Math.sin(weaver.pulse * 6), 0.9 * alpha);
    drawSprite(ctx, sprites.weaverCore, weaver.x, weaver.y, 1.1, alpha);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = P.goldLight;
    sparklePath(ctx, weaver.x, weaver.y, 19, 0.22, state.time * 0.9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    sparklePath(ctx, weaver.x, weaver.y, 11, 0.3, -state.time * 1.3);
    ctx.fill();
    if (weaver.shield > 0) ring(ctx, weaver.x, weaver.y, 28, rgba(P.cyan, Math.min(1, weaver.shield) * 0.9), 2.5, [10, 6], -state.time * 50);
    glowText(ctx, 'YOU', weaver.x, weaver.y - 34, { size: 11, color: P.goldLight, outline: P.ink, letterSpacing: 2 });
    ctx.restore();
  }

  function drawParticles(state) {
    ctx.save();
    lighter(ctx);
    for (const p of state.effects.particles) {
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    for (const t of state.effects.texts) {
      const k = t.age / t.life;
      glowText(ctx, t.text, t.x, t.y - t.rise * k, { size: t.size, color: t.color, glow: t.color, blur: 16, alpha: 1 - k * k, outline: P.ink });
    }
  }

  function drawOverlays(state) {
    const { effects, slow } = state;
    for (const [amount, color] of [[effects.redFlash * 0.3, '255, 40, 30'], [effects.goldFlash * 0.14, '255, 210, 110'], [effects.cyanFlash * 0.22, '116, 243, 255']]) {
      if (amount <= 0) continue;
      ctx.fillStyle = `rgba(${color}, ${amount})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (slow.active <= 0) return;
    const edge = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.3, FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.7);
    edge.addColorStop(0, 'rgba(60, 200, 230, 0)');
    edge.addColorStop(1, `rgba(60, 200, 230, ${0.28 * Math.min(1, slow.active * 2)})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawField(state) {
    const { effects } = state;
    const realm = Math.max(0, state.realm);
    const lost = state.phase === PHASE.LOST;
    ctx.save();
    ctx.translate(effects.shakeX, effects.shakeY);
    drawRealm(ctx, realm, state.time, state.loom);
    drawLoom(ctx, state.loom, state.time, REALMS[realm].accent, (state.wave - 1 + Math.min(1, state.stats.waveCaptured / Math.max(1, state.waveTotal))) / WAVE_COUNT);
    drawAfterglows(state);
    if (!lost) drawAnchorStars(state);
    for (const moth of state.moths) if (moth.alive) drawMoth(ctx, moth, state.time);
    drawCaught(state);
    drawThreads(state);
    drawLances(ctx, state.abilities.lances, state.time);
    if (!lost) drawWeaver(state);
    const boss = findBoss(state.moths);
    if (boss) tagCentred(ctx, BOSSES[boss.kind].name.toUpperCase(), boss.x, boss.y + boss.radius + 13 * boss.veils + 30, P.gold, 12, 8);
    drawParticles(state);
    ctx.restore();
    drawOverlays(state);
  }

  return {
    toLogical,
    draw(state, screen, ui) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.fillStyle = '#07031a';
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.save();
      ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.offsetX, view.dpr * view.offsetY);
      ctx.beginPath();
      ctx.rect(0, 0, VIEW.width, VIEW.height);
      ctx.clip();
      ctx.save();
      ctx.translate(ARENA.x, ARENA.y);
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();
      const title = screen === SCREEN_TITLE;
      drawField(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        drawBossBar(ctx, state);
        drawObjective(ctx, state);
        drawCallout(ctx, state);
        drawWaveBanner(ctx, state);
      }
      if (title) drawTitle(ctx, state, ui);
      ctx.restore();
      drawTopBar(ctx, state, ui, title);
      drawSidePanel(ctx, state, ui, title);
      drawBottomBar(ctx, state, ui, title);
      ctx.save();
      ctx.translate(ARENA.x, ARENA.y);
      drawMotes(ctx, state.starlight, ui.time);
      ctx.restore();
      if (screen === SCREEN_PAUSED) drawPause(ctx, ui);
      if (screen === SCREEN_UPGRADE) drawUpgradeChoice(ctx, state, ui);
      if (screen === SCREEN_RESULTS) drawResults(ctx, state, ui);
      ctx.restore();
    },
  };
}

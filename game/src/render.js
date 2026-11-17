// The renderer: fits the view to the window, paints the playfield back to front, then the HUD frame and the screen on top.
import { ARENA, FIELD, LOOM, PALETTE, VIEW } from './config.js';
import { drawSprite, glowText, makeGlowSprite, rgba, sparklePath } from './glow.js';
import { drawBackdropStars, drawNebula, drawSky, drawVignette } from './sky.js';
import { drawMoth } from './mothart.js';
import { drawFieldLabels } from './labels.js';
import { starInReach } from './stars.js';
import { PHASE } from './world.js';
import { findBoss } from './bosses.js';
import { drawBottomBar, drawTopBar } from './hud/bars.js';
import { drawSidePanel } from './hud/sidepanel.js';
import { calloutAnchor, drawBossBar, drawCallout, drawObjective, drawWaveBanner } from './hud/callouts.js';
import { TITLE_ZONES, drawTitle } from './screens/title.js';
import { drawUpgradeChoice } from './screens/upgrade.js';
import { drawPause, drawResults } from './screens/results.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_RESULTS = 'results';

const TIER_COLORS = [PALETTE.cyan, PALETTE.cyan, PALETTE.gold, PALETTE.magenta, PALETTE.gold, PALETTE.gold];

/** The renderer bound to `canvas`; `draw` paints a frame and `toLogical` maps client points to the view. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { dpr: 1, scale: 1, offsetX: 0, offsetY: 0, width: VIEW.width, height: VIEW.height };
  const sprites = {
    star: makeGlowSprite(PALETTE.gold, 30, 0.1), starCyan: makeGlowSprite(PALETTE.cyan, 36, 0.06), weaver: makeGlowSprite(PALETTE.gold, 64, 0.06),
    weaverCore: makeGlowSprite('#ffffff', 18, 0.3), spark: makeGlowSprite(PALETTE.cyan, 12, 0.3), cut: makeGlowSprite(PALETTE.ember, 40, 0.1),
  };

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.width = width;
    view.height = height;
    canvas.width = Math.round(width * view.dpr);
    canvas.height = Math.round(height * view.dpr);
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.offsetX = (width - VIEW.width * view.scale) / 2;
    view.offsetY = (height - VIEW.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function toLogical(clientX, clientY) {
    return { x: (clientX - view.offsetX) / view.scale, y: (clientY - view.offsetY) / view.scale };
  }

  function tracePath(points, close = true) {
    ctx.beginPath();
    for (const p of points) ctx.lineTo(p.x, p.y);
    if (close) ctx.closePath();
  }

  function glowStroke(color, width, blur, alpha) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function fillNet(polygon, color, alpha, time) {
    ctx.save();
    tracePath(polygon);
    ctx.clip();
    ctx.fillStyle = rgba(color, 0.13 * alpha);
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = rgba(color, 0.24 * alpha);
    ctx.lineWidth = 1.2;
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
    const { loom } = state;
    for (const glow of loom.afterglows) {
      const alpha = Math.min(1, (1 - glow.age / glow.life) * 1.4);
      const color = TIER_COLORS[glow.tier] || PALETTE.cyan;
      fillNet(glow.polygon, color, alpha, state.time);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      tracePath(glow.polygon);
      glowStroke(color, 6, 18, 0.75 * alpha);
      glowStroke(PALETTE.goldLight, 2, 0, 0.8 * alpha);
      for (const p of glow.polygon) drawSprite(ctx, sprites.star, p.x, p.y, 0.9, 0.6 * alpha);
      ctx.restore();
    }
    ctx.save();
    ctx.lineWidth = 2;
    for (const ghost of loom.ghosts) {
      tracePath(ghost.points, false);
      ctx.strokeStyle = rgba(ghost.cut ? PALETTE.ember : PALETTE.textSoft, (1 - ghost.age / 0.6) * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawReach(state) {
    const { weaver, loom } = state;
    ctx.strokeStyle = rgba(PALETTE.cyan, loom.active ? 0.4 : 0.2);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 11]);
    ctx.lineDashOffset = -state.time * 24;
    ctx.beginPath();
    ctx.arc(weaver.x, weaver.y, weaver.reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawAnchorStars(state) {
    const { stars, loom, weaver } = state;
    ctx.save();
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      const twinkle = 0.8 + 0.2 * Math.sin(state.time * star.twinkle + star.phase);
      const inChain = loom.chain.includes(i);
      const reachable = state.phase !== PHASE.LOST && starInReach(star, weaver.x, weaver.y, weaver.reach);
      const hovered = i === state.hoverStar;
      ctx.globalCompositeOperation = 'lighter';
      drawSprite(ctx, sprites.star, star.x, star.y, (star.size / 7) * (inChain ? 1.9 : reachable ? 1.35 : 0.95) * twinkle, inChain ? 1 : reachable ? 0.85 : 0.5);
      if (reachable) drawSprite(ctx, sprites.starCyan, star.x, star.y, 0.9, inChain ? 0.6 : 0.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = inChain ? '#ffffff' : PALETTE.goldLight;
      sparklePath(ctx, star.x, star.y, star.size * 1.25 * twinkle, 0.3, 0);
      ctx.fill();
      ctx.fillStyle = rgba(PALETTE.goldLight, 0.7);
      sparklePath(ctx, star.x, star.y, star.size * 0.8 * twinkle, 0.3, Math.PI / 4);
      ctx.fill();
      if (reachable || inChain) {
        ctx.strokeStyle = rgba(PALETTE.cyan, hovered ? 0.95 : inChain ? 0.75 : 0.45);
        ctx.lineWidth = hovered ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, hovered ? 20 : 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (loom.active && loom.chain[0] === i && loom.chain.length >= LOOM.minLoop) {
        const pulse = 0.5 + 0.5 * Math.sin(state.time * 8);
        ctx.strokeStyle = rgba(PALETTE.gold, 0.5 + 0.5 * pulse);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(star.x, star.y, 26 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        glowText(ctx, 'CLOSE HERE', star.x, star.y - 38, { size: 12, color: PALETTE.gold, outline: PALETTE.ink, letterSpacing: 1 });
      }
    }
    ctx.restore();
  }

  function drawThreads(state) {
    const { loom, stars } = state;
    if (loom.chain.length === 0) return;
    const points = loom.chain.map((index) => stars[index]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (points.length >= 2) {
      tracePath(points, false);
      glowStroke(PALETTE.cyan, 12, 24, 0.55);
      glowStroke(PALETTE.goldLight, 3.5, 0, 1);
      for (let i = 0; i + 1 < points.length; i += 1) {
        for (let k = 0; k < 2; k += 1) {
          const t = (state.time * 0.55 + k * 0.5 + i * 0.21) % 1;
          drawSprite(ctx, sprites.spark, points[i].x + (points[i + 1].x - points[i].x) * t, points[i].y + (points[i + 1].y - points[i].y) * t, 1.1, 0.8);
        }
      }
    }
    if (loom.active) {
      const last = points[points.length - 1];
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.6);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 7]);
      ctx.lineDashOffset = -state.time * 60;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(loom.cursorX, loom.cursorY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawSprite(ctx, sprites.spark, loom.cursorX, loom.cursorY, 1.4, 0.9);
    }
    if (loom.cut) {
      const p = loom.cut.progress;
      drawSprite(ctx, sprites.cut, loom.cut.x, loom.cut.y, 0.8 + p * 0.9, 0.4 + p * 0.6);
      ctx.strokeStyle = rgba(PALETTE.ember, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(loom.cut.x, loom.cut.y, 10 + p * 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlashes(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const flash of state.loom.flashes) {
      const alpha = Math.pow(1 - flash.age / LOOM.flash, 1.5);
      tracePath(flash.polygon);
      ctx.fillStyle = rgba(PALETTE.goldDeep, 0.2 * alpha);
      ctx.fill();
      glowStroke(PALETTE.cyan, 10, 30, 0.8 * alpha);
      glowStroke('#ffffff', 2.5 + 2 * alpha, 18, alpha);
    }
    ctx.restore();
  }

  function drawWeaver(state) {
    const { weaver } = state;
    const alpha = weaver.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0 ? 0.3 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    weaver.trail.forEach((p, i) => {
      const t = (i + 1) / weaver.trail.length;
      drawSprite(ctx, sprites.spark, p.x, p.y, 0.5 + t * 0.9, t * 0.45 * alpha);
    });
    drawSprite(ctx, sprites.weaver, weaver.x, weaver.y, 0.9 + 0.1 * Math.sin(weaver.pulse * 6), 0.9 * alpha);
    drawSprite(ctx, sprites.weaverCore, weaver.x, weaver.y, 1.1, alpha);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.goldLight;
    sparklePath(ctx, weaver.x, weaver.y, 19, 0.22, state.time * 0.9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    sparklePath(ctx, weaver.x, weaver.y, 11, 0.3, -state.time * 1.3);
    ctx.fill();
    if (weaver.shield > 0) {
      ctx.strokeStyle = rgba(PALETTE.cyan, Math.min(1, weaver.shield) * 0.9);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -state.time * 50;
      ctx.beginPath();
      ctx.arc(weaver.x, weaver.y, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.effects.particles) {
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    for (const label of state.effects.texts) {
      const t = label.age / label.life;
      glowText(ctx, label.text, label.x, label.y - label.rise * t, { size: label.size, color: label.color, glow: label.color, blur: 16, alpha: 1 - t * t, outline: PALETTE.ink });
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
    glowText(ctx, 'STILL TIME', FIELD.width / 2, FIELD.height - 76, { size: 26, color: PALETTE.cyan, glow: PALETTE.cyanDeep, blur: 20, letterSpacing: 8, alpha: 0.6 + 0.4 * Math.sin(state.time * 6), outline: PALETTE.ink });
  }

  /** What the field labels keep clear of: the title's words, or the objective line, boss bar, banner, callout and CLOSE HERE. */
  function overlayBoxes(state, title) {
    if (title) return TITLE_ZONES;
    const { loom, stars, callout } = state;
    const boxes = [{ x: FIELD.width / 2 - 400, y: FIELD.height - 50, w: 800, h: 50 }];
    if (findBoss(state.moths)) boxes.push({ x: FIELD.width / 2 - 300, y: 0, w: 600, h: 92 });
    if (state.banner) boxes.push({ x: 0, y: 106, w: FIELD.width, h: 134 });
    if (callout) {
      const { x, y } = calloutAnchor(state);
      boxes.push({ x: x - 250, y: y - 80, w: 500, h: 126 });
    }
    if (loom.active && loom.chain.length >= LOOM.minLoop) boxes.push({ x: stars[loom.chain[0]].x - 50, y: stars[loom.chain[0]].y - 50, w: 100, h: 24 });
    return boxes;
  }

  function drawField(state, title) {
    const { weaver, effects } = state;
    ctx.save();
    ctx.translate(effects.shakeX, effects.shakeY);
    drawSky(ctx);
    drawNebula(ctx, state.time);
    drawBackdropStars(ctx, state.backdrop, weaver.x - FIELD.width / 2, weaver.y - FIELD.height / 2, state.time);
    drawAfterglows(state);
    if (state.phase !== PHASE.LOST) drawReach(state);
    drawAnchorStars(state);
    drawThreads(state);
    for (const moth of state.moths) if (moth.alive) drawMoth(ctx, moth, state.time);
    drawFlashes(state);
    if (state.phase !== PHASE.LOST) drawWeaver(state);
    drawFieldLabels(ctx, state, overlayBoxes(state, title), title);
    drawParticles(state);
    ctx.restore();
    drawVignette(ctx);
    drawOverlays(state);
  }

  return {
    toLogical,
    /** Paint `state` with `screen` on top; `ui` carries the high score, hover card, mute state and wall time. */
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
      drawField(state, title);
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
      if (screen === SCREEN_PAUSED) drawPause(ctx, ui);
      if (screen === SCREEN_UPGRADE) drawUpgradeChoice(ctx, state, ui);
      if (screen === SCREEN_RESULTS) drawResults(ctx, state, ui);
      ctx.restore();
    },
  };
}

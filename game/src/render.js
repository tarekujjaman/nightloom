// The renderer: fits the 1280x800 field into the window and paints the world each frame, back to
// front: sky, nebula, parallax stars, loop afterglows, anchor stars, the held threads, moths, the
// Weaver, sparks, the snap flash and labels; then the HUD and whichever screen is on top.
import { FIELD, LOOM, PALETTE } from './config.js';
import { drawSprite, glowText, makeGlowSprite, rgba, sparklePath } from './glow.js';
import { drawBackdropStars, drawNebula, drawSky, drawVignette } from './sky.js';
import { drawMoth } from './mothart.js';
import { starInReach } from './stars.js';
import { drawHud } from './hud.js';
import { SCREEN_PAUSED, SCREEN_RESULTS, SCREEN_TITLE, SCREEN_UPGRADE, drawPause, drawResults, drawTitle, drawUpgradeChoice, drawWaveBanner } from './screens.js';
import { PHASE_LOST } from './world.js';

/** The renderer bound to `canvas`; `draw` paints a frame and `toLogical` maps client points to the field. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { dpr: 1, scale: 1, offsetX: 0, offsetY: 0, width: FIELD.width, height: FIELD.height };
  const sprites = {
    star: makeGlowSprite(PALETTE.gold, 30, 0.1),
    starCyan: makeGlowSprite(PALETTE.cyan, 36, 0.06),
    weaver: makeGlowSprite(PALETTE.gold, 64, 0.06),
    weaverCore: makeGlowSprite('#ffffff', 18, 0.3),
    spark: makeGlowSprite(PALETTE.cyan, 12, 0.3),
    cut: makeGlowSprite(PALETTE.ember, 40, 0.1),
  };

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.width = width;
    view.height = height;
    canvas.width = Math.round(width * view.dpr);
    canvas.height = Math.round(height * view.dpr);
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.offsetX = (width - FIELD.width * view.scale) / 2;
    view.offsetY = (height - FIELD.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function toLogical(clientX, clientY) {
    return { x: (clientX - view.offsetX) / view.scale, y: (clientY - view.offsetY) / view.scale };
  }

  function drawAfterglows(state) {
    const { loom } = state;
    if (loom.afterglows.length === 0 && loom.ghosts.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const glow of loom.afterglows) {
      const fade = 1 - glow.age / glow.life;
      const alpha = Math.min(1, fade * 1.4);
      ctx.beginPath();
      glow.polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = rgba(PALETTE.cyan, 0.07 * alpha);
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.7 * alpha);
      ctx.lineWidth = 4.5;
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(PALETTE.goldLight, 0.7 * alpha);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      for (const p of glow.polygon) {
        drawSprite(ctx, sprites.star, p.x, p.y, 0.9, 0.6 * alpha);
      }
    }
    for (const ghost of loom.ghosts) {
      const alpha = (1 - ghost.age / 0.6) * 0.5;
      ctx.strokeStyle = ghost.cut ? rgba(PALETTE.ember, alpha) : rgba(PALETTE.textDim, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ghost.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawReach(state) {
    const { weaver, loom } = state;
    if (state.phase === PHASE_LOST) return;
    ctx.save();
    ctx.strokeStyle = rgba(PALETTE.cyan, loom.active ? 0.32 : 0.14);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 11]);
    ctx.lineDashOffset = -state.time * 24;
    ctx.beginPath();
    ctx.arc(weaver.x, weaver.y, weaver.reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawAnchorStars(state) {
    const { stars, loom, weaver } = state;
    ctx.save();
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      const twinkle = 0.8 + 0.2 * Math.sin(state.time * star.twinkle + star.phase);
      const inChain = loom.chain.includes(i);
      const reachable = state.phase !== PHASE_LOST && starInReach(star, weaver.x, weaver.y, weaver.reach);
      const hovered = i === state.hoverStar;
      const first = loom.active && loom.chain[0] === i;
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
        ctx.strokeStyle = rgba(PALETTE.cyan, hovered ? 0.95 : inChain ? 0.75 : 0.4);
        ctx.lineWidth = hovered ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, hovered ? 20 : 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (first && loom.chain.length >= LOOM.minLoop) {
        const pulse = 0.5 + 0.5 * Math.sin(state.time * 8);
        ctx.strokeStyle = rgba(PALETTE.gold, 0.5 + 0.5 * pulse);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(star.x, star.y, 26 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
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
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.5);
      ctx.lineWidth = 8;
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 22;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(PALETTE.goldLight, 0.95);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      for (let i = 0; i + 1 < points.length; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        for (let k = 0; k < 2; k += 1) {
          const t = (state.time * 0.55 + k * 0.5 + i * 0.21) % 1;
          drawSprite(ctx, sprites.spark, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1.1, 0.8);
        }
      }
    }
    if (loom.active) {
      const last = points[points.length - 1];
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.55);
      ctx.lineWidth = 2;
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
    const { loom } = state;
    if (loom.flashes.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const flash of loom.flashes) {
      const fade = 1 - flash.age / LOOM.flash;
      const alpha = Math.pow(fade, 1.5);
      ctx.beginPath();
      flash.polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = rgba(PALETTE.goldDeep, 0.3 * alpha);
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.85 * alpha);
      ctx.lineWidth = 9;
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 30;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba('#ffffff', alpha);
      ctx.lineWidth = 2.5 + 2 * alpha;
      ctx.shadowColor = PALETTE.goldLight;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawWeaver(state) {
    const { weaver } = state;
    if (state.phase === PHASE_LOST) return;
    const blink = weaver.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0;
    const alpha = blink ? 0.3 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < weaver.trail.length; i += 1) {
      const t = (i + 1) / weaver.trail.length;
      drawSprite(ctx, sprites.spark, weaver.trail[i].x, weaver.trail[i].y, 0.5 + t * 0.9, t * 0.45 * alpha);
    }
    const pulse = 0.9 + 0.1 * Math.sin(weaver.pulse * 6);
    drawSprite(ctx, sprites.weaver, weaver.x, weaver.y, pulse, 0.9 * alpha);
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
    ctx.beginPath();
    ctx.arc(weaver.x, weaver.y, 5.5, 0, Math.PI * 2);
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
    const { particles } = state.effects;
    if (particles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTexts(state) {
    for (const label of state.effects.texts) {
      const t = label.age / label.life;
      const alpha = 1 - t * t;
      glowText(ctx, label.text, label.x, label.y - label.rise * t, { size: label.size, weight: '800', color: label.color, glow: label.color, blur: 16, alpha });
    }
  }

  function drawOverlays(state) {
    const { effects, slow } = state;
    if (effects.redFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 30, ${effects.redFlash * 0.3})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (effects.goldFlash > 0) {
      ctx.fillStyle = `rgba(255, 210, 110, ${effects.goldFlash * 0.14})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (effects.cyanFlash > 0) {
      ctx.fillStyle = `rgba(116, 243, 255, ${effects.cyanFlash * 0.22})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
    if (slow.active > 0) {
      const edge = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.3, FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.7);
      edge.addColorStop(0, 'rgba(60, 200, 230, 0)');
      edge.addColorStop(1, `rgba(60, 200, 230, ${0.28 * Math.min(1, slow.active * 2)})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  /** The whole field, from sky to labels. */
  function drawField(state) {
    const { weaver, effects } = state;
    ctx.save();
    ctx.translate(effects.shakeX, effects.shakeY);
    drawSky(ctx);
    drawNebula(ctx, state.time);
    drawBackdropStars(ctx, state.backdrop, weaver.x - FIELD.width / 2, weaver.y - FIELD.height / 2, state.time);
    drawAfterglows(state);
    drawReach(state);
    drawAnchorStars(state);
    drawThreads(state);
    for (const moth of state.moths) if (moth.alive) drawMoth(ctx, moth, state.time);
    drawFlashes(state);
    drawWeaver(state);
    drawParticles(state);
    drawTexts(state);
    ctx.restore();
    drawVignette(ctx, 0.5);
    drawOverlays(state);
  }

  return {
    toLogical,
    /** Paint `state` with `screen` on top; `ui` carries the high score, hover card, mute state and wall time. */
    draw(state, screen, ui) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.fillStyle = PALETTE.skyBottom;
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.save();
      ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.offsetX, view.dpr * view.offsetY);
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();
      drawField(state);
      if (screen === SCREEN_TITLE) {
        drawTitle(ctx, state, ui);
      } else {
        if (screen !== SCREEN_RESULTS) {
          drawHud(ctx, state, ui, { wave: screen !== SCREEN_UPGRADE });
          if (screen !== SCREEN_UPGRADE) drawWaveBanner(ctx, state);
        }
        if (screen === SCREEN_PAUSED) drawPause(ctx, ui);
        if (screen === SCREEN_UPGRADE) drawUpgradeChoice(ctx, state, ui);
        if (screen === SCREEN_RESULTS) drawResults(ctx, state, ui);
      }
      ctx.restore();
    },
  };
}

// The four realms: each a named sky with its own palette, clouds and backdrop; the parallax stars; the vignette.
import { FIELD } from './config.js';
import { drawSprite, lighter, poly } from './glow.js';

export const REALMS = [
  { name: 'Aurora Reach', first: 1, last: 3, tagline: 'Curtains of green light; the first moths drift in', accent: '#4df0b0', sky: ['#17406a', '#102c56', '#0a4a4c'], clouds: [['70, 230, 200', 230, 210, 1.9, 0.5], ['90, 190, 255', 740, 170, 1.6, 0.4], ['40, 240, 170', 560, 500, 1.8, 0.45]] },
  { name: 'Ember Nebula', first: 4, last: 5, tagline: 'Warm clouds of ash and rose; the Eclipse Moth rises', accent: '#ff8a45', sky: ['#5e2238', '#3c1634', '#1e0c34'], clouds: [['255, 140, 70', 240, 220, 2, 0.7], ['255, 90, 140', 720, 170, 1.8, 0.55], ['255, 170, 90', 560, 520, 1.9, 0.5], ['255, 60, 90', 880, 500, 1.3, 0.45]] },
  { name: 'Frost Veil', first: 6, last: 8, tagline: 'Ice-blue silence and crystal stars; phantoms fade', accent: '#9fe8ff', sky: ['#1a4486', '#0e2660', '#08183a'], clouds: [['120, 200, 255', 260, 220, 1.9, 0.55], ['210, 240, 255', 700, 180, 1.5, 0.4], ['80, 160, 255', 580, 520, 1.9, 0.45]] },
  { name: 'The Hollow Dark', first: 9, last: 10, tagline: 'Violet deeps threaded with gold; the Hollow Queen waits', accent: '#ffd36b', sky: ['#3e1678', '#200c48', '#0c0422'], clouds: [['170, 110, 255', 230, 200, 1.9, 0.75], ['255, 200, 110', 740, 160, 1.4, 0.35], ['120, 60, 220', 580, 500, 2, 0.65], ['255, 211, 107', 860, 520, 1.1, 0.3]] },
];

export const realmIndex = (wave) => Math.max(0, REALMS.findIndex((realm) => wave >= realm.first && wave <= realm.last));
export const realmOf = (wave) => REALMS[realmIndex(wave)];

const skies = [];
const clouds = {};
const hexagon = (r) => Array.from({ length: 6 }, (_, k) => ({ x: Math.cos((k * Math.PI) / 3) * r, y: Math.sin((k * Math.PI) / 3) * r }));

function cloud(rgb) {
  if (clouds[rgb]) return clouds[rgb];
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 440;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(220, 220, 0, 220, 220, 220);
  for (const [at, a] of [[0, 0.5], [0.3, 0.26], [0.65, 0.08], [1, 0]]) gradient.addColorStop(at, `rgba(${rgb}, ${a})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 440, 440);
  return (clouds[rgb] = sprite);
}

function motes(ctx, t, count, speed, color) {
  for (let i = 0; i < count; i += 1) {
    const y = FIELD.height + 20 - ((i * 97 + t * (speed + (i % 5) * 5)) % (FIELD.height + 60));
    ctx.fillStyle = color(i, t);
    ctx.fillRect(((i * 173) % FIELD.width) + Math.sin(t * 0.8 + i) * 24, y, 2.5, 2.5);
  }
}

const BACKDROPS = [
  (ctx, t) => {
    for (let i = 0; i < 3; i += 1) {
      const base = 30 + i * 80;
      const rgb = i === 1 ? '120, 230, 255' : '90, 255, 190';
      const gradient = ctx.createLinearGradient(0, base - 30, 0, base + 230);
      gradient.addColorStop(0, `rgba(${rgb}, 0)`);
      gradient.addColorStop(0.3, `rgba(${rgb}, 0.2)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      for (let x = -40; x <= FIELD.width + 40; x += 32) ctx.lineTo(x, base + Math.sin(x * 0.006 + t * 0.4 + i * 2) * 36 + Math.sin(x * 0.017 - t * 0.7) * 14);
      for (let x = FIELD.width + 40; x >= -40; x -= 32) ctx.lineTo(x, base + 210 + Math.sin(x * 0.008 + t * 0.3 + i) * 50);
      ctx.fill();
    }
  },
  (ctx, t) => {
    const glow = ctx.createRadialGradient(FIELD.width * 0.3, FIELD.height + 60, 0, FIELD.width * 0.3, FIELD.height + 60, 520);
    glow.addColorStop(0, 'rgba(255, 120, 50, 0.4)');
    glow.addColorStop(1, 'rgba(255, 120, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    motes(ctx, t, 36, 18, (i) => `rgba(255, ${150 + (i % 4) * 25}, 70, ${0.35 + 0.35 * Math.sin(t * 3 + i)})`);
  },
  (ctx, t) => {
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.14)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i += 1) {
      ctx.save();
      ctx.translate(90 + ((i * 151) % 800), 70 + ((i * 211) % 480));
      ctx.rotate(t * 0.05 * (i % 2 ? 1 : -1) + i);
      const corners = hexagon(34 + ((i * 37) % 48));
      poly(ctx, corners);
      for (const c of corners.slice(0, 3)) {
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(-c.x, -c.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  },
  (ctx, t) => motes(ctx, t, 54, 10, (i) => `rgba(255, 215, 120, ${0.25 + 0.35 * Math.sin(t * 2 + i * 0.9)})`),
];

export function drawRealm(ctx, index, time) {
  const realm = REALMS[index];
  if (!skies[index]) {
    skies[index] = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    realm.sky.forEach((color, i) => skies[index].addColorStop(i / 2, color));
  }
  ctx.fillStyle = skies[index];
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  lighter(ctx);
  const t = time * 0.05;
  realm.clouds.forEach(([rgb, x, y, scale, alpha], i) => drawSprite(ctx, cloud(rgb), x + Math.sin(t * (1 - i * 0.2)) * 40, y + Math.cos(t * (0.7 + i * 0.15)) * 30, scale, alpha));
  BACKDROPS[index](ctx, time);
  ctx.restore();
}

export function drawBackdropStars(ctx, backdrop, parallaxX, parallaxY, time) {
  ctx.save();
  for (const layer of backdrop) {
    for (const star of layer.stars) {
      ctx.globalAlpha = layer.alpha * (0.55 + 0.45 * Math.sin(time * star.speed + star.phase));
      ctx.fillStyle = star.warm ? '#ffe9b0' : '#eefaff';
      const x = star.x - parallaxX * layer.depth;
      const y = star.y - parallaxY * layer.depth;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size <= 2.2) continue;
      ctx.globalAlpha *= 0.5;
      ctx.fillRect(x - star.size * 2.5, y - 0.5, star.size * 5, 1);
      ctx.fillRect(x - 0.5, y - star.size * 2.5, 1, star.size * 5);
    }
  }
  ctx.restore();
}

export function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.4, FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.75);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(6, 0, 20, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

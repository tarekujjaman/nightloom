// The four realms: a name, tagline and accent for the HUD, and the painted Weavers' Hill each restyles (art/hill-N with its lights-N): the village windows flicker, dim as the Loom's health falls and gutter near it when it is bitten.
import { FIELD, LOOM } from './config.js';
import { ART, artLoaded } from './art.js';
import { lighter } from './glow.js';

export const REALMS = [
  { name: 'Aurora Reach', first: 1, last: 3, tagline: 'Green curtains over the snowy pines; the first moths drift in', accent: '#4df0b0', sky: '#0f3550' },
  { name: 'Ember Nebula', first: 4, last: 5, tagline: 'Warm haze, autumn trees and lantern strings; the Eclipse Moth rises', accent: '#ff8a45', sky: '#5a1e30' },
  { name: 'Frost Veil', first: 6, last: 8, tagline: 'Ice, a frozen lake and crystal stars; phantoms fade', accent: '#9fe8ff', sky: '#0f2e66' },
  { name: 'The Hollow Dark', first: 9, last: 10, tagline: 'Violet ruins lit from below with gold; the Hollow Queen waits', accent: '#ffd36b', sky: '#38146c' },
];

export const realmIndex = (wave) => Math.max(0, REALMS.findIndex((realm) => wave >= realm.first && wave <= realm.last));
export const realmOf = (wave) => REALMS[realmIndex(wave)];

/** How brightly the village's windows burn: with the Loom's health (never below 0.45) and a slow flicker. */
export const villageLight = (loom, time) => (0.45 + (0.55 * loom.health) / loom.max) * (0.92 + 0.08 * Math.sin(time * 7.3) * Math.sin(time * 1.9));

export function drawRealm(ctx, index, time, loom) {
  if (!artLoaded()) {
    ctx.fillStyle = REALMS[index].sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    return;
  }
  ctx.drawImage(ART.hills[index], 0, 0, FIELD.width, FIELD.height);
  const light = villageLight(loom, time);
  const near = 1 - loom.hurt * (0.6 + 0.4 * Math.sin(time * 50));
  ctx.save();
  lighter(ctx);
  for (const inside of [false, true]) {
    ctx.save();
    ctx.beginPath();
    if (!inside) ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.arc(LOOM.x, LOOM.y + 90, 280, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.globalAlpha = inside ? light * near : light;
    ctx.drawImage(ART.lights[index], 0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }
  ctx.restore();
}

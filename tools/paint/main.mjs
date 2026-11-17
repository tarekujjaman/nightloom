// The painter's page entry: paints every piece of art once, shows them for a look, and hands each to tools/paint.mjs
// as a data URL through window.__paint(name, type, quality). Previews (backdrop with its lights) go to out/paint/.
import { canvas, createRandom, makeNoise } from './brush.mjs';
import { paintRealm } from './hill.mjs';
import { paintLoomSheet } from './loom.mjs';

const outputs = {};
const previews = {};
for (let i = 0; i < 4; i += 1) {
  const { backdrop, lights } = paintRealm(i, createRandom, makeNoise);
  outputs[`hill-${i}.webp`] = backdrop;
  outputs[`lights-${i}.webp`] = lights;
  const preview = canvas(backdrop.width, backdrop.height);
  const ctx = preview.getContext('2d');
  ctx.drawImage(backdrop, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lights, 0, 0);
  previews[`preview-${i}.png`] = preview;
}
outputs['loom.png'] = paintLoomSheet(createRandom);
for (const [name, c] of Object.entries({ ...previews, 'loom.png': outputs['loom.png'] })) {
  c.title = name;
  c.style.cssText = 'display:block;margin:8px;background:#222;max-width:968px';
  document.body.appendChild(c);
}
window.__paint = (name, type = 'image/png', quality) => (outputs[name] || previews[name]).toDataURL(type, quality);
window.__paintNames = Object.keys(outputs);
window.__previewNames = Object.keys(previews);
window.__paintReady = true;

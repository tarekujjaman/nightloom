// The painted art under art/, loaded once: the Weavers' Hill backdrop and its window lights for each realm, and the Loom sheet. tools/paint.mjs paints them procedurally (seeded noise and gradients, no downloaded image); nothing here is fetched from the network.
const NAMES = [...[0, 1, 2, 3].map((i) => `hill-${i}.webp`), ...[0, 1, 2, 3].map((i) => `lights-${i}.webp`), 'loom.png'];

export const ART = { hills: [], lights: [], loom: null, loaded: 0, total: NAMES.length, failed: [] };

export const artReady = Promise.all(NAMES.map((name, i) => new Promise((done) => {
  const image = new Image();
  image.onload = () => {
    ART.loaded += 1;
    done();
  };
  image.onerror = () => {
    ART.failed.push(name);
    done();
  };
  image.src = new URL(`../art/${name}`, import.meta.url).href;
  if (i < 4) ART.hills[i] = image;
  else if (i < 8) ART.lights[i - 4] = image;
  else ART.loom = image;
})));

export const artLoaded = () => ART.loaded === ART.total;

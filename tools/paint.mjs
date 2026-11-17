// Paint NIGHTLOOM's static art: the four Weavers' Hill backdrops (game/art/hill-N.webp), their window-light layers
// (game/art/lights-N.png) and the Loom sheet (game/art/loom.png). Every stroke is procedural (tools/paint/*.mjs:
// seeded randomness, value noise, gradients; no text and no downloaded image), drawn on canvases in headless Chrome
// over the DevTools protocol with the GPU off, so the same source paints the same bytes. Node 22+, standard library.
//   node tools/paint.mjs            paint and write game/art/, reporting which files changed
//   node tools/paint.mjs --check    paint and compare with game/art/ without writing (exit 1 on a difference)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session, evaluate, launchChrome, serveStatic, waitFor } from './cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const WEBP_QUALITY = 0.86;

async function main() {
  const server = await serveStatic(root);
  const chrome = await launchChrome(['--disable-gpu', '--disable-gpu-compositing']);
  const session = new Session(chrome.wsUrl);
  await session.connect();
  const problems = [];
  session.on((method, params) => {
    if (method === 'Runtime.exceptionThrown') problems.push(`exception: ${params.exceptionDetails.text} ${params.exceptionDetails.exception?.description ?? ''}`);
    if (method === 'Runtime.consoleAPICalled' && params.type === 'error') problems.push(`console.error: ${params.args.map((arg) => arg.value ?? arg.description).join(' ')}`);
  });
  let differences = 0;
  try {
    const { sessionId } = await session.openPage();
    await session.send('Runtime.enable', {}, sessionId);
    await session.send('Page.enable', {}, sessionId);
    const started = Date.now();
    await session.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/tools/paint.html` }, sessionId);
    await waitFor(session, sessionId, 'window.__paintReady === true', 180000, 250);
    console.log(`painted in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    const names = await evaluate(session, sessionId, 'window.__paintNames');
    mkdirSync(join(root, 'game', 'art'), { recursive: true });
    for (const name of names) {
      const webp = name.endsWith('.webp');
      const url = await evaluate(session, sessionId, `window.__paint(${JSON.stringify(name)}, ${JSON.stringify(webp ? 'image/webp' : 'image/png')}, ${webp ? WEBP_QUALITY : 'undefined'})`);
      const bytes = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      const file = join(root, 'game', 'art', name);
      const before = existsSync(file) ? readFileSync(file) : null;
      const same = before !== null && before.equals(bytes);
      const status = before === null ? 'new' : same ? 'unchanged' : 'changed';
      if (!same) differences += 1;
      if (!check) writeFileSync(file, bytes);
      console.log(`${name}: ${bytes.length} bytes sha256 ${createHash('sha256').update(bytes).digest('hex').slice(0, 12)} ${status}`);
    }
    // Previews of each backdrop with its lights lit, for a look outside the game.
    mkdirSync(join(root, 'out', 'paint'), { recursive: true });
    for (const name of await evaluate(session, sessionId, 'window.__previewNames')) {
      const url = await evaluate(session, sessionId, `window.__paint(${JSON.stringify(name)}, 'image/png')`);
      writeFileSync(join(root, 'out', 'paint', name), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    }
  } finally {
    session.close();
    chrome.kill();
    server.close();
  }
  for (const problem of problems) console.log(`  ${problem}`);
  if (problems.length > 0 || (check && differences > 0)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Take the screenshots listed in shots.json: serve game/, launch headless Chrome, open each scene's
// query at 1280x800, wait for window.__shotReady, capture a JPEG and save it under screenshots/
// at most 256 KiB (the quality is lowered until it fits). Node 22+, standard library only.
//   node tools/shoot.mjs            every scene in shots.json
//   node tools/shoot.mjs 1-title    only the scenes whose names contain the argument
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session, evaluate, launchChrome, serveStatic, waitFor } from './cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const MAX_BYTES = 256 * 1024;
const filter = process.argv[2] ?? '';

async function main() {
  const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8')).filter((shot) => shot.name.includes(filter));
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  const server = await serveStatic(join(root, 'game'));
  const chrome = await launchChrome();
  const session = new Session(chrome.wsUrl);
  await session.connect();
  const problems = [];
  session.on((method, params) => {
    if (method === 'Runtime.exceptionThrown') problems.push(`exception: ${params.exceptionDetails.text} ${params.exceptionDetails.exception?.description ?? ''}`);
    if (method === 'Runtime.consoleAPICalled' && (params.type === 'error' || params.type === 'warning')) problems.push(`console.${params.type}: ${params.args.map((arg) => arg.value ?? arg.description).join(' ')}`);
    if (method === 'Log.entryAdded' && params.entry.level === 'error') problems.push(`log: ${params.entry.text}`);
  });
  try {
    const { sessionId } = await session.openPage();
    await session.send('Runtime.enable', {}, sessionId);
    await session.send('Log.enable', {}, sessionId);
    await session.send('Page.enable', {}, sessionId);
    await session.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
    for (const shot of shots) {
      const url = `http://127.0.0.1:${server.port}/${shot.query}`;
      await session.send('Page.navigate', { url }, sessionId);
      await waitFor(session, sessionId, 'window.__shotReady === true', 60000);
      const size = await evaluate(session, sessionId, '[window.innerWidth, window.innerHeight]');
      let quality = 92;
      let bytes = null;
      while (quality >= 30) {
        const { data } = await session.send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false }, sessionId);
        bytes = Buffer.from(data, 'base64');
        if (bytes.length <= MAX_BYTES) break;
        quality -= 6;
      }
      writeFileSync(join(root, 'screenshots', shot.name), bytes);
      console.log(`${shot.name}: ${shot.query} viewport ${size[0]}x${size[1]} quality ${quality} ${bytes.length} bytes`);
    }
  } finally {
    session.close();
    chrome.kill();
    server.close();
  }
  if (problems.length > 0) {
    console.log('Problems seen while staging the scenes:');
    for (const problem of problems) console.log(`  ${problem}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

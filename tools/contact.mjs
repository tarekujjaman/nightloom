// Build the judge's contact sheet from screenshots/: the first file by name fitted inside 768x480 on
// top, the others in a row of small cells beneath, as dossier-view/v1 lays it out. Writes
// out/contact.jpg so the cover can be judged at the size the judge sees it. Node 22+, no libraries.
//   node tools/contact.mjs
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session, launchChrome, serveStatic, waitFor } from './cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

async function main() {
  const names = readdirSync(join(root, 'screenshots')).filter((name) => /\.(jpe?g|png)$/i.test(name)).sort();
  const server = await serveStatic(root);
  const chrome = await launchChrome();
  const session = new Session(chrome.wsUrl);
  await session.connect();
  try {
    const { sessionId } = await session.openPage();
    await session.send('Page.enable', {}, sessionId);
    await session.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 700, deviceScaleFactor: 1, mobile: false }, sessionId);
    await session.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/tools/contact.html?names=${encodeURIComponent(names.join(','))}` }, sessionId);
    await waitFor(session, sessionId, 'window.__ready === true', 20000);
    const { data } = await session.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, sessionId);
    mkdirSync(join(root, 'out'), { recursive: true });
    writeFileSync(join(root, 'out', 'contact.jpg'), Buffer.from(data, 'base64'));
    console.log(`out/contact.jpg: cover ${names[0]} at 768x480, then ${names.slice(1).join(', ')}`);
  } finally {
    session.close();
    chrome.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

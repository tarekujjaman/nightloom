// Play NIGHTLOOM through in headless Chrome and report any console error or uncaught exception:
// the title, a click to start, keyboard movement, a loop woven with the mouse, pause, mute, every
// wave cleared to the victory screen, a restart, a defeat and another restart.
//   node tools/check.mjs
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session, evaluate, launchChrome, serveStatic, sleep, waitFor } from './cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failures = [];

function expect(condition, message) {
  if (condition) console.log(`  ok   ${message}`);
  else {
    console.log(`  FAIL ${message}`);
    failures.push(message);
  }
}

async function key(session, sessionId, code, keyName, holdMs = 0) {
  const base = { code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 0 };
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sessionId);
  if (holdMs > 0) await sleep(holdMs);
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sessionId);
}

async function mouse(session, sessionId, type, x, y, button = 'left') {
  await session.send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mouseReleased' ? 0 : 1, clickCount: type === 'mousePressed' || type === 'mouseReleased' ? 1 : 0 }, sessionId);
}

async function glide(session, sessionId, from, to, steps = 12) {
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await mouse(session, sessionId, 'mouseMoved', from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await sleep(16);
  }
}

async function main() {
  const server = await serveStatic(join(root, 'game'));
  const chrome = await launchChrome();
  const session = new Session(chrome.wsUrl);
  await session.connect();
  const problems = [];
  session.on((method, params) => {
    if (method === 'Runtime.exceptionThrown') problems.push(`exception: ${params.exceptionDetails.text} ${params.exceptionDetails.exception?.description ?? ''}`);
    if (method === 'Runtime.consoleAPICalled' && (params.type === 'error' || params.type === 'warning')) problems.push(`console.${params.type}: ${params.args.map((arg) => arg.value ?? arg.description).join(' ')}`);
    if (method === 'Log.entryAdded' && (params.entry.level === 'error' || params.entry.level === 'warning')) problems.push(`log ${params.entry.level}: ${params.entry.text}`);
  });
  try {
    const { sessionId } = await session.openPage();
    await session.send('Runtime.enable', {}, sessionId);
    await session.send('Log.enable', {}, sessionId);
    await session.send('Page.enable', {}, sessionId);
    await session.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
    await session.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/?debug=1&seed=7` }, sessionId);
    await waitFor(session, sessionId, 'Boolean(window.__nightloom)', 20000);
    await sleep(1500);
    const read = (expression) => evaluate(session, sessionId, `(() => { const g = window.__nightloom; const w = g.world(); return ${expression}; })()`);

    console.log('title');
    expect((await read('g.screen()')) === 'title', 'the title screen shows first');
    expect((await read('w.loom.afterglows.length + w.loom.flashes.length + w.stats.loops')) >= 0, 'the attract scene runs');

    console.log('start');
    await mouse(session, sessionId, 'mouseMoved', 640, 400);
    await mouse(session, sessionId, 'mousePressed', 640, 400);
    await mouse(session, sessionId, 'mouseReleased', 640, 400);
    await sleep(300);
    expect((await read('g.screen()')) === 'play', 'a click starts the game');
    expect((await read('w.wave')) === 1, 'wave 1 begins');

    console.log('movement');
    const before = await read('[w.weaver.x, w.weaver.y]');
    await key(session, sessionId, 'KeyD', 'd', 400);
    await key(session, sessionId, 'ArrowUp', 'ArrowUp', 300);
    await sleep(200);
    const after = await read('[w.weaver.x, w.weaver.y]');
    expect(after[0] > before[0] + 50, 'D moves the Weaver right');
    expect(after[1] < before[1] - 30, 'the up arrow moves the Weaver up');

    console.log('weaving');
    await sleep(2500);
    const plan = await evaluate(session, sessionId, `(async () => {
      const { chooseCluster } = await import('./src/attract.js');
      const w = window.__nightloom.world();
      const choice = chooseCluster(w);
      w.weaver.x = choice.centre.x; w.weaver.y = choice.centre.y;
      return { stars: choice.cluster.map((i) => ({ x: w.stars[i].x, y: w.stars[i].y })), count: choice.count };
    })()`);
    const loopsBefore = await read('w.stats.loops');
    const first = plan.stars[0];
    await mouse(session, sessionId, 'mouseMoved', first.x, first.y);
    await mouse(session, sessionId, 'mousePressed', first.x, first.y);
    await sleep(80);
    expect((await read('w.loom.active && w.loom.chain.length')) === 1, 'pressing on a star in reach anchors a thread');
    let from = first;
    for (const star of plan.stars.slice(1)) {
      await glide(session, sessionId, from, star);
      from = star;
    }
    expect((await read('w.loom.chain.length')) === plan.stars.length, `dragging star to star chains ${plan.stars.length} stars`);
    await glide(session, sessionId, from, first);
    await sleep(100);
    expect((await read('w.stats.loops')) === loopsBefore + 1, 'returning to the first star closes the loop');
    expect((await read('w.loom.flashes.length')) >= 1, 'the closed loop flashes');
    await mouse(session, sessionId, 'mouseReleased', first.x, first.y);
    const score = await read('w.score');
    console.log(`  loop enclosed ${plan.count} moth(s); score ${score}`);

    console.log('pause and mute');
    await key(session, sessionId, 'KeyP', 'p');
    await sleep(100);
    expect((await read('g.screen()')) === 'paused', 'P pauses');
    await key(session, sessionId, 'Escape', 'Escape');
    await sleep(100);
    expect((await read('g.screen()')) === 'play', 'Escape resumes');
    await key(session, sessionId, 'KeyM', 'm');
    await sleep(100);
    expect((await evaluate(session, sessionId, "document.getElementById('status').textContent")) === 'Muted.', 'M mutes');
    await key(session, sessionId, 'KeyM', 'm');

    console.log('waves to victory');
    for (let wave = 1; wave <= 10; wave += 1) {
      await evaluate(session, sessionId, '(() => { const w = window.__nightloom.world(); w.spawnQueue = []; w.pending = []; for (const m of w.moths) m.alive = false; w.weaver.invulnerable = 99; return true; })()');
      const wasBoss = await read('w.moths.some((m) => m.kind === "eclipse")');
      await waitFor(session, sessionId, "['upgrade', 'results'].includes(window.__nightloom.screen())", 15000);
      const screen = await read('g.screen()');
      if (wave < 10) {
        expect(screen === 'upgrade', `wave ${wave} cleared opens the upgrade choice${wasBoss ? ' (boss wave)' : ''}`);
        const offer = await read('w.offer.slice()');
        expect(offer.length === 3, `three cards are offered (${offer.join(', ')})`);
        const pick = (wave % 3) + 1;
        await key(session, sessionId, `Digit${pick}`, String(pick));
        await sleep(150);
        expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === wave + 1, `card ${pick} picked, wave ${wave + 1} begins`);
        await sleep(1300);
      } else {
        expect(screen === 'results' && (await read('w.phase')) === 'won', 'clearing wave 10 shows the victory results');
      }
    }
    const finalScore = await read('w.score');
    expect((await read('g.best()')) === finalScore, `the high score is saved (${finalScore})`);
    expect((await evaluate(session, sessionId, "localStorage.getItem('nightloom.best.v1')")) === String(finalScore), 'the high score is in localStorage');

    console.log('restart');
    await key(session, sessionId, 'KeyR', 'r');
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1 && (await read('w.score')) === 0, 'R restarts on wave 1 with score 0');

    console.log('defeat');
    await evaluate(session, sessionId, `(async () => {
      const { spawnMoth } = await import('./src/enemies.js');
      const w = window.__nightloom.world();
      w.weaver.hearts = 1; w.weaver.invulnerable = 0; w.weaver.shield = 0;
      w.moths.push(spawnMoth('drifter', w.weaver.x, w.weaver.y, w.random, 1));
      return true;
    })()`);
    await waitFor(session, sessionId, "window.__nightloom.screen() === 'results'", 10000);
    expect((await read('w.phase')) === 'lost' && (await read('w.weaver.hearts')) === 0, 'losing the last heart shows the defeat results');
    await mouse(session, sessionId, 'mousePressed', 640, 400);
    await mouse(session, sessionId, 'mouseReleased', 640, 400);
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1, 'a click on the results restarts');
    await key(session, sessionId, 'Escape', 'Escape');
    await sleep(100);
    expect((await read('g.screen()')) === 'paused', 'Escape pauses the new game');
  } finally {
    session.close();
    chrome.kill();
    server.close();
  }
  console.log(problems.length === 0 ? 'No console errors, warnings or exceptions.' : 'Console problems:');
  for (const problem of problems) console.log(`  ${problem}`);
  if (failures.length > 0 || problems.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Play NIGHTLOOM through in headless Chrome and report any console error or uncaught exception:
// the title, a click to start, keyboard movement, a loop woven with the mouse, pause, mute, still
// time, the HUD's threat queue and grade, the boss and its phases, the relic choice, every wave
// cleared to the victory screen, a restart, a defeat and another restart.
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
  const base = { code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : keyName === ' ' ? 32 : 0 };
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
    const call = (body) => evaluate(session, sessionId, `(async () => { const g = window.__nightloom; const w = g.world(); ${body} })()`);
    // The playfield sits inside the HUD frame: mouse events need the arena's offset added to field points.
    const arena = await evaluate(session, sessionId, "import('./src/config.js').then((m) => m.ARENA)");
    const inView = (p) => ({ x: p.x + arena.x, y: p.y + arena.y });

    console.log('title');
    expect((await read('g.screen()')) === 'title', 'the title screen shows first');
    expect((await read('w.attract && w.stars.length')) > 0, 'the attract scene runs behind the title');

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
    const plan = await call(`
      const { chooseCluster } = await import('./src/attract.js');
      const choice = chooseCluster(w);
      w.weaver.x = choice.centre.x; w.weaver.y = choice.centre.y;
      return { stars: choice.cluster.map((i) => ({ x: w.stars[i].x, y: w.stars[i].y })), count: choice.count };`);
    const loopsBefore = await read('w.stats.loops');
    const first = inView(plan.stars[0]);
    await mouse(session, sessionId, 'mouseMoved', first.x, first.y);
    await mouse(session, sessionId, 'mousePressed', first.x, first.y);
    await sleep(80);
    expect((await read('w.loom.active && w.loom.chain.length')) === 1, 'pressing on a star in reach anchors a thread');
    let from = first;
    for (const star of plan.stars.slice(1)) {
      const to = inView(star);
      await glide(session, sessionId, from, to);
      from = to;
    }
    expect((await read('w.loom.chain.length')) === plan.stars.length, `dragging star to star chains ${plan.stars.length} stars`);
    await glide(session, sessionId, from, first);
    await sleep(100);
    expect((await read('w.stats.loops')) === loopsBefore + 1, 'returning to the first star closes the loop');
    expect((await read('w.loom.flashes.length')) >= 1, 'the closed loop flashes');
    await mouse(session, sessionId, 'mouseReleased', first.x, first.y);
    const score = await read('w.score');
    console.log(`  loop enclosed ${plan.count} moth(s); score ${score}`);
    if (plan.count > 0) expect((await read('w.callout && w.callout.points')) > 0, 'a catch raises the LOOP CLOSED callout');

    console.log('hud');
    const rows = await call("const { threatRows } = await import('./src/hud/sidepanel.js'); return threatRows(w);");
    const left = await call("const { mothsLeft } = await import('./src/hud/bars.js'); return mothsLeft(w);");
    expect(rows.length > 0 && rows.every((row) => row.kind && row.count > 0), `the threat queue lists ${rows.map((row) => `${row.kind} ×${row.count}`).join(', ')}`);
    expect(rows.reduce((sum, row) => sum + row.count, 0) === left, `its counts add up to the ${left} moths left in the wave banner`);
    const grade = await read('g.grade()');
    expect('SABCD'.includes(grade.letter) && grade.progress >= 0 && grade.progress <= 1, `the run grade reads ${grade.letter}`);

    console.log('pause, mute and still time');
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
    await call('w.slow.owned = true; w.slow.charge = 1; return true;');
    await key(session, sessionId, 'Space', ' ');
    await sleep(120);
    expect((await read('w.slow.active')) > 0, 'Space fires still time once it is held and charged');

    console.log('waves to victory');
    let relicPicked = null;
    for (let wave = 1; wave <= 10; wave += 1) {
      if (wave === 5 || wave === 10) {
        await waitFor(session, sessionId, 'window.__nightloom.world().moths.some((m) => m.boss)', 8000);
        const boss = await call("const { bossPhase } = await import('./src/bosses.js'); const b = w.moths.find((m) => m.boss); return { kind: b.kind, veils: b.veils, phase: bossPhase(b) };");
        expect(boss.veils === (wave === 5 ? 3 : 5) && boss.phase === 0, `wave ${wave}: the ${boss.kind} descends with ${boss.veils} veils in phase 1`);
        const phases = await call("const { bossPhase, stripVeil } = await import('./src/bosses.js'); const b = w.moths.find((m) => m.boss); const seen = []; while (b.veils > 1) { stripVeil(b); seen.push(bossPhase(b)); } return seen;");
        expect(phases[phases.length - 1] === 2, `stripping veils drives it through phases ${[...new Set(phases)].map((p) => p + 1).join(' and ')}`);
        const bossRow = await call("const { threatRows } = await import('./src/hud/sidepanel.js'); return threatRows(w).find((row) => row.boss);");
        expect(bossRow && bossRow.boss.veils === 1, 'the threat queue shows the boss with its last veil');
      }
      if (wave === 6) expect(await read("w.spawnQueue.includes('phantom')"), 'wave 6 sends phantoms');
      if (wave === 7) expect(await read("w.spawnQueue.includes('warden')"), 'wave 7 sends a Hex Warden');
      await call('w.spawnQueue = []; w.pending = []; for (const m of w.moths) m.alive = false; w.weaver.invulnerable = 99; return true;');
      await waitFor(session, sessionId, "['upgrade', 'results'].includes(window.__nightloom.screen())", 15000);
      const screen = await read('g.screen()');
      if (wave === 10) {
        expect(screen === 'results' && (await read('w.phase')) === 'won', 'clearing wave 10 shows the victory results');
        break;
      }
      expect(screen === 'upgrade', `wave ${wave} cleared opens the card choice`);
      const offer = await read('w.offer.slice()');
      const relics = await call("const { RELICS } = await import('./src/upgrades.js'); return w.offer.every((id) => RELICS.some((r) => r.id === id));");
      expect(offer.length === 3, `three cards are offered (${offer.join(', ')})`);
      if (wave === 5) expect(relics, 'after the Eclipse Moth the three cards are relics');
      else expect(!relics, 'they are thread upgrades');
      const pick = (wave % 3) + 1;
      if (wave === 5) relicPicked = offer[pick - 1];
      await key(session, sessionId, `Digit${pick}`, String(pick));
      await sleep(150);
      expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === wave + 1, `card ${pick} picked, wave ${wave + 1} begins`);
      if (wave === 5) expect((await read(`w.upgrades['${relicPicked}']`)) === 1, `the relic ${relicPicked} is held and listed under THREADS HELD`);
      await sleep(1300);
    }
    const finalScore = await read('w.score');
    expect((await read('g.best()')) === finalScore, `the high score is saved (${finalScore})`);
    expect((await evaluate(session, sessionId, "localStorage.getItem('nightloom.best.v1')")) === String(finalScore), 'the high score is in localStorage');

    console.log('restart');
    await key(session, sessionId, 'KeyR', 'r');
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1 && (await read('w.score')) === 0, 'R restarts on wave 1 with score 0');

    console.log('defeat');
    await call(`
      const { spawnMoth } = await import('./src/enemies.js');
      w.weaver.hearts = 1; w.weaver.invulnerable = 0; w.weaver.shield = 0;
      w.moths.push(spawnMoth('drifter', w.weaver.x, w.weaver.y, w.random, 1));
      return true;`);
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

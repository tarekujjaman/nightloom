// Play NIGHTLOOM through in headless Chrome and report any console error or uncaught exception:
// the title, a click to start, keyboard movement, a loop woven with the mouse, the HUD's threat queue,
// grade, realm, Loom and starlight, pause, mute, still time, the hotbar (E star, Q lance, RMB pluck),
// a moth biting the Loom, every realm, both bosses and their phases, the relic choice, the fourth card
// and the re-roll, ten waves to victory, a restart, defeat by hearts, defeat by the Loom, restarts.
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

const KEYS = { KeyD: 'd', ArrowUp: 'ArrowUp', KeyP: 'p', KeyM: 'm', KeyE: 'e', KeyQ: 'q', KeyR: 'r', Space: ' ', Escape: 'Escape', Tab: 'Tab' };

async function key(session, sessionId, code, holdMs = 0) {
  const keyName = KEYS[code] ?? code.replace('Digit', '');
  const base = { code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : keyName === ' ' ? 32 : keyName === 'Tab' ? 9 : 0 };
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sessionId);
  if (holdMs > 0) await sleep(holdMs);
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sessionId);
}

async function mouse(session, sessionId, type, x, y, button = 'left') {
  await session.send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mouseReleased' ? 0 : button === 'right' ? 2 : 1, clickCount: type === 'mousePressed' || type === 'mouseReleased' ? 1 : 0 }, sessionId);
}

async function click(session, sessionId, x, y, button = 'left') {
  await mouse(session, sessionId, 'mousePressed', x, y, button);
  await mouse(session, sessionId, 'mouseReleased', x, y, button);
}

async function glide(session, sessionId, from, to, steps = 12) {
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await mouse(session, sessionId, 'mouseMoved', from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await sleep(16);
  }
}

async function main() {
  const server = await serveStatic(root);
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
    await session.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/game/?debug=1&seed=7` }, sessionId);
    await waitFor(session, sessionId, 'Boolean(window.__nightloom)', 20000);
    await sleep(1500);
    const read = (expression) => evaluate(session, sessionId, `(() => { const g = window.__nightloom; const w = g.world(); return ${expression}; })()`);
    const call = (body) => evaluate(session, sessionId, `(async () => { const g = window.__nightloom; const w = g.world(); ${body} })()`);
    const press = (code) => key(session, sessionId, code);
    // The playfield sits inside the HUD frame: mouse events need the arena's offset added to field points.
    const { ARENA, LOOM } = await evaluate(session, sessionId, "import('./src/config.js').then((m) => ({ ARENA: m.ARENA, LOOM: m.LOOM }))");
    const inView = (p) => ({ x: p.x + ARENA.x, y: p.y + ARENA.y });
    const clearField = () => call('w.spawnQueue = []; w.pending = []; for (const m of w.moths) m.alive = false; w.weaver.invulnerable = 99; w.loom.health = 100; return true;');
    // Empty the sky but keep the wave alive (a queued moth that never comes), so play input still counts.
    const quiet = () => call('w.spawnQueue = ["drifter"]; w.spawnTimer = 99; w.pending = []; for (const m of w.moths) m.alive = false; w.weaver.invulnerable = 99; w.loom.health = 100; return true;');

    console.log('title');
    expect((await read('g.screen()')) === 'title', 'the title screen shows first');
    expect((await read('w.attract && w.stars.length')) > 0, 'the attract scene runs behind the title');

    console.log('start');
    await mouse(session, sessionId, 'mouseMoved', 640, 400);
    await click(session, sessionId, 640, 400);
    await sleep(300);
    expect((await read('g.screen()')) === 'play', 'a click starts the game');
    expect((await read('w.wave')) === 1, 'wave 1 begins');
    expect((await read('g.realm()')) === 'Aurora Reach' && (await read('w.banner && w.banner.realm')), 'wave 1 opens with the Aurora Reach realm card');
    expect((await read('w.loom.health === w.loom.max && w.loom.max === 100')), 'the Loom stands at 100/100');
    expect((await read('w.starlight.have')) === 30, 'the night begins with 30 starlight');

    console.log('movement');
    const before = await read('[w.weaver.x, w.weaver.y]');
    await key(session, sessionId, 'KeyD', 400);
    await key(session, sessionId, 'ArrowUp', 300);
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
    const starlightBefore = await read('w.starlight.have');
    const first = inView(plan.stars[0]);
    await mouse(session, sessionId, 'mouseMoved', first.x, first.y);
    await mouse(session, sessionId, 'mousePressed', first.x, first.y);
    await sleep(80);
    expect((await read('w.weave.active && w.weave.chain.length')) === 1, 'pressing on a star in reach anchors a thread');
    let from = first;
    for (const star of plan.stars.slice(1)) {
      const to = inView(star);
      await glide(session, sessionId, from, to);
      from = to;
    }
    expect((await read('w.weave.chain.length')) === plan.stars.length, `dragging star to star chains ${plan.stars.length} stars`);
    await glide(session, sessionId, from, first);
    await sleep(100);
    expect((await read('w.stats.loops')) === loopsBefore + 1, 'returning to the first star closes the loop');
    expect((await read('w.weave.flashes.length')) >= 1, 'the closed loop flashes');
    await mouse(session, sessionId, 'mouseReleased', first.x, first.y);
    console.log(`  loop enclosed ${plan.count} moth(s); score ${await read('w.score')}`);
    if (plan.count > 0) {
      expect((await read('w.callout && w.callout.points')) > 0, 'a catch raises the LOOP CLOSED callout');
      expect((await read('w.starlight.have')) > starlightBefore && (await read('w.starlight.motes.length')) > 0, 'the catch pays starlight, flying to the counter as motes');
    }

    console.log('hud');
    const rows = await call("const { threatRows } = await import('./src/hud/sidepanel.js'); return threatRows(w);");
    const left = await call("const { mothsLeft } = await import('./src/hud/bars.js'); return mothsLeft(w);");
    expect(rows.length > 0 && rows.every((row) => row.kind && row.count > 0), `the threat queue lists ${rows.map((row) => `${row.kind} ×${row.count}`).join(', ')}`);
    expect(rows.reduce((sum, row) => sum + row.count, 0) === left, `its counts add up to the ${left} moths left in the wave banner`);
    const grade = await read('g.grade()');
    expect('SABCD'.includes(grade.letter) && grade.progress >= 0 && grade.progress <= 1, `the run grade reads ${grade.letter}`);
    const now = await call("const { objective } = await import('./src/hud/callouts.js'); return objective(w);");
    expect(typeof now === 'string' && now.length > 10, `the NOW line reads "${now}"`);

    console.log('pause, mute and still time');
    await press('KeyP');
    await sleep(100);
    expect((await read('g.screen()')) === 'paused', 'P pauses');
    await press('Escape');
    await sleep(100);
    expect((await read('g.screen()')) === 'play', 'Escape resumes');
    await press('KeyM');
    await sleep(100);
    expect((await evaluate(session, sessionId, "document.getElementById('status').textContent")) === 'Muted.', 'M mutes');
    await press('KeyM');
    await call('w.slow.charge = 1; return true;');
    await press('Space');
    await sleep(120);
    expect((await read('w.slow.active')) > 0 && (await read('w.slow.charge')) === 0, 'Space fires still time from the hotbar and empties its charge');

    console.log('hotbar: E star, Q lance, RMB pluck');
    await quiet();
    const spot = await call(`
      const { LOOM } = await import('./src/config.js');
      for (let x = 80; x < 900; x += 40) for (let y = 80; y < 560; y += 40) if (Math.hypot(x - LOOM.x, y - LOOM.y) > 220 && w.stars.every((s) => Math.hypot(s.x - x, s.y - y) > 100)) { w.weaver.x = x; w.weaver.y = y; w.starlight.have = 300; return { x, y }; }
      return null;`);
    const starsBefore = await read('w.stars.length');
    const cost = await call("const { starCost } = await import('./src/starlight.js'); return starCost(w);");
    await press('KeyE');
    await sleep(120);
    expect(spot && (await read('w.stars.length')) === starsBefore + 1 && (await read(`w.stars.at(-1).placed && Math.hypot(w.stars.at(-1).x - ${spot.x}, w.stars.at(-1).y - ${spot.y}) < 1`)), 'E plants an anchor star where the Weaver stands');
    expect((await read('w.starlight.have')) === 300 - cost, `it costs ${cost} starlight`);
    await press('KeyE');
    await sleep(120);
    expect((await read('w.stars.length')) === starsBefore + 1 && (await read('w.starlight.have')) === 300 - cost, 'a second star on the same spot is refused and costs nothing');
    await call(`const { spawnMoth } = await import('./src/enemies.js'); const m = spawnMoth('drifter', w.weaver.x + 150, w.weaver.y, w.random, 1); m.stun = 0; w.moths.push(m); return true;`);
    await session.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 }, sessionId);
    await sleep(40);
    await press('KeyQ');
    await sleep(260);
    await session.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 }, sessionId);
    expect((await read('w.abilities.charges')) === 2, 'Q fires a lance and spends one of three charges');
    expect((await read('w.moths.some((m) => m.alive && m.pinned > 0)')), 'the lance pins the moth in its path');
    await quiet();
    await call(`const { spawnMoth } = await import('./src/enemies.js'); for (const dx of [-50, 50]) { const m = spawnMoth('drifter', w.weaver.x + dx, w.weaver.y, w.random, 1); m.stun = 0; w.moths.push(m); } return true;`);
    const weaverView = inView(await read('({ x: w.weaver.x, y: w.weaver.y })'));
    await click(session, sessionId, weaverView.x, weaverView.y, 'right');
    await sleep(120);
    expect((await read('w.abilities.pluck')) > 0, 'the right button plucks and starts its cooldown');
    expect((await read('w.moths.filter((m) => m.alive && m.stun > 0 && (m.vx !== 0 || m.vy !== 0)).length')) === 2, 'the pluck whips both moths away, stunned');

    console.log('the Loom');
    await quiet();
    await call(`const { spawnMoth } = await import('./src/enemies.js'); const m = spawnMoth('drifter', ${LOOM.x + LOOM.radius}, ${LOOM.y}, w.random, 1); w.moths.push(m); return true;`);
    await sleep(400);
    expect((await read('w.loom.bites')) >= 1 && (await read('w.loom.health')) === 96, 'a drifter that reaches the Loom bites 4 from its health');
    expect((await read('w.moths.some((m) => m.alive && m.stun > 0)')), 'and is flung back, stunned');

    console.log('waves to victory');
    let relicPicked = null;
    const realms = { 4: 'Ember Nebula', 6: 'Frost Veil', 9: 'The Hollow Dark' };
    for (let wave = 1; wave <= 10; wave += 1) {
      if (realms[wave]) expect((await read('g.realm()')) === realms[wave] && (await read('Boolean(w.banner && w.banner.realm)')), `wave ${wave} crosses into ${realms[wave]} under its title card`);
      if (wave === 5 || wave === 10) {
        await waitFor(session, sessionId, 'window.__nightloom.world().moths.some((m) => m.boss)', 8000);
        const boss = await call("const { bossPhase } = await import('./src/bosses.js'); const b = w.moths.find((m) => m.boss); return { kind: b.kind, veils: b.veils, phase: bossPhase(b) };");
        expect(boss.veils === (wave === 5 ? 3 : 5) && boss.phase === 0, `wave ${wave}: the ${boss.kind} descends with ${boss.veils} veils in phase 1`);
        const phases = await call("const { bossPhase, stripVeil } = await import('./src/bosses.js'); const b = w.moths.find((m) => m.boss); const seen = []; while (b.veils > 1) { stripVeil(b); seen.push(bossPhase(b)); } return seen;");
        expect(phases[phases.length - 1] === 2, `stripping veils drives it through phases ${[...new Set(phases)].map((p) => p + 1).join(' and ')}`);
        const bossRow = await call("const { threatRows } = await import('./src/hud/sidepanel.js'); return threatRows(w).find((row) => row.boss);");
        expect(bossRow && bossRow.boss.veils === 1, 'the threat queue shows the boss with its last veil');
      }
      const sends = (kind) => read(`w.spawnQueue.includes('${kind}') || w.moths.some((m) => m.kind === '${kind}')`);
      if (wave === 6) expect(await sends('phantom'), 'wave 6 sends phantoms');
      if (wave === 7) expect(await sends('warden'), 'wave 7 sends a Hex Warden');
      await clearField();
      await waitFor(session, sessionId, "['upgrade', 'results'].includes(window.__nightloom.screen())", 15000);
      const screen = await read('g.screen()');
      if (wave === 10) {
        expect(screen === 'results' && (await read('w.phase')) === 'won', 'clearing wave 10 shows the victory results');
        break;
      }
      expect(screen === 'upgrade', `wave ${wave} cleared opens the card choice`);
      const offer = await read('w.offer.slice()');
      const relics = await call("const { RELICS } = await import('./src/upgrades.js'); return w.offer.every((id) => RELICS.some((r) => r.id === id));");
      expect(offer.length === 4, `four cards are offered (${offer.join(', ')}), the fourth for starlight`);
      if (wave === 5) expect(relics, 'after the Eclipse Moth the cards are relics');
      else expect(!relics, 'they are thread upgrades');
      let pick = (wave % 3) + 1;
      if (wave === 2) {
        await call('w.starlight.have = 10; return true;');
        await press('Digit4');
        await sleep(150);
        expect((await read('g.screen()')) === 'upgrade' && (await read('w.wave')) === 2, 'the fourth card is refused with too little starlight');
        await call('w.starlight.have = 100; return true;');
        pick = 4;
      }
      if (wave === 3) {
        await call('w.starlight.have = 50; return true;');
        await press('Tab');
        await sleep(150);
        const rerolled = await read('w.offer.slice()');
        expect((await read('w.starlight.have')) === 20 && rerolled.length === 4, `Tab re-rolls the cards for 30 starlight (${rerolled.join(', ')})`);
      }
      if (wave === 5) relicPicked = offer[pick - 1];
      await press(`Digit${pick}`);
      await sleep(150);
      expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === wave + 1, `card ${pick} picked, wave ${wave + 1} begins`);
      if (wave === 2) expect((await read('w.starlight.have')) === 40, 'the fourth card cost 60 starlight');
      if (wave === 5) expect((await read(`w.upgrades['${relicPicked}']`)) === 1, `the relic ${relicPicked} is held and listed under THREADS HELD`);
      await sleep(1300);
    }
    const finalScore = await read('w.score');
    expect((await read('g.best()')) === finalScore, `the high score is saved (${finalScore})`);
    expect((await evaluate(session, sessionId, "localStorage.getItem('nightloom.best.v1')")) === String(finalScore), 'the high score is in localStorage');

    console.log('restart');
    await press('KeyR');
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1 && (await read('w.score')) === 0, 'R restarts on wave 1 with score 0');

    console.log('defeat by hearts');
    await call(`
      const { spawnMoth } = await import('./src/enemies.js');
      w.weaver.hearts = 1; w.weaver.invulnerable = 0; w.weaver.shield = 0;
      w.moths.push(spawnMoth('drifter', w.weaver.x, w.weaver.y, w.random, 1));
      return true;`);
    await waitFor(session, sessionId, "window.__nightloom.screen() === 'results'", 10000);
    expect((await read('w.phase')) === 'lost' && (await read('w.weaver.hearts')) === 0 && (await read('w.lostBy')) === 'weaver', 'losing the last heart shows the defeat results: the Weaver falls');
    await click(session, sessionId, 640, 400);
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1, 'a click on the results restarts');

    console.log('defeat by the Loom');
    await call(`
      const { spawnMoth } = await import('./src/enemies.js');
      w.loom.health = 3; w.weaver.invulnerable = 99;
      w.moths.push(spawnMoth('drifter', ${LOOM.x + LOOM.radius}, ${LOOM.y}, w.random, 1));
      return true;`);
    await waitFor(session, sessionId, "window.__nightloom.screen() === 'results'", 10000);
    expect((await read('w.phase')) === 'lost' && (await read('w.loom.health')) === 0 && (await read('w.lostBy')) === 'loom', 'the Loom at 0 shows the defeat results: the Loom unravels');
    await press('KeyR');
    await sleep(200);
    expect((await read('g.screen()')) === 'play' && (await read('w.wave')) === 1 && (await read('w.loom.health')) === 100, 'R restarts with the Loom whole');
    await press('Escape');
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

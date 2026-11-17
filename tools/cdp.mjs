// A minimal Chrome DevTools Protocol client on Node's standard library: a static server for game/,
// a headless Chrome launcher, and a WebSocket session that sends commands and collects events.
import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';

export const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Serve `root` on an ephemeral port; resolves to { port, close }. */
export function serveStatic(root) {
  const base = resolve(root);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(base, normalize(pathname)));
    if (file !== base && !file.startsWith(base + sep)) {
      response.writeHead(403).end();
      return;
    }
    let size;
    try {
      const stats = statSync(file);
      if (!stats.isFile()) throw new Error('not a file');
      size = stats.size;
    } catch {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': size, 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      resolveServer({ port: server.address().port, close: () => server.close() });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** A free TCP port, found by binding to 0 and releasing it. */
function freePort() {
  return new Promise((resolvePort) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

/** Launch headless Chrome with remote debugging in a temporary profile (plus `extraArgs`); resolves to { wsUrl, kill }. */
export async function launchChrome(extraArgs = []) {
  const port = await freePort();
  const userDataDir = mkdtempSync(join(tmpdir(), 'nightloom-chrome-'));
  const child = spawn(CHROME, [
    ...extraArgs,
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--mute-audio',
    '--hide-scrollbars',
    '--window-size=1280,800',
    '--force-device-scale-factor=1',
    'about:blank',
  ], { stdio: 'ignore' });
  let wsUrl = null;
  for (let attempt = 0; attempt < 100 && wsUrl === null; attempt += 1) {
    await sleep(150);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      const info = await response.json();
      wsUrl = info.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
  }
  if (!wsUrl) {
    child.kill();
    throw new Error('Chrome did not open its debugging port');
  }
  return {
    wsUrl,
    kill() {
      child.kill();
      setTimeout(() => {
        try {
          rmSync(userDataDir, { recursive: true, force: true });
        } catch {
          // A locked profile file is left to the OS temp cleanup.
        }
      }, 500);
    },
  };
}

/** One browser connection; `send` targets the browser or, with a sessionId, a page. */
export class Session {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
  }

  connect() {
    return new Promise((resolveConnect, reject) => {
      const socket = new WebSocket(this.wsUrl);
      socket.addEventListener('open', () => resolveConnect());
      socket.addEventListener('error', (event) => reject(new Error(`WebSocket error: ${event.message ?? 'unknown'}`)));
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== undefined && this.pending.has(message.id)) {
          const { resolve: ok, reject: fail } = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) fail(new Error(`${message.error.message} (${message.error.code})`));
          else ok(message.result);
          return;
        }
        if (message.method) for (const listener of this.listeners) listener(message.method, message.params, message.sessionId);
      });
      this.socket = socket;
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((ok, fail) => {
      this.pending.set(id, { resolve: ok, reject: fail });
      this.socket.send(JSON.stringify(payload));
    });
  }

  /** Call `listener(method, params, sessionId)` for every event. */
  on(listener) {
    this.listeners.push(listener);
  }

  /** Open a page target and attach to it; resolves to its sessionId. */
  async openPage(url = 'about:blank') {
    const { targetId } = await this.send('Target.createTarget', { url });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return { targetId, sessionId };
  }

  close() {
    if (this.socket) this.socket.close();
  }
}

/** Poll `expression` in the page until it is truthy or `timeoutMs` passes. */
export async function waitFor(session, sessionId, expression, timeoutMs = 30000, intervalMs = 100) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { result } = await session.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
    if (result && result.value) return result.value;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

/** Evaluate `expression` in the page and return its value. */
export async function evaluate(session, sessionId, expression) {
  const { result, exceptionDetails } = await session.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (exceptionDetails) throw new Error(`Page exception: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ''}`);
  return result ? result.value : undefined;
}

export { sleep };

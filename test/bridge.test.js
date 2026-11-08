'use strict';
// Tests for plugins/softglaze-browser-connector/server/softglaze-browser-bridge.js against a mock SoftGlaze
// endpoint (test/mock-softglaze.js). Run: npm test  (Node.js 18 or newer, no packages needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { startMock, TEST_TOKEN } = require('./mock-softglaze');
const bridgeLib = require('../plugins/softglaze-browser-connector/server/softglaze-browser-bridge.js');

const BRIDGE = path.join(__dirname, '..', 'plugins', 'softglaze-browser-connector', 'server', 'softglaze-browser-bridge.js');
const NO_FILE = path.join(os.tmpdir(), `softglaze-no-such-file-${process.pid}.json`);

const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bridge-test', version: '1.0.0' } }
};

// Starts the bridge as the AI app would and returns helpers to talk to it over stdio.
function startBridge(env) {
  const child = spawn(process.execPath, [BRIDGE], {
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const messages = [];
  const waiters = [];
  let stderr = '';
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line); // stdout must carry JSON-RPC only
      messages.push(m);
      for (const w of [...waiters]) if (w.match(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
    }
  });
  child.stderr.on('data', (c) => { stderr += c; });
  const send = (m) => child.stdin.write(`${JSON.stringify(m)}\n`);
  const waitFor = (id, ms = 5000) => {
    const found = messages.find((m) => m.id === id);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const w = { match: (m) => m.id === id, resolve };
      waiters.push(w);
      setTimeout(() => reject(new Error(`No answer for id ${id}. stderr: ${stderr}`)), ms);
    });
  };
  const exited = new Promise((r) => child.on('exit', r));
  const stop = async () => { child.stdin.end(); await exited; };
  return { child, send, waitFor, stop, messages, stderr: () => stderr };
}

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

test('resolveConfig: unfilled ${user_config.*} values count as empty', () => {
  const c = bridgeLib.resolveConfig({ SOFTGLAZE_TOKEN: '${user_config.token}', SOFTGLAZE_PORT: '${user_config.port}' });
  assert.equal(c.token, '');
  assert.equal(c.url.href, 'http://127.0.0.1:8080/mcp');
});

test('resolveConfig: refuses any address that is not on this computer', () => {
  for (const url of ['http://example.com/mcp', 'http://192.168.1.5:8080/mcp', 'https://softglaze.com/mcp', 'ftp://127.0.0.1/mcp']) {
    const c = bridgeLib.resolveConfig({ SOFTGLAZE_MCP_URL: url, SOFTGLAZE_TOKEN: TEST_TOKEN });
    assert.equal(c.url, null, url);
    assert.ok(c.problems.length > 0, url);
  }
});

test('resolveConfig: a Developer API key is named as the wrong kind of token', () => {
  const c = bridgeLib.resolveConfig({ SOFTGLAZE_TOKEN: `sg_${'k'.repeat(32)}` });
  assert.match(c.problems.join(' '), /Developer API key/);
});

test('relays initialize, tools/list (event stream), tools/call and prompts/list with the right headers', async () => {
  const mock = await startMock();
  const b = startBridge({ SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: mock.token });
  try {
    b.send(INIT);
    const init = await b.waitFor(1);
    assert.equal(init.result.serverInfo.name, 'softglaze');
    b.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    b.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    b.send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'workspace_summary', arguments: {} } });
    b.send({ jsonrpc: '2.0', id: 4, method: 'prompts/list', params: {} });
    const list = await b.waitFor(2);
    assert.deepEqual(list.result.tools.map((t) => t.name), ['workspace_summary', 'start_profile']);
    const call = await b.waitFor(3);
    assert.match(call.result.content[0].text, /mock data/);
    const prompts = await b.waitFor(4);
    assert.equal(prompts.result.prompts[0].name, 'daily_health_check');

    const posts = mock.log.filter((r) => r.method === 'POST');
    assert.ok(posts.every((r) => r.headers.authorization === `Bearer ${mock.token}`));
    assert.ok(posts.every((r) => /text\/event-stream/.test(r.headers.accept)));
    const after = posts.filter((r) => r.body && r.body.method !== 'initialize');
    assert.ok(after.length >= 4);
    assert.ok(after.every((r) => r.headers['mcp-session-id'] && r.headers['mcp-protocol-version'] === '2025-06-18'));
  } finally {
    await b.stop();
    await mock.close();
  }
});

test('ends the session with DELETE when the AI app closes stdin', async () => {
  const mock = await startMock();
  const b = startBridge({ SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: mock.token });
  b.send(INIT);
  await b.waitFor(1);
  assert.equal(mock.sessions.size, 1);
  await b.stop();
  assert.equal(mock.sessions.size, 0);
  assert.ok(mock.log.some((r) => r.method === 'DELETE'));
  await mock.close();
});

test('opens a new session by itself after SoftGlaze restarts (404 on the old session)', async () => {
  const mock = await startMock();
  const b = startBridge({ SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: mock.token });
  try {
    b.send(INIT);
    await b.waitFor(1);
    b.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    mock.dropSessions();
    b.send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'workspace_summary', arguments: {} } });
    const r = await b.waitFor(5);
    assert.ok(r.result, JSON.stringify(r));
    assert.equal(mock.sessions.size, 1);
    assert.equal(b.messages.filter((m) => String(m.id).startsWith('softglaze-bridge')).length, 0, 'the reconnect answer is not passed on');
  } finally {
    await b.stop();
    await mock.close();
  }
});

test('a wrong token gets a plain answer about the token', async () => {
  const mock = await startMock();
  const b = startBridge({ SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: `sgai_${'W'.repeat(40)}` });
  try {
    b.send(INIT);
    const r = await b.waitFor(1);
    assert.match(r.error.message, /did not accept the token/);
  } finally {
    await b.stop();
    await mock.close();
  }
});

test('SoftGlaze not running: the answer says how to start it', async () => {
  const port = await freePort();
  const b = startBridge({ SOFTGLAZE_MCP_URL: `http://127.0.0.1:${port}/mcp`, SOFTGLAZE_TOKEN: TEST_TOKEN });
  try {
    b.send(INIT);
    const r = await b.waitFor(1);
    assert.match(r.error.message, /not reachable/);
  } finally {
    await b.stop();
  }
});

test('no token: every request is answered with the setup steps, and nothing is sent', async () => {
  const mock = await startMock();
  const b = startBridge({ SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: '' });
  try {
    b.send(INIT);
    const r = await b.waitFor(1);
    assert.match(r.error.message, /No SoftGlaze AI token/);
    assert.equal(mock.log.length, 0);
  } finally {
    await b.stop();
    await mock.close();
  }
});

test('--check reports a working connection without printing the token', async () => {
  const mock = await startMock();
  try {
    const out = await new Promise((resolve) => {
      const c = spawn(process.execPath, [BRIDGE, '--check'], {
        env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, SOFTGLAZE_MCP_URL: mock.url, SOFTGLAZE_TOKEN: mock.token }
      });
      let s = '';
      c.stdout.on('data', (d) => { s += d; });
      c.on('exit', (code) => resolve({ code, s }));
    });
    assert.equal(out.code, 0, out.s);
    assert.match(out.s, /OK: connected to SoftGlaze Browser \(mock\)/);
    assert.ok(!out.s.includes(mock.token));
  } finally {
    await mock.close();
  }
});

test('resolveConfig: the plugin setting names come first, then SOFTGLAZE_*, then the default', () => {
  let c = bridgeLib.resolveConfig({ CLAUDE_PLUGIN_OPTION_TOKEN: `sgai_${'P'.repeat(40)}`, CLAUDE_PLUGIN_OPTION_PORT: '8091', SOFTGLAZE_TOKEN: `sgai_${'S'.repeat(40)}`, SOFTGLAZE_PORT: '8092' });
  assert.equal(c.tokenSource, 'CLAUDE_PLUGIN_OPTION_TOKEN');
  assert.equal(c.urlSource, 'CLAUDE_PLUGIN_OPTION_PORT');
  assert.equal(c.url.port, '8091');
  c = bridgeLib.resolveConfig({ SOFTGLAZE_TOKEN: `sgai_${'S'.repeat(40)}`, SOFTGLAZE_PORT: '8092' });
  assert.equal(c.tokenSource, 'SOFTGLAZE_TOKEN');
  assert.equal(c.url.port, '8092');
  c = bridgeLib.resolveConfig({});
  assert.equal(c.urlSource, 'default');
  assert.ok(c.problems.some((p) => /No SoftGlaze AI token/.test(p)));
});

test('the bridge source reads no files', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'plugins', 'softglaze-browser-connector', 'server', 'softglaze-browser-bridge.js'), 'utf8');
  assert.ok(!/readFileSync|homedir|require\('node:fs'\)/.test(src));
});

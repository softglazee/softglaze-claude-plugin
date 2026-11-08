#!/usr/bin/env node
'use strict';
// SoftGlaze Browser bridge for AI apps that start local MCP servers as a command.
//
// SoftGlaze Browser (a Windows desktop app) runs its MCP server inside the app, on this computer
// only, at http://127.0.0.1:<port>/mcp (MCP Streamable HTTP; the port is 8080 unless the Owner
// changed it). Every request needs a SoftGlaze AI token (it starts with sgai_) in an
// "Authorization: Bearer" header. Claude Code and Cowork start a plugin's local MCP server as a
// command that speaks MCP over stdin and stdout, so this script sits in between: it reads one
// JSON-RPC message per line from stdin, sends it to the app with the token, and writes the app's
// replies to stdout, one per line.
//
// It has no dependencies (Node.js 18 or newer). It talks to nothing but SoftGlaze on this computer:
// it refuses any address that is not 127.0.0.1, localhost or [::1]. Its own messages go to stderr.
//
// Settings, first match wins:
//   address  SOFTGLAZE_MCP_URL, then SOFTGLAZE_PORT, then "url" in the connection file,
//            then http://127.0.0.1:8080/mcp
//   token    SOFTGLAZE_TOKEN, then "token" in the connection file
// The connection file is SOFTGLAZE_CONNECTION_FILE, or ~/.softglaze/mcp-connection.json, and looks
// like { "url": "http://127.0.0.1:8080/mcp", "token": "sgai_..." }. It is optional: it is for apps
// that cannot ask for the token themselves (Cowork does not prompt for plugin settings).
//
// Commands: (none) run the bridge; --check test the connection and exit; --version; --help.

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const VERSION = '1.0.0';
const DEFAULT_PORT = 8080;
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]', '::1'];
const AI_TOKEN = /^sgai_[A-Za-z0-9]{20,}$/;
const API_TOKEN = /^sg_[A-Za-z0-9_-]{20,}$/;

function log(message) {
  process.stderr.write(`[softglaze-browser] ${message}\n`);
}

// A value Claude Code could not fill in stays as "${user_config.x}"; treat it as empty.
function clean(value) {
  const v = String(value == null ? '' : value).trim();
  return /^\$\{[^}]*\}$/.test(v) ? '' : v;
}

function defaultConnectionFile() {
  return path.join(os.homedir(), '.softglaze', 'mcp-connection.json');
}

function readConnectionFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return { found: false, url: '', token: '' }; }
  try {
    const j = JSON.parse(text.replace(/^﻿/, ''));
    return {
      found: true,
      url: typeof j.url === 'string' ? j.url.trim() : '',
      token: typeof j.token === 'string' ? j.token.trim() : ''
    };
  } catch (e) {
    return { found: true, url: '', token: '', error: `${file} is not valid JSON.` };
  }
}

function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return { ok: false, message: `"${raw}" is not a valid address.` }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, message: `"${raw}" must start with http://.` };
  if (!LOOPBACK_HOSTS.includes(u.hostname.toLowerCase())) {
    return { ok: false, message: `SoftGlaze runs on this computer only, so the bridge connects to 127.0.0.1, localhost or [::1], not "${u.hostname}".` };
  }
  return { ok: true, url: u };
}

// Works out the address and token from the environment and the connection file.
function resolveConfig(env = process.env) {
  const connectionFile = clean(env.SOFTGLAZE_CONNECTION_FILE) || defaultConnectionFile();
  const conn = readConnectionFile(connectionFile);
  const problems = [];
  if (conn.error) problems.push(conn.error);

  let rawUrl = clean(env.SOFTGLAZE_MCP_URL);
  let urlSource = rawUrl ? 'SOFTGLAZE_MCP_URL' : '';
  const port = clean(env.SOFTGLAZE_PORT);
  if (!rawUrl && port) {
    const n = Number(port);
    if (Number.isInteger(n) && n >= 1 && n <= 65535) { rawUrl = `http://127.0.0.1:${n}/mcp`; urlSource = 'SOFTGLAZE_PORT'; }
    else problems.push(`The port "${port}" is not a number from 1 to 65535.`);
  }
  if (!rawUrl && conn.url) { rawUrl = conn.url; urlSource = connectionFile; }
  if (!rawUrl) { rawUrl = `http://127.0.0.1:${DEFAULT_PORT}/mcp`; urlSource = 'default'; }
  const checked = checkUrl(rawUrl);
  if (!checked.ok) problems.push(checked.message);

  let token = clean(env.SOFTGLAZE_TOKEN);
  let tokenSource = token ? 'SOFTGLAZE_TOKEN' : '';
  if (!token && conn.token) { token = conn.token; tokenSource = connectionFile; }
  if (!token) {
    problems.push('No SoftGlaze AI token. Create one in SoftGlaze Browser (SoftGlaze AI page, Tokens tab), then enter it in the plugin settings (Claude Code: /plugin, Installed, softglaze-browser, Configure) or save it in '
      + `${connectionFile} as {"token": "sgai_..."}.`);
  } else if (API_TOKEN.test(token) && !AI_TOKEN.test(token)) {
    problems.push('This is a Developer API key (sg_...). The MCP server needs a SoftGlaze AI token (sgai_...) from the SoftGlaze AI page.');
  }
  return { url: checked.ok ? checked.url : null, urlSource, token, tokenSource, connectionFile, problems };
}

function hasId(message) {
  return message && typeof message === 'object' && message.id !== undefined && message.id !== null;
}

function readAll(res) {
  return new Promise((resolve) => {
    let text = '';
    res.setEncoding('utf8');
    res.on('data', (c) => { text += c; });
    res.on('end', () => resolve(text));
    res.on('error', () => resolve(text));
    res.on('close', () => resolve(text));
  });
}

// Reads a text/event-stream response and calls onMessage with each event's JSON data.
function pipeSse(res, onMessage) {
  return new Promise((resolve) => {
    let buffer = '';
    let data = [];
    const flush = () => {
      if (!data.length) return;
      const text = data.join('\n');
      data = [];
      try { onMessage(JSON.parse(text)); } catch (e) { log('Skipped an event that was not JSON.'); }
    };
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (line === '') flush();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
    });
    const done = () => { flush(); resolve(); };
    res.on('end', done);
    res.on('close', done);
    res.on('error', done);
  });
}

// Plain-language reasons for the answers the SoftGlaze Local API gives before MCP starts.
function httpErrorMessage(status, body, url) {
  const detail = body && (body.message || (body.error && body.error.message)) ? ` (${body.message || body.error.message})` : '';
  switch (status) {
    case 401: return `SoftGlaze did not accept the token${detail}. Check that the whole sgai_ token was entered, and that it is not revoked or expired on the SoftGlaze AI page.`;
    case 403: return `SoftGlaze refused the request${detail}.`;
    case 423: return `The SoftGlaze workspace is locked${detail}. Unlock it in the app and try again.`;
    case 429: return `Too many requests${detail}. Wait a moment and try again.`;
    case 503: return `SoftGlaze AI is switched off${detail}. Switch on the AI server on the SoftGlaze AI page.`;
    default: return `SoftGlaze answered HTTP ${status}${detail} at ${url}.`;
  }
}

function notRunningMessage(url, e) {
  return `SoftGlaze is not reachable at ${url} (${(e && (e.code || e.message)) || 'no answer'}). Open SoftGlaze Browser, switch on the AI server on the SoftGlaze AI page, and check the port.`;
}

class Bridge {
  // url: a URL object; write(message) sends one message to the AI app.
  constructor({ url, token, write }) {
    this.url = url;
    this.token = token;
    this.write = write;
    this.sessionId = null;
    this.protocolVersion = null;
    this.initMessage = null;
    this.initializing = null;
    this.reconnecting = null;
    this.reconnects = 0;
    this.pending = new Set();
  }

  request(method, body) {
    const lib = this.url.protocol === 'https:' ? https : http;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json, text/event-stream'
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    if (this.protocolVersion) headers['Mcp-Protocol-Version'] = this.protocolVersion;
    return new Promise((resolve, reject) => {
      const req = lib.request({
        method,
        hostname: this.url.hostname.replace(/^\[|\]$/g, ''),
        port: this.url.port || (this.url.protocol === 'https:' ? 443 : 80),
        path: `${this.url.pathname}${this.url.search}`,
        headers
      }, resolve);
      req.on('error', reject);
      if (body !== undefined) req.write(body);
      req.end();
    });
  }

  replyError(message, text, code = -32000) {
    if (hasId(message)) this.write({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
    else log(text);
  }

  // Sends one message from the AI app and relays the answer.
  async forward(message, retried = false) {
    const isInit = message && message.method === 'initialize';
    if (isInit) this.initMessage = message;
    else if (this.initializing) { try { await this.initializing; } catch (e) { /* reported to that request */ } }
    if (this.reconnecting) { try { await this.reconnecting; } catch (e) { /* retried below */ } }
    const usedSession = this.sessionId;
    let res;
    try {
      res = await this.request('POST', JSON.stringify(message));
    } catch (e) {
      this.replyError(message, notRunningMessage(this.url.href, e));
      return;
    }
    if (isInit) this.sessionId = res.headers['mcp-session-id'] ? String(res.headers['mcp-session-id']) : null;
    // 404 on a known session: the app restarted or AI was switched off and on. Start a new session
    // with the same initialize request and send this message again, once.
    if (res.statusCode === 404 && !isInit && usedSession && !retried && this.initMessage) {
      res.resume();
      try {
        if (this.sessionId === usedSession) await this.reconnect();
      } catch (e) {
        this.replyError(message, `The SoftGlaze session ended and a new one could not start: ${e.message}`);
        return;
      }
      // The new session already got its own "initialized" notification.
      if (message && message.method === 'notifications/initialized') return;
      await this.forward(message, true);
      return;
    }
    await this.relay(res, message, isInit);
  }

  async relay(res, message, isInit) {
    const type = String(res.headers['content-type'] || '');
    const onMessage = (m) => {
      if (isInit && m && m.result && m.result.protocolVersion) this.protocolVersion = String(m.result.protocolVersion);
      this.write(m);
    };
    if (res.statusCode === 202) { res.resume(); return; }
    if (res.statusCode < 400 && type.includes('text/event-stream')) { await pipeSse(res, onMessage); return; }
    const text = await readAll(res);
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = null; }
    if (res.statusCode >= 400) {
      if (parsed && parsed.jsonrpc === '2.0' && parsed.error) {
        this.replyError(message, String(parsed.error.message || 'Error'), Number(parsed.error.code) || -32000);
        return;
      }
      this.replyError(message, httpErrorMessage(res.statusCode, parsed, this.url.href));
      return;
    }
    if (Array.isArray(parsed)) parsed.forEach(onMessage);
    else if (parsed) onMessage(parsed);
  }

  // Opens a new session with the AI app's own initialize request (under a new id, answer dropped).
  reconnect() {
    if (this.reconnecting) return this.reconnecting;
    this.reconnecting = (async () => {
      this.sessionId = null;
      this.reconnects += 1;
      const init = { ...this.initMessage, id: `softglaze-bridge-reconnect-${this.reconnects}` };
      const res = await this.request('POST', JSON.stringify(init));
      const sid = res.headers['mcp-session-id'] ? String(res.headers['mcp-session-id']) : null;
      const replies = [];
      if (String(res.headers['content-type'] || '').includes('text/event-stream')) await pipeSse(res, (m) => replies.push(m));
      else { const t = await readAll(res); try { replies.push(JSON.parse(t)); } catch (e) { /* not JSON */ } }
      if (res.statusCode >= 400 || !sid) {
        const body = replies[0] || null;
        throw new Error(body && body.error ? String(body.error.message) : httpErrorMessage(res.statusCode, body, this.url.href));
      }
      this.sessionId = sid;
      const ok = replies.find((m) => m && m.result && m.result.protocolVersion);
      if (ok) this.protocolVersion = String(ok.result.protocolVersion);
      const note = await this.request('POST', JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
      note.resume();
      log('Reconnected to SoftGlaze with a new session.');
    })();
    const p = this.reconnecting;
    p.then(() => { this.reconnecting = null; }, () => { this.reconnecting = null; });
    return p;
  }

  handleLine(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;
    let parsed;
    try { parsed = JSON.parse(trimmed); } catch (e) {
      this.write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    for (const m of Array.isArray(parsed) ? parsed : [parsed]) {
      const p = this.forward(m).catch((e) => this.replyError(m, `Bridge error: ${e.message}`));
      if (m && m.method === 'initialize') this.initializing = p;
      this.pending.add(p);
      p.finally(() => this.pending.delete(p));
    }
  }

  async close() {
    try { await Promise.race([Promise.allSettled([...this.pending]), new Promise((r) => setTimeout(r, 2000))]); } catch (e) { /* ignore */ }
    if (this.sessionId) {
      try { const res = await this.request('DELETE'); res.resume(); } catch (e) { /* app already closed */ }
      this.sessionId = null;
    }
  }
}

// Answers every request with the same setup problem, so the AI app shows why SoftGlaze is missing.
function runRefusing(problems) {
  const text = problems.join(' ');
  log(text);
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    let m;
    try { m = JSON.parse(line); } catch (e) { return; }
    for (const one of Array.isArray(m) ? m : [m]) {
      if (hasId(one)) process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: one.id, error: { code: -32000, message: text } })}\n`);
    }
  });
  rl.on('close', () => process.exit(0));
}

function runBridge(cfg) {
  const bridge = new Bridge({
    url: cfg.url,
    token: cfg.token,
    write: (m) => process.stdout.write(`${JSON.stringify(m)}\n`)
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await bridge.close();
    process.exit(0);
  };
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => bridge.handleLine(line));
  rl.on('close', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  log(`Connecting to ${cfg.url.href} (token from ${cfg.tokenSource}).`);
}

// --check: is the app reachable, is AI on, does the token open an MCP session?
async function check(cfg) {
  const out = (s) => process.stdout.write(`${s}\n`);
  out(`SoftGlaze Browser bridge ${VERSION}`);
  out(`Address: ${cfg.url ? cfg.url.href : '(invalid)'} (from ${cfg.urlSource})`);
  out(`Token:   ${cfg.token ? `${cfg.token.slice(0, 7)}... (from ${cfg.tokenSource})` : '(none)'}`);
  if (cfg.problems.length) { cfg.problems.forEach((p) => out(`Problem: ${p}`)); return 1; }
  const bridge = new Bridge({ url: cfg.url, token: cfg.token, write: () => {} });
  const replies = [];
  bridge.write = (m) => replies.push(m);
  await bridge.forward({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'softglaze-bridge-check', version: VERSION } }
  });
  const r = replies[0];
  if (!r || r.error) { out(`Problem: ${r && r.error ? r.error.message : 'no answer from SoftGlaze.'}`); await bridge.close(); return 1; }
  const info = r.result && r.result.serverInfo ? r.result.serverInfo : {};
  out(`OK: connected to ${info.title || info.name || 'SoftGlaze'} ${info.version || ''}`.trim());
  await bridge.close();
  return 0;
}

const HELP = `SoftGlaze Browser bridge ${VERSION}
Connects an AI app that starts local MCP servers (Claude Code, Cowork) to the MCP server inside
SoftGlaze Browser on this computer.

  node softglaze-browser-bridge.js            run the bridge (the AI app does this)
  node softglaze-browser-bridge.js --check    test the address and token, then exit
  node softglaze-browser-bridge.js --version

Environment: SOFTGLAZE_TOKEN (sgai_...), SOFTGLAZE_PORT or SOFTGLAZE_MCP_URL,
SOFTGLAZE_CONNECTION_FILE (default ~/.softglaze/mcp-connection.json).`;

if (require.main === module) {
  const arg = process.argv[2] || '';
  if (arg === '--version' || arg === '-v') { process.stdout.write(`${VERSION}\n`); }
  else if (arg === '--help' || arg === '-h') { process.stdout.write(`${HELP}\n`); }
  else if (arg === '--check') { check(resolveConfig()).then((code) => process.exit(code)); }
  else {
    const cfg = resolveConfig();
    if (cfg.problems.length) runRefusing(cfg.problems);
    else runBridge(cfg);
  }
}

module.exports = { Bridge, resolveConfig, checkUrl, readConnectionFile, httpErrorMessage, clean, VERSION };

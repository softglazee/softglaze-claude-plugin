'use strict';
// A stand-in for the MCP endpoint inside SoftGlaze Browser, for tests only. It copies the parts of
// the real server (src/main/localApi.js and src/main/ai/mcpServer.js) that a bridge depends on:
// Host check, Bearer token, Mcp-Session-Id sessions, 404 for an unknown session, 202 for
// notifications, JSON or text/event-stream answers, DELETE to end a session, /api/v1/health.
// It holds made-up data only and listens on a free port on 127.0.0.1.
const http = require('node:http');
const crypto = require('node:crypto');

const TEST_TOKEN = `sgai_${'T'.repeat(40)}`;

function startMock({ token = TEST_TOKEN, sseFor = ['tools/list'] } = {}) {
  const sessions = new Set();
  const log = [];
  let port = 0;

  const send = (res, status, obj, headers = {}) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers });
    res.end(body);
  };
  const sendSse = (res, obj, headers = {}) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...headers });
    res.write(`event: message\ndata: ${JSON.stringify(obj)}\n\n`);
    res.end();
  };

  const answer = (msg) => {
    switch (msg.method) {
      case 'tools/list':
        return { tools: [
          { name: 'workspace_summary', title: 'Workspace summary', description: 'Counts (mock).', inputSchema: { type: 'object', properties: {} } },
          { name: 'start_profile', title: 'Start a profile', description: 'Starts a profile (mock).', inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } }
        ] };
      case 'tools/call':
        if (msg.params && msg.params.name === 'start_profile') {
          return { isError: true, content: [{ type: 'text', text: 'Waiting for approval in SoftGlaze (mock). Call again with the same arguments after the user answers.' }] };
        }
        return { content: [{ type: 'text', text: 'Workspace: 3 profiles, 2 proxies (mock data).' }] };
      case 'prompts/list':
        return { prompts: [{ name: 'daily_health_check', title: 'Daily health check', description: 'Mock prompt.' }] };
      case 'ping':
        return {};
      default:
        return null;
    }
  };

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let body;
      try { body = text ? JSON.parse(text) : undefined; } catch (e) { body = undefined; }
      log.push({ method: req.method, url: req.url, headers: req.headers, body });
      const host = String(req.headers.host || '');
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { ok: false, error: 'Forbidden', message: 'Invalid Host header.' });
      if (req.method === 'GET' && req.url === '/api/v1/health') return send(res, 200, { ok: true, service: 'SoftGlaze Local API (mock)', ai: true });
      if (!req.url.startsWith('/mcp')) return send(res, 404, { ok: false, error: 'NotFound', message: 'Unknown endpoint.' });
      if (String(req.headers.authorization || '') !== `Bearer ${token}`) {
        return send(res, 401, { ok: false, error: 'Unauthorized', message: 'Unknown token.' }, { 'WWW-Authenticate': 'Bearer realm="SoftGlaze"' });
      }
      const sid = req.headers['mcp-session-id'];
      if (req.method === 'DELETE') {
        if (sid && sessions.delete(String(sid))) { res.writeHead(200); res.end(); return undefined; }
        return send(res, 404, { jsonrpc: '2.0', error: { code: -32001, message: 'Session not found' }, id: null });
      }
      if (req.method !== 'POST' || !body) return send(res, 400, { jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request' }, id: null });
      if (body.method === 'initialize') {
        if (sid) return send(res, 400, { jsonrpc: '2.0', error: { code: -32600, message: 'Already initialized' }, id: body.id });
        const id = crypto.randomUUID();
        sessions.add(id);
        return send(res, 200, {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: (body.params && body.params.protocolVersion) || '2025-06-18',
            capabilities: { tools: {}, prompts: {}, resources: {} },
            serverInfo: { name: 'softglaze', title: 'SoftGlaze Browser (mock)', version: '0.0.0-test' },
            instructions: 'Mock SoftGlaze server for tests.'
          }
        }, { 'mcp-session-id': id });
      }
      if (!sid || !sessions.has(String(sid))) {
        return send(res, sid ? 404 : 400, { jsonrpc: '2.0', error: { code: sid ? -32001 : -32000, message: sid ? 'Session not found. Start a new session.' : 'Bad Request: send an initialize request first.' }, id: null });
      }
      if (body.id === undefined) { res.writeHead(202); res.end(); return undefined; } // notification or response
      const result = answer(body);
      const reply = result ? { jsonrpc: '2.0', id: body.id, result } : { jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } };
      if (sseFor.includes(body.method)) return sendSse(res, reply);
      return send(res, 200, reply);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve({
        port,
        url: `http://127.0.0.1:${port}/mcp`,
        token,
        log,
        sessions,
        dropSessions: () => sessions.clear(), // what an app restart looks like to a client
        close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); })
      });
    });
  });
}

module.exports = { startMock, TEST_TOKEN };

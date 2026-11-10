#!/usr/bin/env node
'use strict';
// Glama build check ONLY: starts the stand-in for the desktop app on 127.0.0.1, then runs the REAL
// bridge over stdio against it, so Glama can start the server and read its tool definitions.
// Real users never run this file: they run the bridge against SoftGlaze Browser itself.
const path = require('node:path');
const { spawn } = require('node:child_process');
const { startStandIn } = require('./stand-in');

(async () => {
  const { port } = await startStandIn({ port: Number(process.env.SOFTGLAZE_PORT) || 0 });
  const bridge = path.join(__dirname, '..', 'plugins', 'softglaze-browser-connector', 'server', 'softglaze-browser-bridge.js');
  const child = spawn(process.execPath, [bridge], {
    stdio: 'inherit',
    env: {
      ...process.env,
      SOFTGLAZE_MCP_URL: `http://127.0.0.1:${port}/mcp`,
      SOFTGLAZE_TOKEN: process.env.SOFTGLAZE_TOKEN || 'sgai_glama_build_check_placeholder'
    }
  });
  child.on('exit', (code) => process.exit(code == null ? 1 : code));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
})().catch((e) => { process.stderr.write(`glama/run.js: ${e.message}\n`); process.exit(1); });

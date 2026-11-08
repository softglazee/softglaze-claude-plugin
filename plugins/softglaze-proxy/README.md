# SoftGlaze Proxy Switcher for Claude

Let Claude use the SoftGlaze Proxy Switcher extension for Chrome and Edge. Ask Claude what proxy your
browser uses, test your saved proxies, switch to a working proxy in a given country, send one site
through a chosen proxy, find and test free proxies, get proxies from a connected provider, and check
which IP and country websites see.

Every change waits for your approval in a small window in the browser (Allow once, Allow for 1 hour,
or Deny), and the extension logs every AI call in its settings.

## What you need

- The SoftGlaze Proxy Switcher extension in Chrome or Edge.
- The **SoftGlaze Proxy Bridge**, a small free program from the SoftGlaze website, unzipped to a
  folder on your computer, and Node.js 20 or newer to run it.
- Claude Code, or the Claude desktop app, on the same computer as the browser.

This plugin teaches Claude how to use the extension's tools safely and how to set up the bridge. The
tools themselves come from the bridge, which you add to Claude once (the plugin does not start it).

## Set it up

1. Install the plugin in Claude Code:
   ```
   /plugin marketplace add softglazee/softglaze-claude-plugin
   /plugin install softglaze-proxy@softglaze
   ```
2. Ask Claude "connect SoftGlaze Proxy" (or run `/softglaze-proxy:connect-proxy-bridge <folder>`).
   It walks you through it:
   - In the extension: Settings, "AI apps (MCP)", turn on "Let AI apps connect", type the bridge
     folder and press **Pair**. Run the command it shows in a terminal (the code works once).
   - Add the bridge to Claude Code:
     ```
     claude mcp add --transport stdio --scope user softglaze-proxy -- node "C:/SoftGlaze/softglaze-proxy-bridge/bin/softglaze-proxy-bridge.js"
     ```
3. Run `/mcp` and check that `softglaze-proxy` is connected, then ask "What proxy am I using?".

## Skills

- `softglaze-proxy`: how Claude uses the tools (look first, explain before changing, accept a denial,
  warn about free proxies, never ask for passwords or keys).
- `connect-proxy-bridge`: the setup steps above, with your folder filled in.

## What it runs and what data it sends

- **This plugin** contains only instructions for Claude (Markdown). It runs no program, starts no
  server and sends nothing anywhere.
- **The bridge** you add runs on your computer. It talks to Claude over stdio and to the extension
  over a WebSocket on 127.0.0.1 that only the paired extension may open. Nothing goes to SoftGlaze's
  servers.
- **What Claude sees:** the tool results, such as proxy names, addresses, countries and test results.
  Results never contain passwords, proxy logins or API keys, and your own IP is never returned, only
  its country. Claude sends what it sees to Anthropic as part of your conversation.

## License

MIT. See `LICENSE`. The extension and the bridge are licensed separately.

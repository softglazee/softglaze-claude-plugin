# SoftGlaze Browser connector for Claude Code

Connects Claude Code to the SoftGlaze AI tools inside [SoftGlaze Browser](https://browser.softglaze.com)
on the same Windows computer. Install it next to the **softglaze-browser** plugin, which has the
skills that teach Claude how to use these tools. Every change Claude asks for waits for you to press
**Allow** in the SoftGlaze app.

## What you need

- SoftGlaze Browser 1.0.22 or newer, with **SoftGlaze AI** switched on (SoftGlaze AI page, **AI
  server** switch), and a SoftGlaze AI token (Tokens tab, **Create token**; it starts with `sgai_`).
- Node.js 18 or newer on the PATH (`node --version`), which runs the small bridge in this plugin.

## Set it up

```
/plugin marketplace add softglazee/softglaze-claude-plugin
/plugin install softglaze-browser@softglaze
/plugin install softglaze-browser-connector@softglaze
```

When Claude Code asks, paste your token and keep the port at 8080 unless the SoftGlaze AI page shows
another one. To change them later: `/plugin`, **Installed**, **softglaze-browser-connector**,
**Configure**. Then run `/mcp` and check that `plugin:softglaze-browser-connector:softglaze` is
connected.

Cowork does not show plugin settings yet, so for Claude Desktop chats and Cowork use the SoftGlaze
extension for Claude Desktop (`softglaze-browser.mcpb`, linked from
https://browser.softglaze.com/docs/ai-agents) instead of this plugin.

Without Node.js, skip this plugin and add the server over HTTP:
`claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`.

## What it runs and what data it sends

- **What runs:** `server/softglaze-browser-bridge.js`, a readable, dependency-free Node.js script that
  Claude Code starts as a local MCP server. It reads MCP messages from Claude, sends them to SoftGlaze
  on `http://127.0.0.1:<port>/mcp` with your token, and passes the answers back. It refuses any
  address that is not 127.0.0.1, localhost or [::1], so your token and data never leave your computer
  through this plugin. It reads no files and writes nothing to disk.
- **Where the token comes from:** only the plugin setting, which Claude Code keeps in your system's
  secure storage.
- **What Claude sees:** the results of the SoftGlaze tools it calls. SoftGlaze never gives AI apps
  cookies, 2FA codes, proxy passwords, saved-login passwords, billing or member management, and AI
  apps cannot delete anything.
- **SoftGlaze's servers:** this plugin sends nothing to SoftGlaze's servers.

## Trouble

- `/mcp` shows the server as failed: open SoftGlaze and switch on the AI server, then check the port
  and token. In a terminal, `node "<plugin folder>/server/softglaze-browser-bridge.js" --check` shows
  the address it uses and whether SoftGlaze accepted the token.
- Two sets of SoftGlaze tools: you also added SoftGlaze by hand (`claude mcp add`) or through the
  Claude Desktop extension. Keep one.

## License

MIT. See `LICENSE`. SoftGlaze Browser itself is licensed separately.

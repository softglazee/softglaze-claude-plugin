# Connecting SoftGlaze Browser

Walk the user through these steps. They do every step themselves; never ask for the token in chat.

1. **Install or update SoftGlaze Browser** to 1.0.22 or newer (https://browser.softglaze.com/download).
   SoftGlaze AI is a Beta. It runs on Windows, and the AI app must run on the same computer.
2. **Switch on the AI server.** In SoftGlaze Browser: SoftGlaze AI (sidebar, under Workspace), then
   switch on **AI server**. The status shows **Running** and the address, for example
   `127.0.0.1:8080`. Only the Owner or an Admin can open this page.
3. **Create a token.** Tokens tab, **Create token**. Pick a name such as "Claude Code on this PC",
   a scope (Read only, Operate, or Full for the Owner only) and an expiry. Copy the token: it starts
   with `sgai_` and is shown once.
4. **Connect the tools, one way only.** This plugin has the skills; the tools come from the app.
   - Claude Code, with Node.js 18 or newer: install the companion plugin
     `/plugin install softglaze-browser-connector@softglaze` (after
     `/plugin marketplace add softglazee/softglaze-claude-plugin`) and paste the token when asked.
     To change it later: `/plugin`, **Installed**, **softglaze-browser-connector**, **Configure**.
   - Claude Code without Node.js: in a terminal, run
     `claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`,
     with the user typing their own token in place of `<YOUR_TOKEN>`.
   - Claude Desktop chats and Cowork: install the SoftGlaze extension for Claude Desktop
     (`softglaze-browser.mcpb`, linked from https://browser.softglaze.com/docs/ai-agents); it asks for
     the token.
5. **Check it.** In Claude Code, `/mcp` should list `plugin:softglaze-browser-connector:softglaze` or
   `softglaze` as connected. Then call `workspace_summary`.

## Problems

- **No SoftGlaze tools at all**: step 4 was skipped, or the session started before it. Connect, then
  start a new session.
- **Not reachable**: SoftGlaze is closed, the AI server is off, or the port differs from the one in
  the settings. The SoftGlaze AI page shows the real port.
- **The AI server will not start: port in use**: another program holds the port. The Owner picks
  another port on the Settings tab, then the user updates the setting.
- **401**: the whole token was not pasted, or it was revoked or expired. Create a new token.
- **403 "Developer API token"**: keys that start `sg_` work on the Local API only, not on MCP.
- **The session dropped after SoftGlaze restarted**: run `/mcp` and reconnect.
- **Two sets of SoftGlaze tools**: SoftGlaze was connected two ways (for example the connector plugin
  and `claude mcp add`). Remove one of them.

More: https://browser.softglaze.com/docs/ai-agents

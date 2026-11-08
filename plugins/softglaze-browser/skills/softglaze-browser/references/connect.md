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
4. **Enter it in the plugin.**
   - Claude Code: run `/plugin`, open the **Installed** tab, choose **softglaze-browser**, then
     **Configure**, and paste the token. Set the port too if it is not 8080. Then run
     `/reload-plugins` or start a new session.
   - Cowork (Claude desktop app): Cowork does not ask for plugin settings, so save a connection
     file instead, at `%USERPROFILE%\.softglaze\mcp-connection.json`:
     `{ "url": "http://127.0.0.1:8080/mcp", "token": "sgai_..." }`
     Only the user should be able to read this file. Revoke the token in SoftGlaze if the file is
     ever shared.
5. **Check it.** In Claude Code, `/mcp` should list `plugin:softglaze-browser:softglaze` as connected.
   In a terminal, `node "<plugin folder>/server/softglaze-browser-bridge.js" --check` prints the
   address it uses and whether SoftGlaze accepted the token.

The bridge needs Node.js 18 or newer on the PATH (`node --version`). Without Node.js, Claude Code
users can connect directly over HTTP instead (and leave this plugin's server unused):

```
claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"
```

## Problems

- **Not reachable**: SoftGlaze is closed, the AI server is off, or the port differs from the one in
  the plugin settings. The SoftGlaze AI page shows the real port.
- **The AI server will not start: port in use**: another program holds the port. The Owner picks
  another port on the Settings tab, then the user updates the plugin setting.
- **401**: the whole token was not pasted, or it was revoked or expired. Create a new token.
- **403 "Developer API token"**: keys that start `sg_` work on the Local API only, not on MCP.
- **The session dropped after SoftGlaze restarted**: the bridge opens a new session by itself. If it
  still fails, run `/mcp` and reconnect.
- **Two sets of SoftGlaze tools**: the user also added SoftGlaze by hand earlier (`claude mcp add` or
  a config file). Remove one of them.

More: https://browser.softglaze.com/docs/ai-agents

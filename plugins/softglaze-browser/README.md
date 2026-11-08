# SoftGlaze Browser for Claude

Work with your [SoftGlaze Browser](https://browser.softglaze.com) profiles from Claude. Ask Claude to
check which profiles and proxies have problems, find out why a profile keeps getting CAPTCHAs, fix
timezone and language settings that disagree with a proxy, write and run macros, warm up new
profiles, or open your own site from several countries and compare what each visitor sees.

Claude never changes anything on its own: every change waits for you to press **Allow** in the
SoftGlaze app, and you can press **Stop all AI** there at any time.

## What you need

- SoftGlaze Browser 1.0.22 or newer on Windows, with **SoftGlaze AI** switched on (SoftGlaze AI page,
  **AI server** switch). SoftGlaze AI is a Beta. Only the Owner or an Admin can switch it on and
  create tokens.
- A SoftGlaze AI token (Tokens tab, **Create token**). It starts with `sgai_`.
- Claude Code, or Cowork in the Claude desktop app, on the same computer as SoftGlaze. In claude.ai
  chat on the web the skills load, but the SoftGlaze tools do not, because SoftGlaze only answers on
  this computer.
- Node.js 18 or newer on the PATH, which runs the small bridge this plugin includes.

## Set it up

**Claude Code**

1. Add the marketplace and install the plugin:
   ```
   /plugin marketplace add softglazee/softglaze-claude-plugin
   /plugin install softglaze-browser@softglaze
   ```
2. When Claude Code asks, paste your token and keep the port at 8080 unless the SoftGlaze AI page
   shows another one. To change them later: `/plugin`, **Installed**, **softglaze-browser**,
   **Configure**.
3. Run `/mcp` and check that `plugin:softglaze-browser:softglaze` is connected.

**Cowork (Claude desktop app)**

1. In Claude, open **Customize > Plugins**, add the marketplace `softglazee/softglaze-claude-plugin`
   and install **SoftGlaze Browser** (or install it from the directory once it is listed there).
2. Cowork does not ask for plugin settings, so save your token in a connection file at
   `%USERPROFILE%\.softglaze\mcp-connection.json`:
   ```json
   { "url": "http://127.0.0.1:8080/mcp", "token": "sgai_your_token" }
   ```
   Keep this file private. If it is ever shared, revoke the token in SoftGlaze.
3. Start a Cowork task on this computer and ask Claude to call `workspace_summary`.

## Use it

Ask in plain words, for example "Run a SoftGlaze health check on the Clients DE group" or "Why does
profile Shop-UK-3 get CAPTCHAs?". The plugin also has a skill for each of SoftGlaze's twelve ready-made
workflows, which you can run by name in Claude Code and Cowork:

| Skill | What it does |
|---|---|
| `/softglaze-browser:daily-health-check [group]` | Profiles and proxies with problems, and the fix for each |
| `/softglaze-browser:diagnose-captcha <profile>` | Why one profile gets CAPTCHAs, and the smallest fix |
| `/softglaze-browser:create-geo-profiles <count> <country> <group>` | New profiles, each with a working proxy from that country |
| `/softglaze-browser:fix-proxy-mismatches [group]` | Timezone, language and location that disagree with the proxy |
| `/softglaze-browser:rotate-bad-proxies [group]` | Rotate or replace failing and blocklisted proxies |
| `/softglaze-browser:warm-up-profiles <group> [sites] [days]` | A Cookie Warmer plan and run |
| `/softglaze-browser:write-macro "<goal>" <site>` | A macro written, saved and dry-run on one profile |
| `/softglaze-browser:run-macro-on-group <macro> <group> [at once]` | A macro across a group, within your plan's limits |
| `/softglaze-browser:qa-test-site <url> <countries>` | Your own site or ad as visitors from each country see it |
| `/softglaze-browser:price-check <url> <countries>` | Prices and offers by country |
| `/softglaze-browser:team-access-review` | Who used which profiles and groups (read only) |
| `/softglaze-browser:weekly-report` | A one-page weekly report |

## What it runs and what data it sends

- **What runs:** `server/softglaze-browser-bridge.js`, a dependency-free Node.js script that Claude
  starts as a local MCP server. It reads MCP messages from Claude, sends them to SoftGlaze on
  `http://127.0.0.1:<port>/mcp` with your token, and passes the answers back. It refuses any address
  that is not 127.0.0.1, localhost or [::1], so your token and data never leave your computer through
  this plugin. It writes nothing to disk.
- **Where the token comes from:** the plugin setting (stored in your system's secure storage by
  Claude Code), or, if that is empty, the connection file above.
- **What Claude sees:** the results of the SoftGlaze tools it calls, such as profile names, groups,
  proxy countries and check results, page text and screenshots from profiles it opens. SoftGlaze never
  gives AI apps cookies, 2FA codes, proxy passwords, saved-login passwords, billing or member
  management, and AI apps cannot delete anything. Claude sends what it sees to Anthropic as part of
  your conversation, under your Claude plan's terms.
- **SoftGlaze's servers:** this plugin sends nothing to SoftGlaze's servers. The SoftGlaze app itself
  keeps an activity log of every AI call on your computer.

## Trouble

- `/mcp` shows the server as failed: open SoftGlaze and switch on the AI server, then check the port
  and token. In a terminal, `node "<plugin folder>/server/softglaze-browser-bridge.js" --check` shows
  the address it uses and whether SoftGlaze accepted the token.
- No Node.js: install it from nodejs.org, or skip this plugin's server and connect Claude Code over
  HTTP: `claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`.
- Full guide: https://browser.softglaze.com/docs/ai-agents

## License

MIT. See `LICENSE`. SoftGlaze Browser itself is licensed separately.

# SoftGlaze Browser MCP

Lets AI apps (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline, Gemini CLI, Codex, n8n and
other MCP clients) work with the browser profiles in **SoftGlaze Browser**, a multi-profile browser for
Windows 10 and 11: list and check profiles and proxies, start and stop profiles, run macros and warm-ups,
and act inside a running profile's page (open, click, type, scroll, read, screenshot) through that
profile's own proxy and fingerprint.

The MCP server runs **inside the SoftGlaze Browser desktop app** on `127.0.0.1` (default port 8080).
This repository holds the small Node.js bridge that connects stdio MCP clients to it, plus Claude
plugins with skills. It does not work without the desktop app.

## How to use it

1. **Install SoftGlaze Browser** (Windows 10 or 11) from https://browser.softglaze.com. It has a 7-day
   free trial; then Pro is US$5 a month.
2. **Switch on SoftGlaze AI** in the app (sidebar > SoftGlaze AI, the switch at the top). It is off by
   default, and only the workspace Owner and Admins can use it.
3. **Create a token** on the SoftGlaze AI page (Tokens tab). Choose its access: read, operate or full.
4. **Connect your AI app** with one of the options below, using your token.
5. **Ask your AI app**, for example: "List my SoftGlaze profiles and check which proxies are failing."

### Connect: apps that support HTTP MCP servers

Point the app at the local endpoint with your token:

```
URL:    http://127.0.0.1:8080/mcp
Header: Authorization: Bearer <YOUR_TOKEN>
```

Claude Code: `claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`

### Connect: apps that start a local command (stdio), through this bridge

Requires Node.js 18 or newer. Clone this repository, then add to your app's MCP settings
(Cursor, VS Code, Windsurf, Cline, Claude Desktop and others use this shape):

```json
{
  "mcpServers": {
    "softglaze": {
      "command": "node",
      "args": ["/path/to/softglaze-claude-plugin/plugins/softglaze-browser-connector/server/softglaze-browser-bridge.js"],
      "env": { "SOFTGLAZE_TOKEN": "<YOUR_TOKEN>", "SOFTGLAZE_PORT": "8080" }
    }
  }
}
```

The bridge reads only `SOFTGLAZE_TOKEN`, `SOFTGLAZE_PORT` or `SOFTGLAZE_MCP_URL` (and the Claude Code
plugin settings below). It reads no files and sends data only to `127.0.0.1`.

### Connect: Claude Code plugin, Claude Desktop and Cowork

- **Claude Code**: install the plugins from this marketplace (see "Claude plugins" below) and set the
  token in `/plugin` > Installed > softglaze-browser-connector > Configure.
- **Claude Desktop and Cowork**: use the SoftGlaze extension for Claude Desktop
  (`softglaze-browser.mcpb`), linked from https://browser.softglaze.com/docs/ai-agents.
- claude.ai on the web cannot reach a server on your own computer.

Step-by-step guides for each app: https://browser.softglaze.com/docs/ai-agents

## What the tools do

39 tools with a normal token (one more, `get_cdp_endpoint`, only in the app's Expert mode):

| Area | Tools |
|---|---|
| Workspace and profiles | `workspace_summary`, `list_profiles`, `get_profile`, `profile_health`, `create_profile`, `update_profile`, `batch_generate_profiles` |
| Running profiles | `list_sessions`, `start_profile`, `stop_profile`, `stop_all_profiles` |
| Proxies | `list_proxies`, `check_proxy`, `get_proxy_health`, `assign_proxy`, `rotate_proxy_ip`, `find_free_proxies` |
| Groups | `list_groups`, `create_group`, `move_profiles_to_group` |
| Automation | `list_macros`, `get_macro`, `save_macro`, `run_macro`, `get_run_status`, `stop_run`, `start_warmer` |
| Activity and memory | `get_activity`, `read_memory`, `update_memory` |
| Inside a running profile's page | `page_navigate`, `page_snapshot`, `page_click`, `page_type`, `page_press_key`, `page_scroll`, `page_screenshot`, `page_extract_text`, `page_wait_for` |

## Safety

- The server listens on `127.0.0.1` only and needs a token. It is off until you switch it on.
- You choose how often changes need your approval in the app. Defaults: read tools never ask,
  operate tools ask once an hour, full-access tools ask every time. A request nobody answers within
  2 minutes is denied. "Stop all AI" switches everything off at once.
- AI apps never get cookies, 2FA codes, proxy usernames or passwords, saved or vault passwords, billing,
  member changes, or delete/trash actions. Every call is logged in the app.

## Claude plugins

This repository is also a Claude plugin marketplace with three plugins:

| Plugin | Folder | What it does |
|---|---|---|
| `softglaze-browser` | `plugins/softglaze-browser` | Skills only: how to use SoftGlaze Browser's MCP tools, and the twelve SoftGlaze workflows as skills. This is the folder listed in Claude's directory. |
| `softglaze-browser-connector` | `plugins/softglaze-browser-connector` | The local MCP bridge to the app on 127.0.0.1, for Claude Code. Only in this marketplace. |
| `softglaze-proxy` | `plugins/softglaze-proxy` | Skills for the SoftGlaze Proxy Switcher extension's tools and for setting up the SoftGlaze Proxy Bridge (no server of its own). |

Each plugin folder has its own README (what it does, what it runs, what data it sends) and LICENSE,
because the Claude directory lists each folder as a separate submission.

**Install in Claude Code**

```
/plugin marketplace add softglazee/softglaze-claude-plugin
/plugin install softglaze-browser@softglaze
/plugin install softglaze-browser-connector@softglaze
/plugin install softglaze-proxy@softglaze
```

From a shell: `claude plugin marketplace add softglazee/softglaze-claude-plugin`, then
`claude plugin install softglaze-browser@softglaze` and `claude plugin install softglaze-browser-connector@softglaze`.
The shell command does not ask for the token; set it afterwards with `/plugin` (Installed,
softglaze-browser-connector, Configure). To try a local copy without installing:
`claude --plugin-dir ./plugins/softglaze-browser --plugin-dir ./plugins/softglaze-browser-connector`.

**Cowork and claude.ai (Customize > Plugins)**: Add > Add marketplace > `softglazee/softglaze-claude-plugin`,
then install the plugins. Skills load everywhere; the tools need the local app (see above).

**Why the skills and the bridge are separate plugins**: Claude's directory accepts plugins that run a
local MCP server, or that contain scripts, only from organizations Anthropic has verified. So the
directory lists `softglaze-browser` (Markdown skills only), and the bridge lives in
`softglaze-browser-connector`, installed from this marketplace. The connector's `token` setting is
`sensitive` (Claude Code keeps it in the system keychain). No token is in this repository.

## Glama build check

Glama's automated checks run `glama/run.js`: it starts `glama/stand-in.js`, a stand-in for the desktop
app's endpoint that answers with the app's real tool definitions (`glama/tools.json`, exported from the
app's tool registry) and answers every tool call with "install SoftGlaze Browser", then runs the real
bridge against it. Real users never run these files; they are not part of any plugin.

## Develop

- `npm test`: tests of the bridge against `test/mock-softglaze.js` (made-up data) and of the Glama
  build check (Node.js 18+, no packages). Runs on every push in GitHub Actions.
- `npm run validate`: `claude plugin validate` on the marketplace and each plugin. Add
  `--profile directory` to a plugin path to run the directory's local checks.
- `test/`, `glama/` and `package.json` at the repository root are not part of any plugin; the directory
  and installs read only the plugin folders.

Submission steps for Anthropic's directory: `SUBMISSION-CHECKLIST.md`.

## License

MIT (`LICENSE`). SoftGlaze Browser and the SoftGlaze Proxy extension and bridge are licensed
separately.

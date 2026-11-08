# SoftGlaze plugins for Claude

A Claude plugin marketplace with two plugins:

| Plugin | Folder | What it does |
|---|---|---|
| `softglaze-browser` | `plugins/softglaze-browser` | Skills for SoftGlaze Browser's MCP tools, the twelve SoftGlaze workflows as skills, and a local MCP server entry that connects to the app |
| `softglaze-proxy` | `plugins/softglaze-proxy` | Skills for the SoftGlaze Proxy Switcher extension's tools and for setting up the SoftGlaze Proxy Bridge (no server of its own) |

Each plugin folder has its own README (what it does, what it runs, what data it sends) and LICENSE,
because the Claude directory lists each folder as a separate submission.

## Install

**Claude Code**

```
/plugin marketplace add softglazee/softglaze-claude-plugin
/plugin install softglaze-browser@softglaze
/plugin install softglaze-proxy@softglaze
```

From a shell: `claude plugin marketplace add softglazee/softglaze-claude-plugin`, then
`claude plugin install softglaze-browser@softglaze`. The shell command does not ask for the token;
set it afterwards with `/plugin` (Installed, softglaze-browser, Configure).

To try a local copy without installing: `claude --plugin-dir ./plugins/softglaze-browser`.

**Cowork and claude.ai (Customize > Plugins)**

Add > Add marketplace > `softglazee/softglaze-claude-plugin`, then install the plugins. Skills load
everywhere. The SoftGlaze Browser server is a local server, so it runs in Claude Code and in Cowork
sessions on your computer, not in claude.ai chat on the web. Cowork does not ask for plugin settings:
see the connection file in `plugins/softglaze-browser/README.md`.

## How SoftGlaze Browser is connected, and why

SoftGlaze Browser's MCP server lives inside the desktop app at `http://127.0.0.1:<port>/mcp` and needs
a `sgai_` token. The plugin starts `server/softglaze-browser-bridge.js` with `node`, and the bridge
forwards MCP messages to that address with the token.

| Option | Claude Code | Cowork | claude.ai chat | Directory review | Why chosen or not |
|---|---|---|---|---|---|
| **Bundled stdio bridge** (chosen) | Works; token asked for in the plugin dialog and kept in secure storage | Works on this computer; token from `~/.softglaze/mcp-connection.json` | Ignored (local) | Allowed; a reviewer reads the script ("Scripts the validator couldn't follow" hold expected) | Works on two surfaces; no network download; readable 18 KB file; needs Node.js 18+ |
| HTTP entry `type: http` to 127.0.0.1 | Works without Node.js | Treated as a connector; reaching 127.0.0.1 is not documented | Ignored | A literal `http://` URL is blocked ("MCP server URL is not https"); a `${user_config.*}` URL passes | Not chosen; documented as the no-Node alternative (`claude mcp add --transport http ...`) |
| `npx softglaze-browser-mcp@1.0.0` | Works | Works if Node.js is installed | Ignored | Held for review ("Runs a pinned npx package") | Needs the npm package first and a download on first run |
| The app's own exe with `ELECTRON_RUN_AS_NODE=1` | Works | Works | Ignored | Blocked: the command must be a path under `${CLAUDE_PLUGIN_ROOT}` | Install folder differs per computer |

Token handling: the `token` setting is `sensitive` (Claude Code stores it in the system keychain). It
has an empty default so Cowork, which only loads servers whose settings all have defaults, still
starts the bridge; the bridge then reads the connection file. No token is in this repository.

## Develop

- `npm test`: 12 tests of the bridge against `test/mock-softglaze.js`, a stand-in for the app's
  endpoint with made-up data (Node.js 18+, no packages).
- `npm run validate`: `claude plugin validate` on the marketplace and both plugins. Add
  `--profile directory` to a plugin path to run the directory's local checks.
- `test/` and `package.json` at the repository root are not part of either plugin; the directory and
  installs read only the plugin folders.

Submission steps for Anthropic's directory: `SUBMISSION-CHECKLIST.md`.

## License

MIT (`LICENSE`). SoftGlaze Browser and the SoftGlaze Proxy extension and bridge are licensed
separately.

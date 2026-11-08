# SoftGlaze plugins for Claude

A Claude plugin marketplace with three plugins:

| Plugin | Folder | What it does |
|---|---|---|
| `softglaze-browser` | `plugins/softglaze-browser` | Skills only: how to use SoftGlaze Browser's MCP tools, and the twelve SoftGlaze workflows as skills. This is the folder listed in Claude's directory. |
| `softglaze-browser-connector` | `plugins/softglaze-browser-connector` | The local MCP server entry (a small Node.js bridge to the app on 127.0.0.1) for Claude Code. Only in this marketplace. |
| `softglaze-proxy` | `plugins/softglaze-proxy` | Skills for the SoftGlaze Proxy Switcher extension's tools and for setting up the SoftGlaze Proxy Bridge (no server of its own) |

Each plugin folder has its own README (what it does, what it runs, what data it sends) and LICENSE,
because the Claude directory lists each folder as a separate submission.

## Install

**Claude Code**

```
/plugin marketplace add softglazee/softglaze-claude-plugin
/plugin install softglaze-browser@softglaze
/plugin install softglaze-browser-connector@softglaze
/plugin install softglaze-proxy@softglaze
```

From a shell: `claude plugin marketplace add softglazee/softglaze-claude-plugin`, then
`claude plugin install softglaze-browser@softglaze` and `claude plugin install softglaze-browser-connector@softglaze`.
The shell command does not ask for the token; set it afterwards with `/plugin` (Installed,
softglaze-browser-connector, Configure).

To try a local copy without installing:
`claude --plugin-dir ./plugins/softglaze-browser --plugin-dir ./plugins/softglaze-browser-connector`.

**Cowork and claude.ai (Customize > Plugins)**

Add > Add marketplace > `softglazee/softglaze-claude-plugin`, then install the plugins. Skills load
everywhere. SoftGlaze's tools are a local server, so they cannot be reached from claude.ai chat on the
web. For Claude Desktop chats and Cowork, connect them with the SoftGlaze extension for Claude Desktop
(`softglaze-browser.mcpb`, linked from https://browser.softglaze.com/docs/ai-agents).

## Why the skills and the server are separate plugins

Claude's directory accepts plugins that run a local MCP server, or that contain scripts, only from
organizations Anthropic has verified. So the directory lists `softglaze-browser` (Markdown skills
only), and the bridge that reaches the app lives in `softglaze-browser-connector`, which you install
from this marketplace. Claude Desktop and Cowork users connect with the `.mcpb` extension instead, and
Claude Code users without Node.js can run
`claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`.

The bridge reads its token only from the connector's `token` setting, which is `sensitive` (Claude Code
keeps it in the system keychain). It reads no files. No token is in this repository.

## Develop

- `npm test`: 12 tests of the bridge against `test/mock-softglaze.js`, a stand-in for the app's
  endpoint with made-up data (Node.js 18+, no packages).
- `npm run validate`: `claude plugin validate` on the marketplace and each plugin. Add
  `--profile directory` to a plugin path to run the directory's local checks.
- `test/` and `package.json` at the repository root are not part of either plugin; the directory and
  installs read only the plugin folders.

Submission steps for Anthropic's directory: `SUBMISSION-CHECKLIST.md`.

## License

MIT (`LICENSE`). SoftGlaze Browser and the SoftGlaze Proxy extension and bridge are licensed
separately.

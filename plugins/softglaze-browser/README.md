# SoftGlaze Browser for Claude

Work with your [SoftGlaze Browser](https://browser.softglaze.com) profiles from Claude. Ask Claude to
check which profiles and proxies have problems, find out why a profile keeps getting CAPTCHAs, fix
timezone and language settings that disagree with a proxy, write and run macros, warm up new
profiles, or open your own site from several countries and compare what each visitor sees.

This plugin is a set of skills: written instructions that teach Claude how to use SoftGlaze's own AI
tools well. The tools themselves live inside the SoftGlaze Browser app on your computer, and you
connect them once (see below). Claude never changes anything on its own: every change waits for you
to press **Allow** in the SoftGlaze app, and you can press **Stop all AI** there at any time.

## What you need

- SoftGlaze Browser 1.0.22 or newer on Windows, with **SoftGlaze AI** switched on (SoftGlaze AI page,
  **AI server** switch). SoftGlaze AI is a Beta. Only the Owner or an Admin can switch it on and
  create tokens.
- A SoftGlaze AI token (Tokens tab, **Create token**). It starts with `sgai_`.
- Claude Code, or Claude Desktop (chats and Cowork), on the same computer as SoftGlaze. In claude.ai
  chat on the web the skills load, but SoftGlaze's tools cannot be reached there, because SoftGlaze
  only answers on your own computer.

## Set it up

1. Install this plugin (from the Claude directory, or in Claude Code:
   `/plugin marketplace add softglazee/softglaze-claude-plugin`, then
   `/plugin install softglaze-browser@softglaze`).
2. Connect SoftGlaze's tools, one way only:
   - **Claude Code:** install the companion plugin
     `/plugin install softglaze-browser-connector@softglaze` and paste your token when asked, or add
     the server yourself:
     `claude mcp add --transport http softglaze http://127.0.0.1:8080/mcp --header "Authorization: Bearer <YOUR_TOKEN>"`.
   - **Claude Desktop chats and Cowork:** install the SoftGlaze extension for Claude Desktop
     (`softglaze-browser.mcpb`, linked from https://browser.softglaze.com/docs/ai-agents). It asks for
     the token and keeps it in your system's secure storage.
3. Ask Claude to "check my SoftGlaze connection". The `softglaze-browser` skill walks you through any
   step that is missing.

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

- **What runs:** nothing. This plugin contains only Markdown skills, this README, a license and an
  icon. It has no scripts, no hooks and no MCP server of its own.
- **What Claude sees:** when you have connected SoftGlaze's tools, Claude sees the results of the
  tools it calls, such as profile names, groups, proxy countries and check results, and page text
  and screenshots from profiles it opens. SoftGlaze never gives AI apps cookies, 2FA codes, proxy
  passwords, saved-login passwords, billing or member management, and AI apps cannot delete anything.
  Claude sends what it sees to Anthropic as part of your conversation, under your Claude plan's terms.
- **SoftGlaze's servers:** this plugin sends nothing to SoftGlaze's servers. The SoftGlaze app keeps
  an activity log of every AI call on your computer.

## Trouble

- Claude says the SoftGlaze tools are missing: connect them (step 2 above), then start a new session.
- Not reachable: open SoftGlaze and switch on the AI server, then check the port and token shown on
  the SoftGlaze AI page.
- Full guide: https://browser.softglaze.com/docs/ai-agents

## License

MIT. See `LICENSE`. SoftGlaze Browser itself is licensed separately.

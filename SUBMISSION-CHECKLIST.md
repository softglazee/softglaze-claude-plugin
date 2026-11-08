# Claude directory submission checklist (filled in 9 Nov 2026)

Sources: claude.com/docs/directory/publish, /docs/plugins/pre-submission-checklist, /docs/plugins/submit,
/docs/plugins/platform-support, code.claude.com/docs/en/plugins/manifest-reference (all read 9 Nov 2026).
Each plugin folder is its own submission. Submit `softglaze-browser` first; `softglaze-proxy` waits
for the blockers in section 4.

## 1. Before the portal

| Requirement | Status |
|---|---|
| Paid plan: Pro, Max, Ultra (own account), or Owner on Team/Enterprise | Owner to confirm on claude.ai |
| GitHub account connected on claude.ai (portal checks push access) | Owner to do |
| Public GitHub repo (may be private while validating; public before going live) | `softglazee/softglaze-claude-plugin` to create |
| `.claude-plugin/plugin.json` in each plugin folder | Done |
| Name: lowercase, digits, hyphens, max 64, own brand, not taken | `softglaze-browser`, `softglaze-proxy` (taken-check happens at **Validate**) |
| `description`, `author`, `version` set | Done (1.0.0) |
| README of 40+ words in the plugin folder, saying what it does, how to use it, what data it sends | Done for both |
| LICENSE file or `license` field | Both (MIT) |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini`; Windows and macOS-safe names; no symlinks, submodules, LFS | Done (`.gitignore` keeps them out) |
| Files under 256 KiB, 512 files or fewer, only text and PNG | Done (largest: icon.png 64 KB; bridge 18 KB) |
| No package launcher, no lockfile, no `.npmrc` in plugin folders | Done |
| No real credentials anywhere; secrets through `userConfig` with `sensitive: true` | Done (token is `sensitive`; README examples use `sgai_your_token`) |
| Local MCP server started as `node ${CLAUDE_PLUGIN_ROOT}/<file>` with plain arguments | Done |
| Readable source, nothing minified | Done |
| `claude plugin validate --strict` and `--profile directory` | Passed for the marketplace and both plugins (Claude Code 2.1.319) |
| Listing links (`icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl`) | Browser: all live (HTTP 200 on 9 Nov). Proxy: `/proxy-extension` and `/proxy-extension/bridge` return 404 today |

Expected review notes (not blocking): the browser plugin's server runs a Node.js file, which the
docs say is always held for a reviewer ("Scripts the validator couldn't follow"), and the bridge reads
an optional token file from the user's home folder ("Uses a credential from the user's machine" may be
raised). Both are described in the plugin README.

## 2. Portal fields: softglaze-browser

claude.ai/directory/manage > **Submit new** > **Plugin bundle**

- **Source**
  - Repository: `softglazee/softglaze-claude-plugin`
  - Plugin path: `plugins/softglaze-browser`
  - Branch or tag: `main` (or leave empty for the default branch)
  - Press **Validate**; fix anything marked **Blocking**, push, **Re-validate**
- **Listing details**: read from `plugin.json` and the README (name "SoftGlaze Browser", the
  description, icon `assets/icon.png`, links)
- **Data handling** (suggested answers, owner to confirm):
  - Reads or stores personal data? The plugin stores nothing. Tool results can contain whatever the
    user's profiles and pages contain (profile names, page text, screenshots), which Claude reads in
    the conversation. Answer per the form's wording; mention "only on the user's own computer".
  - Sends data to services other than its declared connectors? No. The bridge only connects to
    127.0.0.1 / localhost / [::1] (enforced in code).
  - How long does it keep data? It keeps none.
  - Intended for people under 18? No.
- **Compliance**: contact email `support@softglaze.com` (or the owner's preferred address); tick all
  four acknowledgements after reading the Software Directory Terms and Policy.
- **Review and submit**: How new versions reach the directory: **GitHub push webhook** (needs admin on
  the repo; set it up from the "Set up push updates" page). Leave **Auto-publish** at the default.
  Press **Submit for review**.

## 3. Portal fields: softglaze-proxy (later)

Same as section 2 with plugin path `plugins/softglaze-proxy`. Data handling: the plugin is Markdown
only; it runs and sends nothing. The bridge it explains is a separate download.

## 4. Blockers and owner decisions

1. **Plan**: a free claude.ai account cannot submit.
2. **SoftGlaze Proxy is not published yet** (extension 1.0.0 not on the Chrome Web Store or Edge
   Add-ons; `browser.softglaze.com/proxy-extension` and `/proxy-extension/bridge` are 404). Publish
   those first, then submit `softglaze-proxy`.
3. **Proxy tools inside the plugin**: the plugin cannot start the downloaded bridge, because the
   directory only accepts server commands that are paths inside the plugin. To ship the tools in the
   plugin itself, either bundle the bridge source in `plugins/softglaze-proxy` (makes its source
   public; it has npm dependencies, so a lockfile install is held for review) or publish it to npm
   and use a pinned `npx`. Both reverse the 8 Nov decision to ship the bridge as a download only.
4. **SoftGlaze AI is a Beta**: the listing says so in the README. Reviewers will test against the
   description; consider adding a note in the portal that the server needs the desktop app.
5. **Names**: the portal refuses a name another organization already uses. If `softglaze-browser` is
   refused, nothing else in the repo needs to change except `name` in `plugin.json` and the
   marketplace entry.

# SoftGlaze tools

Taken from SoftGlaze Browser 1.0.23 (src/main/ai/tools.js and pageTools.js). An AI app only sees the
tools its token's scope allows: Read only < Operate < Full.

Approval rules:

- **none**: runs at once (read-only tools; the user can make read tools ask too).
- **ask**: asks the user; "Allow for 1 hour" lets the same tool run for this token for an hour.
- **always**: asks every time.
- **page**: asks once per profile; "Allow for 1 hour" covers all page tools on that profile.
- **self**: stopping a profile or run that this token started never asks; anything else asks.

| Tool | Scope | Approval | What it does |
|---|---|---|---|
| workspace_summary | read | none | Counts, running profiles, plan limits and this token's scope |
| list_profiles | read | none | Profiles with group, proxy and status (paged; filter by group, search, status, tag) |
| get_profile | read | none | One profile in detail |
| profile_health | read | none | CAPTCHA risk grade and the factors behind it; live: true tests the proxy now |
| list_sessions | read | none | Running profiles |
| list_proxies | read | none | Proxies with status, country, latency, blocklist flag |
| check_proxy | read | none | Tests a proxy now: exit IP, country, ISP, speed |
| get_proxy_health | read | none | A proxy's check history, or the pool and vendor scoreboard |
| list_groups | read | none | Groups |
| list_macros | read | none | Saved macros |
| get_macro | read | none | One macro's steps (typed values hidden) |
| get_run_status | read | none | Progress of a macro run or warm-up |
| get_activity | read | none | Recent activity log |
| read_memory | read | none | The workspace memory |
| create_profile | operate | ask | Creates one profile |
| update_profile | operate | ask | Changes a profile; "fixes" list: tz-auto, lang-auto, geo-auto, webrtc-safe |
| batch_generate_profiles | operate | ask | Creates many profiles, each with a proxy from a country |
| start_profile | operate | ask | Opens a profile's browser (optionally at a URL, optionally headless) |
| stop_profile | operate | self | Closes a running profile (cookies and history are kept) |
| stop_all_profiles | operate | always | Closes every running profile |
| assign_proxy | operate | ask | Assigns proxies to profiles |
| rotate_proxy_ip | operate | ask | Gets a new IP through the vendor's rotation link |
| find_free_proxies | operate | ask | Searches public lists; results go to the "Free proxies" group |
| create_group | operate | ask | Creates a group |
| move_profiles_to_group | operate | ask | Moves profiles to a group |
| save_macro | operate | ask | Saves a macro (steps are validated) |
| run_macro | operate | ask | Runs a macro on one or more profiles, within the plan's parallel limit |
| stop_run | operate | self | Stops a macro run or warm-up |
| start_warmer | operate | ask | Cookie Warmer: visits sites so profiles build normal history |
| update_memory | operate | ask | Changes the workspace memory (never pre-approved) |
| page_navigate | operate | page | Opens an http(s) URL in a running Chromium profile |
| page_snapshot | operate | page | Accessibility tree with selector hints (changes nothing) |
| page_click | operate | page | Clicks an element |
| page_type | operate | page | Types text one key at a time |
| page_press_key | operate | page | Presses a key |
| page_scroll | operate | page | Scrolls the page |
| page_screenshot | operate | page | Screenshot of the main tab |
| page_extract_text | operate | page | Visible text, optionally of one element |
| page_wait_for | operate | page | Waits for an element or text |
| get_cdp_endpoint | full | always | Expert only: DevTools endpoint of a running Chromium profile (detectable) |

Resources: `softglaze://memory/workspace`, `softglaze://guide/how-softglaze-works`,
`softglaze://guide/acceptable-use`, `softglaze://workspace/summary`, `softglaze://profiles/{id}`.

Page tools and macros work on Chromium profiles only, not Firefox profiles. A token can be limited
to some groups; then it only sees and touches profiles in those groups.

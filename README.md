# ZeroScript One — Roblox Studio Prototype Accelerator

ZeroScript One connects Roblox Studio to a fast local template engine and, when needed, one supported browser AI. Version **1.34.0** adds a Golden RNG Template capable of producing a working prototype without waiting for an AI to rebuild standard systems.

## Fastest daily use

1. Run `ZeroScript One.bat`.
2. Open your Roblox place in Studio.
3. Choose a mode in the desktop app:
   - **15 dk Prototip** — AI is optional.
   - **1 Günlük Yayın** — template first, one AI polish pass second.
   - **Özel İş** — one AI owns a change from inspection through testing.
4. Write the game idea or requested change.
5. Press the main button.

The launcher starts the bridge only when port `17613` is free. It does not restart a healthy bridge or create duplicate console windows.

## 15-minute Prototype mode

Prototype mode does not send a broad “make a whole game” prompt to a model. It generates a configuration and installs a verified Golden Template directly.

The first template is **RNG / Aura** and includes:

- server-authoritative rolling and rate limiting
- eight rarity tiers
- pity system
- luck upgrades and coin economy
- inventory and aura equip flow
- DataStore loading and `UpdateAsync` saving
- responsive premium-style UI
- compact themed lobby, spawn and rolling altar
- one install call and one structural verification call

The user idea selects a title and theme preset such as celestial, void, neon, fantasy or cute. The editable baseline config lives in `templates/rng/default.json`.

## Launch Day mode

Launch Day first installs the Golden Template. It then gives one connected AI a bounded polish request:

- do not rebuild working systems
- fix verified runtime and UI issues
- improve onboarding and lightweight game feel
- test mobile and desktop paths
- read Studio Output
- stop without adding unrelated systems or expanding the world

There is no Analyst → Builder → UI → Reviewer → QA chain. At most one AI owns the polish pass.

## Custom Work mode

For an existing project, one AI must:

- inspect only relevant Studio state
- make the real change
- preserve working systems and public data formats
- playtest the changed path
- read Output and fix verified blockers
- finish in the same pass

A new request cancels stale work and becomes the only active request.

## Desktop workspace

The normal app is one screen with:

- three clear modes
- one large request box
- one primary action
- **Durdur**, **Geri al** and **AI aç**
- Bridge, Studio and AI status cards
- live template/install/test activity

Prototype mode labels AI as optional because the deterministic installer performs the main work.

## Browser workspace

A fixed ZeroScript One panel is injected into ChatGPT, Gemini, Qwen, DeepSeek, Claude, Copilot, Mistral, Kimi, GLM and Arena. Custom Work requests can be started from the browser panel. Provider startup failures show a concrete error instead of silently pretending to be connected.

## Roblox Studio workspace

After running `install_studio_panel.bat`, Studio includes a ZeroScript One dock panel with:

- **15 dk Prototip**
- **1 Günlük Yayın**
- **Özel İş**
- automatic Explorer selection context
- stop and rollback actions
- automatic time-limited pairing with the desktop app

Game Settings → Security → **Allow HTTP Requests** must be enabled for the Studio panel.

## Repository layout

The root contains only launchers, active Python entry points and core project metadata. Other content is categorized:

- `zeroscript-extension/` — Chrome extension and orchestration runtime
- `roblox-plugin/` — Roblox Studio plugin sources
- `templates/` — Golden game templates and editable defaults
- `docs/releases/` — current and historical release documentation
- `docs/` — technical documents
- `.github/workflows/` — validation automation

Old root-level release-note files were removed. Complete previous text remains recoverable through Git history; a summary is kept in `docs/releases/HISTORY.md`.

## Safety retained

- one Studio writer lock
- checkpoints and rollback
- catastrophic-change guard
- server-authoritative template logic
- bounded prototype tool calls
- DataStore failure handling
- provider failover for AI-owned work
- playtest and Output requirements
- Memory Vault and Recipe learning

## Updating

Run `ZeroScript Güncelle.bat`, then:

1. Open `chrome://extensions`.
2. Press **Reload** on ZeroScript One.
3. Close and reopen existing AI tabs.
4. Restart Roblox Studio so the new Studio workspace loads.

The updater preserves the local token, settings, profiles, task templates, Memory Vault and config.

## Validation limits

The repository includes JavaScript syntax checks, deterministic workbench/template tests, Python compile checks, control API tests, Memory Vault tests and version parity checks. Live Windows, Chrome, Roblox Studio, Play mode and DataStore behavior must still be tested before publishing a real game.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

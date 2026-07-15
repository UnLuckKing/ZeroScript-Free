# ZeroScript One — Roblox Studio Prototype Accelerator

ZeroScript One creates a working Roblox prototype from a Golden Template, then uses one browser AI only when custom development or final polish is needed. Version **1.35.0** adds **ChatGPT Max**, a ChatGPT-first single-agent workflow for Roblox Studio.

## Daily use

1. Run `ZeroScript One.bat`.
2. Open the Roblox place in Studio.
3. Open one fresh ChatGPT conversation.
4. In the ZeroScript panel, press **Gücü yükselt** to select the strongest reasoning option available to the account.
5. Choose **15 dk Prototip**, **1 Günlük Yayın** or **Özel İş**.
6. Write the idea and press **Yap**.

Prototype mode installs and verifies the RNG/Aura foundation directly, without waiting for an AI to rebuild standard roll, pity, luck, inventory, save, UI and map systems.

## ChatGPT Max

ChatGPT Max is enabled by default for AI-owned work:

- ready ChatGPT is selected before other providers
- one ChatGPT session owns inspection, implementation, self-review, Play mode testing and Output verification
- no separate Analyst, Reviewer, UI, Map or QA model is created
- a compact Project Capsule supplies PlaceId, known systems, recent changed paths, Output signals and verified reports
- broad rescans and repeated script reads are discouraged
- visual tasks require desktop/mobile and button checks in the same pass
- data, purchase and Remote work stays server-authoritative
- an idle ChatGPT session receives at most two bounded continuation nudges instead of silently waiting for hours
- the browser panel detects the visible ChatGPT model/reasoning label and offers **Gücü yükselt**

The extension cannot unlock a model that the ChatGPT account does not include. It selects only options that are visibly available and enabled in the model picker.

## Clean repository layout

- `app/` — desktop runtime, UI and local services
- `bridge/` — Roblox Studio MCP bridge
- `zeroscript-extension/` — browser extension
- `roblox-plugin/` — Studio workspace
- `templates/` — Golden Templates
- `tools/` — installer and release builder
- `tests/` — Python tests
- `docs/` — documentation and historical releases

The repository root contains only the three user actions, documentation and categorized folders. See `docs/REPOSITORY_LAYOUT.md` for details.

## Setup

Run `ZeroScript Kurulum.bat` once. It installs Python dependencies, installs the Studio workspace, opens the Chrome extension page and creates a desktop shortcut.

## Updating

Run `ZeroScript Güncelle.bat`, reload ZeroScript One in `chrome://extensions`, close old ChatGPT tabs, then restart Roblox Studio. The updater preserves local settings, tokens, Memory Vault and bridge configuration while removing obsolete root files.

## Development

- Studio installer: `tools/install_studio_panel.bat`
- Release validation/package: `tools/build_release.bat`
- Bridge diagnostic fallback: `bridge/start.bat`

## License

GPL-3.0-or-later.

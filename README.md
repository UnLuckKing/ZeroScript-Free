# ZeroScript One — Roblox Studio Prototype Accelerator

ZeroScript One creates a working Roblox prototype from a Golden Template, then uses one browser AI only when custom development or final polish is needed.

## Daily use

1. Run `ZeroScript One.bat`.
2. Open the Roblox place in Studio.
3. Choose **15 dk Prototip**, **1 Günlük Yayın** or **Özel İş**.
4. Write the idea and press **Yap**.

Prototype mode installs and verifies the RNG/Aura foundation directly, without waiting for an AI to rebuild standard roll, pity, luck, inventory, save, UI and map systems.

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

Run `ZeroScript Güncelle.bat`, reload ZeroScript One in `chrome://extensions`, then restart Roblox Studio. The updater preserves local settings, tokens, Memory Vault and bridge configuration while removing obsolete root files.

## Development

- Studio installer: `tools/install_studio_panel.bat`
- Release validation/package: `tools/build_release.bat`
- Bridge diagnostic fallback: `bridge/start.bat`

## License

GPL-3.0-or-later.

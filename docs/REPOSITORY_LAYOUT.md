# Repository layout

The root intentionally contains only user-facing launchers, product documentation and categorized folders.

| Folder | Purpose |
|---|---|
| `app/` | Desktop runtime, UI modules and local services |
| `bridge/` | Roblox Studio MCP bridge and its configuration |
| `zeroscript-extension/` | Browser extension runtime |
| `roblox-plugin/` | Roblox Studio plugin sources |
| `templates/` | Golden game templates and presets |
| `tools/` | Installer and release-builder utilities |
| `tests/` | Python regression tests |
| `docs/` | Documentation and historical release notes |

Normal users only need `ZeroScript One.bat`. The update and setup batch files remain in the root because they are direct user actions.

# ZeroScript One — Roblox Studio Prototype Accelerator

ZeroScript One creates a working Roblox prototype from a Golden Template, then uses one browser AI only when custom development or final polish is needed. Version **1.36.0** keeps **ChatGPT Max** and selectively ports the useful reliability work from upstream ZeroScript 1.4.1–1.4.3.

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

## 1.36 upstream reliability sync

The upstream release was reviewed feature by feature rather than merged blindly:

- Studio MCP port ownership now checks both TCP and TCPv6.
- A hidden ZeroScript One launch can no longer freeze on an invisible port-conflict yes/no prompt.
- A leftover `StudioMCP.exe` outside ZeroScript's own process tree is reclaimed when it causes the permanent **0 tools** state.
- A proven foreign WebSocket host/port squatter is removed and the exact Studio MCP re-registration step is printed.
- Missing optional MCP commands now show the real command/configuration error instead of looking like a silent restart loop.
- Qwen reads the new stable response ID, removing the roughly 30-second wait that could occur after every tool turn.
- Oversized Qwen tool results are safely shortened below its composer limit while keeping both the beginning and end.
- The AI bootstrap wording is framed as a technical routing note rather than a prohibition, reducing unnecessary model refusals.

Meta AI from upstream 1.4.3 was intentionally not added. ZeroScript One stays ChatGPT-first and avoids adding another provider that would make the interface and routing more complicated.

## 1.35.1 reliability fixes

- ChatGPT bootstrap temporarily unlocks its own composer while injecting the hidden startup prompt, then restores the user-input lock.
- A rejected ChatGPT startup message now returns a real error instead of remaining on **Starting the Roblox agent…** indefinitely.
- The desktop app uses a final visibility guard that re-selects the ZeroScript One workspace after every delayed UI layer settles.
- Legacy notebook tabs are hidden rather than deleted, preventing an empty desktop window.
- A compact functional fallback screen is created automatically if the rich One workspace fails to build.

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

# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through its local MCP bridge. Version 1.25 adds a simple Windows control app so normal use no longer requires separate terminals, manual token copying, or a crowded extension popup.

## Recommended setup

1. Download or clone the repository and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Install the Chrome extension once:
   - open `chrome://extensions`
   - enable Developer mode
   - choose **Load unpacked**
   - select the `zeroscript-extension` folder
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub and then click the ZeroScript extension icon once.
7. Write a task in Hub and press **Çalıştır**.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## What Hub manages

- local MCP bridge startup and restart
- authenticated extension pairing
- Studio and bridge health
- AI provider readiness
- Fast, Balanced, and Best Quality modes
- automatic or manual model routing
- task start, stop, retry, and rollback
- write approval policy
- notifications and context recovery
- provider preparation
- project scan and Release Manager actions

The underlying Smart Router, shared project memory, writer lock, checkpoints, rollback, provider failover, safety scopes, Reviewer, and QA systems remain active.

## Supported browser providers

- DeepSeek
- Gemini
- Qwen
- Kimi
- GLM
- Arena
- ChatGPT
- Claude
- Microsoft Copilot
- Mistral

Optional local provider support is available for LM Studio and Ollama.

## Optional Studio panel

The Roblox Studio DockWidget is no longer required for ordinary use because Hub already shows task and connection status. To install it anyway:

1. Run `install_studio_panel.bat` once.
2. Restart Roblox Studio.
3. Enable **Game Settings → Security → Allow HTTP Requests**.
4. Use the same local Hub service.

## Legacy launchers

`start.bat` and `start_with_panel.bat` remain available for diagnostics and compatibility. The recommended launcher is `ZeroScript Hub.bat`.

## Safety

- All bridge and Hub services bind to localhost.
- Normal Hub endpoints require a random local token.
- One-click extension pairing is available only during a short pairing window opened from Hub.
- AI provider keys are not bundled.
- Risk scoring, write scopes, catastrophic-change blocking, checkpoints, and rollback remain enabled.
- Never commit passwords, tokens, API keys, or private player data.

More details: `docs/ZEROSCRIPT_HUB_1_25.md`

## License and attribution

GPL-3.0-or-later. ZeroScript Hub is based on and adapted from the open-source ZeroScript project; existing copyright notices and attribution must remain intact.

# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through its local MCP bridge. Version 1.26 keeps the multi-model router, checkpoints, rollback, safety, Reviewer, and QA systems while making normal work much faster and simpler.

## Recommended setup

1. Download the repository ZIP and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Install the Chrome extension once:
   - open `chrome://extensions`
   - enable Developer mode
   - choose **Load unpacked**
   - select the `zeroscript-extension` folder
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub. Pairing is automatic.
7. Write a task in Hub, leave the mode on **Akıllı otomatik**, and press **Çalıştır**.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## New in 1.26

- **Akıllı otomatik** chooses Turbo, Fast, Balanced, or Best Quality from the task risk and size.
- **Turbo** uses one relevant specialist for small fixes and requires a real self-test plus Output check.
- Security, DataStore, purchase, destructive, full-project, and release tasks automatically escalate to safer workflows.
- Recent Studio readiness and project scans are reused instead of repeated unnecessarily.
- Checkpoint creation and project preflight run together when a fresh scan is required.
- Existing AI tabs are reused; ZeroScript no longer opens duplicate provider tabs when a usable one already exists.
- Old paused tasks are replaced safely by a new Hub task instead of blocking it silently.
- Hub verifies that the extension actually accepted a task instead of only reporting that it was queued locally.
- Re-pairing repairs stale tokens after replacing the downloaded folder.
- Stale older Hub services on the local port are detected and replaced automatically.
- Quick task buttons prepare Output repair, UI/button repair, and Security/DataStore audits.
- `ZeroScript Güncelle.bat` and the Hub update button download the latest ZIP while preserving local token, Hub settings, and MCP config.

## Modes

- **Akıllı otomatik**: recommended; selects the shortest safe workflow.
- **Turbo**: small targeted fixes; one specialist with mandatory test evidence.
- **Hızlı**: relevant specialist phases plus QA.
- **Dengeli**: normal coordinated analysis, implementation, review, and QA.
- **Maksimum kalite**: release/full-project workflow with the strongest review gates.

## What Hub manages

- local MCP bridge startup and restart
- authenticated extension pairing
- Studio and bridge health
- AI provider readiness and tab reuse
- automatic or manual model routing
- task start confirmation, stop, retry, and rollback
- write approval policy
- notifications and context recovery
- cached project scan and Release Manager actions
- one-click updates

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

## Updating

Use **ZeroScript'i güncelle** in Hub or double-click `ZeroScript Güncelle.bat`. The updater preserves:

- `control_token.txt`
- `hub_settings.json`
- `config.json`

After updating, Chrome opens `chrome://extensions`; press **Reload** on the ZeroScript extension card.

## Optional Studio panel

The Roblox Studio DockWidget is not required for ordinary use because Hub already shows task and connection status. To install it anyway:

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
- Turbo automatically escalates risky tasks instead of weakening safeguards.
- Never commit passwords, tokens, API keys, or private player data.

More details: `docs/ZEROSCRIPT_HUB_1_25.md`

## License and attribution

GPL-3.0-or-later. ZeroScript Hub is based on and adapted from the open-source ZeroScript project; existing copyright notices and attribution must remain intact.

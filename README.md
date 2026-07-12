# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through its local MCP bridge. Version 1.27 keeps the multi-model router, checkpoints, rollback, safety, Reviewer, and QA systems while adding a persistent work queue, project intelligence, live error watching, specialist test tools, and per-game profiles.

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

## New in 1.27

- Persistent priority task queue with pause, resume, removal, dependencies, and automatic next-task execution.
- New Hub tabs for **Görev kuyruğu**, **Araçlar**, **Geçmiş**, and **Oyun profilleri**.
- Live progress percentage, elapsed time, and estimated remaining time.
- Project index for scripts, remotes, ScreenGuis, and world-size counts.
- Background Studio Output watcher with optional automatic repair-task creation.
- Faster stuck-provider failover instead of waiting close to an hour.
- Scoped Turbo checkpoints and rollback for only the relevant script services.
- Compact Fast/Turbo context to reduce repeated prompt size and model delay.
- One-click UI/button audit, Remote security audit, DataStore lab, economy simulation, Toolbox/backdoor scan, multiplayer readiness, test-flow recording, and release checks.
- Local debug bundle export.
- Separate saved settings profiles for each Roblox game.
- Long Hub task goals are now accepted correctly instead of failing the old 500-character status check.

## Modes

- **Akıllı otomatik**: recommended; selects the shortest safe workflow.
- **Turbo**: small targeted fixes; one specialist with mandatory test evidence.
- **Hızlı**: relevant specialist phases plus QA.
- **Dengeli**: normal coordinated analysis, implementation, review, and QA.
- **Maksimum kalite**: release/full-project workflow with the strongest review gates.

Security, DataStore, purchase, destructive, full-project, and release tasks automatically escalate out of Turbo.

## Hub workflow

### Task queue

Add several jobs before leaving the computer. Priority jobs run first, the queue can be paused, and the next runnable task starts after the current one reaches a terminal state.

### Tools

The Tools tab exposes specialist workflows and the Output watcher. Output auto-fix remains off by default; enabling it lets newly detected errors create a high-priority repair task.

### History

The History tab shows task state, selected mode, approximate duration, live progress, and remaining-time estimate.

### Game profiles

Save model routing, quality mode, safety, notification, and context settings under each game name so unrelated projects do not reuse the wrong workflow preferences.

## What Hub manages

- local MCP bridge startup and restart
- authenticated extension pairing
- Studio and bridge health
- AI provider readiness and existing-tab reuse
- automatic or manual model routing
- direct tasks and persistent queued tasks
- task progress, history, stop, retry, and rollback
- project indexing and cached scans
- Output error monitoring
- scoped and full checkpoints
- specialist test and audit workflows
- write approval policy
- notifications and context recovery
- one-click updates and local debug bundles

The underlying Smart Router, shared project memory, writer lock, provider failover, safety scopes, Reviewer, and QA systems remain active.

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
- `hub_profiles.json`
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
- Scoped rollback never removes scripts outside its recorded service scope.
- Output auto-fix is opt-in.
- Never commit passwords, tokens, API keys, or private player data.

Release details: `RELEASE_NOTES_1.27.md`

## License and attribution

GPL-3.0-or-later. ZeroScript Hub is based on and adapted from the open-source ZeroScript project; existing copyright notices and attribution must remain intact.

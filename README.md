# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through one local MCP bridge. Version **1.28.0** keeps the Smart Router, shared memory, checkpoints, rollback, safety, Reviewer and QA systems while hiding setup and daily controls behind one Windows Hub.

## Recommended setup

1. Download the repository ZIP and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `zeroscript-extension`.
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub.
7. Leave the mode on **Akıllı otomatik**, write a task, and press **Çalıştır**.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## Main 1.28 features

- **Sorunu bul ve düzelt:** repairs the local connection where possible, checks providers, project audit, project index and Studio Output, then queues only verified repair categories.
- **Automatic task decomposition:** turns a broad goal into dependent inspection, implementation, map/UI and regression tasks.
- **Hard time limits and failover:** configurable phase timeout, provider switching, compact context recovery and final stop after repeated timeouts.
- **Emergency stop:** stops provider loops, cancels pending tool waits, releases the Studio writer lock and pauses the queue.
- **Instance-level rollback:** checkpoints relevant UI, map, Lighting, shared/server and StarterPlayer scopes in addition to scripts. Oversized scopes are skipped rather than backed up incompletely.
- **Visual UI comparison:** before/after desktop and mobile screenshot workflow.
- **Interaction testing:** full TextButton, ImageButton, ProximityPrompt and ClickDetector audit workflow.
- **Remote security testing:** safe wrong-type, negative/oversized value, invalid-ID, spam, ownership and duplicate-grant tests.
- **Smart error grouping:** repeated Output errors are grouped by normalized signature and occurrence count.
- **Model scorecards:** actual success rate, average time, repair requests and tool/context errors.
- **Automatic game profiles:** detects the open PlaceId/game and can load its saved Hub profile.
- **Notification center:** task, timeout, Output, diagnosis and project-change events.
- **Toolbox quarantine:** external assets are isolated and scanned before live use during coordinated tasks.

## Productivity features retained

- Persistent task queue with priority, dependencies, pause/resume and automatic next-task execution.
- Saved task templates, command history and change preview.
- Live progress percentage, elapsed time and estimated remaining time.
- Deterministic project index and background Output watcher.
- Smart Automatic, Turbo, Fast, Balanced and Best Quality modes.
- DataStore lab, economy simulator, marketplace/backdoor scan, multiplayer readiness, repeatable test recording and Release Manager workflows.

## Hub screens

- **Ana ekran:** start, stop, rollback, quick tasks and connection status.
- **Görev kuyruğu:** multiple jobs, priorities and dependencies.
- **Araçlar:** UI, security, DataStore, economy, asset, multiplayer and release workflows.
- **Geçmiş:** progress and completed jobs.
- **Oyun profilleri:** separate routing and safety settings for each game.
- **Görev şablonları:** reusable favorite commands.
- **Otomasyon:** one-click diagnosis, decomposition, emergency stop, timeout settings, model metrics, grouped errors, notifications and project profile controls.

## Updating

Use **ZeroScript'i güncelle** in Hub or double-click `ZeroScript Güncelle.bat`. The updater preserves:

- `control_token.txt`
- `hub_settings.json`
- `hub_profiles.json`
- `hub_task_templates.json`
- `config.json`

After updating, Chrome opens `chrome://extensions`; press **Reload** on the ZeroScript card.

## Supported browser providers

DeepSeek, Gemini, Qwen, Kimi, GLM, Arena, ChatGPT, Claude, Microsoft Copilot and Mistral are supported. LM Studio and Ollama can be used as optional local providers.

## Safety

- Bridge and Hub services bind to localhost.
- Normal Hub endpoints require a random local token.
- Pairing is available only during a short window opened from Hub.
- Risk scoring, write scopes, writer locking, catastrophic-change blocking, server-authoritative guidance, checkpoints and QA evidence gates remain enabled.
- High-risk, release, DataStore, purchase, economy and destructive tasks automatically leave Turbo.
- Output auto-fix is opt-in.
- Remote/DataStore tests must avoid production player data.

## Validation limits

The repository includes JavaScript syntax checks, Python compile checks, control API tests, startup/speed/productivity tests and automation-pack tests. Real Chrome provider pages, Roblox Studio screenshots, multi-client sessions, Toolbox assets and production DataStores still require live testing on the user's Windows machine.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.
# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through one local MCP bridge. Version **1.29.0** adds persistent verified learning, a Lemonade-style Recipe Studio and a modernized Windows Hub while keeping the Smart Router, checkpoints, rollback, safety, Reviewer and QA systems.

## Recommended setup

1. Download the repository ZIP and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `zeroscript-extension`.
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub.
7. Leave the mode on **Akıllı otomatik**, write a task, and press **Çalıştır**.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## Memory Vault and verified learning

ZeroScript now stores reusable knowledge in `zeroscript_memory.db` using SQLite.

- **Global memory:** reusable Roblox security, UI, DataStore, economy and testing knowledge.
- **Project memory:** paths, lessons, failures and regressions for one detected PlaceId/game.
- **Task context:** only the information relevant to the current instruction.
- **Verified lessons:** successful approaches are strengthened only after a completed task, sufficient evidence and clean recorded Output.
- **Failure memory:** unresolved Output, remaining blockers and failed approaches return as **KNOWN FAILURES — DO NOT REPEAT**.
- **Provider learning:** model performance is tracked by project and task category.
- **Freshness:** older lessons gradually receive less retrieval weight and actual Studio inspection remains mandatory.

This does not retrain browser models or allow them to rewrite ZeroScript. Learning is limited to recipe selection, context selection, provider recommendation, regression tests and avoidance memory.

## Recipe Studio

The Hub includes a Lemonade-style **Recipe Studio** with built-in workflows for:

- responsive UI and mobile safety
- RNG, pity, luck and inventory/equip flows
- secure shops, gamepasses, Developer Products and receipts
- DataStore reliability and migrations
- RemoteEvent/RemoteFunction security
- economy simulation and progression
- map polish, lighting and VFX
- onboarding and tutorial flows
- Output root-cause repair and performance
- release readiness

Recipes contain inspection steps, implementation guidance, mandatory tests, known mistakes, preferred models, risk level and global/project scope. Recipes can be searched, cloned, customized, imported/exported, pinned to a task or added directly to the queue.

Repeated high-confidence patterns become pending Recipe suggestions. They are not activated until accepted in Recipe Studio.

## Main automation features

- **Sorunu bul ve düzelt:** repairs the local connection where possible, checks providers, project audit, project index and Studio Output, then queues only verified repair categories.
- **Automatic task decomposition:** turns a broad goal into dependent inspection, implementation, map/UI and regression tasks.
- **Hard time limits and failover:** configurable phase timeout, provider switching, compact context recovery and final stop after repeated timeouts.
- **Emergency stop:** stops provider loops, cancels pending tool waits, releases the Studio writer lock and pauses the queue.
- **Instance-level rollback:** checkpoints relevant UI, map, Lighting, shared/server and StarterPlayer scopes in addition to scripts.
- **Visual UI comparison:** before/after desktop and mobile screenshot workflow.
- **Interaction testing:** TextButton, ImageButton, ProximityPrompt and ClickDetector audit workflow.
- **Remote security testing:** safe wrong-type, negative/oversized value, invalid-ID, spam, ownership and duplicate-grant tests.
- **Smart error grouping:** repeated Output errors are grouped by normalized signature and occurrence count.
- **Automatic game profiles:** detects the open PlaceId/game and can load its saved Hub profile.
- **Toolbox quarantine:** external assets are isolated and scanned before live use during coordinated tasks.

## Productivity features

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
- **Otomasyon:** diagnosis, decomposition, emergency stop, timeouts, model metrics, grouped errors and notifications.
- **Recipe Studio:** persistent memory, learned lessons, known failures, custom Recipes and suggestions.

The Hub uses a dependency-free modern dark theme with improved typography, cards, tables, inputs, progress indicators and clearer status hierarchy.

## Updating

Use **ZeroScript'i güncelle** in Hub or double-click `ZeroScript Güncelle.bat`. The updater preserves:

- `control_token.txt`
- `hub_settings.json`
- `hub_profiles.json`
- `hub_task_templates.json`
- `zeroscript_memory.db` and active SQLite WAL/SHM files
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
- Memory is guidance, never proof; models must inspect the actual Studio state.

## Validation limits

The repository includes JavaScript syntax checks, Python compile checks, control API tests, SQLite Memory Vault tests, startup/speed/productivity/automation tests and a learning-snapshot test. Real Chrome provider pages, Roblox Studio visuals, long-term learning quality, multi-client sessions, Toolbox assets and production DataStores still require live testing on the user's Windows machine.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

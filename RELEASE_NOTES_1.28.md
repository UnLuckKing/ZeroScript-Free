# ZeroScript 1.28 — Automation, rollback and testing pack

## Added

- One-click **Sorunu bul ve düzelt** health, provider, project, index and Output inspection. It queues only verified repair categories instead of blindly rewriting the game.
- Automatic broad-task decomposition into dependent inspection, implementation, map/UI and regression tasks.
- Per-phase time limit with configurable provider failover count, compact context recovery and final stop after repeated timeouts.
- Emergency stop that halts provider loops, releases the Studio writer lock, cancels pending tool waits and pauses the task queue.
- Instance-level checkpoint backup and restore for relevant UI, map, lighting, shared, server and StarterPlayer scopes, with a size guard for oversized services.
- Visual UI before/after workflow with desktop/mobile capture requirements.
- Full button and interaction audit workflow for TextButton, ImageButton, ProximityPrompt and ClickDetector paths.
- Safe RemoteEvent/RemoteFunction fuzz workflow for wrong types, negative/oversized values, invalid IDs, spam, ownership and duplicate-grant tests.
- Smart Output grouping that collapses repeated line-number variants and displays occurrence counts.
- Provider performance scorecard using actual attempts, success rate, average duration, repair requests and tool/context errors.
- Automatic open-place identity detection and per-game profile loading.
- Notification center for task completion, errors, timeouts, project changes and diagnostics.
- Toolbox/Creator Store quarantine instructions for team tasks: isolate, scan scripts/remotes/physics, then move only verified-clean content.
- New Hub **Otomasyon** screen with one-click tools, timeout settings, error groups, provider metrics, diagnosis results, project profile controls and emergency stop.

## Existing conveniences retained

- Persistent priority/dependency task queue and saved task templates.
- Command/task history and change preview.
- Smart Automatic, Turbo, Fast, Balanced and Best Quality routing.
- Project index, Output watcher, scoped Turbo checkpoints, compact prompts and faster provider recovery.
- DataStore lab, economy simulator, marketplace scan, multiplayer readiness, test recording and Release Manager workflows.

## Safety

- High-risk, release, DataStore, purchase, economy and destructive work still escalates out of Turbo.
- One-click diagnosis creates repair tasks only from verified connection, audit or Output evidence.
- Output auto-fix remains opt-in.
- Instance restore is limited to checkpointed scopes and skips oversized services rather than taking an unsafe incomplete clone.
- Remote security tests explicitly avoid production data and require handler inspection before test calls.
- Existing writer locks, permissions, risk scoring, catastrophic-change blocking, server-authoritative guidance and QA evidence gates remain enabled.

## Validation limits

The repository includes JavaScript syntax checks, Python compile checks, control API tests, startup/speed/productivity tests and automation-pack tests. Real Chrome provider pages, Roblox Studio screenshots, multi-client Studio sessions, Toolbox assets and production DataStores still require live testing on the user's Windows machine.
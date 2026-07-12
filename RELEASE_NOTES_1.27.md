# ZeroScript 1.27 — Productivity and automation pack

## Added

- Persistent task queue with priority, pause/resume, removal, dependencies, and automatic next-task execution.
- New Hub tabs for task queue, specialist tools, progress/history, per-game profiles, and saved task templates.
- Reusable task templates that can be copied to the main task box or added directly to the queue.
- Dependent queue tasks for workflows such as backend → UI → QA.
- Live task progress percentage, elapsed time, and estimated remaining time.
- Deterministic project index for scripts, remotes, ScreenGuis, and world size counts.
- Background Studio Output watcher with optional automatic repair-task creation.
- Faster stuck-provider recovery at five minutes when the provider disappears and ten minutes as a hard phase cap.
- Scoped Turbo checkpoints that back up only the relevant script services and restore only those scopes.
- Compact Fast/Turbo prompts that reduce repeated context while keeping mandatory playtest and Output evidence.
- One-click workflows for UI/button audit, Remote security audit, DataStore lab, economy simulation, Toolbox/backdoor scan, multiplayer readiness, repeatable test recording, and release readiness.
- Change preview for created, changed, and deleted script paths plus remembered regression checks.
- Local debug bundle export from Hub.
- Game profiles that preserve separate routing, quality, safety, notification, and model preferences.

## Fixed

- Long task goals could fail Hub acceptance verification because the browser status payload truncated them to 500 characters.
- Updates now preserve `hub_profiles.json` and `hub_task_templates.json` in addition to token, settings, and MCP config.
- A stale provider can no longer hold a phase for an hour before another ready model gets a chance.
- Repeated full project scans and full checkpoints are avoided for small targeted work.
- Pure queue tasks no longer require manually waiting and starting every next instruction.
- Temporarily unavailable Studio connections no longer permanently discard the next queued task.
- Background Output polling pauses while a model owns the Studio writer lease, avoiding unnecessary MCP contention.
- Large project indexes are compacted before Hub synchronization to keep status refreshes responsive.

## Safety

- High-risk work still escalates out of Turbo through the existing smart mode rules.
- Scoped rollback never deletes scripts outside the checkpointed service scope.
- Output auto-fix is opt-in; the default watcher records errors without starting tasks automatically.
- Existing provider permissions, risk scoring, catastrophic-change blocking, server-authoritative guidance, full checkpoints for normal/high-risk work, and QA evidence gates remain active.

## Validation limits

The release includes JavaScript syntax checks, Python compile checks, control API tests, speed-mode tests, startup policy tests, and productivity-pack tests. Real Chrome, Roblox Studio, provider pages, multi-client Studio sessions, and production DataStores still require live testing on the user's machine.

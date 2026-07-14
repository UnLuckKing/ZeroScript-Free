# ZeroScript One 1.33

## What changed

- New one-screen desktop workspace with one prompt, one primary action and live activity.
- New browser workspace inside ChatGPT, Gemini, Qwen and other supported AI sites.
- New Studio dock panel with automatic pairing, direct task entry and Explorer selection context.
- New Studio command palette using the same one-pass workflow.
- One-click `ZeroScript One.bat` launcher starts one bridge instance and the desktop workspace.
- New workbench orchestration replaces old work, auto-starts one open AI tab and runs one complete implementation pass.
- Separate reviewer stages are disabled for workbench tasks; the builder implements, playtests and checks Output in the same pass.
- Real activity states are surfaced: old work cleared, AI prepared, task sent, Studio editing, playtest and completion.

## Speed policy

ZeroScript One no longer creates a long Analyst → Builder → UI → Reviewer → QA chain for normal use. A workbench request uses one provider and one builder phase. The same provider must make the Studio changes, test the changed path and read Output before finishing.

## Safety

- New requests still cancel stale work and clear the old queue.
- The bridge is started only when port 17613 is free.
- Hub and Studio pairing remains time-limited and localhost-only.
- Rollback, server-authoritative guidance and catastrophic-change protection remain available.

## Validation limits

Repository checks cover Python syntax, control API behavior, JavaScript syntax and deterministic workbench policy. Live ChatGPT/Gemini DOM behavior, Roblox Studio plugin rendering and complete end-to-end game builds still require Windows testing.

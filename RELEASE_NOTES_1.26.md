# ZeroScript 1.26 — Faster daily workflow

## Added

- Smart Automatic mode that selects Turbo, Fast, Balanced, or Best Quality from task size and risk.
- Turbo mode for small targeted fixes with a mandatory playtest, Output check, and explicit evidence in the final report.
- Five-minute project preflight cache and short Studio readiness cache.
- Low-risk Turbo fixes skip the whole-project scan while retaining their safety checkpoint and all write guards.
- Concurrent checkpoint and preflight preparation when a fresh scan is required.
- Existing provider-tab reuse and duplicate provider-launch prevention.
- Hub quick tasks for Output repair, UI/button repair, and Security/DataStore audits.
- One-click ZIP updater that preserves `control_token.txt`, `hub_settings.json`, and `config.json`.
- Hub-side task acceptance verification.

## Fixed

- Starting a new Hub task could be ignored silently while an old paused task remained in storage.
- An old token prevented automatic re-pairing after replacing the downloaded ZeroScript folder.
- Older Hub and bridge processes could remain active after replacing files.
- Short but broad requests such as “oyunu komple tamamla” could be misclassified as tiny tasks.
- Pure UI or map tasks unnecessarily ran an unrelated builder phase.
- Fast/Turbo safety escalation could inherit an already-shortened phase plan and omit Analyst/Reviewer.
- Provider preparation opened unnecessary duplicate tabs instead of reusing a ready session.
- A non-empty provider chat with no usable Start button could be reused and leave the task waiting; ZeroScript now opens a clean conversation instead.
- Project scan results could be reused after builder/map/UI changes; mutating phases now mark the cached scan stale.
- Hub could say a task was queued even when only the local control API accepted it; Hub now confirms that the extension created the task.
- Long goals could fail Hub acceptance verification because the status channel intentionally truncates displayed goals.

## Safety

Turbo is automatically upgraded to Balanced or Best Quality for release, full-project, broad build, security, DataStore, purchase, economy, destructive, cross-domain, and other high-risk tasks. Checkpoints, rollback, server-authoritative guidance, provider permissions, risk scoring, and catastrophic-change blocking remain active.

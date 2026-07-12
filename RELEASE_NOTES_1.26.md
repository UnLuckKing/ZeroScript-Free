# ZeroScript 1.26 — Faster daily workflow

## Added

- Smart Automatic mode that selects Turbo, Fast, Balanced, or Best Quality from task size and risk.
- Turbo mode for small targeted fixes with a mandatory playtest, Output check, and explicit evidence in the final report.
- Five-minute project preflight cache and short Studio readiness cache.
- Concurrent checkpoint and preflight preparation when a fresh scan is required.
- Existing provider-tab reuse and duplicate provider-launch prevention.
- Hub quick tasks for Output repair, UI/button repair, and Security/DataStore audits.
- One-click ZIP updater that preserves `control_token.txt`, `hub_settings.json`, and `config.json`.
- Hub-side task acceptance verification.

## Fixed

- Starting a new Hub task could be ignored silently while an old paused task remained in storage.
- An old token prevented automatic re-pairing after replacing the downloaded ZeroScript folder.
- An older control API process could remain on port 17614 after an update.
- Short but broad requests such as “oyunu komple tamamla” could be misclassified as tiny tasks.
- Provider preparation opened unnecessary duplicate tabs instead of reusing a ready session.

## Safety

Turbo is automatically upgraded to Balanced or Best Quality for release, full-project, security, DataStore, purchase, economy, destructive, and other high-risk tasks. Checkpoints, rollback, server-authoritative guidance, provider permissions, risk scoring, and catastrophic-change blocking remain active.

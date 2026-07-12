# ZeroScript 1.29 — Memory Vault, Recipe Studio and modern Hub

## Added

- Persistent SQLite **Memory Vault** stored in `zeroscript_memory.db`.
- Three memory scopes: global reusable knowledge, per-project knowledge and current-task context.
- Built-in Roblox Recipe library for responsive UI, RNG, inventory, purchases, DataStores, Remote security, economy, map polish, VFX, onboarding, Output repair, performance and release readiness.
- Game-genre starter Recipes for Simulator, Tycoon, Obby, Clicker/Incremental and Pet systems.
- Recipe matching based on task category, keywords, project scope, previous score, usage and pinned status.
- Compact context builder that sends only the relevant recipes, verified lessons, known failures, required tests and recommended provider.
- Verified lesson extraction after terminal tasks. Successful lessons require a completed task, genuine verified/regression evidence and clean recorded Output.
- Failure memory that records unresolved Output, remaining blockers and failed approaches under **KNOWN FAILURES — DO NOT REPEAT**.
- Recipe scoring that increases after verified success and decreases after evidence-backed failure.
- Manual **Son görev başarılı / Son görev sorunlu** feedback controls for correcting the learned score.
- Learned project patterns and pending Recipe suggestions after a similar high-confidence workflow succeeds repeatedly.
- Recipe Studio with search, category filters, custom editor, global/project scope, preferred models, risk, inspection list, tests, avoidance rules, import/export and direct task/queue use.
- Provider performance persistence by project and task category.
- Extension learning snapshot containing compact reports, changed paths, verified evidence, regressions, Output errors, provider stats and active project identity.
- Modern dependency-free Hub theme with larger responsive window, polished dark surfaces, improved typography, modern cards, tables, inputs, buttons, progress bars and a clear learning status footer.

## Safety and quality rules

- ZeroScript does not retrain browser models or let them rewrite its own safety core.
- Learning affects recipe selection, context selection, provider recommendation, regression tests and avoidance memory only.
- Stored memory is guidance, never proof; every task still instructs the model to inspect the actual Studio state.
- A task is not promoted as a successful lesson when it fails, is cancelled, lacks verified/regression evidence or retains Output errors.
- Empty cancellations, provider-not-ready failures and connection failures before work begins remain task history but do not create lessons or lower Recipe scores.
- Built-in Recipes cannot be deleted; users can clone and customize them.
- Learned Recipe suggestions remain pending until the user accepts them.
- Memory is isolated by Roblox project identity and old lessons lose retrieval strength as they age.
- Existing writer locks, permissions, catastrophic-change blocking, checkpoints, rollback, server-authoritative guidance and QA evidence gates remain enabled.

## Updating

`ZeroScript Güncelle.bat` now preserves:

- `zeroscript_memory.db`
- SQLite WAL/SHM files when present
- token and Hub settings
- game profiles and task templates
- MCP config

## Validation limits

The repository includes Python compile checks, SQLite Memory Vault and learning-safeguard tests, control API tests, JavaScript syntax checks and a learning-snapshot test. Real Chrome provider pages, Roblox Studio visual behavior, long-term learning quality and production DataStores still require live use on the user's Windows machine.

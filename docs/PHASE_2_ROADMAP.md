# Phase 2: Deterministic Studio-Side Automation

ZeroScript 1.24 now ships the first native Studio integration: an authenticated localhost side-channel and a DockWidget for live task state, safety data, Stop, Retry, Cancel, checkpoint Rollback, provider probing, project scanning, and Release Manager actions.

The remaining items below are intentionally tracked separately. A prompt template is not considered implementation; each item must have real Studio behavior and repeatable evidence.

## Native Studio integration — remaining hardening

- Read-only mode when the side-channel cannot prove it is connected to the expected local bridge and extension instance.
- Approval cards inside Studio for individual pending write operations.
- Studio-side display of the full report, task ledger, ownership conflicts, and changed-instance diff.
- Automatic plugin updater with signed/checksummed local releases.

## Full checkpoint and rollback

- Serialize script source, class, parent path, Disabled state, Attributes, tags, selected UI properties, Lighting properties, remotes, and supported Workspace instances.
- Restore one script, one UI tree, one specialist domain, or the entire task.
- Show a property-level preview before rollback.

## Interaction recorder

- Record supported user actions during a Studio play session.
- Convert actions into stable semantic steps instead of raw coordinates where possible.
- Store assertions for visible UI, currency/state changes, character state, and Output.
- Replay recorded tests after later model changes.

## Multi-client test manager

- Start supported multi-client Studio sessions.
- Identify each client and assign scenario roles.
- Verify isolation, replication, trade/global systems, disconnect behavior, and RemoteEvent abuse resistance.
- Skip with an explicit capability error when the active Studio tool catalogue cannot control multiple clients.

## Visual QA matrix

- Capture before/after images for desktop, laptop, tablet, and phone targets.
- Detect overflow, clipping, overlap, unreadable text, missing controls, low contrast, and safe-area violations.
- Keep visual baselines per project/checkpoint.

## DataStore laboratory

- Isolated test keys and profiles.
- Save, load, rejoin, session-lock, failure, retry, throttling, corrupt-data, and migration scenarios.
- Never run destructive tests against production player keys.

## Security graph

- Enumerate every RemoteEvent and RemoteFunction.
- Map client callers, server handlers, validation, rate limiting, ownership checks, and trusted values.
- Generate deterministic exploit test cases and verify server-authoritative outcomes.

## Project engineering

- Rojo/Git-backed script version control and conflict-aware merges.
- Multi-place support and per-place release gates.
- Architecture map linking systems, remotes, data, UI, and world objects.
- Performance budgets for parts, scripts, remotes, memory, physics, and frame time.
- Marketplace asset inspection for unexpected scripts/remotes and unsafe dependencies.
- Economy simulation, onboarding-path tests, retention-event instrumentation, and release evidence export.

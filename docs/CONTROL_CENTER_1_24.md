# ZeroScript 1.24 Control Center

ZeroScript 1.24 hardens the multi-model workflow around the existing Studio bridge. It does not replace the proven tool loop; it adds observable state, readiness diagnostics, permissions, ownership, recovery, a native Studio panel, and support tooling around it.

## Runtime states

The Control Center maps the task lifecycle to explicit states:

- `idle`
- `queued`
- `waiting_provider`
- `assigning`
- `running`
- `reviewing`
- `testing`
- `completed`
- `failed`
- `cancelled`

Every state change is written to the persistent task ledger. A final report moves the state to `completed`; a provider error or failed evidence gate remains visible instead of silently looking active.

## Provider readiness

**Test providers** asks every supported provider tab for:

- composer detected
- ZeroScript session active
- send adapter available
- reply reader available
- chat empty/non-empty
- page visible/hidden
- extension version

A tab is only marked ready when the composer exists and its in-page ZeroScript session is active.

**Open + Start** opens the selected provider, waits up to 45 seconds for its composer, and requests the in-page Start button. Login, CAPTCHA, consent, or a provider UI redesign can still require manual action.

## Quality modes

- **Fast**: skips unnecessary analyst/reviewer phases and keeps QA.
- **Balanced**: uses the normal dynamic manager plan.
- **Best Quality**: guarantees analyst, independent reviewer, and QA phases and allows an extra repair round.

## Provider permissions

Each provider can be limited to:

- Inspect only
- Scripts only
- UI only
- Map only
- Full access

Read and test tools remain available. Writes outside the selected scope are blocked before they reach the bridge.

## Risk scoring

Every write request receives a deterministic 0–100 risk score. The score increases for:

- destructive operations
- core Roblox containers
- DataStore or monetization code
- remotes and client/server boundaries
- large `multi_edit` batches
- bulk descendant mutations
- external/generated asset insertion

Critical autonomous writes are blocked. Review mode can be enabled for explicit approval of write operations.

## Ownership and conflicts

Active specialists claim high-level Studio domains:

- UI: `StarterGui`, `StarterPlayer.StarterPlayerScripts`
- Map: `Workspace`, `Lighting`, `Terrain`, `SoundService`
- Builder: `ServerScriptService`, `ReplicatedStorage`, `ServerStorage`, `StarterPlayer`

Claims are renewed while the phase is running, expire after genuine staleness, and are released when the task ends. Conflicting claims are recorded in the Control Center.

## Native Roblox Studio panel

ZeroScript 1.24 includes an optional DockWidget backed by an authenticated local side-channel.

1. Run `install_studio_panel.bat` once and restart Roblox Studio.
2. Enable **Game Settings → Security → Allow HTTP Requests**.
3. Run `start_with_panel.bat` instead of `start.bat`.
4. Copy the value from `control_token.txt` into the Chrome popup and the Studio widget.
5. Open **Plugins → ZeroScript → Control Center**.

The side-channel binds only to `127.0.0.1:17614` and requires the random token for every status or action endpoint.

The Studio panel displays:

- task state, phase, provider, repair round, and error
- bridge/Studio/tool health
- latest risk score
- release-readiness score
- pending approval count

It can request Stop, Retry, Cancel, checkpoint Rollback, provider probing, project scanning, and Release Manager. Retry, Cancel, and Rollback execute directly inside the service worker, so the Chrome popup does not need to remain open.

## Recovery and support

- Context-limit errors can open a fresh provider conversation while preserving the manager's checkpoint summary.
- Task completion/failure can trigger a Chrome notification.
- Manual regression tests can be added to persistent manager memory.
- The debug bundle downloads extension version, bridge status, team state, provider health, task history, manager memory, safety/risk events, and recent diagnostics as JSON.
- Update checking compares the installed manifest version with the repository's current `master` manifest. Unpacked extensions still require `git pull` and Chrome Reload.

## Deliberate limits

These features require more Roblox-side capabilities and are not falsely presented as complete in 1.24:

- recording arbitrary mouse/keyboard gameplay into deterministic semantic Studio test scripts
- controlling multiple simultaneous Studio test clients when the active Studio MCP does not expose multi-client controls
- property-level rollback of every non-script Instance without a larger serialized place snapshot
- pixel-difference visual QA across several emulated device resolutions

The existing manager can assign specialist tasks for these areas, but genuine deterministic automation depends on corresponding Studio tools or further plugin development tracked in `PHASE_2_ROADMAP.md`.

# Changelog

## 1.31.0

- Added beginner-first **Kolay Mod**, shown by default with technical tabs hidden until requested.
- Added a one-click dependent game blueprint builder for RNG, Simulator, Clicker, Tycoon, Obby, Pet Collection and Custom games.
- Added Fast Prototype, Publishable Game and Premium Quality plans with device-priority options.
- Added smart next-step guidance for services, extension pairing, Studio MCP, model readiness, Output errors and game-plan start.
- Added one-click repair, UI polish, gameplay improvement and release preparation actions.
- Added a focused readiness score, active-task progress and plain-language status dashboard.
- Optimized the modern dark theme, spacing, controls and advanced-tab density.

## 1.30.0

- Added deterministic Intent Compiler, Project Genome, Shadow Guard and Proof Engine.
- Added persistent Design DNA and project Behavioral Contracts.
- Added Studio Command Palette with selected-instance context.
- Added Model Jury coordination, Self-Healing modes and local Analytics recommendations.
- Added the modern Superior Engine control screen.

## 1.29.0

- Added SQLite Memory Vault and verified project/global learning.
- Added Lemonade-style Recipe Studio, learned lessons, failure memory and Recipe suggestions.
- Added modern dependency-free Windows Hub styling.

## 1.28.0

- Added automation workflows, visual comparison, interaction/security tests, instance rollback and emergency stop.

## 1.27.0

- Added persistent task queue, project index, Output watcher, scoped checkpoints and fast provider recovery.

## 1.26.0

- Added Smart Automatic and Turbo modes, project-scan caching and one-click updater.

## 1.19.8

- Added Auto-fix Queue in the popup.
- Auto-fix Plan runs Connection Doctor and project scan, then builds a prioritized queue from connection blockers and project warnings.
- Start Next launches the next runnable fix task and tracks queue status as pending, running, done, failed, or manual.
- Queue prioritizes connection blockers, security/DataStore risks, runtime/code health, UI safety, map performance, map polish, premium UI, onboarding, monetization, and release QA.

## 1.19.7

- Added Map/UI Build Mode templates for popular-game map polish, premium simulator UI, full presentation pass, onboarding, and monetization polish.
- Strengthened the map specialist prompt with compact popular Roblox lobby requirements: spawn view, central action, readable zones, signage, lighting, VFX, traversal, and performance.
- Strengthened the UI specialist prompt with premium simulator/RNG layout requirements: currency bar, bottom action bar, left menu, result card, feed, panels, feedback states, and mobile-safe sizing.
- Improved automatic phase selection for presentation, onboarding, shop, gamepass, upgrade, index, and monetization tasks.

## 1.19.6

- Added a DeepSeek send mode setting: Fast, Safe, and Ultra Safe.
- DeepSeek injection timing now adapts value-wait, send-button wait, and final send delay based on the selected mode.
- Safe remains the default; Ultra Safe is available for sessions where DeepSeek drops fast injected turns.

## 1.19.5

- Added optional Auto-start when ready.
- When enabled, ZeroScript automatically starts on a new empty supported AI chat after bridge and Roblox Studio are ready.
- Auto-start is guarded against existing conversations, hidden tabs, unsupported provider modes, and repeated retries in the same chat.
- Added a popup toggle for Auto-start when ready.

## 1.19.4

- Added a one-click Connection Doctor in the popup.
- Doctor checks the bridge socket, Roblox MCP server, Roblox tools, Studio process, Studio MCP registration, open-place readiness, and model tab readiness.
- Doctor can attempt one targeted Roblox MCP repair before reporting the exact blocker.
- Fixed Restart Roblox server routing so targeted web reconnects preserve the requested server id.

## 1.19.3

- Added safer DeepSeek direct-send timing so ZeroScript waits for the composer value and send button before submitting tool feedback.
- Added a small randomized DeepSeek send delay to reduce dropped or too-fast injected turns.
- Moved handoff controls behind a fallback section so the normal flow stays direct: Start connects ZeroScript to the current model tab.

## 1.19.2

- Fixed Start task handling when Roblox Studio is not actually connected.
- Start now checks bridge, Roblox MCP tools, Studio attachment, and open-place readiness before dispatching agents.
- If StudioMCP is stale, Start automatically restarts the Roblox MCP server once and rechecks readiness.
- The popup now shows clear blocked-start messages instead of appearing unresponsive.
- The in-page ZeroScript bar now keeps Start clickable when Studio is stuck disconnected, attempts a Roblox MCP restart, and shows a clear recovery banner if the reconnect still fails.

## 1.19.1

- Fixed team start appearing unresponsive while checkpoint and preflight tools
  were still running.
- Task start now acknowledges immediately and prepares the audit safely in the
  background, keeping the Manifest V3 service worker responsive.
- Reduced the deterministic preflight timeout and made scan failure non-blocking:
  the coordinated task continues with an explicit warning.
- Removed duplicated Retry state updates introduced during earlier merges.

## 1.19.0

- Added a strict QA evidence gate for coordinated team tasks.
- QA reports must identify the tested path and explicitly report Output errors.
- ZeroScript independently queries Studio Output after QA finishes when the
  console tool is available.
- Missing evidence or detected runtime errors automatically requeue QA up to
  two times instead of accepting an unsupported completion claim.
- Verified evidence and captured Output are persisted with task history and
  summarized in the extension popup.

## 1.18.0

- Added a one-click **Scan current project** action in the extension popup.
- Project scans now work independently from team tasks and persist locally.
- The popup summarizes script, remote, GUI, and warning counts and shows the
  first actionable findings without requiring an AI model.
- New team tasks reuse the persisted scan evidence in the Analyst phase.

## 1.17.0

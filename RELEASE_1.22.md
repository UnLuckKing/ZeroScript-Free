# ZeroScript 1.22 — AI Team Manager

## Added

- Dynamic task plans: inspection-only, small UI, small code, full project, release, and mixed map/UI tasks no longer use one fixed phase chain.
- Structured project memory shared across models: verified behavior, changed paths, remaining work, Output errors, recent reports, and regression tests.
- Learned provider routing: model selection now adapts to completion rate, tool/context failures, repair requests, phase history, availability, and task type.
- Stuck-task recovery: preserves the checkpoint, releases the Studio lock, summarizes context, cools down the stuck provider, and continues with another ready model.
- Context-limit recovery summaries for new model tabs/conversations.
- Deterministic post-task script diff against the pre-task checkpoint, including changed, created, and deleted scripts.
- Large-diff risk detection and rollback recommendation.
- Catastrophic bulk-change guard that blocks mass deletion of core Roblox containers and oversized destructive edits before they reach the bridge.
- Persistent regression test memory extracted from accepted QA evidence.
- Release-readiness score and blocker list.
- AI Team Manager popup dashboard with plan, structured memory, model performance, timeline, script diff, safety blocks, and release score.
- One-click Release Manager and Regression QA tasks.
- Experimental browser providers from 1.21 remain available: ChatGPT, Claude, Microsoft Copilot, and Mistral.

## Important limitations

- Experimental browser providers depend on each website's current DOM and must be live-tested after site UI changes.
- The automatic script diff covers LuaSourceContainer changes. It does not yet provide a full property-level diff for every Instance.
- Multiplayer testing still depends on the Studio/MCP commands exposed by the user's current Roblox Studio build.
- The catastrophic guard intentionally blocks only clearly dangerous bulk operations; normal targeted edits remain automatic.

## Update

1. Pull/download the latest `master` branch.
2. Reload the unpacked extension from `chrome://extensions`.
3. Refresh every open model tab.
4. Restart the local ZeroScript bridge.
5. Confirm the extension popup shows version `1.22.0`.

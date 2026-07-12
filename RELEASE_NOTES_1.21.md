# ZeroScript 1.21.0

## New browser AI providers

Experimental direct ZeroScript sessions are now available for:

- ChatGPT (`chatgpt.com`)
- Claude (`claude.ai`)
- Microsoft Copilot (`copilot.microsoft.com`)
- Mistral (`chat.mistral.ai`)

These providers use a semantic browser adapter based on accessibility attributes, message roles, visible composer controls, and broad fallbacks. They are deliberately marked experimental because browser chat DOMs can change without notice.

## Orchestrator changes

- Smart routing includes capability weights for the four new providers.
- Claude and ChatGPT rank strongly for analysis, building, and review when their ZeroScript sessions are ready.
- Mistral and Copilot can act as automatic fallbacks.
- Status/team broadcasts now reach the new provider tabs.
- The popup includes an Open model launcher and per-provider readiness list.
- Existing manual role selectors include the new providers when Smart AI routing is disabled.

## Current limitations

- New provider adapters start in text-only mode. Studio screenshots are not attached to these providers yet.
- Each provider must be tested live after UI changes by its website.
- The existing DeepSeek, Gemini, Qwen, Kimi, GLM, and Arena adapters remain the mature paths.

## Manual verification

1. Pull the latest `master` branch.
2. Reload the unpacked extension in `chrome://extensions`.
3. Refresh every AI tab.
4. Confirm the extension version is `1.21.0`.
5. Open one of the new providers from the popup.
6. In a fresh chat, start the ZeroScript session.
7. Confirm the provider status changes from `tab open, session not started` to `ready`.
8. Run a read-only Studio inspection task.
9. Confirm the task report returns to the popup and the phase advances.

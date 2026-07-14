# ZeroScript One — Roblox Studio AI Workspace

ZeroScript One connects one supported browser AI to Roblox Studio through the local bridge. Version **1.33.0** replaces the long multi-agent workflow with one request, one AI owner and one complete implementation pass.

## Fastest daily use

1. Run `ZeroScript One.bat`.
2. Open your Roblox place in Studio.
3. Open one supported AI site such as ChatGPT, Gemini or Qwen.
4. Write what you want in the desktop app, browser popup or Studio panel.
5. Press **Yap**.

The one-click launcher starts the bridge only when port `17613` is free, then opens the desktop workspace. It does not restart a healthy bridge or create duplicate StudioMCP windows.

## One request, one implementation pass

ZeroScript One does not run ordinary work through Analyst → Builder → UI → Reviewer → QA.

The selected AI must:

- inspect only the relevant Studio state
- make the actual changes
- preserve working systems and public data formats
- finish the requested feature in the same pass
- playtest the changed path
- read Studio Output
- fix verified blockers before finishing

A new request automatically cancels stale work, clears the old queue and becomes the only active request.

## Desktop workspace

The normal app shows one clean screen:

- one large request box
- one **Yap** button
- **Durdur**, **Geri al** and **AI aç**
- quick actions for UI repair, Output repair and playtesting
- Start/Bridge, Studio and AI status cards
- real activity such as AI prepared, Studio editing, playtest and completion

Advanced systems still exist internally for safety and learning, but they are hidden from normal use.

## Browser workspace

A fixed **ZeroScript One** panel is injected into:

- ChatGPT
- Gemini
- Qwen
- DeepSeek
- Claude
- Microsoft Copilot
- Mistral
- Kimi
- GLM
- Arena

The browser panel has its own request box, **Yap**, **Durdur** and **Yenile** actions. Pressing **Yap** starts the current AI agent automatically when possible and sends the request through the same one-pass workbench.

When the provider-specific agent fails to mount, the panel shows a concrete boot error and a clean reload action instead of silently appearing connected.

## Roblox Studio workspace

The Studio plugin now includes:

- automatic time-limited pairing with the Hub
- a modern dock panel
- direct task entry
- automatic Explorer selection context
- live workbench activity
- **Yap**, **Durdur**, **Geri al**, **Son hatayı düzelt** and **Projeyi tara**
- a simplified command palette that can be bound to `Ctrl+K`

Run `install_studio_panel.bat` after updating, then restart Studio.

## How decisions work without a built-in AI

ZeroScript One is not a hidden language model.

1. Local deterministic rules replace stale work, select one ready provider, enforce one-pass execution and require test evidence.
2. The connected browser AI performs the creative coding, UI, map and debugging work through Roblox Studio tools.

The local system decides what may run and whether evidence exists. The browser AI writes and tests the implementation.

## Safety retained

- one Studio writer lock
- checkpoints and rollback
- catastrophic-change guard
- server-authoritative guidance
- provider failover
- playtest and Output requirements
- Memory Vault and Recipe learning
- Design DNA and behavior contracts
- proof status instead of trusting a model saying “done”

Separate reviewer stages are disabled for ZeroScript One workbench tasks because the builder performs its own test and Output verification in the same pass.

## Updating

Run `ZeroScript Güncelle.bat`, then:

1. Open `chrome://extensions`.
2. Press **Reload** on ZeroScript One.
3. Close and reopen existing AI tabs.
4. Run `install_studio_panel.bat` or allow the updater to reinstall the Studio tools.
5. Restart Roblox Studio.

The updater preserves the token, Hub settings, profiles, task templates, Memory Vault and local config.

## Validation limits

The repository includes JavaScript syntax checks, deterministic workbench tests, Python compile checks, control API tests, Memory Vault tests and version parity checks. Provider websites and Roblox Studio change frequently, so live Windows, Chrome and Studio testing is still required.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

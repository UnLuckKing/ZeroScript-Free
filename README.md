# ZeroScript Hub — Roblox Studio AI

ZeroScript connects a supported browser AI to Roblox Studio through the local `Start.exe` / `start.bat` bridge. Version **1.32.0** focuses on one simple workflow: one screen, one active request, one working AI provider, and at most one final verification pass.

## Daily use

1. Open `Start.exe` or `start.bat` and leave it running.
2. Open your place in Roblox Studio.
3. Open one supported AI site in Chrome.
4. Refresh the AI tab after updating the extension.
5. Use the fixed ZeroScript popup in the top-right and press **Agent'ı başlat**.
6. Open `ZeroScript Hub.bat`.
7. Write what you want and press **Başlat**.

A new request automatically cancels and clears the previous task, queue and game plan.

## Universal AI popup

A fixed ZeroScript popup is injected into every supported provider:

- ChatGPT
- Claude
- Microsoft Copilot
- Mistral
- Gemini
- Qwen
- DeepSeek
- Kimi
- GLM
- Arena

The popup stays visible even when a provider redesign hides the normal composer bar. It exposes:

- **Agent'ı başlat**
- **Durdur**
- **Göster** — reveals the original ZeroScript control bar

After pressing **Reload** on the unpacked extension in `chrome://extensions`, refresh any AI tabs that were already open.

## Faster single-provider execution

ZeroScript no longer sends ordinary work through Analyst → Builder → Map → UI → Reviewer → QA.

- Small fix: **one provider, one pass**
- UI-only work: **one UI pass including testing**
- Map-only work: **one map pass including testing**
- Normal system work: **one complete build-and-test pass**
- Complete game or high-risk data/purchase work: **build + one verify/fix pass**

The selected provider stays responsible for the request. A different ready provider is used only when the first provider does not use Studio tools or return a report for roughly three minutes.

## Easy Mode game building

The old six/eight-stage blueprint was reduced to:

1. **Playable game** — inspect the project and complete the core loop, secure server logic, progression, persistence, responsive UI, onboarding and essential feedback.
2. **Polish and verify** — improve proven weak points, then test mobile/desktop UI, buttons, respawn, rejoin, security, data, purchases when present, performance and Studio Output.

A prototype can use only the first pass.

## One-screen Hub

Easy Mode shows only:

- one request box
- **Başlat**
- **Durdur ve temizle**
- **Start'ı aç**
- Start/Bridge, Studio and AI readiness
- current work and progress
- completion result

Advanced systems remain available internally for safety and learning, but they do not appear in the normal workflow.

## Completion and learning

When a job ends, the Hub shows the proof status and three actions:

- **Beğendim**
- **Olmadı**
- **Geri al**

“Olmadı” can be classified as:

- Çalışmıyor
- Görünüş kötü
- Eksik yaptı
- Oyunu bozdu
- Çok yavaş

This feedback is stored with the task/provider result and is used by the local learning/routing system.

## How decisions work without a built-in AI

ZeroScript is not a hidden language model. It has two layers:

1. Local rules classify the request, estimate risk, select one ready provider, limit scope and require tests.
2. The connected browser AI performs the creative coding, UI, map and debugging work through Roblox Studio tools.

ZeroScript can connect to the browser version of ChatGPT through the extension. It cannot directly attach a remote ChatGPT conversation to software on the user's computer; the Chrome tab where the extension is installed is the provider connection.

## Existing safety retained

- new requests replace stale work
- one Studio writer lock
- checkpoints and rollback
- server-authoritative guidance
- catastrophic-change guard
- playtest and Output requirements
- provider failover
- Memory Vault and Recipe learning
- Design DNA and behavior contracts
- proof status instead of trusting “done” text

Model Jury and automatic multi-model review are disabled in Easy Mode because they added delay and confusion. High-risk work still receives a final verify/fix pass.

## Updating

Run `ZeroScript Güncelle.bat`, then:

1. Open `chrome://extensions`.
2. Press **Reload** on ZeroScript.
3. Refresh every open AI tab.
4. Restart the Hub.

The updater preserves the token, Hub settings, profiles, task templates, Memory Vault and local config.

## Validation limits

The repository includes JavaScript syntax checks, single-provider phase tests, two-stage blueprint tests, Python compile checks, control API tests, Memory Vault tests and version parity checks. Provider websites change frequently, so live Chrome and Roblox Studio testing is still required after provider UI updates.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

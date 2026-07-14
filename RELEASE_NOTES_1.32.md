# ZeroScript 1.32 — Fast Single-Provider Mode

## What changed

- A fixed **universal ZeroScript popup** now appears on every supported AI site: DeepSeek, Gemini, Kimi, GLM, Qwen, Arena, ChatGPT, Claude, Copilot and Mistral.
- The popup always exposes **Start**, **Stop** and **Show main control** even when a provider layout change hides the normal composer bar.
- Normal work no longer runs through Analyst → Builder → Map → UI → Reviewer → QA.
- Small fixes, UI work and map work use **one provider and one complete pass**.
- Complete games and high-risk data/purchase work use at most **two passes**: build, then verify/fix.
- Easy Mode game plans were reduced from six/eight queued jobs to one prototype job or two publishable jobs.
- One selected provider stays responsible for the task. A second model is used only as a fallback when the first ready provider stops making progress.
- A provider that does not use a Studio tool or return a report for roughly three minutes is stopped and replaced with another ready provider.
- Model Jury, automatic multi-model review and automatic Project Genome work are disabled in Easy Mode to reduce delay and confusion.
- New requests still erase old paused work, queues and blueprints before starting.
- The Hub completion card now shows proof status and offers **Beğendim**, **Olmadı** and **Geri al**.
- Negative feedback can be classified as not working, bad appearance, incomplete, game-breaking or too slow and is stored for future routing/learning.
- The Hub continues to respect the manually launched `Start.exe` / `start.bat` bridge and never creates duplicate StudioMCP windows.

## Supported AI sites

The universal popup is injected into:

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

After updating the unpacked extension, press **Reload** in `chrome://extensions` and refresh any already-open AI tabs.

## Important limit

ZeroScript can connect to the browser version of ChatGPT through the extension. It cannot directly attach this remote ChatGPT conversation to a program running on the user's computer; the ChatGPT tab where the extension is installed is the provider connection.

## Validation limits

The repository validates JavaScript syntax, phase reduction, two-stage blueprints, version parity and Python modules. Provider websites change frequently, so the popup and provider-specific typing/reading behavior still require live Chrome testing after site updates.

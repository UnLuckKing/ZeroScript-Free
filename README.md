# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through one local MCP bridge. Version **1.30.0** adds Project Genome, a deterministic Intent Compiler, Shadow Guard, Proof Engine, Design DNA, Behavioral Contracts, a Studio Command Palette, Model Jury coordination, Self-Healing suggestions and a local Live Game Brain.

## Recommended setup

1. Download the repository ZIP and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `zeroscript-extension`.
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub.
7. Leave the mode on **Akıllı otomatik**, write a task, and press **Çalıştır**.
8. Run **Studio panelini kur** again after updating to install the new Command Palette.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## How ZeroScript decides without owning an AI model

ZeroScript is an orchestration and verification system, not a hidden language model. It uses two layers:

1. **Local deterministic decisions:** explicit keyword/category rules, risk thresholds, Project Genome counts, Recipe scores, provider success history, required proof rules and project Design DNA decide scope, risk, routing constraints, Shadow Guard, Model Jury and mandatory tests.
2. **Connected AI implementation:** Gemini, Qwen, DeepSeek, ChatGPT, Claude or another ready provider performs creative coding, map/UI work and diagnosis inside those constraints.

The local layer can always explain its decision. It does not invent code by itself; it decides **which provider should work, what may be changed, what must be tested and whether the evidence is sufficient**.

## Superior Engine 1.30

### Project Genome

A bounded Studio scan records:

- scripts and their service/instance references
- RemoteEvents and RemoteFunctions
- ScreenGuis and interaction surfaces
- inferred systems such as Shop, Inventory, RNG and Data
- dependency edges and project-size counts

The result is stored per PlaceId/game in `zeroscript_memory.db` and is used to estimate impact and avoid unrelated edits.

### Intent Compiler

Before a task starts, ZeroScript converts the instruction into a local contract containing:

- category and risk score
- required execution phases
- preferred provider and fallbacks
- Shadow Guard and Model Jury requirement
- Behavioral Contract
- Proof Contract
- Design DNA when the task is visual
- a human-readable decision trace

### Shadow Guard

For high-risk work ZeroScript creates an isolated, scoped clone under `ServerStorage.ZeroScriptShadow` and keeps the normal checkpoint. This is a practical transaction/sandbox guard inside the current Studio connection; it is not a second independent Roblox Studio process. Live changes are accepted only after the Proof Contract is evaluated.

### Proof Engine

A task is shown as **VERIFIED** only when enough real evidence exists. The score checks:

- terminal completion
- recorded changed paths
- verified evidence
- regression/playtest evidence
- clean Output
- visual evidence when required
- independent reviewer/jury evidence when required

Missing evidence remains **UNVERIFIED** even when a model says “done”.

### Design DNA

Each game can store a visual identity:

- palette
- style name
- spacing/radius rules
- mobile/touch rules
- permanent visual constraints

Visual tasks receive this DNA automatically so different models keep a consistent game style.

### Behavioral Contracts

Project-specific expected behavior can be stored independently of script names. Example:

- Roll result is generated on the server
- Inventory updates exactly once
- Pity changes exactly once
- Respawn and rejoin preserve the state
- Output remains clean

Contracts are injected into matching tasks and Proof Engine checks the resulting evidence.

### Studio Command Palette

The local plugin adds a modern Command Palette. It automatically attaches selected Explorer instance paths to the task. Create a shortcut in **Studio → Customize Shortcuts** for **ZeroScript: Command Palette**; `Ctrl+K` is recommended.

Quick commands include:

- run a natural-language task with current selection
- scan Project Genome
- evaluate Proof
- run Self-Heal scan

### Model Jury

High-risk tasks require an independent Reviewer comparison. Analyst, Builder and Reviewer reports form the jury record; the Reviewer must compare the implementation with a credible alternative and return an explicit verdict.

### Self-Healing

Modes:

- `off`: no background suggestion
- `suggest`: group new Output errors and create a recommendation
- `auto_shadow`: start a repair task only when the system is idle, using Shadow Guard and Proof Engine

Automatic live-project acceptance is not enabled.

### Live Game Brain

The Hub can import local Roblox Analytics JSON or CSV exports. Deterministic thresholds surface issues such as weak onboarding completion, poor first-action completion, low D1 retention, high error-session rate and weak purchase conversion. It does not require a paid AI API.

## Memory Vault and Recipe Studio

ZeroScript stores reusable knowledge in `zeroscript_memory.db` using SQLite:

- global reusable Roblox knowledge
- project-specific lessons and failures
- task context
- verified lessons
- known failures that must not be repeated
- provider performance by project/category
- Project Genome, Design DNA, contracts and proof results

The Lemonade-style **Recipe Studio** includes workflows for responsive UI, RNG, inventory, purchases, DataStores, Remote security, economy, map polish, VFX, onboarding, Output repair, performance and release readiness. Repeated high-confidence patterns become pending Recipe suggestions and remain inactive until accepted.

## Existing automation retained

- persistent priority/dependency task queue
- automatic task decomposition
- Smart Automatic, Turbo, Fast, Balanced and Best Quality modes
- project index and background Output watcher
- time limits and provider failover
- instance/script checkpoints and rollback
- visual UI comparison and button testing
- Remote security, DataStore and economy workflows
- Toolbox quarantine
- multiplayer readiness and Release Manager
- emergency stop

## Hub screens

- **Ana ekran:** task start, stop, rollback, quick tasks and connection status
- **Görev kuyruğu:** priorities and dependencies
- **Araçlar:** UI, security, data, economy, assets, multiplayer and release workflows
- **Geçmiş:** progress and completed jobs
- **Oyun profilleri / Görev şablonları**
- **Otomasyon:** diagnosis, timeouts, model metrics, grouped errors and notifications
- **Recipe Studio:** persistent learning and reusable workflows
- **Üstün Sistem:** Intent Compiler, Project Genome, Design DNA, contracts, Proof Engine and Live Game Brain

## Updating

Use **ZeroScript'i güncelle** in Hub or double-click `ZeroScript Güncelle.bat`. The updater preserves:

- `control_token.txt`
- Hub settings, profiles and task templates
- `zeroscript_memory.db` and active SQLite WAL/SHM files
- `config.json`

After updating, press **Reload** on the ZeroScript card in `chrome://extensions`, then reinstall the Studio panel so the Command Palette is updated.

## Supported providers

DeepSeek, Gemini, Qwen, Kimi, GLM, Arena, ChatGPT, Claude, Microsoft Copilot and Mistral are supported. LM Studio and Ollama can be used as optional local providers.

## Safety

- Bridge and Hub bind to localhost and require a random local token.
- Memory and Project Genome are guidance, never proof.
- High-risk work leaves Turbo automatically.
- Shadow Guard does not publish or write production DataStore values.
- Self-Healing defaults to suggestion mode.
- Existing writer locks, permission scopes, catastrophic-change blocking, server-authoritative guidance, checkpoints and QA evidence gates remain enabled.

## Validation limits

The repository includes JavaScript syntax checks, Python compile checks, control API tests, Memory Vault tests, Superior Engine tests and deterministic decision tests. Real Chrome provider pages, Roblox Studio visuals, plugin shortcut behavior, long-running Shadow workflows, multi-client sessions and production DataStores still require live testing on Windows.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

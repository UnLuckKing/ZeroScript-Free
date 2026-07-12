# ZeroScript Hub — Roblox Studio AI Team

ZeroScript connects supported browser AI models to Roblox Studio through one local MCP bridge. Version **1.31.0** adds a beginner-first **Kolay Mod**, a one-click game blueprint builder, smart next-step guidance and a more focused modern Hub while retaining Memory Vault, Recipe Studio, Project Genome, Shadow Guard, Proof Engine and Model Jury.

## Recommended setup

1. Download the repository ZIP and extract the complete folder.
2. Open Roblox Studio and load a place.
3. Enable Studio's MCP server in Roblox Studio Assistant settings.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `zeroscript-extension`.
5. Double-click `ZeroScript Hub.bat`.
6. On first use, click **Extension'ı eşleştir** in Hub.
7. Use the default **Kolay Mod**, write the game idea, choose genre/quality/device and press **Oyunu planla ve yap**.

For normal daily use, only Roblox Studio and `ZeroScript Hub.bat` need to be opened.

## Kolay Mod 1.31

Kolay Mod hides technical screens by default and gives one clean workflow:

- write the idea in normal language
- choose game type
- choose quality target
- choose device priority
- start a safe dependent game plan
- follow readiness and task progress from one screen

The dashboard continuously shows:

- ZeroScript/extension readiness
- Roblox Studio MCP status
- ready AI-provider count
- Output and Proof quality state
- the one most useful next action
- active task progress and queue count

The **Gelişmiş araçları göster** button restores all technical tabs. The setting is remembered.

## One-click game blueprint builder

Supported presets:

- RNG / Aura
- Simulator
- Clicker / Incremental
- Tycoon
- Obby
- Pet Collection
- Custom

Quality targets:

- **Hızlı prototip:** project understanding, secure foundation, progression/persistence and UI/onboarding
- **Yayınlanabilir oyun:** adds retention/fair monetization and release proof
- **Premium kalite:** also adds content depth, delight/polish and an independent quality jury

The system does not send one huge prompt. It creates a dependency chain so each stage must complete before the next starts:

1. understand the real project and main loop
2. build/repair the secure foundation
3. complete progression, economy and persistence
4. create professional responsive UI and onboarding
5. improve retention and fair monetization when required
6. verify security, performance, mobile and release quality
7. add high-value content/polish for Premium
8. run an independent jury for Premium

Every stage inherits Project Genome, Memory Vault, Recipe context, Design DNA, Behavioral Contracts, checkpoints and Proof requirements.

## One-click improvements

Kolay Mod includes four large actions:

- **Oyunu düzelt:** connection, Output and verified system problems
- **UI'yi profesyonelleştir:** visual hierarchy, responsive layout, safe areas, feedback states and button tests
- **Oyunu eğlenceli yap:** strengthen the verified weakest part of the main loop, progression and session pacing
- **Yayına hazırla:** data, purchases, security, performance, mobile and release checks

## Smart next action

Instead of showing a technical error, ZeroScript chooses one practical next step:

- start local services
- pair the extension
- repair Studio MCP
- open a supported AI model
- show the active task
- repair new Output errors
- write a game idea
- start the game blueprint

## How ZeroScript decides without owning an AI model

ZeroScript is an orchestration and verification system, not a hidden language model. It uses two layers:

1. **Local deterministic decisions:** task/category rules, risk thresholds, Project Genome counts, Recipe scores, provider history, Design DNA and Proof rules decide scope, routing, safety and required tests.
2. **Connected AI implementation:** Gemini, Qwen, DeepSeek, ChatGPT, Claude or another ready provider performs creative coding, UI/map work and diagnosis within those constraints.

The local layer decides **which provider should work, what may change, what must be tested and whether evidence is sufficient**. It does not pretend to generate the creative implementation itself.

## Superior Engine

### Project Genome

A bounded Studio scan records scripts, remotes, ScreenGuis, inferred systems, dependency edges and project-size counts. The result is stored per project in `zeroscript_memory.db` and helps avoid unrelated edits.

### Intent Compiler

Every task becomes a local contract with category, risk, phases, recommended provider, Shadow/Jury requirements, Behavioral Contract, Proof Contract and a human-readable decision trace.

### Shadow Guard

High-risk work receives a scoped sandbox/checkpoint under `ServerStorage.ZeroScriptShadow`. It is a transaction guard inside the current Studio connection, not a second independent Studio process.

### Proof Engine

A model saying “done” is not enough. A result remains **UNVERIFIED** when required playtest, Output, visual, changed-path, regression or jury evidence is missing.

### Design DNA and Behavioral Contracts

Each project can keep a visual identity and expected behaviors independently of script names. Visual tasks reuse the Design DNA; matching contracts are injected into tasks and checked against evidence.

### Command Palette, Model Jury, Self-Healing and Live Game Brain

- Studio Command Palette attaches selected Explorer paths to tasks.
- High-risk work can require an independent Reviewer comparison.
- Self-Healing can be off, suggestion-only or auto-shadow when idle.
- Local Roblox Analytics JSON/CSV can be interpreted without a paid API.

## Memory Vault and Recipe Studio

SQLite Memory Vault stores global/project lessons, known failures, provider performance, Project Genome, Design DNA, contracts and proof results. The Lemonade-style Recipe Studio contains reusable workflows for UI, RNG, inventory, purchases, DataStores, security, economy, map, VFX, onboarding, performance and release readiness.

## Advanced tools retained

- persistent priority/dependency queue
- Smart Automatic, Turbo, Fast, Balanced and Best modes
- project index and Output watcher
- timeouts and provider failover
- instance/script checkpoints and rollback
- visual comparison and interaction tests
- Remote, DataStore, economy and Toolbox workflows
- multiplayer readiness and Release Manager
- emergency stop

## Updating

Use **ZeroScript'i güncelle** in Hub or double-click `ZeroScript Güncelle.bat`. It preserves token, Hub settings, profiles, templates, Memory Vault and config. After updating, press **Reload** on the ZeroScript card in `chrome://extensions`. The updater also refreshes the local Studio panel and Command Palette; restart Roblox Studio when it was open during the update.

## Supported providers

DeepSeek, Gemini, Qwen, Kimi, GLM, Arena, ChatGPT, Claude, Microsoft Copilot and Mistral are supported. LM Studio and Ollama can be used as optional local providers.

## Safety

- Bridge and Hub bind to localhost and require a random local token.
- Memory and Project Genome are guidance, never proof.
- High-risk work leaves Turbo automatically.
- Shadow Guard never publishes or writes production DataStore values.
- Self-Healing defaults to suggestion mode.
- Writer locks, permission scopes, catastrophic-change blocking, checkpoints and QA evidence gates remain enabled.

## Validation limits

The repository includes JavaScript syntax checks, Easy Mode blueprint tests, Python compile checks, control API tests, Memory Vault tests and Superior Engine tests. Real Chrome provider pages, Windows layout, Roblox Studio visuals, long multi-stage builds, multi-client sessions and production DataStores still require live testing.

## License

GPL-3.0-or-later. Existing copyright notices and attribution must remain intact.

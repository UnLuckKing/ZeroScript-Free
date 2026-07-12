# ZeroScript 1.23 — Local AI + Adaptive Team Manager

## New in 1.23

- Optional free local AI provider for LM Studio, Ollama, and OpenAI-compatible localhost servers.
- Local model health checks and automatic loaded-model discovery.
- Background local-agent loop that can inspect and edit Roblox Studio without opening another AI website.
- Local-model safety checks, exact tool validation, checkpoint-aware task continuation, and automatic fallback to a ready web model.
- Popup controls for local endpoint, provider type, model name, local-first routing, and fallback behavior.
- Local provider performance is included in the adaptive router's learned scores.

## Team Manager features included

- Dynamic phase plans based on the actual task rather than one fixed workflow.
- Structured shared project memory across models.
- Persistent regression tests extracted from accepted QA evidence.
- Provider performance learning and adaptive routing.
- Context-limit summaries and automatic stuck-provider recovery.
- Deterministic post-task Lua script diff with risk and rollback recommendations.
- Catastrophic bulk-change protection.
- Release-readiness scoring and blocker reporting.
- Specialist one-click tasks for security, DataStore reliability, mobile QA, multiplayer QA, performance, and economy.

## LM Studio setup

1. Start LM Studio and load a coding model.
2. Enable its local OpenAI-compatible server.
3. In the ZeroScript popup open **Local AI — LM Studio / Ollama**.
4. Choose **LM Studio / OpenAI-compatible**.
5. Use `http://127.0.0.1:1234/v1/chat/completions` unless LM Studio shows another port.
6. Enable local AI and press **Save & test**.

## Ollama setup

1. Install and start Ollama.
2. Pull/start a coding model.
3. Choose **Ollama** in the ZeroScript popup.
4. Use `http://127.0.0.1:11434/api/chat`.
5. Enter the model name or leave it blank for automatic discovery.
6. Enable local AI and press **Save & test**.

## Limitations

- Local AI is text-only; it does not consume Studio screenshots.
- Local AI automatically yields to browser providers while Studio write approval mode is enabled.
- Small local models may be slower and less reliable than strong web models on large multi-system tasks.
- The script diff currently covers LuaSourceContainer creation, deletion, and source changes; it is not a full property-level diff for every Roblox Instance.
- Browser and local providers must still be live-tested against the user's machine, selected model, Studio build, and current website UI.

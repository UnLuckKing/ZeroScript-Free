# ZeroScript Free — Kimi × Roblox Studio Agent

Turn **kimi.com** into an agent that **builds inside Roblox Studio for you**. The browser
extension drives Kimi right in the page; a small **local WebSocket bridge** runs the Roblox
Studio tools and feeds the result back. Cleaner than a terminal, and designed so **Kimi always
gets an output** (success *or* a formatted error) — the agentic loop never gets stuck.

```
┌──────────────┐   drives the page   ┌──────────────────┐
│ Extension    │ ◄─────────────────► │  kimi.com (Kimi) │
│  content.js  │                     └──────────────────┘
│  background  │   ws://127.0.0.1    ┌──────────────────┐   Roblox Studio MCP
│  (worker) ───┼────────17613───────►│   bridge.py      │──► (mcp.bat → Studio plugin)
└──────────────┘                     └──────────────────┘
```

## What Kimi can do
Everything the **Roblox Studio MCP** exposes, for example: read & edit scripts, run Luau
(`execute_luau`), inspect the game tree and instances, capture the Studio viewport, generate
meshes / materials / models, browse the creator store, and control play-testing — all inside
the user's open Roblox Studio place. Any MCP server added to `config.json` is aggregated
automatically.

## 🖼️ Captures sent to Kimi (multimodal)
Kimi is multimodal: when a tool returns an image (e.g. a viewport capture), the extension
**pastes it into the composer automatically** and sends it with the message — Kimi **actually
sees the image** and can analyse it. If the upload fails, the image still shows to the user and
Kimi is told it cannot see it.

## Installation

### 1. The bridge
```powershell
pip install websockets
python "C:\SideProjects\ZeroSript Free\bridge.py"
```
- The bridge reads `config.json` (next to `bridge.py`) and launches the Roblox Studio MCP.
- Open **Roblox Studio** (with the MCP plugin enabled) so the tools become available.

`config.json` (source of truth for MCP servers):
```json
{
  "mcpServers": {
    "roblox": { "command": "cmd.exe", "args": ["/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"] }
  }
}
```
> The bridge automatically wraps `npx`/`npm`/`yarn`/`pnpm` in `cmd.exe /c` on Windows, so any
> node-based MCP server you add will "just work".

### 2. The extension
1. Edge → `edge://extensions` (or Chrome → `chrome://extensions`)
2. Enable **Developer mode**
3. **Load unpacked** → choose the `edge-extension` folder
4. Open **https://www.kimi.com** — the **ZeroScript Free** panel appears at the bottom right.

## Usage
- The panel **dot**: green = bridge + Roblox ready · yellow = bridge OK but Studio down · grey =
  bridge offline.
- Click **▶ Start session** once (it injects the system prompt, camouflaged as "Starting Up").
  The button is disabled until the bridge and Studio are ready, and the panel tells you what is
  missing.
- Type your request in Kimi. The agent loops on its own and drives Roblox Studio.
- Once a session is active the Start button becomes **⟳ New session** — only use it after a
  context limit, so you never start two sessions in the same chat by accident.
- **■ Stop** interrupts the loop at any time.

## Robustness — what's covered
Kimi always receives a usable response:

| Case | Behaviour |
|------|-----------|
| Malformed tool JSON / text around it | error message → Kimi retries cleanly |
| Multiple tools in one response | "one at a time" error |
| Unknown tool name | error listing the valid tools |
| Tool throws | the exact error is sent back to Kimi |
| Tool timeout | timeout message → Kimi adapts; **hard watchdog** on the extension side |
| **Roblox MCP dies** | auto-restart on the next call; the failing call is retried once |
| Bridge offline | clear message to Kimi + banner to the user |
| **Context limit (silent)** | detected (text, modals, empty replies, editor gone) → banner + Stop |
| **"generating" flag stuck** | falls back to text stability → the loop never freezes |
| Empty response | one auto-retry, then a banner if it persists |
| Kimi page reload | **session restored** from the DOM (no useless re-injection) |
| Message sent by mouse / loop ended | **auto-resume watchdog** picks the tool call back up |

## ♥ Support
ZeroScript is free. If it saved you time, you can tip the developer on **Ko-fi** (the ♥ button
in the panel and the extension popup).

## Settings
- Port: `ZS_BRIDGE_PORT` (env) on the bridge **and** `PORT` in `background.js` (+ `WS_PORT` in `config.js`).
- MCP servers: `config.json`.
- Kimi DOM selectors: `SELECTORS` in `config.js`.
- Ko-fi link: `KOFI_URL` in `content.js` and `popup.js`.

## Files
- `bridge.py` — WebSocket server + **MCP router** (per-server lock, auto-restart, id-matching, timeouts).
- `config.json` — MCP servers (roblox by default).
- `manifest.json` — MV3 declaration.
- `config.js` — system prompt, selectors, regexes, messages, tool categories.
- `background.js` — service worker: resilient WebSocket (reconnect, heartbeat, timeouts, health).
- `content.js` — agentic loop, parsing, onboarding, themed tool chips, camouflage, Stop, limit detection.
- `overlay.css` — in-page UI (panel, themed chips, expandable bodies).
- `popup.html` / `popup.js` — status + reconnect / restart + tip.

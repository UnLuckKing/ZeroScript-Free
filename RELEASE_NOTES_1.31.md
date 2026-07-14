# ZeroScript 1.31.1 — Simplified Easy Mode

## One screen only

- Easy Mode now shows one large request box, one **Başlat** button, one **Durdur ve temizle** button and three simple connection states.
- Game type, quality target, device priority, advanced tools, Recipe screens and technical tabs are hidden from the normal workflow.
- ZeroScript infers the game type from the request and uses the publishable desktop+mobile defaults automatically.

## New request replaces old work

- Submitting a new Easy Mode request stops the current provider response.
- The old team task, paused task, queue, approvals and previous blueprint are cleared.
- Work restored after an extension/service-worker restart is cleared instead of silently continuing an old prompt.
- The newest request is the only request allowed to run in Easy Mode.

## Game-plan button reliability

- **Başlat** now waits for the current Hub control service instead of sending an action while it is still starting.
- It confirms the Chrome extension is connected, opens a short automatic pairing window when needed, submits the fresh blueprint and waits until the extension reports a new blueprint/task.
- The UI no longer shows a false success message merely because the local API queued an action.
- Failure text is shown directly in the Easy Mode status card.

## Manual Start bridge

- Hub no longer launches, kills or restarts the Roblox bridge.
- The bridge is owned by the user's existing `Start.exe` or `start.bat` workflow.
- Hub only starts its small localhost control API.
- A **Start'ı aç** button is available, but the bridge is never auto-launched.

## StudioMCP window fix

- Roblox `StudioMCP.exe` is started with Windows `CREATE_NO_WINDOW` because it is a stdio child, not a user-facing terminal.
- Reconnects and proxy restarts no longer place repeated black StudioMCP windows over the Hub.
- Removing Hub-side bridge startup also prevents the common duplicate-bridge race when Start and Hub are opened together.

## Validation limits

The repository includes Python syntax/unit checks, JavaScript syntax checks, version parity checks and the existing orchestration tests. The real Start executable, Chrome provider pages, Studio MCP reconnection behavior and Roblox playtests still require live Windows testing.

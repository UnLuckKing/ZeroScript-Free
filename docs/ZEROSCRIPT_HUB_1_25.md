# ZeroScript Hub 1.25

ZeroScript Hub keeps the existing bridge, Smart Router, shared project memory, checkpoints, rollback, provider failover, risk controls, Reviewer, and QA systems. It moves everyday controls out of the crowded browser popup and into one Windows window.

## Daily use

1. Open Roblox Studio and load the place.
2. Double-click `ZeroScript Hub.bat`.
3. The Hub starts the local control API and MCP bridge automatically.
4. On first use only, click **Extension'ı eşleştir**. The extension normally pairs automatically in a few seconds; open its popup once only as a fallback.
5. Write the task in the Hub and click **Çalıştır**. When no provider is ready, Hub opens and prepares a suitable model while Studio preflight runs.

The old `start.bat`, `start_with_panel.bat`, manual token copy, and crowded extension settings are no longer required for normal use.

## First-time setup

For the easiest first installation, run `ZeroScript Kurulum.bat`. It checks Python, creates a desktop shortcut, opens Chrome's extension page and the correct extension folder, then launches Hub.

Chrome does not allow ordinary desktop programs to silently install an unpacked extension. One manual browser step remains:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the `zeroscript-extension` folder.
5. Reload the extension after each ZeroScript update.

After installation, pairing is opened by one Hub button and claimed automatically by the extension service worker. The token-free pairing endpoint exists only for two minutes and only on localhost.

## Main screen

The main screen shows:

- Hub status
- Bridge status
- Roblox Studio and MCP status
- Number of ready AI models
- Current task, phase, and provider
- Task input
- Fast, Balanced, and Best Quality modes
- Start, Stop, and Rollback
- Connection repair
- Extension pairing

## Settings

The Hub controls:

- quality mode
- automatic or manual model routing
- automatic writes or approval-required writes
- completion notifications
- context recovery
- preferred code, UI/map, and QA providers
- automatic service startup

These settings are delivered to the extension through the authenticated localhost control channel.

## Extension popup

The extension popup is intentionally small. It only shows connection health, ready models, current task, pairing, model preparation, stop, and reconnect controls. Advanced orchestration continues in the background.

## Roblox Studio panel

The Studio DockWidget is optional. ZeroScript Hub already shows the useful status and controls. Install the Studio panel only when you specifically want controls inside Studio.

## Connection states

- **Everything ready**: Hub, bridge, Studio MCP, extension, and at least one provider are connected.
- **Studio open, waiting for MCP**: open Studio Assistant settings and enable the Studio MCP server.
- **Extension waiting**: click **Extension'ı eşleştir** in Hub; open the extension popup once only if automatic pairing does not complete.
- **No model ready**: submit the task or use **Model sekmesini aç ve hazırla**. Hub opens the selected provider; login, CAPTCHA, or consent can still require one manual browser action.

## Security

- Hub binds only to `127.0.0.1`.
- Normal control endpoints require a random local token.
- Token-free pairing exists only during a short window explicitly opened by the user.
- Existing write scopes, catastrophic-change blocking, risk scoring, checkpoints, and rollback remain active.

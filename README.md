# ZeroScript - Free AI Agent for Roblox Studio

![GitHub stars](https://img.shields.io/github/stars/sebattfg/ZeroScript-Free?style=social)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

**ZeroScript** is a free browser extension that turns DeepSeek, Gemini, Kimi, GLM, Qwen or Arena into a Roblox Studio AI agent.
Control Roblox Studio with AI directly from your browser - read/edit scripts, run Luau, generate assets, all from a normal AI chat. No API key, no terminal, no coding needed.

> 🌐 **Website: [zeroscript-five.vercel.app](https://zeroscript-five.vercel.app)** the free Lemonade.gg / Luamotion alternative for building Roblox games with AI.

Six AI providers are supported: **DeepSeek** (chat.deepseek.com, recommended), **Google Gemini** (gemini.google.com), **Kimi** (kimi.com, Moonshot AI), **GLM** (chat.z.ai, Z.ai), **Qwen** (chat.qwen.ai) and **Arena** (arena.ai, a multi-model playground). Gemini and Kimi can be unstable: Gemini tends to stop using the Roblox tools in long sessions, and Kimi sometimes uses its own native tools instead of the Roblox commands. On Arena, use **Direct** mode (ZeroScript only supports Direct; it blocks Start in Battle / Side-by-Side / Agent modes). DeepSeek is the recommended provider.

## Multi-model team mode (1.5 preview)

Open the ZeroScript extension popup and enable **Multi-model team**. Choose a
builder and reviewer, then keep each selected provider open in its own browser
tab. The popup shows which model tabs are online and which model currently owns
the Studio lock.

Team mode routes every provider through one shared coordinator. Only one model
may call Roblox Studio tools at a time; other models receive a retry instruction
instead of modifying the place concurrently. This makes it safe to use one tab
for implementation and another for review/debugging while sharing the same MCP
bridge and project memory. Disable team mode to restore the original independent
single-model behavior.

### Automatic team workflow (1.6)

The popup also accepts one complete goal and runs it through three guarded
phases: **Builder → Reviewer → QA / Playtest**. Each role may use a different
free web model. The reviewer independently inspects and fixes the real Studio
state; QA runs the experience, reads Output, checks the feature and requests a
screen capture when vision is available. Task state survives extension worker
restarts, and the popup provides Retry and Cancel controls when a provider tab
is offline, busy, rate-limited, or missing a started ZeroScript session.

> 💬 **Stuck? Join the [Discord community](https://discord.gg/9aNyZsMWcb)** get help, share feedback, and follow updates.

> *Also known as: ZeroScript Roblox, ZeroScript free download, Roblox DeepSeek agent, Roblox Gemini agent, Roblox Kimi agent, Roblox GLM agent, Roblox Qwen agent, Roblox Arena agent, Roblox Studio AI automation, Luau AI, MCP Roblox, lemonade alternative free, lemonade.gg alternative, free Roblox AI agent, free lemonade roblox alternative*
## How it works

```
AI chat (DeepSeek / Gemini / Kimi / GLM / Qwen / Arena, in your browser) -> ZeroScript Extension -> Bridge (your PC) -> Roblox Studio
```

The extension runs inside the chat page (DeepSeek, Gemini, Kimi, GLM, Qwen or Arena). When you type a request, it sends commands to the Bridge running on your PC, which drives Roblox Studio through the built-in MCP server.

## Setup

> 📺 **Lost? Watch the [setup tutorial on YouTube](https://youtu.be/kPKiZLZ9_Ps) it covers every step below.**

### 1. Download the zip and install the extension

Download the latest zip from the **Releases** page and extract it. The zip contains both the **Bridge** and the **extension folder**.

To load the extension:

- Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
- Enable **Developer mode** (top right toggle)
- Click **Load unpacked**
- Select the `zeroscript-extension` folder from the extracted zip

### 2. Start Roblox Studio and enable MCP

Open Studio and load a Place, then enable MCP (first time only):

- Click **Assistant AI** in the top bar
- Click **...** (top right of the Assistant panel)
- Click **Manage MCP Servers**
- Click **Enable Studio as MCP Server**

> Not sure where to find these options? The [video tutorial](https://youtu.be/kPKiZLZ9_Ps) shows exactly where to click.

### 3. Run the Bridge

Double-click `start.bat` inside the extracted folder. A small window opens, that means the Bridge is running.

### 4. Start a session

Go to https://chat.deepseek.com (recommended), https://gemini.google.com, https://www.kimi.com, https://chat.z.ai, https://chat.qwen.ai or https://arena.ai and open a new chat. The ZeroScript bar appears above the input box. Click **Start session**. Type what you want to build.

> Only works on chat.deepseek.com, gemini.google.com, kimi.com, chat.z.ai, chat.qwen.ai and arena.ai - it will not work on any other site.
> On Arena, keep the mode dropdown on **Direct** - ZeroScript blocks Start in Battle / Side-by-Side / Agent modes (it only drives a single Direct reply).
> Gemini and Kimi can be unstable (model behavior, not the extension): Gemini may stop using the Roblox tools after a while, and Kimi may use its own native tools instead. If the AI starts answering in plain text instead of acting, remind it to use the commands or start a new session.
### 5. Watch the setup tutorial

[Watch the setup tutorial on YouTube](https://youtu.be/kPKiZLZ9_Ps)

## What the AI can do

- Read and edit scripts
- Run Luau code directly in Studio
- Inspect the game tree and instances
- Generate meshes, materials, and models
- Browse and insert from the Creator Store
- Control play-testing
- **Remember your project across sessions** persistent project memory saved inside your place

## New in 1.4.1

- **Much more reliable Roblox Studio connection:** the bridge now recovers on its own from the connection issues Studio itself can cause - a stuck/orphaned MCP process, Studio opened after the bridge, or Studio's MCP toggle losing its registration. When it can't fix something automatically (e.g. Studio's MCP plugin needs a manual nudge), the status bar tells you exactly what to click instead of leaving you guessing or forcing a bridge restart.
- **Faster startup with addon servers:** the bridge no longer waits on Roblox Studio before other MCP servers (like Blender) become usable - addons are ready in seconds instead of up to a minute.
- **Sturdier bridge:** background monitoring can no longer silently stop working after an error; start.bat is hardened against more first-run edge cases (missing winget, an unextracted ZIP, stale installs).

## New in 1.4.0

- **Connect other MCP servers alongside Roblox Studio (experimental):** add an addon MCP server (Blender, Sketchfab, or any local MCP command) from the panel's menu. Roblox Studio stays the always-on primary connection; addons are optional extras the AI reaches for only when the task actually needs them, and a Roblox outage never gets confused with an addon outage. When Roblox is down but an addon is still alive, the agent can start in a degraded mode instead of refusing to start at all.
- **Vision support on more providers:** Arena, Gemini, GLM, Kimi and Qwen can now all actually see an attached screen capture or other tool-returned image, with a more reliable upload flow that no longer silently drops the attachment on send.
- **Smarter command recovery:** a command cut off by the model's own output limit, with only its closing brackets missing, is now auto-completed and run instead of forcing a full retry. Broken-command feedback is also more specific about what actually went wrong (cut off, bad JSON, missing marker, wrong format), so the AI fixes the real problem faster.
- **More accurate tool chips:** fixed a DeepSeek bug where a command's chip could show as finished while the AI was still writing it, plus several chip-state fixes shared across providers (regenerate flicker, orphaned commands after a reload, image-result labeling).
- **Cleaner panel:** the version number next to the ZeroScript name is now small, plain text instead of a bordered badge.

## New in 1.3.9

- **More reliable bridge:** a Roblox process left running in the background after a restart no longer fights the next launch, and a dropped internal connection now retries silently instead of failing a command with a confusing error.
- **Clearer status bar:** when the agent is active but Studio, the place, or the bridge is not actually usable, the bar now says exactly what to do (open a place, enable the MCP server, or restart the bridge) instead of showing a falsely healthy tool count.
- **Cross-provider UI polish:** menus, model pickers and tooltips (Kimi, GLM, Arena) no longer render clipped behind ZeroScript's bar; the "Agent is working" cover can no longer be clicked through or balloon past the composer; the tool chip no longer flashes or flaps when a thinking model quotes its own command, or when revisiting a past turn.
- Several Gemini/Kimi/Arena session and chip glitches are fixed (see changelog for details).

## New in 1.3.5

- **New AI provider: Arena** (arena.ai): a sixth free provider, and the first multi-model playground. Pick any model Arena offers and drive Roblox Studio with it. Use **Direct** mode: ZeroScript blocks Start in Battle / Side-by-Side / Agent modes and auto-commits any A/B comparison to candidate A so the agent always reads a single reply.
- **Stop button fixes (Arena):** clicking **■ Stop** now reliably halts generation even during the brief "Generating..." moment before the native stop button appears, and a tool chip can no longer keep spinning after a stop inside an A/B comparison.

## New in 1.3.4

- **New AI provider: Qwen** (chat.qwen.ai, Alibaba Cloud): a fifth free provider joins the lineup. Uses a network tap (SSE stream) for reliable command extraction, immune to Monaco editor virtualisation.
- **GLM send reliability fix:** in long conversations GLM could take a very long time to actually send a message (it was in the input but wouldn't go). The send logic now re-nudges Svelte up to 8 s until the button re-enables, fixing the delay.

## New in 1.3.0

- **Two new AI providers: Kimi** (kimi.com, Moonshot AI) and **GLM** (chat.z.ai, Z.ai) join DeepSeek and Gemini.
- **Native tools locked down** the AI is now told to use *only* the ZeroScript Roblox commands, never its own built-in tools (code sandbox, web search, connectors).
- **Smoother control panel** dragging is more fluid and no longer snaps back after a session starts.
- Various UI fixes (Kimi input gate, "AI sites" menu) and a more robust command parser.

## New in 1.2.0

- **Project memory** the agent keeps durable notes about your place (architecture, conventions, decisions, your preferences) and reuses them in later sessions, so it actually remembers your project.
- **Custom prompt** (⚙ in the panel) add your own instructions, appended under the system prompt and saved between sessions.
- **Other AI sites button** (🌐 in the panel) quickly open any chat site ZeroScript supports.
- Better, tested command guidance and a more robust agent loop that recovers from malformed commands instead of stalling.

## Panel status

| Dot | Meaning |
|-----|---------|
| Green | Bridge + Studio ready (a place is open) |
| Yellow | Bridge OK, but Studio isn't usable yet - open Roblox Studio, load a place, or enable its MCP server (hover the dot for the exact reason) |
| Grey | Bridge offline - run start.bat |

## Requirements

- Windows PC
- Roblox Studio (MCP support built-in)
- Microsoft Edge or Chrome
- Python 3.8+ (included in start.bat setup)

## Support

ZeroScript is free. If it saves you time: [Ko-fi](https://ko-fi.com/sebattfg) - Robux tip passes available in the extension panel

---

Credit: the idea for connecting other MCP servers (Blender, Sketchfab, etc.) alongside Roblox Studio came from [javnpa](https://github.com/javnpa).

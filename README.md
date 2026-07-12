# OneMind Connector — Roblox Studio MCP Bridge

![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

**OneMind Connector** is the local bridge that connects the OneMind AI platform and supported browser AI models to Roblox Studio through MCP.

It can inspect the active Roblox project, read and edit Luau scripts, execute Studio commands, coordinate multiple AI roles, run playtests, capture results, and keep shared project memory.

> **Status:** Private development build for the OneMind platform. Not ready for public distribution.

## Core capabilities

- Connect Roblox Studio through its built-in MCP server
- Read the game tree, instances, scripts, and Studio output
- Create and update Luau scripts and Roblox instances
- Coordinate Builder, Map Designer, UI Designer, Reviewer, and QA roles
- Prevent multiple AI models from editing Studio at the same time
- Save checkpoints and restore recent script changes
- Preserve project memory between sessions
- Recover automatically from bridge and Studio connection interruptions

## Architecture

```text
OneMind AI Platform
        ↓
OneMind Connector
        ↓
Local MCP Bridge
        ↓
Roblox Studio
```

## Local setup

1. Download or clone this repository.
2. Open Roblox Studio and load a place.
3. In Roblox Studio Assistant settings, enable Studio as an MCP server.
4. Run `start.bat` and keep its window open.
5. Load the extension folder in a Chromium-based browser using Developer Mode.
6. Start a supported AI session or connect through the OneMind platform.

## Safety

- The connector runs locally on the user's computer.
- Roblox Studio commands are sent only through the local MCP bridge.
- AI provider keys are not bundled with the connector.
- Write operations should be reviewed and checkpointed before large changes.
- Never commit API keys, access tokens, passwords, or private user data to this repository.

## Development direction

Current work is focused on:

- OneMind account and project pairing
- Secure connector session tokens
- Real-time heartbeat and Studio status
- OneMind web-platform integration
- Approval controls for write operations
- Reliable checkpoint and rollback workflows
- Packaged Windows installation and automatic updates

## License and attribution

This project is distributed under the **GNU General Public License v3.0 or later**. See `LICENSE` for the complete license text.

OneMind Connector is based on and adapted from the open-source **ZeroScript** project. Existing copyright notices, license headers, and attribution must remain intact in redistributed versions.

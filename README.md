# OneMind Connector

OneMind Connector connects supported AI assistants to Roblox Studio through a local MCP bridge. It can inspect and edit scripts, read the game tree, run Luau, coordinate multiple model roles, create checkpoints, restore changes, and assist with playtesting.

## Status

This repository is the connector layer for the private OneMind AI platform. The web platform provides project management, shared memory, model orchestration, usage limits, and premium automation. The connector runs locally and carries approved actions between the platform or supported AI assistants and Roblox Studio.

## Main capabilities

- Roblox Studio MCP connection
- Script and instance inspection
- Luau execution
- Safe editing workflows
- Multi-model Builder, Map Designer, UI Designer, Reviewer, and QA roles
- Shared project memory
- Checkpoint and rollback support
- Automatic bridge reconnection

## Development status

The current branch is being rebranded and adapted for OneMind. Compatibility with existing ZeroScript installations and stored project data is being preserved during migration.

## License and attribution

OneMind Connector is based on the open-source ZeroScript project and remains licensed under GPL-3.0-or-later. Original copyright notices, license text, and attribution must remain intact in redistributed versions.

This repository contains private product-development work and is not the public OneMind product page.

#!/usr/bin/env python3
"""Optional game-genre starter Recipes seeded into the Memory Vault."""
from __future__ import annotations

from typing import Any


STARTER_RECIPES: list[dict[str, Any]] = [
    {
        "id": "starter-simulator-loop",
        "name": "Simulator Core Loop",
        "category": "gameplay",
        "keywords": "simulator collect sell capacity upgrade rebirth world pet progression",
        "prompt": "Inspect the existing collect/earn, capacity, sell, upgrade, rebirth and world-unlock loop. Keep rewards server-authoritative, make the first session understandable, and preserve compatible currencies and remotes.",
        "inspect": ["main earning action", "capacity and sell flow", "upgrade curves", "rebirth reset", "world gates", "save schema"],
        "tests": ["first reward", "full capacity", "sell", "upgrade", "rebirth", "world unlock", "rejoin", "mobile"],
        "avoid": ["client-calculated rewards", "unbounded multipliers", "resetting paid or permanent unlocks", "full UI replacement"],
        "models": ["qwen", "deepseek", "gemini"],
        "risk": "high",
        "source": "starter",
    },
    {
        "id": "starter-tycoon-loop",
        "name": "Tycoon Purchase and Income Loop",
        "category": "gameplay",
        "keywords": "tycoon dropper button purchase income plot owner conveyor save progression",
        "prompt": "Inspect plot ownership, purchase buttons, income generation, dependency unlocks and persistence. Validate every purchase and payout on the server and isolate each player's plot state.",
        "inspect": ["plot assignment", "purchase dependency graph", "income source", "button state", "save/load", "cleanup on leave"],
        "tests": ["claim plot", "buy first item", "dependency unlock", "income payout", "second player isolation", "rejoin"],
        "avoid": ["client-owned price checks", "shared plot state", "duplicate payout connections", "destructive production data tests"],
        "models": ["qwen", "deepseek", "chatgpt"],
        "risk": "high",
        "source": "starter",
    },
    {
        "id": "starter-obby-loop",
        "name": "Obby Checkpoint and Respawn",
        "category": "gameplay",
        "keywords": "obby checkpoint stage respawn killbrick timer finish skip stage",
        "prompt": "Inspect checkpoint ordering, server stage validation, respawn placement, finish rewards and skip products. Keep stage state server-authoritative and make checkpoint feedback readable on mobile.",
        "inspect": ["checkpoint order", "Touched handlers", "respawn path", "finish reward", "stage save", "skip purchase"],
        "tests": ["touch checkpoint", "death and respawn", "skip ahead exploit", "finish", "rejoin", "two players"],
        "avoid": ["client-set stage", "duplicate Touched rewards", "respawning inside hazards", "granting skip without receipt verification"],
        "models": ["qwen", "deepseek", "gemini"],
        "risk": "high",
        "source": "starter",
    },
    {
        "id": "starter-clicker-loop",
        "name": "Clicker and Incremental Loop",
        "category": "economy",
        "keywords": "clicker tap incremental auto click rebirth upgrade multiplier offline reward",
        "prompt": "Inspect click validation, rate limits, auto-click entitlement, upgrade/rebirth curves, offline rewards and large-number formatting. Keep authoritative totals on the server.",
        "inspect": ["click remote", "rate limit", "auto-click rules", "upgrade curve", "rebirth", "offline reward", "formatting"],
        "tests": ["normal clicks", "spam", "auto click", "upgrade", "rebirth", "rejoin", "large values"],
        "avoid": ["one remote reward per unrestricted client click", "floating-point display leakage", "offline reward time spoofing"],
        "models": ["qwen", "deepseek", "chatgpt"],
        "risk": "high",
        "source": "starter",
    },
    {
        "id": "starter-pet-system",
        "name": "Pet Hatch, Equip and Follow",
        "category": "gameplay",
        "keywords": "pet egg hatch equip follow inventory rarity boost delete trade",
        "prompt": "Inspect pet data, egg probabilities, server-side hatch cost/reward, equip limits, boost calculation, follow rendering and persistence. Keep cosmetic following client-efficient while ownership remains server-authoritative.",
        "inspect": ["pet schema", "egg table", "hatch remote", "equip limits", "boost aggregation", "follow controller", "save/load"],
        "tests": ["single hatch", "multi hatch entitlement", "insufficient currency", "equip limit", "delete", "rejoin", "many pets performance"],
        "avoid": ["client-selected hatch result", "server Heartbeat per pet", "changing stable pet IDs", "duplicate boost application"],
        "models": ["qwen", "deepseek", "gemini"],
        "risk": "high",
        "source": "starter",
    },
]


def install(vault: Any) -> None:
    for recipe in STARTER_RECIPES:
        vault.save_recipe({**recipe, "scope": "global", "project_key": "", "enabled": True})

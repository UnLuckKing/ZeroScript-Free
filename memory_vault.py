#!/usr/bin/env python3
"""Persistent learning, recipe and project-memory engine for ZeroScript Hub.

This module does not retrain browser models or allow them to rewrite ZeroScript.
It learns only from verified task outcomes and improves recipe selection, context
selection, provider recommendations and regression coverage.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
WORD_RE = re.compile(r"[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]{3,}")
STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "then", "only", "current",
    "bir", "ve", "ile", "için", "olan", "olarak", "sonra", "şunu", "bunu", "oyun", "game",
    "fix", "make", "create", "build", "düzelt", "yap", "oluştur", "ekle", "kontrol", "test",
}


def now_ms() -> int:
    return int(time.time() * 1000)


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def loads(value: str | None, default: Any) -> Any:
    try:
        parsed = json.loads(value or "")
        return parsed
    except Exception:
        return default


def tokens(text: str) -> set[str]:
    return {
        word.lower()
        for word in WORD_RE.findall(str(text or ""))
        if word.lower() not in STOP_WORDS
    }


def keyword_text(values: Iterable[str]) -> str:
    return " ".join(sorted(tokens(" ".join(str(value or "") for value in values))))


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha1("\n".join(parts).encode("utf-8", errors="replace")).hexdigest()[:16]
    return f"{prefix}-{digest}"


BUILTIN_RECIPES: list[dict[str, Any]] = [
    {
        "id": "builtin-ui-mobile",
        "name": "Modern Responsive UI",
        "category": "ui",
        "keywords": "ui gui hud mobile responsive safe area text button menu panel inventory shop",
        "prompt": "Inspect the existing UI hierarchy before editing. Preserve working controllers and remotes. Improve hierarchy, spacing, readable typography, visual feedback, desktop/mobile scaling and safe-area behavior without replacing the entire PlayerGui.",
        "inspect": ["StarterGui hierarchy", "UI controllers", "existing navigation and remotes", "desktop and mobile captures"],
        "tests": ["desktop viewport", "mobile viewport", "every changed button", "open/close/reopen", "Output clean"],
        "avoid": ["bulk replacing PlayerGui", "renaming working remotes", "fixed pixel-only layouts", "claiming visual success without captures"],
        "models": ["gemini", "chatgpt", "claude"],
        "risk": "medium",
    },
    {
        "id": "builtin-rng-system",
        "name": "Server-Authoritative RNG System",
        "category": "rng",
        "keywords": "rng roll aura rarity pity luck auto roll quick roll inventory equip discovery",
        "prompt": "Preserve existing public APIs and keep roll results server-authoritative. Validate cooldowns, pity, luck, duplicates, inventory capacity, equip state and auto-roll. Keep display formatting separate from stored integer values.",
        "inspect": ["roll service", "rarity data", "inventory/equip flow", "pity and luck state", "remote validation"],
        "tests": ["normal roll", "quick roll", "auto roll", "pity boundary", "duplicate result", "rejoin persistence", "Output clean"],
        "avoid": ["client-selected rewards", "floating-point pity counters", "unbounded remote spam", "deleting existing aura data"],
        "models": ["qwen", "deepseek", "chatgpt"],
        "risk": "high",
    },
    {
        "id": "builtin-inventory",
        "name": "Inventory and Equip Flow",
        "category": "gameplay",
        "keywords": "inventory item aura pet equip unequip delete auto delete equip best capacity",
        "prompt": "Inspect the existing inventory schema and remotes. Keep ownership and equip decisions on the server, preserve compatible item IDs, and update UI incrementally.",
        "inspect": ["inventory schema", "server ownership checks", "equip limits", "UI list rendering"],
        "tests": ["add item", "duplicate item", "equip/unequip", "delete", "equip best", "rejoin", "mobile buttons"],
        "avoid": ["trusting client item data", "changing item IDs", "rebuilding the whole UI", "losing duplicate counts"],
        "models": ["qwen", "deepseek"],
        "risk": "high",
    },
    {
        "id": "builtin-shop-receipts",
        "name": "Secure Shop and Purchases",
        "category": "monetization",
        "keywords": "shop gamepass developer product purchase receipt processreceipt robux monetization",
        "prompt": "Audit product mapping, PromptProductPurchase/PromptGamePassPurchase use, ProcessReceipt ownership, idempotency and server-side grant logic. Never grant currency solely from a client request.",
        "inspect": ["ProductService", "ProcessReceipt", "gamepass checks", "purchase UI", "grant persistence"],
        "tests": ["successful purchase", "cancelled purchase", "duplicate receipt", "rejoin", "invalid product ID", "mobile UI"],
        "avoid": ["client-side grants", "returning PurchaseGranted before durable grant", "hard-coded placeholder IDs presented as ready"],
        "models": ["qwen", "deepseek", "claude"],
        "risk": "critical",
    },
    {
        "id": "builtin-datastore",
        "name": "DataStore Reliability Lab",
        "category": "data",
        "keywords": "datastore save load updateasync session lock migration profile data rejoin",
        "prompt": "Inspect the actual data schema and save lifecycle. Prefer UpdateAsync where concurrent writes matter, validate defaults and migrations, avoid production-data destructive tests, and preserve existing compatible fields.",
        "inspect": ["schema/defaults", "load/save lifecycle", "session ownership", "shutdown handling", "migration path"],
        "tests": ["first join", "rejoin", "save failure", "old schema migration", "two-server conflict reasoning", "shutdown path"],
        "avoid": ["blind SetAsync overwrite", "testing against production player data", "dropping unknown fields", "saving on every frame"],
        "models": ["qwen", "deepseek", "claude"],
        "risk": "critical",
    },
    {
        "id": "builtin-remote-security",
        "name": "Remote Security Audit",
        "category": "security",
        "keywords": "remoteevent remotefunction exploit validation rate limit spam server authority security",
        "prompt": "Enumerate server remote handlers and verify type, range, ownership, state, cooldown and idempotency checks. Inspect handlers before safe fuzz tests and keep important state server-authoritative.",
        "inspect": ["all remote handlers", "client trust boundaries", "ownership checks", "rate limits", "reward paths"],
        "tests": ["wrong type", "nil", "negative value", "oversized value", "invalid ID", "rapid spam", "duplicate grant"],
        "avoid": ["destructive production tests", "security through hidden remote names", "client-calculated currency"],
        "models": ["qwen", "deepseek", "claude"],
        "risk": "critical",
    },
    {
        "id": "builtin-economy",
        "name": "Economy Balance and Simulation",
        "category": "economy",
        "keywords": "economy currency coins gems upgrade rebirth progression price reward multiplier balance",
        "prompt": "Model the actual earning and spending loops, identify dead zones, runaway multipliers and missing sinks, then make targeted data changes without rewriting unrelated systems.",
        "inspect": ["income sources", "price curves", "multipliers", "rebirth loop", "currency sinks", "monetization overlap"],
        "tests": ["first upgrade time", "first rebirth time", "midgame progression", "large-number formatting", "negative/overflow protection"],
        "avoid": ["guessing without reading values", "pay-to-win-only progression", "unbounded exponential multipliers"],
        "models": ["chatgpt", "qwen", "deepseek"],
        "risk": "high",
    },
    {
        "id": "builtin-map-polish",
        "name": "Popular-Game Map Polish",
        "category": "map",
        "keywords": "map world lobby terrain lighting spawn zone portal environment polish vfx",
        "prompt": "Inspect current gameplay anchors before moving anything. Build a compact readable spawn view, clear paths, landmarks, signage, lighting and performance-safe decoration while preserving gameplay objects.",
        "inspect": ["spawn orientation", "main action", "zones and paths", "lighting", "part count", "streaming/performance"],
        "tests": ["spawn view", "walk main loop", "respawn", "portal/zone access", "night/readability", "Output clean"],
        "avoid": ["bulk deleting Workspace", "moving scripted objects without inspection", "unscanned Toolbox models", "excessive unanchored parts"],
        "models": ["gemini", "chatgpt", "claude"],
        "risk": "high",
    },
    {
        "id": "builtin-vfx",
        "name": "Readable Reward VFX",
        "category": "vfx",
        "keywords": "vfx effect particle beam trail tween camera shake reward aura equip animation",
        "prompt": "Add readable, performance-capped feedback tied to verified gameplay events. Preserve accessibility, avoid permanent emitters and keep server state independent from client visuals.",
        "inspect": ["reward/equip events", "existing effects", "device performance", "cleanup lifecycle"],
        "tests": ["effect trigger", "rapid repeated trigger", "cleanup", "mobile performance", "visual hierarchy"],
        "avoid": ["infinite particles", "server-owned purely visual loops", "camera effects without opt-out", "reward logic inside VFX"],
        "models": ["gemini", "chatgpt"],
        "risk": "medium",
    },
    {
        "id": "builtin-onboarding",
        "name": "First-Session Onboarding",
        "category": "onboarding",
        "keywords": "onboarding tutorial new player first join arrow hint objective quest guidance",
        "prompt": "Guide the player through the existing main loop with minimal interruption. Detect completed steps from server state, make hints dismissible and avoid blocking experienced players.",
        "inspect": ["spawn view", "first action", "first reward", "shop/upgrade discovery", "save flags"],
        "tests": ["new player", "returning player", "skip/dismiss", "respawn", "mobile", "rejoin persistence"],
        "avoid": ["long modal walls", "client-only completion state", "tutorial that blocks gameplay"],
        "models": ["gemini", "chatgpt", "qwen"],
        "risk": "medium",
    },
    {
        "id": "builtin-output-repair",
        "name": "Output Root-Cause Repair",
        "category": "debug",
        "keywords": "output error warning nil infinite yield traceback bug runtime console",
        "prompt": "Reproduce each current error, group duplicates, inspect the exact source and fix the root cause without hiding warnings or wrapping everything in silent pcall.",
        "inspect": ["current Output", "stack trace", "affected script", "callers and lifecycle"],
        "tests": ["reproduce before", "affected path after", "respawn/rejoin when relevant", "Output clean"],
        "avoid": ["deleting the failing feature", "blanket pcall", "clearing Output as proof", "inventing missing paths"],
        "models": ["deepseek", "qwen", "chatgpt"],
        "risk": "medium",
    },
    {
        "id": "builtin-performance",
        "name": "Performance Optimization",
        "category": "performance",
        "keywords": "performance lag fps memory loop heartbeat renderstepped parts particles optimization",
        "prompt": "Measure and inspect before changing. Target verified hot loops, excessive instances, physics, particles and network traffic while preserving visible quality and gameplay behavior.",
        "inspect": ["tight loops", "connections", "instance counts", "physics", "particles", "network frequency"],
        "tests": ["main gameplay loop", "respawn", "multiple effects", "memory/connection cleanup", "Output clean"],
        "avoid": ["removing features without evidence", "one loop per instance", "unbounded RenderStepped work"],
        "models": ["qwen", "deepseek", "chatgpt"],
        "risk": "high",
    },
    {
        "id": "builtin-release",
        "name": "Release Readiness",
        "category": "release",
        "keywords": "release publish production readiness qa regression mobile purchases datastore security",
        "prompt": "Run a release-focused audit using real playtest evidence. Fix verified blockers only, preserve working systems, and clearly separate user-only publishing steps from completed technical work.",
        "inspect": ["main loop", "onboarding", "mobile UI", "respawn", "Output", "purchases", "DataStores", "security", "performance"],
        "tests": ["new session", "returning session", "respawn", "desktop/mobile", "purchase paths", "save/load", "Output clean"],
        "avoid": ["claiming untested PASS", "automatic production publishing", "using live player data for destructive tests"],
        "models": ["chatgpt", "claude", "qwen"],
        "risk": "critical",
    },
]


class MemoryVault:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        with self._db:
            self._db.execute("PRAGMA journal_mode=WAL")
            self._db.execute("PRAGMA synchronous=NORMAL")
            self._db.execute("PRAGMA foreign_keys=ON")
        self._create_schema()
        self.seed_builtin_recipes()

    def close(self) -> None:
        with self._lock:
            self._db.close()

    def _create_schema(self) -> None:
        with self._lock, self._db:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS projects(
                    project_key TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', place_id TEXT NOT NULL DEFAULT '',
                    game_id TEXT NOT NULL DEFAULT '', first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
                    profile_json TEXT NOT NULL DEFAULT '{}'
                );
                CREATE TABLE IF NOT EXISTS recipes(
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'global',
                    project_key TEXT NOT NULL DEFAULT '', keywords TEXT NOT NULL DEFAULT '', prompt TEXT NOT NULL,
                    inspect_json TEXT NOT NULL DEFAULT '[]', tests_json TEXT NOT NULL DEFAULT '[]', avoid_json TEXT NOT NULL DEFAULT '[]',
                    models_json TEXT NOT NULL DEFAULT '[]', risk TEXT NOT NULL DEFAULT 'medium', source TEXT NOT NULL DEFAULT 'custom',
                    enabled INTEGER NOT NULL DEFAULT 1, pinned INTEGER NOT NULL DEFAULT 0, usage_count INTEGER NOT NULL DEFAULT 0,
                    success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0,
                    score REAL NOT NULL DEFAULT 0.5, last_used INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tasks(
                    task_id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', original_goal TEXT NOT NULL,
                    enriched_goal TEXT NOT NULL DEFAULT '', recipe_ids_json TEXT NOT NULL DEFAULT '[]', category TEXT NOT NULL DEFAULT 'general',
                    provider TEXT NOT NULL DEFAULT '', quality_mode TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'queued',
                    started_at INTEGER NOT NULL, completed_at INTEGER NOT NULL DEFAULT 0, score REAL NOT NULL DEFAULT 0,
                    evidence_json TEXT NOT NULL DEFAULT '{}', error TEXT NOT NULL DEFAULT ''
                );
                CREATE TABLE IF NOT EXISTS lessons(
                    id INTEGER PRIMARY KEY AUTOINCREMENT, project_key TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT 'project',
                    category TEXT NOT NULL DEFAULT 'general', title TEXT NOT NULL, summary TEXT NOT NULL,
                    keywords TEXT NOT NULL DEFAULT '', paths_json TEXT NOT NULL DEFAULT '[]', tests_json TEXT NOT NULL DEFAULT '[]',
                    outcome TEXT NOT NULL DEFAULT 'success', confidence REAL NOT NULL DEFAULT 0.5,
                    source_task_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, last_verified INTEGER NOT NULL,
                    use_count INTEGER NOT NULL DEFAULT 0, UNIQUE(project_key, title, source_task_id)
                );
                CREATE TABLE IF NOT EXISTS patterns(
                    id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT 'global',
                    category TEXT NOT NULL DEFAULT 'general', name TEXT NOT NULL, instructions TEXT NOT NULL,
                    keywords TEXT NOT NULL DEFAULT '', success_count INTEGER NOT NULL DEFAULT 0,
                    failure_count INTEGER NOT NULL DEFAULT 0, confidence REAL NOT NULL DEFAULT 0.5,
                    last_used INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS provider_scores(
                    project_key TEXT NOT NULL DEFAULT '', provider TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
                    attempts INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, total_ms INTEGER NOT NULL DEFAULT 0,
                    errors INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
                    PRIMARY KEY(project_key, provider, category)
                );
                CREATE TABLE IF NOT EXISTS suggestions(
                    id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, category TEXT NOT NULL,
                    recipe_json TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category, enabled, score DESC);
                CREATE INDEX IF NOT EXISTS idx_lessons_project ON lessons(project_key, outcome, confidence DESC);
                CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_key, started_at DESC);
                """
            )
            self._db.execute("INSERT OR REPLACE INTO metadata(key,value) VALUES('schema_version',?)", (str(SCHEMA_VERSION),))

    def seed_builtin_recipes(self) -> None:
        timestamp = now_ms()
        with self._lock, self._db:
            for recipe in BUILTIN_RECIPES:
                self._db.execute(
                    """
                    INSERT INTO recipes(id,name,category,scope,project_key,keywords,prompt,inspect_json,tests_json,avoid_json,
                      models_json,risk,source,enabled,pinned,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?)
                    ON CONFLICT(id) DO UPDATE SET
                      name=excluded.name, category=excluded.category, keywords=excluded.keywords, prompt=excluded.prompt,
                      inspect_json=excluded.inspect_json, tests_json=excluded.tests_json, avoid_json=excluded.avoid_json,
                      models_json=excluded.models_json, risk=excluded.risk, updated_at=excluded.updated_at
                    """,
                    (
                        recipe["id"], recipe["name"], recipe["category"], "global", "", recipe["keywords"], recipe["prompt"],
                        dumps(recipe["inspect"]), dumps(recipe["tests"]), dumps(recipe["avoid"]), dumps(recipe["models"]),
                        recipe["risk"], "builtin", timestamp, timestamp,
                    ),
                )

    def upsert_project(self, project: dict[str, Any] | None) -> str:
        project = project or {}
        place_id = str(project.get("placeId") or "0")
        game_id = str(project.get("gameId") or "0")
        name = str(project.get("name") or "Unknown project").strip()
        key = str(project.get("key") or f"{place_id}:{game_id}")
        if key in {"0:0", ":", ""}:
            key = "global"
        timestamp = now_ms()
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO projects(project_key,name,place_id,game_id,first_seen,last_seen)
                VALUES(?,?,?,?,?,?)
                ON CONFLICT(project_key) DO UPDATE SET name=excluded.name,place_id=excluded.place_id,
                  game_id=excluded.game_id,last_seen=excluded.last_seen
                """,
                (key, name, place_id, game_id, timestamp, timestamp),
            )
        return key

    @staticmethod
    def classify(goal: str) -> str:
        value = str(goal or "").lower()
        rules = [
            ("release", r"release|publish|yayın|production"),
            ("security", r"remote|exploit|security|güvenlik"),
            ("data", r"datastore|save|load|migration|veri"),
            ("monetization", r"shop|gamepass|developer product|receipt|purchase|satın"),
            ("rng", r"rng|roll|aura|pity|luck|rarity"),
            ("economy", r"economy|currency|coin|gem|rebirth|upgrade|ekonomi"),
            ("ui", r"ui|gui|hud|button|mobile|responsive|arayüz|buton"),
            ("map", r"map|world|terrain|lobby|lighting|spawn|harita|dünya"),
            ("vfx", r"vfx|particle|beam|trail|effect|efekt"),
            ("onboarding", r"tutorial|onboarding|new player|ilk giriş|rehber"),
            ("performance", r"performance|lag|fps|optimi|memory"),
            ("debug", r"output|error|warning|bug|hata"),
            ("gameplay", r"inventory|equip|pet|quest|combat|gameplay"),
        ]
        for category, pattern in rules:
            if re.search(pattern, value):
                return category
        return "general"

    def _row_recipe(self, row: sqlite3.Row) -> dict[str, Any]:
        value = dict(row)
        for key in ("inspect_json", "tests_json", "avoid_json", "models_json"):
            value[key.removesuffix("_json")] = loads(value.pop(key, "[]"), [])
        value["enabled"] = bool(value.get("enabled"))
        value["pinned"] = bool(value.get("pinned"))
        attempts = int(value.get("success_count", 0)) + int(value.get("failure_count", 0))
        value["success_rate"] = round(int(value.get("success_count", 0)) / attempts * 100) if attempts else 0
        return value

    def list_recipes(self, search: str = "", category: str = "", project_key: str = "") -> list[dict[str, Any]]:
        clauses = ["enabled=1"]
        params: list[Any] = []
        if search.strip():
            clauses.append("(lower(name) LIKE ? OR lower(keywords) LIKE ? OR lower(prompt) LIKE ?)")
            needle = f"%{search.strip().lower()}%"
            params.extend([needle, needle, needle])
        if category and category != "all":
            clauses.append("category=?")
            params.append(category)
        if project_key:
            clauses.append("(scope='global' OR project_key=?)")
            params.append(project_key)
        query = f"SELECT * FROM recipes WHERE {' AND '.join(clauses)} ORDER BY pinned DESC, score DESC, usage_count DESC, name"
        with self._lock:
            return [self._row_recipe(row) for row in self._db.execute(query, params).fetchall()]

    def get_recipe(self, recipe_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        return self._row_recipe(row) if row else None

    def save_recipe(self, value: dict[str, Any]) -> str:
        timestamp = now_ms()
        name = str(value.get("name") or "Custom Recipe").strip()
        recipe_id = str(value.get("id") or stable_id("recipe", name, str(timestamp)))
        category = str(value.get("category") or self.classify(value.get("prompt", "")))
        inspect = value.get("inspect") if isinstance(value.get("inspect"), list) else []
        tests = value.get("tests") if isinstance(value.get("tests"), list) else []
        avoid = value.get("avoid") if isinstance(value.get("avoid"), list) else []
        models = value.get("models") if isinstance(value.get("models"), list) else []
        keywords_value = str(value.get("keywords") or keyword_text([name, category, value.get("prompt", ""), *inspect, *tests]))
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO recipes(id,name,category,scope,project_key,keywords,prompt,inspect_json,tests_json,avoid_json,
                  models_json,risk,source,enabled,pinned,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,scope=excluded.scope,
                  project_key=excluded.project_key,keywords=excluded.keywords,prompt=excluded.prompt,
                  inspect_json=excluded.inspect_json,tests_json=excluded.tests_json,avoid_json=excluded.avoid_json,
                  models_json=excluded.models_json,risk=excluded.risk,enabled=excluded.enabled,pinned=excluded.pinned,
                  updated_at=excluded.updated_at
                """,
                (
                    recipe_id, name, category, str(value.get("scope") or "global"), str(value.get("project_key") or ""),
                    keywords_value, str(value.get("prompt") or ""), dumps(inspect), dumps(tests), dumps(avoid), dumps(models),
                    str(value.get("risk") or "medium"), str(value.get("source") or "custom"),
                    1 if value.get("enabled", True) else 0, 1 if value.get("pinned", False) else 0,
                    int(value.get("created_at") or timestamp), timestamp,
                ),
            )
        return recipe_id

    def disable_recipe(self, recipe_id: str) -> None:
        with self._lock, self._db:
            self._db.execute("UPDATE recipes SET enabled=0,updated_at=? WHERE id=? AND source!='builtin'", (now_ms(), recipe_id))

    def search_recipes(self, goal: str, project_key: str, limit: int = 3) -> list[dict[str, Any]]:
        goal_tokens = tokens(goal)
        category = self.classify(goal)
        candidates = self.list_recipes(project_key=project_key)
        ranked: list[tuple[float, dict[str, Any]]] = []
        for recipe in candidates:
            recipe_tokens = tokens(" ".join([recipe.get("name", ""), recipe.get("keywords", ""), recipe.get("prompt", "")]))
            overlap = len(goal_tokens & recipe_tokens)
            category_bonus = 5.0 if recipe.get("category") == category else 0.0
            project_bonus = 2.5 if recipe.get("project_key") == project_key and project_key != "global" else 0.0
            pinned = 3.0 if recipe.get("pinned") else 0.0
            confidence = float(recipe.get("score", 0.5)) * 3.0
            rank = overlap * 1.5 + category_bonus + project_bonus + pinned + confidence
            if rank > 2.5:
                ranked.append((rank, recipe))
        ranked.sort(key=lambda item: (-item[0], -float(item[1].get("score", 0)), item[1].get("name", "")))
        return [recipe for _, recipe in ranked[:limit]]

    def _search_lessons(self, goal: str, project_key: str, outcome: str, limit: int) -> list[dict[str, Any]]:
        goal_tokens = tokens(goal)
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM lessons WHERE outcome=? AND (scope='global' OR project_key=?) ORDER BY confidence DESC,last_verified DESC LIMIT 200",
                (outcome, project_key),
            ).fetchall()
        ranked: list[tuple[float, dict[str, Any]]] = []
        timestamp = now_ms()
        for row in rows:
            value = dict(row)
            overlap = len(goal_tokens & tokens(f"{value['title']} {value['summary']} {value['keywords']}"))
            if overlap == 0 and value.get("category") != self.classify(goal):
                continue
            age_days = max(0.0, (timestamp - int(value.get("last_verified", timestamp))) / 86_400_000)
            freshness = max(0.2, 1.0 - min(age_days, 365) / 450)
            rank = overlap * 1.5 + float(value.get("confidence", 0.5)) * 3 * freshness
            ranked.append((rank, value))
        ranked.sort(key=lambda item: -item[0])
        selected = [value for _, value in ranked[:limit]]
        if selected:
            ids = [int(item["id"]) for item in selected]
            placeholders = ",".join("?" for _ in ids)
            with self._lock, self._db:
                self._db.execute(f"UPDATE lessons SET use_count=use_count+1 WHERE id IN ({placeholders})", ids)
        return selected

    def provider_recommendation(self, category: str, project_key: str, live: list[dict[str, Any]] | None = None) -> str:
        live = live or []
        ranked: list[tuple[float, str]] = []
        for entry in live:
            attempts = int(entry.get("attempts", 0) or 0)
            success = float(entry.get("successRate", 0) or 0) / 100
            average = max(1, int(entry.get("averageMs", 0) or 0))
            error_penalty = int(entry.get("toolErrors", 0) or 0) + int(entry.get("contextFailures", 0) or 0)
            score = success * 10 + min(attempts, 10) * 0.1 - min(average / 600000, 2) - min(error_penalty * 0.2, 3)
            ranked.append((score, str(entry.get("provider") or "")))
        if ranked:
            ranked.sort(reverse=True)
            if ranked[0][1]:
                return ranked[0][1]
        with self._lock:
            row = self._db.execute(
                """
                SELECT provider,attempts,completed,total_ms,errors FROM provider_scores
                WHERE (project_key=? OR project_key='global') AND (category=? OR category='general')
                ORDER BY CASE WHEN attempts=0 THEN 0 ELSE CAST(completed AS REAL)/attempts END DESC,
                         errors ASC,total_ms/CASE WHEN attempts=0 THEN 1 ELSE attempts END ASC LIMIT 1
                """,
                (project_key, category),
            ).fetchone()
        return str(row["provider"]) if row else "auto"

    def build_context(self, goal: str, project_key: str, provider_table: list[dict[str, Any]] | None = None, max_chars: int = 6200) -> dict[str, Any]:
        recipes = self.search_recipes(goal, project_key, 3)
        successes = self._search_lessons(goal, project_key, "success", 5)
        failures = self._search_lessons(goal, project_key, "failure", 4)
        category = self.classify(goal)
        provider = self.provider_recommendation(category, project_key, provider_table)
        lines = ["ZEROSCRIPT LEARNING CONTEXT", f"Project: {project_key}", f"Category: {category}", f"Recommended provider: {provider}"]
        if recipes:
            lines.append("\nRECIPES")
            for recipe in recipes:
                lines.append(f"\n[{recipe['name']}] risk={recipe['risk']} success={recipe['success_rate']}% uses={recipe['usage_count']}")
                lines.append(str(recipe["prompt"]))
                if recipe.get("inspect"):
                    lines.append("Inspect: " + "; ".join(map(str, recipe["inspect"][:6])))
                if recipe.get("tests"):
                    lines.append("Required tests: " + "; ".join(map(str, recipe["tests"][:7])))
                if recipe.get("avoid"):
                    lines.append("Do not: " + "; ".join(map(str, recipe["avoid"][:6])))
        if successes:
            lines.append("\nRELEVANT VERIFIED LESSONS")
            lines.extend(f"- {item['summary']}" for item in successes)
        if failures:
            lines.append("\nKNOWN FAILURES — DO NOT REPEAT")
            lines.extend(f"- {item['summary']}" for item in failures)
        lines.append("\nUse this memory as guidance, not as proof. Inspect the actual Studio state and report genuine test evidence.")
        context = "\n".join(lines)
        if len(context) > max_chars:
            context = context[:max_chars].rsplit("\n", 1)[0] + "\n[context trimmed]"
        return {
            "context": context,
            "recipe_ids": [recipe["id"] for recipe in recipes],
            "recipe_names": [recipe["name"] for recipe in recipes],
            "category": category,
            "provider": provider,
            "lessons": len(successes),
            "failures": len(failures),
        }

    def begin_task(self, task_id: str, project_key: str, original_goal: str, enriched_goal: str, recipe_ids: list[str], category: str, quality_mode: str = "") -> None:
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO tasks(task_id,project_key,original_goal,enriched_goal,recipe_ids_json,category,quality_mode,status,started_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                ON CONFLICT(task_id) DO UPDATE SET project_key=excluded.project_key,original_goal=excluded.original_goal,
                  enriched_goal=excluded.enriched_goal,recipe_ids_json=excluded.recipe_ids_json,category=excluded.category,
                  quality_mode=excluded.quality_mode
                """,
                (task_id, project_key, original_goal, enriched_goal, dumps(recipe_ids), category, quality_mode, "running", now_ms()),
            )
            if recipe_ids:
                placeholders = ",".join("?" for _ in recipe_ids)
                self._db.execute(f"UPDATE recipes SET usage_count=usage_count+1,last_used=?,updated_at=? WHERE id IN ({placeholders})", [now_ms(), now_ms(), *recipe_ids])

    def ingest_provider_table(self, project_key: str, category: str, entries: list[dict[str, Any]]) -> None:
        timestamp = now_ms()
        with self._lock, self._db:
            for entry in entries or []:
                provider = str(entry.get("provider") or "").strip()
                if not provider:
                    continue
                self._db.execute(
                    """
                    INSERT INTO provider_scores(project_key,provider,category,attempts,completed,total_ms,errors,updated_at)
                    VALUES(?,?,?,?,?,?,?,?)
                    ON CONFLICT(project_key,provider,category) DO UPDATE SET attempts=excluded.attempts,
                      completed=excluded.completed,total_ms=excluded.total_ms,errors=excluded.errors,updated_at=excluded.updated_at
                    """,
                    (
                        project_key, provider, category, int(entry.get("attempts", 0) or 0), int(entry.get("completed", 0) or 0),
                        int(entry.get("averageMs", 0) or 0) * max(1, int(entry.get("attempts", 0) or 0)),
                        int(entry.get("toolErrors", 0) or 0) + int(entry.get("contextFailures", 0) or 0), timestamp,
                    ),
                )

    def _score_outcome(self, status: str, snapshot: dict[str, Any]) -> float:
        score = 0.0
        if status == "done":
            score += 45
        elif status == "failed":
            score -= 25
        elif status == "cancelled":
            score -= 10
        verified = snapshot.get("verified") or []
        regression = snapshot.get("regression") or []
        changed = snapshot.get("changedPaths") or []
        output = snapshot.get("outputErrors") or []
        reports = snapshot.get("reports") or []
        score += min(len(verified) * 5, 20)
        score += min(len(regression) * 3, 12)
        score += min(len(changed) * 1.5, 9)
        score += 10 if reports else 0
        score += 12 if status == "done" and not output else -min(len(output) * 4, 20)
        return max(0.0, min(100.0, score))

    def record_outcome(self, task_id: str, status: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            row = self._db.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
        if not row:
            return {"recorded": False, "reason": "unknown task"}
        task = dict(row)
        score = self._score_outcome(status, snapshot)
        output_errors = [str(item) for item in (snapshot.get("outputErrors") or []) if str(item).strip()]
        verified = [str(item) for item in (snapshot.get("verified") or []) if str(item).strip()]
        remaining = [str(item) for item in (snapshot.get("remaining") or []) if str(item).strip()]
        changed_paths = [str(item) for item in (snapshot.get("changedPaths") or []) if str(item).strip()]
        regression = [str(item) for item in (snapshot.get("regression") or []) if str(item).strip()]
        category = str(task.get("category") or self.classify(task.get("original_goal", "")))
        project_key = str(task.get("project_key") or "global")
        success = status == "done" and score >= 65 and not output_errors
        outcome = "success" if success else "failure"
        evidence = {
            "verified": verified[-20:], "remaining": remaining[-20:], "changedPaths": changed_paths[-30:],
            "regression": regression[-20:], "outputErrors": output_errors[-12:], "reports": (snapshot.get("reports") or [])[-4:],
        }
        error = str(snapshot.get("error") or "")
        with self._lock, self._db:
            self._db.execute(
                "UPDATE tasks SET status=?,provider=?,completed_at=?,score=?,evidence_json=?,error=? WHERE task_id=?",
                (status, str(snapshot.get("provider") or ""), now_ms(), score, dumps(evidence), error, task_id),
            )
            recipe_ids = loads(task.get("recipe_ids_json"), [])
            for recipe_id in recipe_ids:
                if success:
                    self._db.execute("UPDATE recipes SET success_count=success_count+1,score=min(0.99,score+0.04),updated_at=? WHERE id=?", (now_ms(), recipe_id))
                else:
                    self._db.execute("UPDATE recipes SET failure_count=failure_count+1,score=max(0.05,score-0.06),updated_at=? WHERE id=?", (now_ms(), recipe_id))

            title = f"{category.title()} lesson from {task_id}"
            if success:
                summary_parts = [f"Successful approach for: {task.get('original_goal', '')[:260]}."]
                if changed_paths:
                    summary_parts.append("Relevant paths: " + ", ".join(changed_paths[:8]) + ".")
                if verified:
                    summary_parts.append("Verified: " + " | ".join(verified[:5]) + ".")
                if regression:
                    summary_parts.append("Repeat tests: " + " | ".join(regression[:5]) + ".")
            else:
                summary_parts = [f"Do not repeat this unresolved approach for: {task.get('original_goal', '')[:260]}."]
                if error:
                    summary_parts.append("Failure: " + error[:500] + ".")
                if output_errors:
                    summary_parts.append("Output remained: " + " | ".join(output_errors[:4]) + ".")
                if remaining:
                    summary_parts.append("Remaining: " + " | ".join(remaining[:5]) + ".")
            summary = " ".join(summary_parts)
            confidence = max(0.2, min(0.98, score / 100 if success else (100 - score) / 100))
            self._db.execute(
                """
                INSERT OR IGNORE INTO lessons(project_key,scope,category,title,summary,keywords,paths_json,tests_json,
                  outcome,confidence,source_task_id,created_at,last_verified)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    project_key, "project", category, title, summary,
                    keyword_text([task.get("original_goal", ""), category, *changed_paths, *verified, *remaining]),
                    dumps(changed_paths), dumps(regression or verified), outcome, confidence, task_id, now_ms(), now_ms(),
                ),
            )

            if success and score >= 80:
                pattern_id = stable_id("pattern", category, " ".join(sorted(tokens(task.get("original_goal", "")))))
                instructions = " ".join([summary, "Preserve working APIs and rerun the recorded regression evidence."])
                self._db.execute(
                    """
                    INSERT INTO patterns(id,project_key,scope,category,name,instructions,keywords,success_count,confidence,last_used,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(id) DO UPDATE SET success_count=success_count+1,
                      confidence=min(0.99,confidence+0.04),instructions=excluded.instructions,updated_at=excluded.updated_at
                    """,
                    (pattern_id, project_key, "project", category, f"Learned {category} pattern", instructions,
                     keyword_text([task.get("original_goal", ""), *changed_paths]), 1, confidence, now_ms(), now_ms()),
                )
                pattern = self._db.execute("SELECT success_count FROM patterns WHERE id=?", (pattern_id,)).fetchone()
                if pattern and int(pattern["success_count"]) >= 3:
                    suggestion_id = stable_id("suggestion", project_key, pattern_id)
                    recipe = {
                        "name": f"Learned {category.title()} Workflow",
                        "category": category,
                        "scope": "project",
                        "project_key": project_key,
                        "keywords": keyword_text([task.get("original_goal", ""), *changed_paths]),
                        "prompt": instructions,
                        "inspect": changed_paths[:8],
                        "tests": regression[:8] or verified[:8],
                        "avoid": [],
                        "models": [str(snapshot.get("provider") or "auto")],
                        "risk": "medium",
                        "source": "learned",
                    }
                    self._db.execute(
                        "INSERT OR IGNORE INTO suggestions(id,project_key,name,category,recipe_json,reason,status,created_at) VALUES(?,?,?,?,?,?,?,?)",
                        (suggestion_id, project_key, recipe["name"], category, dumps(recipe), "A similar verified workflow succeeded at least three times.", "pending", now_ms()),
                    )
        return {"recorded": True, "score": score, "outcome": outcome, "success": success}

    def list_lessons(self, project_key: str = "", limit: int = 100) -> list[dict[str, Any]]:
        query = "SELECT * FROM lessons"
        params: list[Any] = []
        if project_key:
            query += " WHERE project_key=? OR scope='global'"
            params.append(project_key)
        query += " ORDER BY last_verified DESC LIMIT ?"
        params.append(limit)
        with self._lock:
            return [dict(row) for row in self._db.execute(query, params).fetchall()]

    def list_suggestions(self, project_key: str = "") -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM suggestions WHERE status='pending' AND (project_key=? OR project_key='global') ORDER BY created_at DESC",
                (project_key,),
            ).fetchall()
        values = []
        for row in rows:
            value = dict(row)
            value["recipe"] = loads(value.pop("recipe_json", "{}"), {})
            values.append(value)
        return values

    def accept_suggestion(self, suggestion_id: str) -> str | None:
        with self._lock, self._db:
            row = self._db.execute("SELECT * FROM suggestions WHERE id=? AND status='pending'", (suggestion_id,)).fetchone()
            if not row:
                return None
            recipe = loads(row["recipe_json"], {})
            recipe["source"] = "learned"
            recipe["pinned"] = True
            recipe_id = self.save_recipe(recipe)
            self._db.execute("UPDATE suggestions SET status='accepted' WHERE id=?", (suggestion_id,))
            return recipe_id

    def dismiss_suggestion(self, suggestion_id: str) -> None:
        with self._lock, self._db:
            self._db.execute("UPDATE suggestions SET status='dismissed' WHERE id=?", (suggestion_id,))

    def mark_manual_feedback(self, task_id: str, positive: bool) -> None:
        with self._lock, self._db:
            row = self._db.execute("SELECT recipe_ids_json FROM tasks WHERE task_id=?", (task_id,)).fetchone()
            if not row:
                return
            for recipe_id in loads(row["recipe_ids_json"], []):
                delta = 0.05 if positive else -0.08
                self._db.execute("UPDATE recipes SET score=max(0.05,min(0.99,score+?)),updated_at=? WHERE id=?", (delta, now_ms(), recipe_id))
            self._db.execute("UPDATE tasks SET score=max(0,min(100,score+?)) WHERE task_id=?", (8 if positive else -12, task_id))

    def export_pack(self, path: Path, project_key: str = "") -> None:
        payload = {
            "format": "zeroscript-recipe-pack",
            "version": 1,
            "exportedAt": now_ms(),
            "projectKey": project_key,
            "recipes": [recipe for recipe in self.list_recipes(project_key=project_key) if recipe.get("source") != "builtin"],
        }
        Path(path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")

    def import_pack(self, path: Path) -> int:
        payload = json.loads(Path(path).read_text("utf-8"))
        if payload.get("format") != "zeroscript-recipe-pack" or not isinstance(payload.get("recipes"), list):
            raise ValueError("Invalid ZeroScript recipe pack")
        count = 0
        for recipe in payload["recipes"]:
            if not isinstance(recipe, dict):
                continue
            recipe = dict(recipe)
            recipe["id"] = stable_id("imported", str(recipe.get("name", "recipe")), str(now_ms()), str(count))
            recipe["source"] = "imported"
            recipe.pop("usage_count", None)
            recipe.pop("success_count", None)
            recipe.pop("failure_count", None)
            self.save_recipe(recipe)
            count += 1
        return count

    def stats(self, project_key: str = "") -> dict[str, Any]:
        with self._lock:
            recipes = self._db.execute("SELECT COUNT(*) AS n FROM recipes WHERE enabled=1").fetchone()["n"]
            lessons = self._db.execute("SELECT COUNT(*) AS n FROM lessons WHERE project_key=? OR scope='global'", (project_key,)).fetchone()["n"]
            successes = self._db.execute("SELECT COUNT(*) AS n FROM tasks WHERE status='done' AND score>=65 AND (project_key=? OR ?='')", (project_key, project_key)).fetchone()["n"]
            failures = self._db.execute("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('failed','cancelled') AND (project_key=? OR ?='')", (project_key, project_key)).fetchone()["n"]
            suggestions = self._db.execute("SELECT COUNT(*) AS n FROM suggestions WHERE status='pending' AND (project_key=? OR project_key='global')", (project_key,)).fetchone()["n"]
        return {"recipes": recipes, "lessons": lessons, "successes": successes, "failures": failures, "suggestions": suggestions}

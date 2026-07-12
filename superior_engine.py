#!/usr/bin/env python3
"""Deterministic decision, proof, genome and design engine for ZeroScript 1.30.

ZeroScript itself is not a language model. This engine makes safe local decisions
from explicit rules, the open project's recorded genome, Recipe scores and real
provider outcomes. Browser AI providers still perform creative implementation,
while this module decides scope, risk, required evidence and routing constraints.
"""
from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any

from memory_vault import MemoryVault

ENGINE_VERSION = 1

DEFAULT_DESIGN_DNA: dict[str, Any] = {
    "name": "ZeroScript Premium",
    "palette": {"background": "#0B1020", "surface": "#151B2D", "primary": "#7C5CFC", "secondary": "#36BFFA", "text": "#F5F7FF", "muted": "#9AA6BC"},
    "radius": 14,
    "spacing": 12,
    "buttonHeight": 48,
    "motionMs": 180,
    "rules": [
        "Prefer compact centered panels over full-screen overlays.",
        "Keep the main action visually dominant and navigation predictable.",
        "Use large mobile touch targets and respect safe areas.",
        "Preserve working controllers and existing public remotes.",
        "Use clear feedback states for loading, success, failure and disabled actions.",
    ],
}

CATEGORY_RULES: list[tuple[str, str]] = [
    ("release", r"release|publish|production|yayın|yayına hazır"),
    ("security", r"remote|exploit|security|güvenlik|hack|abuse"),
    ("data", r"datastore|save|load|migration|session lock|veri|kayıt"),
    ("monetization", r"shop|gamepass|developer product|receipt|purchase|robux|satın"),
    ("rng", r"rng|roll|aura|pity|luck|rarity"),
    ("economy", r"economy|currency|coin|gem|rebirth|upgrade|ekonomi"),
    ("ui", r"ui|gui|hud|button|mobile|responsive|menu|arayüz|buton"),
    ("map", r"map|world|terrain|lobby|lighting|spawn|harita|dünya"),
    ("vfx", r"vfx|particle|beam|trail|effect|efekt"),
    ("onboarding", r"tutorial|onboarding|new player|first session|ilk giriş|rehber"),
    ("performance", r"performance|lag|fps|memory|optimi|renderstepped|heartbeat"),
    ("debug", r"output|error|warning|bug|hata|nil|infinite yield"),
    ("gameplay", r"inventory|equip|pet|quest|combat|gameplay|tool|weapon"),
]

CRITICAL_RE = re.compile(r"datastore|processreceipt|purchase|currency|reward|admin|security|remote|migration|delete|wipe|publish|production|veri|satın|ekonomi", re.I)
HIGH_RE = re.compile(r"complete|entire|full|all systems|refactor|map|world|inventory|shop|ui|gui|komple|tüm oyun|her şeyi|baştan", re.I)
DESTRUCTIVE_RE = re.compile(r"delete|remove all|replace entire|wipe|reset|sil|tamamen kaldır|sıfırla", re.I)

CATEGORY_CONTRACTS: dict[str, list[str]] = {
    "ui": ["Desktop layout remains readable", "Mobile safe area and touch targets pass", "Every changed button opens/closes correctly", "Output remains clean"],
    "rng": ["Server produces the result", "Cooldown and rate limit are enforced", "Pity/luck update exactly once", "Inventory and rejoin persistence pass"],
    "data": ["First join defaults load", "Rejoin restores saved state", "Failure paths do not overwrite good data", "Migration preserves compatible fields"],
    "security": ["Wrong types and ranges are rejected", "Ownership is checked on the server", "Spam is rate-limited", "Duplicate rewards are idempotent"],
    "monetization": ["Client cannot grant purchases", "Receipt processing is idempotent", "Cancelled/invalid purchase grants nothing", "Durable grant survives rejoin"],
    "economy": ["No negative or overflow currency", "Early progression has a measurable target", "Multipliers remain bounded", "Server owns all balance changes"],
    "map": ["Spawn view and traversal work", "Gameplay anchors remain intact", "Respawn returns to a valid location", "Physics and part load remain reasonable"],
    "performance": ["Verified hotspot is measured before editing", "Main loop behavior is preserved", "Connections and instances clean up", "Output remains clean"],
    "debug": ["The error is reproduced before the fix", "Root cause is changed rather than hidden", "Affected path is replayed", "The same Output signature no longer appears"],
    "release": ["Main gameplay loop passes", "Respawn passes", "Desktop/mobile checks pass", "Purchases, data and Output have explicit evidence"],
    "gameplay": ["Main action succeeds", "Invalid state is rejected", "Respawn/rejoin does not corrupt state", "Output remains clean"],
    "general": ["Requested behavior is demonstrated", "Existing working APIs remain compatible", "Affected path is regression-tested", "Output remains clean"],
}


def now_ms() -> int:
    return int(time.time() * 1000)


def stable_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()[:20]


class SuperiorEngine:
    def __init__(self, vault: MemoryVault) -> None:
        self.vault = vault
        self._create_schema()

    @property
    def _db(self):
        return self.vault._db  # Internal companion module; shares the same WAL connection.

    @property
    def _lock(self):
        return self.vault._lock

    def _create_schema(self) -> None:
        with self._lock, self._db:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS superior_genomes(
                    project_key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, genome_json TEXT NOT NULL,
                    scanned_at INTEGER NOT NULL, source TEXT NOT NULL DEFAULT 'studio'
                );
                CREATE TABLE IF NOT EXISTS superior_design_dna(
                    project_key TEXT PRIMARY KEY, dna_json TEXT NOT NULL, updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS superior_contracts(
                    id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'general', steps_json TEXT NOT NULL DEFAULT '[]',
                    enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS superior_intents(
                    id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', goal TEXT NOT NULL,
                    spec_json TEXT NOT NULL, created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS superior_proofs(
                    task_id TEXT PRIMARY KEY, project_key TEXT NOT NULL DEFAULT '', proof_json TEXT NOT NULL,
                    score REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'unverified', updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS superior_live_metrics(
                    id INTEGER PRIMARY KEY AUTOINCREMENT, project_key TEXT NOT NULL DEFAULT '',
                    metrics_json TEXT NOT NULL, recommendations_json TEXT NOT NULL DEFAULT '[]', imported_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_superior_contract_project ON superior_contracts(project_key, enabled, category);
                """
            )

    def classify(self, goal: str) -> str:
        value = str(goal or "").lower()
        for category, pattern in CATEGORY_RULES:
            if re.search(pattern, value):
                return category
        return self.vault.classify(goal) or "general"

    def risk(self, goal: str, category: str, genome: dict[str, Any] | None = None) -> dict[str, Any]:
        text = str(goal or "")
        score = 12
        reasons: list[str] = []
        if category in {"security", "data", "monetization", "release"}:
            score += 48
            reasons.append(f"{category} work can affect player data or trust")
        elif category in {"economy", "map", "performance", "rng"}:
            score += 28
            reasons.append(f"{category} work has broad gameplay impact")
        elif category == "ui":
            score += 14
        if CRITICAL_RE.search(text):
            score += 24
            reasons.append("critical server/data/purchase keywords detected")
        if HIGH_RE.search(text):
            score += 18
            reasons.append("broad scope detected")
        if DESTRUCTIVE_RE.search(text):
            score += 28
            reasons.append("destructive wording detected")
        counts = (genome or {}).get("counts") or {}
        if int(counts.get("scripts", 0) or 0) > 100:
            score += 8
            reasons.append("large script graph")
        if int(counts.get("remotes", 0) or 0) > 30:
            score += 6
            reasons.append("large remote surface")
        score = max(0, min(100, score))
        level = "critical" if score >= 80 else "high" if score >= 55 else "medium" if score >= 30 else "low"
        return {"score": score, "level": level, "reasons": reasons or ["targeted local change"]}

    def _provider_rows(self, project_key: str, category: str) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._db.execute(
                "SELECT * FROM provider_scores WHERE category=? AND (project_key=? OR project_key='')",
                (category, project_key),
            ).fetchall()
        return [dict(row) for row in rows]

    def recommend_provider(self, project_key: str, category: str) -> dict[str, Any]:
        base: dict[str, list[str]] = {
            "ui": ["gemini", "chatgpt", "claude"], "map": ["gemini", "chatgpt", "claude"],
            "vfx": ["gemini", "chatgpt", "qwen"], "security": ["qwen", "deepseek", "claude"],
            "data": ["qwen", "deepseek", "claude"], "monetization": ["qwen", "deepseek", "claude"],
            "debug": ["deepseek", "qwen", "chatgpt"], "performance": ["qwen", "deepseek", "chatgpt"],
            "release": ["chatgpt", "claude", "qwen"], "general": ["qwen", "gemini", "chatgpt"],
        }
        candidates = base.get(category, ["qwen", "deepseek", "gemini", "chatgpt"])
        learned: dict[str, float] = {}
        for row in self._provider_rows(project_key, category):
            attempts = max(1, int(row.get("attempts", 0) or 0))
            completed = int(row.get("completed", 0) or 0)
            errors = int(row.get("errors", 0) or 0)
            average = int(row.get("total_ms", 0) or 0) / attempts
            learned[str(row.get("provider"))] = completed / attempts * 100 - errors * 3 - min(average / 120000, 12)
        ranked = sorted(candidates, key=lambda name: (-(learned.get(name, 0) + (len(candidates) - candidates.index(name)) * 2), name))
        return {"primary": ranked[0], "fallbacks": ranked[1:3], "learnedScores": learned}

    def get_genome(self, project_key: str) -> dict[str, Any]:
        with self._lock:
            row = self._db.execute("SELECT * FROM superior_genomes WHERE project_key=?", (project_key,)).fetchone()
        if not row:
            return {}
        value = json.loads(row["genome_json"])
        value["fingerprint"] = row["fingerprint"]
        value["scannedAt"] = row["scanned_at"]
        return value

    def save_genome(self, project_key: str, genome: dict[str, Any], source: str = "studio") -> str:
        fingerprint = stable_hash(genome)
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO superior_genomes(project_key,fingerprint,genome_json,scanned_at,source) VALUES(?,?,?,?,?) "
                "ON CONFLICT(project_key) DO UPDATE SET fingerprint=excluded.fingerprint,genome_json=excluded.genome_json,scanned_at=excluded.scanned_at,source=excluded.source",
                (project_key, fingerprint, json.dumps(genome, ensure_ascii=False), now_ms(), source),
            )
        return fingerprint

    def get_design_dna(self, project_key: str) -> dict[str, Any]:
        with self._lock:
            row = self._db.execute("SELECT dna_json FROM superior_design_dna WHERE project_key=?", (project_key,)).fetchone()
        if row:
            return json.loads(row["dna_json"])
        return json.loads(json.dumps(DEFAULT_DESIGN_DNA))

    def save_design_dna(self, project_key: str, dna: dict[str, Any]) -> None:
        merged = {**DEFAULT_DESIGN_DNA, **(dna or {})}
        merged["palette"] = {**DEFAULT_DESIGN_DNA["palette"], **((dna or {}).get("palette") or {})}
        merged["rules"] = [str(item).strip() for item in (merged.get("rules") or []) if str(item).strip()][:30]
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO superior_design_dna(project_key,dna_json,updated_at) VALUES(?,?,?) "
                "ON CONFLICT(project_key) DO UPDATE SET dna_json=excluded.dna_json,updated_at=excluded.updated_at",
                (project_key, json.dumps(merged, ensure_ascii=False), now_ms()),
            )

    def list_contracts(self, project_key: str, category: str = "") -> list[dict[str, Any]]:
        query = "SELECT * FROM superior_contracts WHERE enabled=1 AND (project_key='' OR project_key=?)"
        params: list[Any] = [project_key]
        if category:
            query += " AND (category=? OR category='general')"
            params.append(category)
        query += " ORDER BY project_key DESC, updated_at DESC"
        with self._lock:
            rows = self._db.execute(query, params).fetchall()
        values = []
        for row in rows:
            item = dict(row)
            item["steps"] = json.loads(item.pop("steps_json"))
            values.append(item)
        return values

    def save_contract(self, project_key: str, name: str, category: str, steps: list[str], contract_id: str = "") -> str:
        clean = [str(item).strip() for item in steps if str(item).strip()][:30]
        cid = contract_id or f"contract-{stable_hash([project_key, name, clean, now_ms()])}"
        stamp = now_ms()
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO superior_contracts(id,project_key,name,category,steps_json,enabled,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?) "
                "ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,steps_json=excluded.steps_json,enabled=1,updated_at=excluded.updated_at",
                (cid, project_key, name.strip() or "Behavior Contract", category or "general", json.dumps(clean, ensure_ascii=False), stamp, stamp),
            )
        return cid

    def disable_contract(self, contract_id: str) -> None:
        with self._lock, self._db:
            self._db.execute("UPDATE superior_contracts SET enabled=0,updated_at=? WHERE id=?", (now_ms(), contract_id))

    def compile_intent(self, goal: str, project_key: str) -> dict[str, Any]:
        goal = str(goal or "").strip()
        category = self.classify(goal)
        genome = self.get_genome(project_key)
        design = self.get_design_dna(project_key)
        risk = self.risk(goal, category, genome)
        provider = self.recommend_provider(project_key, category)
        broad = bool(HIGH_RE.search(goal)) or risk["level"] in {"high", "critical"}
        phases = ["inspect"]
        if category in {"data", "security", "monetization", "economy", "rng", "gameplay", "debug", "performance", "general", "release"}:
            phases.append("implement")
        if category == "map" or re.search(r"map|world|terrain|lighting|harita", goal, re.I):
            phases.append("map")
        if category == "ui" or re.search(r"ui|gui|hud|mobile|button|arayüz", goal, re.I):
            phases.append("ui")
        if broad and "implement" not in phases:
            phases.append("implement")
        phases.extend(["review", "qa"])
        phases = list(dict.fromkeys(phases))
        contracts = list(CATEGORY_CONTRACTS.get(category, CATEGORY_CONTRACTS["general"]))
        for custom in self.list_contracts(project_key, category):
            contracts.extend(custom.get("steps") or [])
        contracts = list(dict.fromkeys(contracts))[:16]
        proof = {
            "requiresPlaytest": True,
            "requiresOutput": True,
            "requiresScreenshots": category in {"ui", "map", "vfx", "release"},
            "requiresRespawn": category in {"ui", "map", "gameplay", "release"},
            "requiresRejoin": category in {"data", "rng", "economy", "monetization", "release"},
            "requiresSecurityInputs": category in {"security", "data", "monetization", "economy"},
            "acceptance": contracts,
        }
        spec = {
            "version": ENGINE_VERSION,
            "id": f"intent-{now_ms()}-{stable_hash(goal)[:8]}",
            "goal": goal,
            "projectKey": project_key,
            "category": category,
            "risk": risk,
            "phases": phases,
            "provider": provider,
            "juryRequired": risk["level"] in {"high", "critical"},
            "shadowRequired": risk["level"] in {"high", "critical"} or bool(DESTRUCTIVE_RE.search(goal)),
            "proof": proof,
            "designDNA": design if category in {"ui", "map", "vfx", "onboarding", "release"} else {},
            "genomeFingerprint": genome.get("fingerprint", ""),
            "decisionTrace": [
                f"Category '{category}' selected by deterministic keyword rules.",
                f"Risk {risk['score']}/100 ({risk['level']}) from scope, data/security and project-size rules.",
                f"Provider '{provider['primary']}' selected from fixed role preferences plus recorded outcomes.",
                "Creative implementation remains assigned to a connected browser AI; local rules only constrain and verify it.",
            ],
            "createdAt": now_ms(),
        }
        with self._lock, self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO superior_intents(id,project_key,goal,spec_json,created_at) VALUES(?,?,?,?,?)",
                (spec["id"], project_key, goal, json.dumps(spec, ensure_ascii=False), spec["createdAt"]),
            )
        return spec

    def prompt_block(self, spec: dict[str, Any]) -> str:
        proof = spec.get("proof") or {}
        lines = [
            "ZEROSCRIPT INTENT CONTRACT",
            f"Category: {spec.get('category')} · Risk: {spec.get('risk', {}).get('level')} ({spec.get('risk', {}).get('score')}/100)",
            f"Execution phases: {' → '.join(spec.get('phases') or [])}",
            f"Preferred provider: {spec.get('provider', {}).get('primary')} · Fallbacks: {', '.join(spec.get('provider', {}).get('fallbacks') or [])}",
            f"Shadow Guard: {'required' if spec.get('shadowRequired') else 'optional'}",
            f"Model Jury: {'required' if spec.get('juryRequired') else 'not required'}",
            "",
            "BEHAVIORAL CONTRACT",
        ]
        lines.extend(f"- {item}" for item in proof.get("acceptance") or [])
        lines.extend(["", "PROOF CONTRACT"])
        for key, label in (
            ("requiresPlaytest", "Run the affected path in Play mode"),
            ("requiresOutput", "Read Studio Output after the test"),
            ("requiresScreenshots", "Capture comparable before/after visual evidence"),
            ("requiresRespawn", "Repeat after respawn"),
            ("requiresRejoin", "Verify save/rejoin behavior safely"),
            ("requiresSecurityInputs", "Test invalid and abusive inputs safely"),
        ):
            if proof.get(key):
                lines.append(f"- {label}")
        design = spec.get("designDNA") or {}
        if design:
            lines.extend(["", f"DESIGN DNA [{design.get('name', 'Project style')}]", f"Palette: {json.dumps(design.get('palette') or {}, ensure_ascii=False)}"])
            lines.extend(f"- {rule}" for rule in (design.get("rules") or [])[:12])
        lines.extend(["", "DECISION RULE", "Inspect the actual Studio state before changing anything. Stored memory and this contract are guidance, not proof. Do not claim PASS without the required evidence."])
        return "\n".join(lines)

    def evaluate_proof(self, task_id: str, project_key: str, snapshot: dict[str, Any], spec: dict[str, Any] | None = None) -> dict[str, Any]:
        task = snapshot.get("task") or {}
        status = str(task.get("status") or snapshot.get("status") or "")
        learning = snapshot.get("learningSnapshot") or {}
        memory = learning.get("memory") or {}
        productivity = snapshot.get("productivity") or {}
        verified = memory.get("verified") or learning.get("verified") or []
        regression = memory.get("regression") or learning.get("regression") or snapshot.get("regression") or []
        output = memory.get("outputErrors") or productivity.get("outputWatch", {}).get("errors") or []
        reports = memory.get("reports") or learning.get("reports") or []
        changed = memory.get("changedPaths") or ((snapshot.get("changeDiff") or {}).get("changed") or [])
        text = json.dumps(reports, ensure_ascii=False).lower()
        checks = {
            "completed": status == "done",
            "changed": bool(changed),
            "verifiedEvidence": bool(verified),
            "regressionEvidence": bool(regression),
            "outputClean": not output,
            "playtestEvidence": any(word in text for word in ("playtest", "play mode", "tested path", "oynat")) or bool(regression),
            "visualEvidence": any(word in text for word in ("screenshot", "screen_capture", "desktop", "mobile")),
            "juryEvidence": any(word in text for word in ("reviewer", "alternative", "jury", "verdict")),
        }
        weights = {"completed": 25, "changed": 10, "verifiedEvidence": 18, "regressionEvidence": 17, "outputClean": 15, "playtestEvidence": 10, "visualEvidence": 3, "juryEvidence": 2}
        score = sum(weights[key] for key, passed in checks.items() if passed)
        required = (spec or {}).get("proof") or {}
        blockers = []
        if required.get("requiresScreenshots") and not checks["visualEvidence"]:
            blockers.append("visual evidence missing")
        if required.get("requiresPlaytest") and not checks["playtestEvidence"]:
            blockers.append("playtest evidence missing")
        if required.get("requiresOutput") and not checks["outputClean"]:
            blockers.append("Output still contains errors")
        if (spec or {}).get("juryRequired") and not checks["juryEvidence"]:
            blockers.append("independent reviewer/jury evidence missing")
        proof_status = "verified" if score >= 75 and not blockers else "unverified"
        result = {"taskId": task_id, "score": score, "status": proof_status, "checks": checks, "blockers": blockers, "updatedAt": now_ms()}
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO superior_proofs(task_id,project_key,proof_json,score,status,updated_at) VALUES(?,?,?,?,?,?) "
                "ON CONFLICT(task_id) DO UPDATE SET proof_json=excluded.proof_json,score=excluded.score,status=excluded.status,updated_at=excluded.updated_at",
                (task_id, project_key, json.dumps(result, ensure_ascii=False), score, proof_status, result["updatedAt"]),
            )
        return result

    def ingest_live_metrics(self, project_key: str, metrics: dict[str, Any]) -> list[str]:
        recommendations: list[str] = []
        retention = float(metrics.get("day1Retention", metrics.get("d1", 0)) or 0)
        tutorial = float(metrics.get("tutorialCompletion", metrics.get("onboardingCompletion", 0)) or 0)
        first_action = float(metrics.get("firstActionCompletion", 0) or 0)
        crash_rate = float(metrics.get("errorSessions", metrics.get("crashRate", 0)) or 0)
        purchase = float(metrics.get("purchaseConversion", 0) or 0)
        if tutorial and tutorial < 0.55:
            recommendations.append("Onboarding completion is low; inspect the first objective, blocking modal states and mobile visibility.")
        if first_action and first_action < 0.65:
            recommendations.append("Too many players miss the first core action; strengthen spawn framing, CTA feedback and tutorial guidance.")
        if retention and retention < 0.18:
            recommendations.append("Day-1 retention is weak; audit session length, early rewards, progression pacing and return hooks.")
        if crash_rate > 0.03:
            recommendations.append("Error-session rate is high; prioritize grouped Output/runtime signatures before feature work.")
        if purchase and purchase < 0.01:
            recommendations.append("Purchase conversion is low; verify product value communication, placement and purchase-path reliability without forcing pay-to-win progression.")
        if not recommendations:
            recommendations.append("No deterministic threshold warning was triggered; compare metrics by device, session age and acquisition source before changing the game.")
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO superior_live_metrics(project_key,metrics_json,recommendations_json,imported_at) VALUES(?,?,?,?)",
                (project_key, json.dumps(metrics, ensure_ascii=False), json.dumps(recommendations, ensure_ascii=False), now_ms()),
            )
        return recommendations

    def latest_summary(self, project_key: str) -> dict[str, Any]:
        genome = self.get_genome(project_key)
        design = self.get_design_dna(project_key)
        contracts = self.list_contracts(project_key)
        with self._lock:
            proof = self._db.execute("SELECT proof_json FROM superior_proofs WHERE project_key=? ORDER BY updated_at DESC LIMIT 1", (project_key,)).fetchone()
            metrics = self._db.execute("SELECT recommendations_json FROM superior_live_metrics WHERE project_key=? ORDER BY imported_at DESC LIMIT 1", (project_key,)).fetchone()
        return {
            "genome": genome,
            "designDNA": design,
            "contracts": contracts,
            "latestProof": json.loads(proof["proof_json"]) if proof else {},
            "liveRecommendations": json.loads(metrics["recommendations_json"]) if metrics else [],
        }

#!/usr/bin/env python3
"""Learning-quality safeguards for MemoryVault.

Cancelled connection attempts and empty model reports must not become durable
lessons or lower a useful Recipe's score. Successful learning also requires real
verified or regression evidence instead of a terminal status alone.
"""
from __future__ import annotations

from typing import Any


def install(memory_vault_class: type[Any]) -> None:
    original_record_outcome = memory_vault_class.record_outcome

    def record_outcome(self: Any, task_id: str, status: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        verified = [item for item in (snapshot.get("verified") or []) if str(item).strip()]
        regression = [item for item in (snapshot.get("regression") or []) if str(item).strip()]
        changed = [item for item in (snapshot.get("changedPaths") or []) if str(item).strip()]
        output = [item for item in (snapshot.get("outputErrors") or []) if str(item).strip()]
        reports = [item for item in (snapshot.get("reports") or []) if item]
        error = str(snapshot.get("error") or "").strip()
        has_execution_evidence = bool(verified or regression or changed or output or reports)

        # A user cancelling an old/stale task, a provider tab not being ready, or
        # a connection failing before work began is operational history, not a
        # reusable development lesson. Keep the task row but do not teach from it.
        if status in {"cancelled", "failed"} and not has_execution_evidence:
            with self._lock, self._db:
                self._db.execute(
                    "UPDATE tasks SET status=?,completed_at=?,score=0,evidence_json=?,error=? WHERE task_id=?",
                    (status, __import__("time").time_ns() // 1_000_000, "{}", error, task_id),
                )
            return {"recorded": True, "learned": False, "score": 0.0, "outcome": "ignored", "success": False}

        # A completed task without a concrete verified path or regression check
        # must not be promoted into success memory. Let the original evaluator
        # store it as a failure/low-confidence lesson so it cannot inflate recipes.
        if status == "done" and not (verified or regression):
            snapshot = {**snapshot, "error": error or "Task completed without verified playtest or regression evidence."}
            status = "failed"

        result = original_record_outcome(self, task_id, status, snapshot)
        if isinstance(result, dict):
            result.setdefault("learned", result.get("recorded", False))
        return result

    memory_vault_class.record_outcome = record_outcome

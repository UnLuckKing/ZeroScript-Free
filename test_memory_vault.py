from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from memory_vault import MemoryVault
from memory_vault_safeguards import install as install_memory_safeguards

install_memory_safeguards(MemoryVault)


class MemoryVaultTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.vault = MemoryVault(self.root / "memory.db")

    def tearDown(self) -> None:
        self.vault.close()
        self.temp.cleanup()

    def test_builtin_recipes_and_context(self) -> None:
        recipes = self.vault.list_recipes()
        self.assertGreaterEqual(len(recipes), 10)
        context = self.vault.build_context("Fix the mobile inventory UI and every button", "global", [])
        self.assertIn("ZEROSCRIPT LEARNING CONTEXT", context["context"])
        self.assertTrue(context["recipe_ids"])
        self.assertEqual(context["category"], "ui")

    def test_verified_outcome_creates_lesson(self) -> None:
        project = self.vault.upsert_project({"placeId": 123, "gameId": 456, "name": "Test Game"})
        selected = self.vault.search_recipes("Fix mobile UI", project, 1)
        recipe_ids = [selected[0]["id"]] if selected else []
        self.vault.begin_task("task-1", project, "Fix mobile UI", "enriched", recipe_ids, "ui", "fast")
        result = self.vault.record_outcome(
            "task-1",
            "done",
            {
                "provider": "gemini",
                "verified": ["Desktop and mobile UI passed", "Every changed button opened and closed"],
                "remaining": [],
                "changedPaths": ["StarterGui.MainGui.Inventory"],
                "regression": ["Open inventory, close it, respawn and reopen"],
                "outputErrors": [],
                "reports": [{"verdict": "PASS"}],
            },
        )
        self.assertTrue(result["recorded"])
        self.assertEqual(result["outcome"], "success")
        lessons = self.vault.list_lessons(project)
        self.assertEqual(len(lessons), 1)
        self.assertIn("StarterGui.MainGui.Inventory", lessons[0]["summary"])

    def test_failed_outcome_becomes_avoidance_memory(self) -> None:
        self.vault.begin_task("task-2", "global", "Repair DataStore", "enriched", [], "data", "best")
        result = self.vault.record_outcome(
            "task-2",
            "failed",
            {
                "provider": "qwen",
                "verified": [],
                "remaining": ["Rejoin still loses currency"],
                "changedPaths": ["ServerScriptService.DataService"],
                "regression": [],
                "outputErrors": ["DataStore request was added to queue"],
                "reports": [],
                "error": "QA evidence missing",
            },
        )
        self.assertEqual(result["outcome"], "failure")
        context = self.vault.build_context("Repair DataStore save and rejoin", "global", [])
        self.assertIn("KNOWN FAILURES", context["context"])

    def test_empty_cancel_is_history_not_lesson(self) -> None:
        self.vault.begin_task("task-cancel", "global", "Old stale task", "enriched", [], "general", "auto")
        result = self.vault.record_outcome(
            "task-cancel",
            "cancelled",
            {"verified": [], "remaining": [], "changedPaths": [], "regression": [], "outputErrors": [], "reports": []},
        )
        self.assertEqual(result["outcome"], "ignored")
        self.assertFalse(result["learned"])
        self.assertEqual(self.vault.list_lessons("global"), [])

    def test_done_without_test_evidence_is_not_success(self) -> None:
        self.vault.begin_task("task-empty-pass", "global", "Fix a script", "enriched", [], "debug", "fast")
        result = self.vault.record_outcome(
            "task-empty-pass",
            "done",
            {"verified": [], "remaining": [], "changedPaths": ["ServerScriptService.Script"], "regression": [], "outputErrors": [], "reports": [{"verdict": "PASS"}]},
        )
        self.assertEqual(result["outcome"], "failure")
        self.assertFalse(result["success"])

    def test_recipe_pack_round_trip(self) -> None:
        recipe_id = self.vault.save_recipe(
            {
                "name": "Custom Roll Test",
                "category": "rng",
                "prompt": "Test normal, quick and auto roll while preserving server authority.",
                "inspect": ["RollService"],
                "tests": ["normal roll", "quick roll"],
                "avoid": ["client rewards"],
                "models": ["qwen"],
                "risk": "high",
            }
        )
        self.assertIsNotNone(self.vault.get_recipe(recipe_id))
        pack = self.root / "recipes.json"
        self.vault.export_pack(pack)
        imported_db = MemoryVault(self.root / "imported.db")
        try:
            count = imported_db.import_pack(pack)
            self.assertGreaterEqual(count, 1)
            self.assertTrue(any(item["source"] == "imported" for item in imported_db.list_recipes()))
        finally:
            imported_db.close()


if __name__ == "__main__":
    unittest.main()

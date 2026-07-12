from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from memory_vault import MemoryVault
from superior_engine import SuperiorEngine


class SuperiorEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.vault = MemoryVault(Path(self.temp.name) / "memory.db")
        self.engine = SuperiorEngine(self.vault)

    def tearDown(self) -> None:
        self.vault.close()
        self.temp.cleanup()

    def test_critical_data_work_requires_shadow_jury_and_rejoin(self) -> None:
        spec = self.engine.compile_intent("Refactor the full DataStore and purchase receipt system", "global")
        self.assertIn(spec["category"], {"data", "monetization"})
        self.assertIn(spec["risk"]["level"], {"high", "critical"})
        self.assertTrue(spec["shadowRequired"])
        self.assertTrue(spec["juryRequired"])
        self.assertTrue(spec["proof"]["requiresRejoin"])
        self.assertTrue(spec["proof"]["requiresOutput"])

    def test_ui_contract_uses_design_dna_and_visual_proof(self) -> None:
        self.engine.save_design_dna(
            "place:1",
            {
                "name": "Compact Neon",
                "palette": {"primary": "#00AAFF"},
                "rules": ["Use compact centered panels", "Keep mobile touch targets large"],
            },
        )
        spec = self.engine.compile_intent("Fix the mobile shop UI and every button", "place:1")
        self.assertEqual(spec["category"], "ui")
        self.assertEqual(spec["designDNA"]["name"], "Compact Neon")
        self.assertTrue(spec["proof"]["requiresScreenshots"])
        self.assertIn("BEHAVIORAL CONTRACT", self.engine.prompt_block(spec))

    def test_project_genome_is_persisted_and_affects_decision_trace(self) -> None:
        fingerprint = self.engine.save_genome("place:2", {"counts": {"scripts": 180, "remotes": 42}, "systems": ["Shop", "Data"]})
        stored = self.engine.get_genome("place:2")
        self.assertEqual(stored["fingerprint"], fingerprint)
        spec = self.engine.compile_intent("Improve the shop safely", "place:2")
        self.assertEqual(spec["genomeFingerprint"], fingerprint)
        self.assertGreaterEqual(spec["risk"]["score"], 60)

    def test_proof_engine_rejects_missing_visual_evidence(self) -> None:
        spec = self.engine.compile_intent("Fix mobile UI", "global")
        result = self.engine.evaluate_proof(
            "task-proof",
            "global",
            {
                "task": {"status": "done"},
                "learningSnapshot": {
                    "memory": {
                        "verified": ["Button opens"],
                        "regression": ["Play mode button path passed"],
                        "changedPaths": ["StarterGui.MainGui"],
                        "outputErrors": [],
                        "reports": [{"verdict": "PASS", "detail": "playtest passed"}],
                    }
                },
            },
            spec,
        )
        self.assertEqual(result["status"], "unverified")
        self.assertIn("visual evidence missing", result["blockers"])

    def test_live_game_brain_returns_deterministic_recommendations(self) -> None:
        recommendations = self.engine.ingest_live_metrics(
            "place:3",
            {"day1Retention": 0.12, "tutorialCompletion": 0.42, "firstActionCompletion": 0.5, "errorSessions": 0.08},
        )
        joined = " ".join(recommendations).lower()
        self.assertIn("onboarding", joined)
        self.assertIn("retention", joined)
        self.assertIn("error", joined)


if __name__ == "__main__":
    unittest.main()

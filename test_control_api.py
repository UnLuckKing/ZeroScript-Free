#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from control_api import ALLOWED_ACTIONS, ControlState, VERSION, load_or_create_token


class ControlApiTests(unittest.TestCase):
    def test_version(self) -> None:
        self.assertEqual(VERSION, "1.30.0")

    def test_token_is_created_and_reused(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "token.txt"
            first = load_or_create_token(path)
            second = load_or_create_token(path)
            self.assertGreaterEqual(len(first), 24)
            self.assertEqual(first, second)
            self.assertEqual(path.read_text("utf-8").strip(), first)

    def test_status_publish_is_isolated_copy(self) -> None:
        state = ControlState()
        payload = {"runtime": {"state": "running"}, "task": {"id": "task-1"}}
        state.publish(payload)
        snapshot = state.snapshot()
        self.assertEqual(snapshot["runtime"]["state"], "running")
        self.assertTrue(snapshot["extensionConnected"])
        snapshot["runtime"]["state"] = "tampered"
        self.assertEqual(state.snapshot()["runtime"]["state"], "running")

    def test_actions_are_fifo_and_consumed_once(self) -> None:
        state = ControlState()
        actions = (
            "stop", "retry", "rollback", "start_task", "set_config", "repair_connection", "open_provider",
            "enqueue_task", "queue_pause", "queue_resume", "queue_clear", "queue_remove", "build_index",
            "output_watch", "ui_audit", "security_audit", "datastore_lab", "economy_simulator",
            "marketplace_scan", "release_check", "multiplayer_test", "record_test",
            "diagnose_fix", "decompose_task", "set_automation", "context_compact", "emergency_stop",
            "clear_notifications", "clear_error_groups", "restore_instances", "visual_ui_compare",
            "button_test", "remote_fuzzer", "instance_rollback_test", "auto_profile_setup",
            "set_superior", "genome_scan", "shadow_prepare", "proof_evaluate", "jury_review",
            "self_heal_scan", "intent_compile", "studio_command",
        )
        for action in actions:
            self.assertIn(action, ALLOWED_ACTIONS)
            state.add_action(action, {"sample": True})
        first = state.take_actions()
        self.assertEqual([item["action"] for item in first], list(actions))
        self.assertEqual(state.take_actions(), [])

    def test_pairing_window_opens_and_closes(self) -> None:
        state = ControlState()
        self.assertFalse(state.pairing_active())
        seconds = state.open_pairing(1)
        self.assertEqual(seconds, 20)
        self.assertTrue(state.pairing_active())
        state.pair_until = 0
        self.assertFalse(state.pairing_active())

    def test_studio_events_are_consumed_once(self) -> None:
        state = ControlState()
        state.add_studio_event({"kind": "panel_opened", "detail": "ready"})
        events = state.take_studio_events()
        self.assertEqual(events[0]["kind"], "panel_opened")
        self.assertEqual(state.take_studio_events(), [])


if __name__ == "__main__":
    unittest.main()

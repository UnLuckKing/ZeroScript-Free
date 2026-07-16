#!/usr/bin/env python3
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "bridge"))

import upstream_release_fixes as fixes  # noqa: E402


class UpstreamReleaseFixTests(unittest.TestCase):
    def test_ipv4_port_owner_pid_is_found(self) -> None:
        sample = "  TCP    127.0.0.1:13469    0.0.0.0:0    LISTENING    4321\n"
        self.assertEqual(fixes._listening_pid(sample, 13469), 4321)

    def test_ipv6_port_owner_pid_is_found(self) -> None:
        sample = "  TCP    [::1]:13469       [::]:0         LISTENING    9876\n"
        self.assertEqual(fixes._listening_pid(sample, 13469), 9876)

    def test_unrelated_port_is_ignored(self) -> None:
        sample = "  TCP    127.0.0.1:17613    0.0.0.0:0    LISTENING    1111\n"
        self.assertIsNone(fixes._listening_pid(sample, 13469))

    def test_known_squatter_fallbacks_are_present(self) -> None:
        self.assertIn("ropilot-infra-helper.exe", fixes._KNOWN_SQUATTERS)
        self.assertEqual(fixes.STUDIO_MCP_PORT, 13469)


if __name__ == "__main__":
    unittest.main()

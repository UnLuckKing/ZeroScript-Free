#!/usr/bin/env python3
"""Versioned launcher for the ZeroScript bridge implementation.

The historical bridge implementation lives in bridge_core.py. Keeping this
small launcher separate lets extension and bridge release metadata stay in sync
without rewriting the large, well-tested bridge module for every release.
"""
from __future__ import annotations

import asyncio

import bridge_core as _bridge
from upstream_release_fixes import install as _install_upstream_release_fixes

BRIDGE_VERSION = "1.36.0"
_bridge.BRIDGE_VERSION = BRIDGE_VERSION
_install_upstream_release_fixes(_bridge)


def main() -> int:
    try:
        asyncio.run(_bridge.main())
    except KeyboardInterrupt:
        _bridge.log("shutting down...", "yl")
        for client in _bridge.mgr.clients.values():
            client.stop()
    finally:
        _bridge.log("===== BRIDGE STOP =====", "cy")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

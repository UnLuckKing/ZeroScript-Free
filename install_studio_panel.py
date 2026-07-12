#!/usr/bin/env python3
"""Install the ZeroScript Studio DockWidget as a local Roblox plugin."""
from __future__ import annotations

import html
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "roblox-plugin" / "ZeroScriptControlPanel.lua"
PLUGIN_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Roblox" / "Plugins"
OUTPUT = PLUGIN_DIR / "ZeroScriptControlPanel.rbxmx"


def make_rbxmx(source: str) -> str:
    # XML model containing one plugin Script. ProtectedString is escaped rather
    # than CDATA so arbitrary source text cannot terminate the XML payload.
    escaped = html.escape(source, quote=False)
    return f'''<roblox version="4">
  <Item class="Script" referent="RBX_ZERO_SCRIPT_CONTROL_PANEL">
    <Properties>
      <bool name="Archivable">true</bool>
      <string name="Name">ZeroScriptControlPanel</string>
      <ProtectedString name="Source">{escaped}</ProtectedString>
    </Properties>
  </Item>
</roblox>
'''


def main() -> int:
    if not SOURCE.exists():
        print(f"ERROR: missing plugin source: {SOURCE}", file=sys.stderr)
        return 1
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        backup = OUTPUT.with_suffix(".rbxmx.bak")
        shutil.copy2(OUTPUT, backup)
        print(f"Backed up existing plugin to {backup}")
    OUTPUT.write_text(make_rbxmx(SOURCE.read_text("utf-8")), "utf-8")
    print(f"Installed ZeroScript Studio panel: {OUTPUT}")
    print("Restart Roblox Studio, then open Plugins > ZeroScript > Control Center.")
    print("Also enable Game Settings > Security > Allow HTTP Requests.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

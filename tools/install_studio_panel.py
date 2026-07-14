#!/usr/bin/env python3
"""Install the ZeroScript Studio workspace and command palette locally."""
from __future__ import annotations

import html
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ("ZeroScriptControlPanel", ROOT / "roblox-plugin" / "ZeroScriptControlPanel.lua"),
    ("ZeroScriptCommandPalette", ROOT / "roblox-plugin" / "ZeroScriptCommandPalette.lua"),
    ("ZeroScriptOneWorkspace", ROOT / "roblox-plugin" / "ZeroScriptOneWorkspace.lua"),
]
PLUGIN_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Roblox" / "Plugins"
OUTPUT = PLUGIN_DIR / "ZeroScriptOne.rbxmx"


def make_item(name: str, source: str, referent: str) -> str:
    escaped = html.escape(source, quote=False)
    return f'''  <Item class="Script" referent="{referent}">
    <Properties>
      <bool name="Archivable">true</bool>
      <string name="Name">{html.escape(name)}</string>
      <ProtectedString name="Source">{escaped}</ProtectedString>
    </Properties>
  </Item>'''


def main() -> int:
    missing = [str(path) for _, path in SOURCES if not path.exists()]
    if missing:
        print("ERROR: missing plugin source(s): " + ", ".join(missing), file=sys.stderr)
        return 1
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        shutil.copy2(OUTPUT, OUTPUT.with_suffix(".rbxmx.bak"))
    payload = "<roblox version=\"4\">\n" + "\n".join(
        make_item(name, path.read_text("utf-8"), f"RBX_ZERO_SCRIPT_{index}")
        for index, (name, path) in enumerate(SOURCES, 1)
    ) + "\n</roblox>\n"
    OUTPUT.write_text(payload, "utf-8")
    print(f"Installed: {OUTPUT}")
    print("Restart Roblox Studio and enable Allow HTTP Requests.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

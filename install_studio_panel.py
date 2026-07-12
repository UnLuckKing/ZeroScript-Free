#!/usr/bin/env python3
"""Install the ZeroScript Studio control panel and command palette locally."""
from __future__ import annotations

import html
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCES = [
    ("ZeroScriptControlPanel", ROOT / "roblox-plugin" / "ZeroScriptControlPanel.lua"),
    ("ZeroScriptCommandPalette", ROOT / "roblox-plugin" / "ZeroScriptCommandPalette.lua"),
]
PLUGIN_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Roblox" / "Plugins"
OUTPUT = PLUGIN_DIR / "ZeroScriptControlPanel.rbxmx"


def make_item(name: str, source: str, referent: str) -> str:
    escaped = html.escape(source, quote=False)
    return f'''  <Item class="Script" referent="{referent}">
    <Properties>
      <bool name="Archivable">true</bool>
      <string name="Name">{html.escape(name)}</string>
      <ProtectedString name="Source">{escaped}</ProtectedString>
    </Properties>
  </Item>'''


def make_rbxmx(sources: list[tuple[str, str]]) -> str:
    items = [make_item(name, source, f"RBX_ZERO_SCRIPT_{index}") for index, (name, source) in enumerate(sources, 1)]
    return '<roblox version="4">\n' + "\n".join(items) + "\n</roblox>\n"


def main() -> int:
    missing = [str(path) for _, path in SOURCES if not path.exists()]
    if missing:
        print("ERROR: missing plugin source(s): " + ", ".join(missing), file=sys.stderr)
        return 1
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        backup = OUTPUT.with_suffix(".rbxmx.bak")
        shutil.copy2(OUTPUT, backup)
        print(f"Backed up existing plugin to {backup}")
    payload = [(name, path.read_text("utf-8")) for name, path in SOURCES]
    OUTPUT.write_text(make_rbxmx(payload), "utf-8")
    print(f"Installed ZeroScript Studio tools: {OUTPUT}")
    print("Restart Roblox Studio, then open Plugins > ZeroScript > Control Center or Command Palette.")
    print("To use Ctrl+K, bind 'ZeroScript: Command Palette' in Studio > Customize Shortcuts.")
    print("Also enable Game Settings > Security > Allow HTTP Requests.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

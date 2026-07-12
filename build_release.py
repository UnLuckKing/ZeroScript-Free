#!/usr/bin/env python3
"""Build a tested ZeroScript release without GitHub Actions."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
ROOT_FILES = [
    "bridge.py", "launch_studio_mcp.py", "start.bat", "config.json",
    "LICENSE", "README.md", "CHANGELOG.md",
]


def run(*args: str) -> None:
    print("  >", " ".join(args))
    subprocess.run(args, cwd=ROOT, check=True)


def versions() -> tuple[str, str]:
    manifest = json.loads((ROOT / "zeroscript-extension/manifest.json").read_text("utf-8"))
    bridge = (ROOT / "bridge.py").read_text("utf-8")
    match = re.search(r'^BRIDGE_VERSION = "([^"]+)"', bridge, re.M)
    if not match:
        raise RuntimeError("BRIDGE_VERSION was not found in bridge.py")
    return manifest["version"], match.group(1)


def validate() -> None:
    if not shutil.which("node"):
        raise RuntimeError("Node.js is required to run the JavaScript checks")
    for path in ("background.js", "popup.js", "core/main.js"):
        run("node", "--check", f"zeroscript-extension/{path}")
    run("node", "zeroscript-extension/test-parser.js")
    run(sys.executable, "-m", "py_compile", "bridge.py", "launch_studio_mcp.py")


def release_notes(version: str) -> str:
    text = (ROOT / "CHANGELOG.md").read_text("utf-8")
    pattern = rf"(?ms)^## \[?{re.escape(version)}\]?.*?\n(.*?)(?=^## |\Z)"
    match = re.search(pattern, text)
    body = match.group(1).strip() if match else "See CHANGELOG.md for changes."
    return f"# ZeroScript {version}\n\n{body}\n"


def build(version: str) -> tuple[Path, Path, Path]:
    DIST.mkdir(exist_ok=True)
    package_root = f"ZeroScript-{version}"
    archive = DIST / f"ZeroScript-{version}-Windows.zip"
    checksum = DIST / f"ZeroScript-{version}-SHA256.txt"
    notes = DIST / f"ZeroScript-{version}-Release-Notes.md"
    notes.write_text(release_notes(version), "utf-8")

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for name in ROOT_FILES:
            zf.write(ROOT / name, f"{package_root}/{name}")
        for path in sorted((ROOT / "zeroscript-extension").rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                rel = path.relative_to(ROOT).as_posix()
                zf.write(path, f"{package_root}/{rel}")

    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum.write_text(f"{digest}  {archive.name}\n", "ascii")
    with zipfile.ZipFile(archive) as zf:
        bad = zf.testzip()
        if bad:
            raise RuntimeError(f"ZIP verification failed at {bad}")
    return archive, checksum, notes


def main() -> int:
    ext, bridge = versions()
    if ext != bridge:
        raise RuntimeError(f"Version mismatch: extension={ext}, bridge={bridge}")
    print(f"ZeroScript {ext} local release builder")
    validate()
    archive, checksum, notes = build(ext)
    print("\nRelease ready:")
    for path in (archive, checksum, notes):
        print(" ", path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)

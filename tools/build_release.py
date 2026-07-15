#!/usr/bin/env python3
"""Validate and package ZeroScript One from the categorized repository layout."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
VERSION = "1.35.1"
INCLUDE_FILES = ["ZeroScript One.bat", "ZeroScript Güncelle.bat", "ZeroScript Kurulum.bat", "README.md", "CHANGELOG.md", "LICENSE", ".gitignore"]
INCLUDE_DIRS = ["app", "bridge", "docs", "roblox-plugin", "templates", "tools", "tests", "zeroscript-extension"]
PYTHONPATH = os.pathsep.join(str(ROOT / name) for name in ("app/core", "app/ui", "app/services"))


def run(*args: str) -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = PYTHONPATH + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    print("  >", " ".join(args))
    subprocess.run(args, cwd=ROOT, env=env, check=True)


def validate() -> None:
    manifest = json.loads((ROOT / "zeroscript-extension/manifest.json").read_text("utf-8"))
    bridge_text = (ROOT / "bridge/bridge.py").read_text("utf-8")
    control_text = (ROOT / "app/core/control_api.py").read_text("utf-8")
    bridge_version = re.search(r'^BRIDGE_VERSION = "([^"]+)"', bridge_text, re.M)
    control_version = re.search(r'^VERSION = "([^"]+)"', control_text, re.M)
    if manifest.get("version") != VERSION or not bridge_version or bridge_version.group(1) != VERSION or not control_version or control_version.group(1) != VERSION:
        raise RuntimeError("Version parity failed")
    run(sys.executable, "-m", "compileall", "-q", "app", "bridge", "tools", "tests")
    run(sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v")
    if shutil.which("node"):
        for path in sorted((ROOT / "zeroscript-extension").rglob("*.js")):
            run("node", "--check", str(path.relative_to(ROOT)))
        for name in (
            "test-parser.js", "test-control-suite.js", "test-task-start-policy.js", "test-speed-pack.js",
            "test-productivity-pack.js", "test-automation-pack.js", "test-automation-fixes.js",
            "test-learning-sync.js", "test-superior-pack.js", "test-easy-pack.js", "test-solo-pack.js",
            "test-browser-chat-init-fix.js", "test-workbench-pack.js", "test-prototype-pack.js", "test-chatgpt-max.js",
        ):
            path = ROOT / "zeroscript-extension" / name
            if path.exists():
                run("node", str(path.relative_to(ROOT)))


def build() -> tuple[Path, Path]:
    DIST.mkdir(exist_ok=True)
    archive = DIST / f"ZeroScript-{VERSION}-Windows.zip"
    checksum = DIST / f"ZeroScript-{VERSION}-SHA256.txt"
    prefix = f"ZeroScript-{VERSION}"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for name in INCLUDE_FILES:
            path = ROOT / name
            if path.exists():
                zf.write(path, f"{prefix}/{name}")
        for name in INCLUDE_DIRS:
            for path in sorted((ROOT / name).rglob("*")):
                if path.is_file() and "__pycache__" not in path.parts:
                    zf.write(path, f"{prefix}/{path.relative_to(ROOT).as_posix()}")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum.write_text(f"{digest}  {archive.name}\n", "ascii")
    with zipfile.ZipFile(archive) as zf:
        bad = zf.testzip()
        if bad:
            raise RuntimeError(f"ZIP verification failed: {bad}")
    return archive, checksum


def main() -> int:
    validate()
    archive, checksum = build()
    print(f"Release ready: {archive}")
    print(f"Checksum: {checksum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

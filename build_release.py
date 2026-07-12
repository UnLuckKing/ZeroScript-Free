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
    "bridge.py", "bridge_core.py", "launch_studio_mcp.py", "start.bat", "start_with_panel.bat",
    "ZeroScript Kurulum.bat", "ZeroScript Güncelle.bat", "ZeroScript Hub.bat", "zeroscript_hub.py", "zeroscript_hub_launcher.py",
    "hub_productivity_ui.py", "hub_workflow_extras.py", "hub_automation_ui.py", "hub_learning_ui.py", "hub_learning_extras.py",
    "hub_superior_ui.py", "hub_easy_ui.py", "hub_modern_ui.py", "memory_vault.py", "memory_vault_safeguards.py", "recipe_starter_packs.py",
    "superior_engine.py", "control_api.py", "install_studio_panel.py", "install_studio_panel.bat",
    "config.json", "LICENSE", "README.md", "CHANGELOG.md", "RELEASE_NOTES_1.31.md",
]
PACKAGE_DIRS = ["zeroscript-extension", "roblox-plugin", "docs"]


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
    extension = ROOT / "zeroscript-extension"
    for path in sorted(extension.rglob("*.js")):
        run("node", "--check", str(path.relative_to(ROOT)))
    run("node", "zeroscript-extension/test-parser.js")
    run("node", "zeroscript-extension/test-control-suite.js")
    run("node", "zeroscript-extension/test-task-start-policy.js")
    run("node", "zeroscript-extension/test-speed-pack.js")
    run("node", "zeroscript-extension/test-productivity-pack.js")
    run("node", "zeroscript-extension/test-automation-pack.js")
    run("node", "zeroscript-extension/test-automation-fixes.js")
    run("node", "zeroscript-extension/test-learning-sync.js")
    run("node", "zeroscript-extension/test-superior-pack.js")
    run("node", "zeroscript-extension/test-easy-pack.js")
    run(sys.executable, "-m", "unittest", "-v", "test_control_api.py", "test_memory_vault.py", "test_superior_engine.py")
    run(
        sys.executable,
        "-m",
        "py_compile",
        "bridge.py",
        "bridge_core.py",
        "launch_studio_mcp.py",
        "control_api.py",
        "zeroscript_hub.py",
        "zeroscript_hub_launcher.py",
        "hub_productivity_ui.py",
        "hub_workflow_extras.py",
        "hub_automation_ui.py",
        "hub_learning_ui.py",
        "hub_learning_extras.py",
        "hub_superior_ui.py",
        "hub_easy_ui.py",
        "hub_modern_ui.py",
        "memory_vault.py",
        "memory_vault_safeguards.py",
        "recipe_starter_packs.py",
        "superior_engine.py",
        "install_studio_panel.py",
        "build_release.py",
    )

    manifest = json.loads((extension / "manifest.json").read_text("utf-8"))
    script_paths = {path for entry in manifest.get("content_scripts", []) for path in entry.get("js", [])}
    required_content_scripts = {"core/provider-probe.js", "core/permission-guard.js"}
    missing = sorted(required_content_scripts - script_paths)
    if missing:
        raise RuntimeError(f"Manifest is missing required content scripts: {', '.join(missing)}")
    for required in (
        "background-suite.js",
        "background-suite-fixes.js",
        "background-studio-panel.js",
        "background-studio-panel-fixes.js",
        "background-hub-autopair.js",
        "background-hub-actions.js",
        "background-task-start-policy.js",
        "background-speed-pack.js",
        "background-speed-fixes.js",
        "background-productivity-pack.js",
        "background-productivity-fixes.js",
        "background-productivity-sync.js",
        "background-automation-pack.js",
        "background-automation-fixes.js",
        "background-automation-instance-fixes.js",
        "background-learning-sync.js",
        "background-superior-pack.js",
        "background-superior-fixes.js",
        "background-easy-pack.js",
        "popup-simple.js",
    ):
        if not (extension / required).exists():
            raise RuntimeError(f"Required release file is missing: {required}")
    for required in ("ZeroScriptControlPanel.lua", "ZeroScriptCommandPalette.lua"):
        if not (ROOT / "roblox-plugin" / required).exists():
            raise RuntimeError(f"Native Studio plugin source is missing: {required}")
    for required in (
        "zeroscript_hub.py", "zeroscript_hub_launcher.py", "hub_productivity_ui.py", "hub_workflow_extras.py",
        "hub_automation_ui.py", "hub_learning_ui.py", "hub_learning_extras.py", "hub_superior_ui.py", "hub_easy_ui.py", "hub_modern_ui.py",
        "memory_vault.py", "memory_vault_safeguards.py", "recipe_starter_packs.py", "superior_engine.py",
        "ZeroScript Hub.bat", "ZeroScript Kurulum.bat", "ZeroScript Güncelle.bat", "RELEASE_NOTES_1.31.md",
    ):
        if not (ROOT / required).exists():
            raise RuntimeError(f"ZeroScript Hub release file is missing: {required}")


def release_notes(version: str) -> str:
    dedicated = ROOT / f"RELEASE_NOTES_{'.'.join(version.split('.')[:2])}.md"
    if dedicated.exists():
        return dedicated.read_text("utf-8").strip() + "\n"
    text = (ROOT / "CHANGELOG.md").read_text("utf-8")
    pattern = rf"(?ms)^## \[?{re.escape(version)}\]?.*?\n(.*?)(?=^## |\Z)"
    match = re.search(pattern, text)
    if match:
        body = match.group(1).strip()
    elif version.startswith("1.2") and (ROOT / "docs" / "ZEROSCRIPT_HUB_1_25.md").exists():
        body = (ROOT / "docs" / "ZEROSCRIPT_HUB_1_25.md").read_text("utf-8").strip()
    else:
        body = "See CHANGELOG.md for changes."
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
        for directory in PACKAGE_DIRS:
            for path in sorted((ROOT / directory).rglob("*")):
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
    if ext != "1.31.0":
        raise RuntimeError(f"Unexpected release version: {ext}")
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

#!/usr/bin/env python3
"""One-click launcher for ZeroScript One on Windows.

Starts the bridge only when port 17613 is free, then opens the desktop workspace.
It never restarts a healthy bridge and keeps bridge ownership outside the Hub.
"""
from __future__ import annotations

import socket
import subprocess
import sys
import time
from pathlib import Path
from tkinter import Tk, messagebox

ROOT = Path(__file__).resolve().parent
BRIDGE_PORT = 17613
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
CREATE_NEW_PROCESS_GROUP = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
HIDDEN_PROCESS_FLAGS = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP


def port_open(port: int, timeout: float = 0.15) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def python_command() -> list[str]:
    if sys.executable and Path(sys.executable).exists():
        return [sys.executable]
    return ["py", "-3"]


def start_bridge() -> None:
    if port_open(BRIDGE_PORT):
        return
    start_exe = next((path for path in (ROOT / "Start.exe", ROOT / "start.exe") if path.exists()), None)
    if start_exe:
        subprocess.Popen(
            [str(start_exe)],
            cwd=ROOT,
            creationflags=HIDDEN_PROCESS_FLAGS,
        )
        return
    bridge = ROOT / "bridge.py"
    if bridge.exists():
        log_dir = ROOT / "logs"
        log_dir.mkdir(exist_ok=True)
        log = open(log_dir / "one_bridge.log", "a", encoding="utf-8")
        subprocess.Popen(
            [*python_command(), str(bridge)],
            cwd=ROOT,
            stdout=log,
            stderr=subprocess.STDOUT,
            creationflags=HIDDEN_PROCESS_FLAGS,
        )
        return
    batch = ROOT / "start.bat"
    if batch.exists():
        subprocess.Popen(
            ["cmd.exe", "/c", str(batch)],
            cwd=ROOT,
            creationflags=HIDDEN_PROCESS_FLAGS,
        )
        return
    raise FileNotFoundError("Start.exe, start.bat veya bridge.py bulunamadı.")


def wait_bridge(seconds: float = 12.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if port_open(BRIDGE_PORT):
            return True
        time.sleep(0.25)
    return False


def start_hub() -> None:
    launcher = ROOT / "zeroscript_hub_launcher.py"
    if not launcher.exists():
        raise FileNotFoundError("zeroscript_hub_launcher.py bulunamadı.")
    subprocess.Popen(
        [*python_command(), str(launcher)],
        cwd=ROOT,
        creationflags=HIDDEN_PROCESS_FLAGS,
    )


def main() -> None:
    root = Tk()
    root.withdraw()
    try:
        start_bridge()
        if not wait_bridge():
            raise RuntimeError("Bridge 12 saniye içinde hazır olmadı. logs/one_bridge.log dosyasını kontrol et.")
        start_hub()
    except Exception as exc:
        messagebox.showerror("ZeroScript One", str(exc), parent=root)
    finally:
        root.destroy()


if __name__ == "__main__":
    main()

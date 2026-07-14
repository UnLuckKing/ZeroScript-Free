#!/usr/bin/env python3
"""ZeroScript One desktop entrypoint.

Keeps the repository organized while preserving the existing flat-module runtime.
Only this file is launched by the user-facing batch file.
"""
from __future__ import annotations

import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from tkinter import messagebox

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
CORE = APP / "core"
UI = APP / "ui"
SERVICES = APP / "services"
BRIDGE = ROOT / "bridge"
LOGS = ROOT / "logs"

for folder in (CORE, UI, SERVICES):
    value = str(folder)
    if value not in sys.path:
        sys.path.insert(0, value)

import zeroscript_hub as hub  # noqa: E402

# Runtime state belongs beside the product, not inside source folders.
hub.ROOT = ROOT
hub.TOKEN_FILE = ROOT / "control_token.txt"
hub.SETTINGS_FILE = ROOT / "hub_settings.json"
hub.LOG_DIR = LOGS

import zeroscript_hub_launcher  # noqa: F401,E402

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
CREATE_NEW_PROCESS_GROUP = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
HIDDEN_FLAGS = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP


def port_open(port: int, timeout: float = 0.15) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def start_bridge() -> None:
    if port_open(hub.BRIDGE_PORT):
        return
    bridge_file = BRIDGE / "bridge.py"
    if not bridge_file.exists():
        raise FileNotFoundError("bridge/bridge.py bulunamadı. Güncellemeyi yeniden çalıştır.")
    LOGS.mkdir(exist_ok=True)
    stream = open(LOGS / "bridge.log", "a", encoding="utf-8")
    subprocess.Popen(
        [sys.executable, str(bridge_file)],
        cwd=BRIDGE,
        stdout=stream,
        stderr=subprocess.STDOUT,
        creationflags=HIDDEN_FLAGS,
    )


def wait_port(port: int, seconds: float) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if port_open(port):
            return True
        time.sleep(0.2)
    return False


def start_services(self) -> None:
    """Start only the authenticated control API; this entrypoint owns the bridge."""
    if getattr(self, "_hub_services_starting", False):
        return
    self._hub_services_starting = True

    def worker() -> None:
        try:
            health = hub.request_json("/health", timeout=0.5) if port_open(hub.CONTROL_PORT) else {}
            if health.get("ok") and health.get("version") != hub.VERSION:
                hub.kill_port(hub.CONTROL_PORT)
                time.sleep(0.25)
            if not port_open(hub.CONTROL_PORT):
                LOGS.mkdir(exist_ok=True)
                self.token = hub.ensure_token()
                stream = open(LOGS / "control.log", "a", encoding="utf-8")
                self.control_process = subprocess.Popen(
                    [sys.executable, str(CORE / "control_api.py"), "--token-file", str(hub.TOKEN_FILE)],
                    cwd=ROOT,
                    stdout=stream,
                    stderr=subprocess.STDOUT,
                    creationflags=HIDDEN_FLAGS,
                )
            if wait_port(hub.CONTROL_PORT, 5):
                hub.request_json("/pair/start", hub.ensure_token(), "POST", {"seconds": 180}, timeout=1.5)
            else:
                self.log("Kontrol servisi başlatılamadı. logs/control.log dosyasını kontrol et.")
        except Exception as exc:
            self.log(f"ZeroScript servisleri başlatılamadı: {exc}")
        finally:
            self.after(0, setattr, self, "_hub_services_starting", False)

    threading.Thread(target=worker, daemon=True).start()


def restart_services(self) -> None:
    hub.kill_port(hub.CONTROL_PORT)
    self.after(400, start_services, self)


hub.ZeroScriptHub.start_services = start_services
hub.ZeroScriptHub.restart_services = restart_services


def main() -> None:
    try:
        start_bridge()
        if not wait_port(hub.BRIDGE_PORT, 12):
            raise RuntimeError("Bridge hazır olmadı. logs/bridge.log dosyasını kontrol et.")
        app = hub.ZeroScriptHub()
        app.mainloop()
    except Exception as exc:
        messagebox.showerror("ZeroScript One", str(exc))


if __name__ == "__main__":
    main()

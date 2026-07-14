#!/usr/bin/env python3
"""Safe launcher and compatibility fixes for ZeroScript Hub."""
from __future__ import annotations

import threading
import time
from tkinter import messagebox, ttk

_original_columnconfigure = ttk.Frame.columnconfigure


def _safe_columnconfigure(self, index, cnf=None, **kw):
    if isinstance(index, (tuple, list)):
        result = None
        for item in index:
            result = _original_columnconfigure(self, item, cnf, **kw)
        return result
    return _original_columnconfigure(self, index, cnf, **kw)


ttk.Frame.columnconfigure = _safe_columnconfigure

import zeroscript_hub as hub  # noqa: E402

hub.VERSION = "1.33.0"
hub.QUALITY_LABELS = {
    "Akıllı otomatik": "auto",
    "Turbo": "turbo",
    "Hızlı": "fast",
    "Dengeli": "balanced",
    "Maksimum kalite": "best",
}
hub.QUALITY_VALUES = {value: label for label, value in hub.QUALITY_LABELS.items()}
hub.DEFAULT_SETTINGS["qualityMode"] = "auto"
hub.DEFAULT_SETTINGS["simpleMode"] = True
hub.DEFAULT_SETTINGS["externalBridgeOnly"] = True

_original_log = hub.ZeroScriptHub.log
_original_build_home = hub.ZeroScriptHub._build_home


def _thread_safe_log(self, text: str) -> None:
    if threading.current_thread() is threading.main_thread():
        _original_log(self, text)
    else:
        self.after(0, _original_log, self, text)


def _control_only_start_services(self) -> None:
    """Start only Hub's authenticated control API; Start.exe owns the bridge."""
    if getattr(self, "_hub_services_starting", False):
        return
    self._hub_services_starting = True

    def worker() -> None:
        try:
            health = hub.request_json("/health", timeout=0.5) if hub.port_open(hub.CONTROL_PORT, 0.12) else {}
            if health.get("ok") and health.get("version") != hub.VERSION:
                hub.kill_port(hub.CONTROL_PORT)
                time.sleep(0.25)
            if not hub.port_open(hub.CONTROL_PORT, 0.12):
                hub.LOG_DIR.mkdir(exist_ok=True)
                self.token = hub.ensure_token()
                control_log = open(hub.LOG_DIR / "hub_control.log", "a", encoding="utf-8")
                self.control_process = hub.subprocess.Popen(
                    [hub.sys.executable, str(hub.ROOT / "control_api.py"), "--token-file", str(hub.TOKEN_FILE)],
                    cwd=hub.ROOT,
                    stdout=control_log,
                    stderr=hub.subprocess.STDOUT,
                    creationflags=hub.CREATE_NO_WINDOW,
                )
                self.log("ZeroScript One kontrol servisi başlatıldı.")
            deadline = time.time() + 5
            while time.time() < deadline and not hub.port_open(hub.CONTROL_PORT, 0.12):
                time.sleep(0.15)
            if hub.port_open(hub.CONTROL_PORT, 0.12):
                hub.request_json("/pair/start", hub.ensure_token(), "POST", {"seconds": 180}, timeout=1.5)
            if not hub.port_open(hub.BRIDGE_PORT, 0.12):
                self.log("Bridge bekleniyor: Start.exe veya start.bat dosyasını aç.")
        except Exception as exc:
            self.log(f"Hub kontrol servisi başlatılamadı: {exc}")
        finally:
            self.after(0, setattr, self, "_hub_services_starting", False)

    threading.Thread(target=worker, daemon=True).start()


def _control_only_stop_services(self) -> None:
    hub.kill_port(hub.CONTROL_PORT)
    self.log("Hub kontrol servisi durduruldu. Start bridge'e dokunulmadı.")


def _control_only_restart_services(self) -> None:
    _control_only_stop_services(self)
    self.after(500, _control_only_start_services, self)


def _fill_quick_task(self, text: str, mode: str = "Akıllı otomatik") -> None:
    self.goal.delete("1.0", "end")
    self.goal.insert("1.0", text)
    self.mode_var.set(mode)
    self.notebook.select(self.home)
    self.goal.focus_set()


def _run_updater(self) -> None:
    updater = hub.ROOT / "ZeroScript Güncelle.bat"
    if not updater.exists():
        messagebox.showerror("ZeroScript", "Güncelleme dosyası bulunamadı.")
        return
    if not messagebox.askyesno("ZeroScript Güncelle", "Güncel sürüm indirilecek ve yerel hafıza korunacak. Devam edilsin mi?"):
        return
    try:
        hub.os.startfile(str(updater))
        self.after(300, self.destroy)
    except Exception as exc:
        messagebox.showerror("ZeroScript", f"Güncelleyici açılamadı:\n{exc}")


def _build_home_with_shortcuts(self) -> None:
    _original_build_home(self)
    shortcuts = ttk.Frame(self.home)
    shortcuts.pack(fill="x", padx=4, pady=(10, 0))
    ttk.Label(shortcuts, text="Hızlı görevler:").pack(side="left", padx=(0, 8))
    ttk.Button(shortcuts, text="Output hatalarını düzelt", command=lambda: _fill_quick_task(self, "Run the game, inspect current Studio Output errors, reproduce each verified error, fix only root causes, then replay the affected path and confirm Output is clean.")).pack(side="left", padx=3)
    ttk.Button(shortcuts, text="UI ve butonları düzelt", command=lambda: _fill_quick_task(self, "Inspect the current player-facing UI in play mode. Fix broken buttons, unreadable text, overflow, scaling, alignment, number formatting, and mobile-safe layout while preserving working logic.")).pack(side="left", padx=3)
    utility = ttk.Frame(self.home)
    utility.pack(fill="x", padx=4, pady=(8, 0))
    ttk.Button(utility, text="Eski işi temizle", command=lambda: self.action("easy_reset")).pack(side="left")
    ttk.Button(utility, text="ZeroScript'i güncelle", command=lambda: _run_updater(self)).pack(side="right")


hub.ZeroScriptHub.log = _thread_safe_log
hub.ZeroScriptHub.start_services = _control_only_start_services
hub.ZeroScriptHub.stop_services = _control_only_stop_services
hub.ZeroScriptHub.restart_services = _control_only_restart_services
hub.ZeroScriptHub._build_home = _build_home_with_shortcuts


def _wait_for_control(timeout: float = 8.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        health = hub.request_json("/health", timeout=0.5)
        if health.get("ok") and health.get("version") == hub.VERSION:
            return True
        time.sleep(0.2)
    return False


def _wait_for_task_acceptance(goal: str, previous_id: str | None, timeout: float = 12.0) -> tuple[bool, str]:
    deadline = time.time() + timeout
    last_detail = "Extension görevi henüz almadı."
    expected_goal = goal[:500].strip()
    while time.time() < deadline:
        result = hub.request_json("/status", hub.ensure_token(), timeout=0.8)
        status = result.get("status") if result.get("ok") else {}
        if not status:
            time.sleep(0.35)
            continue
        if not status.get("extensionConnected"):
            last_detail = "Extension Hub'a bağlı değil."
            time.sleep(0.35)
            continue
        task = status.get("task") or {}
        task_id = str(task.get("id") or "")
        task_goal = str(task.get("goal") or "").strip()
        if task_id and task_id != (previous_id or "") and expected_goal in task_goal:
            return True, f"{task.get('status', 'queued')} · {task.get('phase', 'hazırlanıyor')}"
        time.sleep(0.35)
    return False, last_detail


def _safe_start_task(self) -> None:
    goal = self.goal.get("1.0", "end").strip()
    if not goal:
        messagebox.showwarning("ZeroScript", "Önce görevi yaz.")
        return
    self.start_task_button.configure(state="disabled", text="Hazırlanıyor…")
    self.start_services()

    def worker() -> None:
        try:
            if not _wait_for_control():
                self.after(0, messagebox.showerror, "ZeroScript", "Hub kontrol servisi başlatılamadı.")
                return
            if not hub.port_open(hub.BRIDGE_PORT, 0.12):
                self.after(0, messagebox.showerror, "ZeroScript", "Önce Start.exe veya start.bat dosyasını aç.")
                return
            result = self.action("workbench_start", {"goal": goal, "source": "advanced"}, quiet=True)
            if not result.get("ok"):
                self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "Görev başlatılamadı."))
        finally:
            self.after(0, self.start_task_button.configure, {"state": "normal", "text": "▶ Çalıştır"})

    threading.Thread(target=worker, daemon=True).start()


def _safe_pair_extension(self) -> None:
    self.start_services()

    def worker() -> None:
        if not _wait_for_control():
            self.after(0, messagebox.showerror, "ZeroScript", "Hub servisi başlatılamadı.")
            return
        result = hub.request_json("/pair/start", self.token, "POST", {"seconds": 180}, timeout=3.0)
        if not result.get("ok"):
            self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "Eşleştirme başlatılamadı."))

    threading.Thread(target=worker, daemon=True).start()


def _safe_repair(self) -> None:
    self.start_services()
    if not hub.port_open(hub.BRIDGE_PORT, 0.12):
        messagebox.showinfo("ZeroScript", "Start.exe veya start.bat açık değil. Önce Start'ı aç.")
        return
    self.action("repair_connection")


hub.ZeroScriptHub.start_task = _safe_start_task
hub.ZeroScriptHub.pair_extension = _safe_pair_extension
hub.ZeroScriptHub.repair = _safe_repair

from hub_productivity_ui import install as install_productivity_ui  # noqa: E402
from hub_workflow_extras import install as install_workflow_extras  # noqa: E402
from hub_automation_ui import install as install_automation_ui  # noqa: E402
from hub_learning_ui import install as install_learning_ui  # noqa: E402
from hub_superior_ui import install as install_superior_ui  # noqa: E402
from hub_easy_ui import install as install_easy_ui  # noqa: E402
from hub_one_ui import install as install_one_ui  # noqa: E402
from hub_easy_feedback import install as install_easy_feedback  # noqa: E402
from hub_modern_ui import install as install_modern_ui  # noqa: E402

install_productivity_ui(hub)
install_workflow_extras(hub)
install_automation_ui(hub)
install_learning_ui(hub)
install_superior_ui(hub)
install_easy_ui(hub)
install_one_ui(hub)
install_easy_feedback(hub)
install_modern_ui(hub)


if __name__ == "__main__":
    app = hub.ZeroScriptHub()
    app.mainloop()

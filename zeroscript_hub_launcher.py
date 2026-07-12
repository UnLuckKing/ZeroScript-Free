#!/usr/bin/env python3
"""Safe launcher and compatibility fixes for ZeroScript Hub."""
from __future__ import annotations

import threading
import time
from tkinter import messagebox, ttk

# Tk flattens tuple indices into several Tcl arguments. Support the convenient
# tuple form used by the Hub status grid by configuring each column separately.
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

hub.VERSION = "1.26.0"
hub.QUALITY_LABELS = {
    "Akıllı otomatik": "auto",
    "Turbo": "turbo",
    "Hızlı": "fast",
    "Dengeli": "balanced",
    "Maksimum kalite": "best",
}
hub.QUALITY_VALUES = {value: label for label, value in hub.QUALITY_LABELS.items()}
hub.DEFAULT_SETTINGS["qualityMode"] = "auto"

_original_log = hub.ZeroScriptHub.log
_original_start_services = hub.ZeroScriptHub.start_services
_original_build_home = hub.ZeroScriptHub._build_home


def _thread_safe_log(self, text: str) -> None:
    if threading.current_thread() is threading.main_thread():
        _original_log(self, text)
    else:
        self.after(0, _original_log, self, text)


def _guarded_start_services(self) -> None:
    if getattr(self, "_hub_services_starting", False):
        return
    self._hub_services_starting = True
    _original_start_services(self)
    self.after(3500, setattr, self, "_hub_services_starting", False)


def _fill_quick_task(self, text: str, mode: str = "Akıllı otomatik") -> None:
    self.goal.delete("1.0", "end")
    self.goal.insert("1.0", text)
    self.mode_var.set(mode)
    self.notebook.select(self.home)
    self.goal.focus_set()


def _build_home_with_shortcuts(self) -> None:
    _original_build_home(self)
    shortcuts = ttk.Frame(self.home)
    shortcuts.pack(fill="x", padx=4, pady=(10, 0))
    ttk.Label(shortcuts, text="Hızlı görevler:").pack(side="left", padx=(0, 8))
    ttk.Button(
        shortcuts,
        text="Output hatalarını düzelt",
        command=lambda: _fill_quick_task(
            self,
            "Run the game, inspect current Studio Output errors, reproduce each verified error, fix only the root causes, then replay the affected path and confirm Output is clean.",
        ),
    ).pack(side="left", padx=3)
    ttk.Button(
        shortcuts,
        text="UI ve butonları düzelt",
        command=lambda: _fill_quick_task(
            self,
            "Inspect the current player-facing UI in play mode. Fix broken buttons, unreadable text, overflow, scaling, alignment, number formatting, and mobile-safe layout while preserving the existing visual style and logic.",
        ),
    ).pack(side="left", padx=3)
    ttk.Button(
        shortcuts,
        text="Güvenlik / DataStore",
        command=lambda: _fill_quick_task(
            self,
            "Audit the current RemoteEvents, RemoteFunctions, DataStores, purchases, rewards, and currencies. Fix verified validation, rate-limit, duplication, session-lock, and data-loss problems, then test the corrected server-authoritative flows.",
        ),
    ).pack(side="left", padx=3)
    ttk.Button(shortcuts, text="Duraklayan göreve devam", command=lambda: self.action("retry")).pack(side="right")


hub.ZeroScriptHub.log = _thread_safe_log
hub.ZeroScriptHub.start_services = _guarded_start_services
hub.ZeroScriptHub._build_home = _build_home_with_shortcuts


def _wait_for_control(timeout: float = 8.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if hub.port_open(hub.CONTROL_PORT, 0.15):
            return True
        time.sleep(0.2)
    return False


def _safe_start_task(self) -> None:
    goal = self.goal.get("1.0", "end").strip()
    if not goal:
        messagebox.showwarning("ZeroScript", "Önce görevi yaz.")
        return
    self.settings["qualityMode"] = hub.QUALITY_LABELS.get(self.mode_var.get(), "auto")
    hub.save_json(hub.SETTINGS_FILE, self.settings)
    self.start_task_button.configure(state="disabled", text="Hazırlanıyor…")
    self.start_services()

    def worker() -> None:
        if not _wait_for_control():
            self.after(0, messagebox.showerror, "ZeroScript", "Hub servisi başlatılamadı. Detaylar sekmesindeki logu kontrol et.")
            self.after(0, self.start_task_button.configure, {"state": "normal", "text": "▶ Çalıştır"})
            return
        self.send_config_action()
        result = self.action("start_task", {"goal": goal})
        if result.get("ok"):
            self.log("Görev sıraya alındı. Akıllı mod görev boyutuna göre en kısa güvenli yolu seçiyor.")
        else:
            self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "Görev başlatılamadı."))
        self.after(0, self.start_task_button.configure, {"state": "normal", "text": "▶ Çalıştır"})

    threading.Thread(target=worker, daemon=True).start()


def _safe_pair_extension(self) -> None:
    self.start_services()

    def worker() -> None:
        if not _wait_for_control():
            self.after(0, messagebox.showerror, "ZeroScript", "Hub servisi başlatılamadı.")
            return
        result = hub.request_json("/pair/start", self.token, "POST", {"seconds": 120}, timeout=3.0)
        if result.get("ok"):
            self.log("Extension eşleştirme penceresi 2 dakika açık; otomatik eşleşme bekleniyor.")
            self.after(
                0,
                messagebox.showinfo,
                "ZeroScript",
                "Extension otomatik eşleşecek. 5 saniye içinde Hub ekranında görünmezse Chrome'daki ZeroScript ikonuna bir kez tıkla.",
            )
        else:
            self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "Eşleştirme başlatılamadı."))

    threading.Thread(target=worker, daemon=True).start()


def _safe_repair(self) -> None:
    self.start_services()

    def worker() -> None:
        if not _wait_for_control():
            self.log("Hub servisi bulunamadı; servisler yeniden başlatılıyor.")
            self.restart_services()
            return
        result = self.action("repair_connection")
        if not result.get("ok"):
            self.log("Otomatik onarım başlatılamadı; servisler yeniden başlatılıyor.")
            self.restart_services()

    threading.Thread(target=worker, daemon=True).start()


hub.ZeroScriptHub.start_task = _safe_start_task
hub.ZeroScriptHub.pair_extension = _safe_pair_extension
hub.ZeroScriptHub.repair = _safe_repair


if __name__ == "__main__":
    app = hub.ZeroScriptHub()
    app.mainloop()

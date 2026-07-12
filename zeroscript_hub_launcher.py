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

_original_log = hub.ZeroScriptHub.log


def _thread_safe_log(self, text: str) -> None:
    if threading.current_thread() is threading.main_thread():
        _original_log(self, text)
    else:
        self.after(0, _original_log, self, text)


hub.ZeroScriptHub.log = _thread_safe_log


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
    self.settings["qualityMode"] = hub.QUALITY_LABELS.get(self.mode_var.get(), "balanced")
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
            self.log("Görev sıraya alındı.")
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
            self.log("Extension eşleştirme penceresi 2 dakika açık.")
            self.after(0, messagebox.showinfo, "ZeroScript", "Şimdi Chrome'da ZeroScript extension ikonuna bir kez tıkla. Otomatik eşleşecek.")
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

#!/usr/bin/env python3
"""Runtime reliability helpers for the beginner-first Hub dashboard."""
from __future__ import annotations

import threading
import time
from tkinter import END, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status

    def wait_control(timeout: float = 9.0) -> tuple[bool, str]:
        deadline = time.time() + timeout
        last = "Hub servisi hazırlanıyor."
        while time.time() < deadline:
            health = hub.request_json("/health", timeout=0.6)
            if health.get("ok") and health.get("version") == hub.VERSION:
                return True, ""
            if health.get("ok"):
                last = f"Eski servis sürümü açık: {health.get('version', '?')}"
            else:
                last = str(health.get("error") or last)
            time.sleep(0.25)
        return False, last

    def action_async(self: Any, action: str, payload: dict[str, Any], button: Any | None = None, success: str = "İşlem sıraya alındı.") -> None:
        if button is not None:
            try:
                button.configure(state="disabled")
            except Exception:
                pass
        self.start_services()

        def worker() -> None:
            try:
                ready, detail = wait_control()
                if not ready:
                    self.after(0, messagebox.showerror, "ZeroScript", f"ZeroScript servisi hazırlanamadı.\n\n{detail}")
                    return
                result = self.action(action, payload)
                if result.get("ok"):
                    self.after(0, messagebox.showinfo, "ZeroScript", success)
                else:
                    self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "İşlem başlatılamadı."))
            finally:
                if button is not None:
                    self.after(0, button.configure, {"state": "normal"})

        threading.Thread(target=worker, daemon=True).start()

    def start_blueprint(self: Any) -> None:
        idea = self.easy_idea.get("1.0", END).strip()
        if not idea:
            messagebox.showwarning("ZeroScript", "Oyunun fikrini veya mevcut oyunda yapılacak işi bir cümleyle yaz.")
            self.easy_idea.focus_set()
            return
        payload = {
            "idea": idea,
            "genre": self.easy_genre_var.get(),
            "target": self.easy_target_var.get(),
            "device": self.easy_device_var.get(),
            "autoStart": self.easy_auto_continue_var.get(),
        }
        self.settings.update({
            "simpleMode": self.easy_mode_var.get(),
            "easyGenre": payload["genre"],
            "easyTarget": payload["target"],
            "easyDevice": payload["device"],
            "easyAutoContinue": payload["autoStart"],
            "easyLastIdea": idea,
        })
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        action_async(
            self,
            "build_game_blueprint",
            payload,
            self.easy_build_button,
            "Oyun geliştirme planı hazırlandı. Görevler doğru sırayla çalışacak; Kolay Mod ekranından ilerlemeyi takip edebilirsin.",
        )

    def bind_quick_buttons(self: Any, root: Any) -> None:
        commands = {
            "Oyunu düzelt": ("diagnose_fix", {}, "Oyun tanılama ve onarım akışı başlatıldı."),
            "UI'yi profesyonelleştir": (
                "enqueue_task",
                {"goal": "Inspect the actual player-facing UI and established visual style. Modernize hierarchy, spacing, typography, contrast, responsive scaling, safe areas, loading/disabled/error feedback and navigation. Test every reachable button on desktop and mobile, capture before/after evidence, preserve working controllers and verify Studio Output.", "qualityMode": "best", "priority": "high", "source": "easy_polish_ui"},
                "Profesyonel UI görevi kuyruğa eklendi.",
            ),
            "Oyunu eğlenceli yap": (
                "enqueue_task",
                {"goal": "Inspect the real main gameplay loop, progression, rewards, goals, session pacing and current content. Improve the weakest verified parts so the first session is clear, satisfying and replayable without adding unnecessary complexity. Preserve working systems, measure time-to-first-action and first meaningful upgrade, then playtest and report evidence.", "qualityMode": "best", "priority": "high", "source": "easy_gameplay"},
                "Oynanış geliştirme görevi kuyruğa eklendi.",
            ),
            "Yayına hazırla": ("release_check", {}, "Yayın öncesi kalite kontrolü başlatıldı."),
        }
        for child in root.winfo_children():
            if isinstance(child, ttk.Button):
                text = str(child.cget("text"))
                if text == "✦ Oyunu planla ve yap":
                    child.configure(command=lambda: start_blueprint(self))
                elif text == "Başlat":
                    parent = child.master
                    labels = [str(item.cget("text")) for item in parent.winfo_children() if isinstance(item, ttk.Frame) for item in item.winfo_children() if isinstance(item, ttk.Label)]
                    title = labels[0] if labels else ""
                    if title in commands:
                        action, payload, success = commands[title]
                        child.configure(command=lambda a=action, p=payload, s=success, b=child: action_async(self, a, p, b, s))
            bind_quick_buttons(self, child)

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        if hasattr(self, "easy_tab"):
            bind_quick_buttons(self, self.easy_tab)

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        if not hasattr(self, "easy_task_detail"):
            return
        easy = self.last_status.get("easy") or {}
        blueprint = easy.get("activeBlueprint") or {}
        if not blueprint:
            return
        total = len(blueprint.get("stages") or [])
        completed = int(blueprint.get("completedStages", 0) or 0)
        percent = int(blueprint.get("percent", 0) or 0)
        current = str(self.easy_task_detail.cget("text") or "")
        suffix = f"Plan: {completed}/{total} aşama · %{percent}"
        if "Plan:" in current:
            current = current.split(" · Plan:", 1)[0]
        self.easy_task_detail.configure(text=f"{current} · {suffix}" if current else suffix)

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

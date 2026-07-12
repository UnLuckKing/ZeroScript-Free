#!/usr/bin/env python3
"""Small safeguards and conveniences layered on the 1.29 learning UI."""
from __future__ import annotations

from tkinter import messagebox, ttk
from typing import Any

from recipe_starter_packs import install as install_starter_recipes


def install(hub: Any) -> None:
    vault = hub.MEMORY_VAULT
    install_starter_recipes(vault)

    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_start_task = hub.ZeroScriptHub.start_task

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        if not hasattr(self, "learning_tab"):
            return
        feedback = ttk.Frame(self.learning_tab, style="Hero.TFrame", padding=(12, 8))
        feedback.pack(fill="x", padx=4, pady=(0, 8))
        ttk.Label(feedback, text="Sonucun doğruysa hafızayı güçlendir; sorunluysa aynı yaklaşımın puanını düşür.", style="Hero.Sub.TLabel").pack(side="left")
        ttk.Button(feedback, text="✓ Son görev başarılı", style="Success.TButton", command=lambda: mark_feedback(self, True)).pack(side="right")
        ttk.Button(feedback, text="! Son görev sorunlu", style="Danger.TButton", command=lambda: mark_feedback(self, False)).pack(side="right", padx=6)

    def mark_feedback(self: Any, positive: bool) -> None:
        task = self.last_status.get("task") or {}
        task_id = str(task.get("id") or getattr(self, "_zs_learning_bound_task", ""))
        if not task_id:
            messagebox.showwarning("ZeroScript", "Geri bildirim verilecek görev bulunamadı.")
            return
        vault.mark_manual_feedback(task_id, positive)
        self.log(f"Memory Vault geri bildirimi kaydetti: {'başarılı' if positive else 'sorunlu'} · {task_id}")
        messagebox.showinfo("ZeroScript", "Öğrenme puanı güncellendi.")

    def start_task(self: Any) -> None:
        # Prevent a pending learning envelope from binding to the previous active
        # task while the extension is still accepting the new task.
        current = self.last_status.get("task") or {}
        current_id = str(current.get("id") or "")
        if current_id:
            self._zs_learning_bound_task = current_id
        previous_start_task(self)

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.start_task = start_task

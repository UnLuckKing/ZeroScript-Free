#!/usr/bin/env python3
"""Simple completed-state and learning feedback for the one-screen Easy Mode."""
from __future__ import annotations

from tkinter import messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        if not hasattr(self, "easy_tab"):
            return
        roots = self.easy_tab.winfo_children()
        parent = roots[0] if roots else self.easy_tab
        self.easy_feedback = ttk.LabelFrame(parent, text="Sonuç", padding=12)
        self.easy_feedback.pack(fill="x", padx=8, pady=(8, 0))
        self.easy_feedback_text = ttk.Label(
            self.easy_feedback,
            text="Görev tamamlandığında sonuç burada görünecek.",
            style="Card.TLabel",
            wraplength=980,
            justify="left",
        )
        self.easy_feedback_text.pack(side="left", fill="x", expand=True)
        buttons = ttk.Frame(self.easy_feedback, style="Card.TFrame")
        buttons.pack(side="right", padx=(12, 0))
        ttk.Button(buttons, text="Beğendim", style="Success.TButton", command=lambda: send_feedback(self, True, "beğendim")).pack(side="left")
        ttk.Button(buttons, text="Olmadı", style="Danger.TButton", command=lambda: choose_negative(self)).pack(side="left", padx=(6, 0))
        ttk.Button(buttons, text="Geri al", command=lambda: self.action("rollback")).pack(side="left", padx=(6, 0))
        self.easy_feedback.pack_forget()

    def send_feedback(self: Any, positive: bool, reason: str) -> None:
        result = self.action("easy_feedback", {"positive": positive, "reason": reason}, quiet=True)
        if result.get("ok"):
            self.easy_feedback_text.configure(text="Geri bildirimin kaydedildi. ZeroScript sonraki benzer işlerde bunu kullanacak.")
        else:
            messagebox.showerror("ZeroScript", result.get("error", "Geri bildirim kaydedilemedi."))

    def choose_negative(self: Any) -> None:
        window = hub.tk.Toplevel(self)
        window.title("Neresi olmadı?")
        window.geometry("360x300")
        window.resizable(False, False)
        frame = ttk.Frame(window, style="Card.TFrame", padding=16)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Sorunu seç", style="Hero.Title.TLabel").pack(anchor="w", pady=(0, 10))
        reasons = ["Çalışmıyor", "Görünüş kötü", "Eksik yaptı", "Oyunu bozdu", "Çok yavaş"]
        for reason in reasons:
            ttk.Button(
                frame,
                text=reason,
                command=lambda value=reason: (send_feedback(self, False, value), window.destroy()),
            ).pack(fill="x", pady=3)

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        if not hasattr(self, "easy_feedback"):
            return
        status = self.last_status or {}
        task = status.get("task") or {}
        easy = status.get("easy") or {}
        blueprint = easy.get("activeBlueprint") or {}
        task_status = str(task.get("status") or "")
        blueprint_done = str(blueprint.get("status") or "") == "done"
        if task_status == "done" or blueprint_done:
            proof = (status.get("superior") or {}).get("latestProof") or {}
            proof_status = str(proof.get("status") or "unverified").upper()
            score = int(float(proof.get("score", 0) or 0))
            blockers = proof.get("blockers") or []
            detail = f"Tamamlandı · Kanıt: {proof_status} {score}/100"
            if blockers:
                detail += " · Eksik: " + ", ".join(str(item) for item in blockers[:3])
            else:
                detail += " · Playtest ve Output sonucu kaydedildi."
            self.easy_feedback_text.configure(text=detail)
            if not self.easy_feedback.winfo_ismapped():
                self.easy_feedback.pack(fill="x", padx=8, pady=(8, 0))
        elif self.easy_feedback.winfo_ismapped():
            self.easy_feedback.pack_forget()

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

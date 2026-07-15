#!/usr/bin/env python3
"""Last-mile visibility guard for the single-screen ZeroScript One workspace.

Older UI layers create notebook tabs before the One workspace is inserted. Using
`forget()` while several delayed wrappers are still settling can leave a valid
One frame unmapped, producing a completely empty notebook. This guard runs last,
hides legacy tabs without deleting them, and restores a functional fallback if
the One frame was not built.
"""
from __future__ import annotations

import threading
from tkinter import END, StringVar, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    previous_build_ui = hub.ZeroScriptHub._build_ui

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.title(f"ZeroScript One {hub.VERSION}")

        if not hasattr(self, "notebook"):
            raise RuntimeError("ZeroScript notebook oluşturulamadı.")

        if not hasattr(self, "one_tab"):
            self.one_tab = ttk.Frame(self.notebook)
            self.notebook.insert(0, self.one_tab, text="ZeroScript One")

        if not self.one_tab.winfo_children():
            _build_fallback(self, hub)

        def reveal() -> None:
            try:
                one_id = str(self.one_tab)
                tabs = [str(item) for item in self.notebook.tabs()]
                if one_id not in tabs:
                    self.notebook.insert(0, self.one_tab, text="ZeroScript One")
                    tabs = [str(item) for item in self.notebook.tabs()]
                self.notebook.tab(self.one_tab, state="normal", text="ZeroScript One")
                for tab_id in tabs:
                    if tab_id == one_id:
                        continue
                    try:
                        self.notebook.hide(tab_id)
                    except hub.tk.TclError:
                        pass
                self.notebook.select(self.one_tab)
                self.notebook.pack(fill="both", expand=True, padx=20, pady=(0, 18))
                self.one_tab.update_idletasks()
            except Exception as exc:
                try:
                    self.log(f"ZeroScript One ekranı gösterilemedi: {exc}")
                except Exception:
                    pass

        # Tk/ttk and the layered installers may each schedule geometry work. Run
        # the idempotent reveal after every relevant settling window.
        self.after_idle(reveal)
        self.after(180, reveal)
        self.after(700, reveal)
        self.after(1600, reveal)

    hub.ZeroScriptHub._build_ui = build_ui


def _build_fallback(self: Any, hub: Any) -> None:
    """Create a compact but fully usable screen if the richer UI failed to build."""
    root = ttk.Frame(self.one_tab, style="Card.TFrame", padding=20)
    root.pack(fill="both", expand=True, padx=8, pady=8)

    hero = ttk.Frame(root, style="Hero.TFrame", padding=(18, 14))
    hero.pack(fill="x")
    ttk.Label(hero, text="ZeroScript One", style="Hero.Title.TLabel").pack(side="left")
    self.one_state = getattr(self, "one_state", StringVar(value="Hazır"))
    ttk.Label(hero, textvariable=self.one_state, style="Pill.TLabel").pack(side="right")

    status = ttk.Frame(root, style="Card.TFrame")
    status.pack(fill="x", pady=(12, 0))
    status.columnconfigure((0, 1, 2), weight=1, uniform="fallback_status")
    self.one_bridge = _status_card(status, "Start / Bridge", 0)
    self.one_studio = _status_card(status, "Roblox Studio", 1)
    self.one_ai = _status_card(status, "ChatGPT", 2)

    prompt_card = ttk.LabelFrame(root, text="Oyunda ne yapayım?", padding=12)
    prompt_card.pack(fill="both", expand=True, pady=(12, 0))
    self.one_prompt = hub.tk.Text(prompt_card, height=12, wrap="word", font=("Segoe UI", 13), padx=14, pady=13)
    self.one_prompt.pack(fill="both", expand=True)
    self.one_prompt.insert("1.0", str(self.settings.get("oneLastGoal") or ""))
    self.one_mode = getattr(self, "one_mode", StringVar(value="custom"))
    self.one_submitting = False
    self.one_last_activity = ""

    controls = ttk.Frame(prompt_card, style="Card.TFrame")
    controls.pack(fill="x", pady=(10, 0))
    self.one_start = ttk.Button(controls, text="✦ Yap", style="Primary.TButton", command=lambda: _fallback_start(self, hub))
    self.one_start.pack(side="left", fill="x", expand=True)
    ttk.Button(controls, text="Durdur", style="Danger.TButton", command=lambda: self.action("workbench_stop", quiet=True)).pack(side="left", padx=(8, 0))
    ttk.Button(controls, text="Geri al", command=lambda: self.action("rollback")).pack(side="left", padx=(8, 0))
    ttk.Button(controls, text="ChatGPT aç", command=lambda: hub.os.startfile("https://chatgpt.com/")).pack(side="left", padx=(8, 0))
    self.one_hint = ttk.Label(prompt_card, text="ChatGPT Max tek geçişte yapım, test ve düzeltmeyi tamamlar.", style="Muted.Card.TLabel")
    self.one_hint.pack(anchor="w", pady=(8, 0))

    # Keep the attribute contract expected by the normal status refresher.
    self.one_activity = ttk.Treeview(root, columns=("detail",), show="tree", height=5)
    self.one_activity.column("#0", width=240, stretch=True)
    self.one_activity.column("detail", width=500, stretch=True)
    self.one_activity.pack(fill="x", pady=(12, 0))
    self.one_task_title = ttk.Label(root, text="Aktif iş yok", style="Hero.Title.TLabel")
    self.one_task_title.pack(anchor="w", pady=(12, 0))
    self.one_task_detail = ttk.Label(root, text="İsteğini yaz ve Yap'a bas.", style="Hero.Sub.TLabel", wraplength=900, justify="left")
    self.one_task_detail.pack(anchor="w", pady=(4, 8))
    self.one_progress = ttk.Progressbar(root, maximum=100)
    self.one_progress.pack(fill="x")


def _status_card(parent: Any, title: str, column: int) -> Any:
    frame = ttk.Frame(parent, style="Inset.TFrame", padding=11)
    frame.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 6, 0))
    ttk.Label(frame, text=title, style="Hero.Sub.TLabel").pack(anchor="w")
    value = ttk.Label(frame, text="Kontrol ediliyor", style="Hero.Title.TLabel")
    value.pack(anchor="w", pady=(3, 0))
    return value


def _fallback_start(self: Any, hub: Any) -> None:
    if self.one_submitting:
        return
    goal = self.one_prompt.get("1.0", END).strip()
    if not goal:
        messagebox.showwarning("ZeroScript", "Önce yapılacak işi yaz.")
        return
    self.one_submitting = True
    self.one_start.configure(state="disabled", text="Hazırlanıyor…")
    self.one_state.set("Bağlantılar hazırlanıyor")
    self.settings["oneLastGoal"] = goal
    hub.save_json(hub.SETTINGS_FILE, self.settings)

    def worker() -> None:
        try:
            self.start_services()
            result = self.action("workbench_start", {"goal": goal, "source": "desktop_fallback"}, quiet=True)
            if not result.get("ok"):
                self.after(0, messagebox.showerror, "ZeroScript", result.get("error", "Görev gönderilemedi."))
                self.after(0, self.one_state.set, "Başlatılamadı")
            else:
                self.after(0, self.one_state.set, "Çalışıyor")
                self.after(0, self.one_task_title.configure, {"text": "ChatGPT çalışıyor"})
                self.after(0, self.one_task_detail.configure, {"text": "Görev ChatGPT Max akışına gönderildi."})
        finally:
            def finish() -> None:
                self.one_submitting = False
                self.one_start.configure(state="normal", text="✦ Yap")
            self.after(0, finish)

    threading.Thread(target=worker, daemon=True).start()

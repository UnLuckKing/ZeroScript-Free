#!/usr/bin/env python3
"""ZeroScript 1.33 single-screen desktop workspace."""
from __future__ import annotations

import threading
import time
from tkinter import END, StringVar, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.one_tab = ttk.Frame(self.notebook)
        self.notebook.insert(0, self.one_tab, text="ZeroScript One")
        self.one_submitting = False
        self.one_state = StringVar(value="Hazırlanıyor")
        self.one_last_activity = ""
        build_one(self)
        self.after(140, lambda: show_only_one(self))
        self.after(500, lambda: open_pair_window(self))

    def build_one(self: Any) -> None:
        root = ttk.Frame(self.one_tab, style="Card.TFrame", padding=18)
        root.pack(fill="both", expand=True, padx=6, pady=6)

        hero = ttk.Frame(root, style="Hero.TFrame", padding=(20, 15))
        hero.pack(fill="x")
        left = ttk.Frame(hero, style="Hero.TFrame")
        left.pack(side="left", fill="x", expand=True)
        ttk.Label(left, text="ZeroScript One", style="Hero.Title.TLabel").pack(anchor="w")
        ttk.Label(left, text="Tek istek · tek AI · tek uygulama geçişi", style="Hero.Sub.TLabel").pack(anchor="w", pady=(4, 0))
        self.one_state_pill = ttk.Label(hero, textvariable=self.one_state, style="Pill.TLabel")
        self.one_state_pill.pack(side="right")

        status = ttk.Frame(root, style="Card.TFrame")
        status.pack(fill="x", pady=(12, 0))
        status.columnconfigure((0, 1, 2), weight=1, uniform="one_status")
        self.one_bridge = status_card(status, "Start / Bridge", 0)
        self.one_studio = status_card(status, "Roblox Studio", 1)
        self.one_ai = status_card(status, "AI", 2)

        body = ttk.Panedwindow(root, orient="horizontal")
        body.pack(fill="both", expand=True, pady=(12, 0))
        compose = ttk.Frame(body, style="Card.TFrame", padding=(2, 0, 10, 0))
        activity = ttk.Frame(body, style="Card.TFrame", padding=(10, 0, 2, 0))
        body.add(compose, weight=3)
        body.add(activity, weight=2)

        prompt_card = ttk.LabelFrame(compose, text="Oyunda ne yapayım?", padding=12)
        prompt_card.pack(fill="both", expand=True)
        self.one_prompt = hub.tk.Text(prompt_card, height=15, wrap="word", font=("Segoe UI", 13), padx=14, pady=13)
        self.one_prompt.pack(fill="both", expand=True)
        saved = str(self.settings.get("oneLastGoal") or self.settings.get("easyLastIdea") or "")
        self.one_prompt.insert("1.0", saved)
        self.one_prompt.bind("<Control-Return>", lambda _event: start_one(self))

        quick = ttk.Frame(prompt_card, style="Card.TFrame")
        quick.pack(fill="x", pady=(9, 0))
        for title, text in (
            ("UI düzelt", "Inspect the current player-facing UI, make it professional and responsive, fix every broken button, then playtest desktop and mobile layouts."),
            ("Son hatayı düzelt", "Run the game, inspect the newest verified Studio Output errors, fix only root causes, replay the affected path, and finish with clean Output evidence."),
            ("Oyunu test et", "Playtest the complete main gameplay loop, respawn and rejoin where relevant, fix verified blockers, and report exact evidence."),
        ):
            ttk.Button(quick, text=title, command=lambda value=text: fill_prompt(self, value)).pack(side="left", padx=(0, 7))

        actions = ttk.Frame(compose, style="Card.TFrame")
        actions.pack(fill="x", pady=(10, 0))
        self.one_start = ttk.Button(actions, text="✦ Yap", style="Primary.TButton", command=lambda: start_one(self))
        self.one_start.pack(side="left", fill="x", expand=True)
        ttk.Button(actions, text="Durdur", style="Danger.TButton", command=lambda: stop_one(self)).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Geri al", command=lambda: self.action("rollback")).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="AI aç", command=lambda: open_ai(self)).pack(side="left", padx=(8, 0))
        ttk.Label(compose, text="Ctrl+Enter ile başlat. Yeni istek eski işi otomatik değiştirir.", style="Muted.Card.TLabel").pack(anchor="w", pady=(8, 0))

        activity_card = ttk.LabelFrame(activity, text="Canlı ilerleme", padding=12)
        activity_card.pack(fill="both", expand=True)
        self.one_activity = ttk.Treeview(activity_card, columns=("detail",), show="tree", height=12)
        self.one_activity.column("#0", width=180, stretch=True)
        self.one_activity.column("detail", width=220, stretch=True)
        self.one_activity.pack(fill="both", expand=True)

        current = ttk.Frame(activity_card, style="Inset.TFrame", padding=12)
        current.pack(fill="x", pady=(10, 0))
        self.one_task_title = ttk.Label(current, text="Aktif iş yok", style="Hero.Title.TLabel")
        self.one_task_title.pack(anchor="w")
        self.one_task_detail = ttk.Label(current, text="İsteğini yazıp Yap'a bas.", style="Hero.Sub.TLabel", wraplength=430, justify="left")
        self.one_task_detail.pack(anchor="w", pady=(4, 8))
        self.one_progress = ttk.Progressbar(current, maximum=100)
        self.one_progress.pack(fill="x")

    def status_card(parent: Any, title: str, column: int) -> Any:
        frame = ttk.Frame(parent, style="Inset.TFrame", padding=11)
        frame.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 6, 0))
        ttk.Label(frame, text=title, style="Hero.Sub.TLabel").pack(anchor="w")
        value = ttk.Label(frame, text="Kontrol ediliyor", style="Hero.Title.TLabel")
        value.pack(anchor="w", pady=(3, 0))
        return value

    def show_only_one(self: Any) -> None:
        wanted = str(self.one_tab)
        for tab_id in list(self.notebook.tabs()):
            if str(tab_id) != wanted:
                try:
                    self.notebook.forget(tab_id)
                except hub.tk.TclError:
                    pass
        self.notebook.select(self.one_tab)

    def fill_prompt(self: Any, value: str) -> None:
        self.one_prompt.delete("1.0", END)
        self.one_prompt.insert("1.0", value)
        self.one_prompt.focus_set()

    def open_pair_window(self: Any) -> None:
        try:
            self.start_services()
            self.after(900, lambda: hub.request_json("/pair/start", hub.ensure_token(), "POST", {"seconds": 180}, timeout=1.5))
        except Exception:
            pass

    def open_ai(self: Any) -> None:
        try:
            hub.os.startfile("https://chatgpt.com/")
            self.one_state.set("AI açılıyor")
        except Exception as exc:
            messagebox.showerror("ZeroScript", f"AI sitesi açılamadı:\n{exc}")

    def wait_control(seconds: float = 8.0) -> bool:
        deadline = time.time() + seconds
        while time.time() < deadline:
            health = hub.request_json("/health", timeout=0.6)
            if health.get("ok") and health.get("version") == hub.VERSION:
                return True
            time.sleep(0.25)
        return False

    def wait_started(goal: str, seconds: float = 28.0) -> tuple[bool, str]:
        deadline = time.time() + seconds
        detail = "Extension isteği henüz almadı."
        while time.time() < deadline:
            result = hub.request_json("/status", hub.ensure_token(), timeout=0.9)
            status = result.get("status") if result.get("ok") else {}
            workbench = (status or {}).get("workbench") or {}
            state = str(workbench.get("state") or "")
            if state in {"running", "starting"} and str(workbench.get("goal") or "").strip() == goal.strip():
                return True, str(workbench.get("provider") or workbench.get("selectedProvider") or "AI")
            if state in {"error", "waiting_ai"}:
                return False, str(workbench.get("lastError") or workbench.get("detail") or "Başlatılamadı")
            if not (status or {}).get("extensionConnected"):
                detail = "Chrome extension bağlı değil. AI sekmesini yenile."
            time.sleep(0.4)
        return False, detail

    def start_one(self: Any) -> None:
        if self.one_submitting:
            return
        goal = self.one_prompt.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Ne yapılacağını yaz.")
            self.one_prompt.focus_set()
            return
        self.settings["oneLastGoal"] = goal
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        self.one_submitting = True
        self.one_start.configure(state="disabled", text="Hazırlanıyor…")
        self.one_state.set("Bağlantılar hazırlanıyor")
        self.one_task_title.configure(text="Yeni iş hazırlanıyor")
        self.one_task_detail.configure(text="Eski iş temizlenecek, açık AI otomatik başlatılacak ve tek uygulama geçişi çalışacak.")

        def finish() -> None:
            self.one_submitting = False
            self.one_start.configure(state="normal", text="✦ Yap")

        def fail(text: str) -> None:
            self.after(0, self.one_state.set, "Başlatılamadı")
            self.after(0, self.one_task_title.configure, {"text": "İş başlamadı"})
            self.after(0, self.one_task_detail.configure, {"text": text})
            self.after(0, finish)

        def worker() -> None:
            self.start_services()
            if not wait_control():
                fail("Hub kontrol servisi açılamadı. ZeroScript'i kapatıp yeniden aç.")
                return
            if not hub.port_open(hub.BRIDGE_PORT, 0.15):
                fail("Start.exe veya start.bat açık değil.")
                return
            hub.request_json("/pair/start", hub.ensure_token(), "POST", {"seconds": 180}, timeout=1.5)
            result = self.action("workbench_start", {"goal": goal, "source": "desktop"}, quiet=True)
            if not result.get("ok"):
                fail(result.get("error", "Görev gönderilemedi."))
                return
            ok, detail = wait_started(goal)
            if not ok:
                fail(detail)
                return
            self.after(0, self.one_state.set, "Çalışıyor")
            self.after(0, self.one_task_title.configure, {"text": f"{detail} çalışıyor"})
            self.after(0, self.one_task_detail.configure, {"text": "Studio değişiklikleri ve test kanıtları canlı ilerlemede görünecek."})
            self.after(0, finish)

        threading.Thread(target=worker, daemon=True).start()

    def stop_one(self: Any) -> None:
        self.action("workbench_stop", quiet=True)
        self.one_state.set("Durduruldu")

    def refresh_one(self: Any) -> None:
        if not hasattr(self, "one_bridge"):
            return
        status = self.last_status or {}
        bridge = status.get("bridge") or {}
        providers = status.get("providers") or []
        workbench = status.get("workbench") or {}
        bridge_ok = hub.port_open(hub.BRIDGE_PORT, 0.04)
        studio_ok = bool(bridge.get("studioConnected"))
        ai_ok = any(bool(item.get("ready")) for item in providers) or bool(workbench.get("readyProviders"))
        self.one_bridge.configure(text="● Açık" if bridge_ok else "○ Kapalı", foreground="#2DD4A3" if bridge_ok else "#F6B84A")
        self.one_studio.configure(text="● Bağlı" if studio_ok else "○ Bekleniyor", foreground="#2DD4A3" if studio_ok else "#F6B84A")
        self.one_ai.configure(text="● Hazır" if ai_ok else "○ Sekme bekleniyor", foreground="#2DD4A3" if ai_ok else "#F6B84A")

        activities = workbench.get("activity") or []
        signature = "|".join(str(item.get("id") or "") for item in activities)
        if signature != self.one_last_activity:
            self.one_last_activity = signature
            for item in self.one_activity.get_children():
                self.one_activity.delete(item)
            symbols = {"done": "✓", "active": "●", "error": "!", "warn": "•"}
            for item in activities[-8:]:
                self.one_activity.insert("", END, text=f"{symbols.get(item.get('kind'), '○')} {item.get('text', '')}", values=(item.get("detail", ""),))

        state = str(workbench.get("state") or "idle")
        task = status.get("task") or {}
        progress = ((status.get("productivity") or {}).get("progress") or {})
        if state in {"preparing", "starting", "running"}:
            self.one_state.set("Çalışıyor")
            self.one_task_title.configure(text=str(workbench.get("provider") or workbench.get("selectedProvider") or "AI") + " çalışıyor")
            self.one_task_detail.configure(text=str(workbench.get("detail") or task.get("goal") or ""))
            self.one_progress["value"] = float(progress.get("percent", 35 if state == "running" else 10) or 0)
        elif state == "done":
            self.one_state.set("Tamamlandı")
            self.one_task_title.configure(text="✓ Tamamlandı")
            self.one_task_detail.configure(text=str(workbench.get("detail") or "Değişiklik ve test raporu hazır."))
            self.one_progress["value"] = 100
        elif state in {"error", "waiting_ai"}:
            self.one_state.set("Sorun var")
            self.one_task_title.configure(text="İş tamamlanamadı")
            self.one_task_detail.configure(text=str(workbench.get("lastError") or workbench.get("detail") or ""))
        elif not self.one_submitting:
            self.one_state.set("Hazır" if bridge_ok and studio_ok else "Bağlantı bekleniyor")
            self.one_task_title.configure(text="Aktif iş yok")
            self.one_task_detail.configure(text="İsteğini yazıp Yap'a bas.")
            self.one_progress["value"] = 0

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            refresh_one(self)
        except Exception as exc:
            self.log(f"ZeroScript One görünümü yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

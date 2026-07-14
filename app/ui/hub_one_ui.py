#!/usr/bin/env python3
"""ZeroScript 1.34 single-screen desktop workspace."""
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
        self.one_mode = StringVar(value=str(self.settings.get("oneMode") or "prototype"))
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
        ttk.Label(left, text="Hazır template ile dakikalar içinde prototip · tek AI ile özel geliştirme", style="Hero.Sub.TLabel").pack(anchor="w", pady=(4, 0))
        ttk.Label(hero, textvariable=self.one_state, style="Pill.TLabel").pack(side="right")

        status = ttk.Frame(root, style="Card.TFrame")
        status.pack(fill="x", pady=(12, 0))
        status.columnconfigure((0, 1, 2), weight=1, uniform="one_status")
        self.one_bridge = status_card(status, "Start / Bridge", 0)
        self.one_studio = status_card(status, "Roblox Studio", 1)
        self.one_ai = status_card(status, "AI", 2)

        mode_card = ttk.LabelFrame(root, text="Nasıl çalışsın?", padding=10)
        mode_card.pack(fill="x", pady=(12, 0))
        self.mode_buttons: dict[str, ttk.Button] = {}
        modes = (
            ("prototype", "⚡ 15 dk Prototip", "AI beklemeden Golden RNG Template kurar: roll, pity, luck, inventory, save, UI ve map."),
            ("launch", "🚀 1 Günlük Yayın", "Önce çalışan template kurar, sonra tek AI geçişiyle polish ve yayın testi yapar."),
            ("custom", "✦ Özel İş", "Mevcut oyunda yazdığın işi tek builder geçişinde yapar ve kendi test eder."),
        )
        for key, title, detail in modes:
            frame = ttk.Frame(mode_card, style="Inset.TFrame", padding=9)
            frame.pack(side="left", fill="x", expand=True, padx=(0, 7 if key != "custom" else 0))
            button = ttk.Button(frame, text=title, command=lambda value=key: set_mode(self, value))
            button.pack(fill="x")
            ttk.Label(frame, text=detail, style="Hero.Sub.TLabel", wraplength=330, justify="left").pack(anchor="w", pady=(5, 0))
            self.mode_buttons[key] = button
        refresh_mode_buttons(self)

        body = ttk.Panedwindow(root, orient="horizontal")
        body.pack(fill="both", expand=True, pady=(12, 0))
        compose = ttk.Frame(body, style="Card.TFrame", padding=(2, 0, 10, 0))
        activity = ttk.Frame(body, style="Card.TFrame", padding=(10, 0, 2, 0))
        body.add(compose, weight=3)
        body.add(activity, weight=2)

        prompt_card = ttk.LabelFrame(compose, text="Oyun fikrin veya yapılacak iş", padding=12)
        prompt_card.pack(fill="both", expand=True)
        self.one_prompt = hub.tk.Text(prompt_card, height=12, wrap="word", font=("Segoe UI", 13), padx=14, pady=13)
        self.one_prompt.pack(fill="both", expand=True)
        saved = str(self.settings.get("oneLastGoal") or self.settings.get("easyLastIdea") or "")
        self.one_prompt.insert("1.0", saved)
        self.one_prompt.bind("<Control-Return>", lambda _event: start_one(self))

        quick = ttk.Frame(prompt_card, style="Card.TFrame")
        quick.pack(fill="x", pady=(9, 0))
        for title, text, mode in (
            ("Aura RNG", "Celestial temalı profesyonel aura RNG oyunu yap. Oyuncu roll yapsın, aura toplasın, equip etsin ve luck geliştirsin.", "prototype"),
            ("UI düzelt", "Inspect the current player-facing UI, make it professional and responsive, fix every broken button, then playtest desktop and mobile layouts.", "custom"),
            ("Son hatayı düzelt", "Run the game, inspect the newest verified Studio Output errors, fix only root causes, replay the affected path, and finish with clean Output evidence.", "custom"),
        ):
            ttk.Button(quick, text=title, command=lambda value=text, selected=mode: fill_prompt(self, value, selected)).pack(side="left", padx=(0, 7))

        actions = ttk.Frame(compose, style="Card.TFrame")
        actions.pack(fill="x", pady=(10, 0))
        self.one_start = ttk.Button(actions, text="⚡ Prototipi Kur", style="Primary.TButton", command=lambda: start_one(self))
        self.one_start.pack(side="left", fill="x", expand=True)
        ttk.Button(actions, text="Durdur", style="Danger.TButton", command=lambda: stop_one(self)).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Geri al", command=lambda: self.action("rollback")).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="AI aç", command=lambda: open_ai(self)).pack(side="left", padx=(8, 0))
        self.one_hint = ttk.Label(compose, text="Prototip modu AI beklemez ve en fazla iki Studio kurulum çağrısı kullanır.", style="Muted.Card.TLabel")
        self.one_hint.pack(anchor="w", pady=(8, 0))

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
        self.one_task_detail = ttk.Label(current, text="Bir mod seç, isteğini yaz ve başlat.", style="Hero.Sub.TLabel", wraplength=430, justify="left")
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

    def set_mode(self: Any, mode: str) -> None:
        self.one_mode.set(mode)
        self.settings["oneMode"] = mode
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        refresh_mode_buttons(self)

    def refresh_mode_buttons(self: Any) -> None:
        mode = self.one_mode.get()
        labels = {"prototype": "⚡ Prototipi Kur", "launch": "🚀 Launch Hazırla", "custom": "✦ Özel İşi Yap"}
        hints = {
            "prototype": "AI beklemez. Golden RNG Template iki Studio çağrısıyla kurulur ve doğrulanır.",
            "launch": "Template kurulur; ardından tek AI yalnızca polish, mobil test ve yayın engelleriyle ilgilenir.",
            "custom": "Bir AI mevcut projedeki işi baştan sona sahiplenir; ayrı reviewer veya QA açılmaz.",
        }
        if hasattr(self, "one_start"):
            self.one_start.configure(text=labels.get(mode, "✦ Yap"))
            self.one_hint.configure(text=hints.get(mode, ""))
        for key, button in getattr(self, "mode_buttons", {}).items():
            button.configure(style="Primary.TButton" if key == mode else "TButton")

    def fill_prompt(self: Any, value: str, mode: str = "custom") -> None:
        set_mode(self, mode)
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

    def wait_started(goal: str, mode: str, seconds: float = 190.0) -> tuple[bool, str]:
        deadline = time.time() + seconds
        detail = "Extension isteği henüz almadı."
        while time.time() < deadline:
            result = hub.request_json("/status", hub.ensure_token(), timeout=0.9)
            status = result.get("status") if result.get("ok") else {}
            if mode in {"prototype", "launch"}:
                item = (status or {}).get("prototype") or {}
                state = str(item.get("state") or "")
                if state in {"installing", "verifying", "polishing", "done"} and str(item.get("goal") or "").strip() == goal.strip():
                    return True, str(item.get("config", {}).get("title") or "RNG Prototip")
                if state == "error":
                    return False, str(item.get("lastError") or "Prototip kurulamadı")
            else:
                item = (status or {}).get("workbench") or {}
                state = str(item.get("state") or "")
                if state in {"running", "starting"} and str(item.get("goal") or "").strip() == goal.strip():
                    return True, str(item.get("provider") or item.get("selectedProvider") or "AI")
                if state in {"error", "waiting_ai"}:
                    return False, str(item.get("lastError") or item.get("detail") or "Başlatılamadı")
            if not (status or {}).get("extensionConnected"):
                detail = "Chrome extension bağlı değil. Uzantıyı yeniden yükle veya Chrome'u yeniden aç."
            time.sleep(0.4)
        return False, detail

    def start_one(self: Any) -> None:
        if self.one_submitting:
            return
        goal = self.one_prompt.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Oyun fikrini veya yapılacak işi yaz.")
            self.one_prompt.focus_set()
            return
        mode = self.one_mode.get()
        self.settings["oneLastGoal"] = goal
        self.settings["oneMode"] = mode
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        self.one_submitting = True
        self.one_start.configure(state="disabled", text="Hazırlanıyor…")
        self.one_state.set("Bağlantılar hazırlanıyor")
        self.one_task_title.configure(text="Yeni iş hazırlanıyor")
        self.one_task_detail.configure(text="Eski iş temizlenecek ve seçilen hızlı akış başlayacak.")

        def finish() -> None:
            self.one_submitting = False
            refresh_mode_buttons(self)
            self.one_start.configure(state="normal")

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
                fail("Start / Bridge açık değil. ZeroScript One.bat dosyasını yeniden aç.")
                return
            hub.request_json("/pair/start", hub.ensure_token(), "POST", {"seconds": 180}, timeout=1.5)
            action = "prototype_start" if mode == "prototype" else "launch_day_start" if mode == "launch" else "workbench_start"
            result = self.action(action, {"goal": goal, "source": "desktop"}, quiet=True)
            if not result.get("ok"):
                fail(result.get("error", "Görev gönderilemedi."))
                return
            ok, detail = wait_started(goal, mode)
            if not ok:
                fail(detail)
                return
            self.after(0, self.one_state.set, "Çalışıyor" if mode != "prototype" else "Kuruluyor")
            self.after(0, self.one_task_title.configure, {"text": detail})
            self.after(0, self.one_task_detail.configure, {"text": "Gerçek kurulum ve doğrulama adımları canlı ilerlemede görünecek."})
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
        prototype = status.get("prototype") or {}
        bridge_ok = hub.port_open(hub.BRIDGE_PORT, 0.04)
        studio_ok = bool(bridge.get("studioConnected"))
        ai_ok = any(bool(item.get("ready")) for item in providers) or bool(workbench.get("readyProviders"))
        self.one_bridge.configure(text="● Açık" if bridge_ok else "○ Kapalı", foreground="#2DD4A3" if bridge_ok else "#F6B84A")
        self.one_studio.configure(text="● Bağlı" if studio_ok else "○ Bekleniyor", foreground="#2DD4A3" if studio_ok else "#F6B84A")
        ai_text = "● Hazır" if ai_ok else ("○ İsteğe bağlı" if self.one_mode.get() == "prototype" else "○ Sekme bekleniyor")
        self.one_ai.configure(text=ai_text, foreground="#2DD4A3" if ai_ok else "#9AA5B6" if self.one_mode.get() == "prototype" else "#F6B84A")

        use_prototype = int(prototype.get("startedAt") or 0) >= int(workbench.get("startedAt") or 0) and str(prototype.get("state") or "idle") != "idle"
        current = prototype if use_prototype else workbench
        activities = current.get("activity") or []
        signature = ("p:" if use_prototype else "w:") + "|".join(str(item.get("id") or "") for item in activities)
        if signature != self.one_last_activity:
            self.one_last_activity = signature
            for item in self.one_activity.get_children():
                self.one_activity.delete(item)
            symbols = {"done": "✓", "active": "●", "error": "!", "warn": "•"}
            for item in activities[-9:]:
                self.one_activity.insert("", END, text=f"{symbols.get(item.get('kind'), '○')} {item.get('text', '')}", values=(item.get("detail", ""),))

        state = str(current.get("state") or "idle")
        progress = ((status.get("productivity") or {}).get("progress") or {})
        if use_prototype:
            percentages = {"preparing": 8, "installing": 42, "verifying": 78, "polishing": 88, "done": 100, "error": 0}
            self.one_progress["value"] = percentages.get(state, 0)
            if state in {"preparing", "installing", "verifying", "polishing"}:
                self.one_state.set("Kuruluyor" if state != "polishing" else "Polish yapılıyor")
                title = str((prototype.get("config") or {}).get("title") or "RNG Prototip")
                self.one_task_title.configure(text=title)
                self.one_task_detail.configure(text=str((activities[-1].get("detail") or activities[-1].get("text")) if activities else "Hazırlanıyor"))
            elif state == "done":
                self.one_state.set("Prototip hazır")
                self.one_task_title.configure(text="✓ Oynanabilir prototip hazır")
                self.one_task_detail.configure(text="Roll, pity, luck, inventory, equip, save, responsive UI ve map shell kuruldu.")
            elif state == "error":
                self.one_state.set("Sorun var")
                self.one_task_title.configure(text="Prototip tamamlanamadı")
                self.one_task_detail.configure(text=str(prototype.get("lastError") or ""))
        else:
            task = status.get("task") or {}
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
                self.one_task_detail.configure(text="Bir mod seç, isteğini yaz ve başlat.")
                self.one_progress["value"] = 0

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            refresh_one(self)
        except Exception as exc:
            self.log(f"ZeroScript One görünümü yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

#!/usr/bin/env python3
"""ZeroScript 1.31.1 one-screen Easy Mode.

The user writes one request and presses one button. Advanced tabs stay hidden,
old work is replaced, and the manually launched Start bridge is respected.
"""
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
        self.easy_tab = ttk.Frame(self.notebook)
        self.notebook.insert(0, self.easy_tab, text="Kolay Mod")
        self.easy_state_var = StringVar(value="Hazırlanıyor…")
        self.easy_last_blueprint_id = ""
        self.easy_submitting = False
        build_easy(self)
        self.after(80, lambda: show_only_easy(self))

    def build_easy(self: Any) -> None:
        root = ttk.Frame(self.easy_tab, style="Card.TFrame", padding=22)
        root.pack(fill="both", expand=True, padx=6, pady=8)

        header = ttk.Frame(root, style="Hero.TFrame", padding=(20, 16))
        header.pack(fill="x")
        title = ttk.Frame(header, style="Hero.TFrame")
        title.pack(side="left", fill="x", expand=True)
        ttk.Label(title, text="Oyunun için ne yapayım?", style="Hero.Title.TLabel").pack(anchor="w")
        ttk.Label(
            title,
            text="Normal şekilde yaz. Eski iş otomatik silinir ve yalnızca bu istek çalışır.",
            style="Hero.Sub.TLabel",
        ).pack(anchor="w", pady=(5, 0))
        self.easy_state_pill = ttk.Label(header, textvariable=self.easy_state_var, style="Pill.TLabel")
        self.easy_state_pill.pack(side="right")

        composer = ttk.Frame(root, style="Card.TFrame", padding=(8, 18, 8, 10))
        composer.pack(fill="both", expand=True)
        self.easy_idea = hub.tk.Text(
            composer,
            height=12,
            wrap="word",
            font=("Segoe UI", 13),
            padx=15,
            pady=14,
        )
        self.easy_idea.pack(fill="both", expand=True)
        self.easy_idea.insert("1.0", str(self.settings.get("easyLastIdea", "")))
        self.easy_idea.bind("<Control-Return>", lambda _event: submit_request(self))

        actions = ttk.Frame(composer, style="Card.TFrame")
        actions.pack(fill="x", pady=(12, 0))
        self.easy_build_button = ttk.Button(
            actions,
            text="✦ Başlat",
            style="Primary.TButton",
            command=lambda: submit_request(self),
        )
        self.easy_build_button.pack(side="left", fill="x", expand=True)
        ttk.Button(actions, text="Durdur ve temizle", style="Danger.TButton", command=lambda: clear_work(self)).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Start'ı aç", command=lambda: open_manual_bridge(self)).pack(side="left", padx=(8, 0))

        ttk.Label(
            composer,
            text="Ctrl+Enter ile de başlatabilirsin. Oyun türü, model, görev sırası ve testleri ZeroScript seçer.",
            style="Muted.Card.TLabel",
        ).pack(anchor="w", pady=(9, 0))

        status_card = ttk.LabelFrame(root, text="Durum", padding=14)
        status_card.pack(fill="x", padx=8, pady=(0, 8))
        status_card.columnconfigure((0, 1, 2), weight=1, uniform="easy_status")
        self.easy_bridge_status = status_box(status_card, "Start / Bridge", 0)
        self.easy_studio_status = status_box(status_card, "Roblox Studio", 1)
        self.easy_ai_status = status_box(status_card, "AI", 2)

        work = ttk.Frame(root, style="Inset.TFrame", padding=14)
        work.pack(fill="x", padx=8, pady=(2, 0))
        self.easy_task_title = ttk.Label(work, text="Aktif iş yok", style="Hero.Title.TLabel")
        self.easy_task_title.pack(anchor="w")
        self.easy_task_detail = ttk.Label(
            work,
            text="Önce Start.exe/start.bat ve Roblox Studio açık olsun. Sonra isteğini yazıp Başlat'a bas.",
            style="Hero.Sub.TLabel",
            wraplength=1050,
            justify="left",
        )
        self.easy_task_detail.pack(anchor="w", pady=(5, 8))
        self.easy_progress = ttk.Progressbar(work, maximum=100)
        self.easy_progress.pack(fill="x")

    def status_box(parent: Any, title: str, column: int) -> Any:
        box = ttk.Frame(parent, style="Inset.TFrame", padding=10)
        box.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 5, 0))
        ttk.Label(box, text=title, style="Hero.Sub.TLabel").pack(anchor="w")
        value = ttk.Label(box, text="Kontrol ediliyor", style="Hero.Title.TLabel")
        value.pack(anchor="w", pady=(4, 0))
        return value

    def show_only_easy(self: Any) -> None:
        easy_id = str(self.easy_tab)
        for tab_id in list(self.notebook.tabs()):
            if str(tab_id) != easy_id:
                try:
                    self.notebook.forget(tab_id)
                except hub.tk.TclError:
                    pass
        self.notebook.select(self.easy_tab)

    def infer_genre(text: str) -> str:
        low = text.lower()
        if "rng" in low or "aura" in low or "roll" in low:
            return "RNG / Aura"
        if "simulator" in low:
            return "Simulator"
        if "clicker" in low or "incremental" in low or "tap" in low:
            return "Clicker / Incremental"
        if "tycoon" in low:
            return "Tycoon"
        if "obby" in low:
            return "Obby"
        if "pet" in low:
            return "Pet Collection"
        return "Custom"

    def open_manual_bridge(self: Any) -> None:
        if hub.port_open(hub.BRIDGE_PORT, 0.15):
            self.easy_state_var.set("Start zaten açık")
            return
        candidates = [hub.ROOT / "Start.exe", hub.ROOT / "start.exe", hub.ROOT / "start.bat"]
        target = next((path for path in candidates if path.exists()), None)
        if not target:
            messagebox.showerror("ZeroScript", "Start.exe veya start.bat bulunamadı.")
            return
        try:
            hub.os.startfile(str(target))
            self.easy_state_var.set("Start açılıyor")
        except Exception as exc:
            messagebox.showerror("ZeroScript", f"Start açılamadı:\n{exc}")

    def clear_work(self: Any, quiet: bool = False) -> None:
        def worker() -> None:
            self.start_services()  # only the small Hub control service in 1.31.1
            wait_control(8)
            self.action("easy_reset", quiet=True)
            self.after(0, self.easy_progress.configure, {"value": 0})
            self.after(0, self.easy_task_title.configure, {"text": "Aktif iş yok"})
            self.after(0, self.easy_task_detail.configure, {"text": "Eski görev ve görev kuyruğu temizlendi."})
            self.after(0, self.easy_state_var.set, "Temizlendi")
            if not quiet:
                self.log("Eski görev, kuyruk ve oyun planı temizlendi.")
        threading.Thread(target=worker, daemon=True).start()

    def wait_control(seconds: float) -> bool:
        deadline = time.time() + seconds
        while time.time() < deadline:
            health = hub.request_json("/health", timeout=0.5)
            if health.get("ok") and health.get("version") == hub.VERSION:
                return True
            time.sleep(0.25)
        return False

    def wait_extension(seconds: float) -> bool:
        deadline = time.time() + seconds
        while time.time() < deadline:
            result = hub.request_json("/status", hub.ensure_token(), timeout=0.7)
            if result.get("ok") and (result.get("status") or {}).get("extensionConnected"):
                return True
            time.sleep(0.35)
        return False

    def wait_blueprint(previous_id: str, seconds: float = 15.0) -> tuple[bool, str]:
        deadline = time.time() + seconds
        detail = "Extension planı henüz oluşturmadı."
        while time.time() < deadline:
            result = hub.request_json("/status", hub.ensure_token(), timeout=0.8)
            status = result.get("status") if result.get("ok") else {}
            easy = (status or {}).get("easy") or {}
            active = easy.get("activeBlueprint") or {}
            blueprint_id = str(active.get("id") or "")
            task = (status or {}).get("task") or {}
            queue = ((status or {}).get("productivity") or {}).get("queue") or []
            if blueprint_id and blueprint_id != previous_id and (queue or task):
                return True, blueprint_id
            if not (status or {}).get("extensionConnected"):
                detail = "Chrome extension bağlı değil."
            time.sleep(0.4)
        return False, detail

    def submit_request(self: Any) -> None:
        if self.easy_submitting:
            return
        idea = self.easy_idea.get("1.0", END).strip()
        if not idea:
            messagebox.showwarning("ZeroScript", "Ne yapmak istediğini yaz.")
            self.easy_idea.focus_set()
            return

        self.settings["easyLastIdea"] = idea
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        self.easy_submitting = True
        self.easy_build_button.configure(state="disabled", text="Hazırlanıyor…")
        self.easy_state_var.set("Kontrol ediliyor")
        self.easy_task_title.configure(text="Yeni istek hazırlanıyor")
        self.easy_task_detail.configure(text="Eski görev temizlenecek ve yalnızca bu istek başlayacak.")

        def finish_button() -> None:
            self.easy_submitting = False
            self.easy_build_button.configure(state="normal", text="✦ Başlat")

        def fail(text: str) -> None:
            self.after(0, self.easy_state_var.set, "Başlatılamadı")
            self.after(0, self.easy_task_title.configure, {"text": "İş başlamadı"})
            self.after(0, self.easy_task_detail.configure, {"text": text})
            self.after(0, finish_button)

        def worker() -> None:
            self.start_services()
            if not wait_control(8):
                fail("Hub kontrol servisi açılamadı. ZeroScript'i kapatıp tekrar aç.")
                return
            if not hub.port_open(hub.BRIDGE_PORT, 0.15):
                fail("Start.exe/start.bat açık değil. Start'ı aç, pencereyi küçült ve tekrar Başlat'a bas.")
                return

            before = hub.request_json("/status", self.token, timeout=0.8)
            status = before.get("status") if before.get("ok") else {}
            previous_id = str((((status or {}).get("easy") or {}).get("activeBlueprint") or {}).get("id") or "")

            if not (status or {}).get("extensionConnected"):
                hub.request_json("/pair/start", self.token, "POST", {"seconds": 120}, timeout=1.5)
                self.after(0, self.easy_state_var.set, "Extension bağlanıyor")
                if not wait_extension(8):
                    fail("Chrome'da ZeroScript uzantı simgesine bir kez bas, sonra tekrar Başlat'a bas.")
                    return

            payload = {
                "idea": idea,
                "genre": infer_genre(idea),
                "target": "Yayınlanabilir oyun",
                "device": "Masaüstü + mobil",
                "autoStart": True,
                "fresh": True,
            }
            result = self.action("build_game_blueprint", payload, quiet=True)
            if not result.get("ok"):
                fail(result.get("error", "Oyun planı gönderilemedi."))
                return

            accepted, value = wait_blueprint(previous_id)
            if not accepted:
                fail(value)
                return

            self.easy_last_blueprint_id = value
            self.after(0, self.easy_state_var.set, "Çalışıyor")
            self.after(0, self.easy_task_title.configure, {"text": "Yeni iş başladı"})
            self.after(0, self.easy_task_detail.configure, {"text": "Plan oluşturuldu. İlk görev modele gönderiliyor; ilerleme aşağıda görünecek."})
            self.after(0, finish_button)
            self.log("Yeni Easy Mode isteği doğrulandı ve işleme alındı.")

        threading.Thread(target=worker, daemon=True).start()

    def refresh_easy(self: Any) -> None:
        if not hasattr(self, "easy_bridge_status"):
            return
        status = self.last_status or {}
        bridge_state = status.get("bridge") or {}
        providers = status.get("providers") or []
        bridge_ok = hub.port_open(hub.BRIDGE_PORT, 0.05)
        studio_ok = bool(bridge_state.get("studioConnected"))
        ai_ok = any(bool(provider.get("ready")) for provider in providers)

        self.easy_bridge_status.configure(text="● Açık" if bridge_ok else "○ Start'ı aç", foreground="#2DD4A3" if bridge_ok else "#F6B84A")
        self.easy_studio_status.configure(text="● Bağlı" if studio_ok else "○ MCP bekleniyor", foreground="#2DD4A3" if studio_ok else "#F6B84A")
        self.easy_ai_status.configure(text="● Hazır" if ai_ok else "○ Model bekleniyor", foreground="#2DD4A3" if ai_ok else "#F6B84A")

        task = status.get("task") or {}
        easy = status.get("easy") or {}
        active = easy.get("activeBlueprint") or {}
        progress = ((status.get("productivity") or {}).get("progress") or {})
        if task:
            task_status = str(task.get("status") or "running")
            self.easy_task_title.configure(text=f"{task_status.upper()} · {task.get('phase') or 'hazırlanıyor'}")
            self.easy_task_detail.configure(text=str(task.get("error") or task.get("goal") or "")[:350])
            self.easy_progress["value"] = float(progress.get("percent", 0) or 0)
            if task_status in {"running", "queued"}:
                self.easy_state_var.set("Çalışıyor")
        elif active:
            completed = int(active.get("completedStages", 0) or 0)
            total = len(active.get("stages") or [])
            self.easy_task_title.configure(text=f"Oyun planı · {completed}/{total}")
            self.easy_task_detail.configure(text="Sıradaki görev hazırlanıyor.")
            self.easy_progress["value"] = float(active.get("percent", 0) or 0)
        elif not self.easy_submitting:
            self.easy_task_title.configure(text="Aktif iş yok")
            self.easy_task_detail.configure(text="İsteğini yazıp Başlat'a bas.")
            self.easy_progress["value"] = 0
            self.easy_state_var.set("Hazır" if bridge_ok else "Start bekleniyor")

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            refresh_easy(self)
        except Exception as exc:
            self.log(f"Kolay Mod yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

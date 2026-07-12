#!/usr/bin/env python3
"""Beginner-first, low-friction ZeroScript Hub dashboard for version 1.31."""
from __future__ import annotations

import time
from tkinter import END, BooleanVar, StringVar, messagebox, ttk
from typing import Any, Callable


GENRES = [
    "RNG / Aura",
    "Simulator",
    "Clicker / Incremental",
    "Tycoon",
    "Obby",
    "Pet Collection",
    "Custom",
]
TARGETS = [
    "Hızlı prototip",
    "Yayınlanabilir oyun",
    "Premium kalite",
]
DEVICES = [
    "Mobil öncelikli",
    "Masaüstü + mobil",
    "Masaüstü öncelikli",
]


def install(hub: Any) -> None:
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status
    previous_save_settings = hub.ZeroScriptHub.save_settings

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.easy_tab = ttk.Frame(self.notebook)
        self.notebook.insert(0, self.easy_tab, text="Kolay Mod")
        self._zs_all_tabs = [str(tab) for tab in self.notebook.tabs()]
        self.easy_mode_var = BooleanVar(value=bool(self.settings.get("simpleMode", True)))
        self.easy_genre_var = StringVar(value=str(self.settings.get("easyGenre", "RNG / Aura")))
        self.easy_target_var = StringVar(value=str(self.settings.get("easyTarget", "Yayınlanabilir oyun")))
        self.easy_device_var = StringVar(value=str(self.settings.get("easyDevice", "Masaüstü + mobil")))
        self.easy_auto_continue_var = BooleanVar(value=bool(self.settings.get("easyAutoContinue", True)))
        build_easy_dashboard(self)
        self.after(100, lambda: apply_focus_mode(self, self.easy_mode_var.get()))

    def build_easy_dashboard(self: Any) -> None:
        root = ttk.Frame(self.easy_tab, style="Card.TFrame", padding=16)
        root.pack(fill="both", expand=True, padx=4, pady=8)

        top = ttk.Frame(root, style="Hero.TFrame", padding=(18, 14))
        top.pack(fill="x")
        heading = ttk.Frame(top, style="Hero.TFrame")
        heading.pack(side="left", fill="x", expand=True)
        ttk.Label(heading, text="Oyunu hızlı ve kaliteli yap", style="Hero.Title.TLabel").pack(anchor="w")
        ttk.Label(
            heading,
            text="Fikrini yaz. ZeroScript projeyi inceler, doğru sırada görevleri hazırlar ve kanıtlanmış sonuca kadar ilerler.",
            style="Hero.Sub.TLabel",
        ).pack(anchor="w", pady=(4, 0))
        right = ttk.Frame(top, style="Hero.TFrame")
        right.pack(side="right")
        self.easy_ready_label = ttk.Label(right, text="Hazırlanıyor", style="Pill.TLabel")
        self.easy_ready_label.pack(anchor="e")
        self.easy_ready_progress = ttk.Progressbar(right, maximum=100, length=190)
        self.easy_ready_progress.pack(anchor="e", pady=(8, 0))

        body = ttk.Panedwindow(root, orient="horizontal")
        body.pack(fill="both", expand=True, pady=(12, 0))
        main = ttk.Frame(body, style="Card.TFrame", padding=(0, 0, 8, 0))
        side = ttk.Frame(body, style="Card.TFrame", padding=(8, 0, 0, 0))
        body.add(main, weight=5)
        body.add(side, weight=3)

        composer = ttk.LabelFrame(main, text="1 · Ne yapmak istiyorsun?", padding=14)
        composer.pack(fill="both", expand=True)
        self.easy_idea = hub.tk.Text(composer, height=7, wrap="word", font=("Segoe UI", 11), padx=12, pady=10)
        self.easy_idea.pack(fill="both", expand=True)
        self.easy_idea.insert("1.0", str(self.settings.get("easyLastIdea", "")))
        self.easy_idea.bind("<Control-Return>", lambda _event: build_game(self))

        options = ttk.Frame(composer, style="Card.TFrame")
        options.pack(fill="x", pady=(10, 0))
        for column in range(3):
            options.columnconfigure(column, weight=1)
        option_box(options, "Oyun türü", self.easy_genre_var, GENRES, 0)
        option_box(options, "Hedef", self.easy_target_var, TARGETS, 1)
        option_box(options, "Cihaz", self.easy_device_var, DEVICES, 2)

        action_row = ttk.Frame(composer, style="Card.TFrame")
        action_row.pack(fill="x", pady=(12, 0))
        self.easy_build_button = ttk.Button(action_row, text="✦ Oyunu planla ve yap", style="Primary.TButton", command=lambda: build_game(self))
        self.easy_build_button.pack(side="left", fill="x", expand=True)
        ttk.Button(action_row, text="Sadece planı göster", command=lambda: preview_blueprint(self)).pack(side="left", padx=(8, 0))
        ttk.Checkbutton(action_row, text="Görevleri sırayla çalıştır", variable=self.easy_auto_continue_var).pack(side="right", padx=(10, 0))

        hint = ttk.Label(
            composer,
            text="Ctrl+Enter ile başlatabilirsin. Teknik isim, script yolu veya uzun prompt yazman gerekmez.",
            style="Muted.Card.TLabel",
        )
        hint.pack(anchor="w", pady=(9, 0))

        quick = ttk.LabelFrame(main, text="2 · Tek tık işlemler", padding=12)
        quick.pack(fill="x", pady=(10, 0))
        quick.columnconfigure((0, 1), weight=1, uniform="quick")
        quick_card(quick, 0, 0, "Oyunu düzelt", "Hataları, bozuk sistemleri ve Output'u bulup düzelt.", lambda: quick_action(self, "repair_game"))
        quick_card(quick, 0, 1, "UI'yi profesyonelleştir", "Masaüstü ve mobil UI'yi modernleştir, butonları test et.", lambda: quick_action(self, "polish_ui"))
        quick_card(quick, 1, 0, "Oyunu eğlenceli yap", "Ana döngü, ilerleme, ödül ve geri dönüş sebeplerini geliştir.", lambda: quick_action(self, "improve_gameplay"))
        quick_card(quick, 1, 1, "Yayına hazırla", "Güvenlik, veri, performans, mobil ve satın alma kontrolleri.", lambda: quick_action(self, "prepare_release"))

        next_card = ttk.LabelFrame(side, text="Şimdi ne yapmalısın?", padding=14)
        next_card.pack(fill="x")
        self.easy_next_title = ttk.Label(next_card, text="Durum kontrol ediliyor…", style="Status.TLabel", wraplength=360, justify="left")
        self.easy_next_title.pack(anchor="w")
        self.easy_next_detail = ttk.Label(next_card, text="", style="Muted.Card.TLabel", wraplength=360, justify="left")
        self.easy_next_detail.pack(anchor="w", pady=(6, 10))
        self.easy_next_button = ttk.Button(next_card, text="Devam et", style="Success.TButton")
        self.easy_next_button.pack(fill="x")

        health = ttk.LabelFrame(side, text="Bağlantı ve kalite", padding=12)
        health.pack(fill="x", pady=(10, 0))
        self.easy_health_rows: dict[str, tuple[Any, Any]] = {}
        for key, title in (("hub", "ZeroScript"), ("studio", "Roblox Studio"), ("model", "AI modeli"), ("proof", "Kalite kanıtı")):
            row = ttk.Frame(health, style="Card.TFrame")
            row.pack(fill="x", pady=3)
            ttk.Label(row, text=title, style="Card.TLabel").pack(side="left")
            value = ttk.Label(row, text="Kontrol ediliyor", style="Muted.Card.TLabel")
            value.pack(side="right")
            self.easy_health_rows[key] = (row, value)

        progress = ttk.LabelFrame(side, text="Aktif iş", padding=12)
        progress.pack(fill="x", pady=(10, 0))
        self.easy_task_title = ttk.Label(progress, text="Aktif görev yok", style="Status.TLabel", wraplength=360, justify="left")
        self.easy_task_title.pack(anchor="w")
        self.easy_task_detail = ttk.Label(progress, text="Yeni bir oyun fikri yazabilirsin.", style="Muted.Card.TLabel", wraplength=360, justify="left")
        self.easy_task_detail.pack(anchor="w", pady=(5, 7))
        self.easy_task_progress = ttk.Progressbar(progress, maximum=100)
        self.easy_task_progress.pack(fill="x")
        task_buttons = ttk.Frame(progress, style="Card.TFrame")
        task_buttons.pack(fill="x", pady=(8, 0))
        ttk.Button(task_buttons, text="Devam", command=lambda: self.action("retry")).pack(side="left")
        ttk.Button(task_buttons, text="Durdur", command=lambda: self.action("cancel")).pack(side="left", padx=5)
        ttk.Button(task_buttons, text="Geri al", command=lambda: self.action("rollback")).pack(side="right")

        footer = ttk.Frame(side, style="Card.TFrame")
        footer.pack(fill="x", pady=(10, 0))
        self.easy_mode_button = ttk.Button(footer, text="Gelişmiş araçları göster", command=lambda: toggle_focus_mode(self))
        self.easy_mode_button.pack(side="left")
        ttk.Button(footer, text="Bağlantıyı düzelt", command=self.repair).pack(side="right")

    def option_box(parent: Any, title: str, variable: StringVar, values: list[str], column: int) -> None:
        box = ttk.Frame(parent, style="Card.TFrame")
        box.grid(row=0, column=column, sticky="ew", padx=(0 if column == 0 else 5, 0))
        ttk.Label(box, text=title, style="Muted.Card.TLabel").pack(anchor="w")
        ttk.Combobox(box, textvariable=variable, values=values, state="readonly").pack(fill="x", pady=(4, 0))

    def quick_card(parent: Any, row: int, column: int, title: str, detail: str, command: Callable[[], None]) -> None:
        card = ttk.Frame(parent, style="Inset.TFrame", padding=10)
        card.grid(row=row, column=column, sticky="nsew", padx=(0 if column == 0 else 5, 5 if column == 0 else 0), pady=4)
        text = ttk.Frame(card, style="Inset.TFrame")
        text.pack(side="left", fill="both", expand=True)
        ttk.Label(text, text=title, style="Hero.Title.TLabel").pack(anchor="w")
        ttk.Label(text, text=detail, style="Hero.Sub.TLabel", wraplength=310, justify="left").pack(anchor="w", pady=(3, 0))
        ttk.Button(card, text="Başlat", command=command).pack(side="right", padx=(8, 0))

    def persist_easy_settings(self: Any) -> None:
        self.settings.update({
            "simpleMode": self.easy_mode_var.get(),
            "easyGenre": self.easy_genre_var.get(),
            "easyTarget": self.easy_target_var.get(),
            "easyDevice": self.easy_device_var.get(),
            "easyAutoContinue": self.easy_auto_continue_var.get(),
            "easyLastIdea": self.easy_idea.get("1.0", END).strip(),
        })
        hub.save_json(hub.SETTINGS_FILE, self.settings)

    def blueprint_payload(self: Any) -> dict[str, Any]:
        return {
            "idea": self.easy_idea.get("1.0", END).strip(),
            "genre": self.easy_genre_var.get(),
            "target": self.easy_target_var.get(),
            "device": self.easy_device_var.get(),
            "autoStart": self.easy_auto_continue_var.get(),
        }

    def preview_blueprint(self: Any) -> None:
        payload = blueprint_payload(self)
        if not payload["idea"]:
            messagebox.showwarning("ZeroScript", "Önce oyun fikrini veya yapmak istediğin değişikliği yaz.")
            return
        target_steps = {
            "Hızlı prototip": 4,
            "Yayınlanabilir oyun": 6,
            "Premium kalite": 8,
        }.get(payload["target"], 6)
        messagebox.showinfo(
            "ZeroScript Oyun Planı",
            f"{payload['genre']} · {payload['target']} · {payload['device']}\n\n"
            f"ZeroScript yaklaşık {target_steps} bağımlı görev hazırlayacak:\n"
            "1. Mevcut projeyi ve ana döngüyü incele\n"
            "2. Güvenli temel ve veri modelini kur\n"
            "3. Ana oynanışı tamamla\n"
            "4. İlerleme, ekonomi ve kayıt sistemi\n"
            "5. Profesyonel UI ve onboarding\n"
            "6. Performans, güvenlik ve kalite kanıtı\n\n"
            "Premium hedefte VFX, içerik derinliği ve yayın testi de ayrı aşamalardır.",
        )

    def build_game(self: Any) -> None:
        payload = blueprint_payload(self)
        if not payload["idea"]:
            messagebox.showwarning("ZeroScript", "Oyunun fikrini veya mevcut oyunda yapılacak işi bir cümleyle yaz.")
            self.easy_idea.focus_set()
            return
        persist_easy_settings(self)
        self.easy_build_button.configure(state="disabled", text="Plan hazırlanıyor…")
        self.start_services()
        result = self.action("build_game_blueprint", payload)
        self.after(1200, self.easy_build_button.configure, {"state": "normal", "text": "✦ Oyunu planla ve yap"})
        if result.get("ok"):
            self.log(f"Oyun planı extension'a gönderildi: {payload['genre']} · {payload['target']}")
            messagebox.showinfo("ZeroScript", "Oyun geliştirme planı hazırlandı. Görevler doğru sırayla çalışacak; Kolay Mod ekranından ilerlemeyi takip edebilirsin.")
        else:
            messagebox.showerror("ZeroScript", result.get("error", "Oyun planı başlatılamadı."))

    def quick_action(self: Any, kind: str) -> None:
        actions = {
            "repair_game": ("diagnose_fix", {}),
            "polish_ui": ("enqueue_task", {"goal": "Inspect the actual player-facing UI and established visual style. Modernize hierarchy, spacing, typography, contrast, responsive scaling, safe areas, loading/disabled/error feedback and navigation. Test every reachable button on desktop and mobile, capture before/after evidence, preserve working controllers and verify Studio Output.", "qualityMode": "best", "priority": "high", "source": "easy_polish_ui"}),
            "improve_gameplay": ("enqueue_task", {"goal": "Inspect the real main gameplay loop, progression, rewards, goals, session pacing and current content. Improve the weakest verified parts so the first session is clear, satisfying and replayable without adding unnecessary complexity. Preserve working systems, measure time-to-first-action and first meaningful upgrade, then playtest and report evidence.", "qualityMode": "best", "priority": "high", "source": "easy_gameplay"}),
            "prepare_release": ("release_check", {}),
        }
        action, payload = actions[kind]
        self.start_services()
        result = self.action(action, payload)
        if not result.get("ok"):
            messagebox.showerror("ZeroScript", result.get("error", "İşlem başlatılamadı."))

    def readiness(self: Any) -> tuple[int, dict[str, bool]]:
        status = self.last_status or {}
        bridge = status.get("bridge") or {}
        providers = status.get("providers") or []
        productivity = status.get("productivity") or {}
        superior = status.get("superior") or {}
        output_errors = ((productivity.get("outputWatch") or {}).get("errors") or [])
        proof = superior.get("latestProof") or {}
        checks = {
            "control": bool(status.get("online")),
            "extension": bool(status.get("extensionConnected")),
            "bridge": bool(bridge.get("connected")) or hub.port_open(hub.BRIDGE_PORT, 0.05),
            "studio": bool(bridge.get("studioConnected")),
            "provider": any(bool(item.get("ready")) for item in providers),
            "output": not output_errors,
            "proof": not proof or proof.get("status") == "verified",
        }
        weights = {"control": 12, "extension": 15, "bridge": 15, "studio": 20, "provider": 20, "output": 10, "proof": 8}
        return sum(weights[key] for key, value in checks.items() if value), checks

    def next_step(self: Any, checks: dict[str, bool]) -> tuple[str, str, str, Callable[[], None]]:
        status = self.last_status or {}
        productivity = status.get("productivity") or {}
        task = status.get("task") or {}
        errors = ((productivity.get("outputWatch") or {}).get("errors") or [])
        if not checks["control"] or not checks["bridge"]:
            return "ZeroScript servislerini başlat", "Hub ve Roblox köprüsü hazır değil. Tek tıkla başlatıp tekrar kontrol edeceğim.", "Başlat", self.start_services
        if not checks["extension"]:
            return "Chrome extension'ı bağla", "ZeroScript görevleri modellere gönderebilmek için extension eşleşmesini bekliyor.", "Eşleştir", self.pair_extension
        if not checks["studio"]:
            return "Roblox Studio MCP'yi aç", "Studio açık olmalı ve Assistant ayarlarından MCP server etkinleştirilmelidir.", "Bağlantıyı onar", self.repair
        if not checks["provider"]:
            return "Bir AI modeli hazırla", "Gemini, Qwen, DeepSeek veya başka desteklenen model sekmesini açıp hazır duruma getir.", "Modeli aç", self.open_provider
        if task and str(task.get("status")) not in {"done", "failed", "cancelled"}:
            return "Aktif görev çalışıyor", f"{task.get('phase', 'hazırlanıyor')} aşaması · {task.get('provider') or 'model seçiliyor'}", "Görevi göster", lambda: self.notebook.select(self.easy_tab)
        if errors:
            return "Yeni Output hatalarını düzelt", f"{len(errors)} hata kaydı bulundu. Self-Heal önce kök nedeni doğrulayacak.", "Hataları düzelt", lambda: self.action("self_heal_scan")
        if not self.easy_idea.get("1.0", END).strip():
            return "Oyun fikrini yaz", "Teknik prompt hazırlamana gerek yok. Nasıl bir oyun istediğini normal şekilde yaz.", "Yazmaya başla", self.easy_idea.focus_set
        return "Oyun planını başlat", "Bağlantılar hazır. ZeroScript görevleri bağımlılık sırasıyla hazırlayabilir.", "Planla ve yap", lambda: build_game(self)

    def set_health(self: Any, key: str, ok: bool, ready_text: str, wait_text: str) -> None:
        _row, label = self.easy_health_rows[key]
        label.configure(text=("● " + ready_text) if ok else ("○ " + wait_text), foreground="#2DD4A3" if ok else "#F6B84A")

    def refresh_easy(self: Any) -> None:
        if not hasattr(self, "easy_ready_label"):
            return
        score, checks = readiness(self)
        self.easy_ready_progress["value"] = score
        self.easy_ready_label.configure(text=f"Hazırlık %{score}")
        set_health(self, "hub", checks["control"] and checks["bridge"] and checks["extension"], "hazır", "bağlantı bekleniyor")
        set_health(self, "studio", checks["studio"], "bağlı", "MCP bekleniyor")
        set_health(self, "model", checks["provider"], "hazır", "model bekleniyor")
        set_health(self, "proof", checks["output"] and checks["proof"], "temiz", "kontrol gerekli")

        title, detail, button_text, command = next_step(self, checks)
        self.easy_next_title.configure(text=title)
        self.easy_next_detail.configure(text=detail)
        self.easy_next_button.configure(text=button_text, command=command)

        task = self.last_status.get("task") or {}
        progress = ((self.last_status.get("productivity") or {}).get("progress") or {})
        if task:
            status = str(task.get("status") or "running")
            self.easy_task_title.configure(text=f"{status.upper()} · {task.get('phase') or 'hazırlanıyor'}")
            self.easy_task_detail.configure(text=f"{task.get('provider') or 'Model seçiliyor'} · {str(task.get('error') or task.get('goal') or '')[:190]}")
            self.easy_task_progress["value"] = float(progress.get("percent", 0) or 0)
        else:
            queue = ((self.last_status.get("productivity") or {}).get("queue") or [])
            self.easy_task_title.configure(text="Aktif görev yok")
            self.easy_task_detail.configure(text=f"Kuyrukta {len(queue)} görev var." if queue else "Yeni bir oyun fikri yazabilirsin.")
            self.easy_task_progress["value"] = 0

    def apply_focus_mode(self: Any, simple: bool) -> None:
        self.easy_mode_var.set(bool(simple))
        current_tabs = set(str(tab) for tab in self.notebook.tabs())
        easy_id = str(self.easy_tab)
        if simple:
            for tab_id in list(current_tabs):
                if tab_id != easy_id:
                    try:
                        self.notebook.forget(tab_id)
                    except hub.tk.TclError:
                        pass
            self.notebook.select(self.easy_tab)
            self.easy_mode_button.configure(text="Gelişmiş araçları göster")
        else:
            for index, tab_id in enumerate(self._zs_all_tabs):
                if tab_id not in set(str(tab) for tab in self.notebook.tabs()):
                    widget = self.nametowidget(tab_id)
                    text = getattr(widget, "_zs_tab_title", None) or tab_title(self, widget)
                    self.notebook.add(widget, text=text)
            try:
                self.notebook.select(self.easy_tab)
            except hub.tk.TclError:
                pass
            self.easy_mode_button.configure(text="Sadece Kolay Mod")
        persist_easy_settings(self)

    def tab_title(self: Any, widget: Any) -> str:
        known = {
            getattr(self, "easy_tab", None): "Kolay Mod",
            getattr(self, "home", None): "Ana ekran",
            getattr(self, "settings_tab", None): "Ayarlar",
            getattr(self, "details_tab", None): "Detaylar",
            getattr(self, "queue_tab", None): "Görev kuyruğu",
            getattr(self, "tools_tab", None): "Araçlar",
            getattr(self, "history_tab", None): "Geçmiş",
            getattr(self, "profiles_tab", None): "Oyun profilleri",
            getattr(self, "templates_tab", None): "Görev şablonları",
            getattr(self, "automation_tab", None): "Otomasyon",
            getattr(self, "learning_tab", None): "Recipe Studio",
            getattr(self, "superior_tab", None): "Üstün Sistem",
        }
        return known.get(widget, "Araç")

    def toggle_focus_mode(self: Any) -> None:
        apply_focus_mode(self, not self.easy_mode_var.get())

    def save_settings(self: Any) -> None:
        persist_easy_settings(self)
        previous_save_settings(self)

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            refresh_easy(self)
        except Exception as exc:
            self.log(f"Kolay Mod yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.save_settings = save_settings
    hub.ZeroScriptHub.refresh_status = refresh_status

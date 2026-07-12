#!/usr/bin/env python3
"""ZeroScript Hub 1.28 automation, safety and diagnostics UI."""
from __future__ import annotations

import time
from pathlib import Path
from tkinter import END, BooleanVar, StringVar, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    profiles_file: Path = hub.ROOT / "hub_profiles.json"
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.automation_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.automation_tab, text="Otomasyon")
        build_automation(self)

    def build_automation(self: Any) -> None:
        outer = ttk.Frame(self.automation_tab, style="Card.TFrame", padding=14)
        outer.pack(fill="both", expand=True, padx=4, pady=8)

        top = ttk.Frame(outer, style="Card.TFrame")
        top.pack(fill="x")
        ttk.Label(top, text="Tek tuş otomasyon ve güvenlik", style="Status.TLabel").pack(side="left")
        ttk.Button(top, text="⛔ HER ŞEYİ DURDUR", command=lambda: emergency_stop(self)).pack(side="right")

        action_grid = ttk.Frame(outer, style="Card.TFrame")
        action_grid.pack(fill="x", pady=(12, 8))
        actions = [
            ("Sorunu bul ve düzelt", lambda: self.action("diagnose_fix")),
            ("Görevi otomatik parçala", lambda: decompose_main_goal(self)),
            ("Görsel UI karşılaştır", lambda: self.action("visual_ui_compare")),
            ("Bütün butonları test et", lambda: self.action("button_test")),
            ("Remote exploit testi", lambda: self.action("remote_fuzzer")),
            ("Context'i temizle", lambda: self.action("context_compact")),
            ("Instance geri al", lambda: restore_instances(self)),
            ("Bildirimleri temizle", lambda: self.action("clear_notifications")),
            ("Hata gruplarını temizle", lambda: self.action("clear_error_groups")),
        ]
        for index, (label, command) in enumerate(actions):
            ttk.Button(action_grid, text=label, command=command).grid(
                row=index // 3, column=index % 3, sticky="ew", padx=4, pady=4
            )
        for column in range(3):
            action_grid.columnconfigure(column, weight=1)

        settings = ttk.LabelFrame(outer, text="Otomasyon ayarları", padding=10)
        settings.pack(fill="x", pady=8)
        self.automation_timeout_var = StringVar(value="20")
        self.automation_recovery_var = StringVar(value="2")
        self.automation_decompose_var = BooleanVar(value=False)
        self.automation_context_var = BooleanVar(value=True)
        self.automation_profile_var = BooleanVar(value=True)
        self.automation_quarantine_var = BooleanVar(value=True)
        self.automation_rollback_var = BooleanVar(value=True)
        self.automation_visual_var = BooleanVar(value=True)
        self.automation_notice_var = BooleanVar(value=True)

        ttk.Label(settings, text="Aşama süre sınırı").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            settings,
            textvariable=self.automation_timeout_var,
            values=["10", "15", "20", "30", "45", "60", "90"],
            state="readonly",
            width=8,
        ).grid(row=0, column=1, sticky="w", padx=(6, 18))
        ttk.Label(settings, text="dakika").grid(row=0, column=2, sticky="w")
        ttk.Label(settings, text="Model değiştirme hakkı").grid(row=0, column=3, sticky="w", padx=(18, 0))
        ttk.Combobox(
            settings,
            textvariable=self.automation_recovery_var,
            values=["0", "1", "2", "3", "4"],
            state="readonly",
            width=6,
        ).grid(row=0, column=4, sticky="w", padx=6)
        ttk.Button(
            settings,
            text="Ayarları uygula",
            style="Primary.TButton",
            command=lambda: save_automation(self),
        ).grid(row=0, column=5, sticky="e", padx=(18, 0))

        checks = [
            ("Büyük görevleri otomatik parçalara ayır", self.automation_decompose_var),
            ("Takılınca context özeti oluştur", self.automation_context_var),
            ("Açık oyuna göre profili otomatik seç", self.automation_profile_var),
            ("Toolbox assetlerini karantinada tara", self.automation_quarantine_var),
            ("Instance seviyesinde geri alma", self.automation_rollback_var),
            ("UI/map görevlerinde ekran görüntüsü kanıtı", self.automation_visual_var),
            ("Bildirim merkezini açık tut", self.automation_notice_var),
        ]
        for index, (label, variable) in enumerate(checks):
            ttk.Checkbutton(settings, text=label, variable=variable).grid(
                row=1 + index // 3,
                column=(index % 3) * 2,
                columnspan=2,
                sticky="w",
                pady=4,
            )
        settings.columnconfigure(5, weight=1)

        project_row = ttk.Frame(outer, style="Card.TFrame")
        project_row.pack(fill="x", pady=(4, 8))
        self.automation_project_label = ttk.Label(
            project_row, text="Açık oyun algılanıyor…", style="Card.TLabel"
        )
        self.automation_project_label.pack(side="left")
        ttk.Button(
            project_row,
            text="Bu oyuna profil kaydet",
            command=lambda: save_project_profile(self),
        ).pack(side="right")
        ttk.Button(
            project_row,
            text="Oyun profilini şimdi yükle",
            command=lambda: load_project_profile(self, notify=True),
        ).pack(side="right", padx=6)

        panes = ttk.Panedwindow(outer, orient="horizontal")
        panes.pack(fill="both", expand=True)
        left = ttk.Frame(panes, style="Card.TFrame")
        right = ttk.Frame(panes, style="Card.TFrame")
        panes.add(left, weight=1)
        panes.add(right, weight=1)

        ttk.Label(left, text="Model performansı", style="Status.TLabel").pack(anchor="w")
        self.automation_models = ttk.Treeview(
            left,
            columns=("provider", "success", "attempts", "avg", "errors"),
            show="headings",
            height=8,
        )
        for key, title, width in (
            ("provider", "Model", 90),
            ("success", "Başarı", 70),
            ("attempts", "İş", 55),
            ("avg", "Ort. süre", 85),
            ("errors", "Hata", 55),
        ):
            self.automation_models.heading(key, text=title)
            self.automation_models.column(key, width=width, stretch=True)
        self.automation_models.pack(fill="x", pady=(6, 10))

        ttk.Label(left, text="Akıllı hata grupları", style="Status.TLabel").pack(anchor="w")
        self.automation_errors = hub.tk.Text(
            left,
            height=11,
            wrap="word",
            bg="#171b21",
            fg="#cfd5df",
            relief="flat",
            font=("Consolas", 9),
            padx=8,
            pady=8,
        )
        self.automation_errors.pack(fill="both", expand=True, pady=(6, 0))

        ttk.Label(right, text="Tanılama ve plan", style="Status.TLabel").pack(anchor="w")
        self.automation_diagnosis = hub.tk.Text(
            right,
            height=10,
            wrap="word",
            bg="#171b21",
            fg="#cfd5df",
            relief="flat",
            font=("Consolas", 9),
            padx=8,
            pady=8,
        )
        self.automation_diagnosis.pack(fill="x", pady=(6, 10))

        ttk.Label(right, text="Bildirim merkezi", style="Status.TLabel").pack(anchor="w")
        self.automation_notifications = ttk.Treeview(
            right,
            columns=("time", "level", "title"),
            show="headings",
            height=11,
        )
        for key, title, width in (
            ("time", "Saat", 60),
            ("level", "Tür", 65),
            ("title", "Bildirim", 260),
        ):
            self.automation_notifications.heading(key, text=title)
            self.automation_notifications.column(key, width=width, stretch=key == "title")
        self.automation_notifications.pack(fill="both", expand=True, pady=(6, 0))

    def decompose_main_goal(self: Any) -> None:
        goal = self.goal.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Önce ana ekrana görevi yaz.")
            return
        if not messagebox.askyesno(
            "ZeroScript",
            "Görev analiz, geliştirme ve test adımlarına ayrılıp bağımlı kuyruğa eklensin mi?",
        ):
            return
        self.action("decompose_task", {"goal": goal})
        self.notebook.select(self.queue_tab)

    def emergency_stop(self: Any) -> None:
        if not messagebox.askyesno(
            "ZeroScript Acil Durdurma",
            "Aktif modeller durdurulacak, bekleyen tool çağrıları iptal edilecek, writer lock kaldırılacak ve kuyruk duraklatılacak. Devam edilsin mi?",
        ):
            return
        self.action("emergency_stop")
        self.log("Acil durdurma gönderildi.")

    def restore_instances(self: Any) -> None:
        checkpoint = (
            (self.last_status.get("checkpoint") or {}).get("latest")
            or ((self.last_status.get("automation") or {}).get("instanceBackup") or {}).get("latest")
        )
        if not checkpoint:
            messagebox.showwarning("ZeroScript", "Geri alınabilecek checkpoint bulunamadı.")
            return
        if messagebox.askyesno(
            "ZeroScript",
            f"{checkpoint} checkpoint'indeki script, UI, map ve Instance kapsamı geri yüklensin mi?",
        ):
            self.action("restore_instances", {"id": checkpoint})

    def automation_payload(self: Any) -> dict[str, Any]:
        return {
            "taskTimeoutMinutes": int(self.automation_timeout_var.get()),
            "maxTimeoutRecoveries": int(self.automation_recovery_var.get()),
            "autoDecomposeBroadTasks": self.automation_decompose_var.get(),
            "autoContextClean": self.automation_context_var.get(),
            "autoProfile": self.automation_profile_var.get(),
            "toolboxQuarantine": self.automation_quarantine_var.get(),
            "instanceRollback": self.automation_rollback_var.get(),
            "visualEvidence": self.automation_visual_var.get(),
            "notificationCenter": self.automation_notice_var.get(),
        }

    def save_automation(self: Any) -> None:
        try:
            settings = automation_payload(self)
        except ValueError:
            messagebox.showerror("ZeroScript", "Süre ve model değiştirme hakkı sayı olmalı.")
            return
        self.action("set_automation", {"settings": settings})
        self.log("Otomasyon ayarları extension'a gönderildi.")

    def project_profile_keys(self: Any) -> list[str]:
        project = (self.last_status.get("automation") or {}).get("activeProject") or {}
        place_id = str(project.get("placeId") or "0")
        name = str(project.get("name") or "").strip()
        keys = [f"placeId:{place_id}"] if place_id != "0" else []
        if name:
            keys.extend([name, f"{place_id} - {name}"])
        return keys

    def save_project_profile(self: Any) -> None:
        keys = project_profile_keys(self)
        if not keys:
            messagebox.showwarning("ZeroScript", "Açık Roblox oyunu henüz algılanmadı.")
            return
        try:
            automation_settings = automation_payload(self)
        except ValueError:
            automation_settings = (self.last_status.get("automation") or {}).get("settings") or {}
        profiles = hub.load_json(profiles_file, {})
        profiles = profiles if isinstance(profiles, dict) else {}
        profiles[keys[0]] = {
            **dict(self.settings),
            "_projectKeys": keys,
            "_automationSettings": automation_settings,
            "_savedAt": int(time.time() * 1000),
        }
        hub.save_json(profiles_file, profiles)
        if hasattr(self, "profile_combo"):
            self.profile_combo.configure(values=sorted(profiles))
        self.log(f"Oyun profili kaydedildi: {keys[0]}")
        messagebox.showinfo("ZeroScript", f"Bu oyun için profil kaydedildi:\n{keys[0]}")

    def load_project_profile(self: Any, notify: bool = False) -> bool:
        keys = project_profile_keys(self)
        profiles = hub.load_json(profiles_file, {})
        profiles = profiles if isinstance(profiles, dict) else {}
        matched = next((key for key in keys if key in profiles), None)
        if not matched:
            if notify:
                messagebox.showinfo(
                    "ZeroScript",
                    "Bu oyun için kayıtlı profil yok. 'Bu oyuna profil kaydet' düğmesini kullan.",
                )
            return False
        record = profiles[matched] if isinstance(profiles[matched], dict) else {}
        normal_settings = {key: value for key, value in record.items() if not str(key).startswith("_")}
        self.settings = {**hub.DEFAULT_SETTINGS, **normal_settings}
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        self._load_settings_into_ui()
        self.send_config_action()
        automation_settings = record.get("_automationSettings")
        if isinstance(automation_settings, dict):
            self.action("set_automation", {"settings": automation_settings}, quiet=True)
            apply_automation_vars(self, automation_settings)
        self._zs_auto_profile_loaded = matched
        self.log(f"Oyun profili otomatik yüklendi: {matched}")
        if notify:
            messagebox.showinfo("ZeroScript", f"Profil yüklendi: {matched}")
        return True

    def apply_automation_vars(self: Any, settings: dict[str, Any]) -> None:
        self.automation_timeout_var.set(str(int(settings.get("taskTimeoutMinutes", 20) or 20)))
        self.automation_recovery_var.set(str(int(settings.get("maxTimeoutRecoveries", 2) or 0)))
        self.automation_decompose_var.set(bool(settings.get("autoDecomposeBroadTasks", False)))
        self.automation_context_var.set(bool(settings.get("autoContextClean", True)))
        self.automation_profile_var.set(bool(settings.get("autoProfile", True)))
        self.automation_quarantine_var.set(bool(settings.get("toolboxQuarantine", True)))
        self.automation_rollback_var.set(bool(settings.get("instanceRollback", True)))
        self.automation_visual_var.set(bool(settings.get("visualEvidence", True)))
        self.automation_notice_var.set(bool(settings.get("notificationCenter", True)))

    def refresh_automation(self: Any) -> None:
        automation = self.last_status.get("automation") or {}
        settings = automation.get("settings") or {}
        if settings and not getattr(self, "_zs_automation_settings_loaded", False):
            apply_automation_vars(self, settings)
            self._zs_automation_settings_loaded = True

        project = automation.get("activeProject") or {}
        if project:
            self.automation_project_label.configure(
                text=f"Açık oyun: {project.get('name') or '-'} · PlaceId {project.get('placeId') or 0}"
            )
            auto_key = str(project.get("key") or project.get("placeId") or "")
            if (
                settings.get("autoProfile", True)
                and auto_key
                and getattr(self, "_zs_seen_project_key", None) != auto_key
            ):
                self._zs_seen_project_key = auto_key
                load_project_profile(self, notify=False)
        else:
            self.automation_project_label.configure(text="Açık oyun algılanıyor…")

        for item in self.automation_models.get_children():
            self.automation_models.delete(item)
        for entry in automation.get("providerTable") or []:
            avg_ms = int(entry.get("averageMs", 0) or 0)
            avg = f"{avg_ms // 60000} dk" if avg_ms >= 60000 else f"{avg_ms // 1000} sn"
            errors = int(entry.get("toolErrors", 0) or 0) + int(entry.get("contextFailures", 0) or 0)
            self.automation_models.insert(
                "",
                END,
                values=(
                    entry.get("provider", ""),
                    f"%{entry.get('successRate', 0)}",
                    entry.get("attempts", 0),
                    avg,
                    errors,
                ),
            )

        groups = automation.get("errorGroups") or []
        error_lines = [
            f"{entry.get('count', 1)}x · {entry.get('line', '')}" for entry in groups[:15]
        ]
        self.automation_errors.delete("1.0", END)
        self.automation_errors.insert(
            "1.0",
            "\n\n".join(error_lines) if error_lines else "Gruplanmış Output hatası yok.",
        )

        diagnosis = automation.get("diagnosis") or {}
        rows = diagnosis.get("rows") or []
        lines = [
            f"Durum: {diagnosis.get('status', 'idle')}",
            str(diagnosis.get("detail", "")),
            "",
        ]
        lines.extend(
            f"{'✓' if row.get('ok') else '✗'} {row.get('label', '')}: {row.get('detail', '')}"
            for row in rows
        )
        plans = automation.get("plans") or []
        if plans:
            plan = plans[-1]
            lines.append("\nSon plan:")
            for index, step in enumerate(plan.get("steps") or [], start=1):
                lines.append(f"{index}. {step.get('title', '-')}")
        backup = automation.get("instanceBackup") or {}
        if backup.get("latest"):
            lines.append(
                f"\nInstance yedeği: {backup.get('status', 'idle')} · {backup.get('latest')}"
            )
        self.automation_diagnosis.delete("1.0", END)
        self.automation_diagnosis.insert("1.0", "\n".join(lines))

        for item in self.automation_notifications.get_children():
            self.automation_notifications.delete(item)
        for notice in reversed((automation.get("notifications") or [])[-30:]):
            stamp = time.strftime(
                "%H:%M", time.localtime(float(notice.get("at", 0) or 0) / 1000)
            )
            self.automation_notifications.insert(
                "",
                END,
                values=(stamp, notice.get("level", "info"), notice.get("title", "")),
            )

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            if hasattr(self, "automation_tab"):
                refresh_automation(self)
        except Exception as exc:
            self.log(f"Otomasyon ekranı yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

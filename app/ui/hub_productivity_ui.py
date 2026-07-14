#!/usr/bin/env python3
"""ZeroScript Hub 1.27 productivity UI extensions."""
from __future__ import annotations

import json
import time
from pathlib import Path
from tkinter import END, StringVar, BooleanVar, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    profiles_file: Path = hub.ROOT / "hub_profiles.json"
    original_build_ui = hub.ZeroScriptHub._build_ui
    original_refresh = hub.ZeroScriptHub.refresh_status

    def load_profiles() -> dict[str, Any]:
        value = hub.load_json(profiles_file, {})
        return value if isinstance(value, dict) else {}

    def fmt_ms(value: Any) -> str:
        seconds = max(0, int(float(value or 0) / 1000))
        if seconds < 60:
            return f"{seconds} sn"
        return f"{seconds // 60} dk {seconds % 60} sn"

    def build_ui(self: Any) -> None:
        original_build_ui(self)
        self.queue_tab = ttk.Frame(self.notebook)
        self.tools_tab = ttk.Frame(self.notebook)
        self.history_tab = ttk.Frame(self.notebook)
        self.profiles_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.queue_tab, text="Görev kuyruğu")
        self.notebook.add(self.tools_tab, text="Araçlar")
        self.notebook.add(self.history_tab, text="Geçmiş")
        self.notebook.add(self.profiles_tab, text="Oyun profilleri")
        build_queue(self)
        build_tools(self)
        build_history(self)
        build_profiles(self)

    def build_queue(self: Any) -> None:
        card = ttk.Frame(self.queue_tab, style="Card.TFrame", padding=16)
        card.pack(fill="both", expand=True, padx=4, pady=8)
        ttk.Label(card, text="Birden fazla işi sıraya ekle", style="Status.TLabel").pack(anchor="w")
        self.queue_goal = hub.tk.Text(card, height=5, wrap="word", bg="#222731", fg="#f2f4f8", insertbackground="white", relief="flat", font=("Segoe UI", 10), padx=10, pady=8)
        self.queue_goal.pack(fill="x", pady=(10, 8))
        controls = ttk.Frame(card, style="Card.TFrame")
        controls.pack(fill="x")
        self.queue_mode_var = StringVar(value="Akıllı otomatik")
        self.queue_priority_var = StringVar(value="Normal")
        ttk.Combobox(controls, textvariable=self.queue_mode_var, values=list(hub.QUALITY_LABELS), state="readonly", width=18).pack(side="left")
        ttk.Combobox(controls, textvariable=self.queue_priority_var, values=["Yüksek", "Normal", "Düşük"], state="readonly", width=10).pack(side="left", padx=6)
        ttk.Button(controls, text="Kuyruğa ekle", style="Primary.TButton", command=lambda: enqueue(self)).pack(side="left", padx=6)
        ttk.Button(controls, text="Devam", command=lambda: self.action("queue_resume")).pack(side="right")
        ttk.Button(controls, text="Duraklat", command=lambda: self.action("queue_pause")).pack(side="right", padx=6)
        ttk.Button(controls, text="Kuyruğu temizle", command=lambda: clear_queue(self)).pack(side="right")

        self.queue_tree = ttk.Treeview(card, columns=("priority", "mode", "status", "goal"), show="headings", height=13)
        for key, title, width in (("priority", "Öncelik", 75), ("mode", "Mod", 95), ("status", "Durum", 95), ("goal", "Görev", 520)):
            self.queue_tree.heading(key, text=title)
            self.queue_tree.column(key, width=width, stretch=key == "goal")
        self.queue_tree.pack(fill="both", expand=True, pady=(12, 6))
        ttk.Button(card, text="Seçili görevi kaldır", command=lambda: remove_selected_queue(self)).pack(anchor="e")
        self.queue_state_label = ttk.Label(card, text="Kuyruk bekleniyor.", style="Card.TLabel")
        self.queue_state_label.pack(anchor="w", pady=(8, 0))

    def build_tools(self: Any) -> None:
        card = ttk.Frame(self.tools_tab, style="Card.TFrame", padding=16)
        card.pack(fill="both", expand=True, padx=4, pady=8)
        ttk.Label(card, text="Tek tık geliştirme ve test araçları", style="Status.TLabel").pack(anchor="w", pady=(0, 10))
        grid = ttk.Frame(card, style="Card.TFrame")
        grid.pack(fill="x")
        actions = [
            ("Proje indeksini yenile", "build_index"),
            ("UI / buton taraması", "ui_audit"),
            ("Remote güvenlik testi", "security_audit"),
            ("DataStore laboratuvarı", "datastore_lab"),
            ("Ekonomi simülatörü", "economy_simulator"),
            ("Toolbox / backdoor taraması", "marketplace_scan"),
            ("Çok oyunculu test", "multiplayer_test"),
            ("Test akışı kaydet", "record_test"),
            ("Yayın kontrolü", "release_check"),
        ]
        for index, (label, action) in enumerate(actions):
            ttk.Button(grid, text=label, command=lambda a=action: self.action(a)).grid(row=index // 3, column=index % 3, sticky="ew", padx=5, pady=5)
        for column in range(3):
            grid.columnconfigure(column, weight=1)

        ttk.Separator(card).pack(fill="x", pady=14)
        self.output_watch_var = BooleanVar(value=True)
        self.output_autofix_var = BooleanVar(value=False)
        row = ttk.Frame(card, style="Card.TFrame")
        row.pack(fill="x")
        ttk.Checkbutton(row, text="Studio Output'u arka planda izle", variable=self.output_watch_var).pack(side="left")
        ttk.Checkbutton(row, text="Yeni hata çıkınca otomatik düzeltme görevi ekle", variable=self.output_autofix_var).pack(side="left", padx=12)
        ttk.Button(row, text="Uygula", command=lambda: toggle_output_watch(self)).pack(side="right")
        ttk.Button(row, text="Hata listesini sıfırla", command=lambda: reset_output_watch(self)).pack(side="right", padx=6)

        ttk.Separator(card).pack(fill="x", pady=14)
        utility = ttk.Frame(card, style="Card.TFrame")
        utility.pack(fill="x")
        ttk.Button(utility, text="Hata paketi oluştur", command=lambda: export_debug(self)).pack(side="left")
        ttk.Button(utility, text="Provider testi", command=lambda: self.action("probe_providers")).pack(side="left", padx=6)
        ttk.Button(utility, text="Bağlantıyı onar", command=self.repair).pack(side="left")
        self.tools_state = hub.tk.Text(card, height=12, wrap="word", bg="#171b21", fg="#cfd5df", relief="flat", font=("Consolas", 9), padx=10, pady=8)
        self.tools_state.pack(fill="both", expand=True, pady=(12, 0))

    def build_history(self: Any) -> None:
        card = ttk.Frame(self.history_tab, style="Card.TFrame", padding=16)
        card.pack(fill="both", expand=True, padx=4, pady=8)
        self.progress_label = ttk.Label(card, text="Aktif görev yok.", style="Status.TLabel")
        self.progress_label.pack(anchor="w")
        self.progress = ttk.Progressbar(card, maximum=100)
        self.progress.pack(fill="x", pady=(8, 12))
        self.history_tree = ttk.Treeview(card, columns=("status", "mode", "duration", "goal"), show="headings", height=18)
        for key, title, width in (("status", "Durum", 90), ("mode", "Mod", 90), ("duration", "Süre", 90), ("goal", "Görev", 560)):
            self.history_tree.heading(key, text=title)
            self.history_tree.column(key, width=width, stretch=key == "goal")
        self.history_tree.pack(fill="both", expand=True)

    def build_profiles(self: Any) -> None:
        card = ttk.Frame(self.profiles_tab, style="Card.TFrame", padding=16)
        card.pack(fill="both", expand=True, padx=4, pady=8)
        ttk.Label(card, text="Her oyun için ayrı model ve çalışma ayarı", style="Status.TLabel").pack(anchor="w")
        self.profile_name_var = StringVar()
        self.profile_combo = ttk.Combobox(card, textvariable=self.profile_name_var, values=sorted(load_profiles()), width=38)
        self.profile_combo.pack(fill="x", pady=(12, 8))
        row = ttk.Frame(card, style="Card.TFrame")
        row.pack(fill="x")
        ttk.Button(row, text="Mevcut ayarları profile kaydet", style="Primary.TButton", command=lambda: save_profile(self)).pack(side="left")
        ttk.Button(row, text="Profili yükle", command=lambda: load_profile(self)).pack(side="left", padx=8)
        ttk.Button(row, text="Profili sil", command=lambda: delete_profile(self)).pack(side="left")
        ttk.Label(card, text="Profil; çalışma modu, model seçimleri, güvenlik yaklaşımı ve bildirim ayarlarını saklar. Proje hafızalarının birbirine karışmasını azaltmak için oyun adını profil adı olarak kullan.", style="Card.TLabel", wraplength=720).pack(anchor="w", pady=(18, 0))

    def enqueue(self: Any) -> None:
        goal = self.queue_goal.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Kuyruğa eklenecek görevi yaz.")
            return
        priority = {"Yüksek": "high", "Normal": "normal", "Düşük": "low"}.get(self.queue_priority_var.get(), "normal")
        mode = hub.QUALITY_LABELS.get(self.queue_mode_var.get(), "auto")
        result = self.action("enqueue_task", {"goal": goal, "qualityMode": mode, "priority": priority})
        if result.get("ok"):
            self.queue_goal.delete("1.0", END)
            self.log("Görev kuyruğa eklendi.")
        else:
            messagebox.showerror("ZeroScript", result.get("error", "Görev kuyruğa eklenemedi."))

    def clear_queue(self: Any) -> None:
        if messagebox.askyesno("ZeroScript", "Bekleyen görevlerin tamamı silinsin mi?"):
            self.action("queue_clear")

    def remove_selected_queue(self: Any) -> None:
        selected = self.queue_tree.selection()
        if not selected:
            return
        self.action("queue_remove", {"id": selected[0]})

    def toggle_output_watch(self: Any) -> None:
        self.action("output_watch", {"enabled": self.output_watch_var.get(), "autoFix": self.output_autofix_var.get()})

    def reset_output_watch(self: Any) -> None:
        self.action("output_watch", {"enabled": self.output_watch_var.get(), "autoFix": self.output_autofix_var.get(), "reset": True})

    def export_debug(self: Any) -> None:
        hub.LOG_DIR.mkdir(exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        target = hub.LOG_DIR / f"zeroscript-debug-{stamp}.json"
        logs: dict[str, str] = {}
        for path in hub.LOG_DIR.glob("*.log"):
            try:
                logs[path.name] = path.read_text("utf-8", errors="replace")[-16000:]
            except Exception:
                pass
        payload = {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"), "version": hub.VERSION, "settings": self.settings, "status": self.last_status, "logs": logs}
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")
        self.log(f"Hata paketi oluşturuldu: {target}")
        messagebox.showinfo("ZeroScript", f"Hata paketi oluşturuldu:\n{target}")

    def save_profile(self: Any) -> None:
        name = self.profile_name_var.get().strip()
        if not name:
            messagebox.showwarning("ZeroScript", "Profil adını yaz.")
            return
        self.save_settings()
        profiles = load_profiles()
        profiles[name] = dict(self.settings)
        hub.save_json(profiles_file, profiles)
        self.profile_combo.configure(values=sorted(profiles))
        self.log(f"Oyun profili kaydedildi: {name}")

    def load_profile(self: Any) -> None:
        name = self.profile_name_var.get().strip()
        profiles = load_profiles()
        if name not in profiles:
            messagebox.showerror("ZeroScript", "Profil bulunamadı.")
            return
        self.settings = {**hub.DEFAULT_SETTINGS, **profiles[name]}
        hub.save_json(hub.SETTINGS_FILE, self.settings)
        self._load_settings_into_ui()
        self.send_config_action()
        self.log(f"Oyun profili yüklendi: {name}")

    def delete_profile(self: Any) -> None:
        name = self.profile_name_var.get().strip()
        profiles = load_profiles()
        if name in profiles:
            profiles.pop(name)
            hub.save_json(profiles_file, profiles)
            self.profile_combo.configure(values=sorted(profiles))
            self.profile_name_var.set("")
            self.log(f"Oyun profili silindi: {name}")

    def refresh_productivity(self: Any) -> None:
        productivity = self.last_status.get("productivity") or {}
        queue = productivity.get("queue") or []
        if hasattr(self, "queue_tree"):
            for item in self.queue_tree.get_children():
                self.queue_tree.delete(item)
            labels = {3: "Yüksek", 2: "Normal", 1: "Düşük"}
            for entry in queue:
                self.queue_tree.insert("", END, iid=str(entry.get("id")), values=(labels.get(int(entry.get("priority", 2)), "Normal"), entry.get("qualityMode", "auto"), entry.get("status", "queued"), entry.get("goal", "")[:240]))
            self.queue_state_label.configure(text=f"{'Çalışıyor' if productivity.get('queueRunning') else 'Duraklatıldı'} · {len(queue)} görev bekliyor")

        watch = productivity.get("outputWatch") or {}
        if hasattr(self, "output_watch_var"):
            self.output_watch_var.set(bool(watch.get("enabled", True)))
            self.output_autofix_var.set(bool(watch.get("autoFix", False)))
        index = productivity.get("projectIndex") or {}
        errors = watch.get("errors") or []
        if hasattr(self, "tools_state"):
            lines = [f"Proje indeksi: {index.get('status', 'idle')} · {index.get('builtAt', 0)}", f"Output izleyici: {'açık' if watch.get('enabled') else 'kapalı'} · {len(errors)} kayıt", ""]
            lines.extend(str(item.get("line", "")) for item in errors[-12:])
            self.tools_state.delete("1.0", END)
            self.tools_state.insert("1.0", "\n".join(lines))

        progress = productivity.get("progress") or {}
        if hasattr(self, "progress"):
            percent = int(progress.get("percent", 0) or 0)
            self.progress["value"] = percent
            self.progress_label.configure(text=f"{progress.get('label', 'Idle')} · %{percent} · kalan yaklaşık {fmt_ms(progress.get('estimatedRemainingMs'))}")
            for item in self.history_tree.get_children():
                self.history_tree.delete(item)
            for entry in reversed(productivity.get("history") or []):
                duration = 0
                if entry.get("completedAt") and entry.get("startedAt"):
                    duration = int(entry["completedAt"]) - int(entry["startedAt"])
                self.history_tree.insert("", END, values=(entry.get("status", ""), entry.get("qualityMode", "auto"), fmt_ms(duration), str(entry.get("goal", ""))[:260]))

    def refresh_status(self: Any) -> None:
        original_refresh(self)
        try:
            refresh_productivity(self)
        except Exception as exc:
            self.log(f"Üretkenlik ekranı yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status
    hub.ZeroScriptHub.enqueue_task = enqueue
    hub.ZeroScriptHub.export_debug_bundle = export_debug

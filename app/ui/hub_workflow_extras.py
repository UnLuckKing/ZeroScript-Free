#!/usr/bin/env python3
"""Additional ZeroScript Hub workflow conveniences for 1.27."""
from __future__ import annotations

import time
from pathlib import Path
from tkinter import END, StringVar, messagebox, ttk
from typing import Any


def install(hub: Any) -> None:
    templates_file: Path = hub.ROOT / "hub_task_templates.json"
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status

    def load_templates() -> dict[str, Any]:
        data = hub.load_json(templates_file, {})
        return data if isinstance(data, dict) else {}

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.templates_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.templates_tab, text="Görev şablonları")
        build_templates(self)

        dependency = ttk.Frame(self.queue_tab)
        dependency.pack(fill="x", padx=8, pady=(0, 8))
        ttk.Label(dependency, text="Bağımlı işler:").pack(side="left")
        ttk.Button(
            dependency,
            text="Yazılı görevi önceki kuyruk işi bitince ekle",
            command=lambda: enqueue_dependent(self),
        ).pack(side="left", padx=8)
        ttk.Label(
            dependency,
            text="Örn. backend → UI → test sırasını korur.",
        ).pack(side="left")

        preview = ttk.Frame(self.tools_tab, style="Card.TFrame", padding=12)
        preview.pack(fill="x", padx=4, pady=(0, 8))
        ttk.Label(preview, text="Son değişiklik önizlemesi", style="Status.TLabel").pack(anchor="w")
        self.change_preview = hub.tk.Text(
            preview,
            height=7,
            wrap="word",
            bg="#171b21",
            fg="#cfd5df",
            relief="flat",
            font=("Consolas", 9),
            padx=10,
            pady=8,
        )
        self.change_preview.pack(fill="x", pady=(8, 0))
        self.change_preview.insert("1.0", "Henüz değişiklik özeti yok.")

    def build_templates(self: Any) -> None:
        card = ttk.Frame(self.templates_tab, style="Card.TFrame", padding=16)
        card.pack(fill="both", expand=True, padx=4, pady=8)
        ttk.Label(card, text="Kendi tekrar kullanılabilir görevlerini kaydet", style="Status.TLabel").pack(anchor="w")
        self.template_name_var = StringVar()
        self.template_mode_var = StringVar(value="Akıllı otomatik")
        self.template_combo = ttk.Combobox(card, textvariable=self.template_name_var, values=sorted(load_templates()), width=44)
        self.template_combo.pack(fill="x", pady=(12, 6))
        ttk.Combobox(card, textvariable=self.template_mode_var, values=list(hub.QUALITY_LABELS), state="readonly", width=20).pack(anchor="w")
        self.template_body = hub.tk.Text(card, height=13, wrap="word", bg="#222731", fg="#f2f4f8", insertbackground="white", relief="flat", font=("Segoe UI", 10), padx=10, pady=8)
        self.template_body.pack(fill="both", expand=True, pady=10)
        row = ttk.Frame(card, style="Card.TFrame")
        row.pack(fill="x")
        ttk.Button(row, text="Şablonu kaydet", style="Primary.TButton", command=lambda: save_template(self)).pack(side="left")
        ttk.Button(row, text="Şablonu yükle", command=lambda: load_template(self)).pack(side="left", padx=6)
        ttk.Button(row, text="Ana göreve aktar", command=lambda: apply_template(self, False)).pack(side="left")
        ttk.Button(row, text="Kuyruğa ekle", command=lambda: apply_template(self, True)).pack(side="left", padx=6)
        ttk.Button(row, text="Sil", command=lambda: delete_template(self)).pack(side="right")

    def save_template(self: Any) -> None:
        name = self.template_name_var.get().strip()
        body = self.template_body.get("1.0", END).strip()
        if not name or not body:
            messagebox.showwarning("ZeroScript", "Şablon adı ve görev metni gerekli.")
            return
        templates = load_templates()
        templates[name] = {
            "goal": body,
            "qualityMode": hub.QUALITY_LABELS.get(self.template_mode_var.get(), "auto"),
            "updatedAt": int(time.time() * 1000),
        }
        hub.save_json(templates_file, templates)
        self.template_combo.configure(values=sorted(templates))
        self.log(f"Görev şablonu kaydedildi: {name}")

    def load_template(self: Any) -> None:
        name = self.template_name_var.get().strip()
        template = load_templates().get(name)
        if not template:
            messagebox.showerror("ZeroScript", "Şablon bulunamadı.")
            return
        self.template_body.delete("1.0", END)
        self.template_body.insert("1.0", str(template.get("goal", "")))
        self.template_mode_var.set(hub.QUALITY_VALUES.get(template.get("qualityMode", "auto"), "Akıllı otomatik"))

    def apply_template(self: Any, queue: bool) -> None:
        name = self.template_name_var.get().strip()
        template = load_templates().get(name)
        if not template:
            body = self.template_body.get("1.0", END).strip()
            if not body:
                messagebox.showerror("ZeroScript", "Şablon bulunamadı.")
                return
            template = {"goal": body, "qualityMode": hub.QUALITY_LABELS.get(self.template_mode_var.get(), "auto")}
        goal = str(template.get("goal", "")).strip()
        mode = str(template.get("qualityMode", "auto"))
        if queue:
            self.action("enqueue_task", {"goal": goal, "qualityMode": mode, "priority": "normal", "source": "template"})
        else:
            self.goal.delete("1.0", END)
            self.goal.insert("1.0", goal)
            self.mode_var.set(hub.QUALITY_VALUES.get(mode, "Akıllı otomatik"))
            self.notebook.select(self.home)
            self.goal.focus_set()

    def delete_template(self: Any) -> None:
        name = self.template_name_var.get().strip()
        templates = load_templates()
        if name in templates:
            templates.pop(name)
            hub.save_json(templates_file, templates)
            self.template_combo.configure(values=sorted(templates))
            self.template_name_var.set("")
            self.template_body.delete("1.0", END)
            self.log(f"Görev şablonu silindi: {name}")

    def enqueue_dependent(self: Any) -> None:
        goal = self.queue_goal.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Kuyruk görevini yaz.")
            return
        productivity = self.last_status.get("productivity") or {}
        queue = productivity.get("queue") or []
        depends_on = [str(queue[-1].get("id"))] if queue else []
        priority = {"Yüksek": "high", "Normal": "normal", "Düşük": "low"}.get(self.queue_priority_var.get(), "normal")
        mode = hub.QUALITY_LABELS.get(self.queue_mode_var.get(), "auto")
        result = self.action("enqueue_task", {
            "goal": goal,
            "qualityMode": mode,
            "priority": priority,
            "dependsOn": depends_on,
            "source": "dependent_queue",
        })
        if result.get("ok"):
            self.queue_goal.delete("1.0", END)
            self.log("Bağımlı görev kuyruğa eklendi.")

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            if not hasattr(self, "change_preview"):
                return
            diff = self.last_status.get("changeDiff") or {}
            regression = self.last_status.get("regression") or []
            changed = diff.get("changed") or []
            created = diff.get("created") or []
            deleted = diff.get("deleted") or []
            lines = [
                f"Değişen: {len(changed)} · Oluşturulan: {len(created)} · Silinen: {len(deleted)}",
                f"Risk: {'YÜKSEK' if diff.get('risk') else 'normal'}",
            ]
            if changed:
                lines.append("\nDeğişen yollar:\n- " + "\n- ".join(map(str, changed[:12])))
            if created:
                lines.append("\nYeni yollar:\n- " + "\n- ".join(map(str, created[:8])))
            if deleted:
                lines.append("\nSilinen yollar:\n- " + "\n- ".join(map(str, deleted[:8])))
            if regression:
                lines.append("\nKayıtlı regresyon testleri:\n- " + "\n- ".join(map(str, regression[-8:])))
            self.change_preview.delete("1.0", END)
            self.change_preview.insert("1.0", "\n".join(lines))
        except Exception as exc:
            self.log(f"Değişiklik önizlemesi yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.refresh_status = refresh_status

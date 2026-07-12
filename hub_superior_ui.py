#!/usr/bin/env python3
"""Project Genome, Intent Compiler, Design DNA and Proof Engine UI for Hub 1.30."""
from __future__ import annotations

import csv
import json
import time
from pathlib import Path
from tkinter import END, BooleanVar, StringVar, filedialog, messagebox, ttk
from typing import Any

from superior_engine import SuperiorEngine


def install(hub: Any) -> None:
    engine = SuperiorEngine(hub.MEMORY_VAULT)
    hub.SUPERIOR_ENGINE = engine
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status
    previous_start_task = hub.ZeroScriptHub.start_task

    def current_project(self: Any) -> tuple[str, dict[str, Any]]:
        project = ((self.last_status.get("automation") or {}).get("activeProject") or {})
        return hub.MEMORY_VAULT.upsert_project(project), project

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.superior_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.superior_tab, text="Üstün Sistem")
        build_superior(self)

    def build_superior(self: Any) -> None:
        outer = ttk.Frame(self.superior_tab, style="Card.TFrame", padding=14)
        outer.pack(fill="both", expand=True, padx=4, pady=8)

        hero = ttk.Frame(outer, style="Hero.TFrame", padding=14)
        hero.pack(fill="x", pady=(0, 10))
        ttk.Label(hero, text="ZeroScript Superior Engine", style="Hero.Title.TLabel").pack(side="left")
        self.superior_summary = ttk.Label(hero, text="Project Genome hazırlanıyor…", style="Hero.Sub.TLabel")
        self.superior_summary.pack(side="right")

        toolbar = ttk.Frame(outer, style="Card.TFrame")
        toolbar.pack(fill="x", pady=(0, 10))
        ttk.Button(toolbar, text="Project Genome tara", style="Primary.TButton", command=lambda: run_action(self, "genome_scan")).pack(side="left")
        ttk.Button(toolbar, text="Intent'i derle", command=lambda: preview_intent(self)).pack(side="left", padx=6)
        ttk.Button(toolbar, text="Shadow Guard hazırla", command=lambda: run_action(self, "shadow_prepare")).pack(side="left")
        ttk.Button(toolbar, text="Proof'u değerlendir", command=lambda: evaluate_now(self)).pack(side="left", padx=6)
        ttk.Button(toolbar, text="Self-Heal tara", command=lambda: run_action(self, "self_heal_scan")).pack(side="left")
        ttk.Button(toolbar, text="Model Jury", command=lambda: run_action(self, "jury_review")).pack(side="left", padx=6)
        ttk.Button(toolbar, text="Acil durdur", style="Danger.TButton", command=lambda: self.action("emergency_stop")).pack(side="right")

        panes = ttk.Panedwindow(outer, orient="horizontal")
        panes.pack(fill="both", expand=True)
        left = ttk.Frame(panes, style="Card.TFrame", padding=(0, 0, 8, 0))
        right = ttk.Frame(panes, style="Card.TFrame", padding=(8, 0, 0, 0))
        panes.add(left, weight=3)
        panes.add(right, weight=4)

        settings = ttk.LabelFrame(left, text="Otomatik karar ve güvenlik", padding=12)
        settings.pack(fill="x")
        self.superior_shadow_var = BooleanVar(value=True)
        self.superior_proof_var = BooleanVar(value=True)
        self.superior_jury_var = BooleanVar(value=True)
        self.superior_auto_genome_var = BooleanVar(value=True)
        self.superior_self_heal_var = StringVar(value="suggest")
        ttk.Checkbutton(settings, text="Yüksek riskte Shadow Guard", variable=self.superior_shadow_var).pack(anchor="w")
        ttk.Checkbutton(settings, text="Kanıtsız görevi doğrulanmış sayma", variable=self.superior_proof_var).pack(anchor="w")
        ttk.Checkbutton(settings, text="Yüksek riskte Model Jury", variable=self.superior_jury_var).pack(anchor="w")
        ttk.Checkbutton(settings, text="Proje değişince Genome tara", variable=self.superior_auto_genome_var).pack(anchor="w")
        row = ttk.Frame(settings, style="Card.TFrame")
        row.pack(fill="x", pady=(6, 0))
        ttk.Label(row, text="Self-Healing", style="Card.TLabel").pack(side="left")
        ttk.Combobox(row, textvariable=self.superior_self_heal_var, values=["off", "suggest", "auto_shadow"], state="readonly", width=14).pack(side="right")
        ttk.Button(settings, text="Ayarları kaydet", command=lambda: save_superior_settings(self)).pack(fill="x", pady=(8, 0))

        design = ttk.LabelFrame(left, text="Design DNA", padding=12)
        design.pack(fill="x", pady=(10, 0))
        self.dna_name_var = StringVar()
        self.dna_primary_var = StringVar()
        self.dna_secondary_var = StringVar()
        self.dna_background_var = StringVar()
        for title, variable in (("Stil adı", self.dna_name_var), ("Ana renk", self.dna_primary_var), ("İkinci renk", self.dna_secondary_var), ("Arka plan", self.dna_background_var)):
            line = ttk.Frame(design, style="Card.TFrame")
            line.pack(fill="x", pady=3)
            ttk.Label(line, text=title, style="Card.TLabel", width=12).pack(side="left")
            ttk.Entry(line, textvariable=variable, style="Modern.TEntry").pack(side="left", fill="x", expand=True)
        ttk.Label(design, text="Kalıcı tasarım kuralları", style="Muted.Card.TLabel").pack(anchor="w", pady=(7, 3))
        self.dna_rules = hub.tk.Text(design, height=6, wrap="word", font=("Segoe UI", 9), padx=8, pady=7)
        self.dna_rules.pack(fill="x")
        ttk.Button(design, text="Design DNA'yı kaydet", command=lambda: save_design(self)).pack(fill="x", pady=(7, 0))

        contracts = ttk.LabelFrame(left, text="Behavioral Contracts", padding=12)
        contracts.pack(fill="both", expand=True, pady=(10, 0))
        self.contract_tree = ttk.Treeview(contracts, columns=("category", "steps"), show="tree headings", height=6)
        self.contract_tree.heading("#0", text="Sözleşme")
        self.contract_tree.heading("category", text="Kategori")
        self.contract_tree.heading("steps", text="Adım")
        self.contract_tree.column("#0", width=170)
        self.contract_tree.column("category", width=80)
        self.contract_tree.column("steps", width=45)
        self.contract_tree.pack(fill="both", expand=True)
        contract_buttons = ttk.Frame(contracts, style="Card.TFrame")
        contract_buttons.pack(fill="x", pady=(6, 0))
        ttk.Button(contract_buttons, text="Yeni sözleşme", command=lambda: edit_contract(self)).pack(side="left")
        ttk.Button(contract_buttons, text="Seçileni kapat", style="Danger.TButton", command=lambda: disable_contract(self)).pack(side="right")

        decision = ttk.LabelFrame(right, text="Intent Compiler ve karar açıklaması", padding=12)
        decision.pack(fill="both", expand=True)
        self.intent_preview = hub.tk.Text(decision, height=18, wrap="word", font=("Consolas", 9), padx=10, pady=8, state="disabled")
        self.intent_preview.pack(fill="both", expand=True)

        proof = ttk.LabelFrame(right, text="Proof Engine", padding=12)
        proof.pack(fill="x", pady=(10, 0))
        self.proof_label = ttk.Label(proof, text="Henüz değerlendirilmiş görev yok.", style="Card.TLabel")
        self.proof_label.pack(anchor="w")
        self.proof_progress = ttk.Progressbar(proof, maximum=100)
        self.proof_progress.pack(fill="x", pady=(6, 0))

        brain = ttk.LabelFrame(right, text="Live Game Brain", padding=12)
        brain.pack(fill="x", pady=(10, 0))
        ttk.Label(brain, text="Roblox Analytics'ten dışa aktardığın JSON veya CSV verisini yerel olarak yorumlar.", style="Muted.Card.TLabel").pack(anchor="w")
        ttk.Button(brain, text="Analytics dosyası içe aktar", command=lambda: import_metrics(self)).pack(anchor="w", pady=(6, 0))
        self.live_brain_text = ttk.Label(brain, text="Henüz veri içe aktarılmadı.", style="Card.TLabel", wraplength=520, justify="left")
        self.live_brain_text.pack(fill="x", pady=(6, 0))

        load_design(self)
        refresh_superior_panels(self, force=True)

    def run_action(self: Any, action: str, payload: dict[str, Any] | None = None) -> None:
        result = self.action(action, payload or {})
        if result.get("ok"):
            self.log(f"Superior Engine komutu gönderildi: {action}")
        else:
            messagebox.showerror("ZeroScript", result.get("error", f"{action} başlatılamadı."))

    def save_superior_settings(self: Any) -> None:
        settings = {
            "shadowGuard": self.superior_shadow_var.get(),
            "proofGate": self.superior_proof_var.get(),
            "modelJury": self.superior_jury_var.get(),
            "autoGenome": self.superior_auto_genome_var.get(),
            "selfHealing": self.superior_self_heal_var.get(),
        }
        run_action(self, "set_superior", {"settings": settings})

    def load_design(self: Any) -> None:
        project_key, _ = current_project(self)
        dna = engine.get_design_dna(project_key)
        palette = dna.get("palette") or {}
        self.dna_name_var.set(str(dna.get("name") or "Project Style"))
        self.dna_primary_var.set(str(palette.get("primary") or "#7C5CFC"))
        self.dna_secondary_var.set(str(palette.get("secondary") or "#36BFFA"))
        self.dna_background_var.set(str(palette.get("background") or "#0B1020"))
        self.dna_rules.delete("1.0", END)
        self.dna_rules.insert("1.0", "\n".join(dna.get("rules") or []))

    def save_design(self: Any) -> None:
        project_key, _ = current_project(self)
        existing = engine.get_design_dna(project_key)
        palette = dict(existing.get("palette") or {})
        palette.update({"primary": self.dna_primary_var.get().strip(), "secondary": self.dna_secondary_var.get().strip(), "background": self.dna_background_var.get().strip()})
        rules = [line.strip(" -•\t") for line in self.dna_rules.get("1.0", END).splitlines() if line.strip(" -•\t")]
        engine.save_design_dna(project_key, {**existing, "name": self.dna_name_var.get().strip(), "palette": palette, "rules": rules})
        self.log("Design DNA proje hafızasına kaydedildi.")
        messagebox.showinfo("ZeroScript", "Design DNA kaydedildi.")

    def edit_contract(self: Any) -> None:
        window = hub.tk.Toplevel(self)
        window.title("Behavioral Contract")
        window.geometry("520x430")
        window.configure(bg="#0B0D12")
        frame = ttk.Frame(window, style="Card.TFrame", padding=14)
        frame.pack(fill="both", expand=True, padx=10, pady=10)
        name_var = StringVar(value="Yeni davranış sözleşmesi")
        category_var = StringVar(value="general")
        ttk.Label(frame, text="Ad", style="Card.TLabel").pack(anchor="w")
        ttk.Entry(frame, textvariable=name_var, style="Modern.TEntry").pack(fill="x", pady=(3, 8))
        ttk.Label(frame, text="Kategori", style="Card.TLabel").pack(anchor="w")
        ttk.Combobox(frame, textvariable=category_var, values=["general", "ui", "rng", "gameplay", "data", "security", "monetization", "economy", "map", "performance", "release"], state="readonly").pack(fill="x", pady=(3, 8))
        ttk.Label(frame, text="Her satıra bir beklenen davranış", style="Card.TLabel").pack(anchor="w")
        body = hub.tk.Text(frame, height=14, wrap="word", font=("Segoe UI", 10), padx=8, pady=7)
        body.pack(fill="both", expand=True, pady=(3, 8))

        def save() -> None:
            steps = [line.strip(" -•\t") for line in body.get("1.0", END).splitlines() if line.strip(" -•\t")]
            if not name_var.get().strip() or not steps:
                messagebox.showwarning("ZeroScript", "Ad ve en az bir davranış adımı gerekli.", parent=window)
                return
            project_key, _ = current_project(self)
            engine.save_contract(project_key, name_var.get(), category_var.get(), steps)
            window.destroy()
            refresh_contracts(self)

        ttk.Button(frame, text="Kaydet", style="Primary.TButton", command=save).pack(fill="x")

    def disable_contract(self: Any) -> None:
        selected = self.contract_tree.selection()
        if not selected:
            return
        engine.disable_contract(selected[0])
        refresh_contracts(self)

    def refresh_contracts(self: Any) -> None:
        project_key, _ = current_project(self)
        for item in self.contract_tree.get_children():
            self.contract_tree.delete(item)
        for contract in engine.list_contracts(project_key):
            self.contract_tree.insert("", END, iid=contract["id"], text=contract["name"], values=(contract["category"], len(contract.get("steps") or [])))

    def preview_intent(self: Any) -> dict[str, Any] | None:
        goal = self.goal.get("1.0", END).strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Önce ana ekrana görev yaz.")
            return None
        project_key, _ = current_project(self)
        spec = engine.compile_intent(goal, project_key)
        text = engine.prompt_block(spec) + "\n\nWHY THIS DECISION\n" + "\n".join(f"- {line}" for line in spec["decisionTrace"])
        self.intent_preview.configure(state="normal")
        self.intent_preview.delete("1.0", END)
        self.intent_preview.insert("1.0", text)
        self.intent_preview.configure(state="disabled")
        self.notebook.select(self.superior_tab)
        return spec

    def evaluate_now(self: Any) -> None:
        task = self.last_status.get("task") or {}
        task_id = str(task.get("id") or "")
        if not task_id:
            messagebox.showwarning("ZeroScript", "Değerlendirilecek görev yok.")
            return
        project_key, _ = current_project(self)
        spec = getattr(self, "_zs_superior_bound_spec", None)
        proof = engine.evaluate_proof(task_id, project_key, self.last_status, spec)
        show_proof(self, proof)

    def import_metrics(self: Any) -> None:
        source = filedialog.askopenfilename(title="Roblox Analytics verisi", filetypes=[("JSON veya CSV", "*.json *.csv"), ("JSON", "*.json"), ("CSV", "*.csv")])
        if not source:
            return
        try:
            path = Path(source)
            if path.suffix.lower() == ".json":
                data = json.loads(path.read_text("utf-8"))
                metrics = data if isinstance(data, dict) else {"rows": data}
            else:
                with path.open("r", encoding="utf-8-sig", newline="") as handle:
                    rows = list(csv.DictReader(handle))
                metrics = rows[-1] if rows else {}
                for key, value in list(metrics.items()):
                    try:
                        metrics[key] = float(str(value).replace("%", "")) / (100 if "%" in str(value) else 1)
                    except (TypeError, ValueError):
                        pass
            project_key, _ = current_project(self)
            recommendations = engine.ingest_live_metrics(project_key, metrics)
            self.live_brain_text.configure(text="\n".join(f"• {item}" for item in recommendations))
            self.log("Live Game Brain analytics verisini yorumladı.")
        except Exception as exc:
            messagebox.showerror("ZeroScript", f"Analytics dosyası okunamadı:\n{exc}")

    def show_proof(self: Any, proof: dict[str, Any]) -> None:
        self.proof_progress["value"] = float(proof.get("score", 0))
        blockers = ", ".join(proof.get("blockers") or []) or "engel yok"
        self.proof_label.configure(text=f"{str(proof.get('status', 'unverified')).upper()} · {proof.get('score', 0):.0f}/100 · {blockers}")

    def refresh_superior_panels(self: Any, force: bool = False) -> None:
        if not hasattr(self, "superior_summary"):
            return
        if not force and time.time() - getattr(self, "_zs_superior_ui_at", 0) < 4:
            return
        self._zs_superior_ui_at = time.time()
        project_key, project = current_project(self)
        remote = self.last_status.get("superior") or {}
        genome = remote.get("genome") or {}
        if genome and genome.get("scannedAt"):
            engine.save_genome(project_key, genome, "extension")
        summary = engine.latest_summary(project_key)
        stored_genome = summary.get("genome") or {}
        counts = stored_genome.get("counts") or {}
        self.superior_summary.configure(text=f"{project.get('name') or 'Açık proje'} · {counts.get('scripts', 0)} script · {counts.get('remotes', 0)} remote · {len(summary.get('contracts') or [])} sözleşme")
        settings = remote.get("settings") or {}
        if settings:
            self.superior_shadow_var.set(bool(settings.get("shadowGuard", True)))
            self.superior_proof_var.set(bool(settings.get("proofGate", True)))
            self.superior_jury_var.set(bool(settings.get("modelJury", True)))
            self.superior_auto_genome_var.set(bool(settings.get("autoGenome", True)))
            self.superior_self_heal_var.set(str(settings.get("selfHealing") or "suggest"))
        proof = remote.get("latestProof") or summary.get("latestProof") or {}
        if proof:
            show_proof(self, proof)
        recommendations = summary.get("liveRecommendations") or []
        if recommendations:
            self.live_brain_text.configure(text="\n".join(f"• {item}" for item in recommendations))
        refresh_contracts(self)

    def start_task(self: Any) -> None:
        original = self.goal.get("1.0", END).strip()
        if not original or "ZEROSCRIPT INTENT CONTRACT" in original:
            previous_start_task(self)
            return
        project_key, _ = current_project(self)
        spec = engine.compile_intent(original, project_key)
        enriched = original + "\n\n" + engine.prompt_block(spec)
        self._zs_superior_pending_spec = spec
        self.goal.delete("1.0", END)
        self.goal.insert("1.0", enriched)
        try:
            previous_start_task(self)
        finally:
            self.goal.delete("1.0", END)
            self.goal.insert("1.0", original)
        self.log(f"Intent Compiler: {spec['category']} · risk {spec['risk']['score']}/100 · {spec['provider']['primary']} · {'jury' if spec['juryRequired'] else 'tek reviewer'}")

    def ingest_superior(self: Any) -> None:
        task = self.last_status.get("task") or {}
        task_id = str(task.get("id") or "")
        if not task_id:
            return
        known = getattr(self, "_zs_superior_bound_task", "")
        if task_id != known:
            pending = getattr(self, "_zs_superior_pending_spec", None)
            if pending:
                self._zs_superior_bound_spec = pending
                self._zs_superior_pending_spec = None
            self._zs_superior_bound_task = task_id
        status = str(task.get("status") or "")
        terminal = f"{task_id}:{status}"
        if status in {"done", "failed", "cancelled"} and terminal != getattr(self, "_zs_superior_terminal", ""):
            project_key, _ = current_project(self)
            proof = engine.evaluate_proof(task_id, project_key, self.last_status, getattr(self, "_zs_superior_bound_spec", None))
            self._zs_superior_terminal = terminal
            show_proof(self, proof)
            self.log(f"Proof Engine: {proof['status']} · {proof['score']:.0f}/100")

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            ingest_superior(self)
            refresh_superior_panels(self)
        except Exception as exc:
            self.log(f"Superior Engine yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.start_task = start_task
    hub.ZeroScriptHub.refresh_status = refresh_status

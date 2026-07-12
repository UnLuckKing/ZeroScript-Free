#!/usr/bin/env python3
"""Recipe Studio, learning dashboard and Memory Vault integration for Hub 1.29."""
from __future__ import annotations

import json
import time
from pathlib import Path
from tkinter import END, StringVar, filedialog, messagebox, ttk
from typing import Any

from memory_vault import MemoryVault


def install(hub: Any) -> None:
    vault = MemoryVault(hub.ROOT / "zeroscript_memory.db")
    hub.MEMORY_VAULT = vault
    previous_build_ui = hub.ZeroScriptHub._build_ui
    previous_refresh = hub.ZeroScriptHub.refresh_status
    previous_start_task = hub.ZeroScriptHub.start_task

    def current_project(self: Any) -> tuple[str, dict[str, Any]]:
        project = ((self.last_status.get("automation") or {}).get("activeProject") or {})
        key = vault.upsert_project(project)
        return key, project

    def build_ui(self: Any) -> None:
        previous_build_ui(self)
        self.learning_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.learning_tab, text="Recipe Studio")
        build_learning(self)

    def build_learning(self: Any) -> None:
        outer = ttk.Frame(self.learning_tab, style="Card.TFrame", padding=14)
        outer.pack(fill="both", expand=True, padx=4, pady=8)

        hero = ttk.Frame(outer, style="Hero.TFrame", padding=14)
        hero.pack(fill="x", pady=(0, 10))
        ttk.Label(hero, text="Memory Vault & Recipe Studio", style="Hero.Title.TLabel").pack(side="left")
        self.learning_stats = ttk.Label(hero, text="Hafıza hazırlanıyor…", style="Hero.Sub.TLabel")
        self.learning_stats.pack(side="right")

        toolbar = ttk.Frame(outer, style="Card.TFrame")
        toolbar.pack(fill="x", pady=(0, 8))
        self.recipe_search_var = StringVar()
        self.recipe_category_var = StringVar(value="all")
        search = ttk.Entry(toolbar, textvariable=self.recipe_search_var, style="Modern.TEntry")
        search.pack(side="left", fill="x", expand=True)
        search.bind("<KeyRelease>", lambda _event: refresh_recipe_list(self))
        categories = ["all", "ui", "rng", "gameplay", "monetization", "data", "security", "economy", "map", "vfx", "onboarding", "debug", "performance", "release", "general"]
        combo = ttk.Combobox(toolbar, textvariable=self.recipe_category_var, values=categories, state="readonly", width=16)
        combo.pack(side="left", padx=8)
        combo.bind("<<ComboboxSelected>>", lambda _event: refresh_recipe_list(self))
        ttk.Button(toolbar, text="Yenile", command=lambda: refresh_recipe_list(self)).pack(side="left")
        ttk.Button(toolbar, text="İçe aktar", command=lambda: import_pack(self)).pack(side="right")
        ttk.Button(toolbar, text="Dışa aktar", command=lambda: export_pack(self)).pack(side="right", padx=6)

        panes = ttk.Panedwindow(outer, orient="horizontal")
        panes.pack(fill="both", expand=True)
        left = ttk.Frame(panes, style="Card.TFrame", padding=(0, 0, 8, 0))
        right = ttk.Frame(panes, style="Card.TFrame", padding=(8, 0, 0, 0))
        panes.add(left, weight=3)
        panes.add(right, weight=4)

        self.recipe_tree = ttk.Treeview(left, columns=("category", "score", "uses", "source"), show="tree headings", height=18)
        self.recipe_tree.heading("#0", text="Recipe")
        self.recipe_tree.column("#0", width=250, stretch=True)
        for key, title, width in (("category", "Kategori", 90), ("score", "Başarı", 70), ("uses", "Kullanım", 65), ("source", "Kaynak", 75)):
            self.recipe_tree.heading(key, text=title)
            self.recipe_tree.column(key, width=width, stretch=False)
        self.recipe_tree.pack(fill="both", expand=True)
        self.recipe_tree.bind("<<TreeviewSelect>>", lambda _event: select_recipe(self))

        recipe_buttons = ttk.Frame(left, style="Card.TFrame")
        recipe_buttons.pack(fill="x", pady=(8, 0))
        ttk.Button(recipe_buttons, text="Bu görevde kullan", style="Primary.TButton", command=lambda: use_recipe(self)).pack(side="left")
        ttk.Button(recipe_buttons, text="Kuyruğa ekle", command=lambda: queue_recipe(self)).pack(side="left", padx=6)
        ttk.Button(recipe_buttons, text="Yeni", command=lambda: clear_editor(self)).pack(side="right")

        form = ttk.Frame(right, style="Card.TFrame")
        form.pack(fill="both", expand=True)
        self.recipe_name_var = StringVar()
        self.recipe_editor_category_var = StringVar(value="general")
        self.recipe_risk_var = StringVar(value="medium")
        self.recipe_models_var = StringVar(value="auto")
        self.recipe_scope_var = StringVar(value="global")
        self._zs_selected_recipe_id = None

        top_fields = ttk.Frame(form, style="Card.TFrame")
        top_fields.pack(fill="x")
        ttk.Label(top_fields, text="Ad", style="Muted.Card.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(top_fields, text="Kategori", style="Muted.Card.TLabel").grid(row=0, column=1, sticky="w", padx=(8, 0))
        ttk.Label(top_fields, text="Risk", style="Muted.Card.TLabel").grid(row=0, column=2, sticky="w", padx=(8, 0))
        ttk.Label(top_fields, text="Kapsam", style="Muted.Card.TLabel").grid(row=0, column=3, sticky="w", padx=(8, 0))
        ttk.Entry(top_fields, textvariable=self.recipe_name_var, style="Modern.TEntry").grid(row=1, column=0, sticky="ew")
        ttk.Combobox(top_fields, textvariable=self.recipe_editor_category_var, values=categories[1:], state="readonly", width=13).grid(row=1, column=1, sticky="ew", padx=(8, 0))
        ttk.Combobox(top_fields, textvariable=self.recipe_risk_var, values=["low", "medium", "high", "critical"], state="readonly", width=10).grid(row=1, column=2, sticky="ew", padx=(8, 0))
        ttk.Combobox(top_fields, textvariable=self.recipe_scope_var, values=["global", "project"], state="readonly", width=10).grid(row=1, column=3, sticky="ew", padx=(8, 0))
        top_fields.columnconfigure(0, weight=1)

        ttk.Label(form, text="Tercih edilen modeller (virgülle)", style="Muted.Card.TLabel").pack(anchor="w", pady=(10, 3))
        ttk.Entry(form, textvariable=self.recipe_models_var, style="Modern.TEntry").pack(fill="x")
        ttk.Label(form, text="Recipe talimatı", style="Muted.Card.TLabel").pack(anchor="w", pady=(10, 3))
        self.recipe_prompt = hub.tk.Text(form, height=7, wrap="word", font=("Segoe UI", 10), padx=10, pady=8)
        self.recipe_prompt.pack(fill="x")

        detail_grid = ttk.Frame(form, style="Card.TFrame")
        detail_grid.pack(fill="both", expand=True, pady=(10, 0))
        for column, title in enumerate(("Önce incele", "Zorunlu testler", "Tekrarlama")):
            frame = ttk.Frame(detail_grid, style="Card.TFrame")
            frame.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 5, 0))
            ttk.Label(frame, text=title, style="Muted.Card.TLabel").pack(anchor="w")
            widget = hub.tk.Text(frame, height=10, wrap="word", font=("Segoe UI", 9), padx=8, pady=7)
            widget.pack(fill="both", expand=True, pady=(3, 0))
            setattr(self, ("recipe_inspect", "recipe_tests", "recipe_avoid")[column], widget)
            detail_grid.columnconfigure(column, weight=1)
        detail_grid.rowconfigure(0, weight=1)

        editor_buttons = ttk.Frame(form, style="Card.TFrame")
        editor_buttons.pack(fill="x", pady=(10, 0))
        ttk.Button(editor_buttons, text="Recipe kaydet", style="Primary.TButton", command=lambda: save_recipe(self)).pack(side="left")
        ttk.Button(editor_buttons, text="Kopya oluştur", command=lambda: save_recipe(self, clone=True)).pack(side="left", padx=6)
        ttk.Button(editor_buttons, text="Devre dışı bırak", style="Danger.TButton", command=lambda: disable_recipe(self)).pack(side="right")

        bottom = ttk.Panedwindow(outer, orient="horizontal")
        bottom.pack(fill="x", pady=(10, 0))
        lessons_box = ttk.Frame(bottom, style="Card.TFrame", padding=8)
        suggestions_box = ttk.Frame(bottom, style="Card.TFrame", padding=8)
        bottom.add(lessons_box, weight=2)
        bottom.add(suggestions_box, weight=1)
        ttk.Label(lessons_box, text="Son öğrenilen dersler", style="Status.TLabel").pack(anchor="w")
        self.learning_lessons = hub.tk.Text(lessons_box, height=6, wrap="word", font=("Segoe UI", 9), padx=8, pady=7, state="disabled")
        self.learning_lessons.pack(fill="both", expand=True, pady=(5, 0))
        ttk.Label(suggestions_box, text="Yeni Recipe önerileri", style="Status.TLabel").pack(anchor="w")
        self.learning_suggestions = ttk.Treeview(suggestions_box, columns=("category",), show="tree headings", height=5)
        self.learning_suggestions.heading("#0", text="Öneri")
        self.learning_suggestions.heading("category", text="Kategori")
        self.learning_suggestions.column("#0", width=230, stretch=True)
        self.learning_suggestions.column("category", width=75, stretch=False)
        self.learning_suggestions.pack(fill="both", expand=True, pady=(5, 0))
        suggestion_buttons = ttk.Frame(suggestions_box, style="Card.TFrame")
        suggestion_buttons.pack(fill="x", pady=(5, 0))
        ttk.Button(suggestion_buttons, text="Kabul et", command=lambda: accept_suggestion(self)).pack(side="left")
        ttk.Button(suggestion_buttons, text="Reddet", command=lambda: dismiss_suggestion(self)).pack(side="left", padx=5)

        refresh_recipe_list(self)

    def lines(widget: Any) -> list[str]:
        return [line.strip(" -•\t") for line in widget.get("1.0", END).splitlines() if line.strip(" -•\t")]

    def refresh_recipe_list(self: Any) -> None:
        project_key, _ = current_project(self)
        selected = getattr(self, "_zs_selected_recipe_id", None)
        recipes = vault.list_recipes(self.recipe_search_var.get(), self.recipe_category_var.get(), project_key)
        for item in self.recipe_tree.get_children():
            self.recipe_tree.delete(item)
        for recipe in recipes:
            rate = f"%{recipe['success_rate']}" if recipe["success_count"] + recipe["failure_count"] else "yeni"
            self.recipe_tree.insert("", END, iid=recipe["id"], text=("★ " if recipe.get("pinned") else "") + recipe["name"], values=(recipe["category"], rate, recipe["usage_count"], recipe["source"]))
        if selected and self.recipe_tree.exists(selected):
            self.recipe_tree.selection_set(selected)

    def select_recipe(self: Any) -> None:
        selected = self.recipe_tree.selection()
        if not selected:
            return
        recipe = vault.get_recipe(selected[0])
        if not recipe:
            return
        self._zs_selected_recipe_id = recipe["id"]
        self.recipe_name_var.set(recipe["name"])
        self.recipe_editor_category_var.set(recipe["category"])
        self.recipe_risk_var.set(recipe["risk"])
        self.recipe_scope_var.set(recipe["scope"])
        self.recipe_models_var.set(", ".join(recipe.get("models") or ["auto"]))
        for widget, value in ((self.recipe_prompt, recipe["prompt"]), (self.recipe_inspect, "\n".join(recipe.get("inspect") or [])), (self.recipe_tests, "\n".join(recipe.get("tests") or [])), (self.recipe_avoid, "\n".join(recipe.get("avoid") or []))):
            widget.delete("1.0", END)
            widget.insert("1.0", value)

    def clear_editor(self: Any) -> None:
        self._zs_selected_recipe_id = None
        self.recipe_name_var.set("")
        self.recipe_editor_category_var.set("general")
        self.recipe_risk_var.set("medium")
        self.recipe_scope_var.set("global")
        self.recipe_models_var.set("auto")
        for widget in (self.recipe_prompt, self.recipe_inspect, self.recipe_tests, self.recipe_avoid):
            widget.delete("1.0", END)

    def editor_value(self: Any, clone: bool = False) -> dict[str, Any]:
        project_key, _ = current_project(self)
        selected = vault.get_recipe(self._zs_selected_recipe_id) if self._zs_selected_recipe_id else None
        recipe_id = None if clone or (selected and selected.get("source") == "builtin") else self._zs_selected_recipe_id
        return {
            "id": recipe_id,
            "name": self.recipe_name_var.get().strip(),
            "category": self.recipe_editor_category_var.get(),
            "risk": self.recipe_risk_var.get(),
            "scope": self.recipe_scope_var.get(),
            "project_key": project_key if self.recipe_scope_var.get() == "project" else "",
            "models": [item.strip() for item in self.recipe_models_var.get().split(",") if item.strip()],
            "prompt": self.recipe_prompt.get("1.0", END).strip(),
            "inspect": lines(self.recipe_inspect),
            "tests": lines(self.recipe_tests),
            "avoid": lines(self.recipe_avoid),
            "source": "custom",
            "enabled": True,
        }

    def save_recipe(self: Any, clone: bool = False) -> None:
        value = editor_value(self, clone)
        if not value["name"] or not value["prompt"]:
            messagebox.showwarning("ZeroScript", "Recipe adı ve talimatı gerekli.")
            return
        recipe_id = vault.save_recipe(value)
        self._zs_selected_recipe_id = recipe_id
        refresh_recipe_list(self)
        if self.recipe_tree.exists(recipe_id):
            self.recipe_tree.selection_set(recipe_id)
            self.recipe_tree.see(recipe_id)
        self.log(f"Recipe kaydedildi: {value['name']}")

    def disable_recipe(self: Any) -> None:
        recipe_id = getattr(self, "_zs_selected_recipe_id", None)
        recipe = vault.get_recipe(recipe_id) if recipe_id else None
        if not recipe:
            return
        if recipe.get("source") == "builtin":
            messagebox.showinfo("ZeroScript", "Yerleşik tarif silinmez. Kopyasını oluşturup düzenleyebilirsin.")
            return
        if messagebox.askyesno("ZeroScript", f"{recipe['name']} devre dışı bırakılsın mı?"):
            vault.disable_recipe(recipe_id)
            clear_editor(self)
            refresh_recipe_list(self)

    def use_recipe(self: Any) -> None:
        selected = self.recipe_tree.selection()
        if not selected:
            messagebox.showwarning("ZeroScript", "Önce bir Recipe seç.")
            return
        recipe = vault.get_recipe(selected[0])
        if not recipe:
            return
        self._zs_forced_recipe_id = recipe["id"]
        current = self.goal.get("1.0", END).strip()
        if not current:
            self.goal.insert("1.0", f"Apply the {recipe['name']} workflow to the currently open Roblox experience.")
        self.notebook.select(self.home)
        self.goal.focus_set()
        self.log(f"Sonraki görev için Recipe seçildi: {recipe['name']}")

    def queue_recipe(self: Any) -> None:
        selected = self.recipe_tree.selection()
        if not selected:
            return
        recipe = vault.get_recipe(selected[0])
        if not recipe:
            return
        project_key, _ = current_project(self)
        base_goal = self.goal.get("1.0", END).strip() or f"Apply the {recipe['name']} workflow to the current Roblox experience."
        context = vault.build_context(base_goal, project_key, (self.last_status.get("automation") or {}).get("providerTable") or [])
        enriched = f"USER GOAL\n{base_goal}\n\n{context['context']}"
        result = self.action("enqueue_task", {"goal": enriched, "qualityMode": "auto", "priority": "normal", "source": "recipe_studio"})
        if result.get("ok"):
            self.log(f"Recipe görevi kuyruğa eklendi: {recipe['name']}")

    def export_pack(self: Any) -> None:
        project_key, _ = current_project(self)
        target = filedialog.asksaveasfilename(title="ZeroScript Recipe paketi", defaultextension=".json", filetypes=[("ZeroScript Recipe Pack", "*.json")], initialfile="zeroscript-recipes.json")
        if not target:
            return
        vault.export_pack(Path(target), project_key)
        messagebox.showinfo("ZeroScript", f"Recipe paketi oluşturuldu:\n{target}")

    def import_pack(self: Any) -> None:
        source = filedialog.askopenfilename(title="ZeroScript Recipe paketi", filetypes=[("ZeroScript Recipe Pack", "*.json"), ("JSON", "*.json")])
        if not source:
            return
        try:
            count = vault.import_pack(Path(source))
            refresh_recipe_list(self)
            messagebox.showinfo("ZeroScript", f"{count} Recipe içe aktarıldı.")
        except Exception as exc:
            messagebox.showerror("ZeroScript", f"Recipe paketi açılamadı:\n{exc}")

    def accept_suggestion(self: Any) -> None:
        selected = self.learning_suggestions.selection()
        if not selected:
            return
        recipe_id = vault.accept_suggestion(selected[0])
        if recipe_id:
            refresh_learning_panels(self, force=True)
            refresh_recipe_list(self)

    def dismiss_suggestion(self: Any) -> None:
        selected = self.learning_suggestions.selection()
        if selected:
            vault.dismiss_suggestion(selected[0])
            refresh_learning_panels(self, force=True)

    def enriched_goal(self: Any, original_goal: str) -> tuple[str, dict[str, Any]]:
        project_key, _ = current_project(self)
        provider_table = (self.last_status.get("automation") or {}).get("providerTable") or []
        context = vault.build_context(original_goal, project_key, provider_table)
        forced_id = getattr(self, "_zs_forced_recipe_id", None)
        if forced_id:
            forced = vault.get_recipe(forced_id)
            if forced and forced_id not in context["recipe_ids"]:
                forced_block = [f"\nFORCED RECIPE [{forced['name']}]", forced["prompt"]]
                if forced.get("inspect"):
                    forced_block.append("Inspect: " + "; ".join(forced["inspect"][:8]))
                if forced.get("tests"):
                    forced_block.append("Required tests: " + "; ".join(forced["tests"][:8]))
                if forced.get("avoid"):
                    forced_block.append("Do not: " + "; ".join(forced["avoid"][:8]))
                context["context"] = context["context"] + "\n" + "\n".join(forced_block)
                context["recipe_ids"].insert(0, forced_id)
                context["recipe_names"].insert(0, forced["name"])
            self._zs_forced_recipe_id = None
        return f"USER GOAL\n{original_goal}\n\n{context['context']}", {**context, "project_key": project_key, "original_goal": original_goal}

    def start_task(self: Any) -> None:
        original = self.goal.get("1.0", END).strip()
        if not original:
            previous_start_task(self)
            return
        if "ZEROSCRIPT LEARNING CONTEXT" in original:
            previous_start_task(self)
            return
        enriched, metadata = enriched_goal(self, original)
        self._zs_learning_pending = metadata
        self.goal.delete("1.0", END)
        self.goal.insert("1.0", enriched)
        try:
            previous_start_task(self)
        finally:
            self.goal.delete("1.0", END)
            self.goal.insert("1.0", original)
        names = ", ".join(metadata.get("recipe_names") or []) or "genel hafıza"
        self.log(f"Öğrenme context'i hazırlandı: {names} · {metadata.get('lessons', 0)} ders · {metadata.get('failures', 0)} kaçınılacak hata")

    def snapshot_from_status(self: Any, task: dict[str, Any]) -> dict[str, Any]:
        learning = self.last_status.get("learningSnapshot") or {}
        productivity = self.last_status.get("productivity") or {}
        manager = learning.get("memory") or {}
        automation = self.last_status.get("automation") or {}
        return {
            "provider": task.get("provider") or learning.get("provider") or "",
            "verified": manager.get("verified") or learning.get("verified") or [],
            "remaining": manager.get("remaining") or learning.get("remaining") or [],
            "changedPaths": manager.get("changedPaths") or ((self.last_status.get("changeDiff") or {}).get("changed") or []),
            "regression": learning.get("regression") or self.last_status.get("regression") or [],
            "outputErrors": manager.get("outputErrors") or productivity.get("outputWatch", {}).get("errors") or [],
            "reports": manager.get("reports") or learning.get("reports") or [],
            "error": task.get("error") or "",
            "providerTable": automation.get("providerTable") or [],
        }

    def ingest_learning(self: Any) -> None:
        project_key, _ = current_project(self)
        task = self.last_status.get("task") or {}
        task_id = str(task.get("id") or "")
        if task_id:
            pending = getattr(self, "_zs_learning_pending", None)
            known = getattr(self, "_zs_learning_bound_task", "")
            if task_id != known:
                if pending:
                    vault.begin_task(task_id, pending["project_key"], pending["original_goal"], str(task.get("goal") or ""), pending.get("recipe_ids") or [], pending.get("category") or "general", str(task.get("performanceMode") or ""))
                    self._zs_learning_pending = None
                else:
                    visible_goal = str(task.get("goal") or "")
                    original_goal = visible_goal.split("\n\nZEROSCRIPT LEARNING CONTEXT", 1)[0].removeprefix("USER GOAL\n").strip()
                    vault.begin_task(task_id, project_key, original_goal or visible_goal, visible_goal, [], vault.classify(original_goal or visible_goal), str(task.get("performanceMode") or ""))
                self._zs_learning_bound_task = task_id

            status = str(task.get("status") or "")
            terminal_key = f"{task_id}:{status}"
            if status in {"done", "failed", "cancelled"} and terminal_key != getattr(self, "_zs_learning_terminal", ""):
                result = vault.record_outcome(task_id, status, snapshot_from_status(self, task))
                self._zs_learning_terminal = terminal_key
                if result.get("recorded"):
                    self.log(f"Memory Vault görevi öğrendi: {result['outcome']} · skor {result['score']:.0f}/100")

        automation = self.last_status.get("automation") or {}
        provider_table = automation.get("providerTable") or []
        if provider_table and time.time() - getattr(self, "_zs_provider_ingest_at", 0) > 30:
            category = vault.classify(str(task.get("goal") or "")) if task else "general"
            vault.ingest_provider_table(project_key, category, provider_table)
            self._zs_provider_ingest_at = time.time()

    def refresh_learning_panels(self: Any, force: bool = False) -> None:
        if not hasattr(self, "learning_stats"):
            return
        if not force and time.time() - getattr(self, "_zs_learning_ui_at", 0) < 4:
            return
        self._zs_learning_ui_at = time.time()
        project_key, _ = current_project(self)
        stats = vault.stats(project_key)
        self.learning_stats.configure(text=f"{stats['recipes']} Recipe · {stats['lessons']} ders · {stats['successes']} başarılı · {stats['suggestions']} öneri")
        lessons = vault.list_lessons(project_key, 12)
        lesson_lines = []
        for lesson in lessons[:8]:
            mark = "✓" if lesson.get("outcome") == "success" else "!"
            lesson_lines.append(f"{mark} [{lesson.get('category')}] {lesson.get('summary', '')}")
        self.learning_lessons.configure(state="normal")
        self.learning_lessons.delete("1.0", END)
        self.learning_lessons.insert("1.0", "\n\n".join(lesson_lines) if lesson_lines else "Henüz doğrulanmış ders yok. Görevler QA kanıtıyla tamamlandıkça burada birikir.")
        self.learning_lessons.configure(state="disabled")
        for item in self.learning_suggestions.get_children():
            self.learning_suggestions.delete(item)
        for suggestion in vault.list_suggestions(project_key):
            self.learning_suggestions.insert("", END, iid=suggestion["id"], text=suggestion["name"], values=(suggestion["category"],))

    def refresh_status(self: Any) -> None:
        previous_refresh(self)
        try:
            ingest_learning(self)
            refresh_learning_panels(self)
        except Exception as exc:
            self.log(f"Memory Vault yenilenemedi: {exc}")

    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub.start_task = start_task
    hub.ZeroScriptHub.refresh_status = refresh_status

#!/usr/bin/env python3
"""ZeroScript Hub - one-window launcher and control center for Windows.

The Hub keeps the existing bridge, extension, smart router, checkpoint, safety,
and QA systems. It only hides the setup complexity behind a simple desktop UI.
"""
from __future__ import annotations

import json
import os
import secrets
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any

import tkinter as tk
from tkinter import messagebox, ttk

VERSION = "1.25.0"
ROOT = Path(__file__).resolve().parent
TOKEN_FILE = ROOT / "control_token.txt"
SETTINGS_FILE = ROOT / "hub_settings.json"
LOG_DIR = ROOT / "logs"
CONTROL_PORT = 17614
BRIDGE_PORT = 17613
CONTROL_URL = f"http://127.0.0.1:{CONTROL_PORT}"
CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0
DETACHED_PROCESS = 0x00000008 if os.name == "nt" else 0

DEFAULT_SETTINGS: dict[str, Any] = {
    "qualityMode": "balanced",
    "smartRouting": True,
    "approvalMode": "autonomous",
    "notifications": True,
    "autoContextRecovery": True,
    "preferredBuilder": "auto",
    "preferredUI": "auto",
    "preferredQA": "auto",
    "autoStartServices": True,
}

PROVIDERS = ["auto", "deepseek", "qwen", "gemini", "chatgpt", "claude", "kimi", "glm", "mistral", "copilot", "arena", "local"]
QUALITY_LABELS = {
    "Hızlı": "fast",
    "Dengeli": "balanced",
    "Maksimum kalite": "best",
}
QUALITY_VALUES = {value: label for label, value in QUALITY_LABELS.items()}


def load_json(path: Path, default: Any) -> Any:
    try:
        data = json.loads(path.read_text("utf-8"))
        return data
    except Exception:
        return default


def save_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), "utf-8")


def ensure_token() -> str:
    try:
        token = TOKEN_FILE.read_text("utf-8").strip()
        if len(token) >= 24:
            return token
    except FileNotFoundError:
        pass
    token = secrets.token_urlsafe(32)
    TOKEN_FILE.write_text(token + "\n", "utf-8")
    return token


def port_open(port: int, timeout: float = 0.25) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def tasklist_contains(name: str) -> bool:
    if os.name != "nt":
        return False
    try:
        out = subprocess.check_output(["tasklist", "/FI", f"IMAGENAME eq {name}"], text=True, encoding="utf-8", errors="ignore", creationflags=CREATE_NO_WINDOW)
        return name.lower() in out.lower()
    except Exception:
        return False


def pid_on_port(port: int) -> int | None:
    if os.name != "nt":
        return None
    try:
        out = subprocess.check_output(["netstat", "-aon"], text=True, encoding="utf-8", errors="ignore", creationflags=CREATE_NO_WINDOW)
        needle = f":{port}"
        for line in out.splitlines():
            if needle in line and "LISTENING" in line.upper():
                parts = line.split()
                if parts and parts[-1].isdigit():
                    return int(parts[-1])
    except Exception:
        pass
    return None


def kill_port(port: int) -> None:
    pid = pid_on_port(port)
    if not pid:
        return
    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
    except Exception:
        pass


def request_json(path: str, token: str = "", method: str = "GET", payload: dict[str, Any] | None = None, timeout: float = 3.0) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-ZeroScript-Token"] = token
    req = urllib.request.Request(f"{CONTROL_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {"ok": True}
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode("utf-8", errors="replace"))
            return body if isinstance(body, dict) else {"ok": False, "error": str(exc)}
        except Exception:
            return {"ok": False, "error": str(exc)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


class ZeroScriptHub(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"ZeroScript Hub {VERSION}")
        self.geometry("900x650")
        self.minsize(780, 560)
        self.configure(bg="#111318")
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        self.token = ensure_token()
        self.settings = {**DEFAULT_SETTINGS, **load_json(SETTINGS_FILE, {})}
        self.control_process: subprocess.Popen[Any] | None = None
        self.bridge_process: subprocess.Popen[Any] | None = None
        self.last_status: dict[str, Any] = {}
        self._closing = False

        self._build_style()
        self._build_ui()
        self._load_settings_into_ui()
        self.after(250, self.refresh_status)
        if self.settings.get("autoStartServices", True):
            self.after(600, self.start_services)

    def _build_style(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TFrame", background="#111318")
        style.configure("Card.TFrame", background="#1a1e25")
        style.configure("TLabel", background="#111318", foreground="#e8ebf0", font=("Segoe UI", 10))
        style.configure("Card.TLabel", background="#1a1e25", foreground="#e8ebf0", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#111318", foreground="#ffffff", font=("Segoe UI Semibold", 22))
        style.configure("Sub.TLabel", background="#111318", foreground="#9299a6", font=("Segoe UI", 10))
        style.configure("Status.TLabel", background="#1a1e25", foreground="#d5dae3", font=("Segoe UI Semibold", 11))
        style.configure("Primary.TButton", font=("Segoe UI Semibold", 11), padding=(14, 10), background="#6d5dfc", foreground="white")
        style.map("Primary.TButton", background=[("active", "#7c6cff"), ("disabled", "#343744")])
        style.configure("TButton", font=("Segoe UI", 10), padding=(10, 7), background="#2a303a", foreground="#edf0f6")
        style.map("TButton", background=[("active", "#343b47")])
        style.configure("TNotebook", background="#111318", borderwidth=0)
        style.configure("TNotebook.Tab", padding=(14, 8), background="#1a1e25", foreground="#aeb5c1")
        style.map("TNotebook.Tab", background=[("selected", "#262b35")], foreground=[("selected", "white")])
        style.configure("TCombobox", fieldbackground="#222731", background="#222731", foreground="white", arrowcolor="white")
        style.configure("TCheckbutton", background="#1a1e25", foreground="#e8ebf0")

    def _build_ui(self) -> None:
        header = ttk.Frame(self)
        header.pack(fill="x", padx=24, pady=(20, 12))
        ttk.Label(header, text="ZeroScript Hub", style="Title.TLabel").pack(side="left")
        ttk.Label(header, text=f"v{VERSION}", style="Sub.TLabel").pack(side="left", padx=(10, 0), pady=(9, 0))
        self.master_status = ttk.Label(header, text="Hazırlanıyor…", style="Sub.TLabel")
        self.master_status.pack(side="right", pady=(9, 0))

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=20, pady=(0, 18))

        self.home = ttk.Frame(self.notebook)
        self.settings_tab = ttk.Frame(self.notebook)
        self.details_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.home, text="Ana ekran")
        self.notebook.add(self.settings_tab, text="Ayarlar")
        self.notebook.add(self.details_tab, text="Detaylar")

        self._build_home()
        self._build_settings()
        self._build_details()

    def _status_card(self, parent: tk.Misc, title: str) -> tuple[ttk.Frame, ttk.Label]:
        frame = ttk.Frame(parent, style="Card.TFrame", padding=14)
        ttk.Label(frame, text=title, style="Card.TLabel").pack(anchor="w")
        value = ttk.Label(frame, text="Kontrol ediliyor…", style="Status.TLabel")
        value.pack(anchor="w", pady=(7, 0))
        return frame, value

    def _build_home(self) -> None:
        statuses = ttk.Frame(self.home)
        statuses.pack(fill="x", padx=4, pady=(8, 12))
        statuses.columnconfigure((0, 1, 2, 3), weight=1, uniform="status")
        self.card_hub, self.status_hub = self._status_card(statuses, "Hub")
        self.card_bridge, self.status_bridge = self._status_card(statuses, "Bridge")
        self.card_studio, self.status_studio = self._status_card(statuses, "Roblox Studio")
        self.card_models, self.status_models = self._status_card(statuses, "AI modelleri")
        for i, card in enumerate((self.card_hub, self.card_bridge, self.card_studio, self.card_models)):
            card.grid(row=0, column=i, padx=5, sticky="nsew")

        action_card = ttk.Frame(self.home, style="Card.TFrame", padding=18)
        action_card.pack(fill="both", expand=True, padx=4, pady=4)
        top = ttk.Frame(action_card, style="Card.TFrame")
        top.pack(fill="x")
        ttk.Label(top, text="Görevin nedir?", style="Status.TLabel").pack(side="left")
        self.mode_var = tk.StringVar(value="Dengeli")
        self.mode_combo = ttk.Combobox(top, textvariable=self.mode_var, values=list(QUALITY_LABELS), state="readonly", width=18)
        self.mode_combo.pack(side="right")

        self.goal = tk.Text(action_card, height=7, wrap="word", bg="#222731", fg="#f2f4f8", insertbackground="white", relief="flat", font=("Segoe UI", 11), padx=12, pady=10)
        self.goal.pack(fill="both", expand=True, pady=(12, 10))
        self.goal.insert("1.0", "")

        buttons = ttk.Frame(action_card, style="Card.TFrame")
        buttons.pack(fill="x")
        self.start_task_button = ttk.Button(buttons, text="▶ Çalıştır", style="Primary.TButton", command=self.start_task)
        self.start_task_button.pack(side="left", fill="x", expand=True)
        ttk.Button(buttons, text="Durdur", command=lambda: self.action("cancel")).pack(side="left", padx=(8, 0))
        ttk.Button(buttons, text="Geri al", command=lambda: self.action("rollback")).pack(side="left", padx=(8, 0))

        self.task_line = ttk.Label(action_card, text="Aktif görev yok.", style="Card.TLabel")
        self.task_line.pack(fill="x", pady=(12, 0))

        quick = ttk.Frame(self.home)
        quick.pack(fill="x", padx=4, pady=(10, 0))
        self.services_button = ttk.Button(quick, text="ZeroScript'i başlat", command=self.start_services)
        self.services_button.pack(side="left")
        ttk.Button(quick, text="Bağlantıyı onar", command=self.repair).pack(side="left", padx=8)
        ttk.Button(quick, text="Extension'ı eşleştir", command=self.pair_extension).pack(side="left")
        ttk.Button(quick, text="Studio panelini kur", command=self.install_studio_panel).pack(side="right")

    def _build_settings(self) -> None:
        outer = ttk.Frame(self.settings_tab, style="Card.TFrame", padding=18)
        outer.pack(fill="both", expand=True, padx=4, pady=8)

        ttk.Label(outer, text="Basit ayarlar", style="Status.TLabel").grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 12))
        ttk.Label(outer, text="Çalışma modu", style="Card.TLabel").grid(row=1, column=0, sticky="w", pady=6)
        self.settings_mode_var = tk.StringVar()
        ttk.Combobox(outer, textvariable=self.settings_mode_var, values=list(QUALITY_LABELS), state="readonly", width=24).grid(row=1, column=1, sticky="ew", pady=6)

        self.smart_var = tk.BooleanVar(value=True)
        self.approval_var = tk.StringVar(value="autonomous")
        self.notify_var = tk.BooleanVar(value=True)
        self.context_var = tk.BooleanVar(value=True)
        self.auto_services_var = tk.BooleanVar(value=True)

        ttk.Checkbutton(outer, text="Modeli otomatik seç", variable=self.smart_var).grid(row=2, column=0, columnspan=2, sticky="w", pady=6)
        ttk.Label(outer, text="Riskli işlemler", style="Card.TLabel").grid(row=3, column=0, sticky="w", pady=6)
        approval = ttk.Combobox(outer, textvariable=self.approval_var, values=["autonomous", "review"], state="readonly", width=24)
        approval.grid(row=3, column=1, sticky="ew", pady=6)
        ttk.Checkbutton(outer, text="Görev bitince bildirim göster", variable=self.notify_var).grid(row=4, column=0, columnspan=2, sticky="w", pady=6)
        ttk.Checkbutton(outer, text="Context dolunca otomatik yeni sohbet hazırla", variable=self.context_var).grid(row=5, column=0, columnspan=2, sticky="w", pady=6)
        ttk.Checkbutton(outer, text="Hub açılınca servisleri otomatik başlat", variable=self.auto_services_var).grid(row=6, column=0, columnspan=2, sticky="w", pady=6)

        ttk.Separator(outer).grid(row=7, column=0, columnspan=2, sticky="ew", pady=14)
        ttk.Label(outer, text="Manuel model tercihleri", style="Status.TLabel").grid(row=8, column=0, columnspan=2, sticky="w", pady=(0, 8))
        self.builder_var = tk.StringVar(value="auto")
        self.ui_var = tk.StringVar(value="auto")
        self.qa_var = tk.StringVar(value="auto")
        for row, (label, variable) in enumerate((("Kod", self.builder_var), ("UI / Map", self.ui_var), ("Test / QA", self.qa_var)), start=9):
            ttk.Label(outer, text=label, style="Card.TLabel").grid(row=row, column=0, sticky="w", pady=5)
            ttk.Combobox(outer, textvariable=variable, values=PROVIDERS, state="readonly").grid(row=row, column=1, sticky="ew", pady=5)

        ttk.Button(outer, text="Ayarları kaydet", style="Primary.TButton", command=self.save_settings).grid(row=13, column=0, columnspan=2, sticky="ew", pady=(18, 0))
        outer.columnconfigure(1, weight=1)

    def _build_details(self) -> None:
        actions = ttk.Frame(self.details_tab)
        actions.pack(fill="x", padx=4, pady=(8, 8))
        ttk.Button(actions, text="Provider testi", command=lambda: self.action("probe_providers")).pack(side="left")
        ttk.Button(actions, text="Proje taraması", command=lambda: self.action("scan_project")).pack(side="left", padx=6)
        ttk.Button(actions, text="Release Manager", command=lambda: self.action("release_manager")).pack(side="left")
        ttk.Button(actions, text="AI sekmesi aç", command=self.open_provider).pack(side="left", padx=6)
        ttk.Button(actions, text="Extension sayfası", command=lambda: webbrowser.open("chrome://extensions")).pack(side="right")

        self.details = tk.Text(self.details_tab, wrap="word", bg="#171b21", fg="#cfd5df", insertbackground="white", relief="flat", font=("Consolas", 9), padx=12, pady=10)
        self.details.pack(fill="both", expand=True, padx=4, pady=(0, 4))
        self.details.insert("1.0", "ZeroScript teknik detayları burada görünecek.\n")
        self.details.configure(state="disabled")

    def _load_settings_into_ui(self) -> None:
        label = QUALITY_VALUES.get(self.settings.get("qualityMode", "balanced"), "Dengeli")
        self.mode_var.set(label)
        self.settings_mode_var.set(label)
        self.smart_var.set(bool(self.settings.get("smartRouting", True)))
        self.approval_var.set(str(self.settings.get("approvalMode", "autonomous")))
        self.notify_var.set(bool(self.settings.get("notifications", True)))
        self.context_var.set(bool(self.settings.get("autoContextRecovery", True)))
        self.auto_services_var.set(bool(self.settings.get("autoStartServices", True)))
        self.builder_var.set(str(self.settings.get("preferredBuilder", "auto")))
        self.ui_var.set(str(self.settings.get("preferredUI", "auto")))
        self.qa_var.set(str(self.settings.get("preferredQA", "auto")))

    def log(self, text: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        self.details.configure(state="normal")
        self.details.insert("end", f"[{stamp}] {text}\n")
        self.details.see("end")
        self.details.configure(state="disabled")

    def ensure_dependencies(self) -> bool:
        try:
            subprocess.check_call([sys.executable, "-c", "import websockets"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
            return True
        except Exception:
            self.log("websockets kuruluyor…")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "websockets"], creationflags=CREATE_NO_WINDOW)
                return True
            except Exception as exc:
                messagebox.showerror("ZeroScript", f"websockets kurulamadı:\n{exc}")
                return False

    def start_services(self) -> None:
        def worker() -> None:
            if not self.ensure_dependencies():
                return
            LOG_DIR.mkdir(exist_ok=True)
            self.token = ensure_token()
            try:
                if not port_open(CONTROL_PORT):
                    control_log = open(LOG_DIR / "hub_control.log", "a", encoding="utf-8")
                    self.control_process = subprocess.Popen(
                        [sys.executable, str(ROOT / "control_api.py"), "--token-file", str(TOKEN_FILE)],
                        cwd=ROOT,
                        stdout=control_log,
                        stderr=subprocess.STDOUT,
                        creationflags=CREATE_NO_WINDOW,
                    )
                    self.log("Hub kontrol servisi başlatıldı.")
                if not port_open(BRIDGE_PORT):
                    bridge_log = open(LOG_DIR / "hub_bridge.log", "a", encoding="utf-8")
                    self.bridge_process = subprocess.Popen(
                        [sys.executable, str(ROOT / "bridge.py")],
                        cwd=ROOT,
                        stdout=bridge_log,
                        stderr=subprocess.STDOUT,
                        creationflags=CREATE_NO_WINDOW,
                    )
                    self.log("Roblox MCP bridge başlatıldı.")
                time.sleep(1.2)
                self.send_config_action()
            except Exception as exc:
                self.log(f"Başlatma hatası: {exc}")
        threading.Thread(target=worker, daemon=True).start()

    def stop_services(self) -> None:
        kill_port(BRIDGE_PORT)
        kill_port(CONTROL_PORT)
        self.log("ZeroScript servisleri durduruldu.")

    def restart_services(self) -> None:
        self.stop_services()
        time.sleep(0.8)
        self.start_services()

    def action(self, action: str, payload: dict[str, Any] | None = None, quiet: bool = False) -> dict[str, Any]:
        result = request_json("/action", self.token, "POST", {"action": action, "payload": payload or {}}, timeout=5.0)
        if not quiet:
            self.log(f"{action}: {result.get('error') or 'gönderildi'}")
        return result

    def send_config_action(self) -> None:
        payload = {
            "qualityMode": self.settings.get("qualityMode", "balanced"),
            "smartRouting": bool(self.settings.get("smartRouting", True)),
            "approvalMode": self.settings.get("approvalMode", "autonomous"),
            "notifications": bool(self.settings.get("notifications", True)),
            "autoContextRecovery": bool(self.settings.get("autoContextRecovery", True)),
            "preferredBuilder": self.settings.get("preferredBuilder", "auto"),
            "preferredUI": self.settings.get("preferredUI", "auto"),
            "preferredQA": self.settings.get("preferredQA", "auto"),
        }
        self.action("set_config", payload, quiet=True)

    def save_settings(self) -> None:
        self.settings.update({
            "qualityMode": QUALITY_LABELS.get(self.settings_mode_var.get(), "balanced"),
            "smartRouting": self.smart_var.get(),
            "approvalMode": self.approval_var.get(),
            "notifications": self.notify_var.get(),
            "autoContextRecovery": self.context_var.get(),
            "preferredBuilder": self.builder_var.get(),
            "preferredUI": self.ui_var.get(),
            "preferredQA": self.qa_var.get(),
            "autoStartServices": self.auto_services_var.get(),
        })
        save_json(SETTINGS_FILE, self.settings)
        self.mode_var.set(QUALITY_VALUES.get(self.settings["qualityMode"], "Dengeli"))
        self.send_config_action()
        self.log("Ayarlar kaydedildi ve extension'a gönderildi.")
        messagebox.showinfo("ZeroScript", "Ayarlar kaydedildi.")

    def start_task(self) -> None:
        goal = self.goal.get("1.0", "end").strip()
        if not goal:
            messagebox.showwarning("ZeroScript", "Önce görevi yaz.")
            return
        self.settings["qualityMode"] = QUALITY_LABELS.get(self.mode_var.get(), "balanced")
        save_json(SETTINGS_FILE, self.settings)
        self.start_services()
        self.send_config_action()
        result = self.action("start_task", {"goal": goal})
        if result.get("ok"):
            self.log("Görev sıraya alındı.")
        else:
            messagebox.showerror("ZeroScript", result.get("error", "Görev başlatılamadı."))

    def repair(self) -> None:
        self.start_services()
        result = self.action("repair_connection")
        if not result.get("ok"):
            self.log("Otomatik onarım başlatılamadı; servisler yeniden başlatılıyor.")
            self.restart_services()

    def pair_extension(self) -> None:
        self.start_services()
        time.sleep(0.4)
        result = request_json("/pair/start", self.token, "POST", {"seconds": 120}, timeout=3.0)
        if result.get("ok"):
            self.log("Extension eşleştirme penceresi 2 dakika açık.")
            messagebox.showinfo("ZeroScript", "Şimdi Chrome'da ZeroScript extension ikonuna bir kez tıkla. Otomatik eşleşecek.")
        else:
            messagebox.showerror("ZeroScript", result.get("error", "Eşleştirme başlatılamadı."))

    def install_studio_panel(self) -> None:
        try:
            result = subprocess.run([sys.executable, str(ROOT / "install_studio_panel.py")], cwd=ROOT, capture_output=True, text=True, creationflags=CREATE_NO_WINDOW)
            self.log((result.stdout or result.stderr or "Studio panel installer completed").strip())
            if result.returncode == 0:
                messagebox.showinfo("ZeroScript", "Studio paneli kuruldu. Roblox Studio'yu yeniden aç ve HTTP Requests'i etkinleştir.")
            else:
                messagebox.showerror("ZeroScript", result.stderr or "Studio paneli kurulamadı.")
        except Exception as exc:
            messagebox.showerror("ZeroScript", str(exc))

    def open_provider(self) -> None:
        provider = self.builder_var.get()
        if provider == "auto":
            provider = "qwen"
        self.action("open_provider", {"provider": provider})

    def refresh_status(self) -> None:
        if self._closing:
            return
        control = request_json("/health", timeout=0.8)
        status = request_json("/status", self.token, timeout=0.8) if control.get("ok") else {}
        self.last_status = status.get("status", {}) if status.get("ok") else {}

        bridge_ok = port_open(BRIDGE_PORT, 0.08)
        control_ok = bool(control.get("ok"))
        studio_running = tasklist_contains("RobloxStudioBeta.exe")
        extension_connected = bool(self.last_status.get("extensionConnected"))
        bridge_state = self.last_status.get("bridge") or {}
        studio_connected = bool(bridge_state.get("studioConnected"))
        providers = self.last_status.get("providers") or []
        ready_count = sum(1 for provider in providers if provider.get("ready"))

        self.status_hub.configure(text="● Hazır" if control_ok else "○ Kapalı")
        self.status_bridge.configure(text="● Bağlı" if bridge_ok else "○ Başlatılmadı")
        if studio_connected:
            studio_text = "● Bağlı"
        elif studio_running:
            studio_text = "◐ Açık, MCP bekleniyor"
        else:
            studio_text = "○ Kapalı"
        self.status_studio.configure(text=studio_text)
        self.status_models.configure(text=f"● {ready_count} hazır" if ready_count else ("◐ Extension bağlı" if extension_connected else "○ Extension bekleniyor"))

        if control_ok and bridge_ok and studio_connected:
            self.master_status.configure(text="Her şey hazır")
        elif not control_ok or not bridge_ok:
            self.master_status.configure(text="Servisler hazırlanıyor")
        elif not studio_connected:
            self.master_status.configure(text="Studio MCP bekleniyor")

        task = self.last_status.get("task") or {}
        if task:
            self.task_line.configure(text=f"{task.get('status', 'running')} · {task.get('phase', '-')} · {task.get('provider') or 'model seçiliyor'}")
        else:
            self.task_line.configure(text="Aktif görev yok.")

        if control_ok:
            detail = json.dumps(self.last_status, ensure_ascii=False, indent=2)
            self.details.configure(state="normal")
            current = self.details.get("1.0", "end")
            marker = "\n--- CANLI DURUM ---\n"
            base = current.split(marker)[0]
            self.details.delete("1.0", "end")
            self.details.insert("1.0", base.rstrip() + marker + detail + "\n")
            self.details.configure(state="disabled")

        self.after(1500, self.refresh_status)

    def on_close(self) -> None:
        self._closing = True
        # Services intentionally remain running so active tasks are not killed.
        self.destroy()


if __name__ == "__main__":
    app = ZeroScriptHub()
    app.mainloop()

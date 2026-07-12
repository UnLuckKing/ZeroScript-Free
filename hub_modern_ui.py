#!/usr/bin/env python3
"""Modern visual theme for ZeroScript Hub 1.30.

The theme stays dependency-free and uses native Tk/ttk so the Hub still starts on
a clean Windows Python installation.
"""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Any


PALETTE = {
    "bg": "#0B0D12",
    "surface": "#121620",
    "surface2": "#191E2B",
    "surface3": "#22293A",
    "border": "#2B3448",
    "text": "#F4F7FB",
    "muted": "#9AA5B6",
    "accent": "#7C5CFC",
    "accent_hover": "#8B70FF",
    "accent_soft": "#2A234A",
    "success": "#2DD4A3",
    "warning": "#F6B84A",
    "danger": "#F06276",
    "selection": "#3A2E67",
}


def install(hub: Any) -> None:
    from hub_learning_extras import install as install_learning_extras

    install_learning_extras(hub)
    previous_style = hub.ZeroScriptHub._build_style
    previous_ui = hub.ZeroScriptHub._build_ui
    previous_status_card = hub.ZeroScriptHub._status_card

    def build_style(self: Any) -> None:
        previous_style(self)
        self.geometry("1220x820")
        self.minsize(1020, 700)
        self.configure(bg=PALETTE["bg"])
        try:
            self.tk.call("tk", "scaling", 1.08)
        except tk.TclError:
            pass

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure("TFrame", background=PALETTE["bg"])
        style.configure("Card.TFrame", background=PALETTE["surface"])
        style.configure("Hero.TFrame", background=PALETTE["surface2"], relief="flat")
        style.configure("Inset.TFrame", background=PALETTE["surface2"])

        style.configure("TLabel", background=PALETTE["bg"], foreground=PALETTE["text"], font=("Segoe UI", 10))
        style.configure("Card.TLabel", background=PALETTE["surface"], foreground=PALETTE["text"], font=("Segoe UI", 10))
        style.configure("Muted.Card.TLabel", background=PALETTE["surface"], foreground=PALETTE["muted"], font=("Segoe UI", 9))
        style.configure("Title.TLabel", background=PALETTE["bg"], foreground=PALETTE["text"], font=("Segoe UI Variable Display Semibold", 24))
        style.configure("Sub.TLabel", background=PALETTE["bg"], foreground=PALETTE["muted"], font=("Segoe UI", 10))
        style.configure("Status.TLabel", background=PALETTE["surface"], foreground=PALETTE["text"], font=("Segoe UI Semibold", 11))
        style.configure("StatusValue.TLabel", background=PALETTE["surface"], foreground=PALETTE["success"], font=("Segoe UI Semibold", 12))
        style.configure("Hero.Title.TLabel", background=PALETTE["surface2"], foreground=PALETTE["text"], font=("Segoe UI Variable Display Semibold", 15))
        style.configure("Hero.Sub.TLabel", background=PALETTE["surface2"], foreground=PALETTE["muted"], font=("Segoe UI", 10))
        style.configure("Pill.TLabel", background=PALETTE["accent_soft"], foreground="#C9BDFF", font=("Segoe UI Semibold", 9), padding=(10, 5))

        style.configure("TButton", background=PALETTE["surface3"], foreground=PALETTE["text"], borderwidth=0, focusthickness=0, font=("Segoe UI Semibold", 9), padding=(12, 8))
        style.map("TButton", background=[("pressed", PALETTE["selection"]), ("active", "#2E374B"), ("disabled", PALETTE["surface2"])], foreground=[("disabled", "#616B7C")])
        style.configure("Primary.TButton", background=PALETTE["accent"], foreground="white", borderwidth=0, focusthickness=0, font=("Segoe UI Semibold", 10), padding=(15, 10))
        style.map("Primary.TButton", background=[("pressed", "#6849E8"), ("active", PALETTE["accent_hover"]), ("disabled", "#403762")])
        style.configure("Danger.TButton", background="#3A202A", foreground="#FF9BAA", borderwidth=0, font=("Segoe UI Semibold", 9), padding=(12, 8))
        style.map("Danger.TButton", background=[("active", "#522A37"), ("pressed", "#662E3E")])
        style.configure("Success.TButton", background="#163A32", foreground="#75E9C7", borderwidth=0, font=("Segoe UI Semibold", 9), padding=(12, 8))
        style.map("Success.TButton", background=[("active", "#1D4B40")])

        style.configure("TNotebook", background=PALETTE["bg"], borderwidth=0, tabmargins=(0, 0, 0, 8))
        style.configure("TNotebook.Tab", background=PALETTE["surface"], foreground=PALETTE["muted"], borderwidth=0, font=("Segoe UI Semibold", 9), padding=(14, 9))
        style.map("TNotebook.Tab", background=[("selected", PALETTE["accent_soft"]), ("active", PALETTE["surface2"])], foreground=[("selected", "#D9D2FF"), ("active", PALETTE["text"])])

        style.configure("TCombobox", fieldbackground=PALETTE["surface2"], background=PALETTE["surface2"], foreground=PALETTE["text"], arrowcolor=PALETTE["muted"], bordercolor=PALETTE["border"], lightcolor=PALETTE["border"], darkcolor=PALETTE["border"], padding=7)
        style.map("TCombobox", fieldbackground=[("readonly", PALETTE["surface2"])], selectbackground=[("readonly", PALETTE["surface2"])], selectforeground=[("readonly", PALETTE["text"])])
        style.configure("Modern.TEntry", fieldbackground=PALETTE["surface2"], foreground=PALETTE["text"], insertcolor=PALETTE["text"], bordercolor=PALETTE["border"], lightcolor=PALETTE["border"], darkcolor=PALETTE["border"], padding=9)
        style.configure("TEntry", fieldbackground=PALETTE["surface2"], foreground=PALETTE["text"], insertcolor=PALETTE["text"], bordercolor=PALETTE["border"], padding=7)
        style.configure("TCheckbutton", background=PALETTE["surface"], foreground=PALETTE["text"], font=("Segoe UI", 9), indicatorcolor=PALETTE["surface3"], padding=(2, 4))
        style.map("TCheckbutton", background=[("active", PALETTE["surface"])], indicatorcolor=[("selected", PALETTE["accent"]), ("active", PALETTE["surface3"])])

        style.configure("Treeview", background=PALETTE["surface2"], fieldbackground=PALETTE["surface2"], foreground=PALETTE["text"], borderwidth=0, rowheight=30, font=("Segoe UI", 9))
        style.map("Treeview", background=[("selected", PALETTE["selection"])], foreground=[("selected", "white")])
        style.configure("Treeview.Heading", background=PALETTE["surface3"], foreground=PALETTE["muted"], borderwidth=0, font=("Segoe UI Semibold", 9), padding=(7, 8))
        style.map("Treeview.Heading", background=[("active", "#2D3548")])

        style.configure("TProgressbar", background=PALETTE["accent"], troughcolor=PALETTE["surface2"], borderwidth=0, thickness=9)
        style.configure("TLabelframe", background=PALETTE["surface"], foreground=PALETTE["text"], bordercolor=PALETTE["border"], relief="solid")
        style.configure("TLabelframe.Label", background=PALETTE["surface"], foreground=PALETTE["muted"], font=("Segoe UI Semibold", 9))
        style.configure("TSeparator", background=PALETTE["border"])
        style.configure("Vertical.TScrollbar", background=PALETTE["surface3"], troughcolor=PALETTE["surface"], borderwidth=0, arrowcolor=PALETTE["muted"])
        style.configure("Horizontal.TScrollbar", background=PALETTE["surface3"], troughcolor=PALETTE["surface"], borderwidth=0, arrowcolor=PALETTE["muted"])

    def status_card(self: Any, parent: tk.Misc, title: str) -> tuple[ttk.Frame, ttk.Label]:
        frame, value = previous_status_card(self, parent, title)
        value.configure(style="StatusValue.TLabel")
        return frame, value

    def style_text_widgets(root: Any) -> None:
        for child in root.winfo_children():
            if isinstance(child, tk.Text):
                child.configure(
                    bg=PALETTE["surface2"], fg=PALETTE["text"], insertbackground=PALETTE["text"],
                    selectbackground=PALETTE["selection"], selectforeground="white", relief="flat",
                    borderwidth=0, highlightthickness=1, highlightbackground=PALETTE["border"],
                    highlightcolor=PALETTE["accent"], spacing1=1, spacing3=1,
                )
            style_text_widgets(child)

    def build_ui(self: Any) -> None:
        previous_ui(self)
        style_text_widgets(self)
        footer = ttk.Frame(self, style="Hero.TFrame", padding=(18, 8))
        footer.pack(fill="x", side="bottom", before=self.notebook)
        ttk.Label(footer, text="ZeroScript • Yerel karar motoru + bağlı AI takımı", style="Hero.Sub.TLabel").pack(side="left")
        ttk.Label(footer, text="Memory Vault + Superior Engine aktif", style="Pill.TLabel").pack(side="right")

    hub.ZeroScriptHub._build_style = build_style
    hub.ZeroScriptHub._build_ui = build_ui
    hub.ZeroScriptHub._status_card = status_card

#!/usr/bin/env python3
"""Apply the OneMind Connector brand without breaking ZeroScript compatibility."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_URL = "https://github.com/UnLuckKing/ZeroScript-Free"


def read(path: str) -> str:
    return (ROOT / path).read_text("utf-8")


def write(path: str, text:
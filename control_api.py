#!/usr/bin/env python3
"""Authenticated loopback side-channel for the optional ZeroScript Studio panel.

The browser extension publishes its current task state here. The Roblox Studio
plugin reads that state and can enqueue a small, explicit set of control actions.
No external network interface is opened; the server binds to 127.0.0.1 only.
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import threading
import time
import urllib.parse
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

VERSION = "1.24.0"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 17614
ALLOWED_ACTIONS = {
    "stop",
    "retry",
    "cancel",
    "rollback",
    "probe_providers",
    "scan_project",
    "release_manager",
}


def load_or_create_token(path: Path) -> str:
    try:
        token = path.read_text("utf-8").strip()
        if len(token) >= 24:
            return token
    except FileNotFoundError:
        pass
    token = secrets.token_urlsafe(32)
    path.write_text(token + "\n", "utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return token


class ControlState:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.status: dict[str, Any] = {
            "version": VERSION,
            "online": True,
            "extensionConnected": False,
            "updatedAt": int(time.time() * 1000),
            "runtime": {"state": "idle", "detail": "Waiting for browser extension"},
        }
        self.actions: deque[dict[str, Any]] = deque(maxlen=100)
        self.studio_events: deque[dict[str, Any]] = deque(maxlen=200)

    def publish(self, payload: dict[str, Any]) -> None:
        with self.lock:
            self.status = {
                **payload,
                "version": VERSION,
                "online": True,
                "extensionConnected": True,
                "updatedAt": int(time.time() * 1000),
            }

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return json.loads(json.dumps(self.status))

    def add_action(self, action: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        item = {
            "id": f"action-{int(time.time() * 1000)}-{secrets.token_hex(3)}",
            "action": action,
            "payload": payload or {},
            "createdAt": int(time.time() * 1000),
        }
        with self.lock:
            self.actions.append(item)
        return item

    def take_actions(self) -> list[dict[str, Any]]:
        with self.lock:
            items = list(self.actions)
            self.actions.clear()
            return items

    def add_studio_event(self, payload: dict[str, Any]) -> None:
        event = {
            **payload,
            "createdAt": int(time.time() * 1000),
        }
        with self.lock:
            self.studio_events.append(event)

    def take_studio_events(self) -> list[dict[str, Any]]:
        with self.lock:
            items = list(self.studio_events)
            self.studio_events.clear()
            return items


class ControlHandler(BaseHTTPRequestHandler):
    server_version = f"ZeroScriptControl/{VERSION}"

    @property
    def control_server(self) -> "ControlServer":
        return self.server  # type: ignore[return-value]

    def log_message(self, fmt: str, *args: object) -> None:
        # Keep the primary bridge terminal readable. Only errors are printed.
        if args and str(args[0]).startswith(("4", "5")):
            super().log_message(fmt, *args)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-ZeroScript-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")

    def _json(self, status: int, payload: Any) -> None:
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _path(self) -> tuple[str, dict[str, list[str]]]:
        parsed = urllib.parse.urlparse(self.path)
        return parsed.path, urllib.parse.parse_qs(parsed.query)

    def _token(self, query: dict[str, list[str]]) -> str:
        header = self.headers.get("X-ZeroScript-Token", "").strip()
        if header:
            return header
        values = query.get("token") or []
        return values[0].strip() if values else ""

    def _authorized(self, query: dict[str, list[str]]) -> bool:
        return secrets.compare_digest(self._token(query), self.control_server.token)

    def _body(self) -> dict[str, Any]:
        try:
            length = min(2_000_000, max(0, int(self.headers.get("Content-Length", "0"))))
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8")) if raw else {}
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path, query = self._path()
        if path == "/health":
            self._json(200, {"ok": True, "version": VERSION, "host": self.control_server.server_address[0], "port": self.control_server.server_address[1]})
            return
        if not self._authorized(query):
            self._json(401, {"ok": False, "error": "Invalid ZeroScript control token"})
            return
        if path == "/status":
            self._json(200, {"ok": True, "status": self.control_server.state.snapshot()})
            return
        if path == "/actions":
            self._json(200, {"ok": True, "actions": self.control_server.state.take_actions()})
            return
        if path == "/studio-events":
            self._json(200, {"ok": True, "events": self.control_server.state.take_studio_events()})
            return
        self._json(404, {"ok": False, "error": "Unknown endpoint"})

    def do_POST(self) -> None:  # noqa: N802
        path, query = self._path()
        if not self._authorized(query):
            self._json(401, {"ok": False, "error": "Invalid ZeroScript control token"})
            return
        body = self._body()
        if path == "/status":
            self.control_server.state.publish(body)
            self._json(200, {"ok": True})
            return
        if path == "/action":
            action = str(body.get("action", "")).strip().lower()
            if action not in ALLOWED_ACTIONS:
                self._json(400, {"ok": False, "error": f"Unsupported action '{action}'"})
                return
            item = self.control_server.state.add_action(action, body.get("payload") if isinstance(body.get("payload"), dict) else {})
            self._json(202, {"ok": True, "queued": item})
            return
        if path == "/studio-event":
            self.control_server.state.add_studio_event(body)
            self._json(202, {"ok": True})
            return
        self._json(404, {"ok": False, "error": "Unknown endpoint"})


class ControlServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], token: str) -> None:
        super().__init__(address, ControlHandler)
        self.token = token
        self.state = ControlState()


def main() -> int:
    parser = argparse.ArgumentParser(description="ZeroScript local Studio panel control API")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--token-file", default=str(Path(__file__).resolve().with_name("control_token.txt")))
    args = parser.parse_args()

    if args.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("For safety, the ZeroScript control API only binds to localhost.")

    token_path = Path(args.token_file).expanduser().resolve()
    token = load_or_create_token(token_path)
    server = ControlServer((DEFAULT_HOST, args.port), token)
    print(f"[control] ZeroScript Studio panel API v{VERSION} on http://{DEFAULT_HOST}:{args.port}", flush=True)
    print(f"[control] Token file: {token_path}", flush=True)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

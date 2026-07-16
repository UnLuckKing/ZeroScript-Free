#!/usr/bin/env python3
"""Selected reliability fixes from upstream ZeroScript 1.4.1-1.4.3.

The product keeps its custom bridge and desktop workflow. This module patches the
shared bridge runtime with the useful low-level fixes only:
- TCP + TCPv6 Studio port ownership detection
- non-blocking handling for hidden-launcher port conflicts
- leftover StudioMCP PID reclaim while Studio is already open
- proven foreign WebSocket host/squatter recovery
- clear missing-command diagnostics for optional MCP servers
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from typing import Any

STUDIO_MCP_PORT = 13469
_FOREIGN_HOST_MARKERS = (
    "failed to parse message from ws host",
    "missing field `type`",
)
_KNOWN_SQUATTERS = (
    "ropilot-infra-helper.exe",
    "ropilot-infra.exe",
    "ropilot.exe",
)


def _run(args: list[str], timeout: int = 8) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def _listening_pid(text: str, port: int) -> int | None:
    needle = f":{port} "
    for line in (text or "").splitlines():
        if "LISTENING" not in line.upper() or needle not in line:
            continue
        parts = line.split()
        if parts and parts[-1].isdigit():
            return int(parts[-1])
    return None


def _port_owner(port: int) -> tuple[int, str, str] | None:
    if sys.platform != "win32":
        return None
    output = ""
    for protocol in ("TCP", "TCPv6"):
        try:
            output += _run(["netstat", "-ano", "-p", protocol]).stdout
        except Exception:
            pass
    pid = _listening_pid(output, port)
    if pid is None:
        return None

    name, path = "?", ""
    try:
        lines = _run([
            "powershell", "-NoProfile", "-Command",
            f"$p=Get-Process -Id {pid} -ErrorAction SilentlyContinue; if($p){{$p.Name; $p.Path}}",
        ]).stdout.splitlines()
        lines = [line.strip() for line in lines if line.strip()]
        if lines:
            name = lines[0]
            path = lines[1] if len(lines) > 1 else ""
    except Exception:
        pass
    return pid, name, path


def _studio_running() -> bool | None:
    if sys.platform != "win32":
        return None
    try:
        return "RobloxStudioBeta.exe" in _run(
            ["tasklist", "/FI", "IMAGENAME eq RobloxStudioBeta.exe"]
        ).stdout
    except Exception:
        return None


def _descendant_pids(root_pid: int) -> set[int] | None:
    if sys.platform != "win32":
        return None
    try:
        output = _run([
            "powershell", "-NoProfile", "-Command",
            "Get-CimInstance Win32_Process | ForEach-Object { \"$($_.ProcessId) $($_.ParentProcessId)\" }",
        ], timeout=10).stdout
    except Exception:
        return None

    children: dict[int, list[int]] = {}
    for line in output.splitlines():
        parts = line.split()
        if len(parts) == 2 and all(part.isdigit() for part in parts):
            children.setdefault(int(parts[1]), []).append(int(parts[0]))
    if not children:
        return None

    result = {int(root_pid)}
    stack = [int(root_pid)]
    while stack:
        parent = stack.pop()
        for child in children.get(parent, []):
            if child not in result:
                result.add(child)
                stack.append(child)
    return result


def _kill_pid(pid: int) -> bool:
    if sys.platform != "win32":
        return False
    try:
        result = _run(["taskkill", "/F", "/T", "/PID", str(pid)])
        return result.returncode == 0
    except Exception:
        return False


def _action_hint(bridge: Any, reason: str) -> None:
    bridge.log(f"Studio MCP recovery completed ({reason}).", "cy")
    bridge.log("ACTION: In Roblox Studio open Assistant Settings > MCP Servers,", "yl")
    bridge.log("turn OFF then ON 'Enable Studio as MCP server', then wait about 10 seconds.", "yl")


def _reclaim_leftover_studiomcp(bridge: Any, client: Any) -> bool:
    owner = _port_owner(STUDIO_MCP_PORT)
    if not owner:
        return False
    pid, name, _path = owner
    if "studiomcp" not in (name or "").lower():
        return False

    if getattr(client, "proc", None) is not None and client.is_alive():
        tree = _descendant_pids(client.proc.pid)
        if tree is None or pid in tree:
            return False

    bridge.log(
        f"port {STUDIO_MCP_PORT} is held by leftover StudioMCP.exe pid {pid} "
        "outside this bridge process tree; reclaiming it.",
        "yl",
    )
    if not _kill_pid(pid):
        bridge.log(f"could not kill leftover StudioMCP.exe pid {pid}.", "rd")
        return False
    return True


def _kill_proven_squatter(bridge: Any) -> tuple[bool, str | None]:
    owner = _port_owner(STUDIO_MCP_PORT)
    if owner:
        pid, name, path = owner
        low_path = (path or "").lower()
        low_name = (name or "").lower()
        if "roblox" in low_path or "studiomcp" in low_name:
            return False, None
        bridge.log(
            f"Studio MCP port {STUDIO_MCP_PORT} is hijacked by {name} pid {pid} ({path}).",
            "yl",
        )
        if _kill_pid(pid):
            bridge.log(f"killed {name} so Roblox Studio can reclaim its MCP port.", "cy")
            return True, name
        return False, name

    killed_name = None
    for image in _KNOWN_SQUATTERS:
        try:
            result = _run(["taskkill", "/F", "/T", "/IM", image])
        except Exception:
            continue
        if result.returncode == 0:
            killed_name = image
            bridge.log(f"killed known Studio MCP port squatter {image}.", "cy")
    return (killed_name is not None), killed_name


def install(bridge: Any) -> None:
    if getattr(bridge, "_ZS_UPSTREAM_RELEASE_FIXES", False):
        return
    bridge._ZS_UPSTREAM_RELEASE_FIXES = True
    bridge._port_owner = _port_owner

    original_check_studio_port = bridge.check_studio_port

    def check_studio_port_nonblocking() -> bool:
        owner = _port_owner(STUDIO_MCP_PORT)
        if not owner:
            return False
        pid, name, path = owner
        if "roblox" in (path or "").lower() or "studiomcp" in (name or "").lower():
            return False

        bridge.log(
            f"Studio MCP port {STUDIO_MCP_PORT} is occupied by non-Roblox process "
            f"{name} pid {pid} ({path or name}).",
            "yl",
        )
        # ZeroScript One normally hides the bridge console. Never call input() here:
        # an invisible yes/no prompt would freeze startup forever.
        if any(token in f"{name} {path}".lower() for token in ("ropilot",)):
            killed, killed_name = _kill_proven_squatter(bridge)
            if killed:
                _action_hint(bridge, f"removed {killed_name or name}")
                return True
        bridge.log(
            f"Close that program or end pid {pid}; it is blocking Roblox Studio. "
            "ZeroScript will keep running without an invisible prompt.",
            "rd",
        )
        return False

    bridge.check_studio_port = check_studio_port_nonblocking

    client_class = bridge.MCPClient
    original_init = client_class.__init__
    original_start = client_class.start
    original_refresh_tools = client_class.refresh_tools

    def client_init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.start_error = None
        self.saw_foreign_ws_host = False
        self._zs_recovering = False
        self._zs_pending_recovery = None
        self._zs_last_recovery = 0.0

    def stderr_drain(self: Any, proc: Any) -> None:
        try:
            for line in iter(proc.stderr.readline, ""):
                line = line.rstrip()
                if not line:
                    continue
                self.stderr_tail.append(line)
                if len(self.stderr_tail) > 8:
                    self.stderr_tail.pop(0)
                low = line.lower()
                if any(marker in low for marker in _FOREIGN_HOST_MARKERS):
                    self.saw_foreign_ws_host = True
                bridge.log(f"[{self.id}] stderr: {line}", "yl", terminal=False)
        except Exception:
            pass

    def recover_once(self: Any, reason: str) -> None:
        if self._zs_recovering or time.time() - float(self._zs_last_recovery or 0) < 60:
            return
        self._zs_recovering = True
        self._zs_last_recovery = time.time()
        try:
            self.stop()
            time.sleep(0.6)
            original_start(self)
        except Exception as exc:
            bridge.log(f"[{self.id}] recovery restart failed: {exc}", "rd")
        finally:
            self._zs_recovering = False
            self._zs_pending_recovery = None
        _action_hint(bridge, reason)

    def client_start(self: Any) -> None:
        try:
            result = original_start(self)
            self.start_error = None
        except FileNotFoundError:
            self.start_error = (
                f"command not found: '{self.command}' - install it or correct bridge/config.json "
                f"for MCP server '{self.id}'."
            )
            self.stderr_tail.append(self.start_error)
            self.stderr_tail[:] = self.stderr_tail[-8:]
            bridge.log(f"[{self.id}] {self.start_error}", "rd")
            raise
        except OSError as exc:
            self.start_error = f"could not launch '{self.command}': {exc}"
            self.stderr_tail.append(self.start_error)
            self.stderr_tail[:] = self.stderr_tail[-8:]
            bridge.log(f"[{self.id}] {self.start_error}", "rd")
            raise

        pending = self._zs_pending_recovery
        if pending and not self._zs_recovering:
            recover_once(self, pending)
        return result

    def refresh_tools(self: Any, timeout: int = 20) -> Any:
        tools = original_refresh_tools(self, timeout)
        if (
            self.id != "roblox"
            or tools
            or not self.is_alive()
            or self._zs_recovering
            or time.time() - float(self._zs_last_recovery or 0) < 60
        ):
            return tools

        reason = None
        if self.saw_foreign_ws_host:
            killed, name = _kill_proven_squatter(bridge)
            if killed:
                reason = f"removed port squatter {name or 'unknown'}"
                self.saw_foreign_ws_host = False
        elif _studio_running() is True and _reclaim_leftover_studiomcp(bridge, self):
            reason = "removed leftover StudioMCP process"

        if reason:
            if self.start_lock.locked():
                self._zs_pending_recovery = reason
            else:
                recover_once(self, reason)
            return self.tools_cache
        return tools

    client_class.__init__ = client_init
    client_class._stderr_drain = stderr_drain
    client_class.start = client_start
    client_class.refresh_tools = refresh_tools

    bridge.log("Upstream Studio recovery fixes loaded (1.4.1-1.4.3 selected sync).", "cy", terminal=False)

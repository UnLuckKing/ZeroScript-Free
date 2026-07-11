// SPDX-License-Identifier: GPL-3.0-or-later
const KOFI_URL = "https://ko-fi.com/sebattfg";
const PROVIDERS = ["deepseek", "gemini", "kimi", "glm", "qwen", "arena"];

for (const id of ["writer", "reviewer", "qa"]) {
  const el = document.getElementById(id);
  for (const p of PROVIDERS) {
    const o = document.createElement("option");
    o.value = p;
    o.textContent = `${id === "writer" ? "Builder" : id === "reviewer" ? "Reviewer" : "QA / Playtest"}: ${p[0].toUpperCase() + p.slice(1)}`;
    el.appendChild(o);
  }
}

function renderTeam(team) {
  team = team || { config: {}, agents: [] };
  document.getElementById("teamEnabled").checked = !!team.config.enabled;
  document.getElementById("writer").value = team.config.writer || "deepseek";
  document.getElementById("reviewer").value = team.config.reviewer || "gemini";
  document.getElementById("qa").value = team.config.qa || "qwen";
  const online = (team.agents || []).map((a) => a.provider).filter((v, i, a) => a.indexOf(v) === i);
  const task = team.task;
  document.getElementById("teamState").textContent = team.config.enabled
    ? (task ? `${task.status.toUpperCase()} · ${task.phase} · ${task.provider || "unassigned"}${task.error ? `\n${task.error}` : ""}` : `${online.length} model tab${online.length === 1 ? "" : "s"} online${team.writer ? ` · ${team.writer.provider} writing` : " · Studio unlocked"}`)
    : "Single-model mode";
}

function saveTeam() {
  chrome.runtime.sendMessage({ type: "team_config", config: {
    enabled: document.getElementById("teamEnabled").checked,
    writer: document.getElementById("writer").value,
    reviewer: document.getElementById("reviewer").value,
    qa: document.getElementById("qa").value,
  }}, (r) => r && renderTeam(r.team));
}
["teamEnabled", "writer", "reviewer", "qa"].forEach((id) => document.getElementById(id).addEventListener("change", saveTeam));

document.getElementById("startTask").addEventListener("click", () => {
  const goal = document.getElementById("teamGoal").value.trim();
  if (!goal) return;
  document.getElementById("teamEnabled").checked = true;
  saveTeam();
  setTimeout(() => chrome.runtime.sendMessage({ type: "team_task_start", goal }, (r) => r && renderTeam(r.team)), 100);
});
document.getElementById("retryTask").addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_task_retry" }, (r) => r && renderTeam(r.team)));
document.getElementById("cancelTask").addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_task_cancel" }, (r) => r && renderTeam(r.team)));

function render(s) {
  const dot = document.getElementById("dot");
  const state = document.getElementById("state");
  const tools = document.getElementById("tools");
  const servers = document.getElementById("servers");
  const list = s.servers || [];
  const up = list.filter((x) => x.alive).length;
  const mcpOk = s.connected && (s.mcpAlive || up > 0 || s.tools > 0);
  const studioOff = mcpOk && s.studio === false; // MCP up but no Studio attached
  const ok = mcpOk && !studioOff;
  dot.className = "dot " + (s.connected ? (ok ? "on" : "warn") : "");
  state.textContent = s.connected
    ? (ok ? "Connected · Roblox Studio ready"
        : studioOff ? "Studio not connected · enable the MCP server in Studio"
        : "Bridge OK · open Roblox Studio")
    : "Bridge offline";
  tools.textContent = s.connected ? `${s.tools || 0} tools available` : "Run bridge.py";
  servers.textContent = s.connected
    ? list.map((x) => `${x.alive ? "●" : "○"} ${x.id} (${x.alive ? x.tools + " tools" : "down"})`).join("\n")
    : "";
  renderTeam(s.team);
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, (s) => s && render(s));
}

document.getElementById("reconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "reconnect" }, () => setTimeout(refresh, 600));
});
document.getElementById("restart").addEventListener("click", (e) => {
  e.target.textContent = "Restarting…";
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    e.target.textContent = "⟳ Restart Roblox server";
    setTimeout(refresh, 600);
  });
});
document.getElementById("kofi").addEventListener("click", () => {
  chrome.tabs.create({ url: KOFI_URL });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
  if (msg && msg.type === "zs-team-status") renderTeam(msg.team);
});
refresh();
setInterval(refresh, 2000);

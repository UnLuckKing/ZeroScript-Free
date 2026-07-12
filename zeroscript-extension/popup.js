// SPDX-License-Identifier: GPL-3.0-or-later
const KOFI_URL = "https://ko-fi.com/sebattfg";
const PROVIDERS = ["deepseek", "gemini", "kimi", "glm", "qwen", "arena"];
let lastTeam = null;
const HANDOFF_URLS = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  copilot: "https://copilot.microsoft.com/",
  mistral: "https://chat.mistral.ai/chat",
  perplexity: "https://www.perplexity.ai/",
  poe: "https://poe.com/",
};

for (const id of ["writer", "mapDesigner", "uiDesigner", "reviewer", "qa"]) {
  const el = document.getElementById(id);
  for (const p of PROVIDERS) {
    const o = document.createElement("option");
    o.value = p;
    const role = id === "writer" ? "System Builder" : id === "mapDesigner" ? "Map Designer" : id === "uiDesigner" ? "UI Designer" : id === "reviewer" ? "Reviewer" : "QA / Playtest";
    o.textContent = `${role}: ${p[0].toUpperCase() + p.slice(1)}`;
    el.appendChild(o);
  }
}

function renderTeam(team) {
  team = team || { config: {}, agents: [] };
  lastTeam = team;
  document.getElementById("teamEnabled").checked = !!team.config.enabled;
  document.getElementById("writer").value = team.config.writer || "deepseek";
  document.getElementById("mapDesigner").value = team.config.mapDesigner || "gemini";
  document.getElementById("uiDesigner").value = team.config.uiDesigner || "gemini";
  document.getElementById("reviewer").value = team.config.reviewer || "gemini";
  document.getElementById("qa").value = team.config.qa || "qwen";
  document.getElementById("approvalMode").value = team.config.approvalMode || "autonomous";
  const online = (team.agents || []).map((a) => a.provider).filter((v, i, a) => a.indexOf(v) === i);
  const ready = (team.agents || []).filter((a) => a.ready).map((a) => a.provider).filter((v, i, a) => a.indexOf(v) === i);
  const unhealthy = Object.entries(team.providerHealth || {}).map(([p, h]) => `${p}: ${h.status}`).join(", ");
  const task = team.task;
  document.getElementById("teamState").textContent = team.config.enabled
    ? (task ? `${task.status.toUpperCase()} · ${task.phase} · ${task.provider || "unassigned"}${task.error ? `\n${task.error}` : ""}\nModels: ${ready.length} ready / ${online.length} open` : `${ready.length} ready / ${online.length} open model tabs${team.writer ? ` · ${team.writer.provider} writing` : " · Studio unlocked"}`)
    : "Single-model mode";
  if (unhealthy) document.getElementById("teamState").textContent += `\nUnavailable: ${unhealthy}`;
  if (team.checkpoint && team.checkpoint.latest) document.getElementById("teamState").textContent += `\nCheckpoint: ${team.checkpoint.status} · ${team.checkpoint.latest}`;
  if (task && task.qaEvidence) document.getElementById("teamState").textContent += `\nQA evidence: ${task.qaEvidence.passed ? "verified" : "retry required"}${task.qaEvidence.consoleChecked ? ` · Output ${task.qaEvidence.consoleClean ? "clean" : "has errors"}` : ""}`;
  const audit = team.audit || {};
  const auditBox = document.getElementById("auditReport");
  if (audit.status === "scanning") auditBox.textContent = "Project scan running…";
  else if (audit.report) {
    let summary = audit.report;
    try {
      const raw = summary.replace(/^PREFLIGHT_OK:/, "");
      const parsed = JSON.parse(raw);
      const counts = parsed.counts || {};
      const warnings = parsed.warnings || [];
      summary = `Last scan: ${counts.scripts || 0} scripts · ${counts.remotes || 0} remotes · ${counts.guis || 0} GUIs · ${warnings.length} warnings`;
      if (warnings.length) summary += `\n${warnings.slice(0, 5).map((w) => `• ${w.kind}: ${w.path}`).join("\n")}`;
    } catch {}
    auditBox.textContent = summary.slice(0, 1800);
  } else auditBox.textContent = "Project has not been scanned yet.";
  const history = team.history || [];
  document.getElementById("teamHistory").textContent = history.length
    ? `Recent: ${history.slice(-3).reverse().map((h) => `${h.status === "done" ? "✓" : "!"} ${h.goal.slice(0, 34)}${h.rounds ? ` (${h.rounds} fixes)` : ""}`).join("\n")}`
    : "";
  const approvals = team.approvals || [];
  const box = document.getElementById("approvalQueue");
  box.innerHTML = approvals.length ? approvals.map((a) => `<div class="zs-approval"><b>${esc(a.name)}</b><br><small>${esc(JSON.stringify(a.arguments).slice(0, 140))}</small><div class="task-actions"><button class="ghost" data-approval-apply="${esc(a.id)}">Apply</button><button class="ghost" data-approval-reject="${esc(a.id)}">Reject</button></div></div>`).join("") : "";
  box.querySelectorAll("[data-approval-apply]").forEach((b) => b.addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_approval_apply", id: b.dataset.approvalApply }, (r) => r && r.team && renderTeam(r.team))));
  box.querySelectorAll("[data-approval-reject]").forEach((b) => b.addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_approval_reject", id: b.dataset.approvalReject }, (r) => r && r.team && renderTeam(r.team))));
}

function esc(value) { return String(value || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c])); }

function renderDoctor(report) {
  const box = document.getElementById("doctorReport");
  if (!box || !report) return;
  const lines = [report.summary || (report.ok ? "Ready." : "Blocked.")];
  for (const row of report.rows || []) {
    lines.push(`${row.ok ? "✓" : "✕"} ${row.label}: ${row.detail}`);
  }
  box.textContent = lines.join("\n");
}

function saveTeam() {
  chrome.runtime.sendMessage({ type: "team_config", config: {
    enabled: document.getElementById("teamEnabled").checked,
    writer: document.getElementById("writer").value,
    mapDesigner: document.getElementById("mapDesigner").value,
    uiDesigner: document.getElementById("uiDesigner").value,
    reviewer: document.getElementById("reviewer").value,
    qa: document.getElementById("qa").value,
    approvalMode: document.getElementById("approvalMode").value,
  }}, (r) => r && renderTeam(r.team));
}
["teamEnabled", "writer", "mapDesigner", "uiDesigner", "reviewer", "qa", "approvalMode"].forEach((id) => document.getElementById(id).addEventListener("change", saveTeam));

const TASK_TEMPLATES = {
  audit: "Inspect the entire current Roblox project. Complete unfinished or broken gameplay systems, preserve working content, verify data saving and economy, test the main loop, fix every verified runtime error, and leave the experience production-ready.",
  errors: "Run the experience, read Output and Developer Console, reproduce every current runtime error, fix root causes without hiding warnings, and repeat playtests until the tested main path is clean.",
  security: "Audit all RemoteEvents, RemoteFunctions, purchases, rewards, currencies, DataStores, and client-server boundaries. Fix exploitable client trust, missing validation, spam, duplication, and data-loss risks, then playtest the corrected flows.",
  ui: "Audit every player-facing UI on desktop and mobile. Fix overflow, scaling, hierarchy, alignment, contrast, navigation, feedback states, and broken buttons while preserving the established visual style. Use screen captures and playtest all changed interactions.",
  release: "Prepare this Roblox experience for release. Audit gameplay, onboarding, saving, economy, monetization, security, performance, mobile UI, error handling, and playtest coverage. Fix verified blockers and report only genuine user-only publishing steps that remain."
};
document.getElementById("taskTemplate").addEventListener("change", (e) => {
  if (TASK_TEMPLATES[e.target.value]) document.getElementById("teamGoal").value = TASK_TEMPLATES[e.target.value];
});

document.getElementById("startTask").addEventListener("click", (e) => {
  const goal = document.getElementById("teamGoal").value.trim();
  if (!goal) return;
  const original = e.target.textContent;
  e.target.textContent = "Starting…";
  e.target.disabled = true;
  document.getElementById("teamEnabled").checked = true;
  saveTeam();
  setTimeout(() => chrome.runtime.sendMessage({ type: "team_task_start", goal }, (r) => {
    e.target.disabled = false;
    e.target.textContent = r && r.ok ? "✓ Started" : "Start blocked";
    if (r && r.team) renderTeam(r.team);
    else if (r && r.error) document.getElementById("teamState").textContent = r.error;
    setTimeout(() => { e.target.textContent = original; }, 2200);
  }), 100);
});
document.getElementById("scanProject").addEventListener("click", (e) => {
  const original = e.target.textContent;
  e.target.textContent = "Scanning Studio…";
  e.target.disabled = true;
  chrome.runtime.sendMessage({ type: "team_project_scan" }, (r) => {
    e.target.disabled = false;
    e.target.textContent = r && r.ok ? "✓ Scan complete" : "Scan failed";
    if (r && r.team) renderTeam(r.team);
    setTimeout(() => { e.target.textContent = original; }, 2200);
  });
});
document.getElementById("connectionDoctor").addEventListener("click", (e) => {
  const original = e.target.textContent;
  e.target.textContent = "Checking…";
  e.target.disabled = true;
  document.getElementById("doctorReport").textContent = "Checking bridge, Studio, tools, and model tabs…";
  chrome.runtime.sendMessage({ type: "connection_doctor", repair: true }, (r) => {
    e.target.disabled = false;
    e.target.textContent = r && r.ok ? "✓ Doctor passed" : "Doctor found issues";
    renderDoctor(r);
    if (r && r.status) render(r.status);
    if (r && r.team) renderTeam(r.team);
    setTimeout(() => { e.target.textContent = original; }, 2200);
  });
});
document.getElementById("retryTask").addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_task_retry" }, (r) => r && renderTeam(r.team)));
document.getElementById("cancelTask").addEventListener("click", () => chrome.runtime.sendMessage({ type: "team_task_cancel" }, (r) => r && renderTeam(r.team)));
document.getElementById("rollbackTask").addEventListener("click", (e) => {
  const original = e.target.textContent;
  e.target.textContent = "Restoring…";
  chrome.runtime.sendMessage({ type: "team_checkpoint_restore" }, (r) => {
    e.target.textContent = r && r.ok ? "✓ Rollback complete" : "Rollback failed";
    if (r && r.team) renderTeam(r.team);
    setTimeout(() => { e.target.textContent = original; }, 2200);
  });
});

function handoffPrompt(target) {
  const team = lastTeam || {};
  const task = team.task || {};
  const recent = (team.history || []).slice(-3).map((h) => `- ${h.status}: ${h.goal}`).join("\n");
  const role = target === "roblox"
    ? "You are Roblox Studio Assistant. Act directly in the currently open place."
    : "You are an expert Roblox/Luau development reviewer. Return a concrete implementation or diagnosis that a Studio-connected agent can apply.";
  return `${role}\n\nCURRENT GOAL\n${task.goal || document.getElementById("teamGoal").value.trim() || "Inspect and improve the current Roblox project."}\n\nTEAM STATE\nPhase: ${task.phase || "not started"}\nStatus: ${task.status || "idle"}\nActive provider: ${task.provider || "none"}\nRepair rounds: ${task.round || 0}\nCheckpoint: ${(team.checkpoint && team.checkpoint.latest) || "none"}\n\nLAST TEAM REPORT\n${task.lastReport || "No report yet."}\n\nRECENT TASKS\n${recent || "None."}\n\nDo not invent project contents. Inspect the actual Studio state when tools are available. Preserve working systems, use secure server-authoritative Roblox patterns, and give exact next actions. If you can edit Studio, perform the work and playtest it; otherwise return a concise handoff for the connected ZeroScript builder.`;
}

document.getElementById("handoffTask").addEventListener("click", async (e) => {
  const target = document.getElementById("handoffTarget").value;
  const original = e.target.textContent;
  try {
    await navigator.clipboard.writeText(handoffPrompt(target));
    e.target.textContent = target === "roblox" ? "✓ Copied · paste in Studio Assistant" : "✓ Copied · opening…";
    if (HANDOFF_URLS[target]) chrome.tabs.create({ url: HANDOFF_URLS[target] });
  } catch {
    e.target.textContent = "Copy failed";
  }
  setTimeout(() => { e.target.textContent = original; }, 2400);
});

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

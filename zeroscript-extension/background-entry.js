// SPDX-License-Identifier: GPL-3.0-or-later
// Reliability and orchestration layer loaded around the original service worker.
// It keeps the upstream worker intact while adding automatic routing, durable
// cross-model context, and a reconnect-aware status response.

let zsLastHealthyAt = 0;

// Register first so shared reports are attached to the task before the original
// team_task_done handler advances to the next phase.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "status") {
    try {
      if (!connected) connect();
      sendResponse(statusObj());
    } catch (error) {
      sendResponse({ type: "zs-status", connected: false, reconnecting: true, error: String(error) });
    }
    return false;
  }

  if (msg.type === "team_task_done" && typeof teamTask !== "undefined" && teamTask && msg.task_id === teamTask.id) {
    const report = String(msg.report || "").slice(0, 12000);
    teamTask.sharedReports = Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports : [];
    const entry = {
      phase: String(msg.phase || teamTask.phase || "unknown"),
      provider: String(teamTask.provider || msg.provider || "unknown"),
      report,
      at: Date.now(),
    };
    const previousIndex = teamTask.sharedReports.findIndex((item) => item.phase === entry.phase && item.provider === entry.provider);
    if (previousIndex >= 0) teamTask.sharedReports.splice(previousIndex, 1);
    teamTask.sharedReports.push(entry);
    teamTask.sharedReports = teamTask.sharedReports.slice(-12);
    teamTask.finalReport = report;
    chrome.storage.local.set({ zsTeamTask: teamTask }).catch(() => {});
  }

  if (msg.type === "team_task_error" && typeof teamTask !== "undefined" && teamTask && msg.task_id === teamTask.id) {
    teamTask.sharedReports = Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports : [];
    teamTask.sharedReports.push({
      phase: String(msg.phase || teamTask.phase || "unknown"),
      provider: String(teamTask.provider || msg.provider || "unknown"),
      report: `PHASE_ERROR: ${String(msg.error || "Unknown model error")}`,
      at: Date.now(),
    });
    teamTask.sharedReports = teamTask.sharedReports.slice(-12);
    chrome.storage.local.set({ zsTeamTask: teamTask }).catch(() => {});
  }
});

importScripts("background.js");

TEAM_DEFAULTS.smartRouting = true;
teamConfig = { ...TEAM_DEFAULTS, ...teamConfig };

const zsOriginalHandleBridgeMessage = handleBridgeMessage;
handleBridgeMessage = function zsHandleBridgeMessage(msg) {
  zsLastHealthyAt = Date.now();
  return zsOriginalHandleBridgeMessage(msg);
};

const zsOriginalStatusObj = statusObj;
statusObj = function zsStatusObj() {
  const base = zsOriginalStatusObj();
  const transportConnected = !!base.connected;
  const socketConnecting = !!(ws && ws.readyState === WebSocket.CONNECTING);
  const recentlyHealthy = zsLastHealthyAt > 0 && Date.now() - zsLastHealthyAt < 15000;
  const reconnecting = !transportConnected && (socketConnecting || recentlyHealthy);
  return {
    ...base,
    transportConnected,
    reconnecting,
    connected: transportConnected || reconnecting,
  };
};

const zsOriginalPhaseProvider = phaseProvider;
const ZS_PROVIDER_WEIGHTS = {
  analyst:  { qwen: 10, deepseek: 9, gemini: 6, glm: 6, kimi: 5, arena: 3 },
  builder:  { deepseek: 10, qwen: 9, glm: 7, gemini: 5, kimi: 4, arena: 3 },
  map:      { gemini: 10, qwen: 8, kimi: 7, glm: 6, deepseek: 4, arena: 3 },
  ui:       { gemini: 10, qwen: 8, kimi: 7, glm: 6, deepseek: 5, arena: 3 },
  reviewer: { qwen: 10, deepseek: 9, gemini: 7, glm: 6, kimi: 5, arena: 3 },
  qa:       { qwen: 10, gemini: 9, deepseek: 7, glm: 6, kimi: 5, arena: 3 },
};

function zsReadyProviders() {
  cleanTeamState();
  const failed = new Set(teamTask && Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : []);
  return [...new Set([...teamAgents.values()]
    .filter((agent) => agent.ready && !failed.has(agent.provider) && !providerHealth[agent.provider])
    .map((agent) => agent.provider))];
}

function zsProviderScore(provider, phase, goal) {
  const weights = ZS_PROVIDER_WEIGHTS[phase] || ZS_PROVIDER_WEIGHTS.qa;
  let score = weights[provider] || 0;
  const text = String(goal || "").toLowerCase();

  if (/\b(ui|gui|hud|menu|panel|mobile|responsive|visual|vfx|map|world|lobby|lighting|arayüz|harita)\b/.test(text)) {
    if (provider === "gemini") score += 5;
    if (["qwen", "kimi"].includes(provider)) score += 2;
  }
  if (/\b(luau|script|server|remote|datastore|profile|security|exploit|runtime|error|economy|inventory)\b/.test(text)) {
    if (["deepseek", "qwen"].includes(provider)) score += 4;
    if (provider === "glm") score += 2;
  }

  const reports = teamTask && Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports : [];
  const previous = reports.length ? reports[reports.length - 1].provider : null;
  if (["reviewer", "qa"].includes(phase) && provider === previous && zsReadyProviders().length > 1) score -= 6;
  return score;
}

phaseProvider = function zsPhaseProvider(phase) {
  if (!teamConfig.smartRouting) return zsOriginalPhaseProvider(phase);
  const ready = zsReadyProviders();
  if (!ready.length) return zsOriginalPhaseProvider(phase);

  const ranked = ready
    .map((provider) => ({ provider, score: zsProviderScore(provider, phase, teamTask && teamTask.goal) }))
    .sort((a, b) => b.score - a.score || a.provider.localeCompare(b.provider));
  const selected = ranked[0];
  if (teamTask) {
    teamTask.routingReason = `Smart route: ${phase} → ${selected.provider} (${selected.score} score; ${ready.length} ready)`;
    teamTask.updatedAt = Date.now();
  }
  return selected.provider;
};

function zsReportsForPrompt(task) {
  const reports = Array.isArray(task.sharedReports) && task.sharedReports.length
    ? task.sharedReports
    : (Array.isArray(task.events) ? task.events.map((event) => ({
        phase: event.phase,
        provider: event.provider,
        report: event.report,
        at: event.at,
      })) : []);
  if (!reports.length) return "No earlier phase report. Inspect the actual Studio state before acting.";
  return reports.slice(-6).map((item, index) => {
    const text = String(item.report || "").slice(0, 3500);
    return `REPORT ${index + 1} — ${String(item.phase || "phase").toUpperCase()} / ${item.provider || "unknown"}\n${text}`;
  }).join("\n\n");
}

function zsPhaseObjective(phase) {
  if (phase === "analyst") return "Inspect the actual project and produce a prioritized implementation plan. Do not edit Studio during this phase.";
  if (phase === "builder") return "Implement the verified gameplay, server, data, security, and code changes. Preserve working systems and test the main path.";
  if (phase === "map") return "Inspect and improve only the map/world work required by the goal. Preserve gameplay objects and verify spawn, traversal, lighting, and performance.";
  if (phase === "ui") return "Inspect and improve only the player-facing UI work required by the goal. Preserve existing logic and test desktop and mobile interactions.";
  if (phase === "reviewer") return "Independently inspect prior changes, directly fix verified defects, and avoid replacing correct work merely for style.";
  return "Run a real playtest, exercise the requested path, read Output, fix verified failures, and retest. Include TEST_EVIDENCE and OUTPUT_ERRORS in the final report.";
}

phasePrompt = function zsPhasePrompt(task) {
  const actualTools = toolsCache
    .filter((tool) => (tool.server || "roblox") === "roblox")
    .map((tool) => String(tool.name || "").split("/").pop())
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort();
  const toolText = actualTools.length ? actualTools.join(", ") : "Tool catalogue unavailable — run list_commands before using any Studio command.";
  const audit = String(task.auditReport || projectAudit.report || "No deterministic scan is available.").slice(0, 6000);
  const sharedReports = zsReportsForPrompt(task);
  const objective = zsPhaseObjective(task.phase);

  return `TEAM TASK ${task.id}\nORIGINAL GOAL\n${task.goal}\n\nCURRENT PHASE\n${String(task.phase || "unknown").toUpperCase()}\n${task.routingReason || "Smart routing is active."}\n\nPHASE OBJECTIVE\n${objective}\n\nSHARED TEAM MEMORY — work already performed by other models\n${sharedReports}\n\nLOCAL PROJECT SCAN\n${audit}\n\nCHECKPOINT\n${task.checkpoint || (checkpointState && checkpointState.latest) || "none"}\n\nACTUAL ROBLOX TOOL NAMES CURRENTLY EXPOSED\n${toolText}\n\nOPERATING RULES\n- Continue from the shared reports; do not behave as though earlier models did nothing.\n- Inspect the current Studio state before changing anything because earlier reports can be incomplete or stale.\n- Use only exact tool names from the live list above or from list_commands. Never invent a tool name.\n- Do not repeat changes already verified unless inspection proves they are broken.\n- Perform the work directly in Studio when tools are available; do not return a handoff instead.\n- All important gameplay state must remain server-authoritative.\n- End with a concrete report containing inspected state, exact changes, test evidence, remaining work, and one verdict line.\n- Use TEAM_VERDICT: PASS when this phase is complete. Reviewer or QA may use TEAM_VERDICT: FIX builder, TEAM_VERDICT: FIX map, or TEAM_VERDICT: FIX ui only for a verified unresolved defect.`;
};

// Persist the new default immediately so old installations switch to automatic
// routing without requiring the user to touch every provider dropdown.
chrome.storage.local.set({ zsTeamConfig: teamConfig }).catch(() => {});

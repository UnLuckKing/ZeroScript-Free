// SPDX-License-Identifier: GPL-3.0-or-later
// Optional local AI provider for LM Studio and Ollama. Runs the same iterative
// Roblox tool loop in the service worker, with no paid API and no browser tab.

const ZS_LOCAL_CONFIG_KEY = "zsLocalModelConfig";
const ZS_LOCAL_AGENT_ID = -100022;
const ZS_LOCAL_DEFAULTS = {
  enabled: false,
  preferLocal: false,
  allowFallback: true,
  kind: "lmstudio",
  endpoint: "http://127.0.0.1:1234/v1/chat/completions",
  model: "",
  maxTurns: 32,
  temperature: 0.1,
};

let zsLocalConfig = { ...ZS_LOCAL_DEFAULTS };
let zsLocalStatus = { ready: false, checking: false, error: "Local AI disabled", model: "", checkedAt: 0 };
let zsLocalRunning = false;

Object.assign(ZS_PROVIDER_WEIGHTS.analyst,  { local: 7 });
Object.assign(ZS_PROVIDER_WEIGHTS.builder,  { local: 8 });
Object.assign(ZS_PROVIDER_WEIGHTS.map,      { local: 5 });
Object.assign(ZS_PROVIDER_WEIGHTS.ui,       { local: 5 });
Object.assign(ZS_PROVIDER_WEIGHTS.reviewer, { local: 7 });
Object.assign(ZS_PROVIDER_WEIGHTS.qa,       { local: 6 });

chrome.storage.local.get(ZS_LOCAL_CONFIG_KEY, (result) => {
  zsLocalConfig = { ...ZS_LOCAL_DEFAULTS, ...((result && result[ZS_LOCAL_CONFIG_KEY]) || {}) };
  zsProbeLocal().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[ZS_LOCAL_CONFIG_KEY]) return;
  zsLocalConfig = { ...ZS_LOCAL_DEFAULTS, ...(changes[ZS_LOCAL_CONFIG_KEY].newValue || {}) };
  zsProbeLocal().catch(() => {});
});

function zsLocalPublicStatus() {
  return { ...zsLocalStatus, config: { ...zsLocalConfig, endpoint: zsLocalConfig.endpoint } };
}

const zsLocalCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithLocal() {
  return { ...zsLocalCoreTeamObj(), localModel: zsLocalPublicStatus() };
};

function zsLocalHealthUrl() {
  const endpoint = String(zsLocalConfig.endpoint || "").replace(/\/+$/, "");
  if (zsLocalConfig.kind === "ollama") {
    return endpoint.includes("/api/chat") ? endpoint.replace(/\/api\/chat.*$/i, "/api/tags") : `${endpoint}/api/tags`;
  }
  return endpoint.includes("/v1/chat/completions")
    ? endpoint.replace(/\/v1\/chat\/completions.*$/i, "/v1/models")
    : `${endpoint}/v1/models`;
}

async function zsProbeLocal() {
  if (!zsLocalConfig.enabled) {
    zsLocalStatus = { ready: false, checking: false, error: "Local AI disabled", model: zsLocalConfig.model || "", checkedAt: Date.now() };
    teamAgents.delete(ZS_LOCAL_AGENT_ID);
    broadcastTeam();
    return zsLocalStatus;
  }
  if (zsLocalStatus.checking) return zsLocalStatus;
  zsLocalStatus = { ...zsLocalStatus, checking: true, error: "" };
  try {
    const response = await fetch(zsLocalHealthUrl(), { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let models = [];
    if (Array.isArray(data.data)) models = data.data.map((item) => item.id).filter(Boolean);
    if (Array.isArray(data.models)) models = data.models.map((item) => item.name || item.model).filter(Boolean);
    const configured = String(zsLocalConfig.model || "").trim();
    const model = configured || models[0] || "local-model";
    zsLocalStatus = { ready: true, checking: false, error: "", model, models: models.slice(0, 20), checkedAt: Date.now() };
    zsLocalConfig.model = model;
    teamAgents.set(ZS_LOCAL_AGENT_ID, { provider: "local", title: `${zsLocalConfig.kind}: ${model}`, ready: true, local: true, lastSeen: Date.now() });
  } catch (error) {
    zsLocalStatus = { ready: false, checking: false, error: String(error && error.message || error), model: zsLocalConfig.model || "", checkedAt: Date.now() };
    teamAgents.delete(ZS_LOCAL_AGENT_ID);
  }
  broadcastTeam();
  return zsLocalStatus;
}

setInterval(() => {
  if (zsLocalConfig.enabled) zsProbeLocal().catch(() => {});
}, 15000);

function zsLocalReadyWebAgents() {
  cleanTeamState();
  return [...teamAgents.entries()].filter(([id, agent]) => id !== ZS_LOCAL_AGENT_ID && agent.ready && !providerHealth[agent.provider]);
}

const zsLocalCoreFallbackAgent = fallbackAgent;
fallbackAgent = function zsFallbackWithoutPseudoTab(preferred, phase) {
  const selected = zsLocalCoreFallbackAgent(preferred, phase);
  return selected && selected.provider === "local" ? null : selected;
};

function zsLocalShouldOwnDispatch() {
  if (!teamTask || !zsLocalConfig.enabled || !zsLocalStatus.ready || zsLocalRunning) return false;
  const preferred = phaseProvider(teamTask.phase);
  if (preferred === "local") return true;
  return zsLocalConfig.allowFallback && !zsLocalReadyWebAgents().length;
}

const zsLocalCoreDispatch = dispatchTask;
dispatchTask = async function zsDispatchWithLocalFallback() {
  if (zsLocalShouldOwnDispatch()) {
    zsRunLocalTask(teamTask).catch((error) => zsFailLocalTask(teamTask, error));
    return;
  }
  return zsLocalCoreDispatch();
};

function zsLocalCompactTools() {
  const blocked = new Set(["subagent", "screen_capture"]);
  return toolsCache
    .filter((tool) => (tool.server || "roblox") === "roblox")
    .filter((tool) => !blocked.has(String(tool.name || "").split("/").pop()))
    .map((tool) => {
      const name = String(tool.name || "").split("/").pop();
      const schema = tool.inputSchema || {};
      const props = schema.properties || {};
      const args = Object.entries(props).map(([key, value]) => `${key}${(schema.required || []).includes(key) ? "*" : ""}:${value.type || "any"}`).join(", ");
      return `${name}(${args}) - ${String(tool.description || "").split("\n")[0]}`;
    });
}

function zsLocalSystemPrompt() {
  return `You are the local ZeroScript Roblox Studio agent. You control the user's currently open Studio project through text commands executed by the extension.

You must work autonomously and continue until the assigned phase is complete. Use only one command per reply and wait for its result.

COMMAND FORMAT:
For normal commands, output one JSON object, optionally in a fenced code block:
{"command":"exact_tool_name","params":{"key":"value"}}

For execute_luau only, output:
###LUA###
-- Luau code
return "result"
###END_LUA###

Never invent tool names. Never use screen_capture because this local provider is text-only. Prefer targeted edits and never bulk-delete core Roblox containers. When finished, return a plain-text final report with exact changed paths, tests, remaining work, and TEAM_VERDICT: PASS or the appropriate FIX verdict.

AVAILABLE ROBLOX TOOLS:
${zsLocalCompactTools().join("\n")}`;
}

function zsLocalEndpoint() {
  const endpoint = String(zsLocalConfig.endpoint || "").replace(/\/+$/, "");
  if (zsLocalConfig.kind === "ollama") return endpoint.includes("/api/chat") ? endpoint : `${endpoint}/api/chat`;
  return endpoint.includes("/v1/chat/completions") ? endpoint : `${endpoint}/v1/chat/completions`;
}

async function zsLocalChat(messages) {
  const endpoint = zsLocalEndpoint();
  let body;
  if (zsLocalConfig.kind === "ollama") {
    body = { model: zsLocalStatus.model || zsLocalConfig.model, messages, stream: false, options: { temperature: Number(zsLocalConfig.temperature || 0.1) } };
  } else {
    body = { model: zsLocalStatus.model || zsLocalConfig.model || undefined, messages, temperature: Number(zsLocalConfig.temperature || 0.1), stream: false };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Local AI HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = zsLocalConfig.kind === "ollama"
    ? data && data.message && data.message.content
    : data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text || !String(text).trim()) throw new Error("Local AI returned an empty response.");
  return String(text).trim();
}

function zsLocalExtractJson(text) {
  const source = String(text || "");
  const start = source.search(/\{\s*"(?:command|tool)"\s*:/i);
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(source.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function zsLocalParseCommand(text) {
  const lua = /###LUA###([\s\S]*?)###END_LUA###/i.exec(String(text || ""));
  if (lua) return { name: "execute_luau", arguments: { code: lua[1].trim(), datamodel_type: "Edit" } };
  const json = zsLocalExtractJson(text);
  if (!json) return null;
  return { name: json.command || json.tool, arguments: json.params || json.arguments || {} };
}

function zsLocalSafety(name, args) {
  const bare = String(name || "").split("/").pop().toLowerCase();
  const text = JSON.stringify(args || {}).toLowerCase();
  if (bare === "execute_luau") {
    const code = String(args && args.code || "").toLowerCase();
    if (/(getdescendants|getchildren)\s*\(\s*\)/.test(code) && /:destroy\s*\(/.test(code)) return "Mass descendant deletion blocked.";
    if (/(workspace|startergui|replicatedstorage|serverscriptservice|serverstorage)[^\n]{0,120}:clearallchildren\s*\(/.test(code)) return "Clearing a core Roblox container is blocked.";
  }
  if (/clearallchildren|delete all|remove all|destroy all/.test(text) && /workspace|startergui|replicatedstorage|serverscriptservice/.test(text)) return "Bulk core-container deletion blocked.";
  return null;
}

function zsLocalToolByName(name) {
  const bare = String(name || "").split("/").pop();
  return toolsCache.find((tool) => String(tool.name || "").split("/").pop() === bare);
}

async function zsLocalRunTool(command) {
  const name = String(command.name || "").split("/").pop();
  if (name === "list_commands" || name === "list_tools") return `AVAILABLE TOOLS:\n${zsLocalCompactTools().join("\n")}`;
  if (name === "list_mcp_servers") return `MCP SERVERS:\n${serversCache.map((server) => `${server.id}: ${server.alive ? "online" : "offline"} (${server.tools || 0} tools)`).join("\n")}`;
  const safety = zsLocalSafety(name, command.arguments);
  if (safety) {
    chrome.storage.local.set({ zsSafetyLastBlock: { at: Date.now(), provider: "local", tool: name, reason: safety, preview: JSON.stringify(command.arguments).slice(0, 900) } });
    return `ERROR: SAFETY BLOCK: ${safety} Inspect exact instances and make smaller targeted changes.`;
  }
  const tool = zsLocalToolByName(name);
  if (!tool) return `ERROR: unknown command '${name}'. Valid tools: ${zsLocalCompactTools().map((line) => line.split("(")[0]).join(", ")}`;

  const lockDeadline = Date.now() + 30000;
  while (writerLease && writerLease.provider !== "local" && Date.now() < lockDeadline) await sleep(300);
  if (writerLease && writerLease.provider !== "local") return `ERROR: Studio is still locked by ${writerLease.provider}. Retry later.`;
  writerLease = { tabId: ZS_LOCAL_AGENT_ID, provider: "local", token: `local-${Date.now()}`, expiresAt: Date.now() + WRITE_LEASE_MS };
  broadcastTeam();
  const result = await send({ type: "call_tool", name: tool.name, arguments: command.arguments || {}, timeout: 120000 }, 130000);
  writerLease = null;
  broadcastTeam();
  return result && result.ok ? `Output of '${name}':\n${String(result.text || "OK")}` : `ERROR from '${name}': ${String(result && result.error || "tool failed")}`;
}

async function zsRunLocalTask(task) {
  if (!task || zsLocalRunning) return;
  zsLocalRunning = true;
  task.status = "running";
  task.provider = "local";
  task.error = null;
  task.phaseStartedAt = Date.now();
  task.updatedAt = Date.now();
  await chrome.storage.local.set({ zsTeamTask: task });
  zsTimeline("dispatch", `${task.phase} assigned to local model ${zsLocalStatus.model}`, { taskId: task.id, phase: task.phase, provider: "local" });
  broadcastTeam();

  const messages = [
    { role: "system", content: zsLocalSystemPrompt() },
    { role: "user", content: phasePrompt(task) },
  ];
  let finalNudged = false;
  try {
    for (let turn = 0; turn < Math.max(4, Math.min(64, Number(zsLocalConfig.maxTurns || 32))); turn++) {
      if (!teamTask || teamTask.id !== task.id || ["cancelled", "failed", "done"].includes(teamTask.status)) return;
      const response = await zsLocalChat(messages);
      messages.push({ role: "assistant", content: response });
      const command = zsLocalParseCommand(response);
      if (command) {
        const result = await zsLocalRunTool(command);
        messages.push({ role: "user", content: result });
        continue;
      }
      if (!/TEAM_VERDICT\s*:/i.test(response) && !finalNudged) {
        finalNudged = true;
        messages.push({ role: "user", content: "Return your concrete final phase report now. Include exact inspected/changed paths, tests, remaining work, and a TEAM_VERDICT line. Do not call another tool unless strictly required." });
        continue;
      }
      await zsCompleteLocalTask(task, response);
      return;
    }
    throw new Error(`Local model exceeded ${zsLocalConfig.maxTurns} turns without a final report.`);
  } finally {
    zsLocalRunning = false;
    if (writerLease && writerLease.provider === "local") writerLease = null;
    broadcastTeam();
  }
}

async function zsCompleteLocalTask(task, report) {
  if (!teamTask || teamTask.id !== task.id || task.phase !== teamTask.phase) return;
  const completedPhase = teamTask.phase;
  teamTask.lastReport = String(report || "").slice(0, 12000);
  teamTask.finalReport = teamTask.lastReport;
  teamTask.sharedReports = Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports : [];
  teamTask.sharedReports.push({ phase: completedPhase, provider: "local", report: teamTask.lastReport, at: Date.now() });
  teamTask.sharedReports = teamTask.sharedReports.slice(-12);

  if (completedPhase === "qa") {
    teamTask.qaEvidence = await collectQAEvidence(teamTask.lastReport);
    if (!teamTask.qaEvidence.passed) {
      teamTask.qaRetries = (teamTask.qaRetries || 0) + 1;
      if (teamTask.qaRetries <= 2) {
        teamTask.status = "queued";
        teamTask.error = "Local QA evidence rejected; repeat playtest with TEST_EVIDENCE and OUTPUT_ERRORS.";
        await chrome.storage.local.set({ zsTeamTask: teamTask });
        broadcastTeam();
        dispatchTask();
        return;
      }
      teamTask.status = "failed";
      teamTask.error = "QA evidence gate failed after two automatic retries.";
    }
  }

  teamTask.events = Array.isArray(teamTask.events) ? teamTask.events : [];
  teamTask.events.push({ phase: completedPhase, provider: "local", at: Date.now(), report: teamTask.lastReport.slice(0, 1000) });
  const parsed = zsParseReport(teamTask.lastReport, completedPhase, "local");
  zsUpdateMemory(parsed);
  zsRecordPerformance("local", completedPhase, "completed", teamTask.lastReport, Date.now() - Number(teamTask.phaseStartedAt || Date.now()));
  zsTimeline("complete", `${completedPhase} completed by local: ${parsed.verdict}`, { taskId: task.id, phase: completedPhase, provider: "local" });

  const fix = /TEAM_VERDICT:\s*FIX\s+(builder|map|ui)/i.exec(teamTask.lastReport);
  if (teamTask.status !== "failed" && fix && ["reviewer", "qa"].includes(completedPhase)) {
    teamTask.round = (teamTask.round || 0) + 1;
    if (teamTask.round > (teamConfig.maxRepairRounds || 2)) {
      teamTask.status = "failed";
      teamTask.error = `Repair limit reached after ${teamTask.round - 1} rounds.`;
    } else {
      teamTask.phase = fix[1].toLowerCase();
      teamTask.repairReturn = completedPhase;
      teamTask.status = "queued";
    }
  } else if (teamTask.repairReturn && ["builder", "map", "ui"].includes(completedPhase)) {
    teamTask.phase = teamTask.repairReturn;
    teamTask.repairReturn = null;
    teamTask.status = "queued";
  } else if (teamTask.status !== "failed") {
    teamTask.phaseIndex = Number.isInteger(teamTask.phaseIndex) ? teamTask.phaseIndex + 1 : 1;
    if (Array.isArray(teamTask.phases) && teamTask.phaseIndex < teamTask.phases.length) teamTask.phase = teamTask.phases[teamTask.phaseIndex];
    else { teamTask.phase = "complete"; teamTask.status = "done"; }
  }

  teamTask.updatedAt = Date.now();
  if (["done", "failed"].includes(teamTask.status)) {
    const runningFix = (autoFixQueue.items || []).find((item) => item.status === "running");
    if (runningFix) {
      runningFix.status = teamTask.status === "done" ? "done" : "failed";
      runningFix.completedAt = Date.now();
      if (teamTask.error) runningFix.error = teamTask.error;
      autoFixQueue.status = (autoFixQueue.items || []).some((item) => item.status === "pending") ? "ready" : "done";
      await persistAutoFixQueue();
    }
    teamHistory.push({ id: teamTask.id, goal: teamTask.goal, status: teamTask.status, rounds: teamTask.round || 0, qaEvidence: teamTask.qaEvidence || null, createdAt: teamTask.createdAt, completedAt: Date.now(), events: teamTask.events.slice(-20) });
    teamHistory = teamHistory.slice(-50);
    await chrome.storage.local.set({ zsTeamHistory: teamHistory });
  }
  await chrome.storage.local.set({ zsTeamTask: teamTask, [ZS_MANAGER_KEY]: zsManager });
  broadcastTeam();
  if (!["done", "failed"].includes(teamTask.status)) dispatchTask();
}

async function zsFailLocalTask(task, error) {
  zsLocalRunning = false;
  if (writerLease && writerLease.provider === "local") writerLease = null;
  if (!teamTask || !task || teamTask.id !== task.id) return;
  const reason = String(error && error.message || error || "Local model failed.");
  zsRecordPerformance("local", teamTask.phase, "failed", reason, Date.now() - Number(teamTask.phaseStartedAt || Date.now()));
  providerHealth.local = { status: /context|token|too long/i.test(reason) ? "limited" : "error", reason: reason.slice(0, 240), until: Date.now() + 10 * 60 * 1000 };
  teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
  if (!teamTask.failedProviders.includes("local")) teamTask.failedProviders.push("local");
  teamTask.status = "queued";
  teamTask.error = `Local model failed; selecting another provider. ${reason}`;
  teamTask.contextSummary = zsContextSummary();
  teamTask.updatedAt = Date.now();
  zsTimeline("error", `${teamTask.phase}/local: ${reason}`, { taskId: teamTask.id, provider: "local" });
  await chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth, [ZS_MANAGER_KEY]: zsManager });
  broadcastTeam();
  dispatchTask();
}

// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.24 reliability/control suite. Loaded last so it can observe the
// final orchestrator (browser + local providers) without replacing proven code.

const ZS_SUITE_KEY = "zsControlSuite";
const ZS_PROVIDER_PERMISSION_KEY = "zsProviderPermissions";
const ZS_PROVIDER_URL_MAP = {
  deepseek: "https://chat.deepseek.com/",
  gemini: "https://gemini.google.com/app",
  qwen: "https://chat.qwen.ai/",
  kimi: "https://www.kimi.com/",
  glm: "https://chat.z.ai/",
  arena: "https://arena.ai/text/direct",
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  copilot: "https://copilot.microsoft.com/",
  mistral: "https://chat.mistral.ai/chat",
};
const ZS_PROVIDER_MATCHES = [
  "https://chat.deepseek.com/*", "https://deepseek.com/*",
  "https://gemini.google.com/*", "https://chat.qwen.ai/*",
  "https://www.kimi.com/*", "https://kimi.com/*", "https://chat.z.ai/*",
  "https://arena.ai/*", "https://chatgpt.com/*", "https://claude.ai/*",
  "https://copilot.microsoft.com/*", "https://chat.mistral.ai/*",
];

let zsSuite = {
  version: 1,
  qualityMode: "balanced",
  notifications: true,
  autoContextRecovery: true,
  runtime: { state: "idle", taskId: null, phase: null, provider: null, detail: "", changedAt: Date.now() },
  ledger: [],
  ownership: { claims: {}, conflicts: [] },
  probes: {},
  update: { current: chrome.runtime.getManifest().version, latest: null, available: false, checkedAt: 0, error: "" },
  risk: { score: 0, level: "low", reasons: [], provider: null, tool: null, checkedAt: 0 },
  diagnostics: { lastBundleAt: 0 },
};
let zsProviderPermissions = { default: "full", providers: {} };
let zsSuiteLastTaskTerminal = null;
const zsContextRecoverySeen = new Set();

chrome.storage.local.get([ZS_SUITE_KEY, ZS_PROVIDER_PERMISSION_KEY], (result) => {
  const saved = result && result[ZS_SUITE_KEY];
  if (saved && typeof saved === "object") {
    zsSuite = {
      ...zsSuite,
      ...saved,
      runtime: { ...zsSuite.runtime, ...(saved.runtime || {}) },
      ownership: { ...zsSuite.ownership, ...(saved.ownership || {}) },
      update: { ...zsSuite.update, ...(saved.update || {}) },
      risk: { ...zsSuite.risk, ...(saved.risk || {}) },
      diagnostics: { ...zsSuite.diagnostics, ...(saved.diagnostics || {}) },
      ledger: Array.isArray(saved.ledger) ? saved.ledger.slice(-160) : [],
      probes: saved.probes || {},
    };
  }
  if (result && result[ZS_PROVIDER_PERMISSION_KEY]) {
    zsProviderPermissions = {
      default: "full",
      ...result[ZS_PROVIDER_PERMISSION_KEY],
      providers: { ...((result[ZS_PROVIDER_PERMISSION_KEY] || {}).providers || {}) },
    };
  }
  broadcastTeam();
});

function zsSuitePersist() {
  zsSuite.ledger = (zsSuite.ledger || []).slice(-160);
  zsSuite.ownership.conflicts = (zsSuite.ownership.conflicts || []).slice(-40);
  return chrome.storage.local.set({ [ZS_SUITE_KEY]: zsSuite, [ZS_PROVIDER_PERMISSION_KEY]: zsProviderPermissions });
}

function zsSuitePublic() {
  return {
    version: zsSuite.version,
    qualityMode: zsSuite.qualityMode,
    notifications: zsSuite.notifications,
    autoContextRecovery: zsSuite.autoContextRecovery,
    runtime: zsSuite.runtime,
    ledger: (zsSuite.ledger || []).slice(-35),
    ownership: zsSuite.ownership,
    probes: zsSuite.probes,
    update: zsSuite.update,
    risk: zsSuite.risk,
    permissions: zsProviderPermissions,
    diagnostics: zsSuite.diagnostics,
  };
}

const zsSuiteCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithControlSuite() {
  return { ...zsSuiteCoreTeamObj(), controlSuite: zsSuitePublic() };
};

function zsSuiteLedger(kind, detail, extra = {}) {
  zsSuite.ledger.push({ at: Date.now(), kind, detail: String(detail || "").slice(0, 600), ...extra });
  zsSuite.ledger = zsSuite.ledger.slice(-160);
}

function zsSuiteTransition(state, detail = "", extra = {}) {
  const previous = zsSuite.runtime || {};
  const next = {
    state,
    taskId: extra.taskId !== undefined ? extra.taskId : previous.taskId,
    phase: extra.phase !== undefined ? extra.phase : previous.phase,
    provider: extra.provider !== undefined ? extra.provider : previous.provider,
    detail: String(detail || "").slice(0, 500),
    changedAt: Date.now(),
  };
  const changed = previous.state !== next.state || previous.taskId !== next.taskId || previous.phase !== next.phase || previous.provider !== next.provider || previous.detail !== next.detail;
  zsSuite.runtime = next;
  if (changed) zsSuiteLedger("state", `${previous.state || "unknown"} → ${state}${detail ? ` · ${detail}` : ""}`, next);
  zsSuitePersist().catch(() => {});
}

function zsSuiteStateFromTask(task) {
  if (!task) return { state: "idle", detail: "No active team task", taskId: null, phase: null, provider: null };
  if (task.status === "done") return { state: "completed", detail: "Final report received", taskId: task.id, phase: task.phase, provider: task.provider };
  if (task.status === "failed") return { state: "failed", detail: task.error || "Task failed", taskId: task.id, phase: task.phase, provider: task.provider };
  if (task.status === "cancelled") return { state: "cancelled", detail: "Task cancelled", taskId: task.id, phase: task.phase, provider: task.provider };
  if (task.status === "queued") {
    const waiting = /wait|ready|session|provider|busy|offline/i.test(String(task.error || ""));
    return { state: waiting ? "waiting_provider" : "queued", detail: task.error || "Waiting for dispatch", taskId: task.id, phase: task.phase, provider: task.provider };
  }
  if (task.status === "running") {
    if (task.phase === "reviewer") return { state: "reviewing", detail: "Independent review in progress", taskId: task.id, phase: task.phase, provider: task.provider };
    if (task.phase === "qa") return { state: "testing", detail: "Playtest and evidence gate in progress", taskId: task.id, phase: task.phase, provider: task.provider };
    return { state: "running", detail: "Provider is working", taskId: task.id, phase: task.phase, provider: task.provider };
  }
  return { state: String(task.status || "unknown"), detail: task.error || "", taskId: task.id, phase: task.phase, provider: task.provider };
}

function zsSuiteDomainsForPhase(phase) {
  if (phase === "ui") return ["StarterGui", "StarterPlayer.StarterPlayerScripts"];
  if (phase === "map") return ["Workspace", "Lighting", "Terrain", "SoundService"];
  if (phase === "builder") return ["ServerScriptService", "ReplicatedStorage", "ServerStorage", "StarterPlayer"];
  return [];
}

function zsSuiteReleaseClaims(taskId) {
  const claims = zsSuite.ownership.claims || {};
  for (const [domain, claim] of Object.entries(claims)) {
    if (!taskId || claim.taskId === taskId) delete claims[domain];
  }
}

function zsSuiteClaimDomains(task) {
  if (!task || !task.id || !task.provider) return;
  const claims = zsSuite.ownership.claims || (zsSuite.ownership.claims = {});
  for (const domain of zsSuiteDomainsForPhase(task.phase)) {
    const existing = claims[domain];
    if (existing && (existing.taskId !== task.id || existing.provider !== task.provider)) {
      zsSuite.ownership.conflicts.push({ at: Date.now(), domain, requestedBy: task.provider, owner: existing.provider, taskId: task.id, ownerTaskId: existing.taskId });
      zsSuiteLedger("conflict", `${domain}: ${task.provider} conflicts with ${existing.provider}`, { taskId: task.id, phase: task.phase });
      continue;
    }
    claims[domain] = { taskId: task.id, provider: task.provider, phase: task.phase, claimedAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000 };
  }
}

function zsSuiteCleanClaims() {
  const now = Date.now();
  for (const [domain, claim] of Object.entries(zsSuite.ownership.claims || {})) {
    if (!claim || Number(claim.expiresAt || 0) < now) delete zsSuite.ownership.claims[domain];
  }
}

const zsSuiteCorePhasesForGoal = phasesForGoal;
phasesForGoal = function zsQualityPhasesForGoal(goal) {
  const phases = zsSuiteCorePhasesForGoal(goal);
  if (zsSuite.qualityMode === "fast") {
    const inspection = /inspect|audit|incele|değiştirmeden|without changing/i.test(String(goal || ""));
    if (inspection) return [...new Set(["analyst", "qa"])];
    const specialists = phases.filter((phase) => ["builder", "map", "ui"].includes(phase));
    return [...new Set([...(specialists.length ? specialists : ["builder"]), "qa"])];
  }
  if (zsSuite.qualityMode === "best") {
    return [...new Set(["analyst", ...phases.filter((phase) => phase !== "analyst" && phase !== "reviewer" && phase !== "qa"), "reviewer", "qa"])];
  }
  return phases;
};

const zsSuiteCoreDispatchTask = dispatchTask;
dispatchTask = async function zsSuiteDispatchTask() {
  if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) {
    zsSuiteTransition(teamTask.status === "queued" ? "queued" : "assigning", `Preparing ${teamTask.phase || "phase"}`, { taskId: teamTask.id, phase: teamTask.phase, provider: teamTask.provider || null });
  }
  const result = await zsSuiteCoreDispatchTask();
  zsSuiteCleanClaims();
  if (teamTask) {
    const state = zsSuiteStateFromTask(teamTask);
    zsSuiteTransition(state.state, state.detail, state);
    if (teamTask.status === "running") zsSuiteClaimDomains(teamTask);
  }
  zsSuitePersist().catch(() => {});
  broadcastTeam();
  return result;
};

function zsSuiteNotify(title, message) {
  if (!zsSuite.notifications || !chrome.notifications) return;
  try {
    chrome.notifications.create(`zs-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon.png",
      title: String(title || "ZeroScript"),
      message: String(message || "").slice(0, 240),
      priority: 1,
    });
  } catch {}
}

function zsSuiteProviderFromSender(sender, fallback) {
  const tabId = sender && sender.tab && sender.tab.id;
  const agent = tabId != null ? teamAgents.get(tabId) : null;
  return (agent && agent.provider) || fallback || "unknown";
}

async function zsSuiteProbeProviders() {
  const tabs = await new Promise((resolve) => chrome.tabs.query({ url: ZS_PROVIDER_MATCHES }, resolve));
  const results = {};
  await Promise.all((tabs || []).map(async (tab) => {
    if (tab.id == null) return;
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "zs-provider-probe" }, (value) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(value || { ok: false, error: "No probe response" });
      });
    });
    const provider = response.provider || (() => {
      try { return new URL(tab.url || "").hostname.split(".")[0]; } catch { return `tab-${tab.id}`; }
    })();
    results[`${provider}:${tab.id}`] = { ...response, tabId: tab.id, title: tab.title || "", url: tab.url || "", checkedAt: Date.now() };
  }));
  zsSuite.probes = results;
  zsSuiteLedger("probe", `Provider diagnostics completed for ${Object.keys(results).length} tab(s)`);
  await zsSuitePersist();
  broadcastTeam();
  return results;
}

async function zsSuitePrepareProvider(provider) {
  const url = ZS_PROVIDER_URL_MAP[provider];
  if (!url) throw new Error(`Unknown provider '${provider}'.`);
  const tab = await new Promise((resolve) => chrome.tabs.create({ url, active: true }, resolve));
  if (!tab || tab.id == null) throw new Error("Provider tab could not be opened.");
  const deadline = Date.now() + 45000;
  let last = null;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    last = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "zs-provider-probe" }, (value) => {
        if (chrome.runtime.lastError) resolve(null); else resolve(value || null);
      });
    });
    if (last && last.composer) break;
  }
  if (!last || !last.composer) throw new Error(`${provider} opened, but its composer was not detected within 45 seconds.`);
  const started = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "zs-provider-auto-start" }, (value) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message }); else resolve(value || { ok: false });
    });
  });
  zsSuiteLedger("prepare", `${provider} tab opened; auto-start ${started.ok ? "requested" : "not available"}`, { provider, tabId: tab.id });
  await zsSuitePersist();
  return { tabId: tab.id, provider, probe: last, start: started };
}

function zsSuiteCompareVersions(a, b) {
  const pa = String(a || "0").split(".").map((n) => Number(n) || 0);
  const pb = String(b || "0").split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

async function zsSuiteCheckUpdate() {
  const current = chrome.runtime.getManifest().version;
  try {
    const response = await fetch(`https://raw.githubusercontent.com/UnLuckKing/ZeroScript-Free/master/zeroscript-extension/manifest.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    const latest = String(manifest.version || "");
    zsSuite.update = { current, latest, available: zsSuiteCompareVersions(current, latest) < 0, checkedAt: Date.now(), error: "" };
  } catch (error) {
    zsSuite.update = { current, latest: null, available: false, checkedAt: Date.now(), error: String(error && error.message || error) };
  }
  await zsSuitePersist();
  broadcastTeam();
  return zsSuite.update;
}

async function zsSuiteDebugBundle() {
  const storage = await chrome.storage.local.get([
    "zsTeamTask", "zsTeamHistory", "zsProviderHealth", "zsProjectAudit", "zsTeamManagerState",
    "zsAutoFixQueue", "zsSafetyLastBlock", "zsRiskLastAssessment", ZS_SUITE_KEY,
  ]);
  zsSuite.diagnostics.lastBundleAt = Date.now();
  await zsSuitePersist();
  return {
    generatedAt: new Date().toISOString(),
    extension: chrome.runtime.getManifest(),
    bridgeStatus: statusObj(),
    team: teamObj(),
    controlSuite: zsSuitePublic(),
    storage,
  };
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.zsRiskLastAssessment && changes.zsRiskLastAssessment.newValue) {
    zsSuite.risk = { ...zsSuite.risk, ...changes.zsRiskLastAssessment.newValue };
    zsSuiteLedger("risk", `${zsSuite.risk.level || "unknown"} risk ${zsSuite.risk.score || 0}/100 · ${zsSuite.risk.tool || "operation"}`);
    zsSuitePersist().catch(() => {});
    broadcastTeam();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "team_task_done" || msg.type === "team_task_error") {
    const taskId = msg.task_id || (teamTask && teamTask.id);
    const phase = msg.phase || (teamTask && teamTask.phase);
    const provider = zsSuiteProviderFromSender(sender, teamTask && teamTask.provider);
    if (msg.type === "team_task_done") {
      zsSuiteLedger("report", `${phase || "phase"} report received from ${provider}`, { taskId, phase, provider });
    } else {
      const reason = String(msg.error || "Provider error");
      zsSuiteLedger("provider_error", `${provider}: ${reason}`, { taskId, phase, provider });
      if (zsSuite.autoContextRecovery && /context|conversation.*too long|token limit|maximum length/i.test(reason)) {
        const key = `${taskId}:${phase}:${provider}`;
        if (!zsContextRecoverySeen.has(key) && ZS_PROVIDER_URL_MAP[provider]) {
          zsContextRecoverySeen.add(key);
          chrome.tabs.create({ url: ZS_PROVIDER_URL_MAP[provider], active: false }).catch(() => {});
          zsSuiteLedger("context_recovery", `Opened a fresh ${provider} conversation for checkpoint recovery`, { taskId, phase, provider });
        }
      }
    }
    zsSuitePersist().catch(() => {});
    return;
  }

  if (msg.type === "suite_provider_probe") {
    zsSuiteProbeProviders().then((probes) => sendResponse({ ok: true, probes, team: teamObj() })).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (msg.type === "suite_prepare_provider") {
    zsSuitePrepareProvider(String(msg.provider || "")).then((result) => sendResponse({ ok: true, result, team: teamObj() })).catch((error) => sendResponse({ ok: false, error: String(error && error.message || error), team: teamObj() }));
    return true;
  }
  if (msg.type === "suite_set_config") {
    if (["fast", "balanced", "best"].includes(msg.qualityMode)) zsSuite.qualityMode = msg.qualityMode;
    if (typeof msg.notifications === "boolean") zsSuite.notifications = msg.notifications;
    if (typeof msg.autoContextRecovery === "boolean") zsSuite.autoContextRecovery = msg.autoContextRecovery;
    if (zsSuite.qualityMode === "fast") teamConfig.maxRepairRounds = 1;
    if (zsSuite.qualityMode === "balanced") teamConfig.maxRepairRounds = 2;
    if (zsSuite.qualityMode === "best") teamConfig.maxRepairRounds = 3;
    chrome.storage.local.set({ zsTeamConfig: teamConfig }).catch(() => {});
    zsSuitePersist().then(() => { broadcastTeam(); sendResponse({ ok: true, team: teamObj() }); });
    return true;
  }
  if (msg.type === "suite_set_permission") {
    const provider = String(msg.provider || "default");
    const scope = String(msg.scope || "full");
    if (!["inspect", "scripts", "ui", "map", "full"].includes(scope)) { sendResponse({ ok: false, error: "Invalid permission scope." }); return false; }
    if (provider === "default") zsProviderPermissions.default = scope;
    else zsProviderPermissions.providers[provider] = scope;
    zsSuitePersist().then(() => sendResponse({ ok: true, permissions: zsProviderPermissions, team: teamObj() }));
    return true;
  }
  if (msg.type === "suite_clear_claims") {
    zsSuite.ownership.claims = {};
    zsSuite.ownership.conflicts = [];
    zsSuiteLedger("ownership", "All stale ownership claims cleared by user");
    zsSuitePersist().then(() => { broadcastTeam(); sendResponse({ ok: true, team: teamObj() }); });
    return true;
  }
  if (msg.type === "suite_add_regression") {
    const test = String(msg.test || "").trim();
    if (!test) { sendResponse({ ok: false, error: "Test description is empty." }); return false; }
    zsManager.regression = zsUniquePush(zsManager.regression, [test], 80);
    zsTimeline("regression", `Manual regression recorded: ${test}`);
    zsPersistManager().then(() => sendResponse({ ok: true, team: teamObj() }));
    return true;
  }
  if (msg.type === "suite_debug_bundle") {
    zsSuiteDebugBundle().then((bundle) => sendResponse({ ok: true, bundle })).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (msg.type === "suite_check_update") {
    zsSuiteCheckUpdate().then((update) => sendResponse({ ok: true, update, team: teamObj() })).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
});

setInterval(() => {
  zsSuiteCleanClaims();
  const state = zsSuiteStateFromTask(teamTask);
  zsSuiteTransition(state.state, state.detail, state);
  if (teamTask && ["done", "failed", "cancelled"].includes(teamTask.status)) {
    zsSuiteReleaseClaims(teamTask.id);
    const terminalKey = `${teamTask.id}:${teamTask.status}`;
    if (zsSuiteLastTaskTerminal !== terminalKey) {
      zsSuiteLastTaskTerminal = terminalKey;
      zsSuiteNotify(teamTask.status === "done" ? "ZeroScript task completed" : "ZeroScript task needs attention", `${teamTask.status.toUpperCase()} · ${String(teamTask.goal || "Task").slice(0, 160)}`);
    }
  }
  zsSuitePersist().catch(() => {});
}, 5000);

// Check once after startup, then every six hours. This only reports updates;
// unpacked Chrome extensions still require the user to pull/reload explicitly.
setTimeout(() => zsSuiteCheckUpdate().catch(() => {}), 10000);
setInterval(() => zsSuiteCheckUpdate().catch(() => {}), 6 * 60 * 60 * 1000);

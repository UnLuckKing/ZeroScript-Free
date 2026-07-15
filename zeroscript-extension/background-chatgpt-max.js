// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.35 ChatGPT Max mode.
// One ChatGPT session owns inspection, implementation, self-review and proof.

const ZS_CHATGPT_MAX_KEY = "zsChatGPTMax";
let zsChatGPTMax = {
  enabled: true,
  preferChatGPT: true,
  requireFreshEvidence: true,
  maxNudges: 2,
  nudgeAfterMs: 75_000,
  selectedModel: "",
  reasoning: "",
  detectedAt: 0,
  nudges: 0,
  lastNudgeAt: 0,
  lastTaskKey: "",
  lastActivityAt: 0,
  updatedAt: Date.now(),
};

chrome.storage.local.get(ZS_CHATGPT_MAX_KEY, (result) => {
  const saved = result && result[ZS_CHATGPT_MAX_KEY];
  if (saved && typeof saved === "object") zsChatGPTMax = { ...zsChatGPTMax, ...saved, enabled: true, preferChatGPT: true };
  zsChatGPTMaxPersist().catch(() => {});
});

function zsChatGPTMaxPersist() {
  zsChatGPTMax.updatedAt = Date.now();
  return chrome.storage.local.set({ [ZS_CHATGPT_MAX_KEY]: zsChatGPTMax });
}

function zsChatGPTMaxReady() {
  for (const [, agent] of teamAgents.entries()) {
    if (agent && agent.provider === "chatgpt" && agent.ready && !providerHealth.chatgpt) return true;
  }
  return false;
}

function zsChatGPTMaxProjectCapsule(goal = "") {
  const project = typeof zsAutomation !== "undefined" && zsAutomation && zsAutomation.activeProject || {};
  const productivity = typeof zsProductivity !== "undefined" && zsProductivity || {};
  const automation = typeof zsAutomation !== "undefined" && zsAutomation || {};
  const superior = typeof zsSuperior !== "undefined" && zsSuperior || {};
  const manager = typeof zsManager !== "undefined" && zsManager || {};
  const output = productivity.outputWatch || {};
  const genome = superior.genome || {};
  const memory = manager.memory || {};
  const reports = teamTask && Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports : [];
  const changed = memory.changedPaths || [];
  const errors = output.errors || automation.errorGroups || memory.outputErrors || [];
  const systems = genome.systems || [];
  const counts = genome.counts || {};

  const lines = [
    "PROJECT CAPSULE",
    `Project: ${project.name || "open Roblox place"}`,
    `PlaceId: ${project.placeId || "unknown"} · GameId: ${project.gameId || "unknown"}`,
    `Task: ${String(goal || "").slice(0, 1200)}`,
  ];
  if (counts && Object.keys(counts).length) lines.push(`Genome: ${counts.scripts || 0} scripts · ${counts.remotes || 0} remotes · ${counts.guis || 0} GUIs`);
  if (systems.length) lines.push(`Known systems: ${systems.slice(0, 24).join(", ")}`);
  if (changed.length) lines.push(`Recently changed paths: ${changed.slice(-18).join(", ")}`);
  if (errors.length) {
    const values = errors.slice(-10).map((item) => String(item.line || item.detail || item.message || item).slice(0, 240));
    lines.push(`Current Output signals:\n${values.map((value) => `- ${value}`).join("\n")}`);
  }
  if (reports.length) {
    const values = reports.slice(-3).map((item) => `${item.phase || "work"}/${item.provider || "AI"}: ${String(item.report || "").slice(0, 900)}`);
    lines.push(`Verified recent reports:\n${values.map((value) => `- ${value}`).join("\n")}`);
  }
  lines.push("Treat this capsule as navigation context only. Inspect the actual Studio state before editing.");
  return lines.join("\n").slice(0, 6500);
}

function zsChatGPTMaxContract(goal) {
  const visual = /\b(ui|gui|hud|menu|panel|button|mobile|responsive|visual|vfx|map|world|lighting|arayüz|buton|harita)\b/i.test(String(goal || ""));
  const critical = /datastore|processreceipt|purchase|gamepass|developer product|remote|currency|reward|save|load|veri|satın|güvenlik|security/i.test(String(goal || ""));
  return `CHATGPT MAX EXECUTION CONTRACT
- You are the only implementation owner. Do not delegate to Analyst, Reviewer, QA, UI or Map agents.
- Start using Roblox Studio tools quickly; do not spend the turn writing a long plan.
- Inspect only relevant paths. Use the project capsule and exact Studio state to avoid broad rescans.
- Complete implementation, UI/server wiring, self-review, playtest, Output inspection and verified fixes in this same pass.
- Preserve working systems, public remotes and compatible player-data formats.
- Prefer a small complete solution over feature sprawl or a broad rewrite.
- Re-read a script only after it changed or when a concrete failure requires it.
- Stop when acceptance criteria pass; do not add unrelated systems.
${visual ? "- For visual work, verify desktop and mobile layout, readable text, safe areas and every changed button in Play mode." : ""}
${critical ? "- Keep purchases, rewards, remotes and persistence server-authoritative; test invalid and duplicate requests without destructive live-data tests." : ""}

FAST PROOF
- List CHANGED_PATHS.
- Include concrete TEST_EVIDENCE from Play mode.
- Include OUTPUT_ERRORS, using [] when clean.
- Perform your own final review before answering.
- End TEAM_VERDICT: PASS only when the requested result really works.`;
}

const zsChatGPTMaxCoreProviderOrder = typeof zsSoloProviderOrder === "function" ? zsSoloProviderOrder : null;
if (zsChatGPTMaxCoreProviderOrder) {
  zsSoloProviderOrder = function zsChatGPTFirstOrder(goal) {
    const base = zsChatGPTMaxCoreProviderOrder(goal);
    if (!zsChatGPTMax.enabled || !zsChatGPTMax.preferChatGPT) return base;
    return ["chatgpt", ...base.filter((name) => name !== "chatgpt")];
  };
}

const zsChatGPTMaxCoreReady = typeof zsWorkbenchReadyProviders === "function" ? zsWorkbenchReadyProviders : null;
if (zsChatGPTMaxCoreReady) {
  zsWorkbenchReadyProviders = function zsChatGPTFirstReady() {
    const base = zsChatGPTMaxCoreReady();
    if (!zsChatGPTMax.enabled || !zsChatGPTMax.preferChatGPT) return base;
    return [...base].sort((a, b) => (a === "chatgpt" ? -1 : b === "chatgpt" ? 1 : 0));
  };
}

const zsChatGPTMaxCoreGoal = typeof zsWorkbenchGoal === "function" ? zsWorkbenchGoal : null;
if (zsChatGPTMaxCoreGoal) {
  zsWorkbenchGoal = function zsChatGPTMaxGoal(goal) {
    const base = zsChatGPTMaxCoreGoal(goal);
    if (!zsChatGPTMax.enabled) return base;
    return `${base}\n\n${zsChatGPTMaxContract(goal)}\n\n${zsChatGPTMaxProjectCapsule(goal)}`;
  };
}

const zsChatGPTMaxCorePhaseProvider = phaseProvider;
phaseProvider = function zsChatGPTMaxPhaseProvider(phase) {
  if (zsChatGPTMax.enabled && teamTask && teamTask.workbench && zsChatGPTMaxReady()) {
    teamTask.soloProvider = "chatgpt";
    if (typeof zsSolo !== "undefined" && zsSolo) zsSolo.selectedProvider = "chatgpt";
    return "chatgpt";
  }
  return zsChatGPTMaxCorePhaseProvider(phase);
};

const zsChatGPTMaxCorePhasePrompt = phasePrompt;
phasePrompt = function zsChatGPTMaxPhasePrompt(task) {
  const base = zsChatGPTMaxCorePhasePrompt(task);
  if (!zsChatGPTMax.enabled || !task || !task.workbench) return base;
  const detected = [zsChatGPTMax.selectedModel, zsChatGPTMax.reasoning].filter(Boolean).join(" · ") || "model not detected";
  return `${base}\n\n${zsChatGPTMaxContract(task.originalGoal || task.goal)}\n\nCHATGPT SESSION\nDetected: ${detected}\nUse the strongest reasoning level already selected in ChatGPT. Do not waste time discussing model choice.\n\n${zsChatGPTMaxProjectCapsule(task.originalGoal || task.goal)}`;
};

function zsChatGPTMaxPublic() {
  return {
    enabled: zsChatGPTMax.enabled,
    preferChatGPT: zsChatGPTMax.preferChatGPT,
    selectedModel: zsChatGPTMax.selectedModel,
    reasoning: zsChatGPTMax.reasoning,
    detectedAt: zsChatGPTMax.detectedAt,
    nudges: zsChatGPTMax.nudges,
    ready: zsChatGPTMaxReady(),
    updatedAt: zsChatGPTMax.updatedAt,
  };
}

const zsChatGPTMaxCoreTeamObj = teamObj;
teamObj = function zsChatGPTMaxTeamObj() {
  return { ...zsChatGPTMaxCoreTeamObj(), chatgptMax: zsChatGPTMaxPublic() };
};

const zsChatGPTMaxCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsChatGPTMaxStatusPayload() {
  const payload = zsChatGPTMaxCoreStatusPayload();
  payload.chatgptMax = zsChatGPTMaxPublic();
  return payload;
};

async function zsChatGPTMaxBroadcast(message) {
  const tabs = await chrome.tabs.query({ url: "https://chatgpt.com/*" }).catch(() => []);
  for (const tab of tabs || []) {
    if (tab.id == null) continue;
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
  return (tabs || []).length;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;
  if (message.type === "zs-chatgpt-capability") {
    zsChatGPTMax.selectedModel = String(message.model || "").slice(0, 120);
    zsChatGPTMax.reasoning = String(message.reasoning || "").slice(0, 80);
    zsChatGPTMax.detectedAt = Date.now();
    zsChatGPTMaxPersist().catch(() => {});
    broadcastTeam();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === "zs-chatgpt-max-status") {
    sendResponse({ ok: true, chatgptMax: zsChatGPTMaxPublic() });
    return false;
  }
  if (message.type === "zs-chatgpt-max-config") {
    zsChatGPTMax.enabled = message.enabled !== false;
    zsChatGPTMax.preferChatGPT = message.preferChatGPT !== false;
    zsChatGPTMaxPersist().catch(() => {});
    broadcastTeam();
    sendResponse({ ok: true, chatgptMax: zsChatGPTMaxPublic() });
    return false;
  }
  return false;
});

setInterval(() => {
  if (!zsChatGPTMax.enabled || !teamTask || !teamTask.workbench || teamTask.status !== "running") {
    zsChatGPTMax.lastTaskKey = "";
    return;
  }
  const provider = String(teamTask.provider || teamTask.soloProvider || "");
  if (provider !== "chatgpt") return;
  const key = `${teamTask.id}:${teamTask.phase || "builder"}`;
  if (key !== zsChatGPTMax.lastTaskKey) {
    zsChatGPTMax.lastTaskKey = key;
    zsChatGPTMax.nudges = 0;
    zsChatGPTMax.lastNudgeAt = 0;
    zsChatGPTMax.lastActivityAt = Date.now();
    zsChatGPTMaxPersist().catch(() => {});
    return;
  }

  const reports = Array.isArray(teamTask.sharedReports) ? teamTask.sharedReports.length : 0;
  const signature = `${!!writerLease}:${reports}:${String(teamTask.lastReport || "").length}:${Number(teamTask.updatedAt || 0)}`;
  if (signature !== zsChatGPTMax._activitySignature) {
    zsChatGPTMax._activitySignature = signature;
    zsChatGPTMax.lastActivityAt = Date.now();
  }
  const idle = Date.now() - Number(zsChatGPTMax.lastActivityAt || Date.now());
  if (writerLease || idle < Number(zsChatGPTMax.nudgeAfterMs || 75_000)) return;
  if (zsChatGPTMax.nudges >= Number(zsChatGPTMax.maxNudges || 2)) return;
  if (Date.now() - Number(zsChatGPTMax.lastNudgeAt || 0) < 55_000) return;

  zsChatGPTMax.nudges += 1;
  zsChatGPTMax.lastNudgeAt = Date.now();
  zsChatGPTMax.lastActivityAt = Date.now();
  zsChatGPTMaxPersist().catch(() => {});
  zsChatGPTMaxBroadcast({
    type: "zs-chatgpt-max-nudge",
    attempt: zsChatGPTMax.nudges,
    taskId: teamTask.id,
    prompt: `Continue the active ZeroScript task now. Do not explain or re-plan. Inspect the exact relevant Studio path, use Roblox tools immediately, implement the remaining work, playtest it, read Output, fix verified blockers, and finish with CHANGED_PATHS, TEST_EVIDENCE, OUTPUT_ERRORS and TEAM_VERDICT.\n\n${zsChatGPTMaxProjectCapsule(teamTask.originalGoal || teamTask.goal)}`,
  }).catch(() => {});
  if (typeof zsWorkbenchAdd === "function") zsWorkbenchAdd("warn", "ChatGPT tekrar harekete geçirildi", `${zsChatGPTMax.nudges}/${zsChatGPTMax.maxNudges}`);
}, 5000);

// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.26 speed and workflow pack.
// Keeps the existing safety/checkpoint systems while removing repeated startup
// work, reusing provider tabs, and selecting a smaller workflow for small tasks.

const ZS_SPEED_AUDIT_CACHE_MS = 5 * 60 * 1000;
const ZS_SPEED_READY_CACHE_MS = 15 * 1000;
const ZS_SPEED_PROVIDER_PATTERNS = {
  deepseek: ["https://chat.deepseek.com/*"],
  gemini: ["https://gemini.google.com/*"],
  qwen: ["https://chat.qwen.ai/*"],
  kimi: ["https://www.kimi.com/*", "https://kimi.com/*"],
  glm: ["https://chat.z.ai/*"],
  arena: ["https://arena.ai/*"],
  chatgpt: ["https://chatgpt.com/*"],
  claude: ["https://claude.ai/*"],
  copilot: ["https://copilot.microsoft.com/*"],
  mistral: ["https://chat.mistral.ai/*"],
};

let zsSpeedReadyAt = 0;
let zsSpeedDecision = {
  requested: "balanced",
  effective: "balanced",
  reason: "Default quality mode",
  highRisk: false,
  inspection: false,
  tiny: false,
  checkedAt: Date.now(),
};
const zsSpeedProviderInflight = new Map();

function zsSpeedGoalInfo(goal, requestedMode) {
  const text = String(goal || "").trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const release = /release manager|prepare.*release|production[- ]ready|publish|yayın|yayına|tüm proje|entire project|complete project|her şeyi/i.test(lower);
  const security = /security|exploit|remoteevent|remotefunction|datastore|processreceipt|purchase|gamepass|developer product|currency|economy|dupe|güvenlik|veri kaybı|satın alma|ekonomi/i.test(lower);
  const destructive = /delete|remove all|replace entire|rewrite all|wipe|reset data|sil|hepsini kaldır|baştan yaz/i.test(lower);
  const inspection = /inspect only|audit only|without changing|do not change|sadece incele|değiştirmeden/i.test(lower);
  const ui = /\b(ui|gui|hud|menu|panel|button|mobile|responsive|text|label|inventory|shop|arayüz|buton|yazı)\b/i.test(lower);
  const map = /\b(map|world|terrain|lobby|lighting|spawn|zone|island|harita|dünya|ışıklandırma)\b/i.test(lower);
  const tinyHint = /\b(single|one|only|just|small|quick|fix|change|rename|küçük|tek|sadece|hızlı|düzelt|değiştir)\b/i.test(lower);
  const tiny = !release && !security && !destructive && (words <= 28 || (words <= 45 && tinyHint));
  const highRisk = release || security || destructive;

  let effective = requestedMode || "balanced";
  let reason = `User selected ${effective}`;
  if (effective === "auto") {
    if (release) {
      effective = "best";
      reason = "Release/full-project task needs full review and QA";
    } else if (highRisk) {
      effective = "balanced";
      reason = "Security, data, purchase, or destructive task needs guarded review";
    } else if (tiny) {
      effective = "turbo";
      reason = "Small targeted task can use one specialist with self-test";
    } else if (ui && map) {
      effective = "balanced";
      reason = "Combined map and UI work needs coordinated phases";
    } else {
      effective = "fast";
      reason = "Normal scoped task can use specialist plus QA";
    }
  } else if (effective === "turbo" && highRisk) {
    effective = "balanced";
    reason = "Turbo was automatically escalated because the task affects security, data, purchases, or release readiness";
  }

  return { requested: requestedMode || "balanced", effective, reason, highRisk, inspection, tiny, ui, map, release, checkedAt: Date.now() };
}

function zsSpeedPlanSteps(goal, phases) {
  const titles = {
    analyst: "Inspect only the relevant state",
    builder: "Implement the targeted gameplay/code change",
    map: "Implement the targeted world/map change",
    ui: "Implement the targeted responsive UI change",
    reviewer: "Independently review regressions",
    qa: "Playtest and check Output",
  };
  return {
    goal: String(goal || ""),
    phases,
    steps: phases.map((phase, index) => ({ id: `${index + 1}-${phase}`, phase, title: titles[phase] || phase, status: "pending" })),
    createdAt: Date.now(),
  };
}

const zsSpeedCoreSuitePublic = zsSuitePublic;
zsSuitePublic = function zsSuitePublicWithSpeed() {
  return { ...zsSpeedCoreSuitePublic(), speed: { ...zsSpeedDecision, auditCacheMs: ZS_SPEED_AUDIT_CACHE_MS, readinessCacheMs: ZS_SPEED_READY_CACHE_MS } };
};

const zsSpeedCoreApplyConfig = zsHubApplyConfig;
zsHubApplyConfig = async function zsHubApplySpeedConfig(payload) {
  const config = payload && typeof payload === "object" ? payload : {};
  if (["auto", "turbo"].includes(config.qualityMode)) zsSuite.qualityMode = config.qualityMode;
  await zsSpeedCoreApplyConfig(payload);
  if (zsSuite.qualityMode === "turbo") teamConfig.maxRepairRounds = 0;
  else if (zsSuite.qualityMode === "auto") teamConfig.maxRepairRounds = 2;
  await chrome.storage.local.set({ zsTeamConfig: teamConfig });
  await zsSuitePersist();
  broadcastTeam();
}

const zsSpeedCorePhasesForGoal = phasesForGoal;
phasesForGoal = function zsSpeedPhasesForGoal(goal) {
  const base = zsSpeedCorePhasesForGoal(goal);
  zsSpeedDecision = zsSpeedGoalInfo(goal, zsSuite.qualityMode);
  let phases = base;

  if (zsSpeedDecision.effective === "turbo") {
    if (zsSpeedDecision.inspection) phases = ["analyst"];
    else if (zsSpeedDecision.map && !zsSpeedDecision.ui) phases = ["map"];
    else if (zsSpeedDecision.ui) phases = ["ui"];
    else phases = ["builder"];
  } else if (zsSpeedDecision.effective === "fast") {
    if (zsSpeedDecision.inspection) phases = ["analyst", "qa"];
    else {
      const specialists = base.filter((phase) => ["builder", "map", "ui"].includes(phase));
      phases = [...new Set([...(specialists.length ? specialists : ["builder"]), "qa"])];
    }
  } else if (zsSpeedDecision.effective === "best") {
    phases = [...new Set(["analyst", ...base.filter((phase) => !["analyst", "reviewer", "qa"].includes(phase)), "reviewer", "qa"])];
  }

  if (typeof zsManager !== "undefined") zsManager.plan = zsSpeedPlanSteps(goal, phases);
  if (typeof zsSuiteLedger === "function") {
    zsSuiteLedger("speed_mode", `${zsSpeedDecision.requested} → ${zsSpeedDecision.effective}: ${zsSpeedDecision.reason}`, { phases });
  }
  return phases;
};

const zsSpeedCorePhasePrompt = phasePrompt;
phasePrompt = function zsSpeedPhasePrompt(task) {
  if (!task || task.performanceMode !== "turbo") return zsSpeedCorePhasePrompt(task);
  const previous = task.lastReport ? `\nPREVIOUS REPORT\n${String(task.lastReport).slice(0, 1800)}` : "";
  return `TEAM TASK ${task.id}\nGOAL\n${task.goal}\n\nPHASE: ${String(task.phase || "builder").toUpperCase()}\n\nWork directly in the currently connected Roblox Studio. Inspect only the instances/scripts relevant to this goal, preserve working APIs and server authority, make the smallest complete fix, and avoid unrelated redesign.${previous}\n\nMANDATORY FINISH\n- Trigger the changed path in Play mode when the task changes behavior.\n- Read Studio Output after the test.\n- Report exact changed paths and anything unresolved.\n- Include TEST_EVIDENCE: <what you actually triggered>.\n- Include OUTPUT_ERRORS: NONE or the exact remaining errors.\n- End with TEAM_VERDICT: PASS only after the targeted path is working.\n\nSAFETY\nNever bulk-delete core services or replace a working system without inspecting it first.`;
};

const zsSpeedCoreEnsureStudioReady = ensureStudioReadyForTask;
ensureStudioReadyForTask = async function zsSpeedEnsureStudioReady() {
  const cacheUsable = Date.now() - zsSpeedReadyAt < ZS_SPEED_READY_CACHE_MS
    && connected && mcpAlive && studioConnected === true && hasRobloxTool("execute_luau");
  if (cacheUsable) return { ok: true, cached: true };
  const result = await zsSpeedCoreEnsureStudioReady();
  if (result && result.ok) zsSpeedReadyAt = Date.now();
  return result;
};

function zsSpeedAuditReusable(decision) {
  return !decision.highRisk
    && projectAudit
    && projectAudit.status === "ready"
    && /^PREFLIGHT_OK:/.test(String(projectAudit.report || ""))
    && Date.now() - Number(projectAudit.scannedAt || 0) < ZS_SPEED_AUDIT_CACHE_MS;
}

async function zsSpeedRetirePausedTask(reason) {
  if (!teamTask || !["paused", "waiting"].includes(teamTask.status)) return false;
  teamTask.status = "cancelled";
  teamTask.error = reason || "Replaced by a new user task.";
  teamTask.updatedAt = Date.now();
  teamHistory.push({
    id: teamTask.id,
    goal: teamTask.goal,
    status: "cancelled",
    rounds: teamTask.round || 0,
    createdAt: teamTask.createdAt,
    completedAt: Date.now(),
    events: (teamTask.events || []).slice(-20),
  });
  teamHistory = teamHistory.slice(-50);
  writerLease = null;
  await chrome.storage.local.set({ zsTeamTask: teamTask, zsTeamHistory: teamHistory });
  return true;
}

startTeamTask = async function zsSpeedStartTeamTask(goal) {
  goal = String(goal || "").trim();
  if (!goal) return { ok: false, error: "Enter a goal first." };
  if (taskStarting) return { ok: false, error: "A task is already being prepared." };

  if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) {
    if (["paused", "waiting"].includes(teamTask.status)) await zsSpeedRetirePausedTask("Replaced by a new user task.");
    else return { ok: false, error: `Another task is already ${teamTask.status}. Stop it before starting a new one.`, team: teamObj() };
  }

  taskStarting = true;
  const startupAt = Date.now();
  const phases = phasesForGoal(goal);
  const decision = { ...zsSpeedDecision };
  teamTask = {
    id: `task-${Date.now()}`,
    goal,
    phases,
    phaseIndex: 0,
    phase: phases[0],
    status: "connecting",
    provider: null,
    round: 0,
    lastReport: "",
    error: "Checking Roblox Studio connection…",
    performanceMode: decision.effective,
    requestedQualityMode: decision.requested,
    speedReason: decision.reason,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ zsTeamTask: teamTask });
  broadcastTeam();

  try {
    const ready = await ensureStudioReadyForTask();
    if (!ready.ok) {
      teamTask.status = "waiting";
      teamTask.error = ready.error || "Roblox Studio is not ready.";
      teamTask.updatedAt = Date.now();
      await chrome.storage.local.set({ zsTeamTask: teamTask });
      broadcastTeam();
      return { ok: false, error: teamTask.error, team: teamObj() };
    }

    teamTask.status = "scanning";
    teamTask.error = ready.cached ? "Using recent Studio readiness; preparing safety checkpoint…" : null;
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    broadcastTeam();

    const checkpointPromise = decision.inspection
      ? Promise.resolve({ ok: true, id: null, skipped: true })
      : createCheckpoint(teamTask.id);
    const auditPromise = zsSpeedAuditReusable(decision)
      ? Promise.resolve({ ok: true, cached: true, audit: projectAudit })
      : scanAndPersistProject();

    const [checkpointResult, auditResult] = await Promise.allSettled([checkpointPromise, auditPromise]);
    const checkpoint = checkpointResult.status === "fulfilled" ? checkpointResult.value : { ok: false, error: String(checkpointResult.reason || "Checkpoint failed") };
    const audit = auditResult.status === "fulfilled" ? auditResult.value : { ok: false, audit: projectAudit, error: String(auditResult.reason || "Scan failed") };

    teamTask.checkpoint = checkpoint && checkpoint.ok ? checkpoint.id : null;
    if (checkpoint && !checkpoint.ok) teamTask.error = `Checkpoint warning: ${checkpoint.error}`;
    teamTask.auditReport = audit && audit.audit ? audit.audit.report : (projectAudit && projectAudit.report) || "PREFLIGHT_UNAVAILABLE";
    teamTask.auditCached = !!(audit && audit.cached);
    teamTask.startupTiming = {
      totalMs: Date.now() - startupAt,
      readinessCached: !!ready.cached,
      auditCached: !!teamTask.auditCached,
      checkpointSkipped: !!(checkpoint && checkpoint.skipped),
    };
    teamTask.status = "queued";
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    if (typeof zsSuiteLedger === "function") {
      zsSuiteLedger("startup", `Task prepared in ${teamTask.startupTiming.totalMs}ms · ${decision.effective} · audit ${teamTask.auditCached ? "cached" : "fresh"}`, teamTask.startupTiming);
    }
    broadcastTeam();
    dispatchTask();
    return { ok: true, team: teamObj() };
  } catch (error) {
    teamTask.status = "queued";
    teamTask.error = `Preflight skipped: ${String(error && error.message || error)}`;
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    broadcastTeam();
    dispatchTask();
    return { ok: true, warning: teamTask.error, team: teamObj() };
  } finally {
    taskStarting = false;
  }
};

function zsSpeedSendTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response || null);
    });
  });
}

async function zsSpeedReuseProvider(provider) {
  const readyAgent = [...teamAgents.entries()].find(([, agent]) => agent && agent.provider === provider && agent.ready);
  if (readyAgent) {
    const [tabId] = readyAgent;
    chrome.tabs.update(tabId, { active: true }).catch(() => {});
    return { tabId, provider, reused: true, alreadyReady: true };
  }

  const patterns = ZS_SPEED_PROVIDER_PATTERNS[provider];
  if (!patterns) return null;
  const tabs = await new Promise((resolve) => chrome.tabs.query({ url: patterns }, resolve));
  for (const tab of tabs || []) {
    if (tab.id == null) continue;
    let probe = await zsSpeedSendTab(tab.id, { type: "zs-provider-probe" });
    if (!probe || !probe.composer) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      probe = await zsSpeedSendTab(tab.id, { type: "zs-provider-probe" });
    }
    if (!probe || !probe.composer) continue;
    chrome.tabs.update(tab.id, { active: true }).catch(() => {});
    const start = probe.ready ? { ok: true, alreadyReady: true } : await zsSpeedSendTab(tab.id, { type: "zs-provider-auto-start" });
    if (typeof zsSuiteLedger === "function") zsSuiteLedger("prepare_reuse", `Reused existing ${provider} tab`, { provider, tabId: tab.id, ready: !!probe.ready });
    return { tabId: tab.id, provider, reused: true, probe, start: start || { ok: false } };
  }
  return null;
}

const zsSpeedCorePrepareProvider = zsSuitePrepareProvider;
zsSuitePrepareProvider = async function zsSpeedPrepareProvider(provider) {
  provider = String(provider || "").toLowerCase();
  if (zsSpeedProviderInflight.has(provider)) return zsSpeedProviderInflight.get(provider);
  const work = (async () => {
    const reused = await zsSpeedReuseProvider(provider);
    if (reused) return reused;
    return zsSpeedCorePrepareProvider(provider);
  })();
  zsSpeedProviderInflight.set(provider, work);
  try {
    return await work;
  } finally {
    zsSpeedProviderInflight.delete(provider);
  }
};

const zsSpeedCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsSpeedHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  if (action === "start_task" && teamTask && ["paused", "waiting"].includes(teamTask.status)) {
    await zsSpeedRetirePausedTask("Replaced from ZeroScript Hub by a new task.");
  }
  return zsSpeedCoreHubAction(item);
};

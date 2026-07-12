// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.28 automation pack: one-click diagnosis/repair, automatic task
// decomposition, hard time limits, instance-level scoped rollback, visual/UI and
// interaction test workflows, error grouping, project identity, notifications,
// context recovery, provider scorecards and emergency stop.

const ZS_AUTOMATION_KEY = "zsAutomationState";
const ZS_AUTOMATION_MAX_NOTICES = 80;
const ZS_AUTOMATION_MAX_PLANS = 20;

let zsAutomation = {
  version: 1,
  settings: {
    taskTimeoutMinutes: 20,
    maxTimeoutRecoveries: 2,
    autoDecomposeBroadTasks: false,
    autoContextClean: true,
    autoProfile: true,
    toolboxQuarantine: true,
    instanceRollback: true,
    visualEvidence: true,
    notificationCenter: true,
  },
  diagnosis: { status: "idle", checkedAt: 0, rows: [], fixesQueued: 0, detail: "" },
  plans: [],
  activeProject: null,
  notifications: [],
  errorGroups: [],
  context: { compactedAt: 0, summary: "", reason: "" },
  emergency: { lastAt: 0, detail: "" },
  instanceBackup: { latest: null, status: "idle", detail: "" },
  uiCompare: { status: "idle", lastAt: 0, detail: "" },
  updatedAt: Date.now(),
};
let zsAutomationLastTerminal = "";
let zsAutomationLastProjectProbe = 0;
let zsAutomationLastErrorCount = 0;

chrome.storage.local.get(ZS_AUTOMATION_KEY, (result) => {
  const saved = result && result[ZS_AUTOMATION_KEY];
  if (saved && typeof saved === "object") {
    zsAutomation = {
      ...zsAutomation,
      ...saved,
      settings: { ...zsAutomation.settings, ...(saved.settings || {}) },
      diagnosis: { ...zsAutomation.diagnosis, ...(saved.diagnosis || {}) },
      notifications: Array.isArray(saved.notifications) ? saved.notifications.slice(-ZS_AUTOMATION_MAX_NOTICES) : [],
      plans: Array.isArray(saved.plans) ? saved.plans.slice(-ZS_AUTOMATION_MAX_PLANS) : [],
      errorGroups: Array.isArray(saved.errorGroups) ? saved.errorGroups.slice(-40) : [],
      context: { ...zsAutomation.context, ...(saved.context || {}) },
      emergency: { ...zsAutomation.emergency, ...(saved.emergency || {}) },
      instanceBackup: { ...zsAutomation.instanceBackup, ...(saved.instanceBackup || {}) },
      uiCompare: { ...zsAutomation.uiCompare, ...(saved.uiCompare || {}) },
    };
  }
  broadcastTeam();
});

function zsAutomationPersist() {
  zsAutomation.updatedAt = Date.now();
  zsAutomation.notifications = (zsAutomation.notifications || []).slice(-ZS_AUTOMATION_MAX_NOTICES);
  zsAutomation.plans = (zsAutomation.plans || []).slice(-ZS_AUTOMATION_MAX_PLANS);
  zsAutomation.errorGroups = (zsAutomation.errorGroups || []).slice(-40);
  return chrome.storage.local.set({ [ZS_AUTOMATION_KEY]: zsAutomation });
}

function zsAutomationNotice(kind, title, detail = "", level = "info") {
  if (!zsAutomation.settings.notificationCenter) return;
  zsAutomation.notifications.push({
    id: `notice-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    at: Date.now(), kind, title: String(title || "").slice(0, 180),
    detail: String(detail || "").slice(0, 1200), level,
  });
  zsAutomationPersist().catch(() => {});
}

function zsAutomationProviderTable() {
  const stats = (typeof zsManager !== "undefined" && zsManager.stats) || {};
  return Object.entries(stats).map(([provider, stat]) => {
    const attempts = Number(stat.attempts || 0);
    const completed = Number(stat.completed || 0);
    return {
      provider,
      attempts,
      completed,
      failed: Number(stat.failed || 0),
      successRate: attempts ? Math.round(completed / attempts * 100) : 0,
      averageMs: attempts ? Math.round(Number(stat.totalMs || 0) / attempts) : 0,
      repairsRequested: Number(stat.repairsRequested || 0),
      toolErrors: Number(stat.toolErrors || 0),
      contextFailures: Number(stat.contextFailures || 0),
      phases: stat.phases || {},
      lastAt: Number(stat.lastAt || 0),
    };
  }).sort((a, b) => b.successRate - a.successRate || b.completed - a.completed || a.averageMs - b.averageMs);
}

function zsAutomationErrorSignature(line) {
  return String(line || "")
    .replace(/\b\d{2,}\b/g, "#")
    .replace(/0x[0-9a-f]+/gi, "0x#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)
    .toLowerCase();
}

function zsAutomationGroupErrors(errors) {
  const groups = new Map();
  for (const entry of errors || []) {
    const line = String(entry && (entry.line || entry.detail) || entry || "").trim();
    if (!line) continue;
    const signature = zsAutomationErrorSignature(line);
    const at = Number(entry && entry.at || Date.now());
    const current = groups.get(signature) || { signature, line: line.slice(0, 700), count: 0, firstAt: at, lastAt: at };
    current.count += 1;
    current.firstAt = Math.min(current.firstAt, at);
    current.lastAt = Math.max(current.lastAt, at);
    groups.set(signature, current);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt).slice(0, 40);
}

function zsAutomationIsBroad(goal) {
  return /complete|entire|full|all systems|production|release|komple|tamamını|her şeyi|tüm oyun|sıfırdan|baştan|sistem kur|geliştir/i.test(String(goal || ""));
}

function zsAutomationBuildPlan(goal) {
  const text = String(goal || "").trim();
  if (!text) throw new Error("Task goal is empty.");
  const lower = text.toLowerCase();
  const steps = [];
  const add = (title, taskGoal, qualityMode = "auto") => steps.push({ title, goal: taskGoal, qualityMode });
  add("Inspect current state", `Inspect the currently open Roblox experience for this goal without changing anything yet: ${text}. Identify exact dependencies, relevant paths, verified blockers, existing working APIs, and the shortest safe implementation order.`, "fast");
  if (/security|remote|exploit|datastore|purchase|receipt|currency|economy|güvenlik|veri|satın alma|ekonomi/i.test(lower)) {
    add("Secure server/data layer", `Implement and verify the server-authoritative, security, DataStore, purchase, reward, and economy work required by this goal: ${text}. Preserve compatible APIs and test malicious or failure inputs safely.`, "best");
  } else {
    add("Implement gameplay/code", `Implement the gameplay, server, client, and code changes required by this goal: ${text}. Preserve working systems and test the main path.`, "auto");
  }
  if (/map|world|terrain|lobby|lighting|spawn|zone|harita|dünya|ışık/i.test(lower)) {
    add("Build and verify world", `Implement only the map, world, spawn, lighting, navigation, and performance work required by this goal: ${text}. Preserve gameplay objects and playtest traversal.`, "auto");
  }
  if (/ui|gui|hud|menu|button|mobile|responsive|inventory|shop|upgrade|arayüz|buton/i.test(lower)) {
    add("Build and verify UI", `Implement only the player-facing UI and interaction work required by this goal: ${text}. Test desktop and mobile layouts and every changed button.`, "auto");
  }
  add("Regression and release test", `Run a focused regression test for the completed goal: ${text}. Playtest the main path, read Output, verify respawn and mobile behavior where relevant, and fix verified regressions before reporting evidence.`, "fast");
  return { id: `plan-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, goal: text, steps, createdAt: Date.now() };
}

function zsAutomationQueuePlan(plan) {
  let previous = null;
  const ids = [];
  for (const step of plan.steps || []) {
    const item = zsQueueAdd(step.goal, {
      qualityMode: step.qualityMode || "auto",
      priority: "normal",
      dependsOn: previous ? [previous] : [],
      source: "auto_plan",
    });
    ids.push(item.id);
    previous = item.id;
  }
  plan.queueIds = ids;
  plan.status = "queued";
  zsAutomation.plans.push(plan);
  zsAutomationPersist().catch(() => {});
  if (zsProductivity.queueRunning) setTimeout(() => zsQueueStartNext().catch(() => {}), 100);
  zsAutomationNotice("plan", "Görev otomatik parçalara ayrıldı", `${plan.steps.length} bağımlı görev kuyruğa eklendi.`);
  return plan;
}

function zsAutomationPublic() {
  return {
    version: zsAutomation.version,
    settings: zsAutomation.settings,
    diagnosis: zsAutomation.diagnosis,
    plans: zsAutomation.plans.slice(-8),
    activeProject: zsAutomation.activeProject,
    notifications: zsAutomation.notifications.slice(-30),
    errorGroups: zsAutomation.errorGroups.slice(0, 30),
    context: zsAutomation.context,
    emergency: zsAutomation.emergency,
    instanceBackup: zsAutomation.instanceBackup,
    uiCompare: zsAutomation.uiCompare,
    providerTable: zsAutomationProviderTable(),
    updatedAt: zsAutomation.updatedAt,
  };
}

const zsAutomationCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithAutomation() {
  return { ...zsAutomationCoreTeamObj(), automation: zsAutomationPublic() };
};

async function zsAutomationProjectProbe(force = false) {
  if (!force && Date.now() - zsAutomationLastProjectProbe < 60000) return zsAutomation.activeProject;
  zsAutomationLastProjectProbe = Date.now();
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool || !connected || studioConnected === false || writerLease) return zsAutomation.activeProject;
  const code = `local HttpService=game:GetService("HttpService") return "PROJECT_ID:"..HttpService:JSONEncode({placeId=game.PlaceId,gameId=game.GameId,name=game.Name})`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 12000 }, 18000);
  const match = result && result.ok && /PROJECT_ID:(\{[\s\S]*\})/.exec(String(result.text || ""));
  if (!match) return zsAutomation.activeProject;
  try {
    const identity = JSON.parse(match[1]);
    const previous = zsAutomation.activeProject && `${zsAutomation.activeProject.placeId}:${zsAutomation.activeProject.gameId}`;
    zsAutomation.activeProject = { ...identity, detectedAt: Date.now(), key: `${identity.placeId || 0}:${identity.gameId || 0}` };
    if (previous && previous !== zsAutomation.activeProject.key) zsAutomationNotice("project", "Açık Roblox oyunu değişti", zsAutomation.activeProject.name || zsAutomation.activeProject.key);
    await zsAutomationPersist();
    broadcastTeam();
  } catch {}
  return zsAutomation.activeProject;
}

async function zsAutomationDiagnoseAndFix() {
  if (zsAutomation.diagnosis.status === "running") return zsAutomation.diagnosis;
  zsAutomation.diagnosis = { status: "running", checkedAt: Date.now(), rows: [], fixesQueued: 0, detail: "Bağlantı ve proje kontrol ediliyor." };
  await zsAutomationPersist(); broadcastTeam();
  try {
    const doctor = typeof runConnectionDoctor === "function" ? await runConnectionDoctor({ repair: true }) : { ok: true, rows: [] };
    if (typeof zsSuiteProbeProviders === "function") await zsSuiteProbeProviders().catch(() => {});
    if (doctor.ok && typeof scanAndPersistProject === "function") await scanAndPersistProject().catch(() => {});
    if (doctor.ok && typeof zsBuildProjectIndex === "function") await zsBuildProjectIndex().catch(() => {});
    if (doctor.ok && typeof zsOutputWatchTick === "function") await zsOutputWatchTick().catch(() => {});

    const rows = Array.isArray(doctor.rows) ? doctor.rows.slice() : [];
    const warnings = typeof parseAuditWarnings === "function" ? parseAuditWarnings() : [];
    const outputErrors = zsProductivity && zsProductivity.outputWatch ? (zsProductivity.outputWatch.errors || []) : [];
    let fixesQueued = 0;
    const warningKinds = new Set(warnings.map((entry) => entry.kind));
    if (["remote_validation", "datastore_set", "client_trust"].some((kind) => warningKinds.has(kind))) {
      zsQueueAdd("Fix the verified RemoteEvent, DataStore, purchase, reward, currency, and client-trust warnings from the latest project audit. Preserve working APIs, use server-authoritative validation and UpdateAsync where appropriate, then test the affected flows.", { qualityMode: "best", priority: "high", source: "diagnose_fix" });
      fixesQueued += 1;
    }
    if (["empty_script", "tight_loop", "missing_server"].some((kind) => warningKinds.has(kind))) {
      zsQueueAdd("Fix the verified runtime/code health warnings from the latest project audit. Reproduce each issue, change only the root cause, playtest the affected path, and confirm Output is clean.", { qualityMode: "auto", priority: "high", source: "diagnose_fix" });
      fixesQueued += 1;
    }
    if (warningKinds.has("safe_area")) {
      zsQueueAdd("Fix the verified mobile safe-area and responsive UI warnings from the latest audit. Test desktop and mobile layouts and all changed navigation buttons.", { qualityMode: "auto", priority: "normal", source: "diagnose_fix" });
      fixesQueued += 1;
    }
    if (outputErrors.length) {
      const grouped = zsAutomationGroupErrors(outputErrors).slice(0, 10);
      zsQueueAdd(`Reproduce and fix these grouped Studio Output errors at their root cause, then replay the affected paths and confirm Output is clean:\n${grouped.map((entry) => `- ${entry.line} (${entry.count}x)`).join("\n")}`, { qualityMode: "auto", priority: "high", source: "diagnose_fix" });
      fixesQueued += 1;
    }
    zsAutomation.diagnosis = {
      status: doctor.ok ? (fixesQueued ? "fixes_queued" : "ready") : "blocked",
      checkedAt: Date.now(), rows, fixesQueued,
      detail: doctor.ok ? (fixesQueued ? `${fixesQueued} doğrulanmış düzeltme görevi kuyruğa eklendi.` : "Bağlantı ve taramalarda otomatik düzeltilecek doğrulanmış engel bulunmadı.") : doctor.summary,
    };
    if (fixesQueued && zsProductivity.queueRunning) setTimeout(() => zsQueueStartNext().catch(() => {}), 100);
    zsAutomationNotice("diagnosis", "Otomatik kontrol tamamlandı", zsAutomation.diagnosis.detail, doctor.ok ? "info" : "warning");
  } catch (error) {
    zsAutomation.diagnosis = { status: "error", checkedAt: Date.now(), rows: [], fixesQueued: 0, detail: String(error && error.message || error) };
    zsAutomationNotice("diagnosis", "Otomatik kontrol başarısız", zsAutomation.diagnosis.detail, "error");
  }
  await zsAutomationPersist(); broadcastTeam();
  return zsAutomation.diagnosis;
}

function zsAutomationScopes(goal) {
  const text = String(goal || "").toLowerCase();
  const scopes = new Set();
  const full = /release|complete|entire|full|komple|tüm oyun|her şeyi/.test(text);
  if (full || /ui|gui|hud|menu|button|mobile|arayüz|buton/.test(text)) { scopes.add("StarterGui"); scopes.add("StarterPlayer"); }
  if (full || /map|world|terrain|lighting|spawn|harita|dünya|ışık/.test(text)) { scopes.add("Workspace"); scopes.add("Lighting"); }
  if (full || !scopes.size || /script|code|server|remote|datastore|purchase|economy|kod|sunucu|veri|ekonomi/.test(text)) { scopes.add("ServerScriptService"); scopes.add("ReplicatedStorage"); scopes.add("StarterPlayer"); }
  return [...scopes];
}

async function zsAutomationAttachInstanceBackup(checkpointId) {
  if (!zsAutomation.settings.instanceRollback || !checkpointId || !teamTask) return { ok: false, skipped: true };
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool || !connected || studioConnected === false) return { ok: false, error: "Studio unavailable" };
  const scopes = zsAutomationScopes(teamTask.goal);
  const code = `local ServerStorage=game:GetService("ServerStorage")
local HttpService=game:GetService("HttpService")
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(checkpointId)}) if not cp then return "INSTANCE_BACKUP_ERROR:no checkpoint" end
local old=cp:FindFirstChild("InstanceBackup") if old then old:Destroy() end
local backup=Instance.new("Folder") backup.Name="InstanceBackup" backup.Parent=cp backup:SetAttribute("ScopesJson",HttpService:JSONEncode(HttpService:JSONDecode(${JSON.stringify(JSON.stringify(scopes))})))
local saved,skipped=0,0
for _,serviceName in HttpService:JSONDecode(${JSON.stringify(JSON.stringify(scopes))}) do
 local ok,service=pcall(function() return game:GetService(serviceName) end)
 if ok and service then
  local count=#service:GetDescendants()
  local bucket=Instance.new("Folder") bucket.Name=serviceName bucket.Parent=backup bucket:SetAttribute("OriginalDescendants",count)
  if count<=7000 then
   for _,child in service:GetChildren() do
    if child.Name~="ZeroScriptCheckpoints" and not child:IsA("Terrain") and not child:IsA("Player") then
     local arch=child.Archivable local setOk=pcall(function() child.Archivable=true end)
     local cloneOk,clone=pcall(function() return child:Clone() end)
     if setOk then pcall(function() child.Archivable=arch end) end
     if cloneOk and clone then clone.Parent=bucket saved+=1 else skipped+=1 end
    end
   end
   if serviceName=="Lighting" then
    bucket:SetAttribute("Brightness",service.Brightness) bucket:SetAttribute("ClockTime",service.ClockTime) bucket:SetAttribute("ExposureCompensation",service.ExposureCompensation)
    bucket:SetAttribute("GlobalShadows",service.GlobalShadows) bucket:SetAttribute("Ambient",tostring(service.Ambient)) bucket:SetAttribute("OutdoorAmbient",tostring(service.OutdoorAmbient))
   end
   bucket:SetAttribute("Complete",true)
  else bucket:SetAttribute("Complete",false) bucket:SetAttribute("SkipReason","scope too large") skipped+=1 end
 end
end
backup:SetAttribute("SavedTopLevel",saved) backup:SetAttribute("Skipped",skipped) backup:SetAttribute("CreatedAt",os.time())
return "INSTANCE_BACKUP_OK:"..saved..":skipped="..skipped`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 90000 }, 100000);
  const ok = !!(result && result.ok && /INSTANCE_BACKUP_OK:/.test(String(result.text || "")));
  zsAutomation.instanceBackup = { latest: checkpointId, status: ok ? "saved" : "error", detail: String(result && (result.text || result.error) || "Instance backup failed"), scopes, at: Date.now() };
  await zsAutomationPersist(); broadcastTeam();
  return { ok, detail: zsAutomation.instanceBackup.detail };
}

async function zsAutomationRestoreInstanceBackup(checkpointId) {
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!checkpointId || !tool || !connected || studioConnected === false) return { ok: false, error: "No checkpoint or Studio connection." };
  const code = `local ServerStorage=game:GetService("ServerStorage")
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(checkpointId)}) local backup=cp and cp:FindFirstChild("InstanceBackup") if not backup then return "INSTANCE_RESTORE_SKIP:no instance backup" end
local restored,skipped=0,0
for _,bucket in backup:GetChildren() do
 if bucket:IsA("Folder") and bucket:GetAttribute("Complete")==true then
  local ok,service=pcall(function() return game:GetService(bucket.Name) end)
  if ok and service then
   for _,child in service:GetChildren() do if child.Name~="ZeroScriptCheckpoints" and not child:IsA("Terrain") and not child:IsA("Player") then child:Destroy() end end
   for _,child in bucket:GetChildren() do local cloneOk,clone=pcall(function() return child:Clone() end) if cloneOk and clone then clone.Parent=service restored+=1 else skipped+=1 end end
   if bucket.Name=="Lighting" then
    pcall(function() service.Brightness=bucket:GetAttribute("Brightness") service.ClockTime=bucket:GetAttribute("ClockTime") service.ExposureCompensation=bucket:GetAttribute("ExposureCompensation") service.GlobalShadows=bucket:GetAttribute("GlobalShadows") end)
   end
  end
 end
end
pcall(function() game:GetService("ChangeHistoryService"):SetWaypoint("ZeroScript instance rollback ${checkpointId}") end)
return "INSTANCE_RESTORE_OK:"..restored..":skipped="..skipped`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 120000 }, 130000);
  const ok = !!(result && result.ok && /INSTANCE_RESTORE_OK:/.test(String(result.text || "")));
  zsAutomation.instanceBackup = { ...zsAutomation.instanceBackup, latest: checkpointId, status: ok ? "restored" : "error", detail: String(result && (result.text || result.error) || "Instance restore failed"), at: Date.now() };
  await zsAutomationPersist(); broadcastTeam();
  return { ok, detail: zsAutomation.instanceBackup.detail };
}

const zsAutomationCoreCreateCheckpoint = createCheckpoint;
createCheckpoint = async function zsCheckpointWithInstances(id) {
  const result = await zsAutomationCoreCreateCheckpoint(id);
  if (result && result.ok && zsAutomation.settings.instanceRollback) await zsAutomationAttachInstanceBackup(id).catch(() => {});
  return result;
};

const zsAutomationCoreRestoreCheckpoint = restoreCheckpoint;
restoreCheckpoint = async function zsRollbackWithInstances(id) {
  const core = await zsAutomationCoreRestoreCheckpoint(id);
  const extra = await zsAutomationRestoreInstanceBackup(id).catch((error) => ({ ok: false, error: String(error) }));
  return { ...core, instanceRestore: extra, ok: !!(core && core.ok) || !!extra.ok };
};

const zsAutomationCorePhasePrompt = phasePrompt;
phasePrompt = function zsAutomationPrompt(task) {
  let prompt = zsAutomationCorePhasePrompt(task);
  if (zsAutomation.settings.toolboxQuarantine && /toolbox|marketplace|creator store|asset|model|map|lobby/i.test(String(task && task.goal || ""))) {
    prompt += `\n\nASSET QUARANTINE\nAny external/Toolbox asset must first be placed under ServerStorage.ZeroScriptQuarantine or another isolated container. Inspect all descendants for Script/LocalScript/ModuleScript, require/HTTP/loadstring/obfuscation, hidden remotes, admin systems, excessive physics and duplicate services. Move only verified-clean content into the live game and report removed scripts.`;
  }
  if (zsAutomation.settings.visualEvidence && /ui|gui|hud|mobile|map|lighting|visual|arayüz/i.test(String(task && task.goal || ""))) {
    prompt += `\n\nVISUAL EVIDENCE\nCapture the relevant view before and after when screen_capture is available. Check desktop and mobile-safe layout, visible text, overlap, contrast, navigation and obvious regressions. Do not claim a visual pass without actual captures or clearly state the unavailable user-only step.`;
  }
  if (zsAutomation.context.summary) prompt += `\n\nRECOVERED COMPACT CONTEXT\n${String(zsAutomation.context.summary).slice(0, 2200)}`;
  return prompt;
};

function zsAutomationCompactContext(reason = "manual") {
  const manager = typeof zsManager !== "undefined" ? zsManager : null;
  const memory = manager && manager.memory || {};
  const task = teamTask || {};
  const lines = [
    `Goal: ${String(task.goal || "No active goal").slice(0, 900)}`,
    `Phase: ${task.phase || "-"} · Provider: ${task.provider || "-"}`,
    `Changed: ${(memory.changedPaths || []).slice(-15).join(", ") || "none recorded"}`,
    `Verified: ${(memory.verified || []).slice(-10).join(" | ") || "none recorded"}`,
    `Remaining: ${(memory.remaining || []).slice(-10).join(" | ") || "none recorded"}`,
    `Output: ${(memory.outputErrors || []).slice(-6).join(" | ") || "none recorded"}`,
  ];
  zsAutomation.context = { compactedAt: Date.now(), reason, summary: lines.join("\n") };
  zsAutomationPersist().catch(() => {}); broadcastTeam();
  zsAutomationNotice("context", "Context özeti hazırlandı", reason);
  return zsAutomation.context;
}

async function zsAutomationEmergencyStop() {
  zsProductivity.queueRunning = false;
  if (typeof zsStudioPanelBroadcastStop === "function") await zsStudioPanelBroadcastStop().catch(() => {});
  for (const [id, item] of pending || []) {
    try { clearTimeout(item.timer); item.resolve({ ok: false, kind: "stopped", error: "Emergency stop" }); } catch {}
    pending.delete(id);
  }
  writerLease = null;
  if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) {
    teamTask.status = "cancelled";
    teamTask.error = "Emergency stop requested from ZeroScript Hub.";
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
  }
  zsAutomation.emergency = { lastAt: Date.now(), detail: "Models stopped, writer lock released, pending tool waits cancelled, and task queue paused." };
  await zsProductivityPersist(); await zsAutomationPersist(); broadcastTeam();
  zsAutomationNotice("emergency", "HER ŞEY DURDURULDU", zsAutomation.emergency.detail, "warning");
  return { ok: true };
}

function zsAutomationWorkflowGoal(action) {
  const goals = {
    visual_ui_compare: "Perform a before/after visual regression audit of the current player-facing UI. Capture desktop and mobile views before edits, test navigation and visible states, fix verified overflow, overlap, unreadable text, safe-area, contrast, scaling and broken-window issues, capture the same views afterward, compare them explicitly, and report screenshot-based evidence.",
    button_test: "Enumerate every reachable TextButton, ImageButton, ProximityPrompt and ClickDetector in the current main gameplay path. In Play mode trigger each safely, verify expected visible/server result, close/reopen windows, detect dead or double-firing controls, fix verified defects, then repeat the full interaction list and read Output.",
    remote_fuzzer: "Run a safe server-authority test against current RemoteEvents and RemoteFunctions. Inspect handlers first, then test wrong types, nils, negative and oversized numbers, invalid item IDs, rapid repeated calls, unauthorized ownership and duplicate purchase/reward attempts without touching production data. Fix only verified validation/rate-limit/idempotency issues and report exact evidence.",
    instance_rollback_test: "Verify the latest ZeroScript checkpoint and instance-level rollback safely. Inspect the checkpoint scope, make a harmless temporary scoped change only when safe, restore it, confirm UI/map/script structure and properties return, then read Output. Do not alter production player data.",
    auto_profile_setup: "Inspect the currently open Roblox place identity and summarize the best ZeroScript routing, quality, safety and regression settings for this specific game profile. Do not change gameplay.",
  };
  return goals[action] || "";
}

const zsAutomationCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsAutomationHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "diagnose_fix") { await zsAutomationDiagnoseAndFix(); return; }
  if (action === "decompose_task") { zsAutomationQueuePlan(zsAutomationBuildPlan(payload.goal)); return; }
  if (action === "set_automation") {
    const next = payload.settings && typeof payload.settings === "object" ? payload.settings : payload;
    zsAutomation.settings = {
      ...zsAutomation.settings,
      taskTimeoutMinutes: Math.max(5, Math.min(180, Number(next.taskTimeoutMinutes || zsAutomation.settings.taskTimeoutMinutes))),
      maxTimeoutRecoveries: Math.max(0, Math.min(4, Number(next.maxTimeoutRecoveries ?? zsAutomation.settings.maxTimeoutRecoveries))),
      autoDecomposeBroadTasks: typeof next.autoDecomposeBroadTasks === "boolean" ? next.autoDecomposeBroadTasks : zsAutomation.settings.autoDecomposeBroadTasks,
      autoContextClean: typeof next.autoContextClean === "boolean" ? next.autoContextClean : zsAutomation.settings.autoContextClean,
      autoProfile: typeof next.autoProfile === "boolean" ? next.autoProfile : zsAutomation.settings.autoProfile,
      toolboxQuarantine: typeof next.toolboxQuarantine === "boolean" ? next.toolboxQuarantine : zsAutomation.settings.toolboxQuarantine,
      instanceRollback: typeof next.instanceRollback === "boolean" ? next.instanceRollback : zsAutomation.settings.instanceRollback,
      visualEvidence: typeof next.visualEvidence === "boolean" ? next.visualEvidence : zsAutomation.settings.visualEvidence,
      notificationCenter: typeof next.notificationCenter === "boolean" ? next.notificationCenter : zsAutomation.settings.notificationCenter,
    };
    await zsAutomationPersist(); broadcastTeam(); return;
  }
  if (action === "context_compact") { zsAutomationCompactContext("manual Hub request"); return; }
  if (action === "emergency_stop") { await zsAutomationEmergencyStop(); return; }
  if (action === "clear_notifications") { zsAutomation.notifications = []; await zsAutomationPersist(); broadcastTeam(); return; }
  if (action === "clear_error_groups") {
    zsAutomation.errorGroups = [];
    if (zsProductivity && zsProductivity.outputWatch) zsProductivity.outputWatch.errors = [];
    await zsProductivityPersist(); await zsAutomationPersist(); broadcastTeam(); return;
  }
  if (action === "restore_instances") { await restoreCheckpoint(payload.id || checkpointState.latest); return; }
  const workflow = zsAutomationWorkflowGoal(action);
  if (workflow) {
    if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) zsQueueAdd(workflow, { qualityMode: "auto", priority: "high", source: action });
    else await startTeamTask(workflow);
    return;
  }
  if (action === "start_task" && zsAutomation.settings.autoDecomposeBroadTasks && zsAutomationIsBroad(payload.goal)) {
    zsAutomationQueuePlan(zsAutomationBuildPlan(payload.goal));
    return;
  }
  return zsAutomationCoreHubAction(item);
};

const zsAutomationCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsStatusWithAutomation() {
  const payload = zsAutomationCoreStatusPayload();
  payload.automation = zsAutomationPublic();
  return payload;
};

setInterval(() => {
  const errors = zsProductivity && zsProductivity.outputWatch ? (zsProductivity.outputWatch.errors || []) : [];
  zsAutomation.errorGroups = zsAutomationGroupErrors(errors);
  if (errors.length > zsAutomationLastErrorCount) {
    zsAutomationNotice("output", `${errors.length - zsAutomationLastErrorCount} yeni Output hatası`, zsAutomation.errorGroups[0] && zsAutomation.errorGroups[0].line || "Studio Output changed", "warning");
  }
  zsAutomationLastErrorCount = errors.length;

  if (teamTask && ["done", "failed", "cancelled"].includes(teamTask.status)) {
    const key = `${teamTask.id}:${teamTask.status}`;
    if (key !== zsAutomationLastTerminal) {
      zsAutomationLastTerminal = key;
      zsAutomationNotice("task", `Görev ${teamTask.status}`, String(teamTask.goal || "").slice(0, 300), teamTask.status === "done" ? "success" : "warning");
    }
  }
  zsAutomationPersist().catch(() => {});
}, 5000);

setInterval(() => zsAutomationProjectProbe().catch(() => {}), 60000);
setTimeout(() => zsAutomationProjectProbe(true).catch(() => {}), 5000);

setInterval(() => {
  if (!teamTask || teamTask.status !== "running") return;
  const limit = Math.max(5, Number(zsAutomation.settings.taskTimeoutMinutes || 20)) * 60 * 1000;
  const started = Number(teamTask.phaseStartedAt || teamTask.updatedAt || teamTask.createdAt || Date.now());
  if (Date.now() - started < limit) return;
  teamTask.timeoutRecoveries = Number(teamTask.timeoutRecoveries || 0);
  if (teamTask.timeoutRecoveries < Number(zsAutomation.settings.maxTimeoutRecoveries || 0)) {
    const failed = teamTask.provider || "unknown";
    teamTask.timeoutRecoveries += 1;
    teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
    if (!teamTask.failedProviders.includes(failed)) teamTask.failedProviders.push(failed);
    providerHealth[failed] = { status: "timeout", reason: `Exceeded ${zsAutomation.settings.taskTimeoutMinutes} minute phase limit`, until: Date.now() + 10 * 60 * 1000 };
    teamTask.status = "queued";
    teamTask.error = `${failed} exceeded the phase time limit; another ready model will continue from the checkpoint.`;
    teamTask.phaseStartedAt = Date.now();
    teamTask.updatedAt = Date.now();
    writerLease = null;
    chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth }).catch(() => {});
    zsAutomationNotice("timeout", "Model süre sınırını aştı", teamTask.error, "warning");
    if (zsAutomation.settings.autoContextClean) zsAutomationCompactContext("automatic timeout recovery");
    broadcastTeam(); dispatchTask();
  } else {
    teamTask.status = "failed";
    teamTask.error = `Task stopped after ${teamTask.timeoutRecoveries} timeout recoveries.`;
    teamTask.updatedAt = Date.now();
    writerLease = null;
    chrome.storage.local.set({ zsTeamTask: teamTask }).catch(() => {});
    zsAutomationNotice("timeout", "Görev süre sınırında durduruldu", teamTask.error, "error");
    broadcastTeam();
  }
}, 15000);

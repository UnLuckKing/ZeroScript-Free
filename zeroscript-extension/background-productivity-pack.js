// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.27 productivity engine: persistent task queue, project index,
// Output watcher, scoped checkpoints, compact prompts, progress estimates and
// faster stuck-provider recovery.

const ZS_PRODUCTIVITY_KEY = "zsProductivityState";
const ZS_PRODUCTIVITY_MAX_QUEUE = 60;
const ZS_PRODUCTIVITY_MAX_HISTORY = 80;
const ZS_OUTPUT_POLL_MS = 8000;
const ZS_WATCHDOG_SOFT_MS = 5 * 60 * 1000;
const ZS_WATCHDOG_HARD_MS = 10 * 60 * 1000;

let zsProductivity = {
  version: 1,
  queue: [],
  queueRunning: true,
  completedQueueIds: [],
  history: [],
  projectIndex: { status: "idle", builtAt: 0, report: null, error: "" },
  outputWatch: { enabled: true, autoFix: false, baselineReady: false, lastHash: "", lastCheckedAt: 0, lastAutoFixAt: 0, errors: [] },
  watchdog: { recoveries: 0, lastKey: "", lastAt: 0, detail: "" },
  updatedAt: Date.now(),
};
let zsProductivityBusy = false;
let zsProductivityLastTerminal = "";

chrome.storage.local.get(ZS_PRODUCTIVITY_KEY, (result) => {
  const saved = result && result[ZS_PRODUCTIVITY_KEY];
  if (saved && typeof saved === "object") {
    zsProductivity = {
      ...zsProductivity,
      ...saved,
      queue: Array.isArray(saved.queue) ? saved.queue.slice(-ZS_PRODUCTIVITY_MAX_QUEUE) : [],
      completedQueueIds: Array.isArray(saved.completedQueueIds) ? saved.completedQueueIds.slice(-200) : [],
      history: Array.isArray(saved.history) ? saved.history.slice(-ZS_PRODUCTIVITY_MAX_HISTORY) : [],
      projectIndex: { ...zsProductivity.projectIndex, ...(saved.projectIndex || {}) },
      outputWatch: { ...zsProductivity.outputWatch, ...(saved.outputWatch || {}), errors: Array.isArray(saved.outputWatch && saved.outputWatch.errors) ? saved.outputWatch.errors.slice(-60) : [] },
      watchdog: { ...zsProductivity.watchdog, ...(saved.watchdog || {}) },
    };
  }
  broadcastTeam();
});

function zsProductivityPersist() {
  zsProductivity.updatedAt = Date.now();
  zsProductivity.queue = zsProductivity.queue.slice(-ZS_PRODUCTIVITY_MAX_QUEUE);
  zsProductivity.history = zsProductivity.history.slice(-ZS_PRODUCTIVITY_MAX_HISTORY);
  zsProductivity.outputWatch.errors = (zsProductivity.outputWatch.errors || []).slice(-60);
  return chrome.storage.local.set({ [ZS_PRODUCTIVITY_KEY]: zsProductivity });
}

function zsProductivityProgress() {
  if (!teamTask) return { percent: 0, label: "Idle", elapsedMs: 0, estimatedRemainingMs: 0 };
  const phases = Array.isArray(teamTask.phases) && teamTask.phases.length ? teamTask.phases : [teamTask.phase || "builder"];
  const index = Math.max(0, Number(teamTask.phaseIndex || phases.indexOf(teamTask.phase) || 0));
  const terminal = ["done", "failed", "cancelled"].includes(teamTask.status);
  const base = terminal ? 1 : Math.min(0.95, (index + (teamTask.status === "running" ? 0.45 : 0.15)) / Math.max(1, phases.length));
  const elapsedMs = Math.max(0, Date.now() - Number(teamTask.createdAt || Date.now()));
  const estimatedTotal = base > 0.08 ? elapsedMs / base : phases.length * 4 * 60 * 1000;
  return {
    percent: Math.round(base * 100),
    label: `${teamTask.status || "running"} · ${teamTask.phase || "-"}`,
    elapsedMs,
    estimatedRemainingMs: terminal ? 0 : Math.max(0, Math.round(estimatedTotal - elapsedMs)),
    mode: teamTask.performanceMode || teamTask.requestedQualityMode || (zsSuite && zsSuite.qualityMode) || "balanced",
  };
}

function zsProductivityPublic() {
  return {
    version: zsProductivity.version,
    queue: zsProductivity.queue.slice(0, 40),
    queueRunning: !!zsProductivity.queueRunning,
    history: zsProductivity.history.slice(-25),
    projectIndex: zsProductivity.projectIndex,
    outputWatch: zsProductivity.outputWatch,
    watchdog: zsProductivity.watchdog,
    progress: zsProductivityProgress(),
    updatedAt: zsProductivity.updatedAt,
  };
}

const zsProductivityCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithProductivity() {
  return { ...zsProductivityCoreTeamObj(), productivity: zsProductivityPublic() };
};

function zsQueuePriority(value) {
  if (value === "high" || Number(value) >= 3) return 3;
  if (value === "low" || Number(value) <= 1) return 1;
  return 2;
}

function zsQueueAdd(goal, options = {}) {
  const text = String(goal || "").trim();
  if (!text) throw new Error("Task goal is empty.");
  const item = {
    id: `queue-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    goal: text.slice(0, 12000),
    qualityMode: String(options.qualityMode || "auto"),
    priority: zsQueuePriority(options.priority),
    dependsOn: Array.isArray(options.dependsOn) ? options.dependsOn.map(String).slice(0, 12) : [],
    status: "queued",
    source: String(options.source || "hub"),
    createdAt: Date.now(),
  };
  zsProductivity.queue.push(item);
  zsProductivity.queue.sort((a, b) => Number(b.priority || 2) - Number(a.priority || 2) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
  zsProductivityPersist().catch(() => {});
  broadcastTeam();
  return item;
}

function zsQueueRunnable(item) {
  const completed = new Set(zsProductivity.completedQueueIds || []);
  return item && item.status === "queued" && (item.dependsOn || []).every((id) => completed.has(id));
}

async function zsQueueStartNext() {
  if (zsProductivityBusy || !zsProductivity.queueRunning) return false;
  if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) return false;
  const index = zsProductivity.queue.findIndex(zsQueueRunnable);
  if (index < 0) return false;
  zsProductivityBusy = true;
  const item = zsProductivity.queue.splice(index, 1)[0];
  item.status = "starting";
  item.startedAt = Date.now();
  try {
    if (zsSuite && ["auto", "turbo", "fast", "balanced", "best"].includes(item.qualityMode)) zsSuite.qualityMode = item.qualityMode;
    const result = await startTeamTask(item.goal);
    if (!result || !result.ok) throw new Error(result && result.error || "Task could not be started.");
    if (teamTask) {
      teamTask.queueItemId = item.id;
      teamTask.queueSource = item.source;
      await chrome.storage.local.set({ zsTeamTask: teamTask });
    }
    zsProductivity.history.push({ ...item, status: "running", taskId: teamTask && teamTask.id, updatedAt: Date.now() });
    if (typeof zsSuiteLedger === "function") zsSuiteLedger("queue_start", `Started queued task: ${item.goal.slice(0, 160)}`, { queueItemId: item.id, taskId: teamTask && teamTask.id });
    await zsProductivityPersist();
    broadcastTeam();
    return true;
  } catch (error) {
    item.status = "failed_to_start";
    item.error = String(error && error.message || error);
    item.updatedAt = Date.now();
    zsProductivity.history.push(item);
    await zsProductivityPersist();
    broadcastTeam();
    return false;
  } finally {
    zsProductivityBusy = false;
  }
}

function zsQueueFinishCurrent() {
  if (!teamTask || !["done", "failed", "cancelled"].includes(teamTask.status)) return;
  const key = `${teamTask.id}:${teamTask.status}`;
  if (zsProductivityLastTerminal === key) return;
  zsProductivityLastTerminal = key;
  const queueId = teamTask.queueItemId;
  if (queueId) {
    const entry = [...zsProductivity.history].reverse().find((item) => item.id === queueId);
    if (entry) {
      entry.status = teamTask.status;
      entry.completedAt = Date.now();
      entry.taskId = teamTask.id;
      entry.report = String(teamTask.lastReport || teamTask.error || "").slice(0, 1800);
    }
    if (teamTask.status === "done") zsProductivity.completedQueueIds = [...new Set([...(zsProductivity.completedQueueIds || []), queueId])].slice(-200);
  }
  zsProductivityPersist().catch(() => {});
  setTimeout(() => zsQueueStartNext().catch(() => {}), 1200);
}

function zsProductivityHash(text) {
  let hash = 2166136261;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += Math.max(1, Math.floor(value.length / 1200))) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function zsOutputErrorLines(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && /(\[error\]|error:|traceback|stack begin|attempt to|infinite yield|failed to|is not a valid member)/i.test(line)).slice(-30);
}

async function zsOutputWatchTick() {
  const watch = zsProductivity.outputWatch;
  if (!watch.enabled || !connected || studioConnected === false) return;
  const tool = typeof robloxTool === "function" ? robloxTool("get_console_output") : null;
  if (!tool) return;
  const result = await send({ type: "call_tool", name: tool.name, arguments: {}, timeout: 20000 }, 26000);
  watch.lastCheckedAt = Date.now();
  if (!result || !result.ok) return;
  const text = String(result.text || "").slice(-24000);
  const hash = zsProductivityHash(text);
  if (!watch.baselineReady) {
    watch.baselineReady = true;
    watch.lastHash = hash;
    await zsProductivityPersist();
    return;
  }
  if (hash === watch.lastHash) return;
  watch.lastHash = hash;
  const lines = zsOutputErrorLines(text);
  const known = new Set((watch.errors || []).map((item) => item.line));
  const fresh = lines.filter((line) => !known.has(line));
  for (const line of fresh) watch.errors.push({ at: Date.now(), line: line.slice(0, 700) });
  if (fresh.length && typeof zsSuiteLedger === "function") zsSuiteLedger("output_error", `${fresh.length} new Studio Output error(s) detected`, { errors: fresh.slice(0, 5) });
  if (fresh.length && watch.autoFix && Date.now() - Number(watch.lastAutoFixAt || 0) > 10 * 60 * 1000) {
    watch.lastAutoFixAt = Date.now();
    zsQueueAdd(`Run the game and fix these newly detected Studio Output errors at their root cause. Preserve working systems, reproduce the affected path, then confirm Output is clean.\n\nNEW OUTPUT ERRORS\n${fresh.join("\n")}`, { qualityMode: "auto", priority: "high", source: "output_watch" });
  }
  await zsProductivityPersist();
  broadcastTeam();
}

async function zsBuildProjectIndex() {
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool || !connected || studioConnected === false) throw new Error("Roblox Studio or execute_luau is unavailable.");
  zsProductivity.projectIndex = { status: "building", builtAt: zsProductivity.projectIndex.builtAt || 0, report: zsProductivity.projectIndex.report || null, error: "" };
  broadcastTeam();
  const code = `local HttpService=game:GetService("HttpService")
local out={counts={scripts=0,remotes=0,guis=0,parts=0},scripts={},remotes={},guis={}}
local function pathOf(inst) local t={} local cur=inst while cur and cur~=game do table.insert(t,1,cur.Name) cur=cur.Parent end return table.concat(t,".") end
local function fp(src) local h=2166136261 local step=math.max(1,math.floor(#src/128)) for i=1,#src,step do h=(h*16777619+string.byte(src,i))%2147483647 end return tostring(h) end
for _,inst in game:GetDescendants() do
 if inst:IsA("LuaSourceContainer") then out.counts.scripts+=1 if #out.scripts<260 then local ok,src=pcall(function() return inst.Source end) table.insert(out.scripts,{path=pathOf(inst),class=inst.ClassName,length=ok and #src or -1,fingerprint=ok and fp(src) or "unreadable"}) end
 elseif inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") then out.counts.remotes+=1 if #out.remotes<180 then table.insert(out.remotes,{path=pathOf(inst),class=inst.ClassName}) end
 elseif inst:IsA("ScreenGui") then out.counts.guis+=1 if #out.guis<100 then table.insert(out.guis,{path=pathOf(inst),enabled=inst.Enabled,displayOrder=inst.DisplayOrder}) end
 elseif inst:IsA("BasePart") then out.counts.parts+=1 end
end
return "PROJECT_INDEX:"..HttpService:JSONEncode(out)`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 45000 }, 52000);
  const text = result && result.ok ? String(result.text || "") : "";
  const match = /PROJECT_INDEX:(\{[\s\S]*\})/.exec(text);
  if (!match) {
    const error = String(result && (result.error || result.text) || "Index result was not returned.");
    zsProductivity.projectIndex = { status: "error", builtAt: Date.now(), report: null, error: error.slice(0, 500) };
    await zsProductivityPersist();
    broadcastTeam();
    throw new Error(error);
  }
  const report = JSON.parse(match[1]);
  zsProductivity.projectIndex = { status: "ready", builtAt: Date.now(), report, error: "" };
  await zsProductivityPersist();
  broadcastTeam();
  return report;
}

function zsScopedCheckpointServices(goal) {
  const text = String(goal || "").toLowerCase();
  if (/\b(ui|gui|hud|menu|panel|button|mobile|arayüz|buton|yazı)\b/.test(text)) return ["StarterGui", "StarterPlayer"];
  if (/\b(map|world|terrain|lighting|spawn|harita|dünya)\b/.test(text)) return ["Workspace", "Lighting"];
  return ["ServerScriptService", "ReplicatedStorage", "StarterPlayer"];
}

const zsProductivityCoreCreateCheckpoint = createCheckpoint;
createCheckpoint = async function zsScopedCheckpoint(id) {
  if (!teamTask || teamTask.performanceMode !== "turbo") return zsProductivityCoreCreateCheckpoint(id);
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool || !connected || studioConnected === false) return { ok: false, error: "Studio or execute_luau is unavailable." };
  const services = zsScopedCheckpointServices(teamTask.goal);
  const code = `local ServerStorage=game:GetService("ServerStorage")
local HttpService=game:GetService("HttpService")
local ChangeHistoryService=game:GetService("ChangeHistoryService")
local scopes=HttpService:JSONDecode(${JSON.stringify(JSON.stringify(services))})
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") or Instance.new("Folder") root.Name="ZeroScriptCheckpoints" root.Parent=ServerStorage
local old=root:FindFirstChild(${JSON.stringify(id)}) if old then old:Destroy() end
local cp=Instance.new("Folder") cp.Name=${JSON.stringify(id)} cp.Parent=root cp:SetAttribute("CreatedAt",os.time()) cp:SetAttribute("Scoped",true) cp:SetAttribute("ScopeJson",HttpService:JSONEncode(scopes))
local function pathParts(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return out end
local allowed={} for _,name in scopes do local ok,svc=pcall(function() return game:GetService(name) end) if ok then allowed[svc]=true end end
local count=0
for _,inst in game:GetDescendants() do if inst:IsA("LuaSourceContainer") then local include=false for svc in allowed do if inst:IsDescendantOf(svc) then include=true break end end if include then local ok,src=pcall(function() return inst.Source end) if ok then count+=1 local v=Instance.new("StringValue") v.Name=string.format("%06d",count) v.Value=src v:SetAttribute("PathJson",HttpService:JSONEncode(pathParts(inst))) v:SetAttribute("ZSClass",inst.ClassName) if inst:IsA("BaseScript") then v:SetAttribute("Disabled",inst.Disabled) end v.Parent=cp end end end end
pcall(function() ChangeHistoryService:SetWaypoint("ZeroScript scoped checkpoint ${id}") end)
return "CHECKPOINT_OK:"..cp.Name..":"..count..":scoped"`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 45000 }, 52000);
  const ok = !!(result && result.ok && /CHECKPOINT_OK:/.test(result.text || ""));
  checkpointState = { latest: ok ? id : checkpointState.latest, status: ok ? "saved" : "error", detail: ok ? String(result.text || "") : String(result && (result.error || result.text) || "Scoped checkpoint failed") };
  await chrome.storage.local.set({ zsCheckpointState: checkpointState });
  broadcastTeam();
  return { ok, id, scoped: true, error: ok ? null : checkpointState.detail };
};

const zsProductivityCoreRestoreCheckpoint = restoreCheckpoint;
restoreCheckpoint = async function zsRestoreScopedCheckpoint(id) {
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!id || !tool || !connected || studioConnected === false) return { ok: false, error: "No usable checkpoint or Studio connection." };
  const inspect = await send({ type: "call_tool", name: tool.name, arguments: { code: `local r=game:GetService("ServerStorage"):FindFirstChild("ZeroScriptCheckpoints") local cp=r and r:FindFirstChild(${JSON.stringify(id)}) return cp and cp:GetAttribute("Scoped")==true and "SCOPED" or "FULL"`, datamodel_type: "Edit" }, timeout: 15000 }, 20000);
  if (!inspect || !inspect.ok || !/SCOPED/.test(String(inspect.text || ""))) return zsProductivityCoreRestoreCheckpoint(id);
  if (writerLease) return { ok: false, error: `Studio is busy with ${writerLease.provider}. Stop the task first.` };
  const code = `local ServerStorage=game:GetService("ServerStorage")
local HttpService=game:GetService("HttpService")
local ChangeHistoryService=game:GetService("ChangeHistoryService")
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(id)}) if not cp then return "ROLLBACK_ERROR:checkpoint not found" end
local scopes=HttpService:JSONDecode(cp:GetAttribute("ScopeJson") or "[]") local allowed={} for _,name in scopes do local ok,svc=pcall(function() return game:GetService(name) end) if ok then allowed[svc]=true end end
local originals={} local entries={}
for _,v in cp:GetChildren() do if v:IsA("StringValue") then local p=v:GetAttribute("PathJson") if p then originals[p]=true table.insert(entries,v) end end end
local function parts(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return out end
local removed=0
for _,inst in game:GetDescendants() do if inst:IsA("LuaSourceContainer") then local include=false for svc in allowed do if inst:IsDescendantOf(svc) then include=true break end end if include then local key=HttpService:JSONEncode(parts(inst)) if not originals[key] then inst:Destroy() removed+=1 end end end end
local restored,missing=0,0
for _,v in entries do local path=HttpService:JSONDecode(v:GetAttribute("PathJson")) local ok,cur=pcall(function() return game:GetService(path[1]) end) if not ok then cur=nil end for i=2,#path-1 do cur=cur and cur:FindFirstChild(path[i]) end if cur then local inst=cur:FindFirstChild(path[#path]) local class=v:GetAttribute("ZSClass") if inst and inst.ClassName~=class then inst:Destroy() inst=nil end if not inst then inst=Instance.new(class) inst.Name=path[#path] inst.Parent=cur end local wrote=pcall(function() inst.Source=v.Value if inst:IsA("BaseScript") then inst.Disabled=v:GetAttribute("Disabled")==true end end) if wrote then restored+=1 else missing+=1 end else missing+=1 end end
pcall(function() ChangeHistoryService:SetWaypoint("ZeroScript scoped rollback ${id}") end)
return "ROLLBACK_OK:"..restored..":removed="..removed..":missing="..missing..":scoped"`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 50000 }, 58000);
  const ok = !!(result && result.ok && /ROLLBACK_OK:/.test(result.text || ""));
  checkpointState = { latest: id, status: ok ? "restored" : "error", detail: ok ? String(result.text || "") : String(result && (result.error || result.text) || "Scoped rollback failed") };
  await chrome.storage.local.set({ zsCheckpointState: checkpointState });
  broadcastTeam();
  return { ok, scoped: true, error: ok ? null : checkpointState.detail, detail: checkpointState.detail };
};

const zsProductivityCorePhasePrompt = phasePrompt;
phasePrompt = function zsCompactProductivityPrompt(task) {
  if (!task || !["turbo", "fast"].includes(task.performanceMode)) return zsProductivityCorePhasePrompt(task);
  const index = zsProductivity.projectIndex && zsProductivity.projectIndex.status === "ready" ? zsProductivity.projectIndex.report : null;
  const indexSummary = index ? `\nPROJECT INDEX\nScripts: ${index.counts && index.counts.scripts || 0}, Remotes: ${index.counts && index.counts.remotes || 0}, GUIs: ${index.counts && index.counts.guis || 0}, Parts: ${index.counts && index.counts.parts || 0}. Use search tools for exact content; do not rescan unrelated services.` : "";
  const previous = task.lastReport ? `\nPREVIOUS PHASE\n${String(task.lastReport).slice(0, 1400)}` : "";
  return `TEAM TASK ${task.id}\nGOAL\n${task.goal}\n\nPHASE ${String(task.phase || "builder").toUpperCase()} · ${String(task.performanceMode).toUpperCase()}\nWork directly in the connected Roblox Studio. Inspect only the objects relevant to the goal, preserve public APIs and server authority, make the smallest complete change, then test the changed path.${indexSummary}${previous}\n\nREQUIRED FINISH\n- State exact changed paths.\n- Trigger the affected path in Play mode when behavior changed.\n- Read Studio Output.\n- Include TEST_EVIDENCE: <actual test>.\n- Include OUTPUT_ERRORS: NONE or exact remaining errors.\n- End with TEAM_VERDICT: PASS only when the scoped goal works.\n\nNever bulk-delete core services or redesign unrelated systems.`;
};

function zsProductivityWorkflowGoal(action) {
  const goals = {
    ui_audit: "Run a deterministic player-facing UI audit in play mode. Inspect all visible ScreenGuis on desktop and mobile sizes, test every reachable TextButton/ImageButton, fix broken navigation, unreadable text, overflow, overlap, safe-area, scaling, contrast, number formatting, disabled/loading feedback, then capture before/after evidence and verify Output.",
    security_audit: "Audit the current Roblox experience for exploitable RemoteEvents/RemoteFunctions, client-trusted rewards or currencies, missing rate limits, unsafe purchases, duplicate grants, insecure admin paths, and dangerous marketplace scripts. Fix verified issues with server-authoritative validation and test malicious inputs safely.",
    datastore_lab: "Run a safe DataStore reliability lab without touching production player data. Inspect save/load/session-lock/migration/retry/update patterns, create isolated test keys or mocks where needed, test rejoin and failure handling, fix verified data-loss or duplication risks, and report user-only publish settings.",
    economy_simulator: "Analyze the current game economy from actual configs and formulas. Simulate early, mid, and late progression, upgrade/rebirth costs, luck and pity, rewards, sinks, gamepasses and developer products. Fix verified progression cliffs or exploits without inventing values, then report time-to-milestone evidence.",
    marketplace_scan: "Scan all scripts and recently inserted marketplace/Toolbox assets for suspicious require/http/loadstring patterns, obfuscated code, hidden remotes, backdoors, unwanted admin systems, destructive scripts, duplicate services, and excessive part/physics cost. Remove only verified threats and preserve legitimate assets.",
    release_check: "Run the Release Manager for the currently open Roblox experience. Inspect release readiness, security, DataStores, purchases, economy, onboarding, mobile UI, performance, Output, respawn, and the main gameplay loop. Fix verified blockers, run regression tests, and return genuine evidence and remaining user-only steps.",
    multiplayer_test: "Run a multi-client readiness test for the current experience. Verify player isolation, shared world synchronization, remotes, leaderstats, rewards, respawn, joins/leaves, duplicate grants, trade or interaction flows when present, and server authority. Use available Studio test tools and clearly report any user-only multi-client step.",
    record_test: "Create or update a repeatable regression test checklist for the current main gameplay loop. Observe the real UI and game flow, record exact interactions and expected results, automate safe steps with available keyboard/mouse/playtest tools, execute the test once, and store concise TEST_EVIDENCE for future tasks.",
  };
  return goals[action] || "";
}

const zsProductivityCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsProductivityHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "enqueue_task") {
    zsQueueAdd(payload.goal, payload);
    if (zsProductivity.queueRunning) setTimeout(() => zsQueueStartNext().catch(() => {}), 100);
    return;
  }
  if (action === "queue_pause") { zsProductivity.queueRunning = false; await zsProductivityPersist(); broadcastTeam(); return; }
  if (action === "queue_resume") { zsProductivity.queueRunning = true; await zsProductivityPersist(); broadcastTeam(); await zsQueueStartNext(); return; }
  if (action === "queue_clear") { zsProductivity.queue = []; await zsProductivityPersist(); broadcastTeam(); return; }
  if (action === "queue_remove") { zsProductivity.queue = zsProductivity.queue.filter((entry) => entry.id !== String(payload.id || "")); await zsProductivityPersist(); broadcastTeam(); return; }
  if (action === "build_index") { await zsBuildProjectIndex(); return; }
  if (action === "output_watch") {
    if (typeof payload.enabled === "boolean") zsProductivity.outputWatch.enabled = payload.enabled;
    if (typeof payload.autoFix === "boolean") zsProductivity.outputWatch.autoFix = payload.autoFix;
    if (payload.reset) { zsProductivity.outputWatch.baselineReady = false; zsProductivity.outputWatch.lastHash = ""; zsProductivity.outputWatch.errors = []; }
    await zsProductivityPersist(); broadcastTeam(); return;
  }
  const workflowGoal = zsProductivityWorkflowGoal(action);
  if (workflowGoal) {
    const mode = ["security_audit", "datastore_lab", "release_check", "marketplace_scan"].includes(action) ? "best" : "auto";
    if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) zsQueueAdd(workflowGoal, { qualityMode: mode, priority: "high", source: action });
    else { if (zsSuite) zsSuite.qualityMode = mode; await startTeamTask(workflowGoal); }
    return;
  }
  return zsProductivityCoreHubAction(item);
};

setInterval(() => {
  zsQueueFinishCurrent();
  if (zsProductivity.queueRunning) zsQueueStartNext().catch(() => {});
}, 2000);

setInterval(() => zsOutputWatchTick().catch(() => {}), ZS_OUTPUT_POLL_MS);

setInterval(() => {
  if (!teamTask || teamTask.status !== "running" || !teamTask.phaseStartedAt) return;
  const age = Date.now() - Number(teamTask.phaseStartedAt || 0);
  const agent = [...teamAgents.values()].find((value) => value && value.provider === teamTask.provider && value.ready);
  const key = `${teamTask.id}:${teamTask.phase}:${teamTask.provider}`;
  const shouldRecover = (age > ZS_WATCHDOG_SOFT_MS && !agent) || age > ZS_WATCHDOG_HARD_MS;
  if (!shouldRecover || zsProductivity.watchdog.lastKey === key) return;
  const failed = teamTask.provider || "unknown";
  teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
  if (!teamTask.failedProviders.includes(failed)) teamTask.failedProviders.push(failed);
  providerHealth[failed] = { status: "stuck", reason: "Productivity watchdog: no phase report in time.", until: Date.now() + 5 * 60 * 1000 };
  teamTask.status = "queued";
  teamTask.error = `${failed} did not finish ${teamTask.phase} in time; another ready model will continue from the checkpoint.`;
  teamTask.updatedAt = Date.now();
  writerLease = null;
  zsProductivity.watchdog.recoveries += 1;
  zsProductivity.watchdog.lastKey = key;
  zsProductivity.watchdog.lastAt = Date.now();
  zsProductivity.watchdog.detail = teamTask.error;
  chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth }).catch(() => {});
  zsProductivityPersist().catch(() => {});
  if (typeof zsSuiteLedger === "function") zsSuiteLedger("fast_failover", teamTask.error, { taskId: teamTask.id, phase: teamTask.phase, provider: failed, age });
  broadcastTeam();
  dispatchTask();
}, 15000);

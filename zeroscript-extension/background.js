// SPDX-License-Identifier: GPL-3.0-or-later
// background.js - service worker.
// Owns ONE resilient WebSocket to the local bridge (ws://127.0.0.1:PORT).
// Keeping the socket here (not in the content script) avoids https→ws mixed
// content issues and centralises reconnect / timeout logic.
//
// Contract with content.js: every sendMessage ALWAYS gets a response object,
// even when the bridge is offline. The agentic loop must never hang waiting.

const PORT = 17613;
const URL = `ws://127.0.0.1:${PORT}`;

// Chat sites where a ZeroScript provider content script runs. Status pushes go
// to every tab matching these. Add the new provider's URL pattern here (and in
// manifest.json content_scripts + host_permissions) when integrating another AI.
const PROVIDER_URLS = ["https://chat.deepseek.com/*", "https://gemini.google.com/*", "https://www.kimi.com/*", "https://kimi.com/*", "https://chat.z.ai/*", "https://chat.qwen.ai/*", "https://arena.ai/*"];

const RECONNECT_MIN = 1000;
const RECONNECT_MAX = 5000;
const HEARTBEAT_MS = 10000;
// If no message (incl. pong) arrives within this window while we believe we're
// connected, the socket is half-open: force a reconnect instead of letting
// pending requests slowly time out.
const STALE_SOCKET_MS = 25000;
const REQUEST_TIMEOUT_DEFAULT = 130000; // a bit above the 120s tool timeout

let ws = null;
let connected = false;
let reconnectDelay = RECONNECT_MIN;
let reconnectTimer = null;
let heartbeatTimer = null;
let lastMessageAt = 0; // timestamp of the last frame received from the bridge
let nextId = 1;
const pending = new Map(); // id -> {resolve, timer}
let toolsCache = [];
let mcpAlive = false;
let serversCache = [];
// true/false = a PLACE is loaded and usable in Roblox Studio; null = unknown.
// The MCP process stays alive when Studio is closed or its MCP option is off,
// so this is probed separately (bridge "studio_status").
let studioConnected = null;
// true/false = a Roblox Studio app is connected to the MCP server at all; null =
// unknown. studioApp=true with studioConnected=false means "Studio open but no
// place"; studioApp=false means "Studio closed OR its MCP option disabled".
let studioApp = null;
// true/false = a Roblox Studio WINDOW/PROCESS exists on this machine (checked
// bridge-side via tasklist); null = unknown/old bridge. Distinguishes the two
// studioApp=false sub-cases the UI must word differently: Studio genuinely not
// launched ("open Roblox Studio") vs Studio OPEN but its MCP plugin never
// registered with the bridge - the documented fix for the latter is opening
// Assistant Settings > MCP Servers inside Studio (validated live 3x), which
// "open Roblox Studio" wording completely fails to convey.
let studioProc = null;

// Shared coordination for every supported AI tab. The bridge remains the one
// Studio connection; this lease prevents concurrent MCP calls from different
// models from observing or mutating conflicting state.
const TEAM_DEFAULTS = { enabled: false, writer: "deepseek", mapDesigner: "gemini", uiDesigner: "gemini", reviewer: "gemini", qa: "qwen", maxRepairRounds: 2, approvalMode: "autonomous" };
let teamConfig = { ...TEAM_DEFAULTS };
const teamAgents = new Map();
let writerLease = null;
const WRITE_LEASE_MS = 150000;
let teamTask = null;
let teamHistory = [];
let providerHealth = {};
let checkpointState = { latest: null, status: "idle", detail: "" };
let pendingApprovals = [];
let projectAudit = { status: "idle", report: "", scannedAt: 0 };
let taskStarting = false;

chrome.storage.local.get("zsTeamConfig", (r) => {
  if (r && r.zsTeamConfig) teamConfig = { ...TEAM_DEFAULTS, ...r.zsTeamConfig };
});
chrome.storage.local.get("zsTeamTask", (r) => {
  if (r && r.zsTeamTask && !["done", "cancelled"].includes(r.zsTeamTask.status))
    teamTask = { ...r.zsTeamTask, status: "waiting", error: "Extension restarted; press Retry to continue." };
});
chrome.storage.local.get("zsTeamHistory", (r) => {
  if (r && Array.isArray(r.zsTeamHistory)) teamHistory = r.zsTeamHistory.slice(-50);
});
chrome.storage.local.get("zsProviderHealth", (r) => {
  if (r && r.zsProviderHealth && typeof r.zsProviderHealth === "object") providerHealth = r.zsProviderHealth;
});
chrome.storage.local.get("zsCheckpointState", (r) => {
  if (r && r.zsCheckpointState) checkpointState = r.zsCheckpointState;
});
chrome.storage.local.get("zsPendingApprovals", (r) => {
  if (r && Array.isArray(r.zsPendingApprovals)) pendingApprovals = r.zsPendingApprovals.slice(-20);
});
chrome.storage.local.get("zsProjectAudit", (r) => {
  if (r && r.zsProjectAudit) projectAudit = r.zsProjectAudit;
});

function cleanTeamState() {
  const now = Date.now();
  for (const [id, agent] of teamAgents) if (now - agent.lastSeen > 20000) teamAgents.delete(id);
  if (writerLease && writerLease.expiresAt <= now) writerLease = null;
  for (const [provider, h] of Object.entries(providerHealth)) if (!h || h.until <= now) delete providerHealth[provider];
}

function teamObj() {
  cleanTeamState();
  return {
    config: teamConfig,
    agents: [...teamAgents.entries()].map(([tabId, a]) => ({ tabId, ...a })),
    writer: writerLease && { tabId: writerLease.tabId, provider: writerLease.provider, expiresAt: writerLease.expiresAt },
    task: teamTask,
    history: teamHistory.slice(-10),
    providerHealth,
    checkpoint: checkpointState,
    audit: projectAudit,
    approvals: pendingApprovals.map(({ id, name, arguments: args, provider, createdAt }) => ({ id, name, arguments: args, provider, createdAt })),
  };
}

function agentFor(provider) {
  cleanTeamState();
  return [...teamAgents.entries()].find(([, a]) => a.provider === provider && a.ready);
}

function fallbackAgent(preferred, phase) {
  cleanTeamState();
  const excluded = new Set(teamTask && Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : []);
  const exact = !excluded.has(preferred) && !providerHealth[preferred] ? agentFor(preferred) : null;
  if (exact) return { hit: exact, provider: preferred, fallback: false };
  const candidates = [...teamAgents.entries()].filter(([, a]) => a.ready && !excluded.has(a.provider) && !providerHealth[a.provider]);
  if (!candidates.length) return null;
  // Prefer vision for QA, otherwise use the first live provider. Provider tabs
  // heartbeat every seven seconds, so this list contains only genuinely open tabs.
  const vision = new Set(["gemini", "kimi", "glm", "qwen", "arena"]);
  const selected = ["map", "ui", "qa"].includes(phase) ? (candidates.find(([, a]) => vision.has(a.provider)) || candidates[0]) : candidates[0];
  return { hit: selected, provider: selected[1].provider, fallback: true };
}

function phaseProvider(phase) {
  if (phase === "analyst") return teamConfig.reviewer;
  if (phase === "builder") return teamConfig.writer;
  if (phase === "map") return teamConfig.mapDesigner;
  if (phase === "ui") return teamConfig.uiDesigner;
  if (phase === "reviewer") return teamConfig.reviewer;
  return teamConfig.qa;
}

function phasesForGoal(goal) {
  const g = String(goal || "").toLowerCase();
  const full = /entire|complete project|production-ready|prepare.*release|yayına|tüm proje/.test(g);
  const wantsMap = full || /\b(map|world|terrain|lobby|environment|lighting|spawn|zone|island|harita)\b/.test(g);
  const wantsUi = full || /\b(ui|gui|hud|menu|panel|button|responsive|mobile|interface|arayüz)\b/.test(g);
  return ["analyst", "builder", ...(wantsMap ? ["map"] : []), ...(wantsUi ? ["ui"] : []), "reviewer", "qa"];
}

function phasePrompt(task) {
  const shared = `TEAM TASK ${task.id}\nOriginal goal: ${task.goal}\n\nYou are the ${task.phase.toUpperCase()} in a coordinated Roblox Studio team. Use ZeroScript tools, act directly in Studio, and do not merely explain. End your final report with exactly TEAM_VERDICT: PASS when your phase is complete. Reviewer/QA may instead end with TEAM_VERDICT: FIX builder, TEAM_VERDICT: FIX map, or TEAM_VERDICT: FIX ui when a verified unresolved problem must return to that specialist.`;
  if (task.phase === "analyst") return `${shared}\nAct as the Project Analyst. Use this deterministic local preflight as evidence:\n${task.auditReport || "Preflight unavailable; inspect Studio manually."}\nInspect the actual game tree and relevant scripts, confirm or reject each warning, identify dependencies and give the builder a prioritized implementation plan. Do not modify Studio in this phase.`;
  if (task.phase === "builder") return `${shared}\nInspect relevant instances and scripts first. Create a safe Studio checkpoint where available, implement the complete goal, preserve working systems, and test the main path.`;
  if (task.phase === "map") return `${shared}\nAct as the Map Designer. Inspect the existing world before editing. Build or improve only the environments required by the goal: layout, spawn safety, navigation, zones, lighting, terrain and appropriate Creator Store assets. Keep gameplay paths clear, performance reasonable, and preserve correct existing work. Playtest traversal after changes.`;
  if (task.phase === "ui") return `${shared}\nAct as the UI Designer. Inspect every relevant ScreenGui and capture the running UI when possible. Implement a professional, consistent, responsive desktop/mobile interface with clear hierarchy, feedback states, safe-area handling and working buttons. Preserve the project's visual identity and test interactions in play mode.`;
  if (task.phase === "reviewer") return `${shared}\nBuilder report:\n${task.lastReport || "No report supplied."}\nIndependently inspect the actual Studio state. Find and directly fix verified functional, security, data-loss, race-condition, mobile UI, and maintainability problems. Do not change correct work merely for style.`;
  return `${shared}\nPrevious report:\n${task.lastReport || "No report supplied."}\nRun a real playtest, read Output, exercise the feature, and use screen_capture if supported. Fix runtime errors and obvious UI overflow, contrast, or alignment issues, then re-test. Your report MUST include a TEST_EVIDENCE: line describing the exact tested path and an OUTPUT_ERRORS: line containing NONE or the remaining errors. Finish only when the tested path is clean or a genuine user-only blocker remains.`;
}

function needsWriteApproval(name) {
  const bare = String(name || "").split("/").pop().toLowerCase();
  if (/^(script_read|script_search|script_grep|search_asset|screen_capture|get_|inspect_|list_|read_|wait_job_finished)$/.test(bare)) return false;
  return /(edit|write|create|delete|execute|insert|generate|set_|rename|move|update)/.test(bare);
}

async function persistApprovals() {
  pendingApprovals = pendingApprovals.slice(-20);
  await chrome.storage.local.set({ zsPendingApprovals: pendingApprovals });
}

async function runProjectPreflight() {
  const tool = robloxTool("execute_luau");
  if (!tool || !connected || studioConnected === false) return "PREFLIGHT_UNAVAILABLE: Studio or execute_luau is not ready.";
  const code = `local HttpService=game:GetService("HttpService")
local report={counts={scripts=0,remotes=0,guis=0,parts=0},warnings={}}
local function warn(kind,path,detail) if #report.warnings<80 then table.insert(report.warnings,{kind=kind,path=path,detail=detail}) end end
local function pathOf(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return table.concat(out,".") end
for _,inst in game:GetDescendants() do
 if inst:IsA("LuaSourceContainer") then
  report.counts.scripts+=1 local ok,src=pcall(function() return inst.Source end)
  if ok then local p=pathOf(inst)
   if #src==0 then warn("empty_script",p,"Script has no source") end
   if src:find("OnServerEvent") and not (src:find("typeof%(") or src:find(":IsA%(") or src:find("math%.clamp") or src:find("tonumber%(") ) then warn("remote_validation",p,"Server remote handler has no obvious input validation") end
   if src:find("DataStore") and not src:find("UpdateAsync") then warn("datastore_set",p,"DataStore code does not use UpdateAsync") end
   if src:find("while%s+true%s+do") and not (src:find("task%.wait") or src:find("RunService")) then warn("tight_loop",p,"Possible non-yielding loop") end
   if inst:IsA("LocalScript") and (src:find("leaderstats") or src:find("DataStore") or src:find("ProcessReceipt")) then warn("client_trust",p,"Sensitive economy/save logic appears in a LocalScript") end
  end
 elseif inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") then report.counts.remotes+=1
 elseif inst:IsA("ScreenGui") then report.counts.guis+=1 if inst.IgnoreGuiInset==false then warn("safe_area",pathOf(inst),"Review top-bar/safe-area behavior") end
 elseif inst:IsA("BasePart") then report.counts.parts+=1 if inst.Anchored==false and inst:IsDescendantOf(workspace) and inst:GetMass()>5000 then warn("physics",pathOf(inst),"Large unanchored assembly may hurt performance") end end
end
if not game:GetService("ServerScriptService"):FindFirstChildWhichIsA("LuaSourceContainer",true) then warn("missing_server","ServerScriptService","No server script found") end
return "PREFLIGHT_OK:"..HttpService:JSONEncode(report)`;
  const r = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 25000 }, 30000);
  return r && r.ok ? String(r.text || "PREFLIGHT_OK:empty") : `PREFLIGHT_ERROR:${String(r && r.error || "scan failed")}`;
}

async function scanAndPersistProject() {
  projectAudit = { status: "scanning", report: projectAudit.report || "", scannedAt: projectAudit.scannedAt || 0 };
  broadcastTeam();
  const report = await runProjectPreflight();
  const ok = /^PREFLIGHT_OK:/.test(report);
  projectAudit = { status: ok ? "ready" : "error", report: report.slice(0, 24000), scannedAt: Date.now() };
  await chrome.storage.local.set({ zsProjectAudit: projectAudit });
  broadcastTeam();
  return { ok, audit: projectAudit, team: teamObj() };
}

async function collectQAEvidence(report) {
  const evidence = {
    reportHasTest: /TEST_EVIDENCE:\s*\S+/i.test(report || ""),
    reportHasOutput: /OUTPUT_ERRORS:\s*(NONE|\S+)/i.test(report || ""),
    consoleChecked: false,
    consoleClean: null,
    consoleText: "",
    checkedAt: Date.now(),
  };
  const tool = robloxTool("get_console_output");
  if (tool && connected && studioConnected !== false) {
    const r = await send({ type: "call_tool", name: tool.name, arguments: {}, timeout: 30000 }, 40000);
    evidence.consoleChecked = !!(r && r.ok);
    evidence.consoleText = String(r && (r.text || r.error) || "").slice(0, 8000);
    if (evidence.consoleChecked) evidence.consoleClean = !/(\[error\]|error:|traceback|stack begin|attempt to|infinite yield)/i.test(evidence.consoleText);
  }
  evidence.passed = evidence.reportHasTest && evidence.reportHasOutput && evidence.consoleClean !== false;
  return evidence;
}

function robloxTool(bare) {
  return toolsCache.find((t) => String(t.name || "").split("/").pop() === bare);
}

async function createCheckpoint(id) {
  const tool = robloxTool("execute_luau");
  if (!tool || !connected || studioConnected === false) return { ok: false, error: "Studio or execute_luau is unavailable." };
  checkpointState = { latest: checkpointState.latest, status: "saving", detail: id };
  broadcastTeam();
  const code = `local ServerStorage=game:GetService("ServerStorage")\nlocal HttpService=game:GetService("HttpService")\nlocal ChangeHistoryService=game:GetService("ChangeHistoryService")\nlocal root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") or Instance.new("Folder")\nroot.Name="ZeroScriptCheckpoints" root.Parent=ServerStorage\nlocal old=root:FindFirstChild(${JSON.stringify(id)}) if old then old:Destroy() end\nlocal cp=Instance.new("Folder") cp.Name=${JSON.stringify(id)} cp.Parent=root cp:SetAttribute("CreatedAt",os.time())\nlocal count=0\nlocal function parts(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return out end\nfor _,inst in game:GetDescendants() do\n if inst:IsA("LuaSourceContainer") and not inst:IsDescendantOf(root) then\n  local ok,source=pcall(function() return inst.Source end)\n  if ok then count+=1 local v=Instance.new("StringValue") v.Name=string.format("%06d",count) v.Value=source v:SetAttribute("PathJson",HttpService:JSONEncode(parts(inst))) v:SetAttribute("ZSClass",inst.ClassName) if inst:IsA("BaseScript") then v:SetAttribute("Disabled",inst.Disabled) end v.Parent=cp end\n end\nend\npcall(function() ChangeHistoryService:SetWaypoint("ZeroScript checkpoint ${id}") end)\nreturn "CHECKPOINT_OK:"..cp.Name..":"..count`;
  const r = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 60000 }, 70000);
  const ok = !!(r && r.ok && /CHECKPOINT_OK:/.test(r.text || ""));
  checkpointState = { latest: ok ? id : checkpointState.latest, status: ok ? "saved" : "error", detail: ok ? (r.text || "") : ((r && r.error) || (r && r.text) || "Checkpoint failed") };
  await chrome.storage.local.set({ zsCheckpointState: checkpointState });
  broadcastTeam();
  return { ok, id, error: ok ? null : checkpointState.detail };
}

async function restoreCheckpoint(id) {
  const tool = robloxTool("execute_luau");
  if (!id || !tool || !connected || studioConnected === false) return { ok: false, error: "No usable checkpoint or Studio connection." };
  if (writerLease) return { ok: false, error: `Studio is busy with ${writerLease.provider}. Stop the task first.` };
  checkpointState = { latest: id, status: "restoring", detail: id };
  broadcastTeam();
  const code = `local ServerStorage=game:GetService("ServerStorage")\nlocal HttpService=game:GetService("HttpService")\nlocal ChangeHistoryService=game:GetService("ChangeHistoryService")\nlocal root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(id)}) if not cp then return "ROLLBACK_ERROR:checkpoint not found" end\nlocal originals={} local entries={}\nfor _,v in cp:GetChildren() do if v:IsA("StringValue") then local p=v:GetAttribute("PathJson") if p then originals[p]=true table.insert(entries,v) end end end\nlocal function parts(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return out end\nlocal removed=0\nfor _,inst in game:GetDescendants() do if inst:IsA("LuaSourceContainer") and not inst:IsDescendantOf(root) then local key=HttpService:JSONEncode(parts(inst)) if not originals[key] then inst:Destroy() removed+=1 end end end\nlocal restored,missing=0,0\nfor _,v in entries do local path=HttpService:JSONDecode(v:GetAttribute("PathJson")) local ok,cur=pcall(function() return game:GetService(path[1]) end) if not ok then cur=nil end for i=2,#path-1 do cur=cur and cur:FindFirstChild(path[i]) end if cur then local inst=cur:FindFirstChild(path[#path]) local class=v:GetAttribute("ZSClass") if inst and inst.ClassName~=class then inst:Destroy() inst=nil end if not inst then inst=Instance.new(class) inst.Name=path[#path] inst.Parent=cur end local wrote=pcall(function() inst.Source=v.Value if inst:IsA("BaseScript") then inst.Disabled=v:GetAttribute("Disabled")==true end end) if wrote then restored+=1 else missing+=1 end else missing+=1 end end\npcall(function() ChangeHistoryService:SetWaypoint("ZeroScript rollback ${id}") end)\nreturn "ROLLBACK_OK:"..restored..":removed="..removed..":missing="..missing`;
  const r = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 60000 }, 70000);
  const ok = !!(r && r.ok && /ROLLBACK_OK:/.test(r.text || ""));
  checkpointState = { latest: id, status: ok ? "restored" : "error", detail: ok ? (r.text || "") : ((r && r.error) || (r && r.text) || "Rollback failed") };
  await chrome.storage.local.set({ zsCheckpointState: checkpointState });
  broadcastTeam();
  return { ok, error: ok ? null : checkpointState.detail, detail: checkpointState.detail };
}

async function dispatchTask() {
  if (!teamTask || ["done", "failed", "cancelled"].includes(teamTask.status)) return;
  const preferred = phaseProvider(teamTask.phase);
  const selected = fallbackAgent(preferred, teamTask.phase);
  if (!selected) {
    teamTask.status = "waiting";
    teamTask.error = `No model tab is available. Open and start a ZeroScript session in ${preferred} or another provider.`;
    teamTask.updatedAt = Date.now();
    broadcastTeam();
    return;
  }
  const [tabId] = selected.hit;
  const provider = selected.provider;
  teamTask.status = "running";
  teamTask.provider = provider;
  teamTask.error = selected.fallback ? `${preferred} is offline; automatically using ${provider}.` : null;
  teamTask.updatedAt = Date.now();
  await chrome.storage.local.set({ zsTeamTask: teamTask });
  broadcastTeam();
  chrome.tabs.sendMessage(tabId, { type: "zs-team-assignment", task: { ...teamTask, prompt: phasePrompt(teamTask) } }).catch((e) => {
    teamTask.status = "waiting";
    teamTask.error = String(e && e.message || e);
    broadcastTeam();
  });
}

function broadcastTeam() {
  const msg = { type: "zs-team-status", team: teamObj() };
  chrome.runtime.sendMessage(msg).catch(() => {});
  chrome.tabs.query({ url: PROVIDER_URLS }, (tabs) => {
    for (const t of tabs) chrome.tabs.sendMessage(t.id, msg).catch(() => {});
  });
}

function log(...a) {
  console.log("[zs-bg]", ...a);
}

// ── WebSocket lifecycle ─────────────────────────────────────────────────
function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  clearTimeout(reconnectTimer);
  try {
    ws = new WebSocket(URL);
  } catch (e) {
    log("WebSocket ctor failed", e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    connected = true;
    reconnectDelay = RECONNECT_MIN;
    lastMessageAt = Date.now();
    log("connected to bridge");
    startHeartbeat();
    broadcastStatus();
  };

  ws.onmessage = (ev) => {
    lastMessageAt = Date.now();
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleBridgeMessage(msg);
  };

  ws.onclose = () => {
    connected = false;
    mcpAlive = false;
    studioConnected = null;
    studioApp = null;
    studioProc = null;
    serversCache = [];
    stopHeartbeat();
    failAllPending("bridge connection closed");
    broadcastStatus();
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will follow; nothing to do here but avoid an unhandled error.
    try { ws.close(); } catch {}
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.7, RECONNECT_MAX);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (connected) {
      // Half-open socket: the WS still reports OPEN but nothing comes through.
      // The pong (and every other frame) refreshes lastMessageAt; if it has
      // gone stale, drop the dead socket so onclose triggers a reconnect.
      if (lastMessageAt && Date.now() - lastMessageAt > STALE_SOCKET_MS) {
        log("socket stale, forcing reconnect");
        try { ws.close(); } catch {}
        return;
      }
      // Keeps the MV3 service worker alive AND detects a half-open socket.
      send({ type: "ping" }).catch(() => {});
      refreshStudioStatus();
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

// Resolve once the socket is OPEN, or false after `timeout` ms.
function waitForConnection(timeout = 8000) {
  return new Promise((resolve) => {
    if (connected && ws && ws.readyState === WebSocket.OPEN) return resolve(true);
    connect(); // nudge a (re)connection - important after a worker wake-up
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (connected && ws && ws.readyState === WebSocket.OPEN) {
        clearInterval(iv);
        resolve(true);
      } else if (Date.now() - t0 > timeout) {
        clearInterval(iv);
        resolve(false);
      }
    }, 100);
  });
}

// ── request/response over the socket ────────────────────────────────────
async function send(obj, timeout = REQUEST_TIMEOUT_DEFAULT) {
  // The MV3 service worker can be suspended; the first message after a wake-up
  // arrives before the socket has re-opened. Wait for it instead of failing -
  // otherwise Kimi wrongly hears "bridge offline".
  if (!connected || !ws || ws.readyState !== WebSocket.OPEN) {
    await waitForConnection(8000);
  }
  return new Promise((resolve) => {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, kind: "disconnected", error: "bridge not connected" });
      return;
    }
    const id = nextId++;
    const payload = { ...obj, id };
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ ok: false, kind: "timeout", error: "bridge did not respond in time" });
      }
    }, timeout);
    pending.set(id, { resolve, timer });
    try {
      ws.send(JSON.stringify(payload));
    } catch (e) {
      clearTimeout(timer);
      pending.delete(id);
      resolve({ ok: false, kind: "disconnected", error: String(e) });
    }
  });
}

// Ask the bridge whether a Roblox Studio instance is actually connected to the
// MCP server. Broadcasts only on change so the UI updates promptly but quietly.
let studioProbing = false;
async function refreshStudioStatus() {
  if (studioProbing || !connected) return;
  studioProbing = true;
  try {
    const r = await send({ type: "studio_status" }, 12000);
    const v = r && r.ok && typeof r.studio === "boolean" ? r.studio : null;
    if (v !== studioConnected) {
      studioConnected = v;
      broadcastStatus();
    }
  } finally {
    studioProbing = false;
  }
}

function handleBridgeMessage(msg) {
  if ("studio" in msg && (typeof msg.studio === "boolean" || msg.studio === null)) {
    studioConnected = msg.studio;
  }
  if ("studio_app" in msg && (typeof msg.studio_app === "boolean" || msg.studio_app === null)) {
    studioApp = msg.studio_app;
  }
  if ("studio_proc" in msg && (typeof msg.studio_proc === "boolean" || msg.studio_proc === null)) {
    studioProc = msg.studio_proc;
  }
  if (msg.type === "studio_status") {
    resolvePending(msg.id, { ok: true, studio: studioConnected });
    broadcastStatus();
    return;
  }
  if (msg.type === "connected") {
    mcpAlive = !!msg.mcp_alive;
    if (Array.isArray(msg.tools)) toolsCache = msg.tools;
    if (Array.isArray(msg.servers)) serversCache = msg.servers;
    broadcastStatus();
    return;
  }
  if (msg.type === "pong") {
    resolvePending(msg.id, { ok: true });
    return;
  }
  if (msg.type === "tools") {
    if (Array.isArray(msg.tools)) toolsCache = msg.tools;
    if (Array.isArray(msg.servers)) serversCache = msg.servers;
    mcpAlive = !!msg.mcp_alive;
    resolvePending(msg.id, { ok: true, tools: toolsCache });
    broadcastStatus();
    return;
  }
  if (msg.type === "tool_result") {
    resolvePending(msg.id, msg.ok
      ? { ok: true, text: msg.text, images: msg.images || [] }
      : { ok: false, kind: msg.kind, error: msg.error });
    return;
  }
  if (msg.type === "mcp_status") {
    mcpAlive = !!msg.alive;
    if (Array.isArray(msg.tools)) toolsCache = msg.tools;
    if (Array.isArray(msg.servers)) serversCache = msg.servers;
    resolvePending(msg.id, { ok: !!msg.ok, alive: msg.alive, error: msg.error });
    broadcastStatus();
    return;
  }
  if (msg.type === "server_changed") {
    // The bridge acks, then restarts itself to reload config.json. The socket
    // will drop right after this - the content script shows a spinner until the
    // reconnect lands and a fresh status arrives.
    resolvePending(msg.id, { ok: !!msg.ok, error: msg.error, restarting: !!msg.restarting });
    return;
  }
  if (msg.type === "error") {
    resolvePending(msg.id, { ok: false, error: msg.error });
    return;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasRobloxTool(name) {
  return toolsCache.some((tool) => tool && (tool.name === name || tool.name === `roblox/${name}`));
}

function studioReadinessError() {
  if (!connected) return "Bridge offline. Run start.bat / python bridge.py, then press Start again.";
  if (!mcpAlive) return "Roblox MCP server is not answering yet. Keep Roblox Studio open and press Start again.";
  if (studioConnected === false && studioProc === true && studioApp === false) {
    return "Roblox Studio is open but not connected. In Studio open Assistant Settings > MCP Servers and enable/toggle the MCP server, then press Start again.";
  }
  if (studioConnected === false && studioApp === false) {
    return "Roblox Studio is not connected. Open Roblox Studio, open a place, enable Assistant Settings > MCP Servers, then press Start again.";
  }
  if (studioConnected === false && studioApp === true) {
    return "Roblox Studio is connected but no place is open. Open your place file, then press Start again.";
  }
  if (!hasRobloxTool("execute_luau")) {
    return "Roblox tools are not available yet. Keep Studio open and press Restart Roblox server, or press Start again in a few seconds.";
  }
  return null;
}

async function refreshRobloxReadiness() {
  await send({ type: "list_tools" }, 25000);
  await send({ type: "studio_status" }, 12000);
}

async function ensureStudioReadyForTask() {
  if (!(await waitForConnection(8000))) return { ok: false, error: studioReadinessError() };

  await refreshRobloxReadiness();
  let error = studioReadinessError();
  if (!error) return { ok: true };

  // A common live failure is a stale StudioMCP proxy: the bridge is up, but the
  // Studio catalogue is empty or the place probe still says disconnected. One
  // targeted restart usually rebinds it after Studio was opened/toggled.
  if (connected) {
    const restart = await send({ type: "restart_mcp", server: "roblox" }, 35000);
    if (restart && restart.ok) {
      await sleep(1200);
      await refreshRobloxReadiness();
      error = studioReadinessError();
      if (!error) return { ok: true, repaired: true };
    }
  }
  return { ok: false, error };
}

async function startTeamTask(goal) {
  goal = String(goal || "").trim();
  if (!goal) return { ok: false, error: "Enter a goal first." };
  if (taskStarting) return { ok: false, error: "A task is already being prepared." };
  taskStarting = true;
  const phases = phasesForGoal(goal);
  teamTask = { id: `task-${Date.now()}`, goal, phases, phaseIndex: 0, phase: phases[0], status: "connecting", provider: null, round: 0, lastReport: "", error: "Checking Roblox Studio connection…", createdAt: Date.now(), updatedAt: Date.now() };
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
    teamTask.error = ready.repaired ? "Reconnected Roblox MCP; scanning project…" : null;
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    broadcastTeam();
    const checkpoint = await createCheckpoint(teamTask.id);
    teamTask.checkpoint = checkpoint.ok ? checkpoint.id : null;
    if (!checkpoint.ok) teamTask.error = `Checkpoint warning: ${checkpoint.error}`;
    const audit = await scanAndPersistProject();
    teamTask.auditReport = audit.audit.report;
    teamTask.status = "queued";
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    broadcastTeam();
    dispatchTask();
    return { ok: true, team: teamObj() };
  } catch (error) {
    teamTask.status = "queued";
    teamTask.error = `Preflight skipped: ${String(error && error.message || error)}`;
    await chrome.storage.local.set({ zsTeamTask: teamTask });
    broadcastTeam();
    dispatchTask();
    return { ok: true, warning: teamTask.error, team: teamObj() };
  } finally {
    taskStarting = false;
  }
}

function resolvePending(id, value) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
  p.resolve(value);
}

function failAllPending(reason) {
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.resolve({ ok: false, kind: "disconnected", error: reason });
  }
  pending.clear();
}

// ── status push to any open DeepSeek tab + popup ─────────────────────────
function statusObj() {
  return { type: "zs-status", connected, mcpAlive, studio: studioConnected, studioApp, studioProc, tools: toolsCache.length, servers: serversCache, team: teamObj() };
}

function broadcastStatus() {
  chrome.runtime.sendMessage(statusObj()).catch(() => {});
  chrome.tabs.query({ url: PROVIDER_URLS }, (tabs) => {
    for (const t of tabs) chrome.tabs.sendMessage(t.id, statusObj()).catch(() => {});
  });
}

// ── messages from content.js / popup.js ─────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "status":
        if (!connected) connect(); // self-heal after a worker wake-up
        sendResponse(statusObj());
        break;
      case "list_tools": {
        // Prefer a live refresh; fall back to cache so the loop never stalls.
        const r = await send({ type: "list_tools" }, 25000);
        if (r.ok) sendResponse({ ok: true, tools: r.tools });
        else sendResponse({ ok: toolsCache.length > 0, tools: toolsCache, error: r.error });
        break;
      }
      case "call_tool": {
        if (teamConfig.enabled) {
          cleanTeamState();
          const tabId = sender.tab && sender.tab.id;
          if (!msg.team_token || !writerLease || writerLease.token !== msg.team_token || writerLease.tabId !== tabId) {
            sendResponse({ ok: false, kind: "team_lock", error: "Another model owns the Roblox Studio lock. Wait and retry." });
            break;
          }
          writerLease.expiresAt = Date.now() + WRITE_LEASE_MS;
        }
        if (teamConfig.approvalMode === "review" && needsWriteApproval(msg.name)) {
          const approval = {
            id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: msg.name,
            arguments: msg.arguments || {},
            provider: msg.provider || "agent",
            createdAt: Date.now(),
          };
          pendingApprovals.push(approval);
          await persistApprovals();
          broadcastTeam();
          sendResponse({ ok: false, kind: "approval_required", error: `Studio write queued for approval (${approval.id}). Tell the user what will change and wait.` });
          break;
        }
        const timeout = (msg.timeout || 120000) + 10000;
        const r = await send(
          { type: "call_tool", name: msg.name, arguments: msg.arguments, timeout: msg.timeout },
          timeout
        );
        sendResponse(r);
        break;
      }
      case "team_register": {
        if (sender.tab && sender.tab.id != null) {
          teamAgents.set(sender.tab.id, { provider: msg.provider || "unknown", title: sender.tab.title || "", ready: msg.ready === true, lastSeen: Date.now() });
          broadcastTeam();
          if (msg.ready === true && teamTask && teamTask.status === "waiting") dispatchTask();
        }
        sendResponse({ ok: true, team: teamObj() });
        break;
      }
      case "team_config": {
        teamConfig = { ...TEAM_DEFAULTS, ...(msg.config || {}) };
        await chrome.storage.local.set({ zsTeamConfig: teamConfig });
        if (!teamConfig.enabled) writerLease = null;
        broadcastTeam();
        sendResponse({ ok: true, team: teamObj() });
        break;
      }
      case "team_acquire": {
        const tabId = sender.tab && sender.tab.id;
        cleanTeamState();
        if (!teamConfig.enabled) { sendResponse({ ok: true, token: null, disabled: true }); break; }
        if (writerLease && writerLease.tabId !== tabId) {
          sendResponse({ ok: false, busy: true, writer: writerLease.provider });
          break;
        }
        const token = writerLease && writerLease.tabId === tabId ? writerLease.token : `${tabId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        writerLease = { tabId, provider: msg.provider || "unknown", token, expiresAt: Date.now() + WRITE_LEASE_MS };
        broadcastTeam();
        sendResponse({ ok: true, token });
        break;
      }
      case "team_release": {
        const tabId = sender.tab && sender.tab.id;
        if (writerLease && writerLease.tabId === tabId && (!msg.token || msg.token === writerLease.token)) writerLease = null;
        broadcastTeam();
        sendResponse({ ok: true });
        break;
      }
      case "team_task_start": {
        const goal = String(msg.goal || "").trim();
        if (!goal) { sendResponse({ ok: false, error: "Enter a goal first." }); break; }
        if (taskStarting) { sendResponse({ ok: false, error: "A task is already being prepared.", team: teamObj() }); break; }
        sendResponse({ ok: true, preparing: true, team: teamObj() });
        startTeamTask(goal).catch((error) => console.error("[zeroscript] task preparation failed", error));
        break;
      }
      case "team_project_scan": {
        sendResponse(await scanAndPersistProject());
        break;
      }
      case "team_task_done": {
        if (!teamTask || msg.task_id !== teamTask.id || msg.phase !== teamTask.phase) { sendResponse({ ok: false, error: "Stale task result ignored." }); break; }
        const completedPhase = teamTask.phase;
        if (teamTask.provider && providerHealth[teamTask.provider]) {
          delete providerHealth[teamTask.provider];
          await chrome.storage.local.set({ zsProviderHealth: providerHealth });
        }
        teamTask.lastReport = String(msg.report || "").slice(0, 12000);
        if (completedPhase === "qa") {
          teamTask.qaEvidence = await collectQAEvidence(teamTask.lastReport);
          if (!teamTask.qaEvidence.passed) {
            teamTask.qaRetries = (teamTask.qaRetries || 0) + 1;
            if (teamTask.qaRetries <= 2) {
              const missing = [
                !teamTask.qaEvidence.reportHasTest && "TEST_EVIDENCE",
                !teamTask.qaEvidence.reportHasOutput && "OUTPUT_ERRORS",
                teamTask.qaEvidence.consoleClean === false && "clean Studio Output",
              ].filter(Boolean).join(", ");
              teamTask.status = "queued";
              teamTask.error = `QA evidence rejected; repeat the playtest and provide ${missing || "verifiable evidence"}.`;
              teamTask.lastReport += `\n\nAUTOMATIC QA GATE: ${teamTask.error}\nCaptured Output:\n${teamTask.qaEvidence.consoleText.slice(0, 2500)}`;
              teamTask.updatedAt = Date.now();
              await chrome.storage.local.set({ zsTeamTask: teamTask });
              sendResponse({ ok: true, retrying: true, team: teamObj() });
              broadcastTeam();
              dispatchTask();
              break;
            }
            teamTask.status = "failed";
            teamTask.error = "QA evidence gate failed after two automatic retries.";
          }
        }
        teamTask.events = Array.isArray(teamTask.events) ? teamTask.events : [];
        teamTask.events.push({ phase: completedPhase, provider: teamTask.provider, at: Date.now(), report: teamTask.lastReport.slice(0, 1000) });
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
          teamHistory.push({ id: teamTask.id, goal: teamTask.goal, status: teamTask.status, rounds: teamTask.round || 0, qaEvidence: teamTask.qaEvidence || null, createdAt: teamTask.createdAt, completedAt: Date.now(), events: (teamTask.events || []).slice(-20) });
          teamHistory = teamHistory.slice(-50);
          await chrome.storage.local.set({ zsTeamHistory: teamHistory });
        }
        await chrome.storage.local.set({ zsTeamTask: teamTask });
        sendResponse({ ok: true, team: teamObj() });
        broadcastTeam();
        if (!["done", "failed"].includes(teamTask.status)) dispatchTask();
        break;
      }
      case "team_task_error": {
        if (teamTask && msg.task_id === teamTask.id) {
          const failed = teamTask.provider || msg.provider || "unknown";
          const reason = String(msg.error || "Model tab could not run the task.");
          const setupProblem = /start a zeroscript session|not started|is busy in another turn/i.test(reason);
          if (setupProblem) {
            teamTask.status = "waiting";
            teamTask.error = reason;
            teamTask.updatedAt = Date.now();
            await chrome.storage.local.set({ zsTeamTask: teamTask });
            broadcastTeam();
            sendResponse({ ok: true, waiting: true });
            break;
          }
          teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
          if (!teamTask.failedProviders.includes(failed)) teamTask.failedProviders.push(failed);
          const limited = /quota|rate limit|context limit|too long|captcha|usage limit/i.test(reason);
          providerHealth[failed] = { status: limited ? "limited" : "error", reason: reason.slice(0, 240), until: Date.now() + (limited ? 60 : 15) * 60 * 1000 };
          await chrome.storage.local.set({ zsProviderHealth: providerHealth });
          teamTask.status = "queued";
          teamTask.error = `${failed} failed; selecting another model. ${reason}`;
          teamTask.updatedAt = Date.now();
          await chrome.storage.local.set({ zsTeamTask: teamTask });
          broadcastTeam();
          dispatchTask();
        }
        sendResponse({ ok: true });
        break;
      }
      case "team_task_retry": {
        if (teamTask) {
          // Retry is an explicit user signal that setup/transient problems were
          // fixed. Forget per-task failures and clear only generic error health;
          // real quota/captcha limits remain cooled down to avoid immediate loops.
          teamTask.failedProviders = [];
          for (const [provider, h] of Object.entries(providerHealth)) {
            if (h && h.status === "error") delete providerHealth[provider];
          }
          teamTask.status = "queued";
          teamTask.error = null;
          teamTask.updatedAt = Date.now();
          await chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth });
          broadcastTeam();
          dispatchTask();
        }
        sendResponse({ ok: !!teamTask, team: teamObj() });
        break;
      }
      case "team_task_cancel": {
        if (teamTask) { teamTask.status = "cancelled"; teamTask.updatedAt = Date.now(); await chrome.storage.local.set({ zsTeamTask: teamTask }); }
        writerLease = null;
        broadcastTeam();
        sendResponse({ ok: true, team: teamObj() });
        break;
      }
      case "team_checkpoint_restore": {
        const id = msg.id || checkpointState.latest;
        const r = await restoreCheckpoint(id);
        sendResponse({ ...r, team: teamObj() });
        break;
      }
      case "team_approval_apply": {
        const index = pendingApprovals.findIndex((a) => a.id === msg.id);
        if (index < 0) { sendResponse({ ok: false, error: "Approval request not found." }); break; }
        if (writerLease) { sendResponse({ ok: false, error: `Studio is busy with ${writerLease.provider}.` }); break; }
        const approval = pendingApprovals[index];
        const r = await send({ type: "call_tool", name: approval.name, arguments: approval.arguments, timeout: 120000 }, 130000);
        pendingApprovals.splice(index, 1);
        await persistApprovals();
        broadcastTeam();
        sendResponse({ ok: !!(r && r.ok), result: r && (r.text || r.error), team: teamObj() });
        break;
      }
      case "team_approval_reject": {
        pendingApprovals = pendingApprovals.filter((a) => a.id !== msg.id);
        await persistApprovals();
        broadcastTeam();
        sendResponse({ ok: true, team: teamObj() });
        break;
      }
      case "restart_mcp": {
        const r = await send({ type: "restart_mcp" }, 30000);
        sendResponse(r);
        break;
      }
      case "add_server": {
        const r = await send({
          type: "add_server", server_id: msg.server_id,
          command: msg.command, args: msg.args, env: msg.env,
        }, 15000);
        sendResponse(r);
        break;
      }
      case "remove_server": {
        const r = await send({ type: "remove_server", server_id: msg.server_id }, 15000);
        sendResponse(r);
        break;
      }
      case "reconnect":
        reconnectDelay = RECONNECT_MIN;
        connect();
        sendResponse({ ok: true });
        break;
      default:
        sendResponse({ ok: false, error: "unknown message" });
    }
  })();
  return true; // async sendResponse
});

// Wake/keepalive hooks.
chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);

connect();

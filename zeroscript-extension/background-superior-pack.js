// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.30 Superior Pack.
// The extension is not an AI model: deterministic rules choose risk, scope,
// proof requirements and routing constraints; connected browser AIs perform the
// creative implementation under those contracts.

const ZS_SUPERIOR_KEY = "zsSuperiorState";
let zsSuperior = {
  version: 1,
  settings: { shadowGuard: true, proofGate: true, modelJury: true, autoGenome: true, selfHealing: "suggest" },
  intent: null,
  genome: { status: "idle", scannedAt: 0, counts: {}, systems: [], nodes: [], edges: [], remotes: [], guis: [] },
  shadow: { status: "idle", taskId: "", detail: "", scopes: [], createdAt: 0 },
  latestProof: null,
  jury: { status: "idle", taskId: "", detail: "", requestedAt: 0 },
  selfHealing: { status: "idle", lastAt: 0, detail: "" },
  updatedAt: Date.now(),
};
let zsSuperiorLastTerminal = "";
let zsSuperiorLastProjectKey = "";
let zsSuperiorLastOutputSignature = "";

chrome.storage.local.get(ZS_SUPERIOR_KEY, (result) => {
  const saved = result && result[ZS_SUPERIOR_KEY];
  if (saved && typeof saved === "object") {
    zsSuperior = {
      ...zsSuperior,
      ...saved,
      settings: { ...zsSuperior.settings, ...(saved.settings || {}) },
      genome: { ...zsSuperior.genome, ...(saved.genome || {}) },
      shadow: { ...zsSuperior.shadow, ...(saved.shadow || {}) },
      jury: { ...zsSuperior.jury, ...(saved.jury || {}) },
      selfHealing: { ...zsSuperior.selfHealing, ...(saved.selfHealing || {}) },
    };
  }
  broadcastTeam();
});

function zsSuperiorPersist() {
  zsSuperior.updatedAt = Date.now();
  return chrome.storage.local.set({ [ZS_SUPERIOR_KEY]: zsSuperior });
}

function zsSuperiorCategory(goal) {
  const value = String(goal || "").toLowerCase();
  const rules = [
    ["release", /release|publish|production|yayın/],
    ["security", /remote|exploit|security|güvenlik|hack/],
    ["data", /datastore|save|load|migration|session lock|veri|kayıt/],
    ["monetization", /shop|gamepass|developer product|receipt|purchase|robux|satın/],
    ["rng", /rng|roll|aura|pity|luck|rarity/],
    ["economy", /economy|currency|coin|gem|rebirth|upgrade|ekonomi/],
    ["ui", /ui|gui|hud|button|mobile|responsive|menu|arayüz|buton/],
    ["map", /map|world|terrain|lobby|lighting|spawn|harita|dünya/],
    ["vfx", /vfx|particle|beam|trail|effect|efekt/],
    ["onboarding", /tutorial|onboarding|new player|ilk giriş|rehber/],
    ["performance", /performance|lag|fps|memory|optimi|renderstepped|heartbeat/],
    ["debug", /output|error|warning|bug|hata|nil|infinite yield/],
    ["gameplay", /inventory|equip|pet|quest|combat|gameplay|tool|weapon/],
  ];
  for (const [name, pattern] of rules) if (pattern.test(value)) return name;
  return "general";
}

const ZS_SUPERIOR_CONTRACTS = {
  ui: ["Desktop layout remains readable", "Mobile safe area and touch targets pass", "Every changed button opens and closes correctly", "Studio Output remains clean"],
  rng: ["The server produces the result", "Cooldown and rate limits are enforced", "Pity and luck update exactly once", "Inventory and rejoin persistence pass"],
  data: ["First join defaults load", "Rejoin restores saved state", "Failure paths do not overwrite good data", "Migration preserves compatible fields"],
  security: ["Wrong types and ranges are rejected", "Ownership is checked on the server", "Spam is rate-limited", "Duplicate rewards are idempotent"],
  monetization: ["The client cannot grant purchases", "Receipt processing is idempotent", "Invalid or cancelled purchases grant nothing", "A durable grant survives rejoin"],
  map: ["Spawn view and traversal work", "Gameplay anchors remain intact", "Respawn returns to a valid location", "Physics load remains reasonable"],
  debug: ["The error is reproduced before the fix", "The root cause is changed rather than hidden", "The affected path is replayed", "The Output signature disappears"],
  release: ["The main loop passes", "Respawn passes", "Desktop and mobile checks pass", "Purchases, data and Output have explicit evidence"],
  general: ["Requested behavior is demonstrated", "Working APIs remain compatible", "The affected path is regression-tested", "Studio Output remains clean"],
};

function zsSuperiorCompileIntent(goal) {
  const text = String(goal || "").trim();
  const category = zsSuperiorCategory(text);
  let score = 12;
  const reasons = [];
  if (["security", "data", "monetization", "release"].includes(category)) { score += 48; reasons.push(`${category} affects player trust or data`); }
  else if (["economy", "map", "performance", "rng"].includes(category)) { score += 28; reasons.push(`${category} has broad gameplay impact`); }
  else if (category === "ui") score += 14;
  if (/datastore|processreceipt|purchase|currency|reward|security|remote|migration|publish|production|veri|satın|ekonomi/i.test(text)) { score += 24; reasons.push("critical server/data keywords"); }
  if (/complete|entire|full|all systems|refactor|komple|tüm oyun|her şeyi|baştan/i.test(text)) { score += 18; reasons.push("broad scope"); }
  if (/delete|remove all|replace entire|wipe|reset|sil|tamamen kaldır|sıfırla/i.test(text)) { score += 28; reasons.push("destructive wording"); }
  const counts = zsSuperior.genome.counts || {};
  if (Number(counts.scripts || 0) > 100) score += 8;
  if (Number(counts.remotes || 0) > 30) score += 6;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? "critical" : score >= 55 ? "high" : score >= 30 ? "medium" : "low";
  const providerMap = { ui: "gemini", map: "gemini", vfx: "gemini", debug: "deepseek", security: "qwen", data: "qwen", monetization: "qwen", performance: "qwen", release: "chatgpt", general: "qwen" };
  const phases = ["inspect"];
  if (!["ui", "map", "vfx"].includes(category) || /script|server|system|kod|sistem/i.test(text)) phases.push("implement");
  if (category === "map") phases.push("map");
  if (["ui", "vfx", "onboarding"].includes(category)) phases.push("ui");
  phases.push("review", "qa");
  const acceptance = [...(ZS_SUPERIOR_CONTRACTS[category] || ZS_SUPERIOR_CONTRACTS.general)];
  return {
    id: `intent-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    goal: text,
    category,
    risk: { score, level, reasons: reasons.length ? reasons : ["targeted local change"] },
    phases: [...new Set(phases)],
    preferredProvider: providerMap[category] || "qwen",
    juryRequired: zsSuperior.settings.modelJury && ["high", "critical"].includes(level),
    shadowRequired: zsSuperior.settings.shadowGuard && (["high", "critical"].includes(level) || /delete|wipe|sil|sıfırla/i.test(text)),
    proof: {
      acceptance,
      requiresPlaytest: true,
      requiresOutput: true,
      requiresScreenshots: ["ui", "map", "vfx", "release"].includes(category),
      requiresRespawn: ["ui", "map", "gameplay", "release"].includes(category),
      requiresRejoin: ["data", "rng", "economy", "monetization", "release"].includes(category),
      requiresSecurityInputs: ["security", "data", "monetization", "economy"].includes(category),
    },
    createdAt: Date.now(),
  };
}

function zsSuperiorIntentBlock(intent) {
  if (!intent) return "";
  const lines = [
    "ZEROSCRIPT SUPERIOR CONTRACT",
    `Category: ${intent.category} · Risk: ${intent.risk.level} (${intent.risk.score}/100)`,
    `Local decision: ${intent.preferredProvider} preferred · ${intent.juryRequired ? "Model Jury required" : "single reviewer"} · ${intent.shadowRequired ? "Shadow Guard required" : "normal checkpoint"}`,
    "BEHAVIORAL CONTRACT",
    ...(intent.proof.acceptance || []).map((item) => `- ${item}`),
    "PROOF CONTRACT",
    "- Inspect the actual Studio state before editing",
    "- Playtest the affected path and read Studio Output",
  ];
  if (intent.proof.requiresScreenshots) lines.push("- Capture comparable before/after screenshots");
  if (intent.proof.requiresRespawn) lines.push("- Repeat after respawn");
  if (intent.proof.requiresRejoin) lines.push("- Verify rejoin/save behavior without production-data destruction");
  if (intent.proof.requiresSecurityInputs) lines.push("- Test invalid, abusive and duplicate inputs safely");
  if (intent.juryRequired) lines.push("- Reviewer must compare the implemented approach with at least one safer alternative and give an explicit verdict");
  lines.push("Stored memory is guidance, not proof. Never claim PASS without the required evidence.");
  return lines.join("\n");
}

function zsSuperiorTool(name) {
  return typeof robloxTool === "function" ? robloxTool(name) : null;
}

async function zsSuperiorScanGenome(force = false) {
  if (!force && zsSuperior.genome.status === "ready" && Date.now() - Number(zsSuperior.genome.scannedAt || 0) < 120000) return zsSuperior.genome;
  const tool = zsSuperiorTool("execute_luau");
  if (!tool || !connected || studioConnected === false || writerLease) return { ok: false, error: "Studio is unavailable or busy." };
  zsSuperior.genome = { ...zsSuperior.genome, status: "running", detail: "Scanning scripts, remotes and UI dependencies." };
  await zsSuperiorPersist(); broadcastTeam();
  const code = String.raw`
local HttpService=game:GetService("HttpService")
local services={"Workspace","ReplicatedStorage","ServerScriptService","ServerStorage","StarterGui","StarterPlayer","Lighting"}
local out={counts={scripts=0,remotes=0,guis=0,parts=0},nodes={},edges={},remotes={},guis={},systems={}}
local systems={}
local function pathOf(inst)
 local parts={} local current=inst
 while current and current~=game do table.insert(parts,1,current.Name) current=current.Parent end
 return table.concat(parts,".")
end
local function addSystem(name) if name and name~="" then systems[name]=true end end
for _,serviceName in services do
 local ok,service=pcall(function() return game:GetService(serviceName) end)
 if ok and service then
  for _,inst in service:GetDescendants() do
   if inst:IsA("BasePart") then out.counts.parts+=1 end
   if inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") then
    out.counts.remotes+=1
    if #out.remotes<180 then table.insert(out.remotes,{path=pathOf(inst),class=inst.ClassName,name=inst.Name}) end
    addSystem(inst.Name:gsub("Remote$",""):gsub("Event$",""):gsub("Function$",""))
   elseif inst:IsA("ScreenGui") then
    out.counts.guis+=1
    if #out.guis<80 then table.insert(out.guis,{path=pathOf(inst),buttons=#inst:GetDescendants()}) end
    addSystem(inst.Name:gsub("Gui$",""):gsub("UI$",""))
   elseif inst:IsA("LuaSourceContainer") then
    out.counts.scripts+=1
    if #out.nodes<280 then
     local node={path=pathOf(inst),class=inst.ClassName,name=inst.Name,services={},references={}}
     local source="" pcall(function() source=inst.Source end)
     local seen={}
     for dependency in source:gmatch("GetService%s*%(%s*['\"]([%w_]+)['\"]%s*%)") do
      if not seen[dependency] and #node.services<16 then seen[dependency]=true table.insert(node.services,dependency) end
     end
     for reference in source:gmatch("WaitForChild%s*%(%s*['\"]([%w_%- ]+)['\"]") do
      if #node.references<24 then table.insert(node.references,reference) end
      if #out.edges<900 then table.insert(out.edges,{from=node.path,to=reference,kind="WaitForChild"}) end
     end
     for reference in source:gmatch("FindFirstChild%s*%(%s*['\"]([%w_%- ]+)['\"]") do
      if #node.references<24 then table.insert(node.references,reference) end
      if #out.edges<900 then table.insert(out.edges,{from=node.path,to=reference,kind="FindFirstChild"}) end
     end
     table.insert(out.nodes,node)
     addSystem(inst.Name:gsub("Controller$",""):gsub("Service$",""):gsub("Manager$",""):gsub("Handler$",""))
    end
   end
  end
 end
end
for name in systems do if #out.systems<120 then table.insert(out.systems,name) end end
table.sort(out.systems)
out.placeId=game.PlaceId out.gameId=game.GameId out.name=game.Name out.scannedAt=DateTime.now().UnixTimestampMillis
return "ZS_GENOME:"..HttpService:JSONEncode(out)`;
  try {
    const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 90000 }, 100000);
    const match = result && result.ok && /ZS_GENOME:(\{[\s\S]*\})/.exec(String(result.text || ""));
    if (!match) throw new Error(String(result && (result.error || result.text) || "Genome scan returned no data."));
    const genome = JSON.parse(match[1]);
    zsSuperior.genome = { ...genome, status: "ready", detail: `${genome.counts.scripts} scripts, ${genome.counts.remotes} remotes and ${genome.edges.length} dependency edges.`, scannedAt: Number(genome.scannedAt || Date.now()) };
    await zsSuperiorPersist(); broadcastTeam();
    if (typeof zsAutomationNotice === "function") zsAutomationNotice("genome", "Project Genome güncellendi", zsSuperior.genome.detail);
    return { ok: true, genome: zsSuperior.genome };
  } catch (error) {
    zsSuperior.genome = { ...zsSuperior.genome, status: "error", detail: String(error && error.message || error), scannedAt: Date.now() };
    await zsSuperiorPersist(); broadcastTeam();
    return { ok: false, error: zsSuperior.genome.detail };
  }
}

function zsSuperiorScopes(goal) {
  const text = String(goal || "").toLowerCase();
  const scopes = new Set();
  const full = /release|complete|entire|full|komple|tüm oyun|her şeyi/.test(text);
  if (full || /ui|gui|hud|menu|button|mobile|arayüz|buton/.test(text)) { scopes.add("StarterGui"); scopes.add("StarterPlayer"); }
  if (full || /map|world|terrain|lighting|spawn|harita|dünya|ışık/.test(text)) { scopes.add("Workspace"); scopes.add("Lighting"); }
  if (full || !scopes.size || /script|code|server|remote|datastore|purchase|economy|kod|sunucu|veri|ekonomi/.test(text)) { scopes.add("ServerScriptService"); scopes.add("ReplicatedStorage"); scopes.add("StarterPlayer"); }
  return [...scopes];
}

async function zsSuperiorPrepareShadow() {
  const tool = zsSuperiorTool("execute_luau");
  if (!teamTask || !tool || !connected || studioConnected === false || writerLease) return { ok: false, error: "An active task and an idle Studio connection are required." };
  const scopes = zsSuperiorScopes(teamTask.goal);
  const taskId = String(teamTask.id || `task-${Date.now()}`);
  zsSuperior.shadow = { status: "running", taskId, detail: "Creating isolated scoped clones.", scopes, createdAt: Date.now() };
  await zsSuperiorPersist(); broadcastTeam();
  const code = `local ServerStorage=game:GetService("ServerStorage")
local HttpService=game:GetService("HttpService")
local root=ServerStorage:FindFirstChild("ZeroScriptShadow") or Instance.new("Folder") root.Name="ZeroScriptShadow" root.Parent=ServerStorage
local old=root:FindFirstChild(${JSON.stringify(taskId)}) if old then old:Destroy() end
local session=Instance.new("Folder") session.Name=${JSON.stringify(taskId)} session.Parent=root session:SetAttribute("CreatedAt",os.time()) session:SetAttribute("ReadOnly",true)
local scopes=HttpService:JSONDecode(${JSON.stringify(JSON.stringify(scopes))}) local saved,skipped=0,0
for _,serviceName in scopes do
 local ok,service=pcall(function() return game:GetService(serviceName) end)
 if ok and service then
  local bucket=Instance.new("Folder") bucket.Name=serviceName bucket.Parent=session
  local count=#service:GetDescendants() bucket:SetAttribute("OriginalDescendants",count)
  if count<=5000 then
   for _,child in service:GetChildren() do
    if child.Name~="ZeroScriptCheckpoints" and child.Name~="ZeroScriptShadow" and not child:IsA("Terrain") and not child:IsA("Player") then
     local arch=child.Archivable pcall(function() child.Archivable=true end)
     local cloneOk,clone=pcall(function() return child:Clone() end) pcall(function() child.Archivable=arch end)
     if cloneOk and clone then clone.Parent=bucket saved+=1 else skipped+=1 end
    end
   end
   bucket:SetAttribute("Complete",true)
  else bucket:SetAttribute("Complete",false) bucket:SetAttribute("SkipReason","scope too large") skipped+=1 end
 end
end
session:SetAttribute("ScopesJson",HttpService:JSONEncode(scopes)) session:SetAttribute("SavedTopLevel",saved) session:SetAttribute("Skipped",skipped)
return "ZS_SHADOW_OK:"..saved..":skipped="..skipped`;
  try {
    const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 90000 }, 100000);
    const ok = !!(result && result.ok && /ZS_SHADOW_OK:/.test(String(result.text || "")));
    zsSuperior.shadow = { status: ok ? "ready" : "error", taskId, detail: String(result && (result.text || result.error) || "Shadow creation failed"), scopes, createdAt: Date.now() };
    await zsSuperiorPersist(); broadcastTeam();
    return { ok, shadow: zsSuperior.shadow };
  } catch (error) {
    zsSuperior.shadow = { status: "error", taskId, detail: String(error && error.message || error), scopes, createdAt: Date.now() };
    await zsSuperiorPersist(); broadcastTeam();
    return { ok: false, error: zsSuperior.shadow.detail };
  }
}

function zsSuperiorProof(task = teamTask) {
  const manager = typeof zsManager !== "undefined" ? zsManager : null;
  const memory = manager && manager.memory || {};
  const output = memory.outputErrors || (zsProductivity && zsProductivity.outputWatch && zsProductivity.outputWatch.errors) || [];
  const verified = memory.verified || [];
  const regression = (manager && manager.regression) || [];
  const reports = memory.reports || [];
  const changed = memory.changedPaths || [];
  const reportText = JSON.stringify(reports).toLowerCase();
  const checks = {
    completed: !!task && task.status === "done",
    changed: changed.length > 0,
    verifiedEvidence: verified.length > 0,
    regressionEvidence: regression.length > 0,
    outputClean: output.length === 0,
    playtestEvidence: regression.length > 0 || /playtest|play mode|tested path|oynat/.test(reportText),
    visualEvidence: /screenshot|screen_capture|desktop|mobile/.test(reportText),
    juryEvidence: /reviewer|alternative|jury|verdict/.test(reportText),
  };
  const weights = { completed: 25, changed: 10, verifiedEvidence: 18, regressionEvidence: 17, outputClean: 15, playtestEvidence: 10, visualEvidence: 3, juryEvidence: 2 };
  let score = 0;
  for (const [key, passed] of Object.entries(checks)) if (passed) score += weights[key] || 0;
  const intent = zsSuperior.intent || {};
  const blockers = [];
  if (intent.proof && intent.proof.requiresScreenshots && !checks.visualEvidence) blockers.push("visual evidence missing");
  if (intent.proof && intent.proof.requiresPlaytest && !checks.playtestEvidence) blockers.push("playtest evidence missing");
  if (intent.proof && intent.proof.requiresOutput && !checks.outputClean) blockers.push("Output still contains errors");
  if (intent.juryRequired && !checks.juryEvidence) blockers.push("independent reviewer/jury evidence missing");
  const status = score >= 75 && blockers.length === 0 ? "verified" : "unverified";
  return { taskId: task && task.id || "", score, status, checks, blockers, updatedAt: Date.now() };
}

async function zsSuperiorEvaluateProof() {
  zsSuperior.latestProof = zsSuperiorProof(teamTask);
  await zsSuperiorPersist(); broadcastTeam();
  if (zsSuperior.settings.proofGate && zsSuperior.latestProof.status !== "verified" && typeof zsAutomationNotice === "function") {
    zsAutomationNotice("proof", "Görev kanıt kapısını geçemedi", `${zsSuperior.latestProof.score}/100 · ${zsSuperior.latestProof.blockers.join(", ") || "insufficient evidence"}`, "warning");
  }
  return zsSuperior.latestProof;
}

function zsSuperiorJuryGoal() {
  if (!teamTask) return "";
  return `Act as the independent Model Jury for this active Roblox task: ${String(teamTask.goal || "").slice(0, 4000)}. Inspect the actual implementation and prior reports. Compare the implemented approach with at least one safer alternative, score compatibility, server authority, data safety, regression risk, visual quality and test evidence, fix verified blockers when allowed, then return an explicit JURY_VERDICT: ACCEPT or JURY_VERDICT: REJECT with evidence.`;
}

async function zsSuperiorRequestJury() {
  const goal = zsSuperiorJuryGoal();
  if (!goal) return { ok: false, error: "No active task." };
  zsSuperior.jury = { status: "queued", taskId: teamTask.id, detail: "Independent reviewer comparison queued.", requestedAt: Date.now() };
  if (typeof zsQueueAdd === "function") zsQueueAdd(goal, { qualityMode: "best", priority: "high", source: "model_jury" });
  else if (typeof startTeamTask === "function" && ["done", "failed", "cancelled"].includes(teamTask.status)) await startTeamTask(goal);
  await zsSuperiorPersist(); broadcastTeam();
  return { ok: true };
}

async function zsSuperiorSelfHealScan() {
  const errors = (zsProductivity && zsProductivity.outputWatch && zsProductivity.outputWatch.errors) || [];
  const grouped = typeof zsAutomationGroupErrors === "function" ? zsAutomationGroupErrors(errors) : errors.slice(-10).map((item) => ({ line: String(item.line || item), count: 1 }));
  if (!grouped.length) {
    zsSuperior.selfHealing = { status: "clean", lastAt: Date.now(), detail: "No current grouped Output errors." };
    await zsSuperiorPersist(); broadcastTeam();
    return { ok: true, clean: true };
  }
  const detail = grouped.slice(0, 8).map((item) => `- ${item.line} (${item.count || 1}x)`).join("\n");
  zsSuperior.selfHealing = { status: zsSuperior.settings.selfHealing === "auto_shadow" ? "queued" : "suggested", lastAt: Date.now(), detail };
  if (zsSuperior.settings.selfHealing === "auto_shadow" && (!teamTask || ["done", "failed", "cancelled"].includes(teamTask.status))) {
    const goal = `Self-heal these verified grouped Studio Output errors using Shadow Guard and the Proof Engine. Reproduce each signature, fix only root causes, replay affected paths and keep the main project unchanged if proof fails:\n${detail}`;
    await startTeamTask(goal);
  } else if (typeof zsAutomationNotice === "function") {
    zsAutomationNotice("self_heal", "Self-Heal önerisi hazır", detail, "warning");
  }
  await zsSuperiorPersist(); broadcastTeam();
  return { ok: true, errors: grouped.length };
}

function zsSuperiorPublic() {
  return {
    version: zsSuperior.version,
    settings: zsSuperior.settings,
    intent: zsSuperior.intent,
    genome: zsSuperior.genome,
    shadow: zsSuperior.shadow,
    latestProof: zsSuperior.latestProof,
    jury: zsSuperior.jury,
    selfHealing: zsSuperior.selfHealing,
    decisionMode: "deterministic-local-rules-plus-connected-ai",
    updatedAt: zsSuperior.updatedAt,
  };
}

const zsSuperiorCoreTeamObj = teamObj;
teamObj = function zsTeamObjSuperior() { return { ...zsSuperiorCoreTeamObj(), superior: zsSuperiorPublic() }; };

const zsSuperiorCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsSuperiorStatusPayload() {
  const payload = zsSuperiorCoreStatusPayload();
  payload.superior = zsSuperiorPublic();
  return payload;
};

const zsSuperiorCoreStartTeamTask = startTeamTask;
startTeamTask = async function zsSuperiorStartTeamTask(goal) {
  const raw = String(goal || "").trim();
  const userGoal = raw.includes("USER GOAL\n") ? raw.split("USER GOAL\n")[1].split("\n\nZEROSCRIPT")[0].trim() : raw;
  const intent = zsSuperiorCompileIntent(userGoal);
  zsSuperior.intent = intent;
  await zsSuperiorPersist();
  const enriched = /ZEROSCRIPT (INTENT|SUPERIOR) CONTRACT/.test(raw) ? raw : `${raw}\n\n${zsSuperiorIntentBlock(intent)}`;
  const result = await zsSuperiorCoreStartTeamTask(enriched);
  if (intent.shadowRequired && zsSuperior.settings.shadowGuard) setTimeout(() => zsSuperiorPrepareShadow().catch(() => {}), 1200);
  if (zsSuperior.settings.autoGenome) setTimeout(() => zsSuperiorScanGenome().catch(() => {}), 300);
  return result;
};

const zsSuperiorCorePhasePrompt = phasePrompt;
phasePrompt = function zsSuperiorPhasePrompt(task) {
  let prompt = zsSuperiorCorePhasePrompt(task);
  const intent = zsSuperior.intent;
  if (intent && !prompt.includes("ZEROSCRIPT SUPERIOR CONTRACT")) prompt += `\n\n${zsSuperiorIntentBlock(intent)}`;
  if (intent && intent.juryRequired && task && task.phase === "reviewer") {
    prompt += "\n\nMODEL JURY\nCompare the implementation with at least one credible alternative. Reject it when compatibility, server authority, data safety or proof is weaker. End with JURY_VERDICT: ACCEPT or JURY_VERDICT: REJECT.";
  }
  if (intent && intent.shadowRequired) {
    prompt += "\n\nSHADOW GUARD\nA scoped snapshot exists under ServerStorage.ZeroScriptShadow when available. Keep edits targeted, preserve the checkpoint and do not treat the shadow clone as production data. The live change is accepted only after the Proof Contract passes.";
  }
  return prompt;
};

const zsSuperiorCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsSuperiorHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "set_superior") {
    const next = payload.settings && typeof payload.settings === "object" ? payload.settings : payload;
    zsSuperior.settings = {
      ...zsSuperior.settings,
      shadowGuard: typeof next.shadowGuard === "boolean" ? next.shadowGuard : zsSuperior.settings.shadowGuard,
      proofGate: typeof next.proofGate === "boolean" ? next.proofGate : zsSuperior.settings.proofGate,
      modelJury: typeof next.modelJury === "boolean" ? next.modelJury : zsSuperior.settings.modelJury,
      autoGenome: typeof next.autoGenome === "boolean" ? next.autoGenome : zsSuperior.settings.autoGenome,
      selfHealing: ["off", "suggest", "auto_shadow"].includes(next.selfHealing) ? next.selfHealing : zsSuperior.settings.selfHealing,
    };
    await zsSuperiorPersist(); broadcastTeam(); return;
  }
  if (action === "genome_scan") { await zsSuperiorScanGenome(true); return; }
  if (action === "shadow_prepare") { await zsSuperiorPrepareShadow(); return; }
  if (action === "proof_evaluate") { await zsSuperiorEvaluateProof(); return; }
  if (action === "jury_review") { await zsSuperiorRequestJury(); return; }
  if (action === "self_heal_scan") { await zsSuperiorSelfHealScan(); return; }
  if (action === "intent_compile") {
    zsSuperior.intent = zsSuperiorCompileIntent(payload.goal || (teamTask && teamTask.goal) || "");
    await zsSuperiorPersist(); broadcastTeam(); return;
  }
  if (action === "studio_command") {
    const goal = String(payload.goal || "").trim();
    const selected = Array.isArray(payload.selectionPaths) ? payload.selectionPaths.slice(0, 20) : [];
    if (!goal) return;
    const context = selected.length ? `\n\nSTUDIO SELECTION\n${selected.map((path) => `- ${path}`).join("\n")}\nPrioritize these selected instances but inspect their dependencies before editing.` : "";
    const active = teamTask && !["done", "failed", "cancelled"].includes(teamTask.status);
    if (active && typeof zsQueueAdd === "function") zsQueueAdd(goal + context, { qualityMode: "auto", priority: "high", source: "studio_palette" });
    else await startTeamTask(goal + context);
    return;
  }
  return zsSuperiorCoreHubAction(item);
};

setInterval(() => {
  const project = zsAutomation && zsAutomation.activeProject || null;
  const projectKey = project && project.key || "";
  if (zsSuperior.settings.autoGenome && projectKey && projectKey !== zsSuperiorLastProjectKey) {
    zsSuperiorLastProjectKey = projectKey;
    setTimeout(() => zsSuperiorScanGenome(true).catch(() => {}), 1200);
  }
  if (teamTask && ["done", "failed", "cancelled"].includes(teamTask.status)) {
    const key = `${teamTask.id}:${teamTask.status}`;
    if (key !== zsSuperiorLastTerminal) {
      zsSuperiorLastTerminal = key;
      zsSuperiorEvaluateProof().catch(() => {});
    }
  }
  if (zsSuperior.settings.selfHealing !== "off") {
    const errors = (zsProductivity && zsProductivity.outputWatch && zsProductivity.outputWatch.errors) || [];
    const signature = errors.slice(-12).map((item) => String(item.line || item.detail || item)).join("|");
    if (signature && signature !== zsSuperiorLastOutputSignature) {
      zsSuperiorLastOutputSignature = signature;
      if (!teamTask || ["done", "failed", "cancelled"].includes(teamTask.status)) zsSuperiorSelfHealScan().catch(() => {});
    }
  }
}, 5000);

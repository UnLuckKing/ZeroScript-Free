// SPDX-License-Identifier: GPL-3.0-or-later
// Adaptive team manager for ZeroScript.
// Loaded after background-entry.js and provider weights. It augments the existing
// orchestrator without replacing the proven bridge/task lifecycle.

const ZS_MANAGER_KEY = "zsTeamManagerState";
const ZS_MANAGER_MAX_TIMELINE = 120;
const ZS_MANAGER_MAX_REPORTS = 24;
const ZS_MANAGER_STUCK_SOFT_MS = 12 * 60 * 1000;
const ZS_MANAGER_STUCK_HARD_MS = 20 * 60 * 1000;

let zsManager = {
  version: 1,
  plan: null,
  memory: {
    verified: [],
    changedPaths: [],
    remaining: [],
    outputErrors: [],
    reports: [],
  },
  stats: {},
  timeline: [],
  regression: [],
  diff: null,
  release: { score: 0, blockers: ["No completed QA run yet."], checkedAt: 0 },
  safety: { blocked: 0, last: null },
  updatedAt: Date.now(),
};

chrome.storage.local.get(ZS_MANAGER_KEY, (result) => {
  const saved = result && result[ZS_MANAGER_KEY];
  if (!saved || typeof saved !== "object") return;
  zsManager = {
    ...zsManager,
    ...saved,
    memory: { ...zsManager.memory, ...(saved.memory || {}) },
    stats: saved.stats || {},
    timeline: Array.isArray(saved.timeline) ? saved.timeline.slice(-ZS_MANAGER_MAX_TIMELINE) : [],
    regression: Array.isArray(saved.regression) ? saved.regression.slice(-40) : [],
  };
  broadcastTeam();
});

function zsPersistManager() {
  zsManager.updatedAt = Date.now();
  zsManager.timeline = (zsManager.timeline || []).slice(-ZS_MANAGER_MAX_TIMELINE);
  zsManager.memory.reports = (zsManager.memory.reports || []).slice(-ZS_MANAGER_MAX_REPORTS);
  return chrome.storage.local.set({ [ZS_MANAGER_KEY]: zsManager });
}

function zsPublicManager() {
  return {
    version: zsManager.version,
    plan: zsManager.plan,
    memory: {
      verified: (zsManager.memory.verified || []).slice(-30),
      changedPaths: (zsManager.memory.changedPaths || []).slice(-40),
      remaining: (zsManager.memory.remaining || []).slice(-30),
      outputErrors: (zsManager.memory.outputErrors || []).slice(-20),
      reports: (zsManager.memory.reports || []).slice(-8),
    },
    stats: zsManager.stats,
    timeline: (zsManager.timeline || []).slice(-30),
    regression: (zsManager.regression || []).slice(-20),
    diff: zsManager.diff,
    release: zsManager.release,
    safety: zsManager.safety,
    updatedAt: zsManager.updatedAt,
  };
}

const zsCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithManager() {
  return { ...zsCoreTeamObj(), manager: zsPublicManager() };
};

function zsUniquePush(target, values, limit = 60) {
  const out = Array.isArray(target) ? target.slice() : [];
  for (const raw of values || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const existing = out.findIndex((item) => item.toLowerCase() === value.toLowerCase());
    if (existing >= 0) out.splice(existing, 1);
    out.push(value.slice(0, 500));
  }
  return out.slice(-limit);
}

function zsTimeline(kind, detail, extra = {}) {
  zsManager.timeline.push({ at: Date.now(), kind, detail: String(detail || "").slice(0, 500), ...extra });
  zsManager.timeline = zsManager.timeline.slice(-ZS_MANAGER_MAX_TIMELINE);
  zsPersistManager().catch(() => {});
}

function zsSection(report, names) {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const next = "Inspected state|Problems found|Changes made|Playtest evidence|Remaining work|TEST_EVIDENCE|OUTPUT_ERRORS|TEAM_VERDICT";
  const re = new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:?|$)`, "i");
  const match = re.exec(String(report || ""));
  return match ? match[1].trim() : "";
}

function zsLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter((line) => line && !/^none\.?$/i.test(line));
}

function zsExtractPaths(report) {
  const text = String(report || "");
  const matches = text.match(/\b(?:Workspace|StarterGui|StarterPlayer|ServerScriptService|ServerStorage|ReplicatedStorage|ReplicatedFirst|Lighting|SoundService|Players)(?:\.[A-Za-z0-9_][A-Za-z0-9_ -]*)+/g) || [];
  return [...new Set(matches.map((value) => value.trim()))].slice(0, 80);
}

function zsParseReport(report, phase, provider) {
  const text = String(report || "").slice(0, 12000);
  const evidenceSection = zsSection(text, ["Playtest evidence"]);
  const changesSection = zsSection(text, ["Changes made"]);
  const remainingSection = zsSection(text, ["Remaining work"]);
  const problemsSection = zsSection(text, ["Problems found"]);
  const testLine = /TEST_EVIDENCE\s*:\s*([^\n]+)/i.exec(text);
  const outputLine = /OUTPUT_ERRORS\s*:\s*([^\n]+)/i.exec(text);
  const verdictLine = /TEAM_VERDICT\s*:\s*([^\n]+)/i.exec(text);
  const outputValue = outputLine ? outputLine[1].trim() : "";

  return {
    phase,
    provider,
    at: Date.now(),
    verdict: verdictLine ? verdictLine[1].trim() : "UNKNOWN",
    verified: zsLines(evidenceSection || (testLine && testLine[1]) || ""),
    changes: zsLines(changesSection),
    remaining: zsLines(remainingSection || problemsSection),
    paths: zsExtractPaths(`${changesSection}\n${text}`),
    outputErrors: outputValue && !/^none\b/i.test(outputValue) ? [outputValue] : [],
    testEvidence: testLine ? testLine[1].trim() : "",
    summary: text.slice(0, 1800),
  };
}

function zsUpdateMemory(parsed) {
  zsManager.memory.verified = zsUniquePush(zsManager.memory.verified, parsed.verified, 80);
  zsManager.memory.changedPaths = zsUniquePush(zsManager.memory.changedPaths, parsed.paths, 100);
  zsManager.memory.remaining = zsUniquePush(zsManager.memory.remaining, parsed.remaining, 80);
  zsManager.memory.outputErrors = parsed.outputErrors.length
    ? zsUniquePush(zsManager.memory.outputErrors, parsed.outputErrors, 40)
    : zsManager.memory.outputErrors;
  zsManager.memory.reports.push(parsed);
  zsManager.memory.reports = zsManager.memory.reports.slice(-ZS_MANAGER_MAX_REPORTS);

  if (parsed.testEvidence) {
    zsManager.regression = zsUniquePush(zsManager.regression, [parsed.testEvidence], 40);
  }
  for (const item of parsed.verified) {
    if (/click|button|join|respawn|reset|save|load|roll|inventory|equip|purchase|mobile|output|remote|ui/i.test(item)) {
      zsManager.regression = zsUniquePush(zsManager.regression, [item], 40);
    }
  }
}

function zsProviderStat(provider) {
  if (!zsManager.stats[provider]) {
    zsManager.stats[provider] = {
      attempts: 0,
      completed: 0,
      failed: 0,
      repairsRequested: 0,
      toolErrors: 0,
      contextFailures: 0,
      totalMs: 0,
      phases: {},
      lastAt: 0,
    };
  }
  return zsManager.stats[provider];
}

function zsRecordPerformance(provider, phase, result, report, durationMs) {
  const stat = zsProviderStat(provider || "unknown");
  stat.attempts += 1;
  stat.lastAt = Date.now();
  stat.totalMs += Math.max(0, Number(durationMs || 0));
  stat.phases[phase] = stat.phases[phase] || { attempts: 0, completed: 0, failed: 0 };
  stat.phases[phase].attempts += 1;

  if (result === "completed") {
    stat.completed += 1;
    stat.phases[phase].completed += 1;
  } else {
    stat.failed += 1;
    stat.phases[phase].failed += 1;
  }
  if (/TEAM_VERDICT\s*:\s*FIX/i.test(String(report || ""))) stat.repairsRequested += 1;
  if (/unknown command|does not exist|invalid tool|tool.*unavailable|malformed|bad json/i.test(String(report || ""))) stat.toolErrors += 1;
  if (/context limit|conversation.*too long|token limit/i.test(String(report || ""))) stat.contextFailures += 1;
}

function zsLearnedBonus(provider, phase) {
  const stat = zsManager.stats[provider];
  if (!stat || stat.attempts < 2) return 0;
  const phaseStat = stat.phases && stat.phases[phase];
  const attempts = phaseStat && phaseStat.attempts >= 2 ? phaseStat.attempts : stat.attempts;
  const completed = phaseStat && phaseStat.attempts >= 2 ? phaseStat.completed : stat.completed;
  const success = completed / Math.max(1, attempts);
  const reliability = (success - 0.5) * 8;
  const errorPenalty = Math.min(4, (stat.toolErrors + stat.contextFailures) / Math.max(1, stat.attempts) * 6);
  const repairPenalty = Math.min(3, stat.repairsRequested / Math.max(1, stat.attempts) * 5);
  return Math.max(-6, Math.min(6, reliability - errorPenalty - repairPenalty));
}

const zsCorePhaseProvider = phaseProvider;
phaseProvider = function zsLearnedPhaseProvider(phase) {
  if (!teamConfig.smartRouting) return zsCorePhaseProvider(phase);
  cleanTeamState();
  const failed = new Set(teamTask && Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : []);
  const ready = [...new Set([...teamAgents.values()]
    .filter((agent) => agent.ready && !failed.has(agent.provider) && !providerHealth[agent.provider])
    .map((agent) => agent.provider))];
  if (!ready.length) return zsCorePhaseProvider(phase);

  const ranked = ready.map((provider) => {
    let base = 0;
    try {
      if (typeof zsProviderScore === "function") base = zsProviderScore(provider, phase, teamTask && teamTask.goal);
      else base = (ZS_PROVIDER_WEIGHTS[phase] && ZS_PROVIDER_WEIGHTS[phase][provider]) || 0;
    } catch {
      base = (ZS_PROVIDER_WEIGHTS[phase] && ZS_PROVIDER_WEIGHTS[phase][provider]) || 0;
    }
    const learned = zsLearnedBonus(provider, phase);
    return { provider, base, learned, total: base + learned };
  }).sort((a, b) => b.total - a.total || a.provider.localeCompare(b.provider));

  const selected = ranked[0];
  if (teamTask) {
    teamTask.routingReason = `Adaptive route: ${phase} → ${selected.provider} (${selected.base.toFixed(1)} base ${selected.learned >= 0 ? "+" : ""}${selected.learned.toFixed(1)} learned; ${ready.length} ready)`;
    teamTask.routingRanking = ranked.slice(0, 5);
  }
  return selected.provider;
};

function zsPlanForGoal(goal) {
  const g = String(goal || "").toLowerCase();
  const inspectionOnly = /without changing|do not change|inspection[- ]only|inspect only|audit only|değiştirmeden|sadece incele/.test(g);
  const full = /entire|complete project|production-ready|prepare.*release|release manager|yayına|tüm proje|her şeyi/.test(g);
  const wantsMap = full || /\b(map|world|terrain|lobby|environment|lighting|spawn|zone|island|harita|altar|portal|leaderboard)\b/.test(g);
  const wantsUi = full || /\b(ui|gui|hud|menu|panel|button|responsive|mobile|interface|arayüz|shop|gamepass|upgrade|index|inventory)\b/.test(g);
  const wantsSecurity = /security|remote|exploit|datastore|receipt|purchase|currency|güvenlik|veri/.test(g);
  const tiny = /\b(one|single|only|just|küçük|tek)\b/.test(g) && !full;

  let phases;
  if (inspectionOnly) phases = ["analyst", "qa"];
  else if (tiny && wantsUi && !wantsMap && !wantsSecurity) phases = ["ui", "reviewer", "qa"];
  else if (tiny && !wantsUi && !wantsMap) phases = ["builder", "reviewer", "qa"];
  else phases = ["analyst", "builder", ...(wantsMap ? ["map"] : []), ...(wantsUi ? ["ui"] : []), "reviewer", "qa"];

  const titles = {
    analyst: "Inspect dependencies and build a verified plan",
    builder: wantsSecurity ? "Implement server/data/security changes" : "Implement gameplay and code changes",
    map: "Build and verify world/map changes",
    ui: "Build and verify responsive player UI",
    reviewer: "Independently review and repair regressions",
    qa: "Playtest, check Output, and verify regression tests",
  };
  return {
    goal: String(goal || ""),
    phases,
    steps: phases.map((phase, index) => ({ id: `${index + 1}-${phase}`, phase, title: titles[phase], status: "pending" })),
    createdAt: Date.now(),
  };
}

const zsCorePhasesForGoal = phasesForGoal;
phasesForGoal = function zsDynamicPhasesForGoal(goal) {
  const plan = zsPlanForGoal(goal);
  zsManager.plan = plan;
  zsTimeline("plan", `Planned ${plan.phases.join(" → ")}`);
  return plan.phases.length ? plan.phases : zsCorePhasesForGoal(goal);
};

function zsMemoryPrompt() {
  const verified = (zsManager.memory.verified || []).slice(-12);
  const paths = (zsManager.memory.changedPaths || []).slice(-12);
  const remaining = (zsManager.memory.remaining || []).slice(-10);
  const tests = (zsManager.regression || []).slice(-10);
  return [
    "STRUCTURED PROJECT MEMORY",
    verified.length ? `Verified:\n${verified.map((x) => `- ${x}`).join("\n")}` : "Verified: none recorded yet",
    paths.length ? `Known changed paths:\n${paths.map((x) => `- ${x}`).join("\n")}` : "Known changed paths: none recorded yet",
    remaining.length ? `Open items:\n${remaining.map((x) => `- ${x}`).join("\n")}` : "Open items: none recorded",
    tests.length ? `Regression tests to preserve:\n${tests.map((x) => `- ${x}`).join("\n")}` : "Regression tests: none recorded yet",
  ].join("\n\n");
}

const zsCorePhasePrompt = phasePrompt;
phasePrompt = function zsManagedPhasePrompt(task) {
  if (zsManager.plan && zsManager.plan.goal === task.goal) {
    task.managerPlan = zsManager.plan;
    for (const step of task.managerPlan.steps) {
      if (step.phase === task.phase) step.status = "running";
      else if (Array.isArray(task.events) && task.events.some((event) => event.phase === step.phase)) step.status = "done";
    }
  }
  const base = zsCorePhasePrompt(task);
  const planText = task.managerPlan
    ? task.managerPlan.steps.map((step, index) => `${index + 1}. [${step.status}] ${step.phase}: ${step.title}`).join("\n")
    : "No manager plan available.";
  const recovery = task.contextSummary ? `\n\nCONTEXT RECOVERY SUMMARY\n${task.contextSummary}` : "";
  return `${base}\n\nAI TEAM MANAGER PLAN\n${planText}\n\n${zsMemoryPrompt()}${recovery}\n\nSAFETY AND CHANGE RULES\n- Prefer targeted changes. Never bulk-delete Workspace, StarterGui, ReplicatedStorage, ServerScriptService, or every descendant.\n- Before replacing an existing system, inspect it and preserve compatible public APIs/remotes.\n- Do not mark a regression test as passed unless you actually triggered it in play mode.\n- Report exact changed paths and unresolved blockers so the next model receives structured memory.`;
};

const zsCoreDispatchTask = dispatchTask;
dispatchTask = async function zsManagedDispatchTask() {
  if (teamTask && !["done", "failed", "cancelled"].includes(teamTask.status)) {
    teamTask.phaseStartedAt = Date.now();
    teamTask.managerPlan = zsManager.plan && zsManager.plan.goal === teamTask.goal ? zsManager.plan : teamTask.managerPlan;
  }
  const result = await zsCoreDispatchTask();
  if (teamTask && teamTask.status === "running") {
    zsTimeline("dispatch", `${teamTask.phase} assigned to ${teamTask.provider}`, { taskId: teamTask.id, phase: teamTask.phase, provider: teamTask.provider });
    chrome.storage.local.set({ zsTeamTask: teamTask }).catch(() => {});
  }
  return result;
};

function zsContextSummary() {
  const reports = (zsManager.memory.reports || []).slice(-4).map((report) => `${report.phase}/${report.provider}: ${report.summary.slice(0, 700)}`);
  const remaining = (zsManager.memory.remaining || []).slice(-8);
  return [
    reports.length ? reports.join("\n\n") : "No completed reports.",
    remaining.length ? `Open items:\n${remaining.map((item) => `- ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 5000);
}

const zsSeenResults = new Set();
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !["team_task_done", "team_task_error"].includes(msg.type)) return;
  const key = `${msg.type}:${msg.task_id}:${msg.phase}:${String(msg.report || msg.error || "").slice(0, 120)}`;
  if (zsSeenResults.has(key)) return;
  zsSeenResults.add(key);
  if (zsSeenResults.size > 100) zsSeenResults.delete(zsSeenResults.values().next().value);

  const current = teamTask && msg.task_id === teamTask.id ? teamTask : null;
  const provider = current && current.provider ? current.provider : (msg.provider || "unknown");
  const phase = msg.phase || (current && current.phase) || "unknown";
  const duration = current && current.phaseStartedAt ? Date.now() - current.phaseStartedAt : 0;

  if (msg.type === "team_task_done") {
    const parsed = zsParseReport(msg.report, phase, provider);
    zsUpdateMemory(parsed);
    zsRecordPerformance(provider, phase, "completed", msg.report, duration);
    zsTimeline("complete", `${phase} completed by ${provider}: ${parsed.verdict}`, { taskId: msg.task_id, phase, provider });
    zsPersistManager().catch(() => {});

    setTimeout(() => {
      if (teamTask && msg.task_id === teamTask.id && ["done", "failed"].includes(teamTask.status)) {
        zsCaptureTaskDiff(teamTask).catch(() => {});
      }
      zsComputeReleaseScore();
    }, 1200);
  } else {
    const reason = String(msg.error || "Model task failed.");
    zsRecordPerformance(provider, phase, "failed", reason, duration);
    zsTimeline("error", `${phase}/${provider}: ${reason}`, { taskId: msg.task_id, phase, provider });
    if (/context limit|conversation.*too long|token limit|too long/i.test(reason) && current) {
      current.contextSummary = zsContextSummary();
      chrome.storage.local.set({ zsTeamTask: current }).catch(() => {});
    }
    zsPersistManager().catch(() => {});
  }
});

async function zsCaptureTaskDiff(task) {
  if (!task || !task.checkpoint || !connected || studioConnected === false) return;
  const tool = typeof robloxTool === "function"
    ? robloxTool("execute_luau")
    : toolsCache.find((item) => String(item.name || "").split("/").pop() === "execute_luau");
  if (!tool) return;

  const id = task.checkpoint;
  const code = `local ServerStorage=game:GetService("ServerStorage")\nlocal HttpService=game:GetService("HttpService")\nlocal root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints")\nlocal cp=root and root:FindFirstChild(${JSON.stringify(id)})\nif not cp then return "DIFF_ERROR:checkpoint not found" end\nlocal function parts(inst) local out={} local cur=inst while cur and cur~=game do table.insert(out,1,cur.Name) cur=cur.Parent end return out end\nlocal originals={} local changed={} local deleted={} local created={}\nfor _,v in cp:GetChildren() do if v:IsA("StringValue") then local key=v:GetAttribute("PathJson") if key then originals[key]=true local path=HttpService:JSONDecode(key) local ok,cur=pcall(function() return game:GetService(path[1]) end) if not ok then cur=nil end for i=2,#path do cur=cur and cur:FindFirstChild(path[i]) end if not cur then table.insert(deleted,table.concat(path,".")) else local okSrc,src=pcall(function() return cur.Source end) if okSrc and src~=v.Value then table.insert(changed,table.concat(path,".")) end end end end end\nfor _,inst in game:GetDescendants() do if inst:IsA("LuaSourceContainer") and not inst:IsDescendantOf(root) then local path=parts(inst) local key=HttpService:JSONEncode(path) if not originals[key] then table.insert(created,table.concat(path,".")) end end end\nlocal function trim(t) while #t>200 do table.remove(t) end end trim(changed) trim(deleted) trim(created)\nreturn "DIFF_OK:"..HttpService:JSONEncode({changed=changed,deleted=deleted,created=created})`;

  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 60000 }, 70000);
  const text = result && result.ok ? String(result.text || "") : "";
  const match = /DIFF_OK:(\{[\s\S]*\})/.exec(text);
  if (!match) return;
  try {
    const parsed = JSON.parse(match[1]);
    const changed = Array.isArray(parsed.changed) ? parsed.changed : [];
    const deleted = Array.isArray(parsed.deleted) ? parsed.deleted : [];
    const created = Array.isArray(parsed.created) ? parsed.created : [];
    const risk = deleted.length >= 5 || changed.length >= 40 || created.length >= 40;
    zsManager.diff = {
      taskId: task.id,
      changed,
      deleted,
      created,
      risk,
      rollbackRecommended: risk,
      checkedAt: Date.now(),
    };
    if (risk) zsTimeline("risk", `Large diff detected: ${changed.length} changed, ${created.length} created, ${deleted.length} deleted`, { taskId: task.id });
    await zsPersistManager();
    broadcastTeam();
  } catch {}
}

function zsComputeReleaseScore() {
  const blockers = [];
  let score = 100;
  const warnings = (() => {
    try {
      const raw = String(projectAudit.report || "").replace(/^PREFLIGHT_OK:/, "");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.warnings) ? parsed.warnings : [];
    } catch { return []; }
  })();

  if (warnings.length) {
    score -= Math.min(30, warnings.length * 3);
    const severe = warnings.filter((warning) => ["remote_validation", "client_trust", "datastore_set", "tight_loop"].includes(warning.kind));
    if (severe.length) blockers.push(`${severe.length} security/data/runtime preflight warning(s) remain.`);
  }
  const latestTask = teamTask;
  if (!latestTask || !latestTask.qaEvidence || !latestTask.qaEvidence.passed) {
    score -= 25;
    blockers.push("No accepted QA evidence for the latest task.");
  }
  if ((zsManager.memory.outputErrors || []).length) {
    score -= 20;
    blockers.push("Recorded Output errors still need confirmation or repair.");
  }
  if (!zsManager.regression.length) {
    score -= 10;
    blockers.push("No persistent regression tests have been recorded.");
  }
  if (zsManager.diff && zsManager.diff.risk) {
    score -= 15;
    blockers.push("Latest task produced a large script diff; review or rollback before release.");
  }
  if ((zsManager.memory.remaining || []).length) {
    score -= Math.min(15, zsManager.memory.remaining.length * 2);
    blockers.push(`${zsManager.memory.remaining.length} reported remaining item(s).`);
  }

  zsManager.release = { score: Math.max(0, Math.min(100, score)), blockers: blockers.slice(0, 12), checkedAt: Date.now() };
  zsPersistManager().catch(() => {});
  broadcastTeam();
}

// Stuck-task recovery. A missing/unready provider gets replaced after 12 minutes;
// even a heartbeat-active provider is replaced after 20 minutes without a report.
setInterval(() => {
  if (!teamTask || teamTask.status !== "running" || !teamTask.phaseStartedAt) return;
  const age = Date.now() - teamTask.phaseStartedAt;
  const agent = [...teamAgents.values()].find((item) => item.provider === teamTask.provider && item.ready);
  const shouldRecover = age > ZS_MANAGER_STUCK_HARD_MS || (age > ZS_MANAGER_STUCK_SOFT_MS && !agent);
  if (!shouldRecover) return;

  const failed = teamTask.provider || "unknown";
  teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
  if (!teamTask.failedProviders.includes(failed)) teamTask.failedProviders.push(failed);
  providerHealth[failed] = { status: "stuck", reason: "No final report before manager timeout.", until: Date.now() + 15 * 60 * 1000 };
  teamTask.status = "queued";
  teamTask.error = `${failed} appeared stuck; checkpoint preserved and another model will continue.`;
  teamTask.contextSummary = zsContextSummary();
  teamTask.updatedAt = Date.now();
  writerLease = null;
  chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth }).catch(() => {});
  zsTimeline("recovery", teamTask.error, { taskId: teamTask.id, phase: teamTask.phase, provider: failed });
  broadcastTeam();
  dispatchTask();
}, 30000);

// Catastrophic guard events are written by the content-script guard. Mirror them
// into the manager status without requiring a custom service-worker message.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.zsSafetyLastBlock) return;
  const value = changes.zsSafetyLastBlock.newValue;
  if (!value) return;
  zsManager.safety.blocked = Number(zsManager.safety.blocked || 0) + 1;
  zsManager.safety.last = value;
  zsTimeline("safety", value.reason || "Catastrophic change blocked", { provider: value.provider || "unknown" });
  zsPersistManager().catch(() => {});
  broadcastTeam();
});

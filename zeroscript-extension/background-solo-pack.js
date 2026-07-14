// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.32 fast single-provider policy.
//
// Daily work should not bounce through Analyst → Builder → Map → UI → Reviewer
// → QA. One ready provider owns the request, implements it and proves it. Only a
// complete/high-risk game request gets one compact verification pass.

const ZS_SOLO_KEY = "zsSoloMode";
let zsSolo = {
  enabled: true,
  maxPasses: 2,
  idleFailoverMs: 3 * 60 * 1000,
  selectedProvider: "",
  feedback: [],
  updatedAt: Date.now(),
};
let zsSoloWatchKey = "";
let zsSoloFailingOver = false;

chrome.storage.local.get(ZS_SOLO_KEY, (result) => {
  const saved = result && result[ZS_SOLO_KEY];
  if (saved && typeof saved === "object") zsSolo = { ...zsSolo, ...saved, enabled: true, maxPasses: 2 };
  zsSoloPersist().catch(() => {});
});

function zsSoloPersist() {
  zsSolo.feedback = (zsSolo.feedback || []).slice(-80);
  zsSolo.updatedAt = Date.now();
  return chrome.storage.local.set({ [ZS_SOLO_KEY]: zsSolo });
}

function zsSoloGoalKind(goal) {
  const text = String(goal || "").toLowerCase();
  if (/\b(ui|gui|hud|button|menu|mobile|responsive|arayüz|buton)\b/.test(text) && !/server|datastore|remote|system|backend|sunucu|veri/.test(text)) return "ui";
  if (/\b(map|world|terrain|lobby|lighting|spawn|harita|dünya)\b/.test(text) && !/server|datastore|remote|system|backend|sunucu|veri/.test(text)) return "map";
  if (/output|error|warning|bug|hata|nil|broken|çalışmıyor|bozuk/.test(text)) return "debug";
  if (/datastore|processreceipt|purchase|gamepass|developer product|remote|security|save|load|veri|satın|güvenlik/.test(text)) return "critical";
  if (/complete|entire|full game|production-ready|premium|komple|tüm oyun|oyun yap|baştan/.test(text)) return "complete";
  return "normal";
}

function zsSoloPhases(goal) {
  const kind = zsSoloGoalKind(goal);
  if (kind === "ui") return ["ui"];
  if (kind === "map") return ["map"];
  if (kind === "complete" || kind === "critical") return ["builder", "qa"];
  return ["builder"];
}

const zsSoloCorePhasesForGoal = phasesForGoal;
phasesForGoal = function zsSoloPhasesForGoal(goal) {
  if (!zsSolo.enabled) return zsSoloCorePhasesForGoal(goal);
  return zsSoloPhases(goal);
};

function zsSoloProviderOrder(goal) {
  const kind = zsSoloGoalKind(goal);
  if (kind === "ui" || kind === "map") return ["gemini", "chatgpt", "claude", "qwen", "deepseek", "mistral", "copilot", "kimi", "glm", "arena"];
  if (kind === "debug") return ["deepseek", "qwen", "chatgpt", "claude", "gemini", "mistral", "copilot", "kimi", "glm", "arena"];
  if (kind === "critical") return ["qwen", "deepseek", "chatgpt", "claude", "gemini", "mistral", "copilot", "kimi", "glm", "arena"];
  return ["qwen", "deepseek", "gemini", "chatgpt", "claude", "mistral", "copilot", "kimi", "glm", "arena"];
}

function zsSoloReadyProviders() {
  const values = [];
  for (const [, agent] of teamAgents.entries()) {
    if (agent && agent.ready && !providerHealth[agent.provider]) values.push(agent.provider);
  }
  return [...new Set(values)];
}

function zsSoloChooseProvider(goal, exclude = []) {
  const ready = new Set(zsSoloReadyProviders().filter((name) => !exclude.includes(name)));
  for (const provider of zsSoloProviderOrder(goal)) if (ready.has(provider)) return provider;
  return [...ready][0] || "";
}

const zsSoloCorePhaseProvider = phaseProvider;
phaseProvider = function zsSoloPhaseProvider(phase) {
  if (!zsSolo.enabled || !teamTask) return zsSoloCorePhaseProvider(phase);
  const excluded = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
  const current = String(teamTask.soloProvider || zsSolo.selectedProvider || "");
  if (current && agentFor(current) && !excluded.includes(current) && !providerHealth[current]) return current;
  const selected = zsSoloChooseProvider(teamTask.goal, excluded);
  if (selected) {
    teamTask.soloProvider = selected;
    zsSolo.selectedProvider = selected;
    zsSoloPersist().catch(() => {});
    chrome.storage.local.set({ zsTeamTask: teamTask }).catch(() => {});
    return selected;
  }
  return zsSoloCorePhaseProvider(phase);
};

const zsSoloCorePhasePrompt = phasePrompt;
phasePrompt = function zsSoloPhasePrompt(task) {
  if (!zsSolo.enabled || !task) return zsSoloCorePhasePrompt(task);
  const kind = zsSoloGoalKind(task.goal);
  const shared = `FAST SINGLE-PROVIDER TASK ${task.id}\nGOAL\n${task.goal}\n\nYou own this request end to end. Do not stop after planning and do not hand work to separate Analyst, Map, UI or Reviewer agents. Inspect only the relevant Studio state, implement the complete requested behavior, preserve working systems, then test the exact changed path. Prefer the smallest complete solution over a broad rewrite.`;
  if (task.phase === "qa") {
    return `${shared}\n\nFINAL VERIFY + FIX PASS\nIndependently replay the main path, respawn/rejoin when relevant, read Studio Output, fix verified blockers directly, and finish. Do not redesign correct work. Include TEST_EVIDENCE and OUTPUT_ERRORS. End TEAM_VERDICT: PASS only when the result works.`;
  }
  const focus = kind === "ui"
    ? "Implement and test the UI in this same pass, including desktop/mobile layout and every changed button."
    : kind === "map"
      ? "Implement and playtest the map in this same pass, including spawn, traversal, lighting and performance."
      : kind === "critical"
        ? "Keep all rewards, purchases, remotes and persistence server-authoritative and test invalid/duplicate inputs."
        : "Implement the feature and its required UI/server wiring in this same pass.";
  return `${shared}\n\n${focus}\n\nREQUIRED FINISH\n- Make actual Studio changes; do not only explain.\n- Playtest the changed path.\n- Read Studio Output.\n- State exact changed paths.\n- Include TEST_EVIDENCE and OUTPUT_ERRORS.\n- End TEAM_VERDICT: PASS only when the requested result works.`;
};

// Replace the long six/eight-stage game builder with at most two meaningful jobs.
if (typeof zsEasyBuildStages === "function") {
  zsEasyBuildStages = function zsSoloEasyStages(payload) {
    const target = typeof zsEasyTarget === "function" ? zsEasyTarget(payload.target) : "publishable";
    const profile = typeof zsEasyBaseContract === "function" ? zsEasyBaseContract(payload) : `ORIGINAL GAME IDEA\n${payload.idea}`;
    const build = {
      name: "Playable game",
      goal: `Build the requested Roblox game as one coherent playable implementation. Inspect the current project, preserve useful work, then complete the core loop, secure server logic, progression, persistence, responsive UI, onboarding and essential feedback in the same pass. Avoid optional feature sprawl.\n\n${profile}\n\nFINISH CONTRACT\n- The main loop works end to end.\n- The first goal and first meaningful upgrade are clear.\n- Rewards and saved value are server-authoritative.\n- Desktop and mobile UI are usable.\n- Respawn does not break the loop.\n- Playtest and Output evidence are included.`,
    };
    if (target === "prototype") return [build];
    return [
      build,
      {
        name: "Polish and verify",
        goal: `Polish and verify the completed game in one final pass. Improve only the weakest proven areas of fun, pacing, visual hierarchy, VFX/audio hooks and feedback. Test the main loop, buttons, mobile layout, respawn, rejoin, DataStore safety, remotes, purchases when present, performance and Studio Output. Fix real blockers directly and leave user-only publishing steps clearly listed.\n\n${profile}\n\nFINISH CONTRACT\n- Main loop, respawn and rejoin pass.\n- Mobile and desktop layouts pass.\n- Output is clean or exact blockers are listed.\n- Security/data/purchase checks have real evidence.\n- No unnecessary extra systems are added.`,
      },
    ];
  };
}

// Easy Mode values speed and clarity over an automatic model committee.
if (typeof zsSuperior !== "undefined" && zsSuperior && zsSuperior.settings) {
  zsSuperior.settings.modelJury = false;
  zsSuperior.settings.selfHealing = "suggest";
  zsSuperior.settings.autoGenome = false;
  if (typeof zsSuperiorPersist === "function") zsSuperiorPersist().catch(() => {});
}
if (typeof zsSuperiorCompileIntent === "function") {
  const zsSoloCoreCompileIntent = zsSuperiorCompileIntent;
  zsSuperiorCompileIntent = function zsSoloCompileIntent(goal) {
    const intent = zsSoloCoreCompileIntent(goal);
    intent.juryRequired = false;
    intent.phases = zsSoloPhases(goal);
    if (intent.proof) intent.proof.requiresJury = false;
    if (intent.decisionTrace) intent.decisionTrace.push("Easy Mode uses one working provider and at most one final verification pass.");
    return intent;
  };
}

async function zsSoloFailover(reason) {
  if (zsSoloFailingOver || !teamTask || teamTask.status !== "running") return;
  zsSoloFailingOver = true;
  const failed = String(teamTask.provider || teamTask.soloProvider || "");
  try {
    if (typeof zsStudioPanelBroadcastStop === "function") await zsStudioPanelBroadcastStop();
    if (failed) {
      teamTask.failedProviders = [...new Set([...(teamTask.failedProviders || []), failed])];
      providerHealth[failed] = { until: Date.now() + 5 * 60 * 1000, reason };
    }
    const next = zsSoloChooseProvider(teamTask.goal, teamTask.failedProviders || []);
    if (!next) {
      teamTask.status = "waiting";
      teamTask.error = "Çalışan model bulunamadı. Bir AI sekmesinde ZeroScript Agent'ı başlat.";
    } else {
      teamTask.soloProvider = next;
      teamTask.provider = null;
      teamTask.status = "queued";
      teamTask.error = `${failed || "Önceki model"} iş yapmadı; ${next} ile devam ediliyor.`;
      teamTask.phaseStartedAt = Date.now();
      teamTask.updatedAt = Date.now();
      await chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth });
      if (typeof zsAutomationNotice === "function") zsAutomationNotice("failover", "Model değiştirildi", teamTask.error, "warning");
      await dispatchTask();
    }
    broadcastTeam();
  } finally {
    zsSoloFailingOver = false;
  }
}

setInterval(() => {
  if (!zsSolo.enabled || !teamTask || teamTask.status !== "running") { zsSoloWatchKey = ""; return; }
  const key = `${teamTask.id}:${teamTask.phase}:${teamTask.provider || teamTask.soloProvider || ""}`;
  if (key !== zsSoloWatchKey) { zsSoloWatchKey = key; return; }
  const age = Date.now() - Number(teamTask.phaseStartedAt || teamTask.updatedAt || Date.now());
  const activeTool = !!writerLease;
  const hasReport = !!String(teamTask.lastReport || "").trim();
  if (!activeTool && !hasReport && age > Number(zsSolo.idleFailoverMs || 180000)) {
    zsSoloFailover("Model üç dakika içinde Studio aracı kullanmadı.").catch(() => {});
  }
}, 5000);

const zsSoloCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsSoloHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "easy_feedback") {
    const entry = {
      at: Date.now(),
      taskId: teamTask && teamTask.id || "",
      provider: teamTask && (teamTask.soloProvider || teamTask.provider) || zsSolo.selectedProvider,
      positive: payload.positive === true,
      reason: String(payload.reason || "").slice(0, 120),
      goal: String(teamTask && teamTask.goal || "").slice(0, 500),
    };
    zsSolo.feedback.push(entry);
    if (teamTask) {
      teamTask.userFeedback = entry;
      await chrome.storage.local.set({ zsTeamTask: teamTask });
    }
    if (typeof zsSuiteLedger === "function") zsSuiteLedger("user_feedback", `${entry.positive ? "liked" : "disliked"}: ${entry.reason || "no reason"}`, entry);
    await zsSoloPersist();
    broadcastTeam();
    return;
  }
  return zsSoloCoreHubAction(item);
};

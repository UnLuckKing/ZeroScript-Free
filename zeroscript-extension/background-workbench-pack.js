// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.33 workbench: one request, one owner, one implementation pass.

const ZS_WORKBENCH_KEY = "zsWorkbenchState";
let zsWorkbench = {
  version: 1,
  state: "idle",
  detail: "Hazır",
  goal: "",
  source: "",
  startedAt: 0,
  finishedAt: 0,
  activity: [],
  selectedProvider: "",
  autoStartRequestedAt: 0,
  lastError: "",
  updatedAt: Date.now(),
};
let zsWorkbenchStarting = false;

chrome.storage.local.get(ZS_WORKBENCH_KEY, (result) => {
  const saved = result && result[ZS_WORKBENCH_KEY];
  if (saved && typeof saved === "object" && saved.state === "done") {
    zsWorkbench = { ...zsWorkbench, ...saved, activity: Array.isArray(saved.activity) ? saved.activity.slice(-12) : [] };
  }
});

function zsWorkbenchPersist() {
  zsWorkbench.updatedAt = Date.now();
  zsWorkbench.activity = (zsWorkbench.activity || []).slice(-12);
  return chrome.storage.local.set({ [ZS_WORKBENCH_KEY]: zsWorkbench });
}

function zsWorkbenchAdd(kind, text, detail = "") {
  zsWorkbench.activity.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, at: Date.now(), kind, text, detail });
  zsWorkbench.detail = detail || text;
  zsWorkbenchPersist().catch(() => {});
  broadcastTeam();
}

function zsWorkbenchReadyProviders() {
  const values = [];
  for (const [, agent] of teamAgents.entries()) {
    if (agent && agent.ready && !providerHealth[agent.provider]) values.push(agent.provider);
  }
  return [...new Set(values)];
}

async function zsWorkbenchBroadcastAutoStart() {
  const patterns = [
    "https://chat.deepseek.com/*", "https://gemini.google.com/*", "https://chat.qwen.ai/*",
    "https://www.kimi.com/*", "https://kimi.com/*", "https://chat.z.ai/*", "https://arena.ai/*",
    "https://chatgpt.com/*", "https://claude.ai/*", "https://copilot.microsoft.com/*", "https://chat.mistral.ai/*",
  ];
  const tabs = await chrome.tabs.query({ url: patterns }).catch(() => []);
  for (const tab of tabs || []) {
    if (tab.id == null) continue;
    chrome.tabs.sendMessage(tab.id, { type: "zs-workbench-autostart" }).catch(() => {});
  }
  return (tabs || []).length;
}

async function zsWorkbenchWaitForProvider(timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = zsWorkbenchReadyProviders();
    if (ready.length) return ready[0];
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return "";
}

function zsWorkbenchGoal(goal) {
  return `ZEROSCRIPT ONE-PASS BUILD\n\nUSER REQUEST\n${goal}\n\nEXECUTION RULES\n- Own this request end to end in this single pass.\n- Inspect only the relevant Studio state.\n- Make the actual changes; do not stop after explaining or planning.\n- Preserve working systems and public data formats.\n- Implement the smallest complete, production-minded solution.\n- Test the exact changed path in Play mode.\n- Read Studio Output and fix verified blockers before finishing.\n- Include CHANGED_PATHS, TEST_EVIDENCE and OUTPUT_ERRORS.\n- Do not create a separate reviewer task.\n- End TEAM_VERDICT: PASS only when the requested result actually works.`;
}

async function zsWorkbenchStart(goal, source = "hub") {
  const cleanGoal = String(goal || "").trim();
  if (!cleanGoal) return { ok: false, error: "Görev boş." };
  if (zsWorkbenchStarting) return { ok: false, error: "Yeni görev zaten hazırlanıyor." };
  zsWorkbenchStarting = true;
  try {
    await zsEasyHardReset("Yeni ZeroScript One isteği eski işi değiştirdi.");
    zsWorkbench = {
      version: 1,
      state: "preparing",
      detail: "Bağlantılar hazırlanıyor",
      goal: cleanGoal,
      source,
      startedAt: Date.now(),
      finishedAt: 0,
      activity: [],
      selectedProvider: "",
      autoStartRequestedAt: Date.now(),
      lastError: "",
      updatedAt: Date.now(),
    };
    zsWorkbenchAdd("done", "Eski iş temizlendi");
    const openTabs = await zsWorkbenchBroadcastAutoStart();
    zsWorkbenchAdd("active", "AI hazırlanıyor", openTabs ? `${openTabs} açık AI sekmesi bulundu` : "Açık AI sekmesi bulunamadı");
    let provider = await zsWorkbenchWaitForProvider(12000);
    if (!provider && typeof zsSuitePrepareProvider === "function") {
      const suggested = typeof zsHubSuggestedProvider === "function" ? zsHubSuggestedProvider(cleanGoal) : "chatgpt";
      await zsSuitePrepareProvider(suggested).catch(() => {});
      await zsWorkbenchBroadcastAutoStart();
      provider = await zsWorkbenchWaitForProvider(8000);
    }
    if (!provider) {
      zsWorkbench.state = "waiting_ai";
      zsWorkbench.lastError = "Açık AI sekmesi hazır olmadı. ChatGPT, Gemini veya Qwen sekmesini açıp tekrar Başlat'a bas.";
      zsWorkbenchAdd("error", "AI bağlanamadı", zsWorkbench.lastError);
      return { ok: false, error: zsWorkbench.lastError };
    }
    zsWorkbench.selectedProvider = provider;
    zsSolo.selectedProvider = provider;
    zsWorkbenchAdd("done", "AI hazır", provider);
    zsWorkbench.state = "starting";
    zsWorkbenchAdd("active", "Görev Studio'ya gönderiliyor");
    const result = await startTeamTask(zsWorkbenchGoal(cleanGoal));
    if (!result || result.ok === false) {
      throw new Error(String(result && result.error || "Görev başlatılamadı."));
    }
    if (teamTask) {
      teamTask.workbench = true;
      teamTask.originalGoal = cleanGoal;
      teamTask.soloProvider = provider;
      teamTask.workbenchStartedAt = Date.now();
      await chrome.storage.local.set({ zsTeamTask: teamTask });
    }
    zsWorkbench.state = "running";
    zsWorkbenchAdd("active", "Uygulama başladı", `${provider} Studio üzerinde çalışıyor`);
    await zsWorkbenchPersist();
    broadcastTeam();
    return { ok: true, provider };
  } catch (error) {
    zsWorkbench.state = "error";
    zsWorkbench.lastError = String(error && error.message || error);
    zsWorkbenchAdd("error", "Başlatılamadı", zsWorkbench.lastError);
    return { ok: false, error: zsWorkbench.lastError };
  } finally {
    zsWorkbenchStarting = false;
  }
}

async function zsWorkbenchStop() {
  await zsEasyHardReset("Kullanıcı ZeroScript One görevini durdurdu.");
  zsWorkbench.state = "idle";
  zsWorkbench.detail = "Durduruldu";
  zsWorkbench.finishedAt = Date.now();
  zsWorkbenchAdd("warn", "Görev durduruldu");
  return { ok: true };
}

function zsWorkbenchPublic() {
  return {
    ...zsWorkbench,
    readyProviders: zsWorkbenchReadyProviders(),
    taskId: teamTask && teamTask.id || "",
    taskStatus: teamTask && teamTask.status || "",
    phase: teamTask && teamTask.phase || "",
    provider: teamTask && (teamTask.provider || teamTask.soloProvider) || zsWorkbench.selectedProvider,
    toolActive: !!writerLease,
  };
}

// Workbench tasks are always a single builder pass. The builder performs its own
// test and Output verification inside the same pass.
const zsWorkbenchCorePhasesForGoal = phasesForGoal;
phasesForGoal = function zsWorkbenchPhasesForGoal(goal) {
  if (String(goal || "").includes("ZEROSCRIPT ONE-PASS BUILD")) return ["builder"];
  return zsWorkbenchCorePhasesForGoal(goal);
};

const zsWorkbenchCoreTeamObj = teamObj;
teamObj = function zsWorkbenchTeamObj() {
  return { ...zsWorkbenchCoreTeamObj(), workbench: zsWorkbenchPublic() };
};

const zsWorkbenchCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsWorkbenchStatusPayload() {
  const payload = zsWorkbenchCoreStatusPayload();
  payload.workbench = zsWorkbenchPublic();
  return payload;
};

const zsWorkbenchCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsWorkbenchHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "workbench_start") {
    await zsWorkbenchStart(payload.goal || payload.idea || "", payload.source || "hub");
    return;
  }
  if (action === "workbench_stop") {
    await zsWorkbenchStop();
    return;
  }
  if (action === "workbench_fix_output") {
    await zsWorkbenchStart("Run the game, inspect the newest verified Studio Output errors, fix only their root causes, replay the affected path, and finish with clean Output evidence.", payload.source || "quick_action");
    return;
  }
  return zsWorkbenchCoreHubAction(item);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;
  if (message.type === "zs-workbench-start") {
    zsWorkbenchStart(message.goal, message.source || "extension").then(sendResponse);
    return true;
  }
  if (message.type === "zs-workbench-stop") {
    zsWorkbenchStop().then(sendResponse);
    return true;
  }
  if (message.type === "zs-workbench-status") {
    sendResponse({ ok: true, workbench: zsWorkbenchPublic() });
    return false;
  }
  return false;
});

setInterval(() => {
  if (!teamTask || !teamTask.workbench) return;
  const reportText = String(teamTask.lastReport || "").toLowerCase();
  if (teamTask.status === "running") {
    zsWorkbench.state = "running";
    if (writerLease && !zsWorkbench.activity.some((item) => item.text === "Studio değişikliği yapılıyor")) {
      zsWorkbenchAdd("active", "Studio değişikliği yapılıyor", String(writerLease.owner || teamTask.provider || "AI"));
    }
    if (/playtest|play mode|test_evidence/.test(reportText) && !zsWorkbench.activity.some((item) => item.text === "Oyun test ediliyor")) {
      zsWorkbenchAdd("active", "Oyun test ediliyor");
    }
  } else if (["done", "failed", "cancelled"].includes(teamTask.status)) {
    const key = `${teamTask.id}:${teamTask.status}`;
    if (zsWorkbench._terminalKey === key) return;
    zsWorkbench._terminalKey = key;
    zsWorkbench.finishedAt = Date.now();
    if (teamTask.status === "done") {
      zsWorkbench.state = "done";
      zsWorkbenchAdd("done", "Tamamlandı", "Değişiklik ve test raporu hazır");
    } else {
      zsWorkbench.state = "error";
      zsWorkbench.lastError = String(teamTask.error || "Görev tamamlanamadı.");
      zsWorkbenchAdd("error", "Görev tamamlanamadı", zsWorkbench.lastError);
    }
  }
}, 1200);

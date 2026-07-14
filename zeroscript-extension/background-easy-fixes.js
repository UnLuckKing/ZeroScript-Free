// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.31.1 Easy Mode reliability fixes.
// In Easy Mode the newest request always replaces old paused/running work.

async function zsEasyHardReset(reason = "Replaced by a newer Easy Mode request") {
  try {
    if (typeof zsStudioPanelBroadcastStop === "function") await zsStudioPanelBroadcastStop();
  } catch {}

  if (teamTask) {
    teamTask.status = "cancelled";
    teamTask.error = reason;
    teamTask.updatedAt = Date.now();
    teamTask.cancelledAt = Date.now();
    teamHistory = [...(teamHistory || []), { ...teamTask }].slice(-50);
  }

  teamTask = null;
  writerLease = null;
  pendingApprovals = [];
  taskStarting = false;

  if (typeof zsProductivity !== "undefined") {
    zsProductivity.queue = [];
    zsProductivity.queueRunning = false;
    zsProductivity.completedQueueIds = [];
    zsProductivityBusy = false;
    await zsProductivityPersist().catch(() => {});
  }

  if (typeof zsEasy !== "undefined") {
    zsEasy.activeBlueprint = null;
    zsEasy.lastBlueprint = null;
    await zsEasyPersist().catch(() => {});
  }

  if (typeof zsSuiteReleaseClaims === "function") zsSuiteReleaseClaims();
  if (typeof zsSuiteTransition === "function") {
    zsSuiteTransition("idle", reason, { taskId: null, phase: null, provider: null });
  }

  await chrome.storage.local.remove(["zsTeamTask", "zsPendingApprovals"]);
  await chrome.storage.local.set({ zsTeamHistory: teamHistory });
  broadcastTeam();
  return { ok: true };
}

const zsEasyFixCoreCreateBlueprint = zsEasyCreateBlueprint;
zsEasyCreateBlueprint = async function zsEasyCreateFreshBlueprint(payload) {
  if (!payload || payload.fresh !== false) {
    await zsEasyHardReset("Eski iş silindi; yeni oyun isteği başlatılıyor.");
  }

  const blueprint = await zsEasyFixCoreCreateBlueprint({ ...payload, autoStart: true });
  zsProductivity.queueRunning = true;
  await zsProductivityPersist();

  const ready = [...teamAgents.values()].some((agent) => agent && agent.ready);
  if (!ready && typeof zsSuitePrepareProvider === "function") {
    const provider = typeof zsHubSuggestedProvider === "function"
      ? zsHubSuggestedProvider(payload && payload.idea)
      : "qwen";
    zsSuitePrepareProvider(provider).catch(() => {});
  }

  setTimeout(() => zsQueueStartNext().catch(() => {}), 100);
  broadcastTeam();
  return blueprint;
};

const zsEasyFixCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsEasyFixedHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  if (action === "easy_reset") {
    await zsEasyHardReset("Kullanıcı eski işi temizledi.");
    return;
  }
  return zsEasyFixCoreHubAction(item);
};

// A browser/service-worker restart must never silently continue an old prompt in
// Easy Mode. The user can submit it again explicitly when they still want it.
setTimeout(() => {
  const staleTask = teamTask && !["done", "failed", "cancelled"].includes(teamTask.status);
  const staleQueue = typeof zsProductivity !== "undefined" && (zsProductivity.queue || []).length > 0;
  if (staleTask || staleQueue) zsEasyHardReset("Eski oturum işi otomatik temizlendi.").catch(() => {});
}, 1800);

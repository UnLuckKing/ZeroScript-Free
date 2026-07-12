// SPDX-License-Identifier: GPL-3.0-or-later
// Follow-up reliability and speed safeguards for the 1.28 automation pack.

// Mirror important Hub notices into native browser notifications when allowed.
const zsAutomationNoticeCore = zsAutomationNotice;
zsAutomationNotice = function zsAutomationNoticeWithBrowser(kind, title, detail = "", level = "info") {
  zsAutomationNoticeCore(kind, title, detail, level);
  if (!zsAutomation.settings.notificationCenter || typeof chrome.notifications === "undefined") return;
  if (!["warning", "error", "success"].includes(level) && kind !== "task") return;
  try {
    chrome.notifications.create(`zs-${kind}-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png"),
      title: String(title || "ZeroScript").slice(0, 120),
      message: String(detail || title || "ZeroScript update").slice(0, 300),
      priority: level === "error" ? 2 : 1,
    }).catch(() => {});
  } catch {}
};

// Automatic decomposition should not make Hub think the original goal was
// rejected. Save an explicit plan/context, then let the normal coordinated task
// start with the original goal. The manual "Görevi otomatik parçala" action still
// creates dependent queue items.
const zsAutomationActionCore = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsAutomationAcceptanceSafeAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "start_task" && zsAutomation.settings.autoDecomposeBroadTasks && zsAutomationIsBroad(payload.goal)) {
    const plan = zsAutomationBuildPlan(payload.goal);
    plan.status = "attached_to_task";
    zsAutomation.plans.push(plan);
    zsAutomation.context = {
      compactedAt: Date.now(),
      reason: "automatic broad-task plan",
      summary: `Implementation plan for the current goal:\n${plan.steps.map((step, index) => `${index + 1}. ${step.title}`).join("\n")}`,
    };
    await zsAutomationPersist();
    const previous = zsAutomation.settings.autoDecomposeBroadTasks;
    zsAutomation.settings.autoDecomposeBroadTasks = false;
    try {
      return await zsAutomationActionCore(item);
    } finally {
      zsAutomation.settings.autoDecomposeBroadTasks = previous;
      zsAutomationPersist().catch(() => {});
    }
  }
  return zsAutomationActionCore(item);
};

// Script-only work already has the existing deterministic script checkpoint.
// Avoid cloning large shared services unless the task can actually change UI,
// world instances, Lighting or external assets.
const zsAutomationCheckpointCore = createCheckpoint;
createCheckpoint = async function zsSelectiveInstanceCheckpoint(id) {
  const goal = String(teamTask && teamTask.goal || "");
  const needsInstances = /ui|gui|hud|menu|button|mobile|map|world|terrain|lighting|spawn|asset|toolbox|creator store|model|arayüz|buton|harita|dünya|ışık|release|complete|entire|full|komple|tüm oyun|her şeyi/i.test(goal);
  if (needsInstances || !zsAutomation.settings.instanceRollback) return zsAutomationCheckpointCore(id);
  const previous = zsAutomation.settings.instanceRollback;
  zsAutomation.settings.instanceRollback = false;
  try {
    return await zsAutomationCheckpointCore(id);
  } finally {
    zsAutomation.settings.instanceRollback = previous;
  }
};

// Recover explicitly from provider context-limit failures instead of waiting for
// the normal hard timeout. Existing context recovery remains the first line of
// defense; this catches persisted/waiting task states.
let zsAutomationContextRecoveryKey = "";
setInterval(() => {
  if (!zsAutomation.settings.autoContextClean || !teamTask) return;
  const error = String(teamTask.error || "");
  if (!/context limit|conversation.*too long|token limit|maximum context|context window/i.test(error)) return;
  if (!["waiting", "failed", "running"].includes(String(teamTask.status || ""))) return;
  const key = `${teamTask.id}:${teamTask.phase}:${teamTask.provider}:${error.slice(0, 80)}`;
  if (key === zsAutomationContextRecoveryKey) return;
  zsAutomationContextRecoveryKey = key;
  const failed = teamTask.provider || "unknown";
  zsAutomationCompactContext("automatic context-limit recovery");
  teamTask.failedProviders = Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : [];
  if (!teamTask.failedProviders.includes(failed)) teamTask.failedProviders.push(failed);
  providerHealth[failed] = { status: "context", reason: error.slice(0, 300), until: Date.now() + 10 * 60 * 1000 };
  teamTask.status = "queued";
  teamTask.error = `${failed} reached its context limit; a fresh provider session will continue from compact memory.`;
  teamTask.phaseStartedAt = Date.now();
  teamTask.updatedAt = Date.now();
  writerLease = null;
  chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth }).catch(() => {});
  zsAutomationNotice("context", "Model context sınırına ulaştı", teamTask.error, "warning");
  broadcastTeam();
  dispatchTask();
}, 10000);

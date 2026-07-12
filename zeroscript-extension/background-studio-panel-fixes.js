// SPDX-License-Identifier: GPL-3.0-or-later
// Service-worker-native task controls for the Studio panel. These do not depend
// on the service worker messaging itself, so Retry/Cancel/Rollback work even
// when no extension popup is open.

const zsStudioPanelHandleActionCore = zsStudioPanelHandleAction;

async function zsStudioPanelRetryTask() {
  if (!teamTask) return { ok: false, error: "No team task exists." };
  teamTask.failedProviders = [];
  for (const [provider, health] of Object.entries(providerHealth)) {
    if (health && health.status === "error") delete providerHealth[provider];
  }
  teamTask.status = "queued";
  teamTask.error = null;
  teamTask.updatedAt = Date.now();
  await chrome.storage.local.set({ zsTeamTask: teamTask, zsProviderHealth: providerHealth });
  broadcastTeam();
  dispatchTask();
  return { ok: true };
}

async function zsStudioPanelCancelTask() {
  if (teamTask) {
    teamTask.status = "cancelled";
    teamTask.updatedAt = Date.now();
    await chrome.storage.local.set({ zsTeamTask: teamTask });
  }
  writerLease = null;
  broadcastTeam();
  return { ok: true };
}

async function zsStudioPanelRollbackTask() {
  const id = checkpointState && checkpointState.latest;
  if (!id) return { ok: false, error: "No checkpoint is available." };
  const result = await restoreCheckpoint(id);
  broadcastTeam();
  return result;
}

zsStudioPanelHandleAction = async function zsStudioPanelHandleActionFixed(item) {
  const action = String(item && item.action || "").toLowerCase();
  if (["retry", "cancel", "rollback"].includes(action)) {
    zsStudioPanel.lastActionAt = Date.now();
    if (typeof zsSuiteLedger === "function") {
      zsSuiteLedger("studio_panel", `Studio requested action: ${action}`, { actionId: item && item.id });
    }
    if (action === "retry") return zsStudioPanelRetryTask();
    if (action === "cancel") return zsStudioPanelCancelTask();
    return zsStudioPanelRollbackTask();
  }
  return zsStudioPanelHandleActionCore(item);
};

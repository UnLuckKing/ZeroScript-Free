// SPDX-License-Identifier: GPL-3.0-or-later
// Adds the 1.27 productivity engine state to the localhost Hub status payload.

const zsProductivityCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsStudioPanelStatusWithProductivity() {
  const payload = zsProductivityCoreStatusPayload();
  if (payload.task && teamTask) {
    payload.task.goal = String(teamTask.goal || "").slice(0, 12000);
    payload.task.phases = Array.isArray(teamTask.phases) ? teamTask.phases : [];
    payload.task.phaseIndex = Number(teamTask.phaseIndex || 0);
    payload.task.performanceMode = teamTask.performanceMode || null;
    payload.task.queueItemId = teamTask.queueItemId || null;
    payload.task.createdAt = Number(teamTask.createdAt || 0);
    payload.task.phaseStartedAt = Number(teamTask.phaseStartedAt || 0);
  }
  payload.productivity = typeof zsProductivityPublic === "function" ? zsProductivityPublic() : null;
  payload.taskHistory = Array.isArray(teamHistory) ? teamHistory.slice(-20) : [];
  if (typeof zsManager !== "undefined" && zsManager) {
    payload.changeDiff = zsManager.diff || null;
    payload.regression = Array.isArray(zsManager.regression) ? zsManager.regression.slice(-20) : [];
    payload.managerTimeline = Array.isArray(zsManager.timeline) ? zsManager.timeline.slice(-20) : [];
  }
  return payload;
};

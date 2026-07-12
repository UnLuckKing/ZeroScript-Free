// SPDX-License-Identifier: GPL-3.0-or-later
// Sends compact verified task evidence to the desktop Memory Vault. The Hub owns
// persistent learning; the extension only exposes current orchestrator evidence.

function zsLearningCompactReport(report) {
  if (!report || typeof report !== "object") return null;
  return {
    phase: String(report.phase || ""),
    provider: String(report.provider || ""),
    verdict: String(report.verdict || ""),
    verified: Array.isArray(report.verified) ? report.verified.slice(-12) : [],
    changes: Array.isArray(report.changes) ? report.changes.slice(-12) : [],
    remaining: Array.isArray(report.remaining) ? report.remaining.slice(-12) : [],
    paths: Array.isArray(report.paths) ? report.paths.slice(-20) : [],
    outputErrors: Array.isArray(report.outputErrors) ? report.outputErrors.slice(-8) : [],
    testEvidence: String(report.testEvidence || "").slice(0, 1600),
    summary: String(report.summary || "").slice(0, 2200),
    at: Number(report.at || 0),
  };
}

function zsLearningSnapshot() {
  const manager = typeof zsManager !== "undefined" && zsManager ? zsManager : null;
  const memory = manager && manager.memory || {};
  const task = teamTask || null;
  return {
    eventId: task ? `${task.id || "task"}:${task.status || "unknown"}:${task.updatedAt || 0}` : `idle:${Date.now()}`,
    taskId: task && task.id || null,
    status: task && task.status || "idle",
    provider: task && task.provider || null,
    phase: task && task.phase || null,
    project: typeof zsAutomation !== "undefined" && zsAutomation ? zsAutomation.activeProject : null,
    memory: {
      verified: Array.isArray(memory.verified) ? memory.verified.slice(-30) : [],
      changedPaths: Array.isArray(memory.changedPaths) ? memory.changedPaths.slice(-50) : [],
      remaining: Array.isArray(memory.remaining) ? memory.remaining.slice(-30) : [],
      outputErrors: Array.isArray(memory.outputErrors) ? memory.outputErrors.slice(-20) : [],
      reports: Array.isArray(memory.reports) ? memory.reports.slice(-6).map(zsLearningCompactReport).filter(Boolean) : [],
    },
    regression: manager && Array.isArray(manager.regression) ? manager.regression.slice(-30) : [],
    diff: manager && manager.diff || null,
    providerStats: manager && manager.stats || {},
    release: manager && manager.release || null,
    capturedAt: Date.now(),
  };
}

const zsLearningCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsStatusWithLearningSnapshot() {
  const payload = zsLearningCoreStatusPayload();
  payload.learningSnapshot = zsLearningSnapshot();
  return payload;
};

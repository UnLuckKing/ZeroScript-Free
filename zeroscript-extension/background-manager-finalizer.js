// SPDX-License-Identifier: GPL-3.0-or-later
// Small finalization layer for the adaptive manager. It clears stale error/open
// memory only when QA explicitly proves a clean state, retries final diff capture
// after long QA checks, and keeps transient routing state out of learned scores.

let zsLastFinalizedTask = null;
let zsLastScoredDiffAt = 0;

const zsCoreRecordPerformance = zsRecordPerformance;
zsRecordPerformance = function zsRecordMeaningfulPerformance(provider, phase, result, report, durationMs) {
  const text = String(report || "");
  if (result === "failed" && /start a zeroscript session|not started|busy in another turn|tab.*not ready/i.test(text)) {
    return;
  }
  return zsCoreRecordPerformance(provider, phase, result, report, durationMs);
};

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "team_task_done") return;
  const report = String(msg.report || "");

  if (String(msg.phase || "").toLowerCase() === "qa") {
    if (/OUTPUT_ERRORS\s*:\s*NONE\b/i.test(report)) {
      zsManager.memory.outputErrors = [];
    }
    const remaining = /(?:^|\n)\s*Remaining work\s*:?\s*(?:\n\s*)?(NONE|None\.?|No remaining work\.?)(?:\n|$)/i.test(report);
    if (remaining) zsManager.memory.remaining = [];
    zsPersistManager().catch(() => {});
  }
});

setInterval(() => {
  if (!teamTask || !["done", "failed"].includes(teamTask.status)) return;

  if (zsManager.plan && zsManager.plan.goal === teamTask.goal) {
    for (const step of zsManager.plan.steps || []) {
      const completed = Array.isArray(teamTask.events) && teamTask.events.some((event) => event.phase === step.phase);
      if (completed) step.status = "done";
    }
  }

  if (zsLastFinalizedTask !== teamTask.id) {
    zsLastFinalizedTask = teamTask.id;
    zsLastScoredDiffAt = 0;
    zsTimeline("final", `${teamTask.status.toUpperCase()} · ${teamTask.id}`, { taskId: teamTask.id });
    zsComputeReleaseScore();
    zsCaptureTaskDiff(teamTask).catch(() => {});
    return;
  }

  const diffAt = zsManager.diff && zsManager.diff.taskId === teamTask.id
    ? Number(zsManager.diff.checkedAt || 0)
    : 0;
  if (diffAt && diffAt !== zsLastScoredDiffAt) {
    zsLastScoredDiffAt = diffAt;
    zsComputeReleaseScore();
  }
}, 5000);

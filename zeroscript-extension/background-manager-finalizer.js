// SPDX-License-Identifier: GPL-3.0-or-later
// Small finalization layer for the adaptive manager. It clears stale error/open
// memory only when QA explicitly proves a clean state, and retries final diff
// capture after long QA evidence checks finish.

let zsLastFinalizedTask = null;

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
    zsTimeline("final", `${teamTask.status.toUpperCase()} · ${teamTask.id}`, { taskId: teamTask.id });
    zsCaptureTaskDiff(teamTask).catch(() => {});
  }
  zsComputeReleaseScore();
}, 5000);

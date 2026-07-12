// SPDX-License-Identifier: GPL-3.0-or-later
// Small hardening layer for runtime states restored by the legacy orchestrator.

const zsSuiteStateFromTaskCore = zsSuiteStateFromTask;
zsSuiteStateFromTask = function zsSuiteStateIncludingWaiting(task) {
  if (task && task.status === "waiting") {
    return {
      state: "waiting_provider",
      detail: task.error || "Waiting for a provider session to become ready",
      taskId: task.id,
      phase: task.phase,
      provider: task.provider || null,
    };
  }
  return zsSuiteStateFromTaskCore(task);
};

// A long-running phase should keep its ownership lease alive. The original
// claim is still released at a terminal task state or after genuine staleness.
setInterval(() => {
  if (teamTask && teamTask.status === "running") {
    zsSuiteClaimDomains(teamTask);
    zsSuitePersist().catch(() => {});
  }
}, 5 * 60 * 1000);

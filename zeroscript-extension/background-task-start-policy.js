// SPDX-License-Identifier: GPL-3.0-or-later
// Startup policy for persisted team tasks.
//
// A provider tab announces itself as ready when the user presses Start Roblox
// agent. Older builds treated that readiness heartbeat as permission to resume
// any persisted task, which could silently relaunch a long Release Manager run.
// Persisted work is now paused after an extension/service-worker restart and can
// continue only after an explicit Retry action.

const ZS_TASK_RESTART_HOLD = /Extension restarted; press Retry to continue\./i;
const ZS_TASK_TERMINAL_STATES = new Set(["done", "failed", "cancelled"]);

function zsTaskShouldPauseAfterRestart(task) {
  if (!task || ZS_TASK_TERMINAL_STATES.has(String(task.status || ""))) return false;
  if (task.autoResumeBlocked === true && task.status !== "queued") return true;
  return task.status === "waiting" && ZS_TASK_RESTART_HOLD.test(String(task.error || ""));
}

async function zsPauseRestoredTask() {
  if (!zsTaskShouldPauseAfterRestart(teamTask)) return false;
  teamTask.status = "paused";
  teamTask.autoResumeBlocked = true;
  teamTask.error = "Previous task paused after restart. Starting an AI session will not resume it automatically. Use Retry to continue or Cancel to discard it.";
  teamTask.updatedAt = Date.now();
  await chrome.storage.local.set({ zsTeamTask: teamTask });
  if (typeof zsSuiteTransition === "function") {
    zsSuiteTransition("paused", "Previous task is waiting for an explicit Retry.", {
      taskId: teamTask.id,
      phase: teamTask.phase,
      provider: teamTask.provider || null,
    });
  }
  broadcastTeam();
  return true;
}

const zsTaskStartPolicyCoreDispatch = dispatchTask;
dispatchTask = async function zsTaskStartPolicyDispatch() {
  // Explicit Retry changes the task to queued and clears the old error before
  // calling dispatchTask. That is the only path that removes the restart hold.
  if (teamTask && teamTask.autoResumeBlocked === true && teamTask.status === "queued" && !teamTask.error) {
    delete teamTask.autoResumeBlocked;
    await chrome.storage.local.set({ zsTeamTask: teamTask });
  }

  if (await zsPauseRestoredTask()) {
    return { ok: false, paused: true, error: teamTask && teamTask.error };
  }
  return zsTaskStartPolicyCoreDispatch();
};

// Proactively convert the restored task to paused. The dispatch wrapper above is
// still the final guard in case a provider heartbeat races this storage read.
chrome.storage.local.get("zsTeamTask", (result) => {
  const saved = result && result.zsTeamTask;
  if (!saved || ZS_TASK_TERMINAL_STATES.has(String(saved.status || ""))) return;
  setTimeout(() => {
    if (teamTask && teamTask.id === saved.id) zsPauseRestoredTask().catch(() => {});
  }, 100);
});

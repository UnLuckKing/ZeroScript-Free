// SPDX-License-Identifier: GPL-3.0-or-later
// Reliability fixes around the local provider's synchronous phase loop.

const zsLocalDispatchWithProvider = dispatchTask;
dispatchTask = function zsDeferredLocalDispatch() {
  if (zsLocalRunning && teamTask && teamTask.status === "queued") {
    setTimeout(() => {
      if (!zsLocalRunning && teamTask && teamTask.status === "queued") dispatchTask();
    }, 50);
    return Promise.resolve();
  }
  return zsLocalDispatchWithProvider();
};

const zsLocalOriginalShouldOwnDispatch = zsLocalShouldOwnDispatch;
zsLocalShouldOwnDispatch = function zsLocalDispatchAllowed() {
  // Review mode relies on the browser-agent approval queue. The background-only
  // local loop cannot safely pause and resume an approved tool result yet, so it
  // yields to a browser provider instead of bypassing user approval.
  if (teamConfig.approvalMode === "review") return false;
  return zsLocalOriginalShouldOwnDispatch();
};

const zsLocalOriginalComplete = zsCompleteLocalTask;
zsCompleteLocalTask = async function zsCompleteLocalTaskClearingHealth(task, report) {
  if (providerHealth.local) {
    delete providerHealth.local;
    await chrome.storage.local.set({ zsProviderHealth: providerHealth });
  }
  return zsLocalOriginalComplete(task, report);
};

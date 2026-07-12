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
  if (!teamTask || !zsLocalConfig.enabled || !zsLocalStatus.ready || zsLocalRunning) return false;

  // Local-first is intentionally limited to text/code-heavy phases because the
  // local provider is text-only and cannot inspect Studio screenshots.
  if (zsLocalConfig.preferLocal && ["analyst", "builder", "reviewer", "qa"].includes(teamTask.phase)) {
    return true;
  }
  return zsLocalOriginalShouldOwnDispatch();
};

// Never hand the pseudo local agent id to chrome.tabs.sendMessage. If the core
// fallback picked local while this dispatch belongs to a browser provider, pick
// the best genuinely open browser tab instead.
const zsLocalFallbackWithoutPseudo = fallbackAgent;
fallbackAgent = function zsBrowserOnlyFallback(preferred, phase) {
  const selected = zsLocalFallbackWithoutPseudo(preferred, phase);
  if (selected && selected.provider !== "local") return selected;
  cleanTeamState();
  const excluded = new Set(teamTask && Array.isArray(teamTask.failedProviders) ? teamTask.failedProviders : []);
  const candidates = [...teamAgents.entries()].filter(([id, agent]) =>
    id !== ZS_LOCAL_AGENT_ID &&
    agent.ready &&
    !excluded.has(agent.provider) &&
    !providerHealth[agent.provider]
  );
  if (!candidates.length) return null;
  const vision = new Set(["gemini", "kimi", "glm", "qwen", "arena", "chatgpt", "claude"]);
  const hit = ["map", "ui", "qa"].includes(phase)
    ? (candidates.find(([, agent]) => vision.has(agent.provider)) || candidates[0])
    : candidates[0];
  return { hit, provider: hit[1].provider, fallback: hit[1].provider !== preferred };
};

const zsLocalOriginalComplete = zsCompleteLocalTask;
zsCompleteLocalTask = async function zsCompleteLocalTaskClearingHealth(task, report) {
  if (providerHealth.local) {
    delete providerHealth.local;
    await chrome.storage.local.set({ zsProviderHealth: providerHealth });
  }
  return zsLocalOriginalComplete(task, report);
};

// SPDX-License-Identifier: GPL-3.0-or-later
// Provider expansion layer. Loads the core orchestrator, then teaches it about
// additional browser and local providers without modifying the upstream worker.

importScripts("background-entry.js");

const ZS_EXTRA_PROVIDER_URLS = [
  "https://chatgpt.com/*",
  "https://claude.ai/*",
  "https://copilot.microsoft.com/*",
  "https://chat.mistral.ai/*",
];

Object.assign(ZS_PROVIDER_WEIGHTS.analyst,  { claude: 11, chatgpt: 10, mistral: 8, copilot: 7 });
Object.assign(ZS_PROVIDER_WEIGHTS.builder,  { chatgpt: 10, claude: 10, mistral: 9, copilot: 8 });
Object.assign(ZS_PROVIDER_WEIGHTS.map,      { chatgpt: 8, claude: 7, mistral: 6, copilot: 6 });
Object.assign(ZS_PROVIDER_WEIGHTS.ui,       { chatgpt: 9, claude: 8, mistral: 7, copilot: 7 });
Object.assign(ZS_PROVIDER_WEIGHTS.reviewer, { claude: 11, chatgpt: 10, mistral: 8, copilot: 7 });
Object.assign(ZS_PROVIDER_WEIGHTS.qa,       { chatgpt: 9, claude: 9, mistral: 7, copilot: 7 });

importScripts("background-manager.js");
importScripts("background-manager-finalizer.js");
importScripts("background-local.js");
importScripts("background-local-fixes.js");
importScripts("background-suite.js");
importScripts("background-suite-fixes.js");
importScripts("background-studio-panel.js");
importScripts("background-studio-panel-fixes.js");
importScripts("background-hub-autopair.js");
importScripts("background-hub-actions.js");
importScripts("background-task-start-policy.js");
importScripts("background-speed-pack.js");
importScripts("background-speed-fixes.js");
importScripts("background-productivity-pack.js");
importScripts("background-productivity-fixes.js");
importScripts("background-productivity-sync.js");
importScripts("background-automation-pack.js");
importScripts("background-automation-fixes.js");
importScripts("background-automation-instance-fixes.js");
importScripts("background-learning-sync.js");
importScripts("background-superior-pack.js");
importScripts("background-superior-fixes.js");
importScripts("background-easy-pack.js");
importScripts("background-easy-fixes.js");
importScripts("background-solo-pack.js");
importScripts("background-solo-fixes.js");

// Public one-request workflow: one available AI owns implementation and testing.
importScripts("background-workbench-pack.js");

// ChatGPT-first execution: compact project capsule, strongest available reasoning
// visibility, same-pass self-review and bounded inactivity nudges.
importScripts("background-chatgpt-max.js");

// Deterministic Golden Templates create a working prototype in two bounded
// Studio calls; Launch Day adds at most one workbench polish pass.
importScripts("background-prototype-pack.js");
importScripts("background-prototype-fixes.js");

function zsBroadcastToExtraTabs(message) {
  chrome.tabs.query({ url: ZS_EXTRA_PROVIDER_URLS }, (tabs) => {
    for (const tab of tabs || []) {
      if (tab.id == null) continue;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

const zsCoreBroadcastTeam = broadcastTeam;
broadcastTeam = function zsBroadcastTeamWithExtras() {
  zsCoreBroadcastTeam();
  zsBroadcastToExtraTabs({ type: "zs-team-status", team: teamObj() });
};

const zsCoreBroadcastStatus = broadcastStatus;
broadcastStatus = function zsBroadcastStatusWithExtras() {
  zsCoreBroadcastStatus();
  zsBroadcastToExtraTabs(statusObj());
};
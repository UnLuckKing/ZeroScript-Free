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

// Dynamic planning, structured memory, learned routing, watchdog recovery,
// deterministic script diffing, regression memory, safety telemetry, and
// release-readiness scoring.
importScripts("background-manager.js");
importScripts("background-manager-finalizer.js");

// Optional free local provider. It runs LM Studio/Ollama through localhost and
// executes the same iterative Roblox tool loop without a paid API.
importScripts("background-local.js");
importScripts("background-local-fixes.js");

// Final reliability/control layer: explicit runtime state machine, provider
// diagnostics and preparation, task ledger, ownership claims, quality modes,
// permission scopes, context recovery, notifications, debug bundles and update
// checks. Loaded last so its wrappers observe the final dispatch implementation.
importScripts("background-suite.js");
importScripts("background-suite-fixes.js");

// Optional authenticated localhost side-channel used by the native Roblox
// Studio DockWidget. Disabled until the user supplies the generated token.
importScripts("background-studio-panel.js");
importScripts("background-studio-panel-fixes.js");

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

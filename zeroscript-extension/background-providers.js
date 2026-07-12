// SPDX-License-Identifier: GPL-3.0-or-later
// Provider expansion layer. Loads the core orchestrator, then teaches it about
// additional browser providers without modifying the upstream worker.

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

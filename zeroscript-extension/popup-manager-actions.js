// SPDX-License-Identifier: GPL-3.0-or-later
// Additional high-value manager actions kept separate from the core dashboard.

(() => {
  "use strict";

  const dashboard = document.getElementById("managerDashboard");
  if (!dashboard) return;

  const goals = {
    security: "Run a server-authoritative security audit of the current Roblox project. Inspect every RemoteEvent and RemoteFunction, purchases, rewards, currencies, inventory ownership, cooldowns, rate limits, DataStores, ProcessReceipt, and client-server boundaries. Fix verified exploit paths, test the corrected calls, and report exact remotes and scripts changed.",
    datastore: "Run a DataStore reliability test using safe test data and the project's existing data layer. Inspect UpdateAsync usage, session locking, autosave, PlayerRemoving/BindToClose behavior, retries, schema defaults, migration safety, duplicate rewards, and failed-save handling. Do not overwrite real production data. Test save then reload where the current Studio environment permits it and report any user-only test still required.",
    mobile: "Run visual and interaction QA for all player-facing UI. Inspect the running UI at desktop and available mobile/tablet emulation sizes, capture screens when supported, find overflow, tiny text, unsafe-area overlap, clipped buttons, inconsistent scaling, low contrast, and broken navigation. Fix verified problems without replacing working logic, then retest every changed interaction.",
    multiplayer: "Run the strongest multiplayer QA supported by the current Roblox Studio and MCP tools. Verify player-isolated UI/data, server-authoritative currency and inventory, RemoteEvent spam resistance, respawn/rejoin behavior, and cross-player state leakage. Use multi-client testing when available; otherwise clearly report the exact multiplayer checks that require a manual local server test and do not claim they passed.",
    performance: "Profile the current Roblox project for expensive loops, excessive descendants, unanchored physics, duplicate connections, memory leaks, heavy UI updates, oversized effects, streaming problems, and server/client work placed on the wrong side. Fix verified high-impact problems, preserve appearance and gameplay, and compare Output and play behavior before and after.",
    economy: "Audit the complete game economy and progression. Inspect sources and sinks, upgrade costs, pity, luck, rebirth, inventory limits, duplicate rewards, gamepasses, developer products, receipt idempotency, and number formatting. Fix verified exploits or broken progression, preserve existing product IDs, and test the main earn-spend-upgrade loop.",
  };

  const section = document.createElement("details");
  section.className = "advanced";
  section.innerHTML = `
    <summary>Specialist manager tasks</summary>
    <div class="task-actions">
      <button class="ghost" data-manager-goal="security">Security & Remotes</button>
      <button class="ghost" data-manager-goal="datastore">DataStore Reliability</button>
      <button class="ghost" data-manager-goal="mobile">Mobile Visual QA</button>
      <button class="ghost" data-manager-goal="multiplayer">Multiplayer QA</button>
      <button class="ghost" data-manager-goal="performance">Performance Audit</button>
      <button class="ghost" data-manager-goal="economy">Economy Audit</button>
    </div>`;
  dashboard.appendChild(section);

  function start(goal) {
    const textarea = document.getElementById("teamGoal");
    const startButton = document.getElementById("startTask");
    const enabled = document.getElementById("teamEnabled");
    if (!textarea || !startButton || !enabled) return;
    textarea.value = goal;
    enabled.checked = true;
    startButton.click();
  }

  section.querySelectorAll("[data-manager-goal]").forEach((button) => {
    button.addEventListener("click", () => start(goals[button.dataset.managerGoal]));
  });
})();

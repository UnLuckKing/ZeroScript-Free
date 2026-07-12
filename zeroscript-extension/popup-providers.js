// SPDX-License-Identifier: GPL-3.0-or-later
// Adds experimental provider choices and a compact model launcher/status view.

(() => {
  "use strict";

  const EXTRA_PROVIDERS = [
    { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "claude", name: "Claude", url: "https://claude.ai/new" },
    { id: "copilot", name: "Microsoft Copilot", url: "https://copilot.microsoft.com/" },
    { id: "mistral", name: "Mistral", url: "https://chat.mistral.ai/chat" },
  ];

  const roleNames = {
    writer: "System Builder",
    mapDesigner: "Map Designer",
    uiDesigner: "UI Designer",
    reviewer: "Reviewer",
    qa: "QA / Playtest",
  };

  for (const [id, role] of Object.entries(roleNames)) {
    const select = document.getElementById(id);
    if (!select) continue;
    for (const provider of EXTRA_PROVIDERS) {
      if ([...select.options].some((option) => option.value === provider.id)) continue;
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = `${role}: ${provider.name} (experimental)`;
      select.appendChild(option);
    }
  }

  const team = document.querySelector(".team");
  const goal = document.getElementById("teamGoal");
  if (!team || !goal) return;

  const launcher = document.createElement("div");
  launcher.className = "task-actions";
  launcher.innerHTML = `
    <select id="providerLauncher" title="Open an additional AI provider">
      ${EXTRA_PROVIDERS.map((provider) => `<option value="${provider.id}">Open ${provider.name}</option>`).join("")}
    </select>
    <button class="ghost" id="openProvider">Open model</button>`;
  team.insertBefore(launcher, goal);

  const modelState = document.createElement("div");
  modelState.id = "providerStatus";
  modelState.className = "row doctor";
  modelState.textContent = "Provider status will appear here.";
  const routerState = document.getElementById("smartRouteState");
  (routerState || goal).parentNode.insertBefore(modelState, (routerState || goal).nextSibling);

  document.getElementById("openProvider").addEventListener("click", () => {
    const id = document.getElementById("providerLauncher").value;
    const provider = EXTRA_PROVIDERS.find((item) => item.id === id);
    if (provider) chrome.tabs.create({ url: provider.url });
  });

  function applySavedSelections(config) {
    if (!config) return;
    for (const id of Object.keys(roleNames)) {
      const select = document.getElementById(id);
      const value = config[id];
      if (select && value && [...select.options].some((option) => option.value === value)) select.value = value;
    }
  }

  function renderProviders(teamState) {
    if (!teamState) return;
    applySavedSelections(teamState.config);
    const byProvider = new Map();
    for (const agent of teamState.agents || []) {
      const current = byProvider.get(agent.provider);
      if (!current || Number(agent.lastSeen || 0) > Number(current.lastSeen || 0)) byProvider.set(agent.provider, agent);
    }

    const all = ["deepseek", "gemini", "qwen", "kimi", "glm", "arena", ...EXTRA_PROVIDERS.map((provider) => provider.id)];
    const lines = all.map((id) => {
      const agent = byProvider.get(id);
      const health = teamState.providerHealth && teamState.providerHealth[id];
      if (health) return `✕ ${id}: ${health.status}`;
      if (agent && agent.ready) return `✓ ${id}: ready`;
      if (agent) return `○ ${id}: tab open, session not started`;
      return `· ${id}: closed`;
    });
    modelState.textContent = lines.join("\n");
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "zs-team-status") renderProviders(message.team);
    if (message && message.type === "zs-status") renderProviders(message.team);
  });

  function refresh() {
    chrome.runtime.sendMessage({ type: "status" }, (status) => {
      if (!chrome.runtime.lastError && status) renderProviders(status.team);
    });
  }

  refresh();
  setInterval(refresh, 2000);

  // popup-manager.js is parsed after this file. Load the specialist action pack
  // on window load so the manager dashboard is guaranteed to exist first.
  window.addEventListener("load", () => {
    if (document.querySelector('script[data-zs-manager-actions]')) return;
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("popup-manager-actions.js");
    script.dataset.zsManagerActions = "1";
    document.documentElement.appendChild(script);
  }, { once: true });
})();

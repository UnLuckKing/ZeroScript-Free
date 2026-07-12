// SPDX-License-Identifier: GPL-3.0-or-later
// Popup settings for the free LM Studio / Ollama provider.

(() => {
  "use strict";

  const team = document.querySelector(".team");
  const goal = document.getElementById("teamGoal");
  if (!team || !goal) return;

  const roleNames = {
    writer: "System Builder",
    mapDesigner: "Map Designer",
    uiDesigner: "UI Designer",
    reviewer: "Reviewer",
    qa: "QA / Playtest",
  };
  for (const [id, role] of Object.entries(roleNames)) {
    const select = document.getElementById(id);
    if (!select || [...select.options].some((option) => option.value === "local")) continue;
    const option = document.createElement("option");
    option.value = "local";
    option.textContent = `${role}: Local AI (free)`;
    select.appendChild(option);
  }

  const section = document.createElement("details");
  section.className = "advanced";
  section.innerHTML = `
    <summary>Local AI — LM Studio / Ollama</summary>
    <label>Enable local AI <input type="checkbox" id="localEnabled"></label>
    <label>Prefer local when suitable <input type="checkbox" id="localPrefer"></label>
    <label>Use when web models unavailable <input type="checkbox" id="localFallback" checked></label>
    <select id="localKind">
      <option value="lmstudio">LM Studio / OpenAI-compatible</option>
      <option value="ollama">Ollama</option>
    </select>
    <input id="localEndpoint" class="zs-local-input" placeholder="http://127.0.0.1:1234/v1/chat/completions" />
    <input id="localModel" class="zs-local-input" placeholder="Model name (blank = first loaded model)" />
    <div class="task-actions"><button class="ghost" id="localSave">Save & test</button><button class="ghost" id="localDisable">Disable</button></div>
    <div id="localStatus" class="row doctor">Local AI status has not been checked.</div>`;
  team.insertBefore(section, goal);

  for (const input of section.querySelectorAll("input.zs-local-input")) {
    Object.assign(input.style, {
      boxSizing: "border-box",
      width: "100%",
      marginTop: "6px",
      padding: "6px",
      borderRadius: "6px",
      color: "#e8e8ec",
      background: "#24242a",
      border: "1px solid #3b3b44",
      fontSize: "11px",
    });
  }

  const defaults = {
    enabled: false,
    preferLocal: false,
    allowFallback: true,
    kind: "lmstudio",
    endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    model: "",
    maxTurns: 32,
    temperature: 0.1,
  };

  function readUi() {
    return {
      ...defaults,
      enabled: document.getElementById("localEnabled").checked,
      preferLocal: document.getElementById("localPrefer").checked,
      allowFallback: document.getElementById("localFallback").checked,
      kind: document.getElementById("localKind").value,
      endpoint: document.getElementById("localEndpoint").value.trim(),
      model: document.getElementById("localModel").value.trim(),
    };
  }

  function writeUi(config) {
    const value = { ...defaults, ...(config || {}) };
    document.getElementById("localEnabled").checked = !!value.enabled;
    document.getElementById("localPrefer").checked = !!value.preferLocal;
    document.getElementById("localFallback").checked = value.allowFallback !== false;
    document.getElementById("localKind").value = value.kind || "lmstudio";
    document.getElementById("localEndpoint").value = value.endpoint || defaults.endpoint;
    document.getElementById("localModel").value = value.model || "";
  }

  function save(config) {
    return new Promise((resolve) => chrome.storage.local.set({ zsLocalModelConfig: config }, resolve));
  }

  document.getElementById("localSave").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Testing…";
    const config = readUi();
    if (!config.endpoint) {
      config.endpoint = config.kind === "ollama" ? "http://127.0.0.1:11434/api/chat" : defaults.endpoint;
      writeUi(config);
    }
    await save(config);
    document.getElementById("localStatus").textContent = "Waiting for local server health check…";
    setTimeout(() => {
      button.disabled = false;
      button.textContent = "Save & test";
      refresh();
    }, 1800);
  });

  document.getElementById("localDisable").addEventListener("click", async () => {
    const config = { ...readUi(), enabled: false, preferLocal: false };
    writeUi(config);
    await save(config);
    refresh();
  });

  document.getElementById("localKind").addEventListener("change", (event) => {
    const endpoint = document.getElementById("localEndpoint");
    const oldDefault = endpoint.value === defaults.endpoint || endpoint.value === "http://127.0.0.1:11434/api/chat";
    if (oldDefault) endpoint.value = event.target.value === "ollama" ? "http://127.0.0.1:11434/api/chat" : defaults.endpoint;
  });

  function render(status) {
    const box = document.getElementById("localStatus");
    const local = status && status.team && status.team.localModel;
    if (!local) return;
    if (local.ready) {
      box.textContent = `✓ Ready · ${local.config.kind} · ${local.model || "loaded model"}\n${local.config.endpoint}`;
    } else if (local.checking) {
      box.textContent = "Checking local AI server…";
    } else if (local.config && local.config.enabled) {
      box.textContent = `✕ Local AI unavailable\n${local.error || "Start LM Studio/Ollama and load a model."}`;
    } else {
      box.textContent = "Local AI disabled.";
    }
  }

  function refresh() {
    chrome.runtime.sendMessage({ type: "status" }, (status) => {
      if (!chrome.runtime.lastError && status) render(status);
    });
  }

  chrome.storage.local.get("zsLocalModelConfig", (result) => writeUi(result && result.zsLocalModelConfig));
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "zs-status") render(message);
    if (message && message.type === "zs-team-status") refresh();
  });
  refresh();
  setInterval(refresh, 2500);
})();

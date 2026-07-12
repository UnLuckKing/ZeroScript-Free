// SPDX-License-Identifier: GPL-3.0-or-later
// Setup and health UI for the optional native Roblox Studio DockWidget.

(() => {
  "use strict";

  const control = document.getElementById("controlSuite");
  if (!control) return;

  const section = document.createElement("details");
  section.className = "advanced";
  section.innerHTML = `
    <summary>Native Roblox Studio panel</summary>
    <label>Enable Studio panel sync <input type="checkbox" id="studioPanelEnabled"></label>
    <input id="studioPanelUrl" type="text" value="http://127.0.0.1:17614" placeholder="Control API URL" style="box-sizing:border-box;width:100%;margin-top:6px;padding:6px;border-radius:6px;color:#e8e8ec;background:#24242a;border:1px solid #3b3b44;">
    <input id="studioPanelToken" type="password" placeholder="Paste control_token.txt value" style="box-sizing:border-box;width:100%;margin-top:6px;padding:6px;border-radius:6px;color:#e8e8ec;background:#24242a;border:1px solid #3b3b44;">
    <div class="task-actions">
      <button class="ghost" id="studioPanelSave">Save</button>
      <button class="ghost" id="studioPanelTest">Test connection</button>
    </div>
    <div id="studioPanelState" class="row doctor">Studio panel is not configured.</div>`;
  control.appendChild(section);

  let latest = null;

  function send(message, callback) {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) callback({ ok: false, error: chrome.runtime.lastError.message });
      else callback(response || { ok: false, error: "No response" });
    });
  }

  function ago(value) {
    if (!value) return "never";
    const seconds = Math.max(0, Math.round((Date.now() - Number(value)) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
  }

  function render(team) {
    if (!team || !team.studioPanel) return;
    latest = team.studioPanel;
    document.getElementById("studioPanelEnabled").checked = !!latest.enabled;
    document.getElementById("studioPanelUrl").value = latest.url || "http://127.0.0.1:17614";
    const lines = [
      `${latest.connected ? "✓ CONNECTED" : latest.enabled ? "○ WAITING" : "DISABLED"}`,
      `URL: ${latest.url || "http://127.0.0.1:17614"}`,
      `Token: ${latest.tokenConfigured ? "configured" : "missing"}`,
      `Last sync: ${ago(latest.lastSyncAt)}`,
      latest.lastError ? `Status: ${latest.lastError}` : "",
      "Run start_with_panel.bat, install the .rbxmx plugin, enable HTTP Requests in Studio, then paste control_token.txt here and in the Studio widget.",
    ].filter(Boolean);
    document.getElementById("studioPanelState").textContent = lines.join("\n");
  }

  document.getElementById("studioPanelSave").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Saving…";
    send({
      type: "studio_panel_config",
      enabled: document.getElementById("studioPanelEnabled").checked,
      url: document.getElementById("studioPanelUrl").value.trim(),
      token: document.getElementById("studioPanelToken").value.trim(),
    }, (response) => {
      button.disabled = false;
      button.textContent = response.ok ? "✓ Saved" : "Save failed";
      if (response.team) render(response.team);
      else if (!response.ok) document.getElementById("studioPanelState").textContent = response.error || "Could not save Studio panel settings.";
      setTimeout(() => { button.textContent = "Save"; }, 1600);
    });
  });

  document.getElementById("studioPanelTest").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Testing…";
    send({ type: "studio_panel_test" }, (response) => {
      button.disabled = false;
      button.textContent = response.ok ? "✓ Connected" : "Test failed";
      if (response.team) render(response.team);
      if (!response.ok) document.getElementById("studioPanelState").textContent = response.error || "Studio panel connection failed.";
      setTimeout(() => { button.textContent = "Test connection"; }, 1800);
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && (message.type === "zs-status" || message.type === "zs-team-status")) render(message.team);
  });

  setInterval(() => {
    send({ type: "status" }, (status) => status && render(status.team));
  }, 2500);
})();

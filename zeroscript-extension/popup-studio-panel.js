// SPDX-License-Identifier: GPL-3.0-or-later
// Setup and health UI for the optional native Roblox Studio DockWidget.

(() => {
  "use strict";

  const STORAGE_KEY = "zsStudioPanelConfig";
  const DEFAULT_URL = "http://127.0.0.1:17614";
  const control = document.getElementById("controlSuite");
  if (!control) return;

  const section = document.createElement("details");
  section.className = "advanced";
  section.innerHTML = `
    <summary>Native Roblox Studio panel</summary>
    <label>Enable Studio panel sync <input type="checkbox" id="studioPanelEnabled"></label>
    <input id="studioPanelUrl" type="text" value="${DEFAULT_URL}" placeholder="Control API URL" style="box-sizing:border-box;width:100%;margin-top:6px;padding:6px;border-radius:6px;color:#e8e8ec;background:#24242a;border:1px solid #3b3b44;">
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

  function publicConfig(config) {
    return {
      enabled: !!config.enabled,
      url: config.url || DEFAULT_URL,
      tokenConfigured: !!String(config.token || "").trim(),
      connected: !!config.connected,
      lastSyncAt: Number(config.lastSyncAt || 0),
      lastError: String(config.lastError || ""),
    };
  }

  function render(team) {
    if (!team || !team.studioPanel) return;
    latest = team.studioPanel;
    document.getElementById("studioPanelEnabled").checked = !!latest.enabled;
    document.getElementById("studioPanelUrl").value = latest.url || DEFAULT_URL;
    const lines = [
      `${latest.connected ? "✓ CONNECTED" : latest.enabled ? "○ WAITING" : "DISABLED"}`,
      `URL: ${latest.url || DEFAULT_URL}`,
      `Token: ${latest.tokenConfigured ? "configured" : "missing"}`,
      `Last sync: ${ago(latest.lastSyncAt)}`,
      latest.lastError ? `Status: ${latest.lastError}` : "",
      "Run start_with_panel.bat, install the .rbxmx plugin, enable HTTP Requests in Studio, then paste control_token.txt here and in the Studio widget.",
    ].filter(Boolean);
    document.getElementById("studioPanelState").textContent = lines.join("\n");
  }

  function normalizedInput() {
    const enabled = document.getElementById("studioPanelEnabled").checked;
    const url = document.getElementById("studioPanelUrl").value.trim().replace(/\/+$/, "") || DEFAULT_URL;
    const token = document.getElementById("studioPanelToken").value.trim();
    if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url)) {
      throw new Error("URL must use localhost or 127.0.0.1.");
    }
    return { enabled, url, token };
  }

  function saveDirect(config, callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: config }, () => {
      if (chrome.runtime.lastError) callback({ ok: false, error: chrome.runtime.lastError.message });
      else callback({ ok: true, config });
    });
  }

  document.getElementById("studioPanelSave").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Saving…";
    let input;
    try {
      input = normalizedInput();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Save failed";
      document.getElementById("studioPanelState").textContent = String(error && error.message || error);
      setTimeout(() => { button.textContent = "Save"; }, 1800);
      return;
    }

    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const current = (result && result[STORAGE_KEY]) || {};
      const next = {
        ...current,
        ...input,
        connected: input.enabled ? !!current.connected : false,
        lastError: input.enabled ? "Saved; waiting for sync test." : "Studio panel disabled",
      };
      saveDirect(next, (response) => {
        button.disabled = false;
        button.textContent = response.ok ? "✓ Saved" : "Save failed";
        if (response.ok) {
          render({ studioPanel: publicConfig(next) });
          setTimeout(() => send({ type: "status" }, (status) => status && render(status.team)), 300);
        } else {
          document.getElementById("studioPanelState").textContent = response.error || "Could not save Studio panel settings.";
        }
        setTimeout(() => { button.textContent = "Save"; }, 1800);
      });
    });
  });

  document.getElementById("studioPanelTest").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Testing…";
    try {
      const input = normalizedInput();
      if (!input.token) throw new Error("Paste the token from control_token.txt first.");
      const healthResponse = await fetch(`${input.url}/health`, { cache: "no-store" });
      const health = await healthResponse.json();
      if (!healthResponse.ok || !health.ok) throw new Error(health.error || `Control API HTTP ${healthResponse.status}`);
      const statusResponse = await fetch(`${input.url}/status`, {
        cache: "no-store",
        headers: { "X-ZeroScript-Token": input.token },
      });
      const status = await statusResponse.json();
      if (!statusResponse.ok || !status.ok) throw new Error(status.error || `Control API HTTP ${statusResponse.status}`);

      const next = {
        ...input,
        connected: true,
        lastSyncAt: Date.now(),
        lastError: "",
      };
      await new Promise((resolve, reject) => saveDirect(next, (response) => response.ok ? resolve() : reject(new Error(response.error || "Could not save connection state."))));
      render({ studioPanel: publicConfig(next) });
      button.textContent = "✓ Connected";
    } catch (error) {
      button.textContent = "Test failed";
      document.getElementById("studioPanelState").textContent = String(error && error.message || error);
    } finally {
      button.disabled = false;
      setTimeout(() => { button.textContent = "Test connection"; }, 1800);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && (message.type === "zs-status" || message.type === "zs-team-status")) render(message.team);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY] || !changes[STORAGE_KEY].newValue) return;
    render({ studioPanel: publicConfig(changes[STORAGE_KEY].newValue) });
  });

  setInterval(() => {
    send({ type: "status" }, (status) => status && render(status.team));
  }, 2500);
})();
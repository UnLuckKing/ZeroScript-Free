// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.24 Control Center UI.

(() => {
  "use strict";

  const team = document.querySelector(".team");
  const teamState = document.getElementById("teamState");
  if (!team || !teamState) return;

  const providers = ["default", "deepseek", "gemini", "qwen", "kimi", "glm", "arena", "chatgpt", "claude", "copilot", "mistral", "local"];
  const panel = document.createElement("details");
  panel.id = "controlSuite";
  panel.className = "advanced";
  panel.open = true;
  panel.innerHTML = `
    <summary>ZeroScript Control Center</summary>
    <select id="suiteQuality" title="Choose speed versus verification depth">
      <option value="fast">Mode: Fast</option>
      <option value="balanced">Mode: Balanced</option>
      <option value="best">Mode: Best Quality</option>
    </select>
    <label>Completion notifications <input type="checkbox" id="suiteNotifications"></label>
    <label>Auto context recovery <input type="checkbox" id="suiteContextRecovery"></label>
    <div id="suiteRuntime" class="row doctor">Runtime state unavailable.</div>
    <div class="task-actions">
      <button class="ghost" id="suiteProbe">Test providers</button>
      <button class="ghost" id="suiteUpdate">Check update</button>
    </div>
    <div class="task-actions">
      <select id="suitePrepareProvider" title="Open and prepare a provider">
        ${providers.filter((provider) => provider !== "default" && provider !== "local").map((provider) => `<option value="${provider}">${provider}</option>`).join("")}
      </select>
      <button class="ghost" id="suitePrepare">Open + Start</button>
    </div>
    <div id="suiteProbeState" class="row doctor">Provider diagnostics have not run yet.</div>
    <details class="advanced">
      <summary>Provider permissions</summary>
      <select id="suitePermissionProvider">${providers.map((provider) => `<option value="${provider}">${provider}</option>`).join("")}</select>
      <select id="suitePermissionScope">
        <option value="inspect">Inspect only</option>
        <option value="scripts">Scripts only</option>
        <option value="ui">UI only</option>
        <option value="map">Map only</option>
        <option value="full">Full access</option>
      </select>
      <button class="ghost" id="suiteSavePermission">Save permission</button>
    </details>
    <details class="advanced">
      <summary>Ownership, conflicts and risk</summary>
      <div id="suiteOwnership" class="row doctor">No active ownership claims.</div>
      <button class="ghost" id="suiteClearClaims">Clear stale claims</button>
    </details>
    <details class="advanced">
      <summary>Regression recorder</summary>
      <textarea id="suiteRegressionText" placeholder="Example: Open Inventory, click Equip Best, verify character updates and Output stays clean."></textarea>
      <button class="ghost" id="suiteAddRegression">Save regression test</button>
    </details>
    <div class="task-actions">
      <button class="ghost" id="suiteDebug">Download debug bundle</button>
      <button class="ghost" id="suiteRefresh">Refresh status</button>
    </div>
    <div id="suiteUpdateState" class="row doctor">Update status has not been checked.</div>`;
  teamState.parentNode.insertBefore(panel, teamState);

  let latestTeam = null;

  function ago(value) {
    if (!value) return "never";
    const seconds = Math.max(0, Math.round((Date.now() - Number(value)) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }

  function scopeFor(provider, permissions) {
    if (!permissions) return "full";
    return (permissions.providers && permissions.providers[provider]) || permissions.default || "full";
  }

  function render(teamObject) {
    if (!teamObject || !teamObject.controlSuite) return;
    latestTeam = teamObject;
    const suite = teamObject.controlSuite;
    document.getElementById("suiteQuality").value = suite.qualityMode || "balanced";
    document.getElementById("suiteNotifications").checked = suite.notifications !== false;
    document.getElementById("suiteContextRecovery").checked = suite.autoContextRecovery !== false;

    const runtime = suite.runtime || {};
    const lines = [
      `STATE: ${String(runtime.state || "unknown").toUpperCase()}`,
      runtime.phase ? `Phase: ${runtime.phase}` : "",
      runtime.provider ? `Provider: ${runtime.provider}` : "",
      runtime.taskId ? `Task: ${runtime.taskId}` : "",
      runtime.detail ? runtime.detail : "",
      `Changed: ${ago(runtime.changedAt)}`,
    ].filter(Boolean);
    const recent = Array.isArray(suite.ledger) ? suite.ledger.slice(-5).reverse() : [];
    if (recent.length) {
      lines.push("", "Recent:");
      for (const event of recent) lines.push(`• ${ago(event.at)} · ${String(event.kind || "event").toUpperCase()} · ${event.detail || ""}`);
    }
    document.getElementById("suiteRuntime").textContent = lines.join("\n");

    const probes = Object.values(suite.probes || {});
    document.getElementById("suiteProbeState").textContent = probes.length
      ? probes.map((probe) => `${probe.ready ? "✓" : probe.composer ? "○" : "✕"} ${probe.provider || "unknown"}: ${probe.ready ? "ready" : probe.composer ? "composer found, session not started" : probe.error || "composer unavailable"}${probe.canRead === false ? " · reply reader unavailable" : ""}`).join("\n")
      : "Provider diagnostics have not run yet.";

    const ownership = suite.ownership || { claims: {}, conflicts: [] };
    const ownershipLines = Object.entries(ownership.claims || {}).map(([domain, claim]) => `🔒 ${domain}: ${claim.provider} · ${claim.phase} · ${ago(claim.claimedAt)}`);
    const conflicts = Array.isArray(ownership.conflicts) ? ownership.conflicts.slice(-5) : [];
    for (const conflict of conflicts) ownershipLines.push(`⚠ ${conflict.domain}: ${conflict.requestedBy} vs ${conflict.owner}`);
    const risk = suite.risk || {};
    if (risk.checkedAt) ownershipLines.push(`Risk: ${risk.score || 0}/100 ${String(risk.level || "low").toUpperCase()} · ${risk.tool || "operation"}${(risk.reasons || []).length ? ` · ${(risk.reasons || []).join(", ")}` : ""}`);
    document.getElementById("suiteOwnership").textContent = ownershipLines.length ? ownershipLines.join("\n") : "No active ownership claims or recorded risk.";

    const update = suite.update || {};
    document.getElementById("suiteUpdateState").textContent = update.error
      ? `Update check failed: ${update.error}`
      : update.checkedAt
        ? `Current ${update.current || "?"} · Latest ${update.latest || "?"}${update.available ? "\nUpdate available: pull master and reload the extension." : "\n✓ Current build is up to date."}`
        : "Update status has not been checked.";

    const provider = document.getElementById("suitePermissionProvider").value;
    document.getElementById("suitePermissionScope").value = scopeFor(provider, suite.permissions);
  }

  function send(message, callback) {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        callback && callback({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      callback && callback(response || { ok: false, error: "No response" });
    });
  }

  function refresh() {
    send({ type: "status" }, (status) => status && render(status.team));
  }

  function saveConfig() {
    send({
      type: "suite_set_config",
      qualityMode: document.getElementById("suiteQuality").value,
      notifications: document.getElementById("suiteNotifications").checked,
      autoContextRecovery: document.getElementById("suiteContextRecovery").checked,
    }, (response) => response && response.team && render(response.team));
  }

  document.getElementById("suiteQuality").addEventListener("change", saveConfig);
  document.getElementById("suiteNotifications").addEventListener("change", saveConfig);
  document.getElementById("suiteContextRecovery").addEventListener("change", saveConfig);

  document.getElementById("suiteProbe").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Testing…";
    send({ type: "suite_provider_probe" }, (response) => {
      button.disabled = false;
      button.textContent = response.ok ? "✓ Providers tested" : "Probe failed";
      if (response.team) render(response.team);
      if (!response.ok) document.getElementById("suiteProbeState").textContent = response.error || "Provider probe failed.";
      setTimeout(() => { button.textContent = "Test providers"; }, 1800);
    });
  });

  document.getElementById("suitePrepare").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const provider = document.getElementById("suitePrepareProvider").value;
    button.disabled = true;
    button.textContent = "Opening…";
    send({ type: "suite_prepare_provider", provider }, (response) => {
      button.disabled = false;
      button.textContent = response.ok ? "✓ Start requested" : "Prepare failed";
      if (!response.ok) document.getElementById("suiteProbeState").textContent = response.error || "Provider could not be prepared.";
      if (response.team) render(response.team);
      setTimeout(() => { button.textContent = "Open + Start"; }, 2200);
    });
  });

  document.getElementById("suiteUpdate").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Checking…";
    send({ type: "suite_check_update" }, (response) => {
      button.disabled = false;
      button.textContent = response.ok ? "✓ Checked" : "Check failed";
      if (response.team) render(response.team);
      else if (!response.ok) document.getElementById("suiteUpdateState").textContent = response.error || "Update check failed.";
      setTimeout(() => { button.textContent = "Check update"; }, 1600);
    });
  });

  document.getElementById("suitePermissionProvider").addEventListener("change", () => {
    const suite = latestTeam && latestTeam.controlSuite;
    if (!suite) return;
    const provider = document.getElementById("suitePermissionProvider").value;
    document.getElementById("suitePermissionScope").value = scopeFor(provider, suite.permissions);
  });

  document.getElementById("suiteSavePermission").addEventListener("click", (event) => {
    const button = event.currentTarget;
    send({
      type: "suite_set_permission",
      provider: document.getElementById("suitePermissionProvider").value,
      scope: document.getElementById("suitePermissionScope").value,
    }, (response) => {
      button.textContent = response.ok ? "✓ Permission saved" : "Save failed";
      if (response.team) render(response.team);
      setTimeout(() => { button.textContent = "Save permission"; }, 1600);
    });
  });

  document.getElementById("suiteClearClaims").addEventListener("click", (event) => {
    send({ type: "suite_clear_claims" }, (response) => {
      event.currentTarget.textContent = response.ok ? "✓ Claims cleared" : "Clear failed";
      if (response.team) render(response.team);
      setTimeout(() => { event.currentTarget.textContent = "Clear stale claims"; }, 1600);
    });
  });

  document.getElementById("suiteAddRegression").addEventListener("click", (event) => {
    const text = document.getElementById("suiteRegressionText").value.trim();
    send({ type: "suite_add_regression", test: text }, (response) => {
      event.currentTarget.textContent = response.ok ? "✓ Test recorded" : "Save failed";
      if (response.ok) document.getElementById("suiteRegressionText").value = "";
      setTimeout(() => { event.currentTarget.textContent = "Save regression test"; }, 1600);
    });
  });

  document.getElementById("suiteDebug").addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Building…";
    send({ type: "suite_debug_bundle" }, (response) => {
      button.disabled = false;
      if (!response.ok || !response.bundle) {
        button.textContent = "Bundle failed";
        setTimeout(() => { button.textContent = "Download debug bundle"; }, 1800);
        return;
      }
      const blob = new Blob([JSON.stringify(response.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `zeroscript-debug-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      button.textContent = "✓ Debug bundle saved";
      setTimeout(() => { button.textContent = "Download debug bundle"; }, 1800);
    });
  });

  document.getElementById("suiteRefresh").addEventListener("click", refresh);

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === "zs-status" || message.type === "zs-team-status") render(message.team);
  });

  refresh();
  setInterval(refresh, 2200);
})();

// SPDX-License-Identifier: GPL-3.0-or-later
// Popup enhancements for automatic model routing, reconnect-aware status, and
// visible final reports. Loaded after popup.js so it augments, rather than
// replaces, the existing controls.

(() => {
  "use strict";

  const teamBox = document.querySelector(".team");
  const deepSeekMode = document.getElementById("deepSeekSendMode");
  if (!teamBox || !deepSeekMode) return;

  const routingLabel = document.createElement("label");
  routingLabel.title = "Let ZeroScript choose the best ready model for each phase using the task, live provider health, and previous phase history.";
  routingLabel.innerHTML = 'Smart AI routing <input type="checkbox" id="smartRouting" checked>';
  teamBox.insertBefore(routingLabel, deepSeekMode);

  const routeState = document.createElement("div");
  routeState.id = "smartRouteState";
  routeState.className = "row";
  routeState.style.whiteSpace = "pre-wrap";
  routeState.style.color = "#a7f3d0";
  routeState.textContent = "Smart router waiting for a task.";
  const teamState = document.getElementById("teamState");
  teamState.parentNode.insertBefore(routeState, teamState);

  const reportBox = document.createElement("details");
  reportBox.id = "teamFinalReportBox";
  reportBox.className = "advanced";
  reportBox.innerHTML = '<summary>Latest team report</summary><div id="teamFinalReport" class="row doctor">No report received yet.</div>';
  teamState.parentNode.insertBefore(reportBox, teamState.nextSibling);

  const smartToggle = document.getElementById("smartRouting");
  const roleSelects = ["writer", "mapDesigner", "uiDesigner", "reviewer", "qa"].map((id) => document.getElementById(id));

  function configFromUi() {
    return {
      enabled: document.getElementById("teamEnabled").checked,
      smartRouting: smartToggle.checked,
      writer: document.getElementById("writer").value,
      mapDesigner: document.getElementById("mapDesigner").value,
      uiDesigner: document.getElementById("uiDesigner").value,
      reviewer: document.getElementById("reviewer").value,
      qa: document.getElementById("qa").value,
      approvalMode: document.getElementById("approvalMode").value,
    };
  }

  function applyRoutingMode(enabled) {
    smartToggle.checked = enabled !== false;
    for (const select of roleSelects) {
      select.disabled = smartToggle.checked;
      select.style.opacity = smartToggle.checked ? "0.55" : "1";
      select.title = smartToggle.checked
        ? "Controlled automatically by Smart AI routing. Turn Smart AI routing off to select manually."
        : "Manual provider assignment.";
    }
  }

  function updateTeam(team) {
    if (!team) return;
    applyRoutingMode(!team.config || team.config.smartRouting !== false);
    const task = team.task;
    if (!task) {
      routeState.textContent = smartToggle.checked ? "Smart router waiting for a task." : "Manual provider routing enabled.";
      return;
    }

    routeState.textContent = task.routingReason || (smartToggle.checked
      ? `Smart route preparing · ${task.phase || "unknown phase"}`
      : "Manual provider routing enabled.");

    const report = String(task.finalReport || task.lastReport || "").trim();
    const reportEl = document.getElementById("teamFinalReport");
    if (report) {
      reportEl.textContent = report.slice(0, 8000);
      if (["done", "failed"].includes(task.status)) reportBox.open = true;
    } else {
      reportEl.textContent = "No report received yet.";
    }

    if (task.status === "done") {
      teamState.textContent = `COMPLETED · final report received\n${task.provider || "team"} finished ${task.phase || "complete"}`;
    } else if (task.status === "failed") {
      teamState.textContent = `FAILED · final report preserved${task.error ? `\n${task.error}` : ""}`;
    }
  }

  function updateConnection(status) {
    if (!status) return;
    const state = document.getElementById("state");
    const tools = document.getElementById("tools");
    const dot = document.getElementById("dot");

    if (status.reconnecting && !status.transportConnected) {
      dot.className = "dot warn";
      state.textContent = "Bridge reconnecting · team state preserved";
      tools.textContent = status.tools ? `${status.tools} cached tools · reconnecting` : "Reconnecting to bridge…";
    }
    updateTeam(status.team);
  }

  smartToggle.addEventListener("change", () => {
    applyRoutingMode(smartToggle.checked);
    chrome.runtime.sendMessage({ type: "team_config", config: configFromUi() }, (response) => {
      if (response && response.team) updateTeam(response.team);
    });
  });

  chrome.storage.local.get("zsTeamConfig", (result) => {
    const config = result && result.zsTeamConfig;
    applyRoutingMode(!config || config.smartRouting !== false);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === "zs-status") updateConnection(message);
    if (message.type === "zs-team-status") updateTeam(message.team);
  });

  function refreshSmartStatus() {
    chrome.runtime.sendMessage({ type: "status" }, (status) => {
      if (chrome.runtime.lastError) return;
      updateConnection(status);
    });
  }

  refreshSmartStatus();
  setInterval(refreshSmartStatus, 1500);
})();

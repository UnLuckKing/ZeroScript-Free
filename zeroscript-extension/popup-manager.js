// SPDX-License-Identifier: GPL-3.0-or-later
// Compact AI Team Manager dashboard for the extension popup.

(() => {
  "use strict";

  const teamBox = document.querySelector(".team");
  const teamState = document.getElementById("teamState");
  if (!teamBox || !teamState) return;

  const panel = document.createElement("details");
  panel.id = "managerDashboard";
  panel.className = "advanced";
  panel.open = true;
  panel.innerHTML = `
    <summary>AI Team Manager</summary>
    <div id="managerPlan" class="row doctor">No manager plan yet.</div>
    <div id="managerRelease" class="row doctor">Release readiness has not been calculated.</div>
    <div class="task-actions">
      <button class="ghost" id="managerReleaseTask">▶ Release Manager</button>
      <button class="ghost" id="managerRegressionTask">▶ Regression QA</button>
    </div>
    <details class="advanced"><summary>Structured project memory</summary><div id="managerMemory" class="row doctor">No structured memory yet.</div></details>
    <details class="advanced"><summary>Provider performance</summary><div id="managerStats" class="row doctor">No provider results yet.</div></details>
    <details class="advanced"><summary>Task timeline</summary><div id="managerTimeline" class="row doctor">No task events yet.</div></details>
    <details class="advanced"><summary>Latest script diff and safety</summary><div id="managerDiff" class="row doctor">No completed task diff yet.</div></details>`;
  teamState.parentNode.insertBefore(panel, teamState);

  const RELEASE_GOAL = "Run the Release Manager for the currently open Roblox experience. Inspect release readiness, security, DataStores, purchases, economy, onboarding, mobile UI, performance, Output, respawn, and the main gameplay loop. Fix verified blockers that are safe to fix, run regression tests, and return a release score with genuine remaining user-only steps.";
  const REGRESSION_GOAL = "Run all known regression tests for the currently open Roblox project. Use the shared structured project memory, trigger each recorded interaction in play mode, inspect Studio Output, fix verified regressions, repeat failed tests, and return exact TEST_EVIDENCE and OUTPUT_ERRORS lines.";

  function startGoal(goal) {
    const textarea = document.getElementById("teamGoal");
    const start = document.getElementById("startTask");
    if (!textarea || !start) return;
    textarea.value = goal;
    document.getElementById("teamEnabled").checked = true;
    start.click();
  }

  document.getElementById("managerReleaseTask").addEventListener("click", () => startGoal(RELEASE_GOAL));
  document.getElementById("managerRegressionTask").addEventListener("click", () => startGoal(REGRESSION_GOAL));

  function ago(timestamp) {
    const seconds = Math.max(0, Math.round((Date.now() - Number(timestamp || 0)) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }

  function renderPlan(manager, task) {
    const box = document.getElementById("managerPlan");
    const plan = manager && manager.plan;
    if (!plan || !Array.isArray(plan.steps)) {
      box.textContent = "No manager plan yet.";
      return;
    }
    const active = task && task.phase;
    box.textContent = plan.steps.map((step, index) => {
      const completed = task && Array.isArray(task.events) && task.events.some((event) => event.phase === step.phase);
      const state = completed ? "✓" : active === step.phase ? "▶" : "○";
      return `${state} ${index + 1}. ${step.title || step.phase}`;
    }).join("\n");
  }

  function renderMemory(manager) {
    const box = document.getElementById("managerMemory");
    const memory = manager && manager.memory;
    if (!memory) { box.textContent = "No structured memory yet."; return; }
    const lines = [];
    const pushGroup = (title, values, max) => {
      const list = Array.isArray(values) ? values.slice(-max) : [];
      if (!list.length) return;
      lines.push(`${title}:`);
      for (const item of list) lines.push(`• ${typeof item === "string" ? item : (item.summary || JSON.stringify(item)).slice(0, 280)}`);
    };
    pushGroup("Verified", memory.verified, 8);
    pushGroup("Changed paths", memory.changedPaths, 8);
    pushGroup("Remaining", memory.remaining, 8);
    pushGroup("Output errors", memory.outputErrors, 5);
    box.textContent = lines.length ? lines.join("\n") : "No structured memory yet.";
  }

  function renderStats(manager) {
    const box = document.getElementById("managerStats");
    const stats = manager && manager.stats || {};
    const rows = Object.entries(stats)
      .filter(([, stat]) => stat && stat.attempts)
      .map(([provider, stat]) => {
        const rate = Math.round((Number(stat.completed || 0) / Math.max(1, Number(stat.attempts || 0))) * 100);
        const avg = stat.attempts ? Math.round(Number(stat.totalMs || 0) / stat.attempts / 1000) : 0;
        return { provider, rate, avg, attempts: stat.attempts, errors: Number(stat.toolErrors || 0) + Number(stat.contextFailures || 0) };
      })
      .sort((a, b) => b.rate - a.rate || b.attempts - a.attempts);
    box.textContent = rows.length
      ? rows.map((row) => `${row.provider}: ${row.rate}% success · ${row.attempts} runs · ${row.avg}s avg · ${row.errors} tool/context errors`).join("\n")
      : "No provider results yet.";
  }

  function renderTimeline(manager) {
    const box = document.getElementById("managerTimeline");
    const timeline = manager && Array.isArray(manager.timeline) ? manager.timeline.slice(-12).reverse() : [];
    box.textContent = timeline.length
      ? timeline.map((event) => `${ago(event.at)} · ${String(event.kind || "event").toUpperCase()} · ${event.detail || ""}`).join("\n")
      : "No task events yet.";
  }

  function renderDiff(manager) {
    const box = document.getElementById("managerDiff");
    const diff = manager && manager.diff;
    const safety = manager && manager.safety;
    const lines = [];
    if (diff) {
      lines.push(`${diff.risk ? "⚠ HIGH-RISK DIFF" : "✓ Diff recorded"}`);
      lines.push(`Changed ${diff.changed ? diff.changed.length : 0} · Created ${diff.created ? diff.created.length : 0} · Deleted ${diff.deleted ? diff.deleted.length : 0}`);
      for (const path of [...(diff.deleted || []).slice(0, 4), ...(diff.changed || []).slice(0, 4)]) lines.push(`• ${path}`);
      if (diff.rollbackRecommended) lines.push("Rollback is recommended before release.");
    }
    if (safety && safety.blocked) {
      lines.push(`Safety guard blocked ${safety.blocked} catastrophic operation(s).`);
      if (safety.last && safety.last.reason) lines.push(`Last: ${safety.last.reason}`);
    }
    box.textContent = lines.length ? lines.join("\n") : "No completed task diff or safety block yet.";
  }

  function renderRelease(manager) {
    const box = document.getElementById("managerRelease");
    const release = manager && manager.release;
    if (!release || !release.checkedAt) {
      box.textContent = "Release readiness has not been calculated.";
      return;
    }
    const blockers = Array.isArray(release.blockers) ? release.blockers : [];
    box.textContent = `Release readiness: ${release.score}%${blockers.length ? `\n${blockers.map((item) => `• ${item}`).join("\n")}` : "\n✓ No recorded blockers"}`;
  }

  function renderManager(team) {
    if (!team || !team.manager) return;
    renderPlan(team.manager, team.task);
    renderMemory(team.manager);
    renderStats(team.manager);
    renderTimeline(team.manager);
    renderDiff(team.manager);
    renderRelease(team.manager);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === "zs-team-status") renderManager(message.team);
    if (message.type === "zs-status") renderManager(message.team);
  });

  setInterval(() => {
    chrome.runtime.sendMessage({ type: "status" }, (status) => {
      if (!chrome.runtime.lastError && status) renderManager(status.team);
    });
  }, 1800);
})();

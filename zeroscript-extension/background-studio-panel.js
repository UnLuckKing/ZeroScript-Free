// SPDX-License-Identifier: GPL-3.0-or-later
// Optional browser <-> local control API synchronization for the native Roblox
// Studio DockWidget. The API binds to localhost and requires a random token.

const ZS_STUDIO_PANEL_KEY = "zsStudioPanelConfig";
const ZS_STUDIO_PANEL_DEFAULTS = {
  enabled: false,
  url: "http://127.0.0.1:17614",
  token: "",
  connected: false,
  lastSyncAt: 0,
  lastActionAt: 0,
  lastError: "Studio panel disabled",
};
let zsStudioPanel = { ...ZS_STUDIO_PANEL_DEFAULTS };
let zsStudioPanelBusy = false;

chrome.storage.local.get(ZS_STUDIO_PANEL_KEY, (result) => {
  zsStudioPanel = { ...ZS_STUDIO_PANEL_DEFAULTS, ...((result && result[ZS_STUDIO_PANEL_KEY]) || {}) };
  broadcastTeam();
});

function zsStudioPanelPublic() {
  return {
    enabled: !!zsStudioPanel.enabled,
    url: zsStudioPanel.url,
    tokenConfigured: !!String(zsStudioPanel.token || "").trim(),
    connected: !!zsStudioPanel.connected,
    lastSyncAt: Number(zsStudioPanel.lastSyncAt || 0),
    lastActionAt: Number(zsStudioPanel.lastActionAt || 0),
    lastError: String(zsStudioPanel.lastError || ""),
  };
}

const zsStudioPanelCoreTeamObj = teamObj;
teamObj = function zsTeamObjWithStudioPanel() {
  return { ...zsStudioPanelCoreTeamObj(), studioPanel: zsStudioPanelPublic() };
};

function zsStudioPanelPersist() {
  return chrome.storage.local.set({ [ZS_STUDIO_PANEL_KEY]: zsStudioPanel });
}

function zsStudioPanelEndpoint(path) {
  return `${String(zsStudioPanel.url || ZS_STUDIO_PANEL_DEFAULTS.url).replace(/\/+$/, "")}${path}`;
}

function zsStudioPanelHeaders() {
  return {
    "Content-Type": "application/json",
    "X-ZeroScript-Token": String(zsStudioPanel.token || "").trim(),
  };
}

function zsStudioPanelStatusPayload() {
  const task = teamTask;
  const manager = typeof zsManager !== "undefined" ? zsManager : null;
  return {
    extensionVersion: chrome.runtime.getManifest().version,
    runtime: zsSuite && zsSuite.runtime ? zsSuite.runtime : { state: task ? task.status : "idle" },
    task: task ? {
      id: task.id,
      goal: String(task.goal || "").slice(0, 500),
      status: task.status,
      phase: task.phase,
      provider: task.provider,
      error: String(task.error || "").slice(0, 400),
      round: task.round || 0,
      checkpoint: task.checkpoint || null,
    } : null,
    bridge: {
      connected: !!connected,
      studioConnected,
      studioApp,
      studioProc,
      tools: toolsCache.length,
    },
    risk: zsSuite && zsSuite.risk ? zsSuite.risk : null,
    ownership: zsSuite && zsSuite.ownership ? zsSuite.ownership : null,
    approvals: Array.isArray(pendingApprovals) ? pendingApprovals.length : 0,
    release: manager && manager.release ? manager.release : null,
    outputErrors: manager && manager.memory ? (manager.memory.outputErrors || []).slice(-8) : [],
    updatedAt: Date.now(),
  };
}

async function zsStudioPanelRequest(path, options = {}) {
  const response = await fetch(zsStudioPanelEndpoint(path), {
    cache: "no-store",
    ...options,
    headers: { ...zsStudioPanelHeaders(), ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data.error || `Control API HTTP ${response.status}`);
  return data;
}

async function zsStudioPanelBroadcastStop() {
  const urls = typeof ZS_PROVIDER_MATCHES !== "undefined" ? ZS_PROVIDER_MATCHES : [
    "https://chat.deepseek.com/*", "https://gemini.google.com/*", "https://chat.qwen.ai/*",
    "https://www.kimi.com/*", "https://chat.z.ai/*", "https://arena.ai/*",
    "https://chatgpt.com/*", "https://claude.ai/*", "https://copilot.microsoft.com/*", "https://chat.mistral.ai/*",
  ];
  const tabs = await new Promise((resolve) => chrome.tabs.query({ url: urls }, resolve));
  await Promise.all((tabs || []).map((tab) => tab.id == null ? Promise.resolve() : chrome.tabs.sendMessage(tab.id, { type: "zs-suite-stop" }).catch(() => {})));
}

function zsStudioPanelSendRuntime(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
      else resolve(response || { ok: false, error: "No response" });
    });
  });
}

async function zsStudioPanelHandleAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  if (!action) return;
  zsStudioPanel.lastActionAt = Date.now();
  if (typeof zsSuiteLedger === "function") zsSuiteLedger("studio_panel", `Studio requested action: ${action}`, { actionId: item.id });

  if (action === "stop") await zsStudioPanelBroadcastStop();
  else if (action === "retry") await zsStudioPanelSendRuntime({ type: "team_task_retry" });
  else if (action === "cancel") await zsStudioPanelSendRuntime({ type: "team_task_cancel" });
  else if (action === "rollback") await zsStudioPanelSendRuntime({ type: "team_task_rollback" });
  else if (action === "probe_providers" && typeof zsSuiteProbeProviders === "function") await zsSuiteProbeProviders();
  else if (action === "scan_project" && typeof scanAndPersistProject === "function") await scanAndPersistProject();
  else if (action === "release_manager" && typeof startTeamTask === "function") {
    const active = teamTask && !["done", "failed", "cancelled"].includes(teamTask.status);
    if (!active) await startTeamTask("Run the Release Manager for the currently open Roblox experience. Inspect release readiness, security, DataStores, purchases, economy, onboarding, mobile UI, performance, Output, respawn, and the main gameplay loop. Fix verified blockers, run regression tests, and return genuine evidence and remaining user-only steps.");
  }
}

async function zsStudioPanelSync() {
  if (zsStudioPanelBusy || !zsStudioPanel.enabled || !String(zsStudioPanel.token || "").trim()) return;
  zsStudioPanelBusy = true;
  try {
    await zsStudioPanelRequest("/status", {
      method: "POST",
      body: JSON.stringify(zsStudioPanelStatusPayload()),
    });
    const actionsResult = await zsStudioPanelRequest("/actions");
    for (const action of actionsResult.actions || []) await zsStudioPanelHandleAction(action);
    const eventResult = await zsStudioPanelRequest("/studio-events");
    for (const event of eventResult.events || []) {
      if (typeof zsSuiteLedger === "function") zsSuiteLedger("studio_event", event.detail || event.kind || "Studio panel event", event);
    }
    zsStudioPanel.connected = true;
    zsStudioPanel.lastSyncAt = Date.now();
    zsStudioPanel.lastError = "";
  } catch (error) {
    zsStudioPanel.connected = false;
    zsStudioPanel.lastError = String(error && error.message || error).slice(0, 300);
  } finally {
    zsStudioPanelBusy = false;
    await zsStudioPanelPersist().catch(() => {});
    broadcastTeam();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  if (message.type === "studio_panel_config") {
    if (typeof message.enabled === "boolean") zsStudioPanel.enabled = message.enabled;
    if (typeof message.url === "string" && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(message.url.trim())) zsStudioPanel.url = message.url.trim().replace(/\/+$/, "");
    if (typeof message.token === "string") zsStudioPanel.token = message.token.trim();
    zsStudioPanel.lastError = zsStudioPanel.enabled ? "Not tested yet" : "Studio panel disabled";
    zsStudioPanelPersist().then(() => {
      broadcastTeam();
      if (zsStudioPanel.enabled) zsStudioPanelSync().catch(() => {});
      sendResponse({ ok: true, studioPanel: zsStudioPanelPublic(), team: teamObj() });
    });
    return true;
  }
  if (message.type === "studio_panel_test") {
    (async () => {
      try {
        const healthResponse = await fetch(zsStudioPanelEndpoint("/health"), { cache: "no-store" });
        const health = await healthResponse.json();
        if (!healthResponse.ok || !health.ok) throw new Error(health.error || `Control API HTTP ${healthResponse.status}`);
        if (!String(zsStudioPanel.token || "").trim()) throw new Error("Enter the token from control_token.txt.");
        await zsStudioPanelRequest("/status");
        zsStudioPanel.connected = true;
        zsStudioPanel.lastSyncAt = Date.now();
        zsStudioPanel.lastError = "";
        await zsStudioPanelPersist();
        broadcastTeam();
        sendResponse({ ok: true, health, studioPanel: zsStudioPanelPublic(), team: teamObj() });
      } catch (error) {
        zsStudioPanel.connected = false;
        zsStudioPanel.lastError = String(error && error.message || error);
        await zsStudioPanelPersist();
        broadcastTeam();
        sendResponse({ ok: false, error: zsStudioPanel.lastError, studioPanel: zsStudioPanelPublic(), team: teamObj() });
      }
    })();
    return true;
  }
});

// The popup writes configuration directly to chrome.storage to avoid a race
// with the legacy background message listener. Reload it immediately here so
// the service worker starts/stops synchronization without requiring a restart.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[ZS_STUDIO_PANEL_KEY]) return;
  zsStudioPanel = {
    ...ZS_STUDIO_PANEL_DEFAULTS,
    ...((changes[ZS_STUDIO_PANEL_KEY] && changes[ZS_STUDIO_PANEL_KEY].newValue) || {}),
  };
  broadcastTeam();
  if (zsStudioPanel.enabled && String(zsStudioPanel.token || "").trim()) {
    zsStudioPanelSync().catch(() => {});
  }
});

setInterval(() => zsStudioPanelSync().catch(() => {}), 2000);
setTimeout(() => zsStudioPanelSync().catch(() => {}), 3000);
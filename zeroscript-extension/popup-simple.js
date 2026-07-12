// SPDX-License-Identifier: GPL-3.0-or-later
(() => {
  "use strict";

  const HUB_URL = "http://127.0.0.1:17614";
  const STORAGE_KEY = "zsStudioPanelConfig";
  const $ = (id) => document.getElementById(id);

  function send(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(response || { ok: false, error: "No response" });
      });
    });
  }

  function storageGet(key) {
    return new Promise((resolve) => chrome.storage.local.get(key, resolve));
  }

  function storageSet(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  function setState(kind, text) {
    $("dot").className = `dot ${kind || ""}`;
    $("headline").textContent = text;
  }

  async function pair(silent = false) {
    const button = $("pair");
    if (!silent) {
      button.disabled = true;
      button.textContent = "Eşleştiriliyor…";
    }
    try {
      const response = await fetch(`${HUB_URL}/pair`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.token) throw new Error(data.error || "Hub pairing window is closed.");
      const config = {
        enabled: true,
        url: data.url || HUB_URL,
        token: data.token,
        connected: false,
        lastSyncAt: 0,
        lastError: "Paired; waiting for first sync",
      };
      await storageSet({ [STORAGE_KEY]: config });
      await send({ type: "studio_panel_config", enabled: true, url: config.url, token: config.token });
      if (!silent) button.textContent = "✓ Eşleşti";
      setTimeout(refresh, 300);
      return true;
    } catch (error) {
      if (!silent) {
        $("hint").textContent = "Önce ZeroScript Hub içinden ‘Extension'ı eşleştir’ butonuna bas.";
        button.textContent = "Hub ile eşleştir";
      }
      return false;
    } finally {
      if (!silent) button.disabled = false;
    }
  }

  async function refresh() {
    const status = await send({ type: "status" });
    const team = status.team || {};
    const hub = team.studioPanel || {};
    const task = team.task || null;
    const agents = Array.isArray(team.agents) ? team.agents : [];
    const ready = agents.filter((agent) => agent.ready);

    if (status.connected && status.studio === true) setState("on", "Hazır");
    else if (status.connected) setState("warn", "Studio MCP bekleniyor");
    else setState("", "Hub başlatılmadı");

    $("bridge").textContent = `Bridge: ${status.connected ? "bağlı" : "kapalı"}`;
    $("studio").textContent = `Studio: ${status.studio === true ? "bağlı" : status.studioApp ? "açık, MCP bekleniyor" : "kapalı"}`;
    $("models").textContent = `Modeller: ${ready.length} hazır`;
    $("hub").textContent = `Hub: ${hub.connected ? "eşleşmiş" : hub.tokenConfigured ? "bekleniyor" : "eşleşmemiş"}`;

    if (task) {
      $("task").textContent = `${task.status || "running"} · ${task.phase || "-"} · ${task.provider || "model seçiliyor"}`;
      $("stop").disabled = ["done", "failed", "cancelled"].includes(task.status);
    } else {
      $("task").textContent = "Aktif görev yok";
      $("stop").disabled = true;
    }

    $("version").textContent = `v${chrome.runtime.getManifest().version}`;
    if (!hub.tokenConfigured) pair(true);
  }

  $("pair").addEventListener("click", () => pair(false));
  $("stop").addEventListener("click", async () => {
    await send({ type: "team_task_cancel" });
    refresh();
  });
  $("reconnect").addEventListener("click", async () => {
    await send({ type: "reconnect" });
    setTimeout(refresh, 500);
  });
  $("openProvider").addEventListener("click", async () => {
    const provider = $("provider").value;
    const configResult = await storageGet(STORAGE_KEY);
    const config = configResult[STORAGE_KEY] || {};
    if (!config.token) {
      $("hint").textContent = "Önce Hub ile eşleştir.";
      return;
    }
    await fetch(`${config.url || HUB_URL}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ZeroScript-Token": config.token },
      body: JSON.stringify({ action: "open_provider", payload: { provider } }),
    }).catch(() => {});
    $("hint").textContent = `${provider} açılıyor…`;
  });

  refresh();
  setInterval(refresh, 1500);
})();

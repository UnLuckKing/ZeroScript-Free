// SPDX-License-Identifier: GPL-3.0-or-later
// Real readiness probe for supported browser providers. A tab is only reported
// ready when its composer exists and the in-page ZeroScript session is active.

(() => {
  "use strict";

  function providerId() {
    try { return typeof ZSProvider !== "undefined" && ZSProvider.id ? ZSProvider.id : location.hostname; }
    catch { return location.hostname; }
  }

  function composer() {
    try { return typeof ZSProvider !== "undefined" && ZSProvider.getEditor ? ZSProvider.getEditor() : null; }
    catch { return null; }
  }

  function sessionState() {
    const root = document.getElementById("zs-root");
    const state = root && root.querySelector("#zs-state");
    const action = root && root.querySelector("#zs-action");
    const text = state ? String(state.textContent || "").trim() : "";
    const active = /agent active|starting the roblox agent/i.test(text) || !!(action && action.dataset.kind === "starting");
    return {
      root: !!root,
      active,
      text,
      action: action ? String(action.dataset.kind || "") : "",
      actionLabel: action ? String(action.textContent || "").trim() : "",
    };
  }

  function probe() {
    const editor = composer();
    const session = sessionState();
    let chatEmpty = false;
    let canRead = false;
    try {
      chatEmpty = !!(typeof ZSProvider !== "undefined" && ZSProvider.chatIsEmpty && ZSProvider.chatIsEmpty());
      canRead = !!(typeof ZSProvider !== "undefined" && ZSProvider.readAssistant && ZSProvider.allItems);
    } catch {}
    return {
      ok: true,
      provider: providerId(),
      composer: !!editor,
      canSend: !!(editor && typeof ZSProvider !== "undefined" && ZSProvider.typeAndSend),
      canRead,
      sessionActive: session.active,
      ready: !!editor && session.active,
      chatEmpty,
      pageVisible: !document.hidden,
      sessionText: session.text,
      action: session.action,
      actionLabel: session.actionLabel,
      version: chrome.runtime.getManifest().version,
      url: location.href,
    };
  }

  function stopActiveTurn() {
    const zsStop = document.querySelector("#zs-root #zs-stop:not([hidden])");
    if (zsStop) {
      zsStop.click();
      return { ok: true, method: "zeroscript-stop" };
    }
    try {
      if (typeof ZSProvider !== "undefined" && ZSProvider.stopGeneration) {
        ZSProvider.stopGeneration();
        return { ok: true, method: "provider-stop" };
      }
    } catch {}
    return { ok: false, error: "No active ZeroScript or provider generation was found." };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "zs-provider-probe") {
      sendResponse(probe());
      return false;
    }
    if (message.type === "zs-provider-auto-start") {
      const before = probe();
      if (before.ready) {
        sendResponse({ ok: true, alreadyReady: true, probe: before });
        return false;
      }
      const button = document.querySelector('#zs-root #zs-action[data-kind="start"], #zs-root #zs-action[data-kind="start-degraded"]');
      if (!button) {
        sendResponse({ ok: false, error: before.composer ? "Start button is not available in this chat. Open a new empty chat." : "Provider composer is not ready.", probe: before });
        return false;
      }
      button.click();
      sendResponse({ ok: true, requested: true, probe: before });
      return false;
    }
    if (message.type === "zs-suite-stop") {
      sendResponse(stopActiveTurn());
      return false;
    }
  });
})();

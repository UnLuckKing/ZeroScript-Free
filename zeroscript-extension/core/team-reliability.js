// SPDX-License-Identifier: GPL-3.0-or-later
// Loaded before core/main.js. It makes team completion/error messages durable so
// a provider tab navigation, MV3 worker sleep, or brief bridge reconnect cannot
// leave a finished task stuck in RUNNING.

(() => {
  "use strict";

  const OUTBOX_KEY = "zsTeamReportOutbox";
  const RETRY_MS = 2500;
  const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
  let flushing = false;

  function outboxId(message) {
    return `${message.type}:${message.task_id || "none"}:${message.phase || "none"}`;
  }

  function getOutbox() {
    return new Promise((resolve) => {
      chrome.storage.local.get(OUTBOX_KEY, (result) => {
        resolve(result && Array.isArray(result[OUTBOX_KEY]) ? result[OUTBOX_KEY] : []);
      });
    });
  }

  function setOutbox(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [OUTBOX_KEY]: items.slice(-20) }, resolve);
    });
  }

  async function queue(message) {
    const items = await getOutbox();
    const id = outboxId(message);
    const next = items.filter((item) => item.id !== id);
    next.push({ id, message, queuedAt: Date.now(), attempts: 0 });
    await setOutbox(next);
  }

  async function remove(id) {
    const items = await getOutbox();
    await setOutbox(items.filter((item) => item.id !== id));
  }

  function rawSend(message) {
    return new Promise((resolve) => {
      try {
        originalSendMessage(message, (response) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            resolve({ ok: false, error: runtimeError.message });
            return;
          }
          resolve(response || { ok: false, error: "No acknowledgement from service worker." });
        });
      } catch (error) {
        resolve({ ok: false, error: String(error) });
      }
    });
  }

  function delivered(response) {
    if (response && response.ok) return true;
    return !!(response && /stale task result ignored/i.test(String(response.error || "")));
  }

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      const items = await getOutbox();
      if (!items.length) return;
      const remaining = [];
      for (const item of items) {
        const response = await rawSend(item.message);
        if (!delivered(response)) {
          remaining.push({ ...item, attempts: (item.attempts || 0) + 1, lastError: String(response && response.error || "delivery failed"), lastAttemptAt: Date.now() });
        }
      }
      await setOutbox(remaining);
    } finally {
      flushing = false;
    }
  }

  function wrappedSendMessage(...args) {
    const message = args[0];
    const callback = typeof args[1] === "function" ? args[1] : null;
    const isTeamResult = message && (message.type === "team_task_done" || message.type === "team_task_error");

    if (!isTeamResult) return originalSendMessage(...args);

    const id = outboxId(message);
    // Queue before the normal send. Even though core/main.js does not await its
    // final bg() call, the report now survives and is retried on this or any next
    // supported provider page.
    queue(message).then(async () => {
      const response = await rawSend(message);
      if (delivered(response)) await remove(id);
      if (callback) callback(response);
      if (!delivered(response)) setTimeout(flush, RETRY_MS);
    });

    return undefined;
  }

  try {
    chrome.runtime.sendMessage = wrappedSendMessage;
  } catch (error) {
    console.warn("[zeroscript] Could not install durable report sender", error);
  }

  flush();
  setInterval(flush, RETRY_MS);
  window.addEventListener("focus", flush);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) flush();
  });
})();

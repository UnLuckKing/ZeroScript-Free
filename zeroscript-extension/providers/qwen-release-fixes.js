// SPDX-License-Identifier: GPL-3.0-or-later
// Selected upstream 1.4.3 Qwen fixes:
// 1) read the stable descendant response id so every tool turn does not wait the
//    full virtualized-list grace period;
// 2) keep oversized tool results below Qwen's composer hard limit.

(() => {
  "use strict";
  if (location.hostname !== "chat.qwen.ai") return;
  if (typeof ZSProvider === "undefined" || !ZSProvider) return;

  const SEND_CAP = 131072;
  const SEND_MAX = 130000;

  function truncateForSend(value) {
    const text = String(value ?? "");
    if (text.length <= SEND_CAP) return text;
    const omitted = text.length - SEND_MAX;
    const marker =
      `\n\n[…ZeroScript: result truncated to fit Qwen's ${SEND_CAP}-character input ` +
      `limit - ${omitted} of ${text.length} characters omitted. Do NOT re-run the ` +
      `command; continue with the head and tail shown here…]\n\n`;
    const budget = Math.max(0, SEND_MAX - marker.length);
    const headLength = Math.floor(budget * 0.85);
    const tailLength = budget - headLength;
    return text.slice(0, headLength) + marker + text.slice(text.length - tailLength);
  }

  ZSProvider.lastAssistantId = function qwenStableAssistantId() {
    const last = ZSProvider.lastAssistant && ZSProvider.lastAssistant();
    if (!last) return null;

    const response = last.querySelector && last.querySelector('[id^="chat-response-message-"]');
    if (response) {
      const match = String(response.id || "").match(/chat-response-message-([0-9a-f-]{8,})/i);
      if (match) return match[1];
    }

    const oldMatch = String(last.id || "").match(/assistant-([0-9a-f-]{8,})/i);
    return oldMatch ? oldMatch[1] : (last.id || null);
  };

  const originalTypeAndSend = ZSProvider.typeAndSend;
  if (typeof originalTypeAndSend === "function") {
    ZSProvider.typeAndSend = function qwenBoundedTypeAndSend(text, images) {
      return originalTypeAndSend(truncateForSend(text), images);
    };
  }

  try { document.documentElement.setAttribute("data-zs-qwen-upstream-fixes", "1.4.3"); } catch {}
})();

// SPDX-License-Identifier: GPL-3.0-or-later
// Content-script safety guard. It blocks only clearly catastrophic bulk writes;
// normal targeted edits remain automatic. Loaded before core/main.js.

(() => {
  "use strict";

  const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
  const MAX_DELETE_EDITS = 8;

  function bare(name) {
    const value = String(name || "");
    return value.includes("/") ? value.split("/").pop() : value;
  }

  function serial(value) {
    try { return JSON.stringify(value || {}); } catch { return String(value || ""); }
  }

  function assess(message) {
    if (!message || message.type !== "call_tool") return null;
    const name = bare(message.name).toLowerCase();
    const args = message.arguments || {};
    const text = serial(args);
    const low = text.toLowerCase();

    if (/delete|remove|destroy/.test(name) && !/single|instance|script/.test(name)) {
      return `Bulk destructive tool '${name}' is not allowed without a narrower target.`;
    }

    if (name === "execute_luau") {
      const code = String(args.code || "");
      const c = code.toLowerCase();
      const bulkLoop = /(getdescendants|getchildren)\s*\(\s*\)/.test(c) && /:destroy\s*\(/.test(c);
      const clearsService = /(workspace|startergui|replicatedstorage|serverscriptservice|serverstorage)[^\n]{0,120}:clearallchildren\s*\(/.test(c);
      const destroysService = /(game:getservice\s*\(\s*["'](?:workspace|startergui|replicatedstorage|serverscriptservice|serverstorage)["']\s*\)|game\.(?:workspace|startergui|replicatedstorage|serverscriptservice|serverstorage))[^\n]{0,160}:destroy\s*\(/.test(c);
      const massDestroy = /for\s+[^\n]+\s+in\s+[^\n]*(getdescendants|getchildren)[^\n]*do[\s\S]{0,400}:destroy\s*\(/.test(c);
      if (bulkLoop || clearsService || destroysService || massDestroy) {
        return "Catastrophic bulk deletion was blocked. Inspect the exact instances and use targeted edits instead.";
      }
    }

    if (name === "multi_edit") {
      const edits = Array.isArray(args.edits) ? args.edits : [];
      const destructive = edits.filter((edit) => {
        const next = edit && (edit.new_string ?? edit.newString);
        const old = edit && (edit.old_string ?? edit.oldString);
        return String(next || "") === "" && String(old || "").length > 40;
      });
      if (destructive.length > MAX_DELETE_EDITS) {
        return `A single multi_edit attempted ${destructive.length} large deletions. Split the change into smaller verified edits.`;
      }
    }

    if (/startergui|workspace|replicatedstorage|serverscriptservice/.test(low) && /clearallchildren|destroy all|delete all|remove all/.test(low)) {
      return "A request to clear a core Roblox container was blocked. Use exact instance paths and preserve working systems.";
    }

    return null;
  }

  function providerId() {
    try { return typeof ZSProvider !== "undefined" && ZSProvider.id ? ZSProvider.id : location.hostname; }
    catch { return location.hostname; }
  }

  function wrappedSendMessage(...args) {
    const message = args[0];
    const callback = typeof args[1] === "function" ? args[1] : null;
    const reason = assess(message);
    if (!reason) return originalSendMessage(...args);

    const event = {
      at: Date.now(),
      provider: providerId(),
      tool: bare(message.name),
      reason,
      preview: serial(message.arguments).slice(0, 900),
    };
    chrome.storage.local.set({ zsSafetyLastBlock: event });

    const response = {
      ok: false,
      kind: "safety_block",
      error: `SAFETY BLOCK: ${reason} Do not retry the same bulk operation. Inspect first and make smaller targeted changes.`,
    };
    if (callback) queueMicrotask(() => callback(response));
    return undefined;
  }

  try {
    chrome.runtime.sendMessage = wrappedSendMessage;
  } catch (error) {
    console.warn("[zeroscript] catastrophic guard could not wrap sendMessage", error);
  }
})();

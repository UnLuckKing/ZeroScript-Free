// SPDX-License-Identifier: GPL-3.0-or-later
// Per-provider permission scopes and deterministic operation risk scoring.
// Loaded after catastrophic-guard.js and before the agent loop.

(() => {
  "use strict";

  const KEY = "zsProviderPermissions";
  let permissions = { default: "full", providers: {} };
  let approvalMode = "autonomous";
  const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);

  chrome.storage.local.get([KEY, "zsTeamConfig"], (result) => {
    if (result && result[KEY]) permissions = { ...permissions, ...result[KEY], providers: { ...((result[KEY] || {}).providers || {}) } };
    if (result && result.zsTeamConfig) approvalMode = result.zsTeamConfig.approvalMode || "autonomous";
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[KEY]) permissions = { default: "full", ...(changes[KEY].newValue || {}), providers: { ...(((changes[KEY].newValue || {}).providers) || {}) } };
    if (changes.zsTeamConfig) approvalMode = (changes.zsTeamConfig.newValue || {}).approvalMode || "autonomous";
  });

  function providerId() {
    try { return typeof ZSProvider !== "undefined" && ZSProvider.id ? ZSProvider.id : location.hostname; }
    catch { return location.hostname; }
  }

  function bare(name) {
    const value = String(name || "");
    return value.includes("/") ? value.split("/").pop() : value;
  }

  function serial(value) {
    try { return JSON.stringify(value || {}); } catch { return String(value || ""); }
  }

  function isReadTool(name) {
    const n = bare(name).toLowerCase();
    return /^(list_|get_|inspect_|search_|script_read|script_search|script_grep|screen_capture|http_get|wait_job_finished|skill$)/.test(n);
  }

  function isTestTool(name) {
    const n = bare(name).toLowerCase();
    return /^(start_stop_play|user_mouse_input|user_keyboard_input|character_navigation)$/.test(n);
  }

  function scopeForProvider(provider) {
    return (permissions.providers && permissions.providers[provider]) || permissions.default || "full";
  }

  function targetHints(args) {
    const text = serial(args);
    return {
      text,
      low: text.toLowerCase(),
      ui: /startergui|playergui|screengui|frame|textlabel|textbutton|imagebutton|uilistlayout|uigridlayout|uiscale|uistroke|uicorner/i.test(text),
      map: /workspace|lighting|terrain|soundservice|basepart|model|spawnlocation|part\b/i.test(text),
      script: /serverscriptservice|replicatedstorage|serverstorage|starterplayer|localscript|modulescript|script\b/i.test(text),
    };
  }

  function permissionFailure(scope, name, args) {
    if (isReadTool(name) || isTestTool(name)) return null;
    if (scope === "full") return null;
    if (scope === "inspect") return `Provider scope is Inspect only; write tool '${bare(name)}' is blocked.`;

    const hints = targetHints(args);
    if (scope === "ui" && !hints.ui) return `Provider scope is UI only; '${bare(name)}' does not target a verified UI path.`;
    if (scope === "map" && !hints.map) return `Provider scope is Map only; '${bare(name)}' does not target Workspace, Lighting, Terrain, or another verified world path.`;
    if (scope === "scripts" && (hints.ui || hints.map) && !hints.script) return `Provider scope is Scripts only; '${bare(name)}' appears to modify UI or map instances.`;
    return null;
  }

  function riskAssessment(provider, name, args) {
    const n = bare(name).toLowerCase();
    const text = serial(args);
    const low = text.toLowerCase();
    const reasons = [];
    let score = 5;

    if (isReadTool(n)) score = 0;
    else if (isTestTool(n)) score = 8;
    else score = 20;

    if (/destroy|delete|remove|clearallchildren/.test(low)) { score += 30; reasons.push("destructive operation"); }
    if (/workspace|startergui|replicatedstorage|serverscriptservice|serverstorage/.test(low)) { score += 12; reasons.push("core Roblox container"); }
    if (/datastore|profile|processreceipt|marketplaceservice|developer product|gamepass/.test(low)) { score += 18; reasons.push("persistent data or monetization"); }
    if (/remoteevent|remotefunction|onserverevent|invokeserver|fireserver/.test(low)) { score += 12; reasons.push("client-server boundary"); }
    if (/getdescendants|getchildren/.test(low) && /destroy|delete|remove/.test(low)) { score += 35; reasons.push("bulk descendant mutation"); }
    if (n === "multi_edit") {
      const edits = Array.isArray(args && args.edits) ? args.edits.length : 0;
      if (edits >= 10) { score += 15; reasons.push(`${edits} batched edits`); }
      if (edits >= 25) { score += 20; reasons.push("large batched edit"); }
    }
    if (/insert_asset|generate_mesh|generate_procedural_model/.test(n)) { score += 12; reasons.push("external/generated asset insertion"); }

    score = Math.max(0, Math.min(100, score));
    const level = score >= 80 ? "critical" : score >= 55 ? "high" : score >= 30 ? "medium" : "low";
    return { at: Date.now(), provider, tool: bare(name), score, level, reasons, approvalMode, preview: text.slice(0, 900) };
  }

  function wrappedSendMessage(...args) {
    const message = args[0];
    const callback = typeof args[1] === "function" ? args[1] : null;
    if (!message || message.type !== "call_tool") return originalSendMessage(...args);

    const provider = providerId();
    const scope = scopeForProvider(provider);
    const failure = permissionFailure(scope, message.name, message.arguments || {});
    const risk = riskAssessment(provider, message.name, message.arguments || {});
    chrome.storage.local.set({ zsRiskLastAssessment: risk });

    const criticalAutonomous = risk.score >= 90 && approvalMode !== "review";
    const reason = failure || (criticalAutonomous ? `Critical-risk operation (${risk.score}/100) requires review mode or a smaller targeted change.` : null);
    if (!reason) return originalSendMessage(...args);

    chrome.storage.local.set({ zsSafetyLastBlock: { at: Date.now(), provider, tool: bare(message.name), reason, preview: risk.preview, risk } });
    const response = { ok: false, kind: "permission_block", error: `SAFETY BLOCK: ${reason} Do not repeat the same operation; inspect exact targets and reduce the change.` };
    if (callback) queueMicrotask(() => callback(response));
    return undefined;
  }

  try { chrome.runtime.sendMessage = wrappedSendMessage; }
  catch (error) { console.warn("[zeroscript] permission guard could not wrap sendMessage", error); }
})();
